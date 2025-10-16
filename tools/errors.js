// Error Handling System
// Custom error types and error response formatters

/**
 * Base error class for all Success.co MCP errors
 */
export class MCPError extends Error {
  constructor(message, code, details = {}) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }

  toResponse() {
    return {
      content: [
        {
          type: "text",
          text: `Error: ${this.message}`,
        },
      ],
    };
  }

  toJSON() {
    return {
      error: {
        name: this.name,
        code: this.code,
        message: this.message,
        details: this.details,
      },
    };
  }
}

/**
 * API Key not configured error
 */
export class APIKeyNotFoundError extends MCPError {
  constructor() {
    super(
      "Success.co API key not set. Use setSuccessCoApiKey first.",
      "API_KEY_NOT_FOUND"
    );
  }
}

/**
 * Required field missing error
 */
export class RequiredFieldError extends MCPError {
  constructor(fieldName) {
    super(`${fieldName} is required`, "REQUIRED_FIELD_MISSING", { fieldName });
  }
}

/**
 * Invalid field value error
 */
export class ValidationError extends MCPError {
  constructor(fieldName, reason) {
    super(`Invalid ${fieldName}: ${reason}`, "VALIDATION_ERROR", {
      fieldName,
      reason,
    });
  }
}

/**
 * Entity not found error
 */
export class EntityNotFoundError extends MCPError {
  constructor(entityType, entityId = null) {
    const message = entityId
      ? `${entityType} not found with ID: ${entityId}`
      : `${entityType} not found`;
    super(message, "ENTITY_NOT_FOUND", { entityType, entityId });
  }
}

/**
 * Database connection error
 */
export class DatabaseError extends MCPError {
  constructor(message) {
    super(message || "Database connection error", "DATABASE_ERROR");
  }
}

/**
 * GraphQL API error
 */
export class GraphQLError extends MCPError {
  constructor(message, response = null) {
    super(message, "GRAPHQL_ERROR", { response });
  }
}

/**
 * Context lookup error (API key to company/user mapping)
 */
export class ContextError extends MCPError {
  constructor() {
    super(
      "Could not determine context from API key. Please ensure database connection is configured.",
      "CONTEXT_ERROR"
    );
  }
}

/**
 * Leadership team not found error
 */
export class LeadershipTeamNotFoundError extends MCPError {
  constructor() {
    super(
      "Could not find leadership team. Please ensure a team is marked as the leadership team.",
      "LEADERSHIP_TEAM_NOT_FOUND"
    );
  }
}

/**
 * Entity already exists error
 */
export class DuplicateEntityError extends MCPError {
  constructor(entityType, details = {}) {
    super(`${entityType} already exists`, "DUPLICATE_ENTITY", details);
  }
}

/**
 * No updates provided error
 */
export class NoUpdatesError extends MCPError {
  constructor() {
    super(
      "No updates specified. Provide at least one field to update.",
      "NO_UPDATES_PROVIDED"
    );
  }
}

/**
 * Invalid date error
 */
export class InvalidDateError extends MCPError {
  constructor(reason) {
    super(reason, "INVALID_DATE");
  }
}

/**
 * Helper function to create success response
 */
export function successResponse(data) {
  return {
    content: [
      {
        type: "text",
        text: typeof data === "string" ? data : JSON.stringify(data, null, 2),
      },
    ],
  };
}

/**
 * Helper function to create error response from any error
 */
export function errorResponse(error) {
  if (error instanceof MCPError) {
    return error.toResponse();
  }

  // Handle standard errors
  return {
    content: [
      {
        type: "text",
        text: `Error: ${error.message || String(error)}`,
      },
    ],
  };
}

/**
 * Wrapper to handle async tool functions with consistent error handling
 */
export function withErrorHandling(toolFn) {
  return async function (...args) {
    try {
      return await toolFn(...args);
    } catch (error) {
      console.error(`[ERROR] Tool execution failed:`, error);
      return errorResponse(error);
    }
  };
}
