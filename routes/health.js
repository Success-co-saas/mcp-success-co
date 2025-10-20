import { logger } from "../logger.js";
import { sessionManager } from "../utils/sessionManager.js";

/**
 * Health check endpoint handler
 */
export function healthHandler(req, res) {
  logger.debug("[HEALTH] Health check requested");

  res.json({
    status: "healthy",
    sessions: sessionManager.getCounts(),
    timestamp: new Date().toISOString(),
  });
}
