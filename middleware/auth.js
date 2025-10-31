import * as jose from "jose";
import { IS_DEVELOPMENT, DEV_CONFIG, OAUTH_CONFIG } from "../config.js";
import { logger } from "../logger.js";
import { checkTokenRevocation, extractBearerToken } from "../oauth-validator.js";

// JWKS cache
let jwksCache = null;
let jwksCacheTime = null;
const JWKS_CACHE_TTL = 3600000; // 1 hour

/**
 * Send OAuth challenge response
 */
function sendOAuthChallenge(req, res, message, error) {
  const protocol =
    req.headers["x-forwarded-proto"] || (req.secure ? "https" : "http");
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  let baseUrl = OAUTH_CONFIG.issuer || `${protocol}://${host}`;

  // Strip any resource path from the base URL to get the OAuth server base
  // e.g., "https://www.success.co/mcp" -> "https://www.success.co"
  try {
    const urlObj = new URL(baseUrl);
    baseUrl = `${urlObj.protocol}//${urlObj.host}`;
  } catch (e) {
    // If URL parsing fails, use as-is
  }

  const resourceMetadataUrl = `${baseUrl}/.well-known/oauth-protected-resource`;

  const wwwAuthHeader = `Bearer realm="mcp", resource_metadata="${resourceMetadataUrl}"`;
  res.setHeader("WWW-Authenticate", wwwAuthHeader);

  logger.warn("[AUTH] Sending 401 OAuth challenge", {
    resourceMetadataUrl,
    error: error || "unauthorized",
    message,
  });

  return res.status(401).json({
    error: error || "unauthorized",
    message:
      message || "Authentication required. Provide a valid OAuth Bearer token.",
  });
}

/**
 * Fetch JWKS with caching
 */
async function getJWKS() {
  if (
    jwksCache &&
    jwksCacheTime &&
    Date.now() - jwksCacheTime < JWKS_CACHE_TTL
  ) {
    return jwksCache;
  }

  try {
    const response = await fetch(OAUTH_CONFIG.jwksUri);
    if (!response.ok) {
      throw new Error(`Failed to fetch JWKS: ${response.statusText}`);
    }

    const jwks = await response.json();
    jwksCache = jose.createLocalJWKSet(jwks);
    jwksCacheTime = Date.now();

    return jwksCache;
  } catch (error) {
    logger.error("[AUTH] Error fetching JWKS:", error);
    throw error;
  }
}

/**
 * Validate JWT token
 * Returns payload on success, throws error on failure
 */
async function validateJWT(token) {
  const JWKS = await getJWKS();
  const { payload } = await jose.jwtVerify(token, JWKS, {
    issuer: OAUTH_CONFIG.issuer,
    // Skip audience validation since each client has a different client_id
  });

  return payload;
}


/**
 * Combined authentication middleware for MCP endpoints
 */
export async function authMiddleware(req, res, next) {
  logger.debug(`[AUTH] ${req.method} ${req.path}`);

  // Skip authentication for health check and certain endpoints
  if (req.path === "/health" || req.method === "OPTIONS") {
    logger.debug(`[AUTH] Skipping auth for ${req.path}`);
    return next();
  }

  // Log authentication attempts
  const authHeader = req.headers.authorization;
  if (authHeader) {
    logger.debug(
      `[AUTH] Authorization header present: "${authHeader.substring(0, 20)}..."`
    );
  } else {
    logger.debug("[AUTH] No Authorization header present");
  }

  // Try dev API key first (if enabled)
  if (IS_DEVELOPMENT && DEV_CONFIG.USE_API_KEY && DEV_CONFIG.API_KEY) {
    if (
      authHeader === `Bearer ${DEV_CONFIG.API_KEY}` ||
      authHeader === DEV_CONFIG.API_KEY
    ) {
      logger.info(
        "[AUTH] Authentication successful (API Key - Development mode)"
      );
      req.apiKey = true;
      req.oauth = {
        isApiKeyMode: true,
      };
      return next();
    }
  }

  // Try OAuth JWT validation
  if (authHeader && authHeader.startsWith("Bearer ")) {
    try {
      const token = extractBearerToken(authHeader);
      
      // Validate JWT
      logger.debug("[AUTH] Validating JWT");
      const payload = await validateJWT(token);
      
      // Attach JWT info to request
      req.auth = {
        payload,
        token,
      };
      
      logger.debug("[AUTH] JWT validated, checking revocation");
      
      // Check revocation in database
      const revocationResult = await checkTokenRevocation(token);
      
      if (!revocationResult.valid) {
        logger.warn(
          `[AUTH] Token revocation check failed: ${revocationResult.error}`
        );
        return sendOAuthChallenge(
          req,
          res,
          revocationResult.message || "Token has been revoked",
          revocationResult.error
        );
      }

      // Token is valid and not revoked - attach additional context
      req.oauth = {
        accessToken: token,
        userId: revocationResult.userId,
        companyId: revocationResult.companyId,
        userEmail: revocationResult.userEmail,
        clientId: revocationResult.clientId,
      };

      logger.info("[AUTH] Authentication successful (OAuth)", {
        user: revocationResult.userEmail,
        company: revocationResult.companyId,
        client: revocationResult.clientId,
      });

      return next();
    } catch (error) {
      logger.warn(`[AUTH] JWT validation failed: ${error.message}`);
      return sendOAuthChallenge(
        req,
        res,
        error.message || "Invalid or expired OAuth token",
        "invalid_token"
      );
    }
  }

  // No valid authentication found - send OAuth challenge
  logger.warn("[AUTH] No valid authentication provided");
  return sendOAuthChallenge(
    req,
    res,
    "Authentication required. Provide a valid OAuth Bearer token or API key.",
    "unauthorized"
  );
}
