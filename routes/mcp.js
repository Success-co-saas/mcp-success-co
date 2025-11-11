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

    // Detect browser requests and show friendly HTML page
    const acceptHeader = req.headers.accept || "";
    const isBrowserRequest =
      req.method === "GET" &&
      acceptHeader.includes("text/html") &&
      !req.headers["mcp-session-id"];

    if (isBrowserRequest) {
      logger.info(
        "[MCP] Browser request detected, returning friendly HTML page"
      );
      return res.status(200).send(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Success.co MCP Server</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: #333;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .container {
      background: white;
      border-radius: 12px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      max-width: 600px;
      padding: 40px;
    }
    h1 {
      color: #667eea;
      font-size: 2em;
      margin-bottom: 10px;
    }
    .subtitle {
      color: #666;
      font-size: 0.9em;
      margin-bottom: 30px;
    }
    h2 {
      color: #333;
      font-size: 1.3em;
      margin-top: 25px;
      margin-bottom: 10px;
    }
    p {
      line-height: 1.6;
      margin-bottom: 15px;
      color: #555;
    }
    .info-box {
      background: #f8f9fa;
      border-left: 4px solid #667eea;
      padding: 15px;
      margin: 20px 0;
      border-radius: 4px;
    }
    .info-box p {
      margin-bottom: 0;
    }
    .links {
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #e0e0e0;
    }
    a {
      color: #667eea;
      text-decoration: none;
      font-weight: 500;
    }
    a:hover {
      text-decoration: underline;
    }
    .link-item {
      margin: 10px 0;
    }
    code {
      background: #f4f4f4;
      padding: 2px 6px;
      border-radius: 3px;
      font-size: 0.9em;
      color: #d63384;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>Success.co MCP Server</h1>
    <p class="subtitle">Model Context Protocol v${VERSION}</p>
    
    <p>Welcome! This is the Success.co MCP (Model Context Protocol) server endpoint.</p>
    
    <div class="info-box">
      <p><strong>Note:</strong> This endpoint is designed for MCP client applications, not web browsers. You're seeing this page because you opened this URL in your browser.</p>
    </div>
    
    <h2>What is MCP?</h2>
    <p>The Model Context Protocol (MCP) is an open protocol that enables AI assistants like Claude to securely connect to your data and tools. This server provides access to your Success.co workspace data and operations.</p>
    
    <h2>For Developers</h2>
    <p>To connect to this MCP server, you'll need:</p>
    <ul style="margin-left: 20px; margin-bottom: 15px; color: #555;">
      <li>An MCP-compatible client (like Claude Desktop)</li>
      <li>Valid OAuth credentials or API key</li>
      <li>Proper configuration in your MCP settings</li>
    </ul>
    
    <div class="links">
      <div class="link-item">
        📚 <a href="https://github.com/successco/mcp-success-co" target="_blank">View Documentation on GitHub</a>
      </div>
      <div class="link-item">
        💬 <a href="https://www.success.co/support" target="_blank">Get Support</a>
      </div>
      <div class="link-item">
        🏠 <a href="https://www.success.co/" target="_blank">Success.co Homepage</a>
      </div>
    </div>
  </div>
</body>
</html>
      `);
    }

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

    // Detect browser requests and show friendly HTML page
    const acceptHeader = req.headers.accept || "";
    const isBrowserRequest =
      acceptHeader.includes("text/html") && !req.headers["mcp-session-id"];

    if (isBrowserRequest) {
      logger.info(
        "[MCP] Browser request detected, returning friendly HTML page"
      );
      return res.status(200).send(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Success.co MCP Server</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: #333;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .container {
      background: white;
      border-radius: 12px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      max-width: 600px;
      padding: 40px;
    }
    h1 {
      color: #667eea;
      font-size: 2em;
      margin-bottom: 10px;
    }
    .subtitle {
      color: #666;
      font-size: 0.9em;
      margin-bottom: 30px;
    }
    h2 {
      color: #333;
      font-size: 1.3em;
      margin-top: 25px;
      margin-bottom: 10px;
    }
    p {
      line-height: 1.6;
      margin-bottom: 15px;
      color: #555;
    }
    .info-box {
      background: #f8f9fa;
      border-left: 4px solid #667eea;
      padding: 15px;
      margin: 20px 0;
      border-radius: 4px;
    }
    .info-box p {
      margin-bottom: 0;
    }
    .links {
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #e0e0e0;
    }
    a {
      color: #667eea;
      text-decoration: none;
      font-weight: 500;
    }
    a:hover {
      text-decoration: underline;
    }
    .link-item {
      margin: 10px 0;
    }
    code {
      background: #f4f4f4;
      padding: 2px 6px;
      border-radius: 3px;
      font-size: 0.9em;
      color: #d63384;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>Success.co MCP Server</h1>
    <p class="subtitle">Model Context Protocol v${VERSION}</p>
    
    <p>Welcome! This is the Success.co MCP (Model Context Protocol) server endpoint.</p>
    
    <div class="info-box">
      <p><strong>Note:</strong> This endpoint is designed for MCP client applications, not web browsers. You're seeing this page because you opened this URL in your browser.</p>
    </div>
    
    <h2>What is MCP?</h2>
    <p>The Model Context Protocol (MCP) is an open protocol that enables AI assistants like Claude to securely connect to your data and tools. This server provides access to your Success.co workspace data and operations.</p>
    
    <h2>For Developers</h2>
    <p>To connect to this MCP server, you'll need:</p>
    <ul style="margin-left: 20px; margin-bottom: 15px; color: #555;">
      <li>An MCP-compatible client (like Claude Desktop)</li>
      <li>Valid OAuth credentials or API key</li>
      <li>Proper configuration in your MCP settings</li>
    </ul>
    
    <div class="links">
      <div class="link-item">
        📚 <a href="https://github.com/successco/mcp-success-co" target="_blank">View Documentation on GitHub</a>
      </div>
      <div class="link-item">
        💬 <a href="https://www.success.co/support" target="_blank">Get Support</a>
      </div>
      <div class="link-item">
        🏠 <a href="https://www.success.co/" target="_blank">Success.co Homepage</a>
      </div>
    </div>
  </div>
</body>
</html>
      `);
    }

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
