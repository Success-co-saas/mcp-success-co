import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { logger } from "../logger.js";
import { sessionManager } from "../utils/sessionManager.js";
import {
  detectTransportType,
  getTransportGuidance,
  generateSessionId,
} from "../utils/transportHelpers.js";
import { runWithAuthContext } from "../tools.js";
import { registerToolsOnServer } from "../toolDefinitions.js";

/**
 * Create a fresh MCP server instance with all tools registered
 */
function createFreshMcpServer() {
  const freshServer = new McpServer({
    name: "Success.co MCP Server",
    version: "0.0.3",
  });

  registerToolsOnServer(freshServer);
  return freshServer;
}

/**
 * MCP endpoint handler
 */
export async function mcpHandler(req, res) {
  try {
    logger.debug(`[MCP] ${req.method} ${req.path}`, {
      query: req.query,
      hasBody: !!req.body,
    });

    // Detect transport type and validate
    const transportType = detectTransportType(req);
    const guidance = getTransportGuidance("/mcp");

    // Return friendly error for wrong transport type
    if (transportType.isSSERequest) {
      logger.warn("[MCP] SSE request on /mcp endpoint - redirecting to /sse");
      return res.status(400).json({
        error: "Wrong transport type",
        message:
          "This endpoint expects JSON-RPC requests. For SSE connections, use the /sse endpoint instead.",
        guidance: {
          current: "SSE request (GET with Accept: text/event-stream)",
          expected: `${guidance.method} ${req.path} with ${guidance.headers}`,
          example: guidance.example,
        },
      });
    }

    if (req.method === "GET" && !transportType.isSSERequest) {
      logger.warn("[MCP] GET request without SSE headers");
      return res.status(400).json({
        error: "Invalid request method",
        message:
          "GET requests to /mcp must include 'Accept: text/event-stream' header for SSE connections.",
        guidance: {
          current: "GET request without proper SSE headers",
          expected: `${guidance.method} ${req.path} with ${guidance.headers}`,
          example: guidance.example,
        },
      });
    }

    if (req.method === "POST" && !transportType.isJSONRPCRequest) {
      logger.warn("[MCP] POST request without JSON content-type");
      return res.status(400).json({
        error: "Invalid content type",
        message:
          "POST requests to /mcp must include 'Content-Type: application/json' header.",
        guidance: {
          current: "POST request without proper JSON headers",
          expected: `${guidance.method} ${req.path} with ${guidance.headers}`,
          example: guidance.example,
        },
      });
    }

    // Get session ID from headers
    const sessionId = req.headers["mcp-session-id"];

    // Check if this is an initialize request
    const isInitialize =
      req.body &&
      req.body.method === "initialize" &&
      req.body.jsonrpc === "2.0";

    // Get existing transport or create new one for initialize
    let transport = sessionId
      ? sessionManager.get("streamable", sessionId)
      : null;

    if (!transport && isInitialize) {
      // Create new transport
      transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: generateSessionId,
        onsessioninitialized: (newSessionId) => {
          sessionManager.add("streamable", newSessionId, transport);
        },
      });

      transport.onclose = () => {
        if (transport.sessionId) {
          sessionManager.remove("streamable", transport.sessionId);
        }
      };

      // Connect to a fresh server instance
      const requestServer = createFreshMcpServer();
      await requestServer.connect(transport);
      logger.info("[MCP] Created new session for initialize request");
    } else if (!transport && !isInitialize) {
      logger.warn(
        `[MCP] No session found for non-initialize request. Session ID: ${sessionId}`
      );
      return res.status(400).json({
        jsonrpc: "2.0",
        error: {
          code: -32000,
          message: "Bad Request: No valid session ID provided",
        },
        id: null,
      });
    }

    // Set up authentication context
    const authContext = req.oauth || {};
    logger.debug(
      `[MCP] Processing request with auth context:`,
      authContext.isApiKeyMode
        ? "API Key"
        : authContext.accessToken
        ? "OAuth"
        : "None"
    );

    // Handle the request with auth context
    await runWithAuthContext(authContext, async () => {
      await transport.handleRequest(req, res, req.body);
    });
  } catch (error) {
    logger.error("[MCP] Error in /mcp endpoint:", error.message, error.stack);
    if (!res.headersSent) {
      res
        .status(500)
        .json({ error: "Internal server error", details: error.message });
    }
  }
}

/**
 * MCP GET handler (for session management)
 */
export async function mcpGetHandler(req, res) {
  try {
    logger.debug("[MCP] GET request for session management");

    const sessionId = req.headers["mcp-session-id"];
    const transport = sessionManager.get("streamable", sessionId);

    if (!transport) {
      logger.warn(`[MCP] Invalid or missing session ID: ${sessionId}`);
      return res.status(400).send("Invalid or missing session ID");
    }

    const authContext = req.oauth || {};
    await runWithAuthContext(authContext, async () => {
      await transport.handleRequest(req, res);
    });
  } catch (error) {
    logger.error("[MCP] Error in GET /mcp:", error.message);
    if (!res.headersSent) {
      res.status(500).send("Internal server error");
    }
  }
}

/**
 * MCP DELETE handler (for session cleanup)
 */
export async function mcpDeleteHandler(req, res) {
  try {
    logger.debug("[MCP] DELETE request for session cleanup");

    const sessionId = req.headers["mcp-session-id"];
    const transport = sessionManager.get("streamable", sessionId);

    if (!transport) {
      logger.warn(`[MCP] Invalid or missing session ID: ${sessionId}`);
      return res.status(400).send("Invalid or missing session ID");
    }

    const authContext = req.oauth || {};
    await runWithAuthContext(authContext, async () => {
      await transport.handleRequest(req, res);
    });

    // Clean up session after DELETE
    sessionManager.remove("streamable", sessionId);
  } catch (error) {
    logger.error("[MCP] Error in DELETE /mcp:", error.message);
    if (!res.headersSent) {
      res.status(500).send("Internal server error");
    }
  }
}
