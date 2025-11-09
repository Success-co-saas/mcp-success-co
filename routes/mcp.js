import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { logger } from "../logger.js";
import { sessionManager } from "../utils/sessionManager.js";
import {
  detectTransportType,
  getTransportGuidance,
  generateSessionId,
} from "../utils/transportHelpers.js";
import { runWithAuthContext, getAuthContext, getDatabase } from "../tools.js";
import { registerToolsOnServer } from "../toolDefinitions.js";
import { VERSION } from "../config.js";

/**
 * Create a fresh MCP server instance with all tools registered
 */
function createFreshMcpServer() {
  const freshServer = new McpServer({
    name: "Success.co MCP Server",
    version: VERSION,
    title: "Success.co MCP Server",
    websiteUrl: "https://www.success.co/",
  });

  // Register current user resource
  freshServer.resource(
    {
      uri: "user://current",
      name: "Current User",
      description: "Information about the currently authenticated user",
      mimeType: "application/json",
    },
    async () => {
      const auth = getAuthContext();
      if (!auth || auth.isApiKeyMode) {
        return {
          contents: [
            {
              uri: "user://current",
              mimeType: "application/json",
              text: JSON.stringify({
                available: false,
                reason: "Using API key mode or no auth context",
              }),
            },
          ],
        };
      }

      // Fetch company information from database
      let companyName = null;
      let companyUrl = null;
      try {
        const db = getDatabase();
        if (db) {
          const companyResult = await db`
            SELECT name, code
            FROM companies
            WHERE id = ${auth.companyId}
            LIMIT 1
          `;

          if (companyResult.length > 0) {
            companyName = companyResult[0].name;
            // Construct company URL using the code
            companyUrl = `https://app.success.co/${companyResult[0].code}`;
          }
        }
      } catch (error) {
        logger.error("[MCP] Error fetching company info:", error.message);
      }

      return {
        contents: [
          {
            uri: "user://current",
            mimeType: "application/json",
            text: JSON.stringify({
              available: true,
              userId: auth.userId,
              email: auth.userEmail,
              companyId: auth.companyId,
              companyName,
              url: companyUrl,
              hint: "This is YOU - the authenticated user making this request",
            }),
          },
        ],
      };
    }
  );

  // Register current user prompt - provides persistent context to LLM
  freshServer.prompt(
    {
      name: "current-user-context",
      description: "Get context about the currently authenticated user",
    },
    async () => {
      const auth = getAuthContext();
      if (!auth || auth.isApiKeyMode) {
        return {
          messages: [
            {
              role: "user",
              content: {
                type: "text",
                text: "You are using API key mode - no specific user context available.",
              },
            },
          ],
        };
      }

      // Fetch company information from database
      let companyName = null;
      try {
        const db = getDatabase();
        if (db) {
          const companyResult = await db`
            SELECT name
            FROM companies
            WHERE id = ${auth.companyId}
            LIMIT 1
          `;

          if (companyResult.length > 0) {
            companyName = companyResult[0].name;
          }
        }
      } catch (error) {
        logger.error(
          "[MCP] Error fetching company info for prompt:",
          error.message
        );
      }

      const companyInfo = companyName
        ? `This user belongs to company "${companyName}" (ID: ${auth.companyId}).`
        : `This user belongs to company ID: ${auth.companyId}.`;

      return {
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: `IMPORTANT: You are currently authenticated as user ${auth.userEmail} (ID: ${auth.userId}). When the user says "my", "I", or "me", they are referring to this user ID: ${auth.userId}. ${companyInfo}`,
            },
          },
        ],
      };
    }
  );

  registerToolsOnServer(freshServer);
  return freshServer;
}

/**
 * MCP endpoint handler
 */
export async function mcpHandler(req, res) {
  try {
    const requestId = req.requestId || "unknown";
    logger.info(`[MCP-HANDLER] ${req.method} ${req.path}`, {
      requestId,
      query: req.query,
      hasBody: !!req.body,
      hasAuth: !!req.oauth,
      sessionId: req.headers["mcp-session-id"],
    });

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

      // Track MCP connection in database
      const authContext = req.oauth || {};
      if (
        authContext.userId &&
        authContext.companyId &&
        !authContext.isApiKeyMode
      ) {
        try {
          const db = getDatabase();
          if (db) {
            // Update user's mcp_connected_at timestamp (only if not already set)
            await db`
              UPDATE users 
              SET mcp_connected_at = CURRENT_TIMESTAMP 
              WHERE id = ${authContext.userId} 
                AND mcp_connected_at IS NULL
            `;

            // Update company's mcp_connected_at timestamp (only if not already set)
            await db`
              UPDATE companies 
              SET mcp_connected_at = CURRENT_TIMESTAMP 
              WHERE id = ${authContext.companyId} 
                AND mcp_connected_at IS NULL
            `;

            logger.info(
              "[MCP] Tracked MCP connection timestamp for user and company",
              {
                userId: authContext.userId,
                companyId: authContext.companyId,
              }
            );
          }
        } catch (error) {
          logger.error("[MCP] Error tracking MCP connection:", error.message);
        }
      }
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
    const requestId = req.requestId || "unknown";
    logger.error("[MCP] Error in /mcp endpoint:", error.message, {
      requestId,
      stack: error.stack,
    });
    if (!res.headersSent) {
      res.status(500).json({
        error: "Internal server error",
        errorCode: "MCP_500",
        details: error.message,
        requestId,
        supportUrl: "https://www.success.co/support",
        docs: "https://github.com/successco/mcp-success-co",
      });
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
    const requestId = req.requestId || "unknown";
    logger.error("[MCP] Error in GET /mcp:", error.message, { requestId });
    if (!res.headersSent) {
      res.status(500).json({
        error: "Internal server error",
        errorCode: "MCP_GET_500",
        details: error.message,
        requestId,
        supportUrl: "https://www.success.co/support",
      });
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
    const requestId = req.requestId || "unknown";
    logger.error("[MCP] Error in DELETE /mcp:", error.message, { requestId });
    if (!res.headersSent) {
      res.status(500).json({
        error: "Internal server error",
        errorCode: "MCP_DELETE_500",
        details: error.message,
        requestId,
        supportUrl: "https://www.success.co/support",
      });
    }
  }
}
