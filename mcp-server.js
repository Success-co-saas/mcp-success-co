import express from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { z } from "zod";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const API_KEY_FILE = path.join(__dirname, ".api_key");

// Function to manage the Success.co API key
const getSuccessCoApiKey = () => {
  // First check environment variable
  if (process.env.SUCCESS_CO_API_KEY) {
    return process.env.SUCCESS_CO_API_KEY;
  }

  // Then check for stored API key
  try {
    if (fs.existsSync(API_KEY_FILE)) {
      return fs.readFileSync(API_KEY_FILE, "utf8").trim();
    }
  } catch (error) {
    console.error("Error reading API key file:", error);
  }

  return null;
};

// Function to store the Success.co API key
const storeSuccessCoApiKey = (apiKey) => {
  try {
    fs.writeFileSync(API_KEY_FILE, apiKey, "utf8");
    return true;
  } catch (error) {
    console.error("Error storing API key:", error);
    return false;
  }
};

const server = new McpServer({
  name: "Success.co MCP Server",
  version: "0.0.1",
});

server.tool(
  "add",
  "Add two numbers",
  {
    a: z.number().describe("The first number"),
    b: z.number().describe("The second number"),
  },
  async ({ a, b }) => ({
    content: [{ type: "text", text: String(a + b) }],
  })
);

server.tool(
  "addx",
  "Add two numbers",
  {
    a: z.number().describe("The first number"),
    b: z.number().describe("The second number"),
  },
  async ({ a, b }) => ({
    content: [{ type: "text", text: String(a + b) }],
  })
);

server.tool("getApiKey", "Get the API key", {}, async ({}) => ({
  content: [
    {
      type: "text",
      text: process.env.API_KEY || "API_KEY environment variable not set",
    },
  ],
}));

// Tool to set the Success.co API key
server.tool(
  "setSuccessCoApiKey",
  "Set the Success.co API key",
  {
    apiKey: z.string().describe("The API key for Success.co"),
  },
  async ({ apiKey }) => {
    const stored = storeSuccessCoApiKey(apiKey);
    return {
      content: [
        {
          type: "text",
          text: stored
            ? "Success.co API key stored successfully"
            : "Failed to store Success.co API key",
        },
      ],
    };
  }
);

// Tool to get the Success.co API key
server.tool(
  "getSuccessCoApiKey",
  "Get the Success.co API key",
  {},
  async ({}) => {
    const apiKey = getSuccessCoApiKey();
    return {
      content: [
        {
          type: "text",
          text: apiKey || "Success.co API key not set",
        },
      ],
    };
  }
);

// Register the Success.co teams as a resource
server.registerResource(
  "Get teams",
  "success-co://teams",
  {
    title: "List teams",
    description: "List of all teams setup on Success.co",
    mimeType: "application/json",
  },
  async (uri) => {
    const apiKey = getSuccessCoApiKey();

    if (!apiKey) {
      throw new Error(
        "Success.co API key not set. Please set it using the setSuccessCoApiKey tool."
      );
    }

    try {
      // GraphQL endpoint
      const url = "https://www.success.co/graphql";

      // Parse URI parameters if any
      const searchParams = new URLSearchParams(uri.search);
      const first = searchParams.get("first")
        ? parseInt(searchParams.get("first"))
        : undefined;
      const offset = searchParams.get("offset")
        ? parseInt(searchParams.get("offset"))
        : undefined;

      // Construct the GraphQL query with optional pagination
      let query = `
        query {
          teams${
            first || offset
              ? `(${[
                  first ? `first: ${first}` : "",
                  offset ? `offset: ${offset}` : "",
                ]
                  .filter(Boolean)
                  .join(", ")})`
              : ""
          } {
            nodes {
              id
              badgeUrl
              name
              desc
              color
              isLeadership
              createdAt
              stateId
              companyId
            }
            totalCount
          }
        }
      `;

      // Make the GraphQL request to the Success.co API
      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: query,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `API request failed with status ${response.status}: ${errorText}`
        );
      }

      const data = await response.json();

      // Check for GraphQL errors
      if (data.errors) {
        throw new Error(`GraphQL errors: ${JSON.stringify(data.errors)}`);
      }

      // Return the teams data in the correct format for resources
      return {
        contents: data.data.teams.nodes.map((team) => ({
          uri: `success-co://teams/${team.id}`,
          text: JSON.stringify(team),
        })),
        totalCount: data.data.teams.totalCount,
      };
    } catch (error) {
      throw new Error(`Error fetching teams: ${error.message}`);
    }
  }
);

const app = express();
app.use(express.json());

// Store transports for each session type
const transports = {
  streamable: {},
  sse: {},
};

// Modern Streamable HTTP endpoint
app.all("/mcp", async (req, res) => {
  // Handle Streamable HTTP transport for modern clients
  // Implementation as shown in the "With Session Management" example
  // ...
});

// Legacy SSE endpoint for older clients
app.get("/sse", async (req, res) => {
  // Create SSE transport for legacy clients
  const transport = new SSEServerTransport("/messages", res);
  transports.sse[transport.sessionId] = transport;

  res.on("close", () => {
    delete transports.sse[transport.sessionId];
  });

  await server.connect(transport);
});

// Legacy message endpoint for older clients
app.post("/messages", async (req, res) => {
  const sessionId = req.query.sessionId;
  const transport = transports.sse[sessionId];
  if (transport) {
    await transport.handlePostMessage(req, res, req.body);
  } else {
    res.status(400).send("No transport found for sessionId");
  }
});

app.listen(3001);
