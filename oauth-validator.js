/**
 * OAuth Token Validator for MCP Server
 * Handles token revocation checks against database
 * JWT validation is handled by express-oauth2-jwt-bearer
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
    config.DB_DATABASE &&
    config.DB_USER &&
    config.DB_PASS
  ) {
    sql = postgres({
      host: config.DB_HOST,
      port: parseInt(config.DB_PORT, 10),
      database: config.DB_DATABASE,
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
 * Check if a token has been revoked in the database
 * Returns user and company information if token is valid and not revoked
 */
export async function checkTokenRevocation(token) {
  if (!sql) {
    return {
      valid: false,
      error: "oauth_not_configured",
      message: "OAuth validator not initialized",
    };
  }

  try {
    // Check if token exists and get its status
    const tokens = await sql`
      SELECT id, state_id, user_id, company_id, user_email, client_id
      FROM oauth_access_tokens
      WHERE access_token = ${token}
    `;

    // If token doesn't exist in database, it might be valid but not tracked
    // JWT validation already happened, so we'll allow it
    if (tokens.length === 0) {
      console.warn(
        "[OAuth Validator] Token not found in database, but JWT is valid"
      );
      // Return valid but without user/company info
      // The JWT claims will be available in req.auth from express-oauth2-jwt-bearer
      return {
        valid: true,
        userId: null,
        companyId: null,
        userEmail: null,
        clientId: null,
      };
    }

    const tokenData = tokens[0];

    // Check revocation status
    if (tokenData.state_id !== "ACTIVE") {
      return {
        valid: false,
        error: "token_revoked",
        message: "Token has been revoked",
      };
    }

    // Update last used timestamp
    await sql`
      UPDATE oauth_access_tokens
      SET last_used_at = NOW()
      WHERE id = ${tokenData.id}
    `;

    // Return user/company info from database
    return {
      valid: true,
      userId: tokenData.user_id,
      companyId: tokenData.company_id,
      userEmail: tokenData.user_email,
      clientId: tokenData.client_id,
    };
  } catch (error) {
    console.error("[OAuth Validator] Error checking token revocation:", error);
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
