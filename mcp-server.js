import express from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Ensure Node 18+ for global fetch.

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const API_KEY_FILE = path.join(__dirname, ".api_key");

// --- Success.co API key management ------------------------------------------

const getSuccessCoApiKey = () => {
  if (process.env.SUCCESS_CO_API_KEY) return process.env.SUCCESS_CO_API_KEY;
  try {
    if (fs.existsSync(API_KEY_FILE)) {
      return fs.readFileSync(API_KEY_FILE, "utf8").trim();
    }
  } catch (error) {
    console.error("Error reading API key file:", error);
  }
  return null;
};

const storeSuccessCoApiKey = (apiKey) => {
  try {
    fs.writeFileSync(API_KEY_FILE, apiKey, "utf8");
    return true;
  } catch (error) {
    console.error("Error storing API key:", error);
    return false;
  }
};

// --- Small helper to call Success.co GraphQL --------------------------------

async function callSuccessCoGraphQL(query) {
  const apiKey = getSuccessCoApiKey();
  if (!apiKey) {
    return {
      ok: false,
      error:
        "Success.co API key not set. Use the setSuccessCoApiKey tool first.",
    };
  }

  const url = "https://www.success.co/graphql";
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    return {
      ok: false,
      error: `API request failed with status ${response.status}: ${errorText}`,
    };
  }

  const data = await response.json();
  if (data.errors) {
    return {
      ok: false,
      error: `GraphQL errors: ${JSON.stringify(data.errors)}`,
    };
  }

  return { ok: true, data };
}

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

// Tool to get the Success.co API key (consistent with storage)
server.tool(
  "getSuccessCoApiKey",
  "Get the Success.co API key (env or stored file)",
  {},
  async () => {
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

// ---------- Teams tool (kept) -----------------------------------------------

server.tool(
  "getTeams",
  "List Success.co teams",
  {
    first: z.number().int().optional().describe("Optional page size"),
    offset: z.number().int().optional().describe("Optional offset"),
  },
  async ({ first, offset }) => {
    const args =
      first !== undefined || offset !== undefined
        ? `(${[
            first !== undefined ? `first: ${first}` : "",
            offset !== undefined ? `offset: ${offset}` : "",
          ]
            .filter(Boolean)
            .join(", ")})`
        : "";

    const query = `
      query {
        teams${args} {
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

    const result = await callSuccessCoGraphQL(query);
    if (!result.ok) {
      return { content: [{ type: "text", text: result.error }] };
    }

    const data = result.data;
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            totalCount: data.data.teams.totalCount,
            results: data.data.teams.nodes.map((team) => ({
              id: team.id,
              title: team.name,
              description: team.desc || "",
              color: team.color,
              status: team.stateId,
            })),
          }),
        },
      ],
    };
  }
);

// ---------- Users tool ------------------------------------------------------

server.tool(
  "getUsers",
  "List Success.co users",
  {
    first: z.number().int().optional().describe("Optional page size"),
    offset: z.number().int().optional().describe("Optional offset"),
  },
  async ({ first, offset }) => {
    const args =
      first !== undefined || offset !== undefined
        ? `(${[
            first !== undefined ? `first: ${first}` : "",
            offset !== undefined ? `offset: ${offset}` : "",
          ]
            .filter(Boolean)
            .join(", ")})`
        : "";

    const query = `
      query {
        users${args} {
          nodes {
            id
            userName
            firstName
            lastName
            jobTitle
            desc
            avatar
            email
            userPermissionId
            userStatusId
            languageId
            timeZone
            companyId
          }
          totalCount
        }
      }
    `;

    const result = await callSuccessCoGraphQL(query);
    if (!result.ok) {
      return { content: [{ type: "text", text: result.error }] };
    }

    const data = result.data;
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            totalCount: data.data.users.totalCount,
            results: data.data.users.nodes.map((user) => ({
              id: user.id,
              name: `${user.firstName} ${user.lastName}`,
              email: user.email,
              jobTitle: user.jobTitle || "",
              description: user.desc || "",
              userName: user.userName || "",
              avatar: user.avatar || "",
              status: user.userStatusId,
              language: user.languageId,
              timeZone: user.timeZone,
            })),
          }),
        },
      ],
    };
  }
);

// ---------- NEW: `search` tool for natural queries like “List my teams” ------

// --- Replace your existing `search` and `fetch` with these -------------------

// SEARCH: natural language -> list of hits with ids
server.tool(
  "search",
  "Search Success.co data (supports: teams, users).",
  {
    query: z
      .string()
      .describe("What to look up, e.g., 'list my teams', 'show users'"),
  },
  async ({ query }) => {
    const q = (query || "").toLowerCase();
    const wantsTeams =
      /\b(team|teams|my team|my teams)\b/.test(q) ||
      /list.*team/.test(q) ||
      /show.*team/.test(q);

    const wantsUsers =
      /\b(user|users|people|person|employee|employees)\b/.test(q) ||
      /list.*user/.test(q) ||
      /show.*user/.test(q) ||
      /list.*people/.test(q) ||
      /show.*people/.test(q);

    if (wantsTeams) {
      const gql = `
        query {
          teams {
            nodes {
              id
              name
              desc
            }
            totalCount
          }
        }
      `;
      const result = await callSuccessCoGraphQL(gql);
      if (!result.ok)
        return { content: [{ type: "text", text: result.error }] };

      const { data } = result;
      const hits = (data?.data?.teams?.nodes || []).map((t) => ({
        id: String(t.id), // REQUIRED by ChatGPT's fetch contract
        title: t.name ?? String(t.id),
        snippet: t.desc || "",
        // optional extras are fine, but keep required ones present
      }));

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              kind: "teams",
              totalCount: data?.data?.teams?.totalCount ?? hits.length,
              hits,
            }),
          },
        ],
      };
    }

    if (wantsUsers) {
      const gql = `
        query {
          users {
            nodes {
              id
              firstName
              lastName
              email
              jobTitle
              desc
            }
            totalCount
          }
        }
      `;
      const result = await callSuccessCoGraphQL(gql);
      if (!result.ok)
        return { content: [{ type: "text", text: result.error }] };

      const { data } = result;
      const hits = (data?.data?.users?.nodes || []).map((u) => ({
        id: String(u.id), // REQUIRED by ChatGPT's fetch contract
        title: `${u.firstName} ${u.lastName}`,
        snippet: `${u.jobTitle || ""} ${u.desc || ""}`.trim() || u.email,
        // optional extras are fine, but keep required ones present
      }));

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              kind: "users",
              totalCount: data?.data?.users?.totalCount ?? hits.length,
              hits,
            }),
          },
        ],
      };
    }

    return {
      content: [
        {
          type: "text",
          text: "I currently support team and user search. Try: 'List my teams' or 'Show users'.",
        },
      ],
    };
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
    // Accept both raw ids like "123" and URIs like "success-co://teams/123" or "success-co://users/123"
    const teamMatch = /^success-co:\/\/teams\/(.+)$/.exec(id);
    const userMatch = /^success-co:\/\/users\/(.+)$/.exec(id);

    const teamId = teamMatch ? teamMatch[1] : null;
    const userId = userMatch ? userMatch[1] : null;
    const rawId = teamId || userId || id;

    const apiKey = getSuccessCoApiKey();
    if (!apiKey) {
      return {
        content: [
          {
            type: "text",
            text: "Success.co API key not set. Use setSuccessCoApiKey first.",
          },
        ],
      };
    }

    // Try to fetch as team first if it looks like a team ID or URI
    if (teamId || (!userId && !teamMatch && !userMatch)) {
      const gql = `
        query ($id: ID!) {
          team(id: $id) {
            id
            name
            desc
            badgeUrl
            color
            isLeadership
            createdAt
            stateId
            companyId
          }
        }
      `;

      const url = "https://www.success.co/graphql";
      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query: gql, variables: { id: rawId } }),
      });

      if (response.ok) {
        const data = await response.json();
        if (!data.errors && data?.data?.team) {
          return {
            content: [{ type: "text", text: JSON.stringify(data.data.team) }],
          };
        }
      }
    }

    // Try to fetch as user if it looks like a user ID or URI
    if (userId || (!teamId && !teamMatch && !userMatch)) {
      const gql = `
        query ($id: ID!) {
          user(id: $id) {
            id
            userName
            firstName
            lastName
            jobTitle
            desc
            avatar
            email
            userPermissionId
            userStatusId
            languageId
            timeZone
            companyId
          }
        }
      `;

      const url = "https://www.success.co/graphql";
      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query: gql, variables: { id: rawId } }),
      });

      if (response.ok) {
        const data = await response.json();
        if (!data.errors && data?.data?.user) {
          return {
            content: [{ type: "text", text: JSON.stringify(data.data.user) }],
          };
        }
      }
    }

    // If neither worked, return error
    return {
      content: [
        {
          type: "text",
          text: `No team or user found for id ${rawId}`,
        },
      ],
    };
  }
);

// ---------- Resource (kept) --------------------------------------------------

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
      const url = "https://www.success.co/graphql";

      const searchParams = new URLSearchParams(uri.search);
      const first = searchParams.get("first")
        ? parseInt(searchParams.get("first"))
        : undefined;
      const offset = searchParams.get("offset")
        ? parseInt(searchParams.get("offset"))
        : undefined;

      const args =
        first !== undefined || offset !== undefined
          ? `(${[
              first !== undefined ? `first: ${first}` : "",
              offset !== undefined ? `offset: ${offset}` : "",
            ]
              .filter(Boolean)
              .join(", ")})`
          : "";

      const query = `
        query {
          teams${args} {
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

      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `API request failed with status ${response.status}: ${errorText}`
        );
      }

      const data = await response.json();

      if (data.errors) {
        throw new Error(`GraphQL errors: ${JSON.stringify(data.errors)}`);
      }

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

server.registerResource(
  "Get users",
  "success-co://users",
  {
    title: "List users",
    description: "List of all users on Success.co",
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
      const url = "https://www.success.co/graphql";

      const searchParams = new URLSearchParams(uri.search);
      const first = searchParams.get("first")
        ? parseInt(searchParams.get("first"))
        : undefined;
      const offset = searchParams.get("offset")
        ? parseInt(searchParams.get("offset"))
        : undefined;

      const args =
        first !== undefined || offset !== undefined
          ? `(${[
              first !== undefined ? `first: ${first}` : "",
              offset !== undefined ? `offset: ${offset}` : "",
            ]
              .filter(Boolean)
              .join(", ")})`
          : "";

      const query = `
        query {
          users${args} {
            nodes {
              id
              userName
              firstName
              lastName
              jobTitle
              desc
              avatar
              email
              userPermissionId
              userStatusId
              languageId
              timeZone
              companyId
            }
            totalCount
          }
        }
      `;

      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `API request failed with status ${response.status}: ${errorText}`
        );
      }

      const data = await response.json();

      if (data.errors) {
        throw new Error(`GraphQL errors: ${JSON.stringify(data.errors)}`);
      }

      return {
        contents: data.data.users.nodes.map((user) => ({
          uri: `success-co://users/${user.id}`,
          text: JSON.stringify(user),
        })),
        totalCount: data.data.users.totalCount,
      };
    } catch (error) {
      throw new Error(`Error fetching users: ${error.message}`);
    }
  }
);

// --- HTTP transports ---------------------------------------------------------

const app = express();
app.use(express.json());

// Store transports for each session type
const transports = {
  streamable: {},
  sse: {},
};

// Modern Streamable HTTP endpoint
app.all("/mcp", async (req, res) => {
  let key = req.query.sessionId ? String(req.query.sessionId) : null;

  // If no key, create a new transport and remember it under its own sessionId
  if (!key) {
    const transport = new StreamableHTTPServerTransport();
    transports.streamable[transport.sessionId] = transport;
    await server.connect(transport);
    key = transport.sessionId; // <-- important: use this for the rest of the request
    // You can expose the session id back to the client in a header:
    res.setHeader("x-mcp-session-id", key);
  }

  // Now we must have a key
  const transport = transports.streamable[key];
  if (!transport) {
    res.status(400).send("No transport found for sessionId");
    return;
  }

  try {
    await transport.handleRequest(req, res);
  } finally {
    if (transport.isComplete) {
      delete transports.streamable[transport.sessionId];
    }
  }
});

// Legacy SSE endpoint for older clients
app.get("/sse", async (req, res) => {
  const transport = new SSEServerTransport("/messages", res);
  transports.sse[transport.sessionId] = transport;

  res.on("close", () => {
    delete transports.sse[transport.sessionId];
  });

  await server.connect(transport);
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
// Claude doesn't set CLAUDE_CONVERSATION, so we need to detect it differently
const isRunningInClaude = true;

if (isRunningInClaude) {
  console.error("Detected Claude conversation, initializing STDIO transport");

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
}
