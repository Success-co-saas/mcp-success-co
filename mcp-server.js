import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
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

server.prompt(
  "add_numbers",
  "Given two numbers, add them together to find their sum",
  {
    a: z.string().describe("The first number"),
    b: z.string().describe("The second number"),
  },
  async ({ a, b }) => ({
    messages: [
      {
        role: "assistant",
        content: {
          type: "text",
          text: "You are a math assistant.",
        },
      },
      {
        role: "user",
        content: {
          type: "text",
          text: `The numbers are: ${a} and ${b}`,
        },
      },
    ],
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

// Tool to get teams from the Success.co API using GraphQL
server.tool(
  "getSuccessCoTeams",
  "Get a list of teams from the Success.co API",
  {
    limit: z.number().optional().describe("Limit the number of teams returned"),
    offset: z.number().optional().describe("Offset for pagination"),
  },
  async ({ limit, offset }) => {
    const apiKey = getSuccessCoApiKey();

    if (!apiKey) {
      return {
        content: [
          {
            type: "text",
            text: "Success.co API key not set. Please set it using the setSuccessCoApiKey tool.",
          },
        ],
      };
    }

    try {
      // GraphQL endpoint
      const url = "https://www.success.co/graphql";

      // Construct the GraphQL query with optional pagination
      let query = `
          query {
            teams${
              limit || offset
                ? `(${[
                    limit ? `limit: ${limit}` : "",
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

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(data.data, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error fetching teams: ${error.message}`,
          },
        ],
      };
    }
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
