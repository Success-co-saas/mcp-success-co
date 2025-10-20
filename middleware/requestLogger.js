import { logger } from "../logger.js";

/**
 * Request logging middleware
 */
export function requestLoggerMiddleware(req, res, next) {
  logger.info(`[REQUEST] ${req.method} ${req.path}`);
  logger.debug(
    `[REQUEST] URL: ${req.protocol}://${req.get("host")}${req.originalUrl}`
  );
  logger.debug(`[REQUEST] User-Agent: ${req.headers["user-agent"] || "N/A"}`);
  next();
}
