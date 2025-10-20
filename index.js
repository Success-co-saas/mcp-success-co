import express from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { initOAuthValidator } from "./oauth-validator.js";
import { init, testDatabaseConnection } from "./tools.js";
import { initLogger, logger } from "./logger.js";
import config, {
  PORT,
  GRAPHQL_ENDPOINT,
  DB_CONFIG,
  validateConfig,
} from "./config.js";
import { corsMiddleware } from "./middleware/cors.js";
import { requestLoggerMiddleware } from "./middleware/requestLogger.js";
import { authMiddleware } from "./middleware/auth.js";
import { healthHandler } from "./routes/health.js";
import { mcpHandler, mcpGetHandler, mcpDeleteHandler } from "./routes/mcp.js";
import { sseHandler, sseMessagesHandler } from "./routes/sse.js";
import { registerToolsOnServer } from "./toolDefinitions.js";
import { sessionManager } from "./utils/sessionManager.js";

// =============================================================================
// INITIALIZATION
// =============================================================================

// Initialize logger
initLogger();

// Validate configuration
const configValidation = validateConfig();
if (!configValidation.valid) {
  logger.error("[STARTUP] Configuration validation failed:");
  configValidation.errors.forEach((error) => {
    logger.error(`  - ${error}`);
  });
  process.exit(1);
}

// Initialize tools with configuration
init({
  NODE_ENV: config.NODE_ENV,
  DEBUG: config.DEBUG,
  GRAPHQL_ENDPOINT,
  DEVMODE_SUCCESS_API_KEY: config.DEV_CONFIG.API_KEY,
  DEVMODE_SUCCESS_USE_API_KEY: config.DEV_CONFIG.USE_API_KEY,
  ...DB_CONFIG,
});

// Initialize OAuth validator
initOAuthValidator(DB_CONFIG);

// =============================================================================
// DATABASE CONNECTION TEST
// =============================================================================

(async () => {
  logger.info("[STARTUP] Testing database connection...");
  const dbTest = await testDatabaseConnection();

  if (!dbTest.ok) {
    logger.error("\n❌ DATABASE CONNECTION FAILED!");
    logger.error(`Error: ${dbTest.error}`);
    logger.error(
      "\nDatabase connection is required for mutation operations (create/update)."
    );
    logger.error(
      "Please ensure your .env file contains correct database credentials:"
    );
    logger.error("  - DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASS");
    logger.error("  OR (alternative)");
    logger.error(
      "  - DATABASE_URL=postgresql://user:password@host:port/database"
    );
    logger.error("\nFor help, see DATABASE_SETUP.md\n");
    process.exit(1);
  }

  logger.info(`✅ ${dbTest.message}`);
  logger.info("[STARTUP] Database connection verified");
})().catch((error) => {
  logger.error("\n❌ STARTUP ERROR!");
  logger.error(`Error: ${error.message}`);
  process.exit(1);
});

// =============================================================================
// MCP SERVER SETUP
// =============================================================================

// Create main MCP server
const server = new McpServer({
  name: "Success.co MCP Server",
  version: "0.0.3",
});

// Register all tools
registerToolsOnServer(server);

// =============================================================================
// EXPRESS APP SETUP
// =============================================================================

const app = express();

// Middleware
app.use(express.json());
app.use(requestLoggerMiddleware);
app.use(corsMiddleware);

// =============================================================================
// ROUTES
// =============================================================================

// Health check endpoint
app.get("/health", healthHandler);

// MCP endpoints (with authentication)
app.use("/mcp", authMiddleware);
app.post("/mcp", mcpHandler);
app.get("/mcp", mcpGetHandler);
app.delete("/mcp", mcpDeleteHandler);

// Legacy SSE endpoints (with authentication)
app.use("/sse", authMiddleware);
app.use("/messages", authMiddleware);
app.get("/sse", sseHandler);
app.post("/messages", sseMessagesHandler);

// =============================================================================
// STDIO TRANSPORT FOR CLAUDE
// =============================================================================

const stdioTransport = new StdioServerTransport();

server
  .connect(stdioTransport)
  .then(() => {
    logger.info("[STARTUP] STDIO transport connected successfully");
  })
  .catch((error) => {
    logger.error(
      `[STARTUP] Error connecting STDIO transport: ${error.message}`
    );
  });

// =============================================================================
// HTTP SERVER
// =============================================================================

logger.info("[STARTUP] Starting MCP server");
logger.info(`[STARTUP] Starting HTTP server on port ${PORT}`);

const httpServer = app
  .listen(PORT, () => {
    logger.info(`[STARTUP] ✅ HTTP server running on port ${PORT}`);
    logger.info(`[STARTUP] Health check: http://localhost:${PORT}/health`);
  })
  .on("error", (error) => {
    if (error.code === "EADDRINUSE" && config.IS_DEVELOPMENT) {
      logger.error(
        `Port ${PORT} is already in use. Run: lsof -ti:${PORT} | xargs kill -9`
      );
    } else {
      logger.error(`HTTP server error: ${error.message}`);
    }
    process.exit(1);
  });

// =============================================================================
// GRACEFUL SHUTDOWN
// =============================================================================

function gracefulShutdown(signal) {
  logger.info(`[SHUTDOWN] Received ${signal}, shutting down gracefully...`);

  // Clean up sessions
  sessionManager.cleanup();

  // Close HTTP server
  if (httpServer) {
    httpServer.close(() => {
      logger.info("[SHUTDOWN] HTTP server closed");
      process.exit(0);
    });

    // Force shutdown after timeout
    setTimeout(() => {
      logger.error("[SHUTDOWN] Forced shutdown after timeout");
      process.exit(1);
    }, 10000);
  } else {
    process.exit(0);
  }
}

process.on("SIGINT", () => gracefulShutdown("SIGINT"));
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));

// Keep the process alive for STDIO transport
process.stdin.resume();
