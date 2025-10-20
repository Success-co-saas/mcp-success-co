/**
 * OAuth Token Validator for MCP Server
 * Validates OAuth access tokens from the database
 */

import postgres from "postgres";

let sql;

/**
 * Initialize the OAuth validator with database connection
 * Supports both DATABASE_URL or individual DB_* parameters
 */
export function initOAuthValidator(config) {
  // Check for DATABASE_URL first (optional)
  if (config.DATABASE_URL) {
    sql = postgres(config.DATABASE_URL, {
      max: 10,
      idle_timeout: 20,
      connect_timeout: 10,
    });
  } else if (
    config.DB_HOST &&
    config.DB_PORT &&
    config.DB_NAME &&
    config.DB_USER &&
    config.DB_PASS
  ) {
    sql = postgres({
      host: config.DB_HOST,
      port: parseInt(config.DB_PORT, 10),
      database: config.DB_NAME,
      username: config.DB_USER,
      password: config.DB_PASS,
      max: 10,
      idle_timeout: 20,
      connect_timeout: 10,
    });
  } else {
    console.error(
      "[OAuth Validator] No database configuration provided - OAuth will not work"
    );
  }
}

/**
 * Validate an OAuth access token
 * Returns user and company information if valid
 */
export async function validateOAuthToken(token) {
  if (!sql) {
    return {
      valid: false,
      error: "oauth_not_configured",
      message: "OAuth validator not initialized",
    };
  }

  try {
    const tokens = await sql`
      SELECT 
        id, 
        access_token, 
        client_id, 
        user_id, 
        company_id, 
        user_email, 
        scope, 
        expires_at, 
        state_id
      FROM oauth_access_tokens
      WHERE access_token = ${token}
      AND state_id = 'ACTIVE'
    `;

    if (tokens.length === 0) {
      return {
        valid: false,
        error: "invalid_token",
        message: "Token not found or inactive",
      };
    }

    const tokenData = tokens[0];

    // Check if token is expired
    if (new Date() > new Date(tokenData.expires_at)) {
      return {
        valid: false,
        error: "token_expired",
        message: "Token has expired",
      };
    }

    // Update last used timestamp
    await sql`
      UPDATE oauth_access_tokens
      SET last_used_at = NOW()
      WHERE id = ${tokenData.id}
    `;

    return {
      valid: true,
      userId: tokenData.user_id,
      companyId: tokenData.company_id,
      userEmail: tokenData.user_email,
      clientId: tokenData.client_id,
      scope: tokenData.scope,
    };
  } catch (error) {
    console.error("[OAuth Validator] Error validating token:", error);
    return {
      valid: false,
      error: "server_error",
      message: "Error validating token",
    };
  }
}

/**
 * Extract Bearer token from Authorization header
 */
export function extractBearerToken(authHeader) {
  if (!authHeader) {
    return null;
  }

  const parts = authHeader.split(" ");
  if (parts.length !== 2 || parts[0] !== "Bearer") {
    return null;
  }

  return parts[1];
}
