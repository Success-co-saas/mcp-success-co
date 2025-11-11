import * as jose from "jose";
import { IS_DEVELOPMENT, IS_PRODUCTION, DEV_CONFIG, OAUTH_CONFIG } from "../config.js";
import { logger } from "../logger.js";
import { checkTokenRevocation, extractBearerToken } from "../oauth-validator.js";
import crypto from "crypto";

// JWKS cache
let jwksCache = null;
let jwksCacheTime = null;
const JWKS_CACHE_TTL = 3600000; // 1 hour

/**
 * Generate a unique request ID for tracking
 */
function generateRequestId() {
  return `req_${crypto.randomBytes(16).toString("hex")}`;
}

/**
 * Security check: Prevent API key mode in production
 */
if (IS_PRODUCTION && DEV_CONFIG.USE_API_KEY) {
  logger.error("[AUTH] SECURITY ERROR: API key mode is enabled in production!");
  logger.error("[AUTH] This is a serious security risk. Exiting immediately.");
  logger.error("[AUTH] Set DEVMODE_SUCCESS_USE_API_KEY=false or remove it from .env");
  process.exit(1);
}

/**
 * Send OAuth challenge response
 */
function sendOAuthChallenge(req, res, message, error, errorCode = "AUTH_401") {
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
  const requestId = req.requestId || generateRequestId();

  const wwwAuthHeader = `Bearer realm="mcp", resource_metadata="${resourceMetadataUrl}"`;
  res.setHeader("WWW-Authenticate", wwwAuthHeader);

  logger.warn("[AUTH] Sending 401 OAuth challenge", {
    requestId,
    resourceMetadataUrl,
    error: error || "unauthorized",
    message,
  });

  return res.status(401).json({
    error: error || "unauthorized",
    errorCode,
    message:
      message || "Authentication required. Provide a valid OAuth Bearer token.",
    requestId,
    supportUrl: "https://www.success.co/support",
    docs: "https://github.com/successco/mcp-success-co",
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
  // Generate request ID for tracking
  req.requestId = generateRequestId();
  
  logger.debug(`[AUTH] ${req.method} ${req.path}`, { requestId: req.requestId });

  // Skip authentication for health check and certain endpoints
  if (req.path === "/health" || req.method === "OPTIONS") {
    logger.debug(`[AUTH] Skipping auth for ${req.path}`, { requestId: req.requestId });
    return next();
  }

  // Skip authentication for browser requests (GET with text/html accept header)
  const acceptHeader = req.headers.accept || "";
  const isBrowserRequest =
    req.method === "GET" &&
    acceptHeader.includes("text/html") &&
    !req.headers["mcp-session-id"];
  
  if (isBrowserRequest) {
    logger.debug("[AUTH] Skipping auth for browser request", { requestId: req.requestId });
    return next();
  }

  // Log authentication attempts (redacted for security)
  const authHeader = req.headers.authorization;
  if (authHeader) {
    logger.debug(
      `[AUTH] Authorization header present: "${authHeader.substring(0, 12)}..."`,
      { requestId: req.requestId }
    );
  } else {
    logger.debug("[AUTH] No Authorization header present", { requestId: req.requestId });
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
          `[AUTH] Token revocation check failed: ${revocationResult.error}`,
          { requestId: req.requestId }
        );
        return sendOAuthChallenge(
          req,
          res,
          revocationResult.message || "Token has been revoked",
          revocationResult.error,
          "AUTH_TOKEN_REVOKED"
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
        requestId: req.requestId,
        userId: revocationResult.userId ? `user_***${revocationResult.userId.slice(-4)}` : null,
        companyId: revocationResult.companyId ? `comp_***${revocationResult.companyId.slice(-4)}` : null,
        clientId: revocationResult.clientId,
      });

      return next();
    } catch (error) {
      logger.warn(`[AUTH] JWT validation failed: ${error.message}`, { 
        requestId: req.requestId,
        errorType: error.name 
      });
      return sendOAuthChallenge(
        req,
        res,
        error.message || "Invalid or expired OAuth token",
        "invalid_token",
        "AUTH_JWT_INVALID"
      );
    }
  }

  // No valid authentication found - send OAuth challenge
  logger.warn("[AUTH] No valid authentication provided", { requestId: req.requestId });
  return sendOAuthChallenge(
    req,
    res,
    "Authentication required. Provide a valid OAuth Bearer token or API key.",
    "unauthorized",
    "AUTH_NO_CREDENTIALS"
  );
}
