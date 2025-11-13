import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { logger } from "../utils/logger.js";
import { sessionManager } from "../utils/sessionManager.js";
import {
  detectTransportType,
  getTransportGuidance,
  generateSessionId,
} from "../utils/transportHelpers.js";
import { runWithAuthContext, getAuthContext, getDatabase } from "../tools.js";
import { registerToolsOnServer } from "../toolDefinitions.js";
import { VERSION } from "../config.js";
import {
  parseAIClient,
  trackClientConnection,
} from "../utils/clientDetection.js";
import { getStatsRedis, isStatsAvailable } from "../utils/redisClient.js";

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

      // Parse client information from User-Agent
      const userAgent = req.headers["user-agent"] || "";
      const clientInfo = parseAIClient(userAgent);

      logger.info("[MCP] Client connected", {
        client: clientInfo.client,
        version: clientInfo.version,
        userAgent: userAgent || "MISSING",
        userId: authContext.userId,
        companyId: authContext.companyId,
      });

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

          // Track client connection in Redis for stats
          if (isStatsAvailable()) {
            const redis = getStatsRedis();
            await trackClientConnection(
              redis,
              clientInfo.client,
              authContext.userId,
              authContext.companyId
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

      // Provide detailed error message
      const errorMessage = sessionId
        ? `Session not found: ${sessionId}. The session may have expired or the server was restarted. Please reconnect your MCP client (reinitialize the connection).`
        : "No session ID provided. MCP clients must send an 'initialize' request first to establish a session.";

      return res.status(400).json({
        jsonrpc: "2.0",
        error: {
          code: -32000,
          message: errorMessage,
          data: {
            sessionId: sessionId || "missing",
            activeSessions: sessionManager.count("streamable"),
            hint: "Send an 'initialize' request to create a new session, or restart your MCP client.",
          },
        },
        id: req.body?.id || null,
      });
    }

    // Set up authentication context
    const authContext = req.oauth || {};

    // Add client information to auth context
    const userAgent = req.headers["user-agent"] || "";
    const clientInfo = parseAIClient(userAgent);
    authContext.client = clientInfo.client;
    authContext.clientVersion = clientInfo.version;

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
  <title>Success.co AI Connector</title>
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
    .logo {
      text-align: center;
      margin-bottom: 30px;
    }
    .logo img {
      max-width: 200px;
      height: auto;
    }
    h1 {
      color: #667eea;
      font-size: 2em;
      margin-bottom: 10px;
      text-align: center;
    }
    .subtitle {
      color: #764ba2;
      font-size: 1.1em;
      font-weight: 500;
      text-align: center;
      margin-bottom: 20px;
      font-style: italic;
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
      font-size: 1.05em;
    }
    .highlight-box {
      background: #f0f4ff;
      border-left: 4px solid #667eea;
      padding: 20px;
      margin: 25px 0;
      border-radius: 4px;
    }
    .highlight-box p {
      margin-bottom: 10px;
      color: #333;
      font-size: 1.1em;
    }
    .url-container {
      margin-top: 15px;
    }
    .url-box {
      background: #fff;
      border: 2px solid #667eea;
      padding: 12px;
      border-radius: 6px;
      font-family: 'Courier New', monospace;
      font-size: 0.95em;
      color: #667eea;
      text-align: center;
      word-break: break-all;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
    }
    .url-text {
      flex: 1;
    }
    .copy-btn {
      background: #667eea;
      color: white;
      border: none;
      padding: 8px 16px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 0.9em;
      white-space: nowrap;
      transition: background 0.2s;
    }
    .copy-btn:hover {
      background: #5568d3;
    }
    .copy-btn.copied {
      background: #10b981;
    }
    .primary-link {
      display: block;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white !important;
      padding: 15px 20px;
      border-radius: 8px;
      text-align: center;
      font-size: 1.1em;
      font-weight: 600;
      margin: 25px 0;
      text-decoration: none !important;
      transition: transform 0.2s, box-shadow 0.2s;
    }
    .primary-link:hover {
      box-shadow: 0 5px 5px rgba(102, 126, 234, 0.3);
    }
    .links {
      margin-top: 20px;
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
      font-size: 1.05em;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">
      <img src="/success-co-logo.png" alt="Success.co" />
    </div>
    
    <h1>Success.co AI Connector</h1>
    <p class="subtitle">Supercharging EOS with the Power of AI</p>
    
    <p>Connect your AI assistant (like Claude, ChatGPT, or others) directly to your Success.co workspace!</p>
    
    <div class="highlight-box">
      <p><strong>How to Connect:</strong></p>
      <p>Give this URL to your AI assistant to set up the connection:</p>
      <div class="url-container">
        <div class="url-box">
          <span class="url-text">https://www.success.co/mcp</span>
          <button class="copy-btn" onclick="copyUrl()">Copy</button>
        </div>
      </div>
    </div>
    
    <a href="https://www.success.co/docs/guides/ai-mcp-connector" target="_blank" class="primary-link">
      📚 View Full Setup Instructions
    </a>
    
    <h2>What can you do?</h2>
    <p>Once connected, you can ask your AI assistant to:</p>
    <ul style="margin-left: 20px; margin-bottom: 15px; color: #555; line-height: 1.8;">
      <li>View and manage your Rocks, To-Dos, and Issues</li>
      <li>Check your meeting agendas and notes</li>
      <li>Review your Scorecard and metrics</li>
      <li>Access your V/TO and company goals</li>
      <li>Get insights on your - ask anything</li>
      <li>...and much more!</li>
    </ul>
    
    <div class="links">
      <div class="link-item">
        💬 <a href="https://www.success.co/contact" target="_blank">Need Help? Contact Us</a>
      </div>
      <div class="link-item">
        🏠 <a href="https://www.success.co/" target="_blank">Success.co Homepage</a>
      </div>
    </div>
  </div>
  
  <script>
    function copyUrl() {
      const url = 'https://www.success.co/mcp';
      const btn = event.target;
      
      navigator.clipboard.writeText(url).then(function() {
        btn.textContent = 'Copied!';
        btn.classList.add('copied');
        setTimeout(function() {
          btn.textContent = 'Copy';
          btn.classList.remove('copied');
        }, 2000);
      }).catch(function(err) {
        console.error('Failed to copy:', err);
        btn.textContent = 'Failed';
        setTimeout(function() {
          btn.textContent = 'Copy';
        }, 2000);
      });
    }
  </script>
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

    // Add client information to auth context
    const userAgent = req.headers["user-agent"] || "";
    const clientInfo = parseAIClient(userAgent);
    authContext.client = clientInfo.client;
    authContext.clientVersion = clientInfo.version;

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

    // Add client information to auth context
    const userAgent = req.headers["user-agent"] || "";
    const clientInfo = parseAIClient(userAgent);
    authContext.client = clientInfo.client;
    authContext.clientVersion = clientInfo.version;

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
