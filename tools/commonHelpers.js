// Common Helper Functions
// Reusable utilities to reduce code duplication across tools

import {
  getUserContext,
  getLeadershipTeamId,
  callSuccessCoGraphQL,
  getDatabase,
} from "./core.js";
import {
  APIKeyNotFoundError,
  RequiredFieldError,
  ValidationError,
  EntityNotFoundError,
  ContextError,
  LeadershipTeamNotFoundError,
  NoUpdatesError,
  successResponse,
  errorResponse,
} from "./errors.js";
import { OAUTH_SERVER_URL } from "../config.js";

/**
 * Validate and get user context (OAuth or API key)
 * @throws {ContextError} if authentication is not available
 * @returns {Promise<{companyId: string, userId: string, userEmail?: string}>} User context
 */
export async function requireContext() {
  const context = await getUserContext();
  if (!context) {
    throw new ContextError(
      "Authentication required. No valid OAuth token or API key found."
    );
  }
  return context;
}

/**
 * Validate required field
 * @param {any} value - Value to check
 * @param {string} fieldName - Name of the field
 * @throws {RequiredFieldError} if value is missing or empty
 */
export function requireField(value, fieldName) {
  if (value === null || value === undefined || value === "") {
    throw new RequiredFieldError(fieldName);
  }
  if (typeof value === "string" && value.trim() === "") {
    throw new RequiredFieldError(fieldName);
  }
}

/**
 * Resolve team ID, handling leadershipTeam flag
 * @param {string|null} providedTeamId - Team ID provided by user
 * @param {boolean} leadershipTeam - Whether to use leadership team
 * @param {boolean} required - Whether team ID is required
 * @returns {Promise<string|null>} Resolved team ID
 * @throws {LeadershipTeamNotFoundError} if leadership team requested but not found
 * @throws {RequiredFieldError} if team ID is required but not provided
 */
export async function resolveTeamId(
  providedTeamId,
  leadershipTeam = false,
  required = false
) {
  let teamId = providedTeamId;

  if (leadershipTeam && !providedTeamId) {
    teamId = await getLeadershipTeamId();
    if (!teamId) {
      throw new LeadershipTeamNotFoundError();
    }
  }

  if (required && !teamId) {
    throw new RequiredFieldError(
      "teamId (provide either 'teamId' or set 'leadershipTeam' to true)"
    );
  }

  return teamId;
}

/**
 * Build GraphQL filter string from filter object
 * @param {Object} filters - Object with filter conditions
 * @returns {string} GraphQL filter string
 */
export function buildFilterString(filters) {
  const filterParts = Object.entries(filters)
    .filter(([_, value]) => value !== undefined && value !== null)
    .map(([key, value]) => {
      if (typeof value === "object" && !Array.isArray(value)) {
        // Handle nested filter conditions like {equalTo: "value"}
        const conditions = Object.entries(value)
          .map(([op, val]) => `${op}: "${val}"`)
          .join(", ");
        return `${key}: {${conditions}}`;
      }
      if (typeof value === "boolean") {
        return `${key}: {equalTo: ${value}}`;
      }
      return `${key}: {equalTo: "${value}"}`;
    });

  return filterParts.join(", ");
}

/**
 * Build pagination parameters for GraphQL
 * @param {number} first - First N records
 * @param {number} offset - Offset
 * @returns {string} Pagination string
 */
export function buildPaginationString(first, offset) {
  const parts = [];
  if (first !== undefined) parts.push(`first: ${first}`);
  if (offset !== undefined) parts.push(`offset: ${offset}`);
  return parts.join(", ");
}

/**
 * Execute GraphQL query and handle common errors
 * @param {string} query - GraphQL query
 * @param {Object} variables - Query variables
 * @returns {Promise<Object>} Query result data
 * @throws {Error} if query fails
 */
export async function executeGraphQL(query, variables = null) {
  const result = await callSuccessCoGraphQL(query, variables);
  if (!result.ok) {
    throw new Error(result.error);
  }
  return result.data;
}

/**
 * Execute GraphQL mutation and extract result
 * @param {string} mutation - GraphQL mutation
 * @param {Object} variables - Mutation variables
 * @param {string} resultPath - Path to result in response (e.g., "createIssue.issue")
 * @returns {Promise<Object>} Mutation result
 * @throws {EntityNotFoundError} if result is null
 */
export async function executeMutation(mutation, variables, resultPath) {
  const data = await executeGraphQL(mutation, variables);

  // Navigate to result using path
  const pathParts = resultPath.split(".");
  let result = data.data;
  for (const part of pathParts) {
    result = result?.[part];
  }

  if (!result) {
    throw new EntityNotFoundError(
      "Operation result",
      `Failed to extract result from path: ${resultPath}`
    );
  }

  return result;
}

/**
 * Validate that at least one update field is provided
 * @param {Object} updates - Object with update fields
 * @throws {NoUpdatesError} if no updates provided
 */
export function requireUpdates(updates) {
  if (Object.keys(updates).length === 0) {
    throw new NoUpdatesError();
  }
}

/**
 * Create a standard success response with data
 * @param {Object} data - Response data
 * @param {string} message - Success message
 * @returns {Object} MCP response object
 */
export function createSuccessResponse(data, message = null) {
  const response = { success: true };
  if (message) response.message = message;
  if (data) response.data = data;
  return successResponse(response);
}

/**
 * Create a standard list response
 * @param {Array} items - List of items
 * @param {number} totalCount - Total count
 * @param {Object} metadata - Additional metadata
 * @returns {Object} MCP response object
 */
export function createListResponse(items, totalCount = null, metadata = {}) {
  return successResponse({
    totalCount: totalCount !== null ? totalCount : items.length,
    results: items,
    ...metadata,
  });
}

/**
 * Handle common CRUD operation pattern
 * @param {Function} operation - Async function that performs the operation
 * @returns {Promise<Object>} MCP response object
 */
export async function handleCRUDOperation(operation) {
  try {
    return await operation();
  } catch (error) {
    return errorResponse(error);
  }
}

/**
 * Validate state ID
 * @param {string} stateId - State ID to validate
 * @throws {ValidationError} if state ID is invalid
 */
export function validateStateId(stateId) {
  const validStates = ["ACTIVE", "INACTIVE", "DELETED"];
  if (!validStates.includes(stateId)) {
    throw new ValidationError(
      "stateId",
      `must be one of: ${validStates.join(", ")}`
    );
  }
}

/**
 * Validate date is not in the future
 * @param {string} dateString - Date string in ISO format
 * @param {string} fieldName - Name of the date field
 * @throws {ValidationError} if date is in the future
 */
export function validateNotFutureDate(dateString, fieldName = "date") {
  const date = new Date(dateString);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (date > today) {
    throw new ValidationError(
      fieldName,
      `Cannot use a future date. Provided: ${dateString}, Today: ${
        today.toISOString().split("T")[0]
      }`
    );
  }
}

/**
 * Validate date is not in the past
 * @param {string} dateString - Date string in ISO format
 * @param {string} fieldName - Name of the date field
 * @throws {ValidationError} if date is in the past
 */
export function validateNotPastDate(dateString, fieldName = "date") {
  const date = new Date(dateString);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (date < today) {
    throw new ValidationError(
      fieldName,
      `Cannot use a past date. Please use a current or future date.`
    );
  }
}

/**
 * Extract specific fields from an object
 * @param {Object} obj - Source object
 * @param {Array<string>} fields - Fields to extract
 * @returns {Object} Object with only specified fields
 */
export function extractFields(obj, fields) {
  const result = {};
  for (const field of fields) {
    if (obj[field] !== undefined) {
      result[field] = obj[field];
    }
  }
  return result;
}

/**
 * Map array of items with a transformation function
 * @param {Array} items - Items to map
 * @param {Function} mapper - Transformation function
 * @returns {Array} Mapped items
 */
export function mapItems(items, mapper) {
  return (items || []).map(mapper);
}

/**
 * Create mutation variables with standard structure
 * @param {Object} data - Data to mutate
 * @param {string} inputKey - Key for the input (e.g., "issue", "rock")
 * @returns {Object} Mutation variables
 */
export function createMutationVariables(data, inputKey) {
  return {
    input: {
      [inputKey]: data,
    },
  };
}

/**
 * Create update mutation variables
 * @param {string} id - Entity ID
 * @param {Object} updates - Update fields
 * @returns {Object} Mutation variables
 */
export function createUpdateVariables(id, updates) {
  return {
    input: {
      id,
      patch: updates,
    },
  };
}

/**
 * Get user ID from context or use provided one
 * @param {Object} context - Context with userId
 * @param {string|null} providedUserId - User-provided user ID
 * @returns {string} Final user ID to use
 */
export function resolveUserId(context, providedUserId = null) {
  return providedUserId || context.userId;
}

/**
 * Parse comma-separated IDs into array
 * @param {string} idString - Comma-separated IDs
 * @returns {Array<string>} Array of trimmed IDs
 */
export function parseIdList(idString) {
  if (!idString) return [];
  return idString
    .split(",")
    .map((id) => id.trim())
    .filter((id) => id);
}

/**
 * Create GraphQL ID list filter
 * @param {Array<string>} ids - Array of IDs
 * @returns {string} GraphQL filter string for ID list
 */
export function createIdListFilter(ids) {
  return ids.map((id) => `"${id}"`).join(", ");
}

/**
 * Batch query results by a key
 * @param {Array} items - Items to batch
 * @param {string} key - Key to batch by
 * @returns {Object} Object with keys mapping to arrays of items
 */
export function batchByKey(items, key) {
  const batched = {};
  for (const item of items) {
    const keyValue = item[key];
    if (!batched[keyValue]) {
      batched[keyValue] = [];
    }
    batched[keyValue].push(item);
  }
  return batched;
}

/**
 * Format operation result message
 * @param {string} entityType - Type of entity (e.g., "Issue", "Rock")
 * @param {string} operation - Operation performed (e.g., "created", "updated")
 * @param {Object} details - Additional details
 * @returns {string} Formatted message
 */
export function formatOperationMessage(entityType, operation, details = {}) {
  let message = `${entityType} ${operation} successfully`;

  if (details.count) {
    message += ` (${details.count} items)`;
  }

  if (details.warnings && details.warnings.length > 0) {
    message += `\n\nWarnings:\n${details.warnings.join("\n")}`;
  }

  return message;
}

// Cache for company codes to avoid repeated database queries
const companyCodeCache = new Map();

/**
 * Get company code from company ID
 * @param {string} companyId - Company UUID
 * @returns {Promise<string|null>} Company code or null
 */
export async function getCompanyCode(companyId) {
  if (!companyId) return null;

  // Check cache first
  if (companyCodeCache.has(companyId)) {
    return companyCodeCache.get(companyId);
  }

  const db = getDatabase();
  if (!db) return null;

  try {
    const result = await db`
      SELECT code 
      FROM companies 
      WHERE id = ${companyId}
      LIMIT 1
    `;

    if (result.length > 0 && result[0].code) {
      const code = result[0].code;
      // Cache the result
      companyCodeCache.set(companyId, code);
      return code;
    }

    return null;
  } catch (error) {
    console.error(`[ERROR] Failed to get company code: ${error.message}`);
    return null;
  }
}

/**
 * Generate Success.co URL for an object
 * @param {string} entityType - Type of entity (todos, rocks, issues, headlines, meetings, etc.)
 * @param {string} objectId - Object UUID
 * @param {string} companyCode - Company code
 * @returns {string|null} Full URL to the object or null if missing parameters
 */
export function generateObjectUrl(entityType, objectId, companyCode) {
  if (!companyCode || !entityType || !objectId) return null;
  return `${OAUTH_SERVER_URL}/${companyCode}/${entityType}/${objectId}`;
}
