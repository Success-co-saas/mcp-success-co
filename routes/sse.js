import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { logger } from "../logger.js";
import { sessionManager } from "../utils/sessionManager.js";
import {
  detectTransportType,
  getTransportGuidance,
} from "../utils/transportHelpers.js";
import { runWithAuthContext } from "../tools.js";
import { registerToolsOnServer } from "../toolDefinitions.js";

// Create main SSE server instance
const sseServer = new McpServer({
  name: "Success.co MCP Server",
  version: "0.0.3",
});
registerToolsOnServer(sseServer);

/**
 * SSE endpoint handler (GET /sse)
 */
export async function sseHandler(req, res) {
  try {
    logger.debug("[SSE] GET /sse - establishing SSE connection");

    // Detect transport type and provide guidance
    const transportType = detectTransportType(req);
    const guidance = getTransportGuidance("/sse");

    if (transportType.isJSONRPCRequest) {
      logger.warn("[SSE] JSON-RPC request on /sse endpoint");
      return res.status(400).json({
        error: "Wrong transport type",
        message:
          "This endpoint expects SSE connections. For JSON-RPC requests, use the /mcp endpoint instead.",
        guidance: {
          current:
            "JSON-RPC request (POST with Content-Type: application/json)",
          expected: `${guidance.method} ${req.path} with ${guidance.headers}`,
          example: guidance.example,
        },
      });
    }

    if (!transportType.isSSERequest) {
      logger.warn("[SSE] Missing or incorrect Accept header");
      return res.status(400).json({
        error: "Invalid SSE request",
        message:
          "SSE connections must include 'Accept: text/event-stream' header.",
        guidance: {
          current: "GET request without proper SSE headers",
          expected: `${guidance.method} ${req.path} with ${guidance.headers}`,
          example: guidance.example,
        },
      });
    }

    // Create SSE transport
    const transport = new SSEServerTransport("/messages", res);
    sessionManager.add("sse", transport.sessionId, transport);

    // Set up cleanup on connection close
    res.on("close", () => {
      sessionManager.remove("sse", transport.sessionId);
    });

    // Connect with auth context
    const authContext = req.oauth || {};
    await runWithAuthContext(authContext, async () => {
      await sseServer.connect(transport);
    });

    logger.info(
      `[SSE] Connection established with session: ${transport.sessionId}`
    );
  } catch (error) {
    logger.error("[SSE] Error in /sse endpoint:", error.message);
    if (!res.headersSent) {
      res
        .status(500)
        .json({ error: "Internal server error", details: error.message });
    }
  }
}

/**
 * SSE messages endpoint handler (POST /messages)
 */
export async function sseMessagesHandler(req, res) {
  try {
    logger.debug("[MESSAGES] POST /messages");

    const sessionId = String(req.query.sessionId || "");

    // Detect transport type and provide guidance
    const transportType = detectTransportType(req);
    const guidance = getTransportGuidance("/messages");

    if (transportType.isJSONRPCRequest && !sessionId) {
      logger.warn("[MESSAGES] JSON-RPC request without sessionId");
      return res.status(400).json({
        error: "Wrong transport type",
        message:
          "This endpoint is for SSE message handling. For JSON-RPC requests, use the /mcp endpoint instead.",
        guidance: {
          current: "JSON-RPC request without SSE sessionId",
          expected: `${guidance.method} ${req.path} with ${guidance.headers}`,
          example: guidance.example,
        },
      });
    }

    const transport = sessionManager.get("sse", sessionId);
    if (!transport) {
      logger.warn(
        `[MESSAGES] No SSE transport found for session: ${sessionId}`
      );
      return res.status(400).json({
        error: "No transport found",
        message: `No SSE transport found for sessionId: ${sessionId}`,
        suggestion:
          "Ensure you have an active SSE connection before sending messages",
      });
    }

    const authContext = req.oauth || {};
    await runWithAuthContext(authContext, async () => {
      await transport.handlePostMessage(req, res, req.body);
    });
  } catch (error) {
    logger.error("[MESSAGES] Error in /messages endpoint:", error.message);
    if (!res.headersSent) {
      res
        .status(500)
        .json({ error: "Internal server error", details: error.message });
    }
  }
}
