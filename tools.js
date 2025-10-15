// Success.co MCP Server Tools
// This file contains the tool function implementations

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  validateStateId,
  mapPriorityToNumber,
  mapIssueTypeToLowercase,
  mapRockTypeToLowercase,
  clearDebugLog,
  getLastDateOfCurrentQuarter,
} from "./helpers.js";
import postgres from "postgres";

// Logging - Debug
const DEBUG_LOG_FILE = "/tmp/mcp-success-co-debug.log";
let isDevMode = false;
let envConfig = {};

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
      envConfig.DB_PASSWORD
    ) {
      // Use individual connection parameters
      sql = postgres({
        host: envConfig.DB_HOST,
        port: parseInt(envConfig.DB_PORT || "5432", 10),
        database: envConfig.DB_NAME,
        username: envConfig.DB_USER,
        password: envConfig.DB_PASSWORD,
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
function getDatabase() {
  if (!sql) {
    initDatabaseConnection();
  }
  return sql;
}

/**
 * Get the leadership team ID for the current company
 * @returns {Promise<string|null>} - Leadership team ID or null
 */
async function getLeadershipTeamId() {
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
async function getUserAndCompanyInfoForApiKey(apiKey) {
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
async function getContextForApiKey(apiKey) {
  return await getUserAndCompanyInfoForApiKey(apiKey);
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
        "Database not configured. Set DATABASE_URL or DB_HOST/DB_NAME/DB_USER/DB_PASSWORD in .env file.",
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
 * @param {string} config.NODE_ENV - The NODE_ENV value
 * @param {string} config.DEBUG - The DEBUG value
 * @param {string} config.GRAPHQL_ENDPOINT_MODE - The GRAPHQL_ENDPOINT_MODE value
 * @param {string} config.GRAPHQL_ENDPOINT_LOCAL - The GRAPHQL_ENDPOINT_LOCAL value
 * @param {string} config.GRAPHQL_ENDPOINT_ONLINE - The GRAPHQL_ENDPOINT_ONLINE value
 * @param {string} config.SUCCESS_CO_API_KEY - The SUCCESS_CO_API_KEY value
 * @param {string} config.DATABASE_URL - The DATABASE_URL value
 * @param {string} config.DB_HOST - The DB_HOST value
 * @param {string} config.DB_PORT - The DB_PORT value
 * @param {string} config.DB_NAME - The DB_NAME value
 * @param {string} config.DB_USER - The DB_USER value
 * @param {string} config.DB_PASSWORD - The DB_PASSWORD value
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
 * Log GraphQL request and response to debug file
 * @param {string} url - The GraphQL endpoint URL
 * @param {string} query - The GraphQL query
 * @param {Object} variables - The GraphQL variables
 * @param {Object} response - The response object
 * @param {number} status - HTTP status code
 */
function logGraphQLCall(url, query, variables, response, status) {
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
 * @param {string} query - The GraphQL query string
 * @param {Object} [variables] - Optional variables for the GraphQL query
 * @returns {Promise<{ok: boolean, data?: any, error?: string}>}
 */
export async function callSuccessCoGraphQL(query, variables = null) {
  const apiKey = getSuccessCoApiKey();
  if (!apiKey) {
    return {
      ok: false,
      error:
        "Success.co API key not set. Use the setSuccessCoApiKey tool first.",
    };
  }

  const url = getGraphQLEndpoint();
  const body = variables ? { query, variables } : { query };

  const response = await globalThis.fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
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
 * Gets Success.co API key from environment or file
 * @returns {string|null}
 */
export function getSuccessCoApiKey() {
  if (envConfig.SUCCESS_CO_API_KEY) return envConfig.SUCCESS_CO_API_KEY;

  try {
    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    const API_KEY_FILE = path.join(__dirname, ".api_key");

    if (fs.existsSync(API_KEY_FILE)) {
      return fs.readFileSync(API_KEY_FILE, "utf8").trim();
    }
  } catch (error) {
    // Ignore file read errors
  }

  return null;
}

/**
 * Stores Success.co API key to file
 * @param {string} apiKey - The API key to store
 * @returns {boolean} - Whether the storage was successful
 */
function storeSuccessCoApiKey(apiKey) {
  try {
    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    const API_KEY_FILE = path.join(__dirname, ".api_key");
    fs.writeFileSync(API_KEY_FILE, apiKey, "utf8");
    return true;
  } catch (error) {
    console.error("Error storing API key:", error);
    return false;
  }
}

/**
 * Set the Success.co API key
 * @param {Object} args - Arguments object
 * @param {string} args.apiKey - The API key for Success.co
 * @returns {Promise<{content: Array<{type: string, text: string}>}>}
 */
export async function setSuccessCoApiKey(args) {
  const { apiKey } = args;

  if (!apiKey || apiKey.trim() === "") {
    return {
      content: [
        {
          type: "text",
          text: "Error: API key cannot be blank",
        },
      ],
    };
  }

  const stored = storeSuccessCoApiKey(apiKey);
  return {
    content: [
      {
        type: "text",
        text: stored
          ? "Success.co API key stored successfully"
          : "Failed to store Success.co API key",
      },
    ],
  };
}

/**
 * Get the Success.co API key (env or stored file)
 * @param {Object} args - Arguments object (no parameters needed)
 * @returns {Promise<{content: Array<{type: string, text: string}>}>}
 */
export async function getSuccessCoApiKeyTool(args) {
  const apiKey = getSuccessCoApiKey();
  return {
    content: [
      {
        type: "text",
        text: apiKey || "Success.co API key not set",
      },
    ],
  };
}

/**
 * List Success.co teams
 * @param {Object} args - Arguments object
 * @param {number} [args.first] - Optional page size
 * @param {number} [args.offset] - Optional offset
 * @param {string} [args.stateId] - Team state filter (defaults to 'ACTIVE')
 * @param {string} [args.keyword] - Search for teams with names containing this keyword (case-insensitive)
 * @returns {Promise<{content: Array<{type: string, text: string}>}>}
 * @description Returns teams with isLeadership flag to identify the leadership team
 */
export async function getTeams(args) {
  const { first, offset, stateId = "ACTIVE", keyword } = args;
  // Validate stateId
  const validation = validateStateId(stateId);
  if (!validation.isValid) {
    return {
      content: [{ type: "text", text: validation.error }],
    };
  }
  const filterItems = [`stateId: {equalTo: "${stateId}"}`];

  if (keyword) {
    filterItems.push(`name: {includesInsensitive: "${keyword}"}`);
  }

  const filterStr = [
    filterItems.length > 0 ? `filter: {${filterItems.join(", ")}}` : "",
    first !== undefined ? `first: ${first}` : "",
    offset !== undefined ? `offset: ${offset}` : "",
  ]
    .filter(Boolean)
    .join(", ");

  const query = `
    query {
      teams(${filterStr ? `filter: {${filterStr}}` : ""}) {
        nodes {
          id
          badgeUrl
          name
          desc
          color
          isLeadership
          createdAt
          stateId
          companyId
        }
        totalCount
      }
    }
  `;

  const result = await callSuccessCoGraphQL(query);
  if (!result.ok) {
    return { content: [{ type: "text", text: result.error }] };
  }

  const data = result.data;
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify({
          totalCount: data.data.teams.totalCount,
          results: data.data.teams.nodes.map((team) => ({
            id: team.id,
            title: team.name,
            description: team.desc || "",
            color: team.color,
            status: team.stateId,
            isLeadership: team.isLeadership,
          })),
        }),
      },
    ],
  };
}

/**
 * List Success.co users
 * @param {Object} args - Arguments object
 * @param {number} [args.first] - Optional page size
 * @param {number} [args.offset] - Optional offset
 * @param {string} [args.stateId] - User state filter (defaults to 'ACTIVE')
 * @returns {Promise<{content: Array<{type: string, text: string}>}>}
 */
export async function getUsers(args) {
  const { first, offset, stateId = "ACTIVE" } = args;
  // Validate stateId
  const validation = validateStateId(stateId);
  if (!validation.isValid) {
    return {
      content: [{ type: "text", text: validation.error }],
    };
  }
  const filterStr = [
    `stateId: {equalTo: "${stateId}"}`,
    first !== undefined ? `first: ${first}` : "",
    offset !== undefined ? `offset: ${offset}` : "",
  ]
    .filter(Boolean)
    .join(", ");

  const query = `
    query {
      users(${filterStr ? `filter: {${filterStr}}` : ""}) {
        nodes {
          id
          userName
          firstName
          lastName
          jobTitle
          desc
          avatar
          email
          userPermissionId
          userStatusId
          languageId
          timeZone
          companyId
        }
        totalCount
      }
    }
  `;

  const result = await callSuccessCoGraphQL(query);
  if (!result.ok) {
    return { content: [{ type: "text", text: result.error }] };
  }

  const data = result.data;
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify({
          totalCount: data.data.users.totalCount,
          results: data.data.users.nodes.map((user) => ({
            id: user.id,
            name: `${user.firstName} ${user.lastName}`,
            email: user.email,
            jobTitle: user.jobTitle || "",
            description: user.desc || "",
            userName: user.userName || "",
            avatar: user.avatar || "",
            status: user.userStatusId,
            language: user.languageId,
            timeZone: user.timeZone,
          })),
        }),
      },
    ],
  };
}

/**
 * List Success.co todos
 * @param {Object} args - Arguments object
 * @param {number} [args.first] - Optional page size
 * @param {number} [args.offset] - Optional offset
 * @param {string} [args.stateId] - Todo state filter (defaults to 'ACTIVE')
 * @param {boolean} [args.fromMeetings] - If true, only return todos linked to meetings (Level 10 meetings)
 * @param {string} [args.teamId] - Filter by team ID
 * @param {boolean} [args.leadershipTeam] - If true, automatically use the leadership team ID
 * @param {string} [args.userId] - Filter by user ID
 * @param {string} [args.status] - Filter by status: "TODO" (default), "COMPLETE", "OVERDUE", or "ALL"
 * @param {string} [args.keyword] - Search for todos with names containing this keyword (case-insensitive)
 * @param {string} [args.createdAfter] - Filter todos created after this date (ISO 8601 format)
 * @param {string} [args.createdBefore] - Filter todos created before this date (ISO 8601 format)
 * @param {string} [args.completedAfter] - Filter todos completed after this date (ISO 8601 format)
 * @param {string} [args.completedBefore] - Filter todos completed before this date (ISO 8601 format)
 * @returns {Promise<{content: Array<{type: string, text: string}>}>}
 */
export async function getTodos(args) {
  const {
    first,
    offset,
    stateId = "ACTIVE",
    fromMeetings = false,
    teamId: providedTeamId,
    leadershipTeam = false,
    userId,
    status = "TODO",
    keyword,
    createdAfter,
    createdBefore,
    completedAfter,
    completedBefore,
  } = args;

  // Resolve teamId if leadershipTeam is true
  let teamId = providedTeamId;
  if (leadershipTeam && !providedTeamId) {
    teamId = await getLeadershipTeamId();
    if (!teamId) {
      return {
        content: [
          {
            type: "text",
            text: "Error: Could not find leadership team. Please ensure a team is marked as the leadership team.",
          },
        ],
      };
    }
  }
  // Validate stateId
  const validation = validateStateId(stateId);
  if (!validation.isValid) {
    return {
      content: [{ type: "text", text: validation.error }],
    };
  }

  // Validate status if provided
  if (status && !["TODO", "COMPLETE", "OVERDUE", "ALL"].includes(status)) {
    return {
      content: [
        {
          type: "text",
          text: 'Invalid status - must be "TODO", "COMPLETE", "OVERDUE", or "ALL"',
        },
      ],
    };
  }

  const filterItems = [`stateId: {equalTo: "${stateId}"}`];

  // Add meetingId filter if fromMeetings is true
  if (fromMeetings) {
    filterItems.push(`meetingId: {isNull: false}`);
  }

  // Add teamId filter if provided
  if (teamId) {
    filterItems.push(`teamId: {equalTo: "${teamId}"}`);
  }

  // Add userId filter if provided
  if (userId) {
    filterItems.push(`userId: {equalTo: "${userId}"}`);
  }

  // Add keyword filter if provided
  if (keyword) {
    filterItems.push(`name: {includesInsensitive: "${keyword}"}`);
  }

  // Add status filter if provided (skip if "ALL")
  if (status === "TODO") {
    filterItems.push(`todoStatusId: {equalTo: "TODO"}`);
  } else if (status === "COMPLETE") {
    filterItems.push(`todoStatusId: {equalTo: "COMPLETE"}`);
  } else if (status === "OVERDUE") {
    // OVERDUE = status is TODO and due date is in the past
    const now = new Date().toISOString();
    filterItems.push(`todoStatusId: {equalTo: "TODO"}`);
    filterItems.push(`dueDate: {lessThan: "${now}"}`);
  }
  // If status is "ALL", don't add any status filter

  // Add date filters for creation
  if (createdAfter) {
    filterItems.push(`createdAt: {greaterThanOrEqualTo: "${createdAfter}"}`);
  }
  if (createdBefore) {
    filterItems.push(`createdAt: {lessThanOrEqualTo: "${createdBefore}"}`);
  }

  // Add date filters for completion (statusUpdatedAt when status is COMPLETE)
  if (completedAfter || completedBefore) {
    if (completedAfter) {
      filterItems.push(
        `statusUpdatedAt: {greaterThanOrEqualTo: "${completedAfter}"}`
      );
    }
    if (completedBefore) {
      filterItems.push(
        `statusUpdatedAt: {lessThanOrEqualTo: "${completedBefore}"}`
      );
    }
    // Only include completed todos when using completion date filters
    if (!status || status === "ALL") {
      filterItems.push(`todoStatusId: {equalTo: "COMPLETE"}`);
    }
  }

  const filterStr = [
    filterItems.length > 0 ? `filter: {${filterItems.join(", ")}}` : "",
    first !== undefined ? `first: ${first}` : "",
    offset !== undefined ? `offset: ${offset}` : "",
  ]
    .filter(Boolean)
    .join(", ");

  const query = `
    query {
      todos(${filterStr}) {
        nodes {
          id
          todoStatusId
          name
          desc
          teamId
          userId
          statusUpdatedAt
          type
          dueDate
          priorityNo
          createdAt
          stateId
          companyId
          meetingId
        }
        totalCount
      }
    }
  `;

  const result = await callSuccessCoGraphQL(query);
  if (!result.ok) {
    return { content: [{ type: "text", text: result.error }] };
  }

  const data = result.data;
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify({
          totalCount: data.data.todos.totalCount,
          results: data.data.todos.nodes.map((todo) => ({
            id: todo.id,
            name: todo.name,
            description: todo.desc || "",
            status: todo.todoStatusId,
            type: todo.type,
            priority: todo.priorityNo,
            dueDate: todo.dueDate,
            teamId: todo.teamId,
            userId: todo.userId,
            meetingId: todo.meetingId,
            createdAt: todo.createdAt,
            statusUpdatedAt: todo.statusUpdatedAt,
          })),
        }),
      },
    ],
  };
}

/**
 * List Success.co rocks
 * @param {Object} args - Arguments object
 * @param {number} [args.first] - Optional page size
 * @param {number} [args.offset] - Optional offset
 * @param {string} [args.stateId] - Rock state filter (defaults to 'ACTIVE')
 * @param {string} [args.rockStatusId] - Rock status filter (defaults to blank)
 * @param {string} [args.userId] - Filter by user ID (rock owner)
 * @param {string} [args.teamId] - Filter by team ID
 * @param {string} [args.keyword] - Search for rocks with names containing this keyword (case-insensitive)
 * @returns {Promise<{content: Array<{type: string, text: string}>}>}
 */
export async function getRocks(args) {
  const {
    first,
    offset,
    stateId = "ACTIVE",
    rockStatusId = "",
    userId,
    teamId: providedTeamId,
    leadershipTeam = false,
    keyword,
  } = args;

  // Resolve teamId if leadershipTeam is true
  let teamId = providedTeamId;
  if (leadershipTeam && !providedTeamId) {
    teamId = await getLeadershipTeamId();
    if (!teamId) {
      return {
        content: [
          {
            type: "text",
            text: "Error: Could not find leadership team. Please ensure a team is marked as the leadership team.",
          },
        ],
      };
    }
  }
  // Validate stateId
  const validation = validateStateId(stateId);
  if (!validation.isValid) {
    return {
      content: [{ type: "text", text: validation.error }],
    };
  }
  // Validate rockStatusId
  if (
    rockStatusId !== "" &&
    !["ONTRACK", "OFFTRACK", "COMPLETE", "INCOMPLETE"].includes(rockStatusId)
  ) {
    return {
      content: [
        {
          type: "text",
          text: "Invalid rock status - must be ONTRACK, OFFTRACK, COMPLETE, or INCOMPLETE",
        },
      ],
    };
  }

  const filterStr = [
    `stateId: {equalTo: "${stateId}"}`,
    rockStatusId ? `rockStatusId: {equalTo: "${rockStatusId}"}` : "",
    userId ? `userId: {equalTo: "${userId}"}` : "",
    keyword ? `name: {includesInsensitive: "${keyword}"}` : "",
    first !== undefined ? `first: ${first}` : "",
    offset !== undefined ? `offset: ${offset}` : "",
  ]
    .filter(Boolean)
    .join(", ");

  const query = `
    query {
      rocks(${filterStr ? `filter: {${filterStr}}` : ""}) {
        nodes {
          id
          rockStatusId
          name
          desc
          statusUpdatedAt
          type
          dueDate
          createdAt
          stateId
          companyId
          userId
        }
        totalCount
      }
    }
  `;

  const result = await callSuccessCoGraphQL(query);
  if (!result.ok) {
    return { content: [{ type: "text", text: result.error }] };
  }

  const data = result.data;
  let rocks = data.data.rocks.nodes;

  // If teamId filter is provided, get rocks associated with that team
  if (teamId) {
    const teamsOnRocksQuery = `
      query {
        teamsOnRocks(filter: {teamId: {equalTo: "${teamId}"}, stateId: {equalTo: "${stateId}"}}) {
          nodes {
            rockId
          }
        }
      }
    `;

    const teamsOnRocksResult = await callSuccessCoGraphQL(teamsOnRocksQuery);
    if (teamsOnRocksResult.ok) {
      const teamRockIds = new Set(
        teamsOnRocksResult.data?.data?.teamsOnRocks?.nodes?.map(
          (tr) => tr.rockId
        ) || []
      );
      rocks = rocks.filter((rock) => teamRockIds.has(rock.id));
    }
  }

  // For each rock, get its team associations
  const rockIds = rocks.map((r) => r.id);
  const teamsByRock = {};

  if (rockIds.length > 0) {
    const rockIdsStr = rockIds.map((id) => `"${id}"`).join(", ");
    const teamsOnRocksQuery = `
      query {
        teamsOnRocks(filter: {rockId: {in: [${rockIdsStr}]}, stateId: {equalTo: "${stateId}"}}) {
          nodes {
            rockId
            teamId
          }
        }
      }
    `;

    const teamsOnRocksResult = await callSuccessCoGraphQL(teamsOnRocksQuery);
    if (teamsOnRocksResult.ok) {
      const teamsOnRocks =
        teamsOnRocksResult.data?.data?.teamsOnRocks?.nodes || [];
      teamsOnRocks.forEach((tor) => {
        if (!teamsByRock[tor.rockId]) {
          teamsByRock[tor.rockId] = [];
        }
        teamsByRock[tor.rockId].push(tor.teamId);
      });
    }
  }

  return {
    content: [
      {
        type: "text",
        text: JSON.stringify({
          totalCount: rocks.length,
          results: rocks.map((rock) => ({
            id: rock.id,
            name: rock.name,
            description: rock.desc || "",
            status: rock.rockStatusId,
            type: rock.type,
            dueDate: rock.dueDate,
            createdAt: rock.createdAt,
            statusUpdatedAt: rock.statusUpdatedAt,
            userId: rock.userId,
            teamIds: teamsByRock[rock.id] || [],
          })),
        }),
      },
    ],
  };
}

/**
 * List Success.co meetings
 * @param {Object} args - Arguments object
 * @param {number} [args.first] - Optional page size
 * @param {number} [args.offset] - Optional offset
 * @param {string} [args.stateId] - Meeting state filter (defaults to 'ACTIVE')
 * @param {string} [args.teamId] - Filter by team ID
 * @param {boolean} [args.leadershipTeam] - If true, automatically use the leadership team ID
 * @param {string} [args.meetingAgendaId] - Filter by meeting agenda ID (only one of meetingAgendaId or meetingAgendaType can be used)
 * @param {string} [args.meetingAgendaType] - Filter by meeting agenda type (only one of meetingAgendaId or meetingAgendaType can be used)
 * @param {string} [args.dateAfter] - Filter meetings occurring on or after this date (YYYY-MM-DD)
 * @param {string} [args.dateBefore] - Filter meetings occurring on or before this date (YYYY-MM-DD)
 * @returns {Promise<{content: Array<{type: string, text: string}>}>}
 */
export async function getMeetings(args) {
  const {
    first,
    offset,
    stateId = "ACTIVE",
    teamId: providedTeamId,
    leadershipTeam = false,
    meetingAgendaId,
    meetingAgendaType,
    dateAfter,
    dateBefore,
  } = args;

  // Validate that only one of meetingAgendaId or meetingAgendaType is provided
  if (meetingAgendaId && meetingAgendaType) {
    return {
      content: [
        {
          type: "text",
          text: "Error: Only one of meetingAgendaId or meetingAgendaType can be provided, not both.",
        },
      ],
    };
  }

  // Resolve teamId if leadershipTeam is true
  let teamId = providedTeamId;
  if (leadershipTeam && !providedTeamId) {
    teamId = await getLeadershipTeamId();
    if (!teamId) {
      return {
        content: [
          {
            type: "text",
            text: "Error: Could not find leadership team. Please ensure a team is marked as the leadership team.",
          },
        ],
      };
    }
  }

  if (!teamId) {
    return {
      content: [
        {
          type: "text",
          text: "Error: Team ID is required. Either provide teamId or set leadershipTeam to true.",
        },
      ],
    };
  }

  // Validate stateId
  const validation = validateStateId(stateId);
  if (!validation.isValid) {
    return {
      content: [{ type: "text", text: validation.error }],
    };
  }

  // If teamId is provided, first get the meetingInfoIds for that team
  let meetingInfoIds = null;
  let meetingInfosMap = new Map();
  if (teamId) {
    const meetingInfosQuery = `
      query {
        meetingInfos(filter: {teamId: {equalTo: "${teamId}"}, stateId: {equalTo: "ACTIVE"}}) {
          nodes {
            id
            name
            teamId
            team {
              id
              name
            }
          }
        }
      }
    `;

    const meetingInfosResult = await callSuccessCoGraphQL(meetingInfosQuery);
    if (!meetingInfosResult.ok) {
      return {
        content: [
          {
            type: "text",
            text: `Error fetching meeting infos: ${meetingInfosResult.error}`,
          },
        ],
      };
    }

    const meetingInfoNodes =
      meetingInfosResult.data?.data?.meetingInfos?.nodes || [];
    meetingInfoIds = meetingInfoNodes.map((mi) => mi.id);

    // Store meetingInfo data in a map for later lookup
    meetingInfoNodes.forEach((mi) => {
      meetingInfosMap.set(mi.id, mi);
    });

    if (meetingInfoIds.length === 0) {
      // No meeting infos found for this team, return empty result
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              totalCount: 0,
              results: [],
            }),
          },
        ],
      };
    }
  }

  const filterItems = [`stateId: {equalTo: "${stateId}"}`];

  // Filter by the meetingInfoIds we found for the team
  if (meetingInfoIds && meetingInfoIds.length > 0) {
    const meetingInfoIdsStr = meetingInfoIds.map((id) => `"${id}"`).join(", ");
    filterItems.push(`meetingInfoId: {in: [${meetingInfoIdsStr}]}`);
  }

  // Add meetingAgendaId filter if provided
  if (meetingAgendaId) {
    filterItems.push(`meetingAgendaId: {equalTo: "${meetingAgendaId}"}`);
  }

  // Add meetingAgendaType filter if provided
  if (meetingAgendaType) {
    filterItems.push(`meetingAgendaType: {equalTo: "${meetingAgendaType}"}`);
  }

  // Add date filters
  if (dateAfter) {
    filterItems.push(`date: {greaterThanOrEqualTo: "${dateAfter}"}`);
  }
  if (dateBefore) {
    filterItems.push(`date: {lessThanOrEqualTo: "${dateBefore}"}`);
  }

  const filterStr = [
    filterItems.length > 0 ? `filter: {${filterItems.join(", ")}}` : "",
    first !== undefined ? `first: ${first}` : "",
    offset !== undefined ? `offset: ${offset}` : "",
  ]
    .filter(Boolean)
    .join(", ");

  const query = `
    query {
      meetings(${filterStr}, orderBy: DATE_DESC) {
        nodes {
          id
          meetingInfoId
          date
          startTime
          endTime
          averageRating
          meetingStatusId
          createdAt
          stateId
          companyId
        }
        totalCount
      }
    }
  `;

  const result = await callSuccessCoGraphQL(query);
  if (!result.ok) {
    return { content: [{ type: "text", text: result.error }] };
  }

  const data = result.data;

  // If we have meetings but no meetingInfo data yet (e.g., when querying by meetingAgendaId directly),
  // fetch the missing meetingInfo data
  const meetings = data.data.meetings.nodes;
  const missingMeetingInfoIds = meetings
    .map((m) => m.meetingInfoId)
    .filter((id) => id && !meetingInfosMap.has(id));

  if (missingMeetingInfoIds.length > 0) {
    const uniqueIds = [...new Set(missingMeetingInfoIds)];
    const meetingInfoIdsStr = uniqueIds.map((id) => `"${id}"`).join(", ");
    const additionalMeetingInfosQuery = `
      query {
        meetingInfos(filter: {id: {in: [${meetingInfoIdsStr}]}}) {
          nodes {
            id
            name
            teamId
            team {
              id
              name
            }
          }
        }
      }
    `;

    const additionalResult = await callSuccessCoGraphQL(
      additionalMeetingInfosQuery
    );
    if (additionalResult.ok) {
      const additionalNodes =
        additionalResult.data?.data?.meetingInfos?.nodes || [];
      additionalNodes.forEach((mi) => {
        meetingInfosMap.set(mi.id, mi);
      });
    }
  }

  return {
    content: [
      {
        type: "text",
        text: JSON.stringify({
          totalCount: data.data.meetings.totalCount,
          results: meetings.map((meeting) => {
            const meetingInfo = meetingInfosMap.get(meeting.meetingInfoId);
            return {
              id: meeting.id,
              meetingInfoId: meeting.meetingInfoId,
              meetingInfoName: meetingInfo?.name,
              teamId: meetingInfo?.teamId,
              teamName: meetingInfo?.team?.name,
              date: meeting.date,
              startTime: meeting.startTime,
              endTime: meeting.endTime,
              averageRating: meeting.averageRating,
              status: meeting.meetingStatusId,
              createdAt: meeting.createdAt,
            };
          }),
        }),
      },
    ],
  };
}

/**
 * List Success.co issues
 * @param {Object} args - Arguments object
 * @param {number} [args.first] - Optional page size
 * @param {number} [args.offset] - Optional offset
 * @param {string} [args.stateId] - Issue state filter (defaults to 'ACTIVE')
 * @param {string} [args.teamId] - Filter by team ID
 * @param {boolean} [args.leadershipTeam] - If true, automatically use the leadership team ID
 * @param {string} [args.userId] - Filter by user ID
 * @param {string} [args.status] - Filter by status: "TODO" (default), "COMPLETE", or "ALL"
 * @param {boolean} [args.fromMeetings] - If true, only return issues linked to meetings
 * @param {string} [args.keyword] - Search for issues with names containing this keyword (case-insensitive)
 * @param {string} [args.createdAfter] - Filter issues created after this date (ISO 8601 format)
 * @param {string} [args.createdBefore] - Filter issues created before this date (ISO 8601 format)
 * @param {string} [args.statusUpdatedBefore] - Filter issues where status was last updated before this date
 * @returns {Promise<{content: Array<{type: string, text: string}>}>}
 */
export async function getIssues(args) {
  const {
    first,
    offset,
    stateId = "ACTIVE",
    teamId: providedTeamId,
    leadershipTeam = false,
    userId,
    status = "TODO",
    type = "Short-term",
    fromMeetings = false,
    keyword,
    createdAfter,
    createdBefore,
    statusUpdatedBefore,
  } = args;

  // Resolve teamId if leadershipTeam is true
  let teamId = providedTeamId;
  if (leadershipTeam && !providedTeamId) {
    teamId = await getLeadershipTeamId();
    if (!teamId) {
      return {
        content: [
          {
            type: "text",
            text: "Error: Could not find leadership team. Please ensure a team is marked as the leadership team.",
          },
        ],
      };
    }
  }
  // Validate stateId
  const validation = validateStateId(stateId);
  if (!validation.isValid) {
    return {
      content: [{ type: "text", text: validation.error }],
    };
  }

  // Validate status if provided
  if (status && !["TODO", "COMPLETE", "ALL"].includes(status)) {
    return {
      content: [
        {
          type: "text",
          text: 'Invalid status - must be "TODO", "COMPLETE", or "ALL"',
        },
      ],
    };
  }

  // Validate type if provided
  if (type && !["Short-term", "Long-term", "ALL"].includes(type)) {
    return {
      content: [
        {
          type: "text",
          text: 'Invalid type - must be "Short-term", "Long-term", or "ALL"',
        },
      ],
    };
  }

  const filterItems = [`stateId: {equalTo: "${stateId}"}`];

  // Add teamId filter if provided
  if (teamId) {
    filterItems.push(`teamId: {equalTo: "${teamId}"}`);
  }

  // Add userId filter if provided
  if (userId) {
    filterItems.push(`userId: {equalTo: "${userId}"}`);
  }

  // Add keyword filter if provided
  if (keyword) {
    filterItems.push(`name: {includesInsensitive: "${keyword}"}`);
  }

  // Add status filter if provided (skip if "ALL")
  if (status && status !== "ALL") {
    filterItems.push(`issueStatusId: {equalTo: "${status}"}`);
  }

  // Add type filter if provided (skip if "ALL")
  if (type && type !== "ALL") {
    filterItems.push(`type: {equalTo: "${type.toLowerCase()}"}`);
  }

  // Add meetingId filter if fromMeetings is true
  if (fromMeetings) {
    filterItems.push(`meetingId: {isNull: false}`);
  }

  // Add date filters
  if (createdAfter) {
    filterItems.push(`createdAt: {greaterThanOrEqualTo: "${createdAfter}"}`);
  }
  if (createdBefore) {
    filterItems.push(`createdAt: {lessThanOrEqualTo: "${createdBefore}"}`);
  }
  if (statusUpdatedBefore) {
    filterItems.push(
      `statusUpdatedAt: {lessThanOrEqualTo: "${statusUpdatedBefore}"}`
    );
  }

  const filterStr = [
    filterItems.length > 0 ? `filter: {${filterItems.join(", ")}}` : "",
    first !== undefined ? `first: ${first}` : "",
    offset !== undefined ? `offset: ${offset}` : "",
  ]
    .filter(Boolean)
    .join(", ");

  const query = `
    query {
      issues(${filterStr}) {
        nodes {
          id
          issueStatusId
          name
          desc
          teamId
          userId
          type
          priorityNo
          priorityOrder
          statusUpdatedAt
          meetingId
          createdAt
          stateId
          companyId
        }
        totalCount
      }
    }
  `;

  const result = await callSuccessCoGraphQL(query);
  if (!result.ok) {
    return { content: [{ type: "text", text: result.error }] };
  }

  const data = result.data;
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify({
          totalCount: data.data.issues.totalCount,
          results: data.data.issues.nodes.map((issue) => ({
            id: issue.id,
            name: issue.name,
            description: issue.desc || "",
            status: issue.issueStatusId,
            type: issue.type
              ? issue.type.charAt(0).toUpperCase() + issue.type.slice(1)
              : null,
            priority: issue.priorityNo,
            priorityOrder: issue.priorityOrder,
            teamId: issue.teamId,
            userId: issue.userId,
            meetingId: issue.meetingId,
            createdAt: issue.createdAt,
            statusUpdatedAt: issue.statusUpdatedAt,
          })),
        }),
      },
    ],
  };
}

/**
 * List Success.co headlines
 * @param {Object} args - Arguments object
 * @param {number} [args.first] - Optional page size
 * @param {number} [args.offset] - Optional offset
 * @param {string} [args.headlineId] - Filter by specific headline ID
 * @param {string} [args.teamId] - Filter by team ID
 * @param {boolean} [args.leadershipTeam] - If true, automatically use the leadership team ID
 * @param {string} [args.userId] - Filter by user ID
 * @param {string} [args.status] - Filter by headline status: 'Shared' or 'Not shared' (defaults to 'Not shared')
 * @param {boolean} [args.fromMeetings] - If true, only return headlines from meetings
 * @param {string} [args.createdAfter] - Filter headlines created after this date (ISO 8601 format)
 * @param {string} [args.createdBefore] - Filter headlines created before this date (ISO 8601 format)
 * @param {string} [args.keyword] - Filter by keyword in name or description (case-insensitive)
 * @returns {Promise<{content: Array<{type: string, text: string}>}>}
 */
export async function getHeadlines(args) {
  const {
    first,
    offset,
    stateId = "ACTIVE",
    headlineId,
    teamId: providedTeamId,
    leadershipTeam = false,
    userId,
    fromMeetings = false,
    createdAfter,
    createdBefore,
    keyword,
    status = "Not shared",
  } = args;

  // Map external status values to internal database values
  const statusMapping = {
    Shared: "DISCUSSED",
    "Not shared": "DISCUSS",
  };
  const internalStatus = statusMapping[status];

  // Resolve teamId if leadershipTeam is true
  let teamId = providedTeamId;
  if (leadershipTeam && !providedTeamId) {
    teamId = await getLeadershipTeamId();
    if (!teamId) {
      return {
        content: [
          {
            type: "text",
            text: "Error: Could not find leadership team. Please ensure a team is marked as the leadership team.",
          },
        ],
      };
    }
  }
  // Validate stateId
  const validation = validateStateId(stateId);
  if (!validation.isValid) {
    return {
      content: [{ type: "text", text: validation.error }],
    };
  }

  const filterItems = [`stateId: {equalTo: "${stateId}"}`];

  // Add headlineId filter if provided
  if (headlineId) {
    filterItems.push(`id: {equalTo: "${headlineId}"}`);
  }

  // Add teamId filter if provided
  if (teamId) {
    filterItems.push(`teamId: {equalTo: "${teamId}"}`);
  }

  // Add userId filter if provided
  if (userId) {
    filterItems.push(`userId: {equalTo: "${userId}"}`);
  }

  // Add status filter if provided
  if (internalStatus) {
    filterItems.push(`headlineStatusId: {equalTo: "${internalStatus}"}`);
  }

  // Add meetingId filter if fromMeetings is true
  if (fromMeetings) {
    filterItems.push(`meetingId: {isNull: false}`);
  }

  // Add date filters
  if (createdAfter) {
    filterItems.push(`createdAt: {greaterThanOrEqualTo: "${createdAfter}"}`);
  }
  if (createdBefore) {
    filterItems.push(`createdAt: {lessThanOrEqualTo: "${createdBefore}"}`);
  }

  // Note: keyword filtering will be done post-query as GraphQL doesn't support LIKE/ILIKE easily
  const filterStr = [
    filterItems.length > 0 ? `filter: {${filterItems.join(", ")}}` : "",
    first !== undefined && !keyword ? `first: ${first}` : "",
    offset !== undefined && !keyword ? `offset: ${offset}` : "",
  ]
    .filter(Boolean)
    .join(", ");

  const query = `
    query {
      headlines(${filterStr}) {
        nodes {
          id
          name
          desc
          userId
          teamId
          headlineStatusId
          statusUpdatedAt
          meetingId
          createdAt
          stateId
          companyId
          isCascadingMessage
        }
        totalCount
      }
    }
  `;

  const result = await callSuccessCoGraphQL(query);
  if (!result.ok) {
    return { content: [{ type: "text", text: result.error }] };
  }

  let headlines = result.data.data.headlines.nodes;

  // Apply keyword filtering if provided
  if (keyword) {
    const lowerKeyword = keyword.toLowerCase();
    headlines = headlines.filter(
      (h) =>
        (h.name && h.name.toLowerCase().includes(lowerKeyword)) ||
        (h.desc && h.desc.toLowerCase().includes(lowerKeyword))
    );

    // Apply pagination after filtering if keyword is used
    const start = offset || 0;
    const end = first ? start + first : headlines.length;
    headlines = headlines.slice(start, end);
  }

  // Map internal status values back to external values
  const externalStatusMapping = {
    DISCUSSED: "Shared",
    DISCUSS: "Not shared",
  };

  return {
    content: [
      {
        type: "text",
        text: JSON.stringify({
          totalCount: headlines.length,
          results: headlines.map((headline) => ({
            id: headline.id,
            name: headline.name,
            description: headline.desc || "",
            status:
              externalStatusMapping[headline.headlineStatusId] ||
              headline.headlineStatusId,
            teamId: headline.teamId,
            userId: headline.userId,
            meetingId: headline.meetingId,
            isCascadingMessage: headline.isCascadingMessage,
            createdAt: headline.createdAt,
            statusUpdatedAt: headline.statusUpdatedAt,
          })),
        }),
      },
    ],
  };
}

// Vision-related tools have been replaced by getLeadershipVTO for better performance
// The following individual vision tools are no longer needed:
// - getVisions, getVisionCoreValues, getVisionCoreFocusTypes,
//   getVisionThreeYearGoals, getVisionMarketStrategies
// Use getLeadershipVTO instead for comprehensive V/TO data

/**
 * List Success.co milestones
 * @param {Object} args - Arguments object
 * @param {number} [args.first] - Optional page size
 * @param {number} [args.offset] - Optional offset
 * @param {string} [args.stateId] - Milestone state filter (defaults to 'ACTIVE')
 * @param {string} [args.rockId] - Filter by rock ID
 * @param {string} [args.userId] - Filter by user ID
 * @param {string} [args.teamId] - Filter by team ID
 * @param {string} [args.keyword] - Search for milestones with names containing this keyword (case-insensitive)
 * @returns {Promise<{content: Array<{type: string, text: string}>}>}
 */
export async function getMilestones(args) {
  const {
    first,
    offset,
    stateId = "ACTIVE",
    rockId,
    userId,
    teamId: providedTeamId,
    leadershipTeam = false,
    keyword,
  } = args;

  // Resolve teamId if leadershipTeam is true
  let teamId = providedTeamId;
  if (leadershipTeam && !providedTeamId) {
    teamId = await getLeadershipTeamId();
    if (!teamId) {
      return {
        content: [
          {
            type: "text",
            text: "Error: Could not find leadership team. Please ensure a team is marked as the leadership team.",
          },
        ],
      };
    }
  }
  // Validate stateId
  const validation = validateStateId(stateId);
  if (!validation.isValid) {
    return {
      content: [{ type: "text", text: validation.error }],
    };
  }

  const filterParts = [`stateId: {equalTo: "${stateId}"}`];
  if (rockId) filterParts.push(`rockId: {equalTo: "${rockId}"}`);
  if (userId) filterParts.push(`userId: {equalTo: "${userId}"}`);
  if (teamId) filterParts.push(`teamId: {equalTo: "${teamId}"}`);
  if (keyword) filterParts.push(`name: {includesInsensitive: "${keyword}"}`);
  if (first !== undefined) filterParts.push(`first: ${first}`);
  if (offset !== undefined) filterParts.push(`offset: ${offset}`);

  const filterStr = filterParts.join(", ");

  const query = `
    query {
      milestones(${filterStr ? `filter: {${filterStr}}` : ""}) {
        nodes {
          id
          rockId
          name
          dueDate
          userId
          milestoneStatusId
          createdAt
          stateId
          companyId
        }
        totalCount
      }
    }
  `;

  const result = await callSuccessCoGraphQL(query);
  if (!result.ok) {
    return { content: [{ type: "text", text: result.error }] };
  }

  const data = result.data;
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify({
          totalCount: data.data.milestones.totalCount,
          results: data.data.milestones.nodes.map((milestone) => ({
            id: milestone.id,
            rockId: milestone.rockId,
            name: milestone.name,
            dueDate: milestone.dueDate,
            userId: milestone.userId,
            milestoneStatusId: milestone.milestoneStatusId,
            createdAt: milestone.createdAt,
            status: milestone.stateId,
          })),
        }),
      },
    ],
  };
}

/**
 * Search Success.co data (supports: teams, users, todos, rocks, meetings, issues, headlines, visions)
 * @param {Object} args - Arguments object
 * @param {string} args.query - What to look up, e.g., 'list my teams', 'show users', 'find todos', 'get meetings', 'show vision'
 * @returns {Promise<{content: Array<{type: string, text: string}>}>}
 */
export async function search(args) {
  const { query } = args;
  const q = (query || "").toLowerCase();

  const wantsTeams =
    /\b(team|teams|my team|my teams)\b/.test(q) ||
    /list.*team/.test(q) ||
    /show.*team/.test(q);

  const wantsUsers =
    /\b(user|users|people|person|employee|employees)\b/.test(q) ||
    /list.*user/.test(q) ||
    /show.*user/.test(q) ||
    /list.*people/.test(q) ||
    /show.*people/.test(q);

  const wantsTodos =
    /\b(todo|todos|task|tasks|to-do|to-dos)\b/.test(q) ||
    /list.*todo/.test(q) ||
    /show.*todo/.test(q) ||
    /find.*todo/.test(q) ||
    /get.*todo/.test(q);

  const wantsRocks =
    /\b(rock|rocks|priority|priorities)\b/.test(q) ||
    /list.*rock/.test(q) ||
    /show.*rock/.test(q) ||
    /find.*rock/.test(q) ||
    /get.*rock/.test(q);

  const wantsMeetings =
    /\b(meeting|meetings|session|sessions)\b/.test(q) ||
    /list.*meeting/.test(q) ||
    /show.*meeting/.test(q) ||
    /find.*meeting/.test(q) ||
    /get.*meeting/.test(q);

  const wantsIssues =
    /\b(issue|issues|problem|problems|concern|concerns)\b/.test(q) ||
    /list.*issue/.test(q) ||
    /show.*issue/.test(q) ||
    /find.*issue/.test(q) ||
    /get.*issue/.test(q);

  const wantsHeadlines =
    /\b(headline|headlines|news|update|updates|announcement|announcements)\b/.test(
      q
    ) ||
    /list.*headline/.test(q) ||
    /show.*headline/.test(q) ||
    /find.*headline/.test(q) ||
    /get.*headline/.test(q);

  const wantsVisions =
    /\b(vision|visions|core values|core focus|three year goals|3 year goals|marketing strategy|market strategy)\b/.test(
      q
    ) ||
    /show.*vision/.test(q) ||
    /list.*vision/.test(q) ||
    /find.*vision/.test(q) ||
    /get.*vision/.test(q) ||
    /leadership.*team/.test(q) ||
    /current.*vision/.test(q);

  if (wantsTeams) {
    const gql = `
      query {
        teams(filter: {stateId: {equalTo: "ACTIVE"}}) {
          nodes {
            id
            name
            desc
          }
          totalCount
        }
      }
    `;
    const result = await callSuccessCoGraphQL(gql);
    if (!result.ok) return { content: [{ type: "text", text: result.error }] };

    const { data } = result;
    const hits = (data?.data?.teams?.nodes || []).map((t) => ({
      id: String(t.id), // REQUIRED by ChatGPT's fetch contract
      title: t.name ?? String(t.id),
      snippet: t.desc || "",
      // optional extras are fine, but keep required ones present
    }));

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            kind: "teams",
            totalCount: data?.data?.teams?.totalCount ?? hits.length,
            hits,
          }),
        },
      ],
    };
  }

  if (wantsUsers) {
    const gql = `
    query {
        users(filter: {stateId: {equalTo: "ACTIVE"}}) {
          nodes {
            id
            firstName
            lastName
            email
            jobTitle
            desc
          }
          totalCount
        }
      }
    `;
    const result = await callSuccessCoGraphQL(gql);
    if (!result.ok) return { content: [{ type: "text", text: result.error }] };

    const { data } = result;
    const hits = (data?.data?.users?.nodes || []).map((u) => ({
      id: String(u.id), // REQUIRED by ChatGPT's fetch contract
      title: `${u.firstName} ${u.lastName}`,
      snippet: `${u.jobTitle || ""} ${u.desc || ""}`.trim() || u.email,
      // optional extras are fine, but keep required ones present
    }));

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            kind: "users",
            totalCount: data?.data?.users?.totalCount ?? hits.length,
            hits,
          }),
        },
      ],
    };
  }

  if (wantsTodos) {
    const gql = `
      query {
        todos(filter: {stateId: {equalTo: "ACTIVE"}}) {
        nodes {
          id
          name
          desc
            type
            priorityNo
            dueDate
        }
        totalCount
      }
    `;
    const result = await callSuccessCoGraphQL(gql);
    if (!result.ok) return { content: [{ type: "text", text: result.error }] };

    const { data } = result;
    const hits = (data?.data?.todos?.nodes || []).map((t) => ({
      id: String(t.id), // REQUIRED by ChatGPT's fetch contract
      title: t.name ?? String(t.id),
      snippet:
        `${t.type || ""} ${t.desc || ""}`.trim() || `Priority: ${t.priorityNo}`,
      // optional extras are fine, but keep required ones present
    }));

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            kind: "todos",
            totalCount: data?.data?.todos?.totalCount ?? hits.length,
            hits,
          }),
        },
      ],
    };
  }

  if (wantsRocks) {
    const gql = `
      query {
        rocks(filter: {stateId: {equalTo: "ACTIVE"}}) {
          nodes {
            id
            name
            desc
            type
            dueDate
          }
          totalCount
        }
      }
    `;
    const result = await callSuccessCoGraphQL(gql);
    if (!result.ok) return { content: [{ type: "text", text: result.error }] };

    const { data } = result;
    const hits = (data?.data?.rocks?.nodes || []).map((r) => ({
      id: String(r.id), // REQUIRED by ChatGPT's fetch contract
      title: r.name ?? String(r.id),
      snippet: `${r.type || ""} ${r.desc || ""}`.trim() || `Due: ${r.dueDate}`,
      // optional extras are fine, but keep required ones present
    }));

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            kind: "rocks",
            totalCount: data?.data?.rocks?.totalCount ?? hits.length,
            hits,
          }),
        },
      ],
    };
  }

  if (wantsMeetings) {
    const gql = `
      query {
        meetings(filter: {stateId: {equalTo: "ACTIVE"}}) {
          nodes {
            id
            date
            startTime
            endTime
            averageRating
          }
          totalCount
        }
      }
    `;
    const result = await callSuccessCoGraphQL(gql);
    if (!result.ok) return { content: [{ type: "text", text: result.error }] };

    const { data } = result;
    const hits = (data?.data?.meetings?.nodes || []).map((m) => ({
      id: String(m.id), // REQUIRED by ChatGPT's fetch contract
      title: `Meeting on ${m.date}`,
      snippet: `${m.startTime || ""} - ${m.endTime || ""} (Rating: ${
        m.averageRating || "N/A"
      })`,
      // optional extras are fine, but keep required ones present
    }));

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            kind: "meetings",
            totalCount: data?.data?.meetings?.totalCount ?? hits.length,
            hits,
          }),
        },
      ],
    };
  }

  if (wantsIssues) {
    const gql = `
      query {
        issues(filter: {stateId: {equalTo: "ACTIVE"}}) {
          nodes {
            id
            name
            desc
            type
            priorityNo
          }
          totalCount
        }
      }
    `;
    const result = await callSuccessCoGraphQL(gql);
    if (!result.ok) return { content: [{ type: "text", text: result.error }] };

    const { data } = result;
    const hits = (data?.data?.issues?.nodes || []).map((i) => ({
      id: String(i.id), // REQUIRED by ChatGPT's fetch contract
      title: i.name ?? String(i.id),
      snippet:
        `${i.type || ""} ${i.desc || ""}`.trim() || `Priority: ${i.priorityNo}`,
      // optional extras are fine, but keep required ones present
    }));

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            kind: "issues",
            totalCount: data?.data?.issues?.totalCount ?? hits.length,
            hits,
          }),
        },
      ],
    };
  }

  if (wantsHeadlines) {
    const gql = `
      query {
        headlines(filter: {stateId: {equalTo: "ACTIVE"}}) {
          nodes {
            id
            name
            desc
            headlineStatusId
          }
          totalCount
        }
      }
    `;
    const result = await callSuccessCoGraphQL(gql);
    if (!result.ok) return { content: [{ type: "text", text: result.error }] };

    const { data } = result;
    const hits = (data?.data?.headlines?.nodes || []).map((h) => ({
      id: String(h.id), // REQUIRED by ChatGPT's fetch contract
      title: h.name ?? String(h.id),
      snippet: h.desc || `Status: ${h.headlineStatusId}`,
      // optional extras are fine, but keep required ones present
    }));

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            kind: "headlines",
            totalCount: data?.data?.headlines?.totalCount ?? hits.length,
            hits,
          }),
        },
      ],
    };
  }

  if (wantsVisions) {
    // First get leadership team visions
    const visionsGql = `
      query {
        visions(filter: {stateId: {equalTo: "ACTIVE"}, isLeadership: {equalTo: true}}) {
          nodes {
            id
            teamId
            isLeadership
            createdAt
          }
          totalCount
        }
      }
    `;
    const visionsResult = await callSuccessCoGraphQL(visionsGql);
    if (!visionsResult.ok)
      return { content: [{ type: "text", text: visionsResult.error }] };

    const { data: visionsData } = visionsResult;
    const leadershipVisions = visionsData?.data?.visions?.nodes || [];

    if (leadershipVisions.length === 0) {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              kind: "visions",
              totalCount: 0,
              hits: [],
              message: "No leadership team visions found",
            }),
          },
        ],
      };
    }

    // Get the first leadership vision (assuming there's typically one)
    const leadershipVision = leadershipVisions[0];

    // Get core values for this vision
    const coreValuesGql = `
      query {
        visionCoreValues(filter: {stateId: {equalTo: "ACTIVE"}, visionId: {equalTo: "${leadershipVision.id}"}}) {
          nodes {
            id
            name
            cascadeAll
            visionId
          }
          totalCount
        }
      }
    `;
    const coreValuesResult = await callSuccessCoGraphQL(coreValuesGql);

    // Get core focus types for this vision
    const coreFocusGql = `
      query {
        visionCoreFocusTypes(filter: {stateId: {equalTo: "ACTIVE"}, visionId: {equalTo: "${leadershipVision.id}"}}) {
          nodes {
            id
            name
            coreFocusName
            desc
            type
            visionId
          }
          totalCount
        }
      }
    `;
    const coreFocusResult = await callSuccessCoGraphQL(coreFocusGql);

    // Get three year goals for this vision
    const goalsGql = `
      query {
        visionThreeYearGoals(filter: {stateId: {equalTo: "ACTIVE"}, visionId: {equalTo: "${leadershipVision.id}"}}) {
          nodes {
            id
            name
            futureDate
            type
            visionId
          }
          totalCount
        }
      }
    `;
    const goalsResult = await callSuccessCoGraphQL(goalsGql);

    // Get market strategies for this vision
    const strategiesGql = `
      query {
        visionMarketStrategies(filter: {stateId: {equalTo: "ACTIVE"}, visionId: {equalTo: "${leadershipVision.id}"}}) {
          nodes {
            id
            name
            idealCustomer
            idealCustomerDesc
            provenProcess
            provenProcessDesc
            guarantee
            guaranteeDesc
            uniqueValueProposition
            visionId
          }
          totalCount
        }
      }
    `;
    const strategiesResult = await callSuccessCoGraphQL(strategiesGql);

    const hits = [];

    // Add core values
    if (
      coreValuesResult.ok &&
      coreValuesResult.data?.data?.visionCoreValues?.nodes
    ) {
      coreValuesResult.data.data.visionCoreValues.nodes.forEach((cv) => {
        hits.push({
          id: String(cv.id),
          title: `Core Value: ${cv.name}`,
          snippet: `Vision ID: ${cv.visionId}`,
          type: "core_value",
        });
      });
    }

    // Add core focus
    if (
      coreFocusResult.ok &&
      coreFocusResult.data?.data?.visionCoreFocusTypes?.nodes
    ) {
      coreFocusResult.data.data.visionCoreFocusTypes.nodes.forEach((cf) => {
        hits.push({
          id: String(cf.id),
          title: `Core Focus: ${cf.name}`,
          snippet: cf.desc || cf.coreFocusName || `Type: ${cf.type}`,
          type: "core_focus",
        });
      });
    }

    // Add three year goals
    if (goalsResult.ok && goalsResult.data?.data?.visionThreeYearGoals?.nodes) {
      goalsResult.data.data.visionThreeYearGoals.nodes.forEach((goal) => {
        hits.push({
          id: String(goal.id),
          title: `3-Year Goal: ${goal.name}`,
          snippet: `Target Date: ${goal.futureDate} | Type: ${goal.type}`,
          type: "three_year_goal",
        });
      });
    }

    // Add market strategies
    if (
      strategiesResult.ok &&
      strategiesResult.data?.data?.visionMarketStrategies?.nodes
    ) {
      strategiesResult.data.data.visionMarketStrategies.nodes.forEach(
        (strategy) => {
          hits.push({
            id: String(strategy.id),
            title: `Marketing Strategy: ${strategy.name}`,
            snippet: `Ideal Customer: ${strategy.idealCustomer} | Value Prop: ${strategy.uniqueValueProposition}`,
            type: "market_strategy",
          });
        }
      );
    }

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            kind: "visions",
            totalCount: hits.length,
            hits,
            visionId: leadershipVision.id,
            teamId: leadershipVision.teamId,
            isLeadership: leadershipVision.isLeadership,
          }),
        },
      ],
    };
  }

  return {
    content: [
      {
        type: "text",
        text: "I support searching for: teams, users, todos, rocks, meetings, issues, headlines, visions. Try: 'List my teams', 'Show users', 'Find todos', 'Get meetings', 'Show vision', etc.",
      },
    ],
  };
}

/**
 * Fetch a single Success.co item by id returned from search
 * @param {Object} args - Arguments object
 * @param {string} args.id - The id from a previous search hit
 * @returns {Promise<{content: Array<{type: string, text: string}>}>}
 */
export async function fetch(args) {
  const { id } = args;

  // Accept both raw ids like "123" and URIs like "success-co://teams/123", "success-co://users/123", etc.
  const teamMatch = /^success-co:\/\/teams\/(.+)$/.exec(id);
  const userMatch = /^success-co:\/\/users\/(.+)$/.exec(id);
  const todoMatch = /^success-co:\/\/todos\/(.+)$/.exec(id);
  const rockMatch = /^success-co:\/\/rocks\/(.+)$/.exec(id);
  const meetingMatch = /^success-co:\/\/meetings\/(.+)$/.exec(id);
  const issueMatch = /^success-co:\/\/issues\/(.+)$/.exec(id);
  const headlineMatch = /^success-co:\/\/headlines\/(.+)$/.exec(id);
  const visionMatch = /^success-co:\/\/visions\/(.+)$/.exec(id);
  const coreValueMatch = /^success-co:\/\/visionCoreValues\/(.+)$/.exec(id);
  const coreFocusMatch = /^success-co:\/\/visionCoreFocusTypes\/(.+)$/.exec(id);
  const goalMatch = /^success-co:\/\/visionThreeYearGoals\/(.+)$/.exec(id);
  const strategyMatch = /^success-co:\/\/visionMarketStrategies\/(.+)$/.exec(
    id
  );

  const teamId = teamMatch ? teamMatch[1] : null;
  const userId = userMatch ? userMatch[1] : null;
  const todoId = todoMatch ? todoMatch[1] : null;
  const rockId = rockMatch ? rockMatch[1] : null;
  const meetingId = meetingMatch ? meetingMatch[1] : null;
  const issueId = issueMatch ? issueMatch[1] : null;
  const headlineId = headlineMatch ? headlineMatch[1] : null;
  const visionId = visionMatch ? visionMatch[1] : null;
  const coreValueId = coreValueMatch ? coreValueMatch[1] : null;
  const coreFocusId = coreFocusMatch ? coreFocusMatch[1] : null;
  const goalId = goalMatch ? goalMatch[1] : null;
  const strategyId = strategyMatch ? strategyMatch[1] : null;
  const rawId =
    teamId ||
    userId ||
    todoId ||
    rockId ||
    meetingId ||
    issueId ||
    headlineId ||
    visionId ||
    coreValueId ||
    coreFocusId ||
    goalId ||
    strategyId ||
    id;

  const apiKey = getSuccessCoApiKey();
  if (!apiKey) {
    return {
      content: [
        {
          type: "text",
          text: "Success.co API key not set. Use setSuccessCoApiKey first.",
        },
      ],
    };
  }

  // Helper function to make GraphQL requests
  const makeGraphQLRequest = async (query, variables = {}) => {
    const url = getGraphQLEndpoint();
    const response = await globalThis.fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query, variables }),
    });

    if (response.ok) {
      const data = await response.json();
      // Log successful request
      logGraphQLCall(url, query, data, response.status);
      if (!data.errors) {
        return data;
      }
    } else {
      // Log failed request
      logGraphQLCall(url, query, null, response.status);
    }
    return null;
  };

  // Try to fetch as team
  if (
    teamId ||
    (!userId &&
      !todoId &&
      !rockId &&
      !meetingId &&
      !issueId &&
      !headlineId &&
      !teamMatch &&
      !userMatch &&
      !todoMatch &&
      !rockMatch &&
      !meetingMatch &&
      !issueMatch &&
      !headlineMatch)
  ) {
    const gql = `
      query ($id: ID!) {
        team(id: $id) {
          id
          name
          desc
          badgeUrl
          color
          isLeadership
          createdAt
          stateId
          companyId
        }
      }
    `;

    const result = await makeGraphQLRequest(gql, { id: rawId });
    if (result?.data?.team) {
      return {
        content: [{ type: "text", text: JSON.stringify(result.data.team) }],
      };
    }
  }

  // Try to fetch as user
  if (
    userId ||
    (!teamId &&
      !todoId &&
      !rockId &&
      !meetingId &&
      !issueId &&
      !headlineId &&
      !teamMatch &&
      !userMatch &&
      !todoMatch &&
      !rockMatch &&
      !meetingMatch &&
      !issueMatch &&
      !headlineMatch)
  ) {
    const gql = `
      query ($id: ID!) {
        user(id: $id) {
          id
          userName
          firstName
          lastName
          jobTitle
          desc
          avatar
          email
          userPermissionId
          userStatusId
          languageId
          timeZone
          companyId
        }
      }
    `;

    const result = await makeGraphQLRequest(gql, { id: rawId });
    if (result?.data?.user) {
      return {
        content: [{ type: "text", text: JSON.stringify(result.data.user) }],
      };
    }
  }

  // Try to fetch as todo
  if (
    todoId ||
    (!teamId &&
      !userId &&
      !rockId &&
      !meetingId &&
      !issueId &&
      !headlineId &&
      !teamMatch &&
      !userMatch &&
      !todoMatch &&
      !rockMatch &&
      !meetingMatch &&
      !issueMatch &&
      !headlineMatch)
  ) {
    const gql = `
      query ($id: ID!) {
        todo(id: $id) {
          id
          todoStatusId
          name
          desc
          teamId
          userId
          statusUpdatedAt
          type
          dueDate
          priorityNo
          createdAt
          stateId
          companyId
          meetingId
        }
      }
    `;

    const result = await makeGraphQLRequest(gql, { id: rawId });
    if (result?.data?.todo) {
      return {
        content: [{ type: "text", text: JSON.stringify(result.data.todo) }],
      };
    }
  }

  // Try to fetch as rock
  if (
    rockId ||
    (!teamId &&
      !userId &&
      !todoId &&
      !meetingId &&
      !issueId &&
      !headlineId &&
      !teamMatch &&
      !userMatch &&
      !todoMatch &&
      !rockMatch &&
      !meetingMatch &&
      !issueMatch &&
      !headlineMatch)
  ) {
    const gql = `
      query ($id: ID!) {
        rock(id: $id) {
          id
          rockStatusId
          name
          desc
          statusUpdatedAt
          type
          dueDate
          createdAt
          stateId
          companyId
        }
      }
    `;

    const result = await makeGraphQLRequest(gql, { id: rawId });
    if (result?.data?.rock) {
      const rock = result.data.rock;
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              id: rock.id,
              status: rock.rockStatusId,
              name: rock.name,
              desc: rock.desc,
              statusUpdatedAt: rock.statusUpdatedAt,
              type: rock.type,
              dueDate: rock.dueDate,
              createdAt: rock.createdAt,
              stateId: rock.stateId,
              companyId: rock.companyId,
            }),
          },
        ],
      };
    }
  }

  // Try to fetch as meeting
  if (
    meetingId ||
    (!teamId &&
      !userId &&
      !todoId &&
      !rockId &&
      !issueId &&
      !headlineId &&
      !teamMatch &&
      !userMatch &&
      !todoMatch &&
      !rockMatch &&
      !meetingMatch &&
      !issueMatch &&
      !headlineMatch)
  ) {
    const gql = `
      query ($id: ID!) {
        meeting(id: $id) {
          id
          meetingInfoId
          date
          startTime
          endTime
          averageRating
          meetingStatusId
          createdAt
          stateId
          companyId
        }
      }
    `;

    const result = await makeGraphQLRequest(gql, { id: rawId });
    if (result?.data?.meeting) {
      return {
        content: [{ type: "text", text: JSON.stringify(result.data.meeting) }],
      };
    }
  }

  // Try to fetch as issue
  if (
    issueId ||
    (!teamId &&
      !userId &&
      !todoId &&
      !rockId &&
      !meetingId &&
      !headlineId &&
      !teamMatch &&
      !userMatch &&
      !todoMatch &&
      !rockMatch &&
      !meetingMatch &&
      !issueMatch &&
      !headlineMatch)
  ) {
    const gql = `
      query ($id: ID!) {
        issue(id: $id) {
          id
          issueStatusId
          name
          desc
          teamId
          userId
          type
          priorityNo
          priorityOrder
          statusUpdatedAt
          meetingId
          createdAt
          stateId
          companyId
        }
      }
    `;

    const result = await makeGraphQLRequest(gql, { id: rawId });
    if (result?.data?.issue) {
      return {
        content: [{ type: "text", text: JSON.stringify(result.data.issue) }],
      };
    }
  }

  // Try to fetch as headline
  if (
    headlineId ||
    (!teamId &&
      !userId &&
      !todoId &&
      !rockId &&
      !meetingId &&
      !issueId &&
      !teamMatch &&
      !userMatch &&
      !todoMatch &&
      !rockMatch &&
      !meetingMatch &&
      !issueMatch &&
      !headlineMatch)
  ) {
    const gql = `
      query ($id: ID!) {
        headline(id: $id) {
          id
          name
          desc
          userId
          teamId
          headlineStatusId
          statusUpdatedAt
          meetingId
          createdAt
          stateId
          companyId
          isCascadingMessage
        }
      }
    `;

    const result = await makeGraphQLRequest(gql, { id: rawId });
    if (result?.data?.headline) {
      return {
        content: [{ type: "text", text: JSON.stringify(result.data.headline) }],
      };
    }
  }

  // Try to fetch as vision
  if (
    visionId ||
    (!teamId &&
      !userId &&
      !todoId &&
      !rockId &&
      !meetingId &&
      !issueId &&
      !headlineId &&
      !coreValueId &&
      !coreFocusId &&
      !goalId &&
      !strategyId &&
      !teamMatch &&
      !userMatch &&
      !todoMatch &&
      !rockMatch &&
      !meetingMatch &&
      !issueMatch &&
      !headlineMatch &&
      !visionMatch &&
      !coreValueMatch &&
      !coreFocusMatch &&
      !goalMatch &&
      !strategyMatch)
  ) {
    const gql = `
      query ($id: ID!) {
        vision(id: $id) {
          id
          teamId
          isLeadership
          createdAt
          stateId
          companyId
        }
      }
    `;

    const result = await makeGraphQLRequest(gql, { id: rawId });
    if (result?.data?.vision) {
      return {
        content: [{ type: "text", text: JSON.stringify(result.data.vision) }],
      };
    }
  }

  // Try to fetch as vision core value
  if (
    coreValueId ||
    (!teamId &&
      !userId &&
      !todoId &&
      !rockId &&
      !meetingId &&
      !issueId &&
      !headlineId &&
      !visionId &&
      !coreFocusId &&
      !goalId &&
      !strategyId &&
      !teamMatch &&
      !userMatch &&
      !todoMatch &&
      !rockMatch &&
      !meetingMatch &&
      !issueMatch &&
      !headlineMatch &&
      !visionMatch &&
      !coreValueMatch &&
      !coreFocusMatch &&
      !goalMatch &&
      !strategyMatch)
  ) {
    const gql = `
      query ($id: ID!) {
        visionCoreValue(id: $id) {
          id
          name
          cascadeAll
          visionId
          createdAt
          stateId
          companyId
        }
      }
    `;

    const result = await makeGraphQLRequest(gql, { id: rawId });
    if (result?.data?.visionCoreValue) {
      return {
        content: [
          { type: "text", text: JSON.stringify(result.data.visionCoreValue) },
        ],
      };
    }
  }

  // Try to fetch as vision core focus type
  if (
    coreFocusId ||
    (!teamId &&
      !userId &&
      !todoId &&
      !rockId &&
      !meetingId &&
      !issueId &&
      !headlineId &&
      !visionId &&
      !coreValueId &&
      !goalId &&
      !strategyId &&
      !teamMatch &&
      !userMatch &&
      !todoMatch &&
      !rockMatch &&
      !meetingMatch &&
      !issueMatch &&
      !headlineMatch &&
      !visionMatch &&
      !coreValueMatch &&
      !coreFocusMatch &&
      !goalMatch &&
      !strategyMatch)
  ) {
    const gql = `
      query ($id: ID!) {
        visionCoreFocusType(id: $id) {
          id
          name
          coreFocusName
          desc
          src
          type
          visionId
          cascadeAll
          createdAt
          stateId
          companyId
        }
      }
    `;

    const result = await makeGraphQLRequest(gql, { id: rawId });
    if (result?.data?.visionCoreFocusType) {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result.data.visionCoreFocusType),
          },
        ],
      };
    }
  }

  // Try to fetch as vision three year goal
  if (
    goalId ||
    (!teamId &&
      !userId &&
      !todoId &&
      !rockId &&
      !meetingId &&
      !issueId &&
      !headlineId &&
      !visionId &&
      !coreValueId &&
      !coreFocusId &&
      !strategyId &&
      !teamMatch &&
      !userMatch &&
      !todoMatch &&
      !rockMatch &&
      !meetingMatch &&
      !issueMatch &&
      !headlineMatch &&
      !visionMatch &&
      !coreValueMatch &&
      !coreFocusMatch &&
      !goalMatch &&
      !strategyMatch)
  ) {
    const gql = `
      query ($id: ID!) {
        visionThreeYearGoal(id: $id) {
          id
          name
          futureDate
          cascadeAll
          visionId
          type
          createdAt
          stateId
          companyId
        }
      }
    `;

    const result = await makeGraphQLRequest(gql, { id: rawId });
    if (result?.data?.visionThreeYearGoal) {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result.data.visionThreeYearGoal),
          },
        ],
      };
    }
  }

  // Try to fetch as vision market strategy
  if (
    strategyId ||
    (!teamId &&
      !userId &&
      !todoId &&
      !rockId &&
      !meetingId &&
      !issueId &&
      !headlineId &&
      !visionId &&
      !coreValueId &&
      !coreFocusId &&
      !goalId &&
      !teamMatch &&
      !userMatch &&
      !todoMatch &&
      !rockMatch &&
      !meetingMatch &&
      !issueMatch &&
      !headlineMatch &&
      !visionMatch &&
      !coreValueMatch &&
      !coreFocusMatch &&
      !goalMatch &&
      !strategyMatch)
  ) {
    const gql = `
      query ($id: ID!) {
        visionMarketStrategy(id: $id) {
          id
          name
          cascadeAll
          visionId
          idealCustomer
          idealCustomerDesc
          provenProcess
          provenProcessDesc
          guarantee
          guaranteeDesc
          uniqueValueProposition
          showProvenProcess
          showGuarantee
          isCustom
          createdAt
          stateId
          companyId
        }
      }
    `;

    const result = await makeGraphQLRequest(gql, { id: rawId });
    if (result?.data?.visionMarketStrategy) {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result.data.visionMarketStrategy),
          },
        ],
      };
    }
  }

  // If none worked, return error
  return {
    content: [
      {
        type: "text",
        text: `No team, user, todo, rock, meeting, issue, headline, vision, core value, core focus, goal, or strategy found for id ${rawId}`,
      },
    ],
  };
}

// ---------- Data Fields tool (Scorecard KPIs) ---------------------------------

// ---------- Scorecard Measurables tool (Combined Data Fields + Values) ----------

/**
 * List Success.co scorecard measurables (KPIs with values)
 * @param {Object} args - Arguments object
 * @param {number} [args.first] - Optional page size (default: 50)
 * @param {number} [args.offset] - Optional offset (default: 0)
 * @param {string} [args.stateId] - State filter (defaults to 'ACTIVE')
 * @param {string} [args.teamId] - Filter by team ID
 * @param {boolean} [args.leadershipTeam] - If true, automatically use the leadership team ID
 * @param {string} [args.userId] - Filter by user ID
 * @param {string} [args.type] - Filter by measurable type
 * @param {string} [args.dataFieldId] - Filter by specific data field ID
 * @param {string} [args.keyword] - Search for measurables with names containing this keyword (case-insensitive)
 * @param {string} [args.startDate] - Start date for values
 * @param {string} [args.endDate] - End date for values
 * @param {number} [args.periods] - Number of periods to return (default: 13)
 * @returns {Promise<{content: Array<{type: string, text: string}>}>}
 */
export async function getScorecardMeasurables(args) {
  const {
    first = 50,
    offset = 0,
    stateId = "ACTIVE",
    teamId: providedTeamId,
    leadershipTeam = false,
    userId,
    type,
    dataFieldId,
    keyword,
    startDate,
    endDate,
    periods = 13,
  } = args;

  // Resolve teamId if leadershipTeam is true
  let teamId = providedTeamId;
  if (leadershipTeam && !providedTeamId) {
    teamId = await getLeadershipTeamId();
    if (!teamId) {
      return {
        content: [
          {
            type: "text",
            text: "Error: Could not find leadership team. Please ensure a team is marked as the leadership team.",
          },
        ],
      };
    }
  }

  if (!validateStateId(stateId)) {
    return {
      content: [
        {
          type: "text",
          text: "Error: Invalid stateId. Must be 'ACTIVE' or 'INACTIVE'",
        },
      ],
    };
  }

  try {
    // If teamId is provided, first get the dataFieldIds for that team
    let teamDataFieldIds = null;
    if (teamId) {
      const teamsOnDataFieldsQuery = `
        query {
          teamsOnDataFields(filter: {teamId: {equalTo: "${teamId}"}, stateId: {equalTo: "${stateId}"}}) {
            nodes {
              dataFieldId
            }
          }
        }
      `;

      const teamsOnDataFieldsResult = await callSuccessCoGraphQL(
        teamsOnDataFieldsQuery
      );

      if (!teamsOnDataFieldsResult.ok) {
        return {
          content: [
            {
              type: "text",
              text: `Error fetching teams on data fields: ${teamsOnDataFieldsResult.error}`,
            },
          ],
        };
      }

      teamDataFieldIds =
        teamsOnDataFieldsResult.data?.data?.teamsOnDataFields?.nodes?.map(
          (rel) => rel.dataFieldId
        ) || [];

      // If teamId was provided but no dataFields found for that team, return empty result
      if (teamDataFieldIds.length === 0) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  scorecardMeasurables: [],
                  totalCount: 0,
                  message: `No data fields found for team ${teamId}`,
                },
                null,
                2
              ),
            },
          ],
        };
      }
    }

    // Get data fields (KPIs) directly with GraphQL query
    const filterParts = [`stateId: {equalTo: "${stateId}"}`];

    // If specific dataFieldId is provided, filter by it
    if (dataFieldId) {
      filterParts.push(`id: {equalTo: "${dataFieldId}"}`);
    }
    // If we have team-specific dataFieldIds, filter by them
    else if (teamDataFieldIds && teamDataFieldIds.length > 0) {
      const dataFieldIdFilters = teamDataFieldIds
        .map((id) => `"${id}"`)
        .join(", ");
      filterParts.push(`id: {in: [${dataFieldIdFilters}]}`);
    }

    // If userId is provided, filter by it at the GraphQL level
    if (userId) {
      filterParts.push(`userId: {equalTo: "${userId}"}`);
    }

    // If keyword is provided, filter by it at the GraphQL level
    if (keyword) {
      filterParts.push(`name: {includesInsensitive: "${keyword}"}`);
    }

    const filterStr = filterParts.join(", ");

    const dataFieldsQuery = `
      query {
        dataFields(${first !== undefined ? `first: ${first}` : ""}${
      offset !== undefined ? `, offset: ${offset}` : ""
    }${filterStr ? `, filter: {${filterStr}}` : ""}) {
          nodes {
            id
            name
            desc
            userId
            type
            unitType
            unitComparison
            goalTarget
            goalTargetEnd
            goalCurrency
            showAverage
            showTotal
            autoFormat
            autoRoundDecimals
            dataFieldStatusId
            statusUpdatedAt
            createdAt
            stateId
            formula
            order
          }
          totalCount
        }
      }
    `;

    const dataFieldsResult = await callSuccessCoGraphQL(dataFieldsQuery);

    if (!dataFieldsResult.ok) {
      return {
        content: [
          {
            type: "text",
            text: `Error fetching data fields: ${dataFieldsResult.error}`,
          },
        ],
      };
    }

    const dataFields = dataFieldsResult.data?.data?.dataFields?.nodes || [];

    // Apply additional filters if provided
    let filteredDataFields = dataFields;
    if (type) {
      // Map the type parameter to the corresponding data field type
      const typeMapping = {
        weekly: "WEEKLY",
        monthly: "MONTHLY",
        quarterly: "QUARTERLY",
        annually: "ANNUALLY",
      };
      const dataFieldType = typeMapping[type];
      if (dataFieldType) {
        filteredDataFields = filteredDataFields.filter(
          (field) => field.type === dataFieldType
        );
      }
    }

    // If no data fields found, return empty result
    if (filteredDataFields.length === 0) {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                scorecardMeasurables: [],
                totalCount: 0,
              },
              null,
              2
            ),
          },
        ],
      };
    }

    // Calculate date range for data values
    let calculatedStartDate = startDate;
    let calculatedEndDate = endDate;

    // Map type parameter to timeframe for the entire function
    const timeframeMapping = {
      weekly: "weeks",
      monthly: "months",
      quarterly: "quarters",
      annually: "years",
    };
    const timeframe = timeframeMapping[type] || "weeks";

    if (!startDate && !endDate) {
      const endDateObj = new Date();
      const startDateObj = new Date();

      switch (timeframe) {
        case "days":
          startDateObj.setDate(endDateObj.getDate() - periods * 7);
          break;
        case "weeks":
          startDateObj.setDate(endDateObj.getDate() - periods * 7);
          break;
        case "months":
          startDateObj.setMonth(endDateObj.getMonth() - periods);
          break;
        case "quarters":
          startDateObj.setMonth(endDateObj.getMonth() - periods * 3);
          break;
        case "years":
          startDateObj.setFullYear(endDateObj.getFullYear() - periods);
          break;
        default:
          startDateObj.setDate(endDateObj.getDate() - periods * 7);
      }

      calculatedStartDate = startDateObj.toISOString().split("T")[0];
      calculatedEndDate = endDateObj.toISOString().split("T")[0];
    }

    // Get data values for all data fields directly with GraphQL query
    const filters = [`stateId: {equalTo: "${stateId}"}`];

    // Build startDate filter with range if both dates provided
    if (calculatedStartDate || calculatedEndDate) {
      const startDateFilters = [];
      if (calculatedStartDate) {
        startDateFilters.push(`greaterThanOrEqualTo: "${calculatedStartDate}"`);
      }
      if (calculatedEndDate) {
        startDateFilters.push(`lessThanOrEqualTo: "${calculatedEndDate}"`);
      }
      filters.push(`startDate: {${startDateFilters.join(", ")}}`);
    }

    if (dataFieldId) {
      filters.push(`dataFieldId: {equalTo: "${dataFieldId}"}`);
    }

    const dataValuesFilterStr = filters.join(", ");

    const dataValuesQuery = `
      query {
        dataValues(first: 1000, offset: 0${
          dataValuesFilterStr ? `, filter: {${dataValuesFilterStr}}` : ""
        }) {
          nodes {
            id
            dataFieldId
            startDate
            value
            createdAt
            stateId
            customGoalTarget
            customGoalTargetEnd
            note
          }
          totalCount
        }
      }
    `;

    const dataValuesResult = await callSuccessCoGraphQL(dataValuesQuery);

    if (!dataValuesResult.ok) {
      return {
        content: [
          {
            type: "text",
            text: `Error fetching data values: ${dataValuesResult.error}`,
          },
        ],
      };
    }

    const dataValues = dataValuesResult.data?.data?.dataValues?.nodes || [];

    // Group data values by data field ID
    const valuesByField = {};
    dataValues.forEach((value) => {
      if (!valuesByField[value.dataFieldId]) {
        valuesByField[value.dataFieldId] = [];
      }
      valuesByField[value.dataFieldId].push(value);
    });

    // Helper function to sort values by date (most recent first)
    function sortValuesByDate(values) {
      return values.sort(
        (a, b) => new Date(b.startDate) - new Date(a.startDate)
      );
    }

    // Create combined scorecard measurables
    const scorecardMeasurables = filteredDataFields.map((field) => {
      const fieldValues = valuesByField[field.id] || [];

      // Sort values by date (most recent first)
      const sortedValues = sortValuesByDate(fieldValues);

      return {
        ...field,
        values: sortedValues,
        type,
        timeframe,
      };
    });

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              scorecardMeasurables,
            },
            null,
            2
          ),
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `Error fetching scorecard measurables: ${error.message}`,
        },
      ],
    };
  }
}

// ---------- Data Values tool (Scorecard measurables) -----------------------------
// Note: Use getScorecardMeasurables for comprehensive scorecard analysis with metrics and values

// ---------- Meeting Infos tool -------------------------------------------------

export async function getMeetingInfos(args) {
  const {
    first = 50,
    offset = 0,
    stateId = "ACTIVE",
    teamId: providedTeamId,
    leadershipTeam = false,
    meetingInfoStatusId,
  } = args;

  // Resolve teamId if leadershipTeam is true
  let teamId = providedTeamId;
  if (leadershipTeam && !providedTeamId) {
    teamId = await getLeadershipTeamId();
    if (!teamId) {
      return {
        content: [
          {
            type: "text",
            text: "Error: Could not find leadership team. Please ensure a team is marked as the leadership team.",
          },
        ],
      };
    }
  }

  const query = `
    query GetMeetingInfos($first: Int, $offset: Int, $stateId: String, $teamId: String, $meetingInfoStatusId: String) {
      meetingInfos(
        first: $first
        offset: $offset
        where: {
          stateId: { equals: $stateId }
          ${teamId ? "teamId: { equals: $teamId }" : ""}
          ${
            meetingInfoStatusId
              ? "meetingInfoStatusId: { equals: $meetingInfoStatusId }"
              : ""
          }
        }
        orderBy: { createdAt: desc }
      ) {
        id
        name
        desc
        meetingAgendaId
        teamId
        meetingInfoStatusId
        meetingRepeatsId
        createdAt
        isBulkUpdate
        stateId
        companyId
        ownerUserId
        repeatInterval
        repeatUnit
        selectedDays
        team {
          id
          name
          desc
          color
          isLeadership
        }
        meetingAgenda {
          id
          name
          desc
          meetingAgendaStatusId
          meetingRepeatsId
          builtIn
          meetingAgendaTypeId
          facilitatorUserId
          scribeUserId
        }
        owner {
          id
          firstName
          lastName
          email
          jobTitle
        }
        meetingInfoStatus {
          id
          name
          color
          type
          order
        }
      }
    }
  `;

  const variables = {
    first,
    offset,
    stateId,
    ...(teamId && { teamId }),
    ...(meetingInfoStatusId && { meetingInfoStatusId }),
  };

  return await callSuccessCoGraphQL(query, variables);
}

/**
 * Get meeting agendas (templates for meetings)
 * @param {Object} args - Arguments object
 * @param {number} args.first - Number of records to return (default: 50)
 * @param {number} args.offset - Number of records to skip (default: 0)
 * @param {string} args.stateId - State filter (defaults to 'ACTIVE')
 * @param {string} args.teamId - Filter by team ID
 * @param {boolean} args.leadershipTeam - If true, automatically use the leadership team ID
 * @param {string} args.meetingAgendaStatusId - Filter by agenda status
 * @param {string} args.meetingAgendaTypeId - Filter by agenda type (e.g., 'LEVEL10', 'CUSTOM')
 * @param {boolean} args.builtIn - Filter by built-in agendas (true/false)
 * @returns {Promise<{content: Array<{type: string, text: string}>}>}
 */
export async function getMeetingAgendas(args) {
  const {
    first = 50,
    offset = 0,
    stateId = "ACTIVE",
    teamId: providedTeamId,
    leadershipTeam = false,
    meetingAgendaStatusId,
    meetingAgendaTypeId,
    builtIn,
  } = args;

  // Resolve teamId if leadershipTeam is true
  let teamId = providedTeamId;
  if (leadershipTeam && !providedTeamId) {
    teamId = await getLeadershipTeamId();
    if (!teamId) {
      return {
        content: [
          {
            type: "text",
            text: "Error: Could not find leadership team. Please ensure a team is marked as the leadership team.",
          },
        ],
      };
    }
  }

  // Build filter conditions
  const filterConditions = [
    `stateId: {equalTo: "${stateId}"}`,
    teamId ? `teamId: {equalTo: "${teamId}"}` : "",
    meetingAgendaStatusId
      ? `meetingAgendaStatusId: {equalTo: "${meetingAgendaStatusId}"}`
      : "",
    meetingAgendaTypeId
      ? `meetingAgendaTypeId: {equalTo: "${meetingAgendaTypeId}"}`
      : "",
    builtIn !== undefined ? `builtIn: {equalTo: ${builtIn}}` : "",
  ].filter(Boolean);

  const filterStr = filterConditions.join(", ");

  const query = `
    query {
      meetingAgendas(first: ${first}, offset: ${offset}, filter: {${filterStr}}, orderBy: CREATED_AT_DESC) {
        nodes {
          id
          name
          desc
          builtIn
          meetingAgendaStatusId
          meetingRepeatsId
          meetingAgendaTypeId
          teamId
          createdAt
          stateId
          companyId
          facilitatorUserId
          scribeUserId
          repeatInterval
          repeatUnit
          selectedDays
          team {
            id
            name
            desc
            color
            isLeadership
          }
          meetingAgendaStatus {
            id
            name
            color
            order
          }
          meetingAgendaType {
            id
            name
            order
          }
          facilitatorUser {
            id
            firstName
            lastName
            email
            jobTitle
          }
          scribeUser {
            id
            firstName
            lastName
            email
            jobTitle
          }
          meetingAgendaSections(orderBy: ORDER_ASC) {
            nodes {
              id
              name
              desc
              order
              duration
              type
              visible
            }
          }
        }
        totalCount
      }
    }
  `;

  const result = await callSuccessCoGraphQL(query);

  if (!result.ok) {
    return {
      content: [
        {
          type: "text",
          text: `Error fetching meeting agendas: ${result.error}`,
        },
      ],
    };
  }

  const data = result.data?.data?.meetingAgendas;

  if (!data) {
    return {
      content: [
        {
          type: "text",
          text: "Error: No meeting agendas data returned",
        },
      ],
    };
  }

  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(
          {
            totalCount: data.totalCount,
            results: data.nodes,
          },
          null,
          2
        ),
      },
    ],
  };
}

/**
 * Get the complete leadership Vision/Traction Organizer in one call
 * @param {Object} args - Arguments object
 * @param {string} args.stateId - State filter (defaults to 'ACTIVE')
 * @returns {Promise<{content: Array<{type: string, text: string}>}>}
 */
export async function getLeadershipVTO(args) {
  const { stateId = "ACTIVE" } = args;

  // Validate stateId
  const validation = validateStateId(stateId);
  if (!validation.isValid) {
    return {
      content: [{ type: "text", text: validation.error }],
    };
  }

  try {
    // Step 1: Find the leadership vision
    const visionsQuery = `
      query {
        visions(filter: {stateId: {equalTo: "${stateId}"}, isLeadership: {equalTo: true}}) {
          nodes {
            id
            teamId
            isLeadership
            createdAt
            stateId
            companyId
          }
          totalCount
        }
      }
    `;

    const visionsResult = await callSuccessCoGraphQL(visionsQuery);
    if (!visionsResult.ok) {
      return { content: [{ type: "text", text: visionsResult.error }] };
    }

    const visions = visionsResult.data.data.visions.nodes;
    if (visions.length === 0) {
      return {
        content: [
          {
            type: "text",
            text: "No leadership vision found. Please ensure you have a vision marked as leadership.",
          },
        ],
      };
    }

    const leadershipVision = visions[0];
    const visionId = leadershipVision.id;

    // Step 2: Fetch all VTO components in parallel
    const [
      coreValuesResult,
      coreFocusResult,
      threeYearGoalsResult,
      marketStrategiesResult,
    ] = await Promise.all([
      // Core Values
      callSuccessCoGraphQL(`
        query {
          visionCoreValues(filter: {stateId: {equalTo: "${stateId}"}, visionId: {equalTo: "${visionId}"}}) {
            nodes {
              id
              name
              cascadeAll
              visionId
              createdAt
              stateId
              companyId
            }
            totalCount
          }
        }
      `),

      // Core Focus Types
      callSuccessCoGraphQL(`
        query {
          visionCoreFocusTypes(filter: {stateId: {equalTo: "${stateId}"}, visionId: {equalTo: "${visionId}"}}) {
            nodes {
              id
              name
              coreFocusName
              desc
              src
              type
              visionId
              cascadeAll
              createdAt
              stateId
              companyId
            }
            totalCount
          }
        }
      `),

      // Three Year Goals
      callSuccessCoGraphQL(`
        query {
          visionThreeYearGoals(filter: {stateId: {equalTo: "${stateId}"}, visionId: {equalTo: "${visionId}"}}) {
            nodes {
              id
              name
              futureDate
              cascadeAll
              visionId
              type
              createdAt
              stateId
              companyId
            }
            totalCount
          }
        }
      `),

      // Market Strategies
      callSuccessCoGraphQL(`
        query {
          visionMarketStrategies(filter: {stateId: {equalTo: "${stateId}"}, visionId: {equalTo: "${visionId}"}}) {
            nodes {
              id
              name
              cascadeAll
              visionId
              idealCustomer
              idealCustomerDesc
              provenProcess
              provenProcessDesc
              guarantee
              guaranteeDesc
              uniqueValueProposition
              showProvenProcess
              showGuarantee
              isCustom
              createdAt
              stateId
              companyId
            }
            totalCount
          }
        }
      `),
    ]);

    // Check for errors in any of the parallel requests
    const errors = [];
    if (!coreValuesResult.ok)
      errors.push(`Core Values: ${coreValuesResult.error}`);
    if (!coreFocusResult.ok)
      errors.push(`Core Focus: ${coreFocusResult.error}`);
    if (!threeYearGoalsResult.ok)
      errors.push(`Three Year Goals: ${threeYearGoalsResult.error}`);
    if (!marketStrategiesResult.ok)
      errors.push(`Market Strategies: ${marketStrategiesResult.error}`);

    if (errors.length > 0) {
      return {
        content: [
          {
            type: "text",
            text: `Error fetching VTO components: ${errors.join(", ")}`,
          },
        ],
      };
    }

    // Extract data from results
    const coreValues = coreValuesResult.data.data.visionCoreValues.nodes;
    const coreFocusTypes = coreFocusResult.data.data.visionCoreFocusTypes.nodes;
    const threeYearGoals =
      threeYearGoalsResult.data.data.visionThreeYearGoals.nodes;
    const marketStrategies =
      marketStrategiesResult.data.data.visionMarketStrategies.nodes;

    // Build comprehensive VTO summary
    let vtoSummary = `# Leadership Vision/Traction Organizer Summary\n\n`;
    vtoSummary += `**Vision ID:** ${leadershipVision.id}\n`;
    vtoSummary += `**Team ID:** ${leadershipVision.teamId}\n`;
    vtoSummary += `**Created:** ${new Date(
      leadershipVision.createdAt
    ).toLocaleDateString()}\n`;
    vtoSummary += `**Status:** ${leadershipVision.stateId}\n\n`;

    // Core Values Section
    if (coreValues.length > 0) {
      vtoSummary += `## Core Values\n`;
      coreValues.forEach((value) => {
        vtoSummary += `• **${value.name}** (${
          value.cascadeAll ? "Cascades to all teams" : "Leadership only"
        })\n`;
      });
      vtoSummary += `\n`;
    }

    // Core Focus Types Section
    if (coreFocusTypes.length > 0) {
      vtoSummary += `## Core Focus\n`;
      coreFocusTypes.forEach((focus) => {
        vtoSummary += `• **${focus.name || focus.type}** (${focus.type})\n`;
        if (focus.desc) {
          // Clean up HTML tags from description
          const cleanDesc = focus.desc.replace(/<[^>]*>/g, "").trim();
          if (cleanDesc) {
            vtoSummary += `  - ${cleanDesc}\n`;
          }
        }
      });
      vtoSummary += `\n`;
    }

    // Three Year Goals Section
    if (threeYearGoals.length > 0) {
      vtoSummary += `## Goals & Planning\n`;
      threeYearGoals.forEach((goal) => {
        vtoSummary += `• **${goal.name}** (${goal.type})\n`;
        if (goal.futureDate) {
          vtoSummary += `  - Target Date: ${new Date(
            goal.futureDate
          ).toLocaleDateString()}\n`;
        }
      });
      vtoSummary += `\n`;
    }

    // Market Strategies Section
    if (marketStrategies.length > 0) {
      vtoSummary += `## Market Strategy\n`;
      marketStrategies.forEach((strategy) => {
        vtoSummary += `• **${strategy.name}**\n`;

        if (strategy.idealCustomer) {
          vtoSummary += `  - Target Market: ${strategy.idealCustomer}\n`;
        }

        if (strategy.idealCustomerDesc) {
          const cleanDesc = strategy.idealCustomerDesc
            .replace(/<[^>]*>/g, "")
            .trim();
          if (cleanDesc) {
            vtoSummary += `  - Market Description: ${cleanDesc}\n`;
          }
        }

        if (strategy.provenProcess) {
          vtoSummary += `  - Proven Process: ${strategy.provenProcess}\n`;
        }

        if (strategy.guarantee && strategy.showGuarantee) {
          vtoSummary += `  - Guarantee: ${strategy.guarantee}\n`;
          if (strategy.guaranteeDesc) {
            const cleanDesc = strategy.guaranteeDesc
              .replace(/<[^>]*>/g, "")
              .trim();
            if (cleanDesc) {
              vtoSummary += `    ${cleanDesc}\n`;
            }
          }
        }

        if (strategy.uniqueValueProposition) {
          vtoSummary += `  - Unique Value Proposition: ${strategy.uniqueValueProposition}\n`;
        }
      });
      vtoSummary += `\n`;
    }

    // Add summary statistics
    vtoSummary += `## Summary Statistics\n`;
    vtoSummary += `• Core Values: ${coreValues.length}\n`;
    vtoSummary += `• Core Focus Items: ${coreFocusTypes.length}\n`;
    vtoSummary += `• Goals & Plans: ${threeYearGoals.length}\n`;
    vtoSummary += `• Market Strategies: ${marketStrategies.length}\n`;

    return {
      content: [
        {
          type: "text",
          text: vtoSummary,
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `Error fetching leadership VTO: ${error.message}`,
        },
      ],
    };
  }
}

/**
 * Get People Analyzer sessions and results
 * @param {Object} args - Arguments object
 * @param {number} [args.first] - Optional page size
 * @param {number} [args.offset] - Optional offset
 * @param {string} [args.stateId] - State filter (defaults to 'ACTIVE')
 * @param {string} [args.teamId] - Filter by team ID
 * @param {boolean} [args.leadershipTeam] - If true, automatically use the leadership team ID
 * @param {string} [args.sessionId] - Filter by specific session ID
 * @param {string} [args.createdAfter] - Filter sessions created after this date
 * @param {string} [args.createdBefore] - Filter sessions created before this date
 * @returns {Promise<{content: Array<{type: string, text: string}>}>}
 */
export async function getPeopleAnalyzerSessions(args) {
  const {
    first = 50,
    offset = 0,
    stateId = "ACTIVE",
    teamId: providedTeamId,
    leadershipTeam = false,
    sessionId,
    createdAfter,
    createdBefore,
  } = args;

  // Resolve teamId if leadershipTeam is true
  let teamId = providedTeamId;
  if (leadershipTeam && !providedTeamId) {
    teamId = await getLeadershipTeamId();
    if (!teamId) {
      return {
        content: [
          {
            type: "text",
            text: "Error: Could not find leadership team. Please ensure a team is marked as the leadership team.",
          },
        ],
      };
    }
  }

  const validation = validateStateId(stateId);
  if (!validation.isValid) {
    return {
      content: [{ type: "text", text: validation.error }],
    };
  }

  const filterItems = [`stateId: {equalTo: "${stateId}"}`];

  if (teamId) {
    filterItems.push(`teamId: {equalTo: "${teamId}"}`);
  }
  if (sessionId) {
    filterItems.push(`id: {equalTo: "${sessionId}"}`);
  }
  if (createdAfter) {
    filterItems.push(`createdAt: {greaterThanOrEqualTo: "${createdAfter}"}`);
  }
  if (createdBefore) {
    filterItems.push(`createdAt: {lessThanOrEqualTo: "${createdBefore}"}`);
  }

  const filterStr = [
    filterItems.length > 0 ? `filter: {${filterItems.join(", ")}}` : "",
    `first: ${first}`,
    `offset: ${offset}`,
  ]
    .filter(Boolean)
    .join(", ");

  const query = `
    query {
      peopleAnalyzerSessions(${filterStr}) {
        nodes {
          id
          name
          teamId
          peopleAnalyzerSessionStatusId
          createdAt
          updatedAt
          stateId
          companyId
        }
        totalCount
      }
    }
  `;

  const result = await callSuccessCoGraphQL(query);
  if (!result.ok) {
    return { content: [{ type: "text", text: result.error }] };
  }

  const sessions = result.data.data.peopleAnalyzerSessions.nodes;

  // For each session, get the user scores
  const sessionsWithScores = await Promise.all(
    sessions.map(async (session) => {
      const scoresQuery = `
        query {
          peopleAnalyzerSessionUsersScores(filter: {peopleAnalyzerSessionId: {equalTo: "${session.id}"}}) {
            nodes {
              id
              peopleAnalyzerSessionUserId
              peopleAnalyzerSessionId
              rightPerson
              rightSeat
              getsIt
              wantsIt
              capacityToDoIt
              createdAt
              updatedAt
            }
          }
          peopleAnalyzerSessionUsers(filter: {peopleAnalyzerSessionId: {equalTo: "${session.id}"}}) {
            nodes {
              id
              peopleAnalyzerSessionId
              userId
              createdAt
            }
          }
        }
      `;

      const scoresResult = await callSuccessCoGraphQL(scoresQuery);
      if (!scoresResult.ok) {
        return { ...session, users: [], scores: [] };
      }

      return {
        ...session,
        users: scoresResult.data.data.peopleAnalyzerSessionUsers.nodes,
        scores: scoresResult.data.data.peopleAnalyzerSessionUsersScores.nodes,
      };
    })
  );

  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(
          {
            totalCount: result.data.data.peopleAnalyzerSessions.totalCount,
            sessions: sessionsWithScores,
          },
          null,
          2
        ),
      },
    ],
  };
}

/**
 * Get Organization Checkup sessions and scores
 * @param {Object} args - Arguments object
 * @param {number} [args.first] - Optional page size
 * @param {number} [args.offset] - Optional offset
 * @param {string} [args.stateId] - State filter (defaults to 'ACTIVE')
 * @param {string} [args.checkupId] - Filter by specific checkup ID
 * @param {string} [args.createdAfter] - Filter checkups created after this date
 * @param {string} [args.createdBefore] - Filter checkups created before this date
 * @returns {Promise<{content: Array<{type: string, text: string}>}>}
 */
export async function getOrgCheckups(args) {
  const {
    first = 50,
    offset = 0,
    stateId = "ACTIVE",
    checkupId,
    createdAfter,
    createdBefore,
  } = args;

  const validation = validateStateId(stateId);
  if (!validation.isValid) {
    return {
      content: [{ type: "text", text: validation.error }],
    };
  }

  const filterItems = [`stateId: {equalTo: "${stateId}"}`];

  if (checkupId) {
    filterItems.push(`id: {equalTo: "${checkupId}"}`);
  }
  if (createdAfter) {
    filterItems.push(`createdAt: {greaterThanOrEqualTo: "${createdAfter}"}`);
  }
  if (createdBefore) {
    filterItems.push(`createdAt: {lessThanOrEqualTo: "${createdBefore}"}`);
  }

  const filterStr = [
    filterItems.length > 0 ? `filter: {${filterItems.join(", ")}}` : "",
    `first: ${first}`,
    `offset: ${offset}`,
  ]
    .filter(Boolean)
    .join(", ");

  const query = `
    query {
      orgCheckups(${filterStr}) {
        nodes {
          id
          name
          orgCheckupStatusId
          score
          createdAt
          updatedAt
          stateId
          companyId
        }
        totalCount
      }
    }
  `;

  const result = await callSuccessCoGraphQL(query);
  if (!result.ok) {
    return { content: [{ type: "text", text: result.error }] };
  }

  const checkups = result.data.data.orgCheckups.nodes;

  // For each checkup, get the answers/scores
  const checkupsWithAnswers = await Promise.all(
    checkups.map(async (checkup) => {
      const answersQuery = `
        query {
          orgCheckupAnswers(filter: {orgCheckupId: {equalTo: "${checkup.id}"}}) {
            nodes {
              id
              orgCheckupId
              questionNumber
              answer
              createdAt
              updatedAt
            }
          }
        }
      `;

      const answersResult = await callSuccessCoGraphQL(answersQuery);
      if (!answersResult.ok) {
        return { ...checkup, answers: [] };
      }

      return {
        ...checkup,
        answers: answersResult.data.data.orgCheckupAnswers.nodes,
      };
    })
  );

  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(
          {
            totalCount: result.data.data.orgCheckups.totalCount,
            checkups: checkupsWithAnswers,
          },
          null,
          2
        ),
      },
    ],
  };
}

/**
 * Get users on teams (team membership)
 * @param {Object} args - Arguments object
 * @param {string} [args.teamId] - Filter by team ID
 * @param {boolean} [args.leadershipTeam] - If true, automatically use the leadership team ID
 * @param {string} [args.userId] - Filter by user ID
 * @param {string} [args.stateId] - State filter (defaults to 'ACTIVE')
 * @returns {Promise<{content: Array<{type: string, text: string}>}>}
 */
export async function getUsersOnTeams(args) {
  const {
    teamId: providedTeamId,
    leadershipTeam = false,
    userId,
    stateId = "ACTIVE",
  } = args;

  // Resolve teamId if leadershipTeam is true
  let teamId = providedTeamId;
  if (leadershipTeam && !providedTeamId) {
    teamId = await getLeadershipTeamId();
    if (!teamId) {
      return {
        content: [
          {
            type: "text",
            text: "Error: Could not find leadership team. Please ensure a team is marked as the leadership team.",
          },
        ],
      };
    }
  }

  const validation = validateStateId(stateId);
  if (!validation.isValid) {
    return {
      content: [{ type: "text", text: validation.error }],
    };
  }

  const filterItems = [`stateId: {equalTo: "${stateId}"}`];

  if (teamId) {
    filterItems.push(`teamId: {equalTo: "${teamId}"}`);
  }
  if (userId) {
    filterItems.push(`userId: {equalTo: "${userId}"}`);
  }

  const filterStr = filterItems.join(", ");

  const query = `
    query {
      usersOnTeams(filter: {${filterStr}}) {
        nodes {
          id
          userId
          teamId
          createdAt
          stateId
          companyId
        }
        totalCount
      }
    }
  `;

  const result = await callSuccessCoGraphQL(query);
  if (!result.ok) {
    return { content: [{ type: "text", text: result.error }] };
  }

  const usersOnTeams = result.data.data.usersOnTeams.nodes;

  // Get user and team details in parallel
  const userIds = [...new Set(usersOnTeams.map((ut) => ut.userId))];
  const teamIds = [...new Set(usersOnTeams.map((ut) => ut.teamId))];

  const [usersResult, teamsResult] = await Promise.all([
    userIds.length > 0
      ? callSuccessCoGraphQL(`
      query {
        users(filter: {id: {in: [${userIds
          .map((id) => `"${id}"`)
          .join(", ")}]}}) {
          nodes {
            id
            firstName
            lastName
            email
            jobTitle
          }
        }
      }
    `)
      : { ok: true, data: { data: { users: { nodes: [] } } } },
    teamIds.length > 0
      ? callSuccessCoGraphQL(`
      query {
        teams(filter: {id: {in: [${teamIds
          .map((id) => `"${id}"`)
          .join(", ")}]}}) {
          nodes {
            id
            name
            desc
            isLeadership
          }
        }
      }
    `)
      : { ok: true, data: { data: { teams: { nodes: [] } } } },
  ]);

  const usersMap = {};
  const teamsMap = {};

  if (usersResult.ok) {
    usersResult.data.data.users.nodes.forEach((user) => {
      usersMap[user.id] = user;
    });
  }

  if (teamsResult.ok) {
    teamsResult.data.data.teams.nodes.forEach((team) => {
      teamsMap[team.id] = team;
    });
  }

  const enrichedData = usersOnTeams.map((ut) => ({
    id: ut.id,
    userId: ut.userId,
    teamId: ut.teamId,
    user: usersMap[ut.userId] || null,
    team: teamsMap[ut.teamId] || null,
    createdAt: ut.createdAt,
  }));

  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(
          {
            totalCount: result.data.data.usersOnTeams.totalCount,
            memberships: enrichedData,
          },
          null,
          2
        ),
      },
    ],
  };
}

/**
 * Get comprehensive meeting details including all related items (headlines, todos, issues, ratings)
 * This tool is useful for queries like "What were the headlines from our last leadership L10?"
 * or "Summarize last week's meetings"
 *
 * @param {Object} args - Arguments object
 * @param {string} [args.meetingId] - Specific meeting ID to fetch details for
 * @param {string} [args.teamId] - Filter meetings by team (via meetingInfo)
 * @param {boolean} [args.leadershipTeam] - If true, automatically use the leadership team ID
 * @param {string} [args.dateAfter] - Filter meetings occurring on or after this date (YYYY-MM-DD)
 * @param {string} [args.dateBefore] - Filter meetings occurring on or before this date (YYYY-MM-DD)
 * @param {number} [args.first] - Optional page size (defaults to 10)
 * @param {string} [args.stateId] - State filter (defaults to 'ACTIVE')
 * @returns {Promise<Object>} Meeting details with related items
 */
export async function getMeetingDetails(args) {
  const {
    meetingId,
    teamId: providedTeamId,
    leadershipTeam = false,
    dateAfter,
    dateBefore,
    first = 10,
    stateId = "ACTIVE",
  } = args;

  // Resolve teamId if leadershipTeam is true
  let teamId = providedTeamId;
  if (leadershipTeam && !providedTeamId) {
    teamId = await getLeadershipTeamId();
    if (!teamId) {
      return {
        content: [
          {
            type: "text",
            text: "Error: Could not find leadership team. Please ensure a team is marked as the leadership team.",
          },
        ],
      };
    }
  }

  try {
    // Step 1: Get meetings based on filters
    let meetingsQuery = `
      query {
        meetings(first: ${first}, filter: {stateId: {equalTo: "${stateId}"}`;

    if (meetingId) {
      meetingsQuery += `, id: {equalTo: "${meetingId}"}`;
    }
    if (dateAfter) {
      meetingsQuery += `, date: {greaterThanOrEqualTo: "${dateAfter}"}`;
    }
    if (dateBefore) {
      meetingsQuery += `, date: {lessThanOrEqualTo: "${dateBefore}"}`;
    }

    meetingsQuery += `}, orderBy: DATE_DESC) {
          nodes {
            id
            meetingInfoId
            date
            startTime
            endTime
            averageRating
            meetingStatusId
            createdAt
          }
          totalCount
        }
      }
    `;

    const meetingsResult = await callSuccessCoGraphQL(meetingsQuery);
    if (!meetingsResult.ok) {
      return {
        content: [{ type: "text", text: meetingsResult.error }],
      };
    }

    let meetings = meetingsResult.data.data.meetings.nodes;

    // If teamId filter is provided, filter meetings by team
    if (teamId && meetings.length > 0) {
      // Get meetingInfos for the team
      const meetingInfosQuery = `
        query {
          meetingInfos(filter: {teamId: {equalTo: "${teamId}"}, stateId: {equalTo: "${stateId}"}}) {
            nodes {
              id
            }
          }
        }
      `;

      const meetingInfosResult = await callSuccessCoGraphQL(meetingInfosQuery);
      if (meetingInfosResult.ok) {
        const teamMeetingInfoIds = new Set(
          meetingInfosResult.data.data.meetingInfos.nodes.map((mi) => mi.id)
        );
        meetings = meetings.filter((m) =>
          teamMeetingInfoIds.has(m.meetingInfoId)
        );
      }
    }

    if (meetings.length === 0) {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              meetings: [],
              totalCount: 0,
              message: "No meetings found matching the criteria",
            }),
          },
        ],
      };
    }

    // Step 2: Get all meeting IDs for batch queries
    const meetingIds = meetings.map((m) => m.id);
    const meetingIdsStr = meetingIds.map((id) => `"${id}"`).join(", ");

    // Step 3: Fetch related data in parallel
    const [headlinesResult, todosResult, issuesResult] = await Promise.all([
      // Get headlines for these meetings
      callSuccessCoGraphQL(`
        query {
          headlines(filter: {meetingId: {in: [${meetingIdsStr}]}, stateId: {equalTo: "${stateId}"}}) {
            nodes {
              id
              name
              desc
              userId
              teamId
              headlineStatusId
              meetingId
              createdAt
            }
          }
        }
      `),

      // Get todos for these meetings
      callSuccessCoGraphQL(`
        query {
          todos(filter: {meetingId: {in: [${meetingIdsStr}]}, stateId: {equalTo: "${stateId}"}}) {
            nodes {
              id
              name
              desc
              todoStatusId
              userId
              teamId
              meetingId
              dueDate
              createdAt
            }
          }
        }
      `),

      // Get issues for these meetings
      callSuccessCoGraphQL(`
        query {
          issues(filter: {meetingId: {in: [${meetingIdsStr}]}, stateId: {equalTo: "${stateId}"}}) {
            nodes {
              id
              name
              desc
              issueStatusId
              userId
              teamId
              meetingId
              createdAt
            }
          }
        }
      `),
    ]);

    // Organize data by meeting
    const meetingDetails = meetings.map((meeting) => {
      const headlines = headlinesResult.ok
        ? headlinesResult.data.data.headlines.nodes.filter(
            (h) => h.meetingId === meeting.id
          )
        : [];

      const todos = todosResult.ok
        ? todosResult.data.data.todos.nodes.filter(
            (t) => t.meetingId === meeting.id
          )
        : [];

      const issues = issuesResult.ok
        ? issuesResult.data.data.issues.nodes.filter(
            (i) => i.meetingId === meeting.id
          )
        : [];

      return {
        meeting: {
          id: meeting.id,
          meetingInfoId: meeting.meetingInfoId,
          date: meeting.date,
          startTime: meeting.startTime,
          endTime: meeting.endTime,
          averageRating: meeting.averageRating,
          status: meeting.meetingStatusId,
          createdAt: meeting.createdAt,
        },
        headlines: headlines.map((h) => ({
          id: h.id,
          name: h.name,
          description: h.desc || "",
          status: h.headlineStatusId,
          userId: h.userId,
          teamId: h.teamId,
          createdAt: h.createdAt,
        })),
        todos: todos.map((t) => ({
          id: t.id,
          name: t.name,
          description: t.desc || "",
          status: t.todoStatusId,
          userId: t.userId,
          teamId: t.teamId,
          dueDate: t.dueDate,
          createdAt: t.createdAt,
        })),
        issues: issues.map((i) => ({
          id: i.id,
          name: i.name,
          description: i.desc || "",
          status: i.issueStatusId,
          userId: i.userId,
          teamId: i.teamId,
          createdAt: i.createdAt,
        })),
        summary: {
          headlineCount: headlines.length,
          todoCount: todos.length,
          issueCount: issues.length,
        },
      };
    });

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              meetings: meetingDetails,
              totalCount: meetingDetails.length,
            },
            null,
            2
          ),
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `Error fetching meeting details: ${error.message}`,
        },
      ],
    };
  }
}

/**
 * Create a new issue
 * @param {Object} args - Arguments object
 * @param {string} args.name - Issue name/title (required)
 * @param {string} [args.teamId] - Team ID to assign the issue to (required unless leadershipTeam is true)
 * @param {boolean} [args.leadershipTeam] - If true, automatically use the leadership team ID
 * @param {string} [args.desc] - Issue description
 * @param {string} [args.userId] - User ID to assign the issue to (defaults to current user from API key)
 * @param {string} [args.priority] - Priority level: 'High', 'Medium', 'Low', or 'No priority' (defaults to 'Medium')
 * @param {string} [args.type] - Issue type: 'Short-term' or 'Long-term' (defaults to 'Short-term')
 * @returns {Promise<{content: Array<{type: string, text: string}>}>}
 */
export async function createIssue(args) {
  const {
    name,
    teamId: providedTeamId,
    leadershipTeam = false,
    desc = "",
    userId: providedUserId,
    priority = "Medium",
    type: providedType = "Short-term",
  } = args;

  // Map priority string to numeric value for GraphQL
  const priorityNo = mapPriorityToNumber(priority);

  // Map type to lowercase for GraphQL
  const type = mapIssueTypeToLowercase(providedType);

  // Always set issueStatusId to TODO for new issues
  const issueStatusId = "TODO";

  if (!name || name.trim() === "") {
    return {
      content: [
        {
          type: "text",
          text: "Error: Issue name is required",
        },
      ],
    };
  }

  // Resolve teamId if leadershipTeam is true
  let teamId = providedTeamId;
  if (leadershipTeam && !providedTeamId) {
    teamId = await getLeadershipTeamId();
    if (!teamId) {
      return {
        content: [
          {
            type: "text",
            text: "Error: Could not find leadership team. Please ensure a team is marked as the leadership team.",
          },
        ],
      };
    }
  }

  if (!teamId) {
    return {
      content: [
        {
          type: "text",
          text: "Error: Team ID is required. Either provide teamId or set leadershipTeam to true.",
        },
      ],
    };
  }

  const apiKey = getSuccessCoApiKey();
  if (!apiKey) {
    return {
      content: [
        {
          type: "text",
          text: "Error: Success.co API key not set. Use setSuccessCoApiKey first.",
        },
      ],
    };
  }

  // Get context (company ID and user ID) from the API key
  const context = await getContextForApiKey(apiKey);
  if (!context) {
    return {
      content: [
        {
          type: "text",
          text: "Error: Could not determine context from API key. Please ensure database connection is configured.",
        },
      ],
    };
  }

  const companyId = context.companyId;
  const userId = providedUserId || context.userId; // Use provided userId or default to current user

  const mutation = `
    mutation CreateIssue($input: CreateIssueInput!) {
      createIssue(input: $input) {
        issue {
          id
          name
          desc
          issueStatusId
          teamId
          userId
          type
          priorityNo
          createdAt
          stateId
          companyId
        }
      }
    }
  `;

  const variables = {
    input: {
      issue: {
        name,
        desc,
        issueStatusId,
        priorityNo,
        type,
        teamId,
        userId,
        companyId,
        stateId: "ACTIVE",
      },
    },
  };

  const result = await callSuccessCoGraphQL(mutation, variables);

  if (!result.ok) {
    return {
      content: [
        {
          type: "text",
          text: `Error creating issue: ${result.error}`,
        },
      ],
    };
  }

  const issue = result.data?.data?.createIssue?.issue;

  if (!issue) {
    return {
      content: [
        {
          type: "text",
          text: `Error: Issue creation failed. ${JSON.stringify(
            result.data,
            null,
            2
          )}`,
        },
      ],
    };
  }

  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(
          {
            success: true,
            message: "Issue created successfully",
            issue: issue,
          },
          null,
          2
        ),
      },
    ],
  };
}

/**
 * Create a new rock
 * @param {Object} args - Arguments object
 * @param {string} args.name - Rock name/title (required)
 * @param {string} [args.desc] - Rock description
 * @param {string} [args.dueDate] - Due date (YYYY-MM-DD format). If not provided, defaults to the last date of the current quarter based on company's quarter dates.
 * @param {string} [args.teamId] - Team ID to assign the rock to (REQUIRED unless leadershipTeam is true)
 * @param {boolean} [args.leadershipTeam] - If true, automatically use the leadership team ID (REQUIRED unless teamId is provided)
 * @param {string} [args.userId] - User ID to assign the rock to
 * @param {string} [args.type] - Rock type: 'Personal' or 'Company' (defaults to 'Company')
 * @returns {Promise<{content: Array<{type: string, text: string}>}>}
 */
export async function createRock(args) {
  const {
    name,
    desc = "",
    dueDate: providedDueDate,
    teamId: providedTeamId,
    leadershipTeam = false,
    userId,
    type: providedType = "Company",
  } = args;

  // New rocks always start as ONTRACK
  const rockStatusId = "ONTRACK";

  // Map type to lowercase for GraphQL
  const type = mapRockTypeToLowercase(providedType);

  // Resolve teamId if leadershipTeam is true
  let teamId = providedTeamId;
  if (leadershipTeam && !providedTeamId) {
    teamId = await getLeadershipTeamId();
    if (!teamId) {
      return {
        content: [
          {
            type: "text",
            text: "Error: Could not find leadership team. Please ensure a team is marked as the leadership team.",
          },
        ],
      };
    }
  }

  // Validate that teamId is provided - rocks MUST be linked to a team
  if (!teamId) {
    return {
      content: [
        {
          type: "text",
          text: "Error: Rock must be assigned to a team. Please provide either 'teamId' or set 'leadershipTeam' to true.",
        },
      ],
    };
  }

  if (!name || name.trim() === "") {
    return {
      content: [
        {
          type: "text",
          text: "Error: Rock name is required",
        },
      ],
    };
  }

  const apiKey = getSuccessCoApiKey();
  if (!apiKey) {
    return {
      content: [
        {
          type: "text",
          text: "Error: Success.co API key not set. Use setSuccessCoApiKey first.",
        },
      ],
    };
  }

  // Get user and company info from the API key
  const context = await getUserAndCompanyInfoForApiKey(apiKey);
  if (!context) {
    return {
      content: [
        {
          type: "text",
          text: "Error: Could not determine user and company info. Please ensure database connection is configured.",
        },
      ],
    };
  }

  const companyId = context.companyId;
  // Use provided userId or default to current user from API key
  const finalUserId = userId || context.userId;

  // If dueDate is not provided, calculate the last date of the current quarter
  let dueDate = providedDueDate;
  if (!dueDate) {
    dueDate = await getLastDateOfCurrentQuarter(
      companyId,
      getDatabase(),
      isDevMode
    );
    if (!dueDate) {
      return {
        content: [
          {
            type: "text",
            text: "Error: Could not determine default due date. Please provide a due date explicitly.",
          },
        ],
      };
    }
    if (isDevMode) {
      console.error(
        `[DEBUG] Using calculated quarter end date as due date: ${dueDate}`
      );
    }
  }

  const mutation = `
    mutation CreateRock($input: CreateRockInput!) {
      createRock(input: $input) {
        rock {
          id
          name
          desc
          rockStatusId
          dueDate
          type
          userId
          user {
            id
            firstName
            lastName
            email
          }
          createdAt
          stateId
          companyId
        }
      }
    }
  `;

  const variables = {
    input: {
      rock: {
        name,
        desc,
        dueDate,
        rockStatusId,
        type,
        companyId,
        userId: finalUserId,
        stateId: "ACTIVE",
      },
    },
  };

  const result = await callSuccessCoGraphQL(mutation, variables);

  if (!result.ok) {
    return {
      content: [
        {
          type: "text",
          text: `Error creating rock: ${result.error}`,
        },
      ],
    };
  }

  const rock = result.data?.data?.createRock?.rock;

  if (!rock) {
    return {
      content: [
        {
          type: "text",
          text: `Error: Rock creation failed. ${JSON.stringify(
            result.data,
            null,
            2
          )}`,
        },
      ],
    };
  }

  // If teamId is provided, create the teams_on_rocks links (supports multiple teams)
  if (teamId) {
    // Parse comma-separated teamIds
    const teamIds = teamId
      .split(",")
      .map((id) => id.trim())
      .filter((id) => id);

    if (isDevMode) {
      console.error(
        `[DEBUG] Creating teams_on_rocks links for ${
          teamIds.length
        } team(s): ${teamIds.join(", ")}`
      );
    }

    const linkMutation = `
      mutation CreateTeamsOnRock($input: CreateTeamsOnRockInput!) {
        createTeamsOnRock(input: $input) {
          teamsOnRock {
            id
            teamId
            rockId
            stateId
          }
        }
      }
    `;

    const linkResults = [];
    const failedLinks = [];

    // Create a link for each team
    for (const singleTeamId of teamIds) {
      const linkVariables = {
        input: {
          teamsOnRock: {
            teamId: singleTeamId,
            rockId: rock.id,
            companyId,
            stateId: "ACTIVE",
          },
        },
      };

      const linkResult = await callSuccessCoGraphQL(
        linkMutation,
        linkVariables
      );

      if (
        linkResult.ok &&
        linkResult.data?.data?.createTeamsOnRock?.teamsOnRock
      ) {
        linkResults.push(singleTeamId);
      } else {
        failedLinks.push({
          teamId: singleTeamId,
          error: linkResult.error || "Unknown error",
        });
      }
    }

    // Report results
    if (failedLinks.length > 0) {
      const warningMessage =
        `Rock created successfully but some team assignments failed:\n` +
        `- Successfully linked to: ${linkResults.join(", ")}\n` +
        `- Failed to link to: ${failedLinks
          .map((f) => `${f.teamId} (${f.error})`)
          .join(", ")}\n\n` +
        `Rock details: ${JSON.stringify(rock, null, 2)}`;

      return {
        content: [
          {
            type: "text",
            text: warningMessage,
          },
        ],
      };
    }
  } else {
    if (isDevMode) {
      console.error(
        `[DEBUG] No teamId provided - skipping teams_on_rocks link creation`
      );
    }
  }

  // Build success message
  let message = "Rock created successfully";
  if (teamId) {
    const teamIds = teamId
      .split(",")
      .map((id) => id.trim())
      .filter((id) => id);
    message +=
      teamIds.length > 1
        ? ` and linked to ${teamIds.length} teams (${teamIds.join(", ")})`
        : ` and linked to team ${teamIds[0]}`;
  }

  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(
          {
            success: true,
            message,
            rock: {
              id: rock.id,
              name: rock.name,
              desc: rock.desc,
              status: rock.rockStatusId,
              dueDate: rock.dueDate,
              type: rock.type,
              userId: rock.userId,
              createdAt: rock.createdAt,
              stateId: rock.stateId,
              companyId: rock.companyId,
            },
          },
          null,
          2
        ),
      },
    ],
  };
}

/**
 * Update an existing issue
 * @param {Object} args - Arguments object
 * @param {string} args.issueId - Issue ID (required)
 * @param {string} [args.name] - Update issue name
 * @param {string} [args.desc] - Update issue description
 * @param {string} [args.issueStatusId] - Update status: 'TODO' or 'COMPLETE'
 * @param {string} [args.teamId] - Update team assignment
 * @param {boolean} [args.leadershipTeam] - If true, automatically use the leadership team ID for assignment
 * @param {string} [args.userId] - Update user assignment
 * @param {string} [args.priority] - Update priority level: 'High', 'Medium', 'Low', or 'No priority'
 * @returns {Promise<{content: Array<{type: string, text: string}>}>}
 */
export async function updateIssue(args) {
  const {
    issueId,
    name,
    desc,
    issueStatusId,
    teamId: providedTeamId,
    leadershipTeam = false,
    userId,
    priority,
  } = args;

  // Map priority string to numeric value for GraphQL if priority is provided
  const priorityNo =
    priority !== undefined ? mapPriorityToNumber(priority) : undefined;

  // Resolve teamId if leadershipTeam is true
  let teamId = providedTeamId;
  if (leadershipTeam && !providedTeamId) {
    teamId = await getLeadershipTeamId();
    if (!teamId) {
      return {
        content: [
          {
            type: "text",
            text: "Error: Could not find leadership team. Please ensure a team is marked as the leadership team.",
          },
        ],
      };
    }
  }

  if (!issueId) {
    return {
      content: [
        {
          type: "text",
          text: "Error: Issue ID is required",
        },
      ],
    };
  }

  const apiKey = getSuccessCoApiKey();
  if (!apiKey) {
    return {
      content: [
        {
          type: "text",
          text: "Error: Success.co API key not set. Use setSuccessCoApiKey first.",
        },
      ],
    };
  }

  const mutation = `
    mutation UpdateIssue($input: UpdateIssueInput!) {
      updateIssue(input: $input) {
        issue {
          id
          name
          desc
          issueStatusId
          teamId
          userId
          priorityNo
          statusUpdatedAt
          stateId
        }
      }
    }
  `;

  const updates = {};
  if (name) updates.name = name;
  if (desc !== undefined) updates.desc = desc;
  if (issueStatusId) updates.issueStatusId = issueStatusId;
  if (teamId) updates.teamId = teamId;
  if (userId) updates.userId = userId;
  if (priorityNo !== undefined) updates.priorityNo = priorityNo;

  if (Object.keys(updates).length === 0) {
    return {
      content: [
        {
          type: "text",
          text: "Error: No updates specified. Provide at least one field to update.",
        },
      ],
    };
  }

  const variables = {
    input: {
      id: issueId,
      patch: updates,
    },
  };

  const result = await callSuccessCoGraphQL(mutation, variables);

  if (!result.ok) {
    return {
      content: [
        {
          type: "text",
          text: `Error updating issue: ${result.error}`,
        },
      ],
    };
  }

  const issue = result.data?.data?.updateIssue?.issue;

  if (!issue) {
    return {
      content: [
        {
          type: "text",
          text: `Error: Issue update failed. ${JSON.stringify(
            result.data,
            null,
            2
          )}`,
        },
      ],
    };
  }

  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(
          {
            success: true,
            message: "Issue updated successfully",
            issue: issue,
          },
          null,
          2
        ),
      },
    ],
  };
}

/**
 * Update an existing rock
 * @param {Object} args - Arguments object
 * @param {string} args.rockId - Rock ID (required)
 * @param {string} [args.name] - Update rock name
 * @param {string} [args.desc] - Update rock description
 * @param {string} [args.status] - Update status ('ONTRACK', 'OFFTRACK', 'COMPLETE', 'INCOMPLETE')
 * @param {string} [args.dueDate] - Update due date
 * @param {string} [args.userId] - Update user assignment
 * @param {string} [args.teamId] - Update team assignment (comma-separated for multiple teams)
 * @returns {Promise<{content: Array<{type: string, text: string}>}>}
 */
export async function updateRock(args) {
  const { rockId, name, desc, status, dueDate, userId, teamId } = args;

  if (!rockId) {
    return {
      content: [
        {
          type: "text",
          text: "Error: Rock ID is required",
        },
      ],
    };
  }

  const apiKey = getSuccessCoApiKey();
  if (!apiKey) {
    return {
      content: [
        {
          type: "text",
          text: "Error: Success.co API key not set. Use setSuccessCoApiKey first.",
        },
      ],
    };
  }

  const mutation = `
    mutation UpdateRock($input: UpdateRockInput!) {
      updateRock(input: $input) {
        rock {
          id
          name
          desc
          rockStatusId
          dueDate
          userId
          statusUpdatedAt
          stateId
        }
      }
    }
  `;

  const updates = {};
  if (name) updates.name = name;
  if (desc !== undefined) updates.desc = desc;
  if (status) updates.rockStatusId = status;
  if (dueDate) updates.dueDate = dueDate;
  if (userId) updates.userId = userId;

  // Check if any updates were specified (including teamId)
  if (Object.keys(updates).length === 0 && !teamId) {
    return {
      content: [
        {
          type: "text",
          text: "Error: No updates specified. Provide at least one field to update.",
        },
      ],
    };
  }

  // Update rock properties if any were provided
  let rock = null;
  if (Object.keys(updates).length > 0) {
    const variables = {
      input: {
        id: rockId,
        patch: updates,
      },
    };

    const result = await callSuccessCoGraphQL(mutation, variables);

    if (!result.ok) {
      return {
        content: [
          {
            type: "text",
            text: `Error updating rock: ${result.error}`,
          },
        ],
      };
    }

    rock = result.data?.data?.updateRock?.rock;

    if (!rock) {
      return {
        content: [
          {
            type: "text",
            text: `Error: Rock update failed. ${JSON.stringify(
              result.data,
              null,
              2
            )}`,
          },
        ],
      };
    }
  }

  // Track team assignment changes for reporting
  let reactivatedLinks = [];

  // Handle team assignment updates if teamId is provided
  if (teamId) {
    if (isDevMode) {
      console.error(
        `[DEBUG] Starting team assignment update for rock ${rockId} with teamId: ${teamId}`
      );
    }

    // Get company ID for team operations
    const context = await getContextForApiKey(apiKey);
    if (!context) {
      if (isDevMode) {
        console.error(`[DEBUG] Failed to get context for API key`);
      }
      return {
        content: [
          {
            type: "text",
            text: "Error: Could not determine company context for team assignment update.",
          },
        ],
      };
    }
    const companyId = context.companyId;

    if (isDevMode) {
      console.error(`[DEBUG] Got company ID: ${companyId}`);
    }

    // Parse comma-separated teamIds
    const teamIds = teamId
      .split(",")
      .map((id) => id.trim())
      .filter((id) => id);

    if (isDevMode) {
      console.error(
        `[DEBUG] Parsed ${teamIds.length} team IDs: ${teamIds.join(", ")}`
      );
    }

    // First, get all existing teams_on_rocks links for this rock (including deleted ones)
    const existingQuery = `
      query GetTeamsOnRocks($rockId: UUID!) {
        teamsOnRocks(filter: {rockId: {equalTo: $rockId}}) {
          nodes {
            id
            teamId
            stateId
          }
        }
      }
    `;

    const existingLinks = await callSuccessCoGraphQL(existingQuery, { rockId });

    if (!existingLinks.ok) {
      if (isDevMode) {
        console.error(
          `[DEBUG] Failed to query existing teams_on_rocks: ${existingLinks.error}`
        );
      }
      return {
        content: [
          {
            type: "text",
            text: `Error querying existing team assignments: ${existingLinks.error}`,
          },
        ],
      };
    }

    // Build a map of existing links by teamId
    const existingLinksMap = new Map();
    if (existingLinks.data?.data?.teamsOnRocks?.nodes) {
      existingLinks.data.data.teamsOnRocks.nodes.forEach((node) => {
        existingLinksMap.set(node.teamId, {
          id: node.id,
          stateId: node.stateId,
        });
      });

      if (isDevMode) {
        console.error(
          `[DEBUG] Found ${existingLinksMap.size} existing team links`
        );
      }
    }

    // Soft delete (mark as DELETED) any existing ACTIVE links that are not in the new teamIds list
    const updateMutation = `
      mutation UpdateTeamsOnRock($input: UpdateTeamsOnRockInput!) {
        updateTeamsOnRock(input: $input) {
          teamsOnRock {
            id
            teamId
            stateId
          }
        }
      }
    `;

    for (const [existingTeamId, linkInfo] of existingLinksMap.entries()) {
      // If this team is not in the new list and is currently ACTIVE, mark as DELETED
      if (!teamIds.includes(existingTeamId) && linkInfo.stateId === "ACTIVE") {
        if (isDevMode) {
          console.error(
            `[DEBUG] Soft deleting team link for team ${existingTeamId} (id: ${linkInfo.id})`
          );
        }

        const softDeleteResult = await callSuccessCoGraphQL(updateMutation, {
          input: {
            id: linkInfo.id,
            patch: { stateId: "DELETED" },
          },
        });

        if (!softDeleteResult.ok) {
          if (isDevMode) {
            console.error(
              `[DEBUG] Failed to soft delete team link ${linkInfo.id}: ${softDeleteResult.error}`
            );
          }
          return {
            content: [
              {
                type: "text",
                text: `Error soft deleting existing team assignment: ${softDeleteResult.error}`,
              },
            ],
          };
        }

        if (isDevMode) {
          console.error(
            `[DEBUG] Successfully soft deleted team link ${linkInfo.id}`
          );
        }
      }
    }

    // Create new team assignments
    const createMutation = `
      mutation CreateTeamsOnRock($input: CreateTeamsOnRockInput!) {
        createTeamsOnRock(input: $input) {
          teamsOnRock {
            id
            teamId
            rockId
            stateId
          }
        }
      }
    `;

    const linkResults = [];
    const failedLinks = [];

    for (const singleTeamId of teamIds) {
      const existingLink = existingLinksMap.get(singleTeamId);

      // If link already exists and is ACTIVE, skip it
      if (existingLink && existingLink.stateId === "ACTIVE") {
        if (isDevMode) {
          console.error(
            `[DEBUG] Team link for ${singleTeamId} is already ACTIVE, skipping`
          );
        }
        linkResults.push(singleTeamId);
        continue;
      }

      // If link exists but is DELETED, reactivate it
      if (existingLink && existingLink.stateId === "DELETED") {
        if (isDevMode) {
          console.error(
            `[DEBUG] Reactivating team link for team: ${singleTeamId} (id: ${existingLink.id})`
          );
        }

        const reactivateResult = await callSuccessCoGraphQL(updateMutation, {
          input: {
            id: existingLink.id,
            patch: { stateId: "ACTIVE" },
          },
        });

        if (
          reactivateResult.ok &&
          reactivateResult.data?.data?.updateTeamsOnRock?.teamsOnRock
        ) {
          linkResults.push(singleTeamId);
          reactivatedLinks.push(singleTeamId);
          if (isDevMode) {
            console.error(
              `[DEBUG] Successfully reactivated team link for ${singleTeamId}`
            );
          }
        } else {
          const error = reactivateResult.error || "Unknown error";
          failedLinks.push({
            teamId: singleTeamId,
            error,
          });
          if (isDevMode) {
            console.error(
              `[DEBUG] Failed to reactivate team link for ${singleTeamId}: ${error}`
            );
          }
        }
        continue;
      }

      // Link doesn't exist, create a new one
      if (isDevMode) {
        console.error(
          `[DEBUG] Creating new team link for team: ${singleTeamId}`
        );
      }

      const linkVariables = {
        input: {
          teamsOnRock: {
            teamId: singleTeamId,
            rockId: rockId,
            companyId,
            stateId: "ACTIVE",
          },
        },
      };

      const linkResult = await callSuccessCoGraphQL(
        createMutation,
        linkVariables
      );

      if (
        linkResult.ok &&
        linkResult.data?.data?.createTeamsOnRock?.teamsOnRock
      ) {
        linkResults.push(singleTeamId);
        if (isDevMode) {
          console.error(
            `[DEBUG] Successfully created team link for ${singleTeamId}`
          );
        }
      } else {
        const error = linkResult.error || "Unknown error";
        failedLinks.push({
          teamId: singleTeamId,
          error,
        });
        if (isDevMode) {
          console.error(
            `[DEBUG] Failed to create team link for ${singleTeamId}: ${error}`
          );
        }
      }
    }

    if (isDevMode) {
      console.error(
        `[DEBUG] Team assignment complete: ${linkResults.length} succeeded, ${failedLinks.length} failed`
      );
    }

    // Report partial failures
    if (failedLinks.length > 0 && linkResults.length > 0) {
      const warningMessage =
        `Rock updated but some team assignments failed:\n` +
        `- Successfully linked to: ${linkResults.join(", ")}\n` +
        `- Failed to link to: ${failedLinks
          .map((f) => `${f.teamId} (${f.error})`)
          .join(", ")}`;

      return {
        content: [
          {
            type: "text",
            text: warningMessage,
          },
        ],
      };
    } else if (failedLinks.length === teamIds.length) {
      return {
        content: [
          {
            type: "text",
            text: `Error: Rock updated but all team assignments failed: ${failedLinks
              .map((f) => `${f.teamId} (${f.error})`)
              .join(", ")}`,
          },
        ],
      };
    }
  }

  // Build success message
  let message = "Rock updated successfully";
  if (teamId) {
    const teamIds = teamId
      .split(",")
      .map((id) => id.trim())
      .filter((id) => id);

    // Add detail about what happened with teams
    const details = [];
    if (teamIds.length > 1) {
      details.push(`reassigned to ${teamIds.length} teams`);
    } else {
      details.push(`reassigned to team ${teamIds[0]}`);
    }

    if (reactivatedLinks && reactivatedLinks.length > 0) {
      details.push(
        `${reactivatedLinks.length} team link(s) reactivated from DELETED`
      );
    }

    message += ` (${details.join(", ")})`;
  }

  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(
          {
            success: true,
            message,
            rock: rock
              ? {
                  id: rock.id,
                  name: rock.name,
                  desc: rock.desc,
                  status: rock.rockStatusId,
                  dueDate: rock.dueDate,
                  userId: rock.userId,
                  statusUpdatedAt: rock.statusUpdatedAt,
                  stateId: rock.stateId,
                }
              : { id: rockId },
          },
          null,
          2
        ),
      },
    ],
  };
}

/**
 * Update a todo (e.g., mark as complete)
 * @param {Object} args - Arguments object
 * @param {string} args.todoId - Todo ID (required)
 * @param {string} [args.todoStatusId] - New status ('TODO', 'COMPLETE')
 * @param {string} [args.name] - Update todo name
 * @param {string} [args.desc] - Update todo description
 * @param {string} [args.dueDate] - Update due date
 * @returns {Promise<{content: Array<{type: string, text: string}>}>}
 */
export async function updateTodo(args) {
  const { todoId, todoStatusId, name, desc, dueDate } = args;

  if (!todoId) {
    return {
      content: [
        {
          type: "text",
          text: "Error: Todo ID is required",
        },
      ],
    };
  }

  const apiKey = getSuccessCoApiKey();
  if (!apiKey) {
    return {
      content: [
        {
          type: "text",
          text: "Error: Success.co API key not set. Use setSuccessCoApiKey first.",
        },
      ],
    };
  }

  const mutation = `
    mutation UpdateTodo($input: UpdateTodoInput!) {
      updateTodo(input: $input) {
        todo {
          id
          name
          desc
          todoStatusId
          dueDate
          statusUpdatedAt
          stateId
        }
      }
    }
  `;

  const updates = {};
  if (todoStatusId) updates.todoStatusId = todoStatusId;
  if (name) updates.name = name;
  if (desc !== undefined) updates.desc = desc;
  if (dueDate) updates.dueDate = dueDate;

  if (Object.keys(updates).length === 0) {
    return {
      content: [
        {
          type: "text",
          text: "Error: No updates specified. Provide at least one field to update (todoStatusId, name, desc, or dueDate)",
        },
      ],
    };
  }

  const variables = {
    input: {
      id: todoId,
      patch: updates,
    },
  };

  const result = await callSuccessCoGraphQL(mutation, variables);

  if (!result.ok) {
    return {
      content: [
        {
          type: "text",
          text: `Error updating todo: ${result.error}`,
        },
      ],
    };
  }

  const todo = result.data?.data?.updateTodo?.todo;

  if (!todo) {
    return {
      content: [
        {
          type: "text",
          text: `Error: Todo update failed. ${JSON.stringify(
            result.data,
            null,
            2
          )}`,
        },
      ],
    };
  }

  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(
          {
            success: true,
            message: "Todo updated successfully",
            todo: todo,
          },
          null,
          2
        ),
      },
    ],
  };
}

/**
 * Update an existing headline
 * @param {Object} args - Arguments object
 * @param {string} args.headlineId - Headline ID (required)
 * @param {string} [args.name] - Update headline text
 * @param {string} [args.desc] - Update headline description
 * @param {string} [args.status] - Update headline status: 'Shared' or 'Not shared'
 * @param {string} [args.teamId] - Update team association
 * @param {boolean} [args.leadershipTeam] - If true, automatically use the leadership team ID for association
 * @param {string} [args.userId] - Update user association
 * @param {boolean} [args.isCascadingMessage] - Update cascading message flag
 * @returns {Promise<{content: Array<{type: string, text: string}>}>}
 */
export async function updateHeadline(args) {
  const {
    headlineId,
    name,
    desc,
    status,
    teamId: providedTeamId,
    leadershipTeam = false,
    userId,
    isCascadingMessage,
  } = args;

  // Map external status values to internal database values
  const statusMapping = {
    Shared: "DISCUSSED",
    "Not shared": "DISCUSS",
  };
  const internalStatus = status ? statusMapping[status] : undefined;

  // Resolve teamId if leadershipTeam is true
  let teamId = providedTeamId;
  if (leadershipTeam && !providedTeamId) {
    teamId = await getLeadershipTeamId();
    if (!teamId) {
      return {
        content: [
          {
            type: "text",
            text: "Error: Could not find leadership team. Please ensure a team is marked as the leadership team.",
          },
        ],
      };
    }
  }

  if (!headlineId) {
    return {
      content: [
        {
          type: "text",
          text: "Error: Headline ID is required",
        },
      ],
    };
  }

  const apiKey = getSuccessCoApiKey();
  if (!apiKey) {
    return {
      content: [
        {
          type: "text",
          text: "Error: Success.co API key not set. Use setSuccessCoApiKey first.",
        },
      ],
    };
  }

  const mutation = `
    mutation UpdateHeadline($input: UpdateHeadlineInput!) {
      updateHeadline(input: $input) {
        headline {
          id
          name
          desc
          headlineStatusId
          teamId
          userId
          isCascadingMessage
          statusUpdatedAt
          stateId
        }
      }
    }
  `;

  const updates = {};
  if (name) updates.name = name;
  if (desc !== undefined) updates.desc = desc;
  if (internalStatus) updates.headlineStatusId = internalStatus;
  if (teamId) updates.teamId = teamId;
  if (userId) updates.userId = userId;
  if (isCascadingMessage !== undefined)
    updates.isCascadingMessage = isCascadingMessage;

  if (Object.keys(updates).length === 0) {
    return {
      content: [
        {
          type: "text",
          text: "Error: No updates specified. Provide at least one field to update.",
        },
      ],
    };
  }

  const variables = {
    input: {
      id: headlineId,
      patch: updates,
    },
  };

  const result = await callSuccessCoGraphQL(mutation, variables);

  if (!result.ok) {
    return {
      content: [
        {
          type: "text",
          text: `Error updating headline: ${result.error}`,
        },
      ],
    };
  }

  const headline = result.data?.data?.updateHeadline?.headline;

  if (!headline) {
    return {
      content: [
        {
          type: "text",
          text: `Error: Headline update failed. ${JSON.stringify(
            result.data,
            null,
            2
          )}`,
        },
      ],
    };
  }

  // Map internal status back to external value
  const externalStatusMapping = {
    DISCUSSED: "Shared",
    DISCUSS: "Not shared",
  };

  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(
          {
            success: true,
            message: "Headline updated successfully",
            headline: {
              ...headline,
              headlineStatusId:
                externalStatusMapping[headline.headlineStatusId] ||
                headline.headlineStatusId,
            },
          },
          null,
          2
        ),
      },
    ],
  };
}

/**
 * Create a new headline
 * @param {Object} args - Arguments object
 * @param {string} args.name - Headline text (required)
 * @param {string} [args.desc] - Headline description/details
 * @param {string} [args.teamId] - Team ID to associate with (required if leadershipTeam is false)
 * @param {boolean} [args.leadershipTeam] - If true, automatically use the leadership team ID (required if teamId not provided)
 * @param {string} [args.userId] - User ID to associate with
 * @param {string} [args.status] - Headline status: 'Shared' or 'Not shared' (defaults to 'Not shared')
 * @param {boolean} [args.isCascadingMessage] - Whether this is a cascading message (defaults to false)
 * @returns {Promise<{content: Array<{type: string, text: string}>}>}
 */
export async function createHeadline(args) {
  const {
    name,
    desc = "",
    teamId: providedTeamId,
    leadershipTeam = false,
    userId,
    status = "Not shared",
    isCascadingMessage = false,
  } = args;

  // Map external status values to internal database values
  const statusMapping = {
    Shared: "DISCUSSED",
    "Not shared": "DISCUSS",
  };
  const headlineStatusId = statusMapping[status] || "DISCUSS";

  // Resolve teamId if leadershipTeam is true
  let teamId = providedTeamId;
  if (leadershipTeam && !providedTeamId) {
    teamId = await getLeadershipTeamId();
    if (!teamId) {
      return {
        content: [
          {
            type: "text",
            text: "Error: Could not find leadership team. Please ensure a team is marked as the leadership team.",
          },
        ],
      };
    }
  }

  // Validate that teamId is provided - headlines MUST be linked to a team
  if (!teamId) {
    return {
      content: [
        {
          type: "text",
          text: "Error: Headline must be assigned to a team. Please provide either 'teamId' or set 'leadershipTeam' to true.",
        },
      ],
    };
  }

  if (!name || name.trim() === "") {
    return {
      content: [
        {
          type: "text",
          text: "Error: Headline text is required",
        },
      ],
    };
  }

  const apiKey = getSuccessCoApiKey();
  if (!apiKey) {
    return {
      content: [
        {
          type: "text",
          text: "Error: Success.co API key not set. Use setSuccessCoApiKey first.",
        },
      ],
    };
  }

  // Get user and company info from the API key
  const context = await getUserAndCompanyInfoForApiKey(apiKey);
  if (!context) {
    return {
      content: [
        {
          type: "text",
          text: "Error: Could not determine user and company info. Please ensure database connection is configured.",
        },
      ],
    };
  }

  const companyId = context.companyId;
  // Use provided userId or default to current user from API key
  const finalUserId = userId || context.userId;

  const mutation = `
    mutation CreateHeadline($input: CreateHeadlineInput!) {
      createHeadline(input: $input) {
        headline {
          id
          name
          desc
          headlineStatusId
          teamId
          userId
          isCascadingMessage
          createdAt
          stateId
          companyId
        }
      }
    }
  `;

  const variables = {
    input: {
      headline: {
        name,
        desc,
        headlineStatusId,
        isCascadingMessage,
        companyId,
        ...(teamId && { teamId }),
        userId: finalUserId,
        stateId: "ACTIVE",
      },
    },
  };

  const result = await callSuccessCoGraphQL(mutation, variables);

  if (!result.ok) {
    return {
      content: [
        {
          type: "text",
          text: `Error creating headline: ${result.error}`,
        },
      ],
    };
  }

  const headline = result.data?.data?.createHeadline?.headline;

  if (!headline) {
    return {
      content: [
        {
          type: "text",
          text: `Error: Headline creation failed. ${JSON.stringify(
            result.data,
            null,
            2
          )}`,
        },
      ],
    };
  }

  // Map internal status back to external value
  const externalStatusMapping = {
    DISCUSSED: "Shared",
    DISCUSS: "Not shared",
  };

  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(
          {
            success: true,
            message: "Headline created successfully",
            headline: {
              ...headline,
              headlineStatusId:
                externalStatusMapping[headline.headlineStatusId] ||
                headline.headlineStatusId,
            },
          },
          null,
          2
        ),
      },
    ],
  };
}

/**
 * Update an existing meeting
 * @param {Object} args - Arguments object
 * @param {string} args.meetingId - Meeting ID (required)
 * @param {string} [args.date] - Update meeting date (YYYY-MM-DD format)
 * @param {string} [args.state] - Meeting state: "ACTIVE" or "DELETED"
 * @returns {Promise<{content: Array<{type: string, text: string}>}>}
 * @note To cancel a meeting, set state to "DELETED". Start/end times and status are managed by the meeting lifecycle.
 */
export async function updateMeeting(args) {
  const { meetingId, date, state } = args;

  if (!meetingId) {
    return {
      content: [
        {
          type: "text",
          text: "Error: Meeting ID is required",
        },
      ],
    };
  }

  const apiKey = getSuccessCoApiKey();
  if (!apiKey) {
    return {
      content: [
        {
          type: "text",
          text: "Error: Success.co API key not set. Use setSuccessCoApiKey first.",
        },
      ],
    };
  }

  // Validate date is not in the past if date is being updated
  if (date) {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset to start of day for comparison
    const meetingDate = new Date(date);
    if (meetingDate < today) {
      return {
        content: [
          {
            type: "text",
            text: "Error: Cannot update a meeting to a date in the past. Please use a current or future date.",
          },
        ],
      };
    }
  }

  const mutation = `
    mutation UpdateMeeting($input: UpdateMeetingInput!) {
      updateMeeting(input: $input) {
        meeting {
          id
          date
          meetingInfoId
          stateId
        }
      }
    }
  `;

  const updates = {};
  if (date) updates.date = date;
  if (state) updates.stateId = state;

  if (Object.keys(updates).length === 0) {
    return {
      content: [
        {
          type: "text",
          text: "Error: No updates specified. Provide at least one field to update.",
        },
      ],
    };
  }

  const variables = {
    input: {
      id: meetingId,
      patch: updates,
    },
  };

  const result = await callSuccessCoGraphQL(mutation, variables);

  if (!result.ok) {
    return {
      content: [
        {
          type: "text",
          text: `Error updating meeting: ${result.error}`,
        },
      ],
    };
  }

  const meeting = result.data?.data?.updateMeeting?.meeting;

  if (!meeting) {
    return {
      content: [
        {
          type: "text",
          text: `Error: Meeting update failed. ${JSON.stringify(
            result.data,
            null,
            2
          )}`,
        },
      ],
    };
  }

  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(
          {
            success: true,
            message: "Meeting updated successfully",
            meeting: meeting,
          },
          null,
          2
        ),
      },
    ],
  };
}

/**
 * Create a new meeting
 * @param {Object} args - Arguments object
 * @param {string} args.date - Meeting date (YYYY-MM-DD format, required)
 * @param {string} [args.meetingAgendaId] - Meeting agenda ID (provide either this or meetingAgendaType)
 * @param {string} [args.meetingAgendaType] - Meeting agenda type: ANNUAL-PLANNING-DAY-1, ANNUAL-PLANNING-DAY-2, QUARTERLY-PULSING-AGENDA, WEEKLY-L10, FOCUS-DAY, or VISION-BUILDING-SESSION
 * @param {string} [args.teamId] - Team ID (provide either this or leadershipTeam)
 * @param {boolean} [args.leadershipTeam] - If true, use the leadership team
 * @param {string} [args.name] - Optional name for the meeting info (defaults to agenda name)
 * @returns {Promise<{content: Array<{type: string, text: string}>}>}
 * @note Meeting status defaults to 'NOT-STARTED'. Start and end times are set when the meeting is started/ended.
 */
export async function createMeeting(args) {
  const {
    date,
    meetingAgendaId: providedAgendaId,
    meetingAgendaType,
    teamId: providedTeamId,
    leadershipTeam = false,
    name,
  } = args;

  // Validate required parameters
  if (!date) {
    return {
      content: [
        {
          type: "text",
          text: "Error: Meeting date is required (format: YYYY-MM-DD)",
        },
      ],
    };
  }

  // Validate date is not in the past
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Reset to start of day for comparison
  const meetingDate = new Date(date);
  if (meetingDate < today) {
    return {
      content: [
        {
          type: "text",
          text: "Error: Cannot create a meeting with a date in the past. Please use a current or future date.",
        },
      ],
    };
  }

  if (!providedAgendaId && !meetingAgendaType) {
    return {
      content: [
        {
          type: "text",
          text: "Error: Either meetingAgendaId or meetingAgendaType is required",
        },
      ],
    };
  }

  if (!providedTeamId && !leadershipTeam) {
    return {
      content: [
        {
          type: "text",
          text: "Error: Either teamId or leadershipTeam=true is required",
        },
      ],
    };
  }

  const apiKey = getSuccessCoApiKey();
  if (!apiKey) {
    return {
      content: [
        {
          type: "text",
          text: "Error: Success.co API key not set. Use setSuccessCoApiKey first.",
        },
      ],
    };
  }

  // Get user and company info from the API key
  const context = await getUserAndCompanyInfoForApiKey(apiKey);
  if (!context) {
    return {
      content: [
        {
          type: "text",
          text: "Error: Could not determine user and company info. Please ensure database connection is configured.",
        },
      ],
    };
  }

  const companyId = context.companyId;
  const userId = context.userId;

  // Resolve teamId if leadershipTeam is true
  let teamId = providedTeamId;
  if (leadershipTeam && !providedTeamId) {
    teamId = await getLeadershipTeamId();
    if (!teamId) {
      return {
        content: [
          {
            type: "text",
            text: "Error: Could not find leadership team. Please ensure a team is marked as the leadership team.",
          },
        ],
      };
    }
  }

  // Resolve meetingAgendaId if meetingAgendaType is provided
  let meetingAgendaId = providedAgendaId;
  let agendaName = name;

  if (meetingAgendaType && !providedAgendaId) {
    // Look up the meeting agenda by type and team
    const agendaQuery = `
      query {
        meetingAgendas(
          filter: {
            meetingAgendaTypeId: {equalTo: "${meetingAgendaType}"}
            teamId: {equalTo: "${teamId}"}
            stateId: {equalTo: "ACTIVE"}
          }
          first: 1
        ) {
          nodes {
            id
            name
          }
        }
      }
    `;

    const agendaResult = await callSuccessCoGraphQL(agendaQuery);

    if (!agendaResult.ok) {
      return {
        content: [
          {
            type: "text",
            text: `Error looking up meeting agenda: ${agendaResult.error}`,
          },
        ],
      };
    }

    const agendas = agendaResult.data?.data?.meetingAgendas?.nodes || [];

    if (agendas.length === 0) {
      return {
        content: [
          {
            type: "text",
            text: `Error: No meeting agenda found with type "${meetingAgendaType}" for the specified team. Use getMeetingAgendas to see available agendas.`,
          },
        ],
      };
    }

    meetingAgendaId = agendas[0].id;
    if (!agendaName) {
      agendaName = agendas[0].name;
    }
  }

  // Step 1: Create meeting info
  const createMeetingInfoMutation = `
    mutation CreateMeetingInfo($input: CreateMeetingInfoInput!) {
      createMeetingInfo(input: $input) {
        meetingInfo {
          id
          name
          meetingAgendaId
          teamId
          ownerUserId
          stateId
        }
      }
    }
  `;

  const meetingInfoVariables = {
    input: {
      meetingInfo: {
        name: agendaName || `Meeting on ${date}`,
        meetingAgendaId,
        teamId,
        ownerUserId: userId,
        companyId,
        stateId: "ACTIVE",
        meetingInfoStatusId: "ACTIVE",
        meetingRepeatsId: "NEVER",
      },
    },
  };

  const meetingInfoResult = await callSuccessCoGraphQL(
    createMeetingInfoMutation,
    meetingInfoVariables
  );

  if (!meetingInfoResult.ok) {
    return {
      content: [
        {
          type: "text",
          text: `Error creating meeting info: ${meetingInfoResult.error}`,
        },
      ],
    };
  }

  const meetingInfo =
    meetingInfoResult.data?.data?.createMeetingInfo?.meetingInfo;

  if (!meetingInfo) {
    return {
      content: [
        {
          type: "text",
          text: `Error: Meeting info creation failed. ${JSON.stringify(
            meetingInfoResult.data,
            null,
            2
          )}`,
        },
      ],
    };
  }

  // Step 2: Create meeting using the meeting info ID
  const createMeetingMutation = `
    mutation CreateMeeting($input: CreateMeetingInput!) {
      createMeeting(input: $input) {
        meeting {
          id
          date
          startTime
          endTime
          meetingStatusId
          meetingInfoId
          createdAt
          stateId
          companyId
        }
      }
    }
  `;

  const meetingVariables = {
    input: {
      meeting: {
        date,
        meetingInfoId: meetingInfo.id,
        meetingStatusId: "NOT-STARTED",
        companyId,
        stateId: "ACTIVE",
      },
    },
  };

  const meetingResult = await callSuccessCoGraphQL(
    createMeetingMutation,
    meetingVariables
  );

  if (!meetingResult.ok) {
    return {
      content: [
        {
          type: "text",
          text: `Error creating meeting: ${meetingResult.error}`,
        },
      ],
    };
  }

  const meeting = meetingResult.data?.data?.createMeeting?.meeting;

  if (!meeting) {
    return {
      content: [
        {
          type: "text",
          text: `Error: Meeting creation failed. ${JSON.stringify(
            meetingResult.data,
            null,
            2
          )}`,
        },
      ],
    };
  }

  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(
          {
            success: true,
            message: "Meeting created successfully",
            meetingInfo: meetingInfo,
            meeting: meeting,
          },
          null,
          2
        ),
      },
    ],
  };
}

/**
 * Get the accountability chart (organizational structure) for the company
 * This tool fetches the complete organizational hierarchy including all users,
 * their roles, teams, and reporting relationships to answer questions like
 * "Who reports to the Integrator?" or "What is the organizational structure?"
 *
 * @param {Object} params - Parameters for the accountability chart query
 * @param {string} params.stateId - State filter (defaults to 'ACTIVE')
 * @param {string} params.teamId - Optional team filter to focus on specific team
 * @returns {Promise<Object>} The accountability chart data
 */
export async function getAccountabilityChart({
  stateId = "ACTIVE",
  teamId,
} = {}) {
  try {
    // First, get the primary org chart
    const orgChartsQuery = `
      query {
        orgCharts(filter: {stateId: {equalTo: "${stateId}"}, isPrimaryChart: {equalTo: 1}}) {
          nodes {
            id
            name
            description
            isPrimaryChart
            userId
            companyId
            createdAt
            updatedAt
          }
          totalCount
        }
      }
    `;

    // Execute the org charts query
    const orgChartsResult = await callSuccessCoGraphQL(orgChartsQuery);

    // Check for errors
    if (!orgChartsResult.ok) {
      return {
        content: [
          {
            type: "text",
            text: `Error fetching org charts: ${orgChartsResult.error}`,
          },
        ],
      };
    }

    const orgCharts = orgChartsResult.data.data.orgCharts.nodes;

    if (orgCharts.length === 0) {
      return {
        content: [
          {
            type: "text",
            text: "No primary org chart found. Please ensure there is an org chart marked as primary (isPrimaryChart = 1).",
          },
        ],
      };
    }

    const primaryOrgChart = orgCharts[0]; // Get the first (and should be only) primary chart

    // Now get the org chart seats for this primary chart
    const orgChartSeatsQuery = `
      query {
        orgChartSeats(filter: {orgChartId: {equalTo: "${primaryOrgChart.id}"}, stateId: {equalTo: "${stateId}"}}) {
          nodes {
            id
            name
            parentId
            order
            holders
            orgChartId
            createdAt
            updatedAt
          }
          totalCount
        }
      }
    `;

    // Execute the org chart seats query
    const orgChartSeatsResult = await callSuccessCoGraphQL(orgChartSeatsQuery);

    // Check for errors
    if (!orgChartSeatsResult.ok) {
      return {
        content: [
          {
            type: "text",
            text: `Error fetching org chart seats: ${orgChartSeatsResult.error}`,
          },
        ],
      };
    }

    const orgChartSeats = orgChartSeatsResult.data.data.orgChartSeats.nodes;

    // Get roles and responsibilities for each seat
    const seatIds = orgChartSeats.map((seat) => seat.id);
    const rolesMap = {};

    if (seatIds.length > 0) {
      // Query roles and responsibilities in batches
      const batchSize = 50;
      for (let i = 0; i < seatIds.length; i += batchSize) {
        const batch = seatIds.slice(i, i + batchSize);
        const seatIdsStr = batch.map((id) => `"${id}"`).join(", ");

        const rolesQuery = `
          query {
            orgChartRolesResponsibilities(filter: {orgChartSeatId: {in: [${seatIdsStr}]}, stateId: {equalTo: "ACTIVE"}}) {
              nodes {
                id
                orgChartSeatId
                name
                description
                order
                createdAt
                updatedAt
              }
            }
          }
        `;

        const rolesResult = await callSuccessCoGraphQL(rolesQuery);
        if (
          rolesResult.ok &&
          rolesResult.data.data.orgChartRolesResponsibilities.nodes
        ) {
          rolesResult.data.data.orgChartRolesResponsibilities.nodes.forEach(
            (role) => {
              if (!rolesMap[role.orgChartSeatId]) {
                rolesMap[role.orgChartSeatId] = [];
              }
              rolesMap[role.orgChartSeatId].push(role);
            }
          );
        }
      }
    }

    // Deduplicate roles and responsibilities by name and description
    Object.keys(rolesMap).forEach((seatId) => {
      const roles = rolesMap[seatId];
      const uniqueRoles = [];
      const seen = new Set();

      roles.forEach((role) => {
        // Create a key based on name and description to identify duplicates
        const key = `${role.name}:${role.description || ""}`;
        const cleanName = role.name ? role.name.trim() : "";

        // Filter out invalid entries: empty names, single characters, or very short names
        const isValidRole =
          cleanName &&
          cleanName.length > 1 &&
          !/^[A-Z]$/.test(cleanName) && // Single letters
          !/^\d+$/.test(cleanName) && // Just numbers
          cleanName.length > 2; // At least 3 characters

        if (!seen.has(key) && isValidRole) {
          seen.add(key);
          uniqueRoles.push(role);
        }
      });

      rolesMap[seatId] = uniqueRoles;
    });

    // Get all unique user IDs from seat holders
    const allHolderIds = new Set();
    orgChartSeats.forEach((seat) => {
      if (seat.holders) {
        // Split by comma and clean up whitespace
        const holderIds = seat.holders
          .split(",")
          .map((id) => id.trim())
          .filter((id) => id);
        holderIds.forEach((id) => allHolderIds.add(id));
      }
    });

    // Get user information for all holders
    const usersMap = {};
    if (allHolderIds.size > 0) {
      const userIds = Array.from(allHolderIds);

      // Query users in batches to avoid very long queries
      const batchSize = 50;
      for (let i = 0; i < userIds.length; i += batchSize) {
        const batch = userIds.slice(i, i + batchSize);
        const userIdsStr = batch.map((id) => `"${id}"`).join(", ");

        const usersQuery = `
          query {
            users(filter: {id: {in: [${userIdsStr}]}}) {
              nodes {
                id
                firstName
                lastName
                email
                jobTitle
              }
            }
          }
        `;

        const usersResult = await callSuccessCoGraphQL(usersQuery);
        if (usersResult.ok && usersResult.data.data.users.nodes) {
          usersResult.data.data.users.nodes.forEach((user) => {
            usersMap[user.id] = user;
          });
        }
      }
    }

    let accountabilityChart = `# Accountability Chart\n\n`;
    accountabilityChart += `**Chart:** ${primaryOrgChart.name}\n`;
    if (primaryOrgChart.description) {
      accountabilityChart += `**Description:** ${primaryOrgChart.description}\n`;
    }
    accountabilityChart += `Generated on: ${new Date().toLocaleDateString()}\n\n`;

    if (orgChartSeats.length === 0) {
      accountabilityChart += `No seats found in the primary org chart.\n`;
      return {
        content: [
          {
            type: "text",
            text: accountabilityChart,
          },
        ],
      };
    }
    // Build the organizational hierarchy
    const seatsById = {};
    const rootSeats = [];

    // First pass: create seat objects and find root seats
    orgChartSeats.forEach((seat) => {
      seatsById[seat.id] = {
        ...seat,
        children: [],
        level: 0, // Will be calculated
      };

      // Find root seats (those with no parent or parent not in our data)
      if (!seat.parentId || !seatsById[seat.parentId]) {
        rootSeats.push(seat.id);
      }
    });

    // Second pass: build parent-child relationships and calculate levels
    const calculateLevel = (seatId, level = 0) => {
      const seat = seatsById[seatId];
      if (!seat) return;

      seat.level = level;

      // Find children
      Object.values(seatsById).forEach((otherSeat) => {
        if (otherSeat.parentId === seatId) {
          seat.children.push(otherSeat.id);
          calculateLevel(otherSeat.id, level + 1);
        }
      });
    };

    // Calculate levels starting from root seats
    rootSeats.forEach((rootSeatId) => {
      calculateLevel(rootSeatId, 0);
    });

    // Sort seats by level and then by order
    const sortedSeats = Object.values(seatsById).sort((a, b) => {
      if (a.level !== b.level) {
        return a.level - b.level;
      }
      return a.order - b.order;
    });

    // Display the organizational structure
    accountabilityChart += `## Organizational Structure\n\n`;

    sortedSeats.forEach((seat) => {
      const indent = "  ".repeat(seat.level);
      accountabilityChart += `${indent}### ${seat.name}\n`;

      if (seat.holders) {
        // Split holders by comma and look up names
        const holderIds = seat.holders
          .split(",")
          .map((id) => id.trim())
          .filter((id) => id);
        const holderNames = [];

        holderIds.forEach((holderId) => {
          const user = usersMap[holderId];
          if (user) {
            holderNames.push(
              `${user.firstName} ${user.lastName} (ID: ${user.id})`
            );
          } else {
            holderNames.push(`Unknown User (ID: ${holderId})`);
          }
        });

        if (holderNames.length > 0) {
          accountabilityChart += `${indent}**Seat Holders:**\n`;
          holderNames.forEach((name) => {
            accountabilityChart += `${indent}  • ${name}\n`;
          });
        } else {
          accountabilityChart += `${indent}**Seat Holders:** *Vacant*\n`;
        }
      } else {
        accountabilityChart += `${indent}**Seat Holders:** *Vacant*\n`;
      }

      // Add role responsibilities if any
      const seatRoles = rolesMap[seat.id] || [];
      if (seatRoles.length > 0) {
        accountabilityChart += `${indent}**Roles & Responsibilities:**\n`;
        seatRoles
          .sort((a, b) => a.order - b.order)
          .forEach((responsibility) => {
            // Clean up the name and description
            const cleanName = responsibility.name
              ? responsibility.name.trim()
              : "";
            const cleanDescription = responsibility.description
              ? responsibility.description.trim()
              : "";

            if (cleanName) {
              accountabilityChart += `${indent}  • ${cleanName}`;
              if (cleanDescription && cleanDescription.length > 0) {
                accountabilityChart += `: ${cleanDescription}`;
              }
              accountabilityChart += `\n`;
            }
          });
      }

      accountabilityChart += `\n`;
    });

    // Add summary information
    accountabilityChart += `## Summary\n\n`;
    accountabilityChart += `- **Total Seats:** ${orgChartSeats.length}\n`;
    accountabilityChart += `- **Filled Seats:** ${
      orgChartSeats.filter((seat) => seat.holders && seat.holders.trim()).length
    }\n`;
    accountabilityChart += `- **Vacant Seats:** ${
      orgChartSeats.filter((seat) => !seat.holders || !seat.holders.trim())
        .length
    }\n`;

    // Count total roles and responsibilities
    const totalRoles = Object.values(rolesMap).reduce((total, roles) => {
      return total + roles.length;
    }, 0);
    accountabilityChart += `- **Total Roles & Responsibilities:** ${totalRoles}\n`;
    accountabilityChart += `- **Chart ID:** ${primaryOrgChart.id}\n`;

    return {
      content: [
        {
          type: "text",
          text: accountabilityChart,
        },
      ],
    };
  } catch (error) {
    console.error("Error fetching accountability chart:", error);
    return {
      content: [
        {
          type: "text",
          text: `Error fetching accountability chart: ${error.message}`,
        },
      ],
    };
  }
}
