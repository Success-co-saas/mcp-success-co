// Core infrastructure: Database, GraphQL, API keys, logging, and caching
// This module contains the foundational utilities used by all other tools

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import postgres from "postgres";
import { AsyncLocalStorage } from "async_hooks";
import { clearDebugLog } from "../helpers.js";

// Logging - Debug
const DEBUG_LOG_FILE = "/tmp/mcp-success-co-debug.log";
let isDevMode = false;
let envConfig = {};

// Authentication context storage (for passing OAuth tokens through async call chains)
const authContext = new AsyncLocalStorage();

// Database connection
let sql = null;
let companyIdCache = new Map(); // Cache API key -> company ID mappings

/**
 * Initialize database connection
 */
function initDatabaseConnection() {
  if (sql) return sql;

  try {
    // Check for DATABASE_URL first
    if (envConfig.DATABASE_URL) {
      sql = postgres(envConfig.DATABASE_URL, {
        max: 10,
        idle_timeout: 20,
        connect_timeout: 10,
      });
    } else if (
      envConfig.DB_HOST &&
      envConfig.DB_NAME &&
      envConfig.DB_USER &&
      envConfig.DB_PASS
    ) {
      // Use individual connection parameters
      sql = postgres({
        host: envConfig.DB_HOST,
        port: parseInt(envConfig.DB_PORT || "5432", 10),
        database: envConfig.DB_NAME,
        username: envConfig.DB_USER,
        password: envConfig.DB_PASS,
        max: 10,
        idle_timeout: 20,
        connect_timeout: 10,
      });
    }

    if (sql && isDevMode) {
      console.error("[DEBUG] Database connection initialized");
    }
  } catch (error) {
    console.error(`[ERROR] Failed to initialize database: ${error.message}`);
    sql = null;
  }

  return sql;
}

/**
 * Get database connection
 * @returns {Object|null} - Postgres connection or null
 */
export function getDatabase() {
  if (!sql) {
    initDatabaseConnection();
  }
  return sql;
}

/**
 * Get the leadership team ID for the current company
 * @returns {Promise<string|null>} - Leadership team ID or null
 */
export async function getLeadershipTeamId() {
  try {
    const query = `
      query {
        teams(filter: {stateId: {equalTo: "ACTIVE"}, isLeadership: {equalTo: true}}) {
          nodes {
            id
          }
          totalCount
        }
      }
    `;

    const result = await callSuccessCoGraphQL(query);
    if (!result.ok) {
      if (isDevMode) {
        console.error(
          `[DEBUG] Failed to lookup leadership team: ${result.error}`
        );
      }
      return null;
    }

    const teams = result.data.data.teams.nodes;
    if (teams.length > 0) {
      return teams[0].id;
    }

    if (isDevMode) {
      console.error("[DEBUG] No leadership team found");
    }
    return null;
  } catch (error) {
    console.error(`[ERROR] Failed to lookup leadership team: ${error.message}`);
    return null;
  }
}

/**
 * Get user and company info for the current API key
 * @param {string} apiKey - The API key to lookup (with or without suc_api_ prefix)
 * @returns {Promise<{companyId: string, userId: string}|null>} - User and company info or null
 */
export async function getUserAndCompanyInfoForApiKey(apiKey) {
  if (!apiKey) {
    return null;
  }

  // Check cache first (using original key with prefix)
  if (companyIdCache.has(apiKey)) {
    const cached = companyIdCache.get(apiKey);
    // Handle both old string format and new object format
    if (typeof cached === "object" && cached.companyId && cached.userId) {
      return cached;
    }
  }

  const db = getDatabase();
  if (!db) {
    if (isDevMode) {
      console.error(
        "[DEBUG] Database not configured - cannot lookup user and company info"
      );
    }
    return null;
  }

  try {
    // Strip the "suc_api_" prefix if present
    // The database stores keys without this prefix
    const keyWithoutPrefix = apiKey.startsWith("suc_api_")
      ? apiKey.substring(8) // Remove "suc_api_" (8 characters)
      : apiKey;

    if (isDevMode) {
      console.error(
        `[DEBUG] Looking up user and company info for key: ${keyWithoutPrefix.substring(
          0,
          8
        )}...`
      );
    }

    // Query the user_api_keys table and join with users to get company_id and user_id
    // The column is named "key" not "api_key" in the database
    const result = await db`
      SELECT u.company_id, u.id as user_id
      FROM user_api_keys k
      JOIN users u ON k.user_id = u.id
      WHERE k.key = ${keyWithoutPrefix}
      LIMIT 1
    `;

    if (result.length > 0 && result[0].company_id) {
      const context = {
        companyId: result[0].company_id,
        userId: result[0].user_id,
      };
      // Cache the result (using original key with prefix)
      companyIdCache.set(apiKey, context);

      if (isDevMode) {
        console.error(
          `[DEBUG] Found context - Company: ${context.companyId}, User: ${context.userId}`
        );
      }

      return context;
    }

    if (isDevMode) {
      console.error("[DEBUG] No user and company info found for API key");
    }
    return null;
  } catch (error) {
    console.error(
      `[ERROR] Failed to lookup user and company info: ${error.message}`
    );
    return null;
  }
}

/**
 * Get context (company ID and user ID) for the current API key
 * @param {string} apiKey - The API key to lookup
 * @returns {Promise<{companyId: string, userId: string}|null>} - Context or null
 */
export async function getContextForApiKey(apiKey) {
  return await getUserAndCompanyInfoForApiKey(apiKey);
}

/**
 * Get user context (company ID, user ID, email) for the current request
 * Automatically handles OAuth access tokens or API key mode
 * @returns {Promise<{companyId: string, userId: string, userEmail?: string}|null>} - User context or null
 */
export async function getUserContext() {
  // Try to get context from OAuth first (preferred method)
  const auth = getAuthContext();

  if (auth && auth.accessToken) {
    // OAuth mode - context is already in the auth object from middleware
    if (auth.companyId && auth.userId) {
      if (isDevMode) {
        console.error(
          `[AUTH] getUserContext() using OAuth context - Company: ${auth.companyId}, User: ${auth.userId}`
        );
      }
      return {
        companyId: auth.companyId,
        userId: auth.userId,
        userEmail: auth.userEmail,
      };
    }
  }

  // Fallback to API key mode (only in development with explicit flag)
  if (shouldUseApiKeyMode()) {
    const apiKey = getSuccessCoApiKey();
    if (apiKey) {
      if (isDevMode) {
        console.error(
          `[AUTH] getUserContext() falling back to API key mode (DEVMODE_SUCCESS_USE_API_KEY=true)`
        );
      }
      return await getUserAndCompanyInfoForApiKey(apiKey);
    }
  }

  // No authentication context available
  if (isDevMode) {
    console.error(
      `[AUTH] getUserContext() failed - no OAuth context or API key available`
    );
  }
  return null;
}

/**
 * Test database connection
 * @returns {Promise<{ok: boolean, error?: string}>}
 */
export async function testDatabaseConnection() {
  const db = getDatabase();
  if (!db) {
    return {
      ok: false,
      error:
        "Database not configured. Set DATABASE_URL or DB_HOST/DB_NAME/DB_USER/DB_PASS in .env file.",
    };
  }

  try {
    // Test basic connection
    const result = await db`SELECT 1 as test`;
    if (!result || result.length === 0) {
      return {
        ok: false,
        error: "Database connection test failed: No response from database",
      };
    }

    // Test the user_api_keys and users tables
    const tableCheck = await db`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'user_api_keys'
      ) as has_api_keys,
      EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'users'
      ) as has_users
    `;

    if (!tableCheck[0].has_api_keys || !tableCheck[0].has_users) {
      return {
        ok: false,
        error:
          "Required database tables not found (user_api_keys, users). Check database schema.",
      };
    }

    // Test if we can query the tables
    const apiKeysCount = await db`SELECT COUNT(*) as count FROM user_api_keys`;

    return {
      ok: true,
      message: `Database connection successful. Found ${apiKeysCount[0].count} API keys.`,
    };
  } catch (error) {
    return {
      ok: false,
      error: `Database connection failed: ${error.message}`,
    };
  }
}

/**
 * Initialize tools with environment configuration
 * @param {Object} config - Environment configuration object
 */
export function init(config) {
  envConfig = config || {};
  isDevMode =
    envConfig.NODE_ENV === "development" || envConfig.DEBUG === "true";

  // Clear debug log at startup if we're in debug mode
  clearDebugLog(DEBUG_LOG_FILE, isDevMode);

  // Initialize database connection if config is available
  if (envConfig.DATABASE_URL || envConfig.DB_HOST) {
    initDatabaseConnection();
  }
}

/**
 * Set authentication context for the current request
 * This should be called at the start of each request with OAuth token or API key info
 * @param {Object} auth - Authentication info
 * @param {string} [auth.accessToken] - OAuth access token
 * @param {string} [auth.userId] - User ID
 * @param {string} [auth.companyId] - Company ID
 * @param {string} [auth.userEmail] - User email
 * @param {boolean} [auth.isApiKeyMode] - Whether using API key instead of OAuth
 */
export function setAuthContext(auth) {
  return authContext.enterWith(auth);
}

/**
 * Run a function with authentication context
 * @param {Object} auth - Authentication info
 * @param {Function} fn - Function to run with auth context
 * @returns {Promise<any>} - Result of the function
 */
export function runWithAuthContext(auth, fn) {
  return authContext.run(auth, fn);
}

/**
 * Get current authentication context
 * @returns {Object|undefined} - Current auth context or undefined
 */
export function getAuthContext() {
  return authContext.getStore();
}

/**
 * Check if we should use API key mode (only allowed in development)
 * @returns {boolean} - True if API key mode is enabled and allowed
 */
export function shouldUseApiKeyMode() {
  // Only allow API key mode if explicitly enabled AND in development
  const useApiKey = envConfig.DEVMODE_SUCCESS_USE_API_KEY === "true";
  return useApiKey && isDevMode;
}

/**
 * Log GraphQL request and response to debug file
 * @param {string} url - The GraphQL endpoint URL
 * @param {string} query - The GraphQL query
 * @param {Object} variables - The GraphQL variables
 * @param {Object} response - The response object
 * @param {number} status - HTTP status code
 */
export function logGraphQLCall(url, query, variables, response, status) {
  if (!isDevMode) return;

  try {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      url,
      query: query.replace(/\s+/g, " ").trim(), // Clean up whitespace
      variables: variables ? JSON.stringify(variables, null, 2) : null,
      status,
      response: response ? JSON.stringify(response, null, 2) : null,
    };

    const logLine =
      `\n=== GraphQL Call ${timestamp} ===\n` +
      `URL: ${logEntry.url}\n` +
      `Status: ${logEntry.status}\n` +
      `Query: ${logEntry.query}\n` +
      (logEntry.variables ? `Variables: ${logEntry.variables}\n` : "") +
      `Response: ${logEntry.response}\n` +
      `=== End GraphQL Call ===\n`;

    fs.appendFileSync(DEBUG_LOG_FILE, logLine, "utf8");
  } catch (error) {
    // Silently fail logging to avoid breaking the main functionality
    console.error("Failed to write GraphQL debug log:", error.message);
  }
}

/**
 * Log the start of a tool call for debugging
 * @param {string} toolName - Name of the tool being called
 * @param {Object} args - Arguments passed to the tool
 */
export function logToolCallStart(toolName, args) {
  if (!isDevMode) return;

  try {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      toolName,
      args: args ? JSON.stringify(args, null, 2) : null,
    };

    const logLine =
      `\n${"=".repeat(80)}\n` +
      `>>> TOOL CALL START: ${logEntry.toolName} [${timestamp}]\n` +
      `${"=".repeat(80)}\n` +
      (logEntry.args
        ? `Arguments:\n${logEntry.args}\n`
        : "Arguments: (none)\n") +
      `${"-".repeat(80)}\n`;

    fs.appendFileSync(DEBUG_LOG_FILE, logLine, "utf8");
  } catch (error) {
    // Silently fail logging to avoid breaking the main functionality
    console.error("Failed to write tool debug start log:", error.message);
  }
}

/**
 * Log the result/error of a tool call for debugging
 * @param {string} toolName - Name of the tool being called
 * @param {Object} result - Result returned by the tool
 * @param {string} [error] - Error message if the tool call failed
 */
export function logToolCallEnd(toolName, result, error = null) {
  if (!isDevMode) return;

  try {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      toolName,
      result: result ? JSON.stringify(result, null, 2) : null,
      error: error,
    };

    const logLine =
      `${"-".repeat(80)}\n` +
      `<<< TOOL CALL END: ${logEntry.toolName} [${timestamp}]\n` +
      (logEntry.error
        ? `ERROR:\n${logEntry.error}\n`
        : `Result:\n${logEntry.result}\n`) +
      `${"=".repeat(80)}\n`;

    fs.appendFileSync(DEBUG_LOG_FILE, logLine, "utf8");
  } catch (error) {
    // Silently fail logging to avoid breaking the main functionality
    console.error("Failed to write tool debug end log:", error.message);
  }
}

/**
 * Calls the Success.co GraphQL API
 * Uses OAuth access token from context, or falls back to API key in dev mode
 * @param {string} query - The GraphQL query string
 * @param {Object} [variables] - Optional variables for the GraphQL query
 * @returns {Promise<{ok: boolean, data?: any, error?: string}>}
 */
export async function callSuccessCoGraphQL(query, variables = null) {
  // Get authentication from context (OAuth access token) or fall back to API key
  const auth = getAuthContext();
  let authToken = null;
  let authMode = "none";

  // Try to use OAuth access token from context first
  if (auth && auth.accessToken) {
    authToken = auth.accessToken;
    authMode = "oauth";
    if (isDevMode) {
      console.error(`[AUTH] Using OAuth access token for GraphQL call`);
    }
  }
  // Fall back to API key mode only if explicitly enabled in development
  else if (shouldUseApiKeyMode()) {
    const apiKey = getSuccessCoApiKey();
    if (apiKey) {
      authToken = apiKey;
      authMode = "api_key";
      if (isDevMode) {
        console.error(
          `[AUTH] Using API key for GraphQL call (DEVMODE_SUCCESS_USE_API_KEY=true)`
        );
      }
    }
  }

  if (!authToken) {
    return {
      ok: false,
      error:
        "No authentication available. Expected OAuth access token in request context, or DEVMODE_SUCCESS_API_KEY in dev mode with DEVMODE_SUCCESS_USE_API_KEY=true.",
    };
  }

  const url = getGraphQLEndpoint();
  const body = variables ? { query, variables } : { query };

  const response = await globalThis.fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${authToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  // Always try to read the response body
  let data = null;
  let responseText = "";
  try {
    responseText = await response.text();
    if (responseText) {
      data = JSON.parse(responseText);
    }
  } catch (parseError) {
    // If we can't parse JSON, include the raw text in the error
    logGraphQLCall(
      url,
      query,
      variables,
      { error: responseText || "Unable to read response" },
      response.status
    );
    return {
      ok: false,
      error: `HTTP error! status: ${response.status}, response: ${
        responseText || "Unable to parse response"
      }`,
    };
  }

  // Log the request (both success and failure)
  logGraphQLCall(url, query, variables, data, response.status);

  if (!response.ok) {
    // Include detailed error information
    const errorDetails = data?.errors
      ? data.errors.map((err) => err.message).join("; ")
      : data?.error || JSON.stringify(data);
    return {
      ok: false,
      error: `HTTP error! status: ${response.status}, details: ${errorDetails}`,
    };
  }

  // Check for GraphQL errors in the response
  if (data.errors && data.errors.length > 0) {
    const errorMessages = data.errors.map((err) => err.message).join("; ");
    return {
      ok: false,
      error: `GraphQL error: ${errorMessages}`,
      data: data, // Include the data anyway in case partial results are useful
    };
  }

  return { ok: true, data };
}

/**
 * Gets the GraphQL endpoint URL based on environment configuration
 * @returns {string}
 */
export function getGraphQLEndpoint() {
  const mode = envConfig.GRAPHQL_ENDPOINT_MODE || "online";

  if (mode === "local") {
    return envConfig.GRAPHQL_ENDPOINT_LOCAL || "http://localhost:5174/graphql";
  }

  return envConfig.GRAPHQL_ENDPOINT_ONLINE || "https://www.success.co/graphql";
}

/**
 * Gets Success.co API key from environment
 * @returns {string|null}
 */
export function getSuccessCoApiKey() {
  return envConfig.DEVMODE_SUCCESS_API_KEY || null;
}

// Export isDevMode for use by other modules
export function getIsDevMode() {
  return isDevMode;
}
