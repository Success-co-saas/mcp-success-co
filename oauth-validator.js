/**
 * OAuth Token Validator for MCP Server
 * Validates OAuth access tokens (JWT and database)
 */

import postgres from "postgres";
import * as jose from "jose";

let sql;
let jwksCache = null;
let jwksCacheTime = null;
const JWKS_CACHE_TTL = 3600000; // 1 hour in milliseconds

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
 * Fetch JWKS from OAuth server with caching
 */
async function getJWKS() {
  // Return cached JWKS if still valid
  if (
    jwksCache &&
    jwksCacheTime &&
    Date.now() - jwksCacheTime < JWKS_CACHE_TTL
  ) {
    return jwksCache;
  }

  try {
    const jwksUrl =
      process.env.OAUTH_JWKS_URL ||
      `${process.env.OAUTH_SERVER_URL || "https://www.success.co"}/oauth/jwks`;

    const response = await fetch(jwksUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch JWKS: ${response.statusText}`);
    }

    const jwks = await response.json();
    jwksCache = jose.createLocalJWKSet(jwks);
    jwksCacheTime = Date.now();

    return jwksCache;
  } catch (error) {
    console.error("[OAuth Validator] Error fetching JWKS:", error);
    throw error;
  }
}

/**
 * Validate an OAuth access token (JWT format)
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
    // Try to verify as JWT first
    const issuer =
      process.env.OAUTH_ISSUER ||
      process.env.OAUTH_SERVER_URL ||
      "https://www.success.co";

    let payload;
    try {
      const JWKS = await getJWKS();
      const { payload: jwtPayload } = await jose.jwtVerify(token, JWKS, {
        issuer,
      });
      payload = jwtPayload;
    } catch (jwtError) {
      console.error(
        "[OAuth Validator] JWT verification failed:",
        jwtError.message
      );
      return {
        valid: false,
        error: "invalid_token",
        message: "Invalid or expired JWT token",
      };
    }

    // Check if token has been revoked in database
    const tokens = await sql`
      SELECT id, state_id
      FROM oauth_access_tokens
      WHERE access_token = ${token}
    `;

    // If token exists in database, check revocation status
    if (tokens.length > 0) {
      const tokenData = tokens[0];

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
    }

    // Return user/company info from JWT claims
    return {
      valid: true,
      userId: payload.sub,
      companyId: payload.company_id,
      userEmail: payload.email,
      clientId: payload.client_id || payload.aud,
      scope: payload.scope,
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
