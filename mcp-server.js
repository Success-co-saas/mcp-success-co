import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js"
import { z } from "zod"

const server = new McpServer({
  name: "MCP Server Boilerplate",
  version: "1.0.0",
})

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
)

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
)

server.tool("getApiKey", "Get the API key", {}, async ({}) => ({
  content: [{ type: "text", text: process.env.API_KEY || "API_KEY environment variable not set" }],
}))

const transport = new StdioServerTransport()
await server.connect(transport)
