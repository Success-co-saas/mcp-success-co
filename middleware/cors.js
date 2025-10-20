import { CORS_ORIGIN } from "../config.js";
import { logger } from "../logger.js";

/**
 * CORS middleware
 */
export function corsMiddleware(req, res, next) {
  res.header("Access-Control-Allow-Origin", CORS_ORIGIN);
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization, mcp-session-id"
  );

  // Handle preflight requests
  if (req.method === "OPTIONS") {
    logger.debug("[CORS] Handling OPTIONS preflight request");
    res.sendStatus(200);
    return;
  }

  next();
}
