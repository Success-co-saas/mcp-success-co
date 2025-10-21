import { validateOAuthToken, extractBearerToken } from "../oauth-validator.js";
import { IS_DEVELOPMENT, DEV_CONFIG, OAUTH_SERVER_URL } from "../config.js";
import { logger } from "../logger.js";

/**
 * Send OAuth challenge response
 */
function sendOAuthChallenge(req, res, message, error) {
  const protocol =
    req.headers["x-forwarded-proto"] || (req.secure ? "https" : "http");
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  let baseUrl = OAUTH_SERVER_URL || `${protocol}://${host}`;

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
 * Authentication middleware for MCP endpoints
 */
export async function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  logger.debug(`[AUTH] ${req.method} ${req.path}`);

  // Skip authentication for health check and certain endpoints
  if (req.path === "/health" || req.method === "OPTIONS") {
    logger.debug(`[AUTH] Skipping auth for ${req.path}`);
    return next();
  }

  // Log authentication attempts
  if (authHeader) {
    logger.debug(
      `[AUTH] Authorization header present: "${authHeader.substring(0, 20)}..."`
    );
  } else {
    logger.debug("[AUTH] No Authorization header present");
  }

  // Try OAuth token first (Bearer token)
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = extractBearerToken(authHeader);
    if (token) {
      logger.debug("[AUTH] Validating OAuth token");
      const validation = await validateOAuthToken(token);

      if (validation.valid) {
        logger.info("[AUTH] Authentication successful (OAuth)", {
          user: validation.userEmail,
          company: validation.companyId,
          client: validation.clientId,
        });

        // Attach user info and access token to request
        req.oauth = {
          accessToken: token,
          userId: validation.userId,
          companyId: validation.companyId,
          userEmail: validation.userEmail,
          clientId: validation.clientId,
        };
        return next();
      } else {
        logger.warn(
          `[AUTH] OAuth token validation failed: ${validation.error}`
        );
        return sendOAuthChallenge(
          req,
          res,
          validation.message || "Invalid or expired OAuth token",
          validation.error
        );
      }
    }
  }

  // Fall back to API key authentication (only in development with explicit flag)
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

  // No valid authentication found - send OAuth challenge
  logger.warn("[AUTH] No valid authentication provided");
  return sendOAuthChallenge(
    req,
    res,
    "Authentication required. Provide a valid OAuth Bearer token or API key.",
    "unauthorized"
  );
}
