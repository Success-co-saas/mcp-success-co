import { CORS_ORIGIN } from "../config.js";
import { logger } from "../utils/logger.js";

/**
 * CORS middleware for MCP server
 * Allows browser-based MCP clients to connect
 */
export function corsMiddleware(req, res, next) {
  // Allow all origins for MCP clients
  const origin = req.headers.origin || "*";
  res.header(
    "Access-Control-Allow-Origin",
    CORS_ORIGIN === "*" ? origin : CORS_ORIGIN
  );
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization, Mcp-Session-Id, mcp-session-id"
  );
  res.header("Access-Control-Expose-Headers", "Mcp-Session-Id, mcp-session-id");
  res.header("Access-Control-Allow-Credentials", "true");
  res.header("Access-Control-Max-Age", "86400"); // 24 hours

  // Handle preflight requests
  if (req.method === "OPTIONS") {
    logger.debug("[CORS] Handling OPTIONS preflight request", {
      origin: req.headers.origin,
      method: req.headers["access-control-request-method"],
    });
    res.status(204).end();
    return;
  }

  next();
}
