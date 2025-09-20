import express from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  getTeams,
  getUsers,
  getTodos,
  getRocks,
  getMeetings,
  getIssues,
  getHeadlines,
  search,
  fetch,
  setSuccessCoApiKey,
  getSuccessCoApiKeyTool,
  getSuccessCoApiKey,
  callSuccessCoGraphQL,
} from "./tools.js";

// Ensure Node 18+ for global fetch.

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const API_KEY_FILE = path.join(__dirname, ".api_key");

// --- Success.co API key management ------------------------------------------

// --- MCP server --------------------------------------------------------------

const server = new McpServer({
  name: "Success.co MCP Server",
  version: "0.0.3",
});

// Tool to set the Success.co API key
server.tool(
  "setSuccessCoApiKey",
  "Set the Success.co API key",
  {
    apiKey: z.string().describe("The API key for Success.co"),
  },
  async ({ apiKey }) => {
    return await setSuccessCoApiKey({ apiKey });
  }
);

// Tool to get the Success.co API key (consistent with storage)
server.tool(
  "getSuccessCoApiKey",
  "Get the Success.co API key (env or stored file)",
  {},
  async () => {
    return await getSuccessCoApiKeyTool({});
  }
);

// ---------- Teams tool (kept) -----------------------------------------------

server.tool(
  "getTeams",
  "List Success.co teams",
  {
    first: z.number().int().optional().describe("Optional page size"),
    offset: z.number().int().optional().describe("Optional offset"),
    stateId: z
      .string()
      .optional()
      .describe("Team state filter (defaults to 'ACTIVE')"),
  },
  async ({ first, offset, stateId }) => {
    return await getTeams({ first, offset, stateId });
  }
);

// ---------- Users tool ------------------------------------------------------

server.tool(
  "getUsers",
  "List Success.co users",
  {
    first: z.number().int().optional().describe("Optional page size"),
    offset: z.number().int().optional().describe("Optional offset"),
    stateId: z
      .string()
      .optional()
      .describe("User state filter (defaults to 'ACTIVE')"),
  },
  async ({ first, offset, stateId }) => {
    return await getUsers({ first, offset, stateId });
  }
);

// ---------- Todos tool ------------------------------------------------------

server.tool(
  "getTodos",
  "List Success.co todos",
  {
    first: z.number().int().optional().describe("Optional page size"),
    offset: z.number().int().optional().describe("Optional offset"),
    stateId: z
      .string()
      .optional()
      .describe("Todo state filter (defaults to 'ACTIVE')"),
  },
  async ({ first, offset, stateId }) => {
    return await getTodos({ first, offset, stateId });
  }
);

// ---------- Rocks tool ------------------------------------------------------

server.tool(
  "getRocks",
  "List Success.co rocks",
  {
    first: z.number().int().optional().describe("Optional page size"),
    offset: z.number().int().optional().describe("Optional offset"),
    stateId: z
      .string()
      .optional()
      .describe("Rock state filter (defaults to 'ACTIVE')"),
    rockStatusId: z
      .string()
      .optional()
      .describe(
        "Rock status filter (defaults to blank. Can be 'ONTRACK', 'OFFTRACK', 'COMPLETE', 'INCOMPLETE')"
      ),
  },
  async ({ first, offset, stateId, rockStatusId }) => {
    return await getRocks({ first, offset, stateId, rockStatusId });
  }
);

// ---------- Meetings tool ------------------------------------------------------

server.tool(
  "getMeetings",
  "List Success.co meetings",
  {
    first: z.number().int().optional().describe("Optional page size"),
    offset: z.number().int().optional().describe("Optional offset"),
    stateId: z
      .string()
      .optional()
      .describe("Meeting state filter (defaults to 'ACTIVE')"),
  },
  async ({ first, offset, stateId }) => {
    return await getMeetings({ first, offset, stateId });
  }
);

// ---------- Issues tool ------------------------------------------------------

server.tool(
  "getIssues",
  "List Success.co issues",
  {
    first: z.number().int().optional().describe("Optional page size"),
    offset: z.number().int().optional().describe("Optional offset"),
    stateId: z
      .string()
      .optional()
      .describe("Issue state filter (defaults to 'ACTIVE')"),
  },
  async ({ first, offset, stateId }) => {
    return await getIssues({ first, offset, stateId });
  }
);

// ---------- Headlines tool ------------------------------------------------------

server.tool(
  "getHeadlines",
  "List Success.co headlines",
  {
    first: z.number().int().optional().describe("Optional page size"),
    offset: z.number().int().optional().describe("Optional offset"),
    stateId: z
      .string()
      .optional()
      .describe("Headline state filter (defaults to 'ACTIVE')"),
  },
  async ({ first, offset, stateId }) => {
    return await getHeadlines({ first, offset, stateId });
  }
);

// FETCH: fetch the full item by id (REQUIRED: id)
server.tool(
  "fetch",
  "Fetch a single Success.co item by id returned from search.",
  {
    id: z.string().describe("The id from a previous search hit."),
  },
  async ({ id }) => {
    return await fetch({ id });
  }
);

// --- HTTP transports ---------------------------------------------------------

const app = express();
app.use(express.json());

// Add CORS middleware for cross-origin requests
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization, x-mcp-session-id"
  );

  // Handle preflight requests
  if (req.method === "OPTIONS") {
    res.sendStatus(200);
    return;
  }

  next();
});

// Add authentication middleware for MCP endpoints
app.use("/mcp", (req, res, next) => {
  const authHeader = req.headers.authorization;

  // Log authentication attempts
  if (authHeader) {
    console.error(`[AUTH] Authorization header: "${authHeader}"`);
  }

  // For now, allow all requests to pass through
  // In production, you might want to validate the token
  next();
});

// Store transports for each session type
const transports = {
  streamable: {},
  sse: {},
};

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    transports: {
      streamable: Object.keys(transports.streamable).length,
      sse: Object.keys(transports.sse).length,
    },
    timestamp: new Date().toISOString(),
  });
});

// Note: We'll create transport instances per request instead of a global one
// This avoids the "Server already initialized" error

// Helper function to create a fresh MCP server with all tools
function createFreshMcpServer() {
  const freshServer = new McpServer({
    name: "Success.co MCP Server",
    version: "0.0.3",
  });

  // Add all tools to the fresh server
  // Tool to set the Success.co API key
  freshServer.tool(
    "setSuccessCoApiKey",
    "Set the Success.co API key",
    {
      apiKey: z.string().describe("The API key for Success.co"),
    },
    async ({ apiKey }) => {
      return await setSuccessCoApiKey({ apiKey });
    }
  );

  // Tool to get the Success.co API key
  freshServer.tool(
    "getSuccessCoApiKey",
    "Get the Success.co API key (env or stored file)",
    {},
    async () => {
      return await getSuccessCoApiKeyTool({});
    }
  );

  // Add all tools from the main server
  // Teams tool
  freshServer.tool(
    "getTeams",
    "List Success.co teams",
    {
      first: z.number().int().optional().describe("Optional page size"),
      offset: z.number().int().optional().describe("Optional offset"),
      stateId: z
        .string()
        .optional()
        .describe("Team state filter (defaults to 'ACTIVE')"),
    },
    async ({ first, offset, stateId }) => {
      return await getTeams({ first, offset, stateId });
    }
  );

  // Users tool
  freshServer.tool(
    "getUsers",
    "List Success.co users",
    {
      first: z.number().int().optional().describe("Optional page size"),
      offset: z.number().int().optional().describe("Optional offset"),
      stateId: z
        .string()
        .optional()
        .describe("User state filter (defaults to 'ACTIVE')"),
    },
    async ({ first, offset, stateId }) => {
      return await getUsers({ first, offset, stateId });
    }
  );

  // Todos tool
  freshServer.tool(
    "getTodos",
    "List Success.co todos",
    {
      first: z.number().int().optional().describe("Optional page size"),
      offset: z.number().int().optional().describe("Optional offset"),
      stateId: z
        .string()
        .optional()
        .describe("Todo state filter (defaults to 'ACTIVE')"),
    },
    async ({ first, offset, stateId }) => {
      return await getTodos({ first, offset, stateId });
    }
  );

  // Rocks tool
  freshServer.tool(
    "getRocks",
    "List Success.co rocks",
    {
      first: z.number().int().optional().describe("Optional page size"),
      offset: z.number().int().optional().describe("Optional offset"),
      stateId: z
        .string()
        .optional()
        .describe("Rock state filter (defaults to 'ACTIVE')"),
      rockStatusId: z
        .string()
        .optional()
        .describe("Rock status filter (defaults to blank)"),
    },
    async ({ first, offset, stateId, rockStatusId }) => {
      return await getRocks({ first, offset, stateId, rockStatusId });
    }
  );

  // Meetings tool
  freshServer.tool(
    "getMeetings",
    "List Success.co meetings",
    {
      first: z.number().int().optional().describe("Optional page size"),
      offset: z.number().int().optional().describe("Optional offset"),
      stateId: z
        .string()
        .optional()
        .describe("Meeting state filter (defaults to 'ACTIVE')"),
    },
    async ({ first, offset, stateId }) => {
      return await getMeetings({ first, offset, stateId });
    }
  );

  // Issues tool
  freshServer.tool(
    "getIssues",
    "List Success.co issues",
    {
      first: z.number().int().optional().describe("Optional page size"),
      offset: z.number().int().optional().describe("Optional offset"),
      stateId: z
        .string()
        .optional()
        .describe("Issue state filter (defaults to 'ACTIVE')"),
    },
    async ({ first, offset, stateId }) => {
      return await getIssues({ first, offset, stateId });
    }
  );

  // Headlines tool
  freshServer.tool(
    "getHeadlines",
    "List Success.co headlines",
    {
      first: z.number().int().optional().describe("Optional page size"),
      offset: z.number().int().optional().describe("Optional offset"),
      stateId: z
        .string()
        .optional()
        .describe("Headline state filter (defaults to 'ACTIVE')"),
    },
    async ({ first, offset, stateId }) => {
      return await getHeadlines({ first, offset, stateId });
    }
  );

  // Fetch tool
  freshServer.tool(
    "fetch",
    "Fetch a single Success.co item by id returned from search.",
    {
      id: z.string().describe("The id from a previous search hit."),
    },
    async ({ id }) => {
      return await fetch({ id });
    }
  );

  return freshServer;
}

// Create a single transport instance for Streamable HTTP
const streamableTransport = new StreamableHTTPServerTransport({
  sessionIdGenerator: () =>
    `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
});

// HTTP endpoint for MCP requests using StreamableHTTPServerTransport
app.all("/mcp", async (req, res) => {
  try {
    console.error(`[MCP] Received ${req.method} request to /mcp`);
    console.error(`[MCP] Query params:`, req.query);
    console.error(`[MCP] Headers:`, req.headers);
    console.error(`[MCP] Body:`, req.body);

    // Check authorization header
    const authHeader = req.headers.authorization;
    if (authHeader) {
      console.error(`[MCP] Authorization header: "${authHeader}"`);
      if (authHeader === "Bearer" || authHeader === "Bearer ") {
        console.error(`[MCP] WARNING: Empty Bearer token detected`);
        // For now, we'll allow empty Bearer tokens to pass through
        // This might be expected behavior for some MCP clients
      }
    }

    // Use the StreamableHTTPServerTransport to handle the request
    const sessionId =
      req.headers["x-mcp-session-id"] ||
      `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Get or create transport for this session
    let transport = transports.streamable[sessionId];
    if (!transport) {
      transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => sessionId,
      });
      transports.streamable[sessionId] = transport;

      // Connect the transport to a fresh server instance
      const requestServer = createFreshMcpServer();
      await requestServer.connect(transport);
      console.error(`[MCP] Created new transport for session: ${sessionId}`);
    }

    // Process MCP request manually since handleRequest doesn't exist
    const mcpRequest = req.body;
    console.error(`[MCP] Processing MCP request:`, mcpRequest);

    // Create a fresh server instance for this request
    const requestServer = createFreshMcpServer();

    // Create a direct mapping of tool names to handlers for easier access
    const toolHandlers = {
      setSuccessCoApiKey: async (args) => {
        return await setSuccessCoApiKey(args);
      },
      getSuccessCoApiKey: async () => {
        return await getSuccessCoApiKeyTool({});
      },
      getTeams: async (args) => {
        return await getTeams(args);
      },
      getUsers: async (args) => {
        return await getUsers(args);
      },
      getTodos: async (args) => {
        return await getTodos(args);
      },
      getRocks: async (args) => {
        return await getRocks(args);
      },
      getMeetings: async (args) => {
        return await getMeetings(args);
      },
      getIssues: async (args) => {
        return await getIssues(args);
      },
      getHeadlines: async (args) => {
        return await getHeadlines(args);
      },
      search: async (args) => {
        return await search(args);
      },
      fetch: async (args) => {
        return await fetch(args);
      },
    };

    // Handle the initialize request
    if (mcpRequest.method === "initialize") {
      const response = {
        jsonrpc: "2.0",
        id: mcpRequest.id,
        result: {
          protocolVersion: "2025-06-18",
          capabilities: {
            tools: {},
            resources: {},
            prompts: {},
          },
          serverInfo: {
            name: "Success.co MCP Server",
            version: "0.0.3",
          },
        },
      };
      console.error(`[MCP] Sending initialize response:`, response);
      res.json(response);
      return;
    }

    // Handle tools/list request
    if (mcpRequest.method === "tools/list") {
      const tools = [
        {
          name: "setSuccessCoApiKey",
          description: "Set the Success.co API key",
          inputSchema: {
            type: "object",
            properties: {
              apiKey: {
                type: "string",
                description: "The API key for Success.co",
              },
            },
            required: ["apiKey"],
          },
        },
        {
          name: "getSuccessCoApiKey",
          description: "Get the Success.co API key (env or stored file)",
          inputSchema: {
            type: "object",
            properties: {},
          },
        },
        {
          name: "getTeams",
          description: "List Success.co teams",
          inputSchema: {
            type: "object",
            properties: {
              first: {
                type: "integer",
                description: "Optional page size",
              },
              offset: {
                type: "integer",
                description: "Optional offset",
              },
              stateId: {
                type: "string",
                description: "Team state filter (defaults to 'ACTIVE')",
              },
            },
          },
        },
        {
          name: "getUsers",
          description: "List Success.co users",
          inputSchema: {
            type: "object",
            properties: {
              first: {
                type: "integer",
                description: "Optional page size",
              },
              offset: {
                type: "integer",
                description: "Optional offset",
              },
              stateId: {
                type: "string",
                description: "User state filter (defaults to 'ACTIVE')",
              },
            },
          },
        },
        {
          name: "getTodos",
          description: "List Success.co todos",
          inputSchema: {
            type: "object",
            properties: {
              first: {
                type: "integer",
                description: "Optional page size",
              },
              offset: {
                type: "integer",
                description: "Optional offset",
              },
              stateId: {
                type: "string",
                description: "Todo state filter (defaults to 'ACTIVE')",
              },
            },
          },
        },
        {
          name: "getRocks",
          description: "List Success.co rocks",
          inputSchema: {
            type: "object",
            properties: {
              first: {
                type: "integer",
                description: "Optional page size",
              },
              offset: {
                type: "integer",
                description: "Optional offset",
              },
              stateId: {
                type: "string",
                description: "Rock state filter (defaults to 'ACTIVE')",
              },
              rockStatusId: {
                type: "string",
                description: "Rock status filter (defaults to blank)",
              },
            },
          },
        },
        {
          name: "getMeetings",
          description: "List Success.co meetings",
          inputSchema: {
            type: "object",
            properties: {
              first: {
                type: "integer",
                description: "Optional page size",
              },
              offset: {
                type: "integer",
                description: "Optional offset",
              },
              stateId: {
                type: "string",
                description: "Meeting state filter (defaults to 'ACTIVE')",
              },
            },
          },
        },
        {
          name: "getIssues",
          description: "List Success.co issues",
          inputSchema: {
            type: "object",
            properties: {
              first: {
                type: "integer",
                description: "Optional page size",
              },
              offset: {
                type: "integer",
                description: "Optional offset",
              },
              stateId: {
                type: "string",
                description: "Issue state filter (defaults to 'ACTIVE')",
              },
            },
          },
        },
        {
          name: "getHeadlines",
          description: "List Success.co headlines",
          inputSchema: {
            type: "object",
            properties: {
              first: {
                type: "integer",
                description: "Optional page size",
              },
              offset: {
                type: "integer",
                description: "Optional offset",
              },
              stateId: {
                type: "string",
                description: "Headline state filter (defaults to 'ACTIVE')",
              },
            },
          },
        },
        {
          name: "search",
          description:
            "Search Success.co data (supports: teams, users, todos, rocks, meetings, issues, headlines).",
          inputSchema: {
            type: "object",
            properties: {
              query: {
                type: "string",
                description:
                  "What to look up, e.g., 'list my teams', 'show users', 'find todos', 'get meetings'",
              },
            },
            required: ["query"],
          },
        },
        {
          name: "fetch",
          description:
            "Fetch a single Success.co item by id returned from search.",
          inputSchema: {
            type: "object",
            properties: {
              id: {
                type: "string",
                description: "The id from a previous search hit.",
              },
            },
            required: ["id"],
          },
        },
      ];

      const response = {
        jsonrpc: "2.0",
        id: mcpRequest.id,
        result: {
          tools: tools,
        },
      };
      console.error(`[MCP] Sending tools/list response:`, response);
      res.json(response);
      return;
    }

    // Handle tools/call request
    if (mcpRequest.method === "tools/call") {
      const { name, arguments: args } = mcpRequest.params;
      console.error(`[MCP] Tool call: ${name} with args:`, args);

      // Get the tool handler from our direct mapping
      const toolHandler = toolHandlers[name];

      if (!toolHandler) {
        console.error(
          `[MCP] Tool '${name}' not found. Available tools:`,
          Object.keys(toolHandlers)
        );
        res.status(400).json({
          jsonrpc: "2.0",
          id: mcpRequest.id,
          error: {
            code: -32601,
            message: `Tool '${name}' not found`,
          },
        });
        return;
      }

      try {
        const result = await toolHandler(args);
        const response = {
          jsonrpc: "2.0",
          id: mcpRequest.id,
          result: result,
        };
        console.error(`[MCP] Tool call result:`, response);
        res.json(response);
      } catch (error) {
        console.error(`[MCP] Tool call error:`, error);
        res.status(500).json({
          jsonrpc: "2.0",
          id: mcpRequest.id,
          error: {
            code: -32603,
            message: "Internal error",
            data: error.message,
          },
        });
      }
      return;
    }

    // Handle resources/list request
    if (mcpRequest.method === "resources/list") {
      const response = {
        jsonrpc: "2.0",
        id: mcpRequest.id,
        result: {
          resources: [],
        },
      };
      console.error(`[MCP] Sending resources/list response:`, response);
      res.json(response);
      return;
    }

    // For other requests, return not implemented
    res.status(501).json({
      jsonrpc: "2.0",
      id: mcpRequest.id,
      error: {
        code: -32601,
        message: `Method ${mcpRequest.method} not implemented`,
      },
    });

    console.error(
      `[MCP] Request handled successfully for session: ${sessionId}`
    );
  } catch (error) {
    console.error(`[MCP] Error in /mcp endpoint:`, error);
    console.error(`[MCP] Error stack:`, error.stack);
    if (!res.headersSent) {
      res
        .status(500)
        .json({ error: "Internal server error", details: error.message });
    }
  }
});

// Legacy SSE endpoint for older clients
app.get("/sse", async (req, res) => {
  try {
    console.error(`[SSE] Received GET request to /sse`);
    const transport = new SSEServerTransport("/messages", res);
    transports.sse[transport.sessionId] = transport;

    res.on("close", () => {
      console.error(
        `[SSE] Connection closed for sessionId: ${transport.sessionId}`
      );
      delete transports.sse[transport.sessionId];
    });

    await server.connect(transport);
    console.error(
      `[SSE] Transport connected successfully with sessionId: ${transport.sessionId}`
    );
  } catch (error) {
    console.error(`[SSE] Error in /sse endpoint:`, error);
    if (!res.headersSent) {
      res
        .status(500)
        .json({ error: "Internal server error", details: error.message });
    }
  }
});

// Legacy message endpoint for older clients
app.post("/messages", async (req, res) => {
  const sessionId = String(req.query.sessionId || "");
  const transport = transports.sse[sessionId];
  if (transport) {
    await transport.handlePostMessage(req, res, req.body);
  } else {
    res.status(400).send("No transport found for sessionId");
  }
});

// Use console.error for operational logs (will appear in mcp.log but not break the protocol)
console.error("Starting MCP server");

// Always start HTTP server (with error handling for port conflicts)
console.error("Starting HTTP server on port 3001");
const httpServer = app
  .listen(3001, () => {
    console.error("HTTP server is running on port 3001");
  })
  .on("error", (error) => {
    // Just log the error but don't exit - allow STDIO to work even if HTTP fails
    console.error(`HTTP server error: ${error.message}`);
  });

// Check if running in Claude conversation or other non-TTY environment

// Initialize STDIO transport for Claude
const stdioTransport = new StdioServerTransport();

// Connect the STDIO transport to the MCP server
server
  .connect(stdioTransport)
  .then(() => {
    console.error("STDIO transport connected successfully");
  })
  .catch((error) => {
    console.error(`Error connecting STDIO transport: ${error.message}`);
    // Don't exit - HTTP server might still be running
  });

// Handle process termination signals
process.on("SIGINT", () => {
  console.error("Received SIGINT, shutting down");
  if (httpServer) {
    httpServer.close();
  }
  process.exit(0);
});

process.on("SIGTERM", () => {
  console.error("Received SIGTERM, shutting down");
  if (httpServer) {
    httpServer.close();
  }
  process.exit(0);
});

// Keep the process alive for STDIO transport
process.stdin.resume();
