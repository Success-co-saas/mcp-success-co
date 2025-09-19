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
} from "./tools.js";

// Ensure Node 18+ for global fetch.

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const API_KEY_FILE = path.join(__dirname, ".api_key");

// --- Success.co API key management ------------------------------------------

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
  },
  async ({ first, offset }) => {
    return await getTeams({ first, offset });
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
    return await getUsers({ first, offset });
  }
);

// ---------- Todos tool ------------------------------------------------------

server.tool(
  "getTodos",
  "List Success.co todos",
  {
    first: z.number().int().optional().describe("Optional page size"),
    offset: z.number().int().optional().describe("Optional offset"),
  },
  async ({ first, offset }) => {
    return await getTodos({ first, offset });
  }
);

// ---------- Rocks tool ------------------------------------------------------

server.tool(
  "getRocks",
  "List Success.co rocks",
  {
    first: z.number().int().optional().describe("Optional page size"),
    offset: z.number().int().optional().describe("Optional offset"),
  },
  async ({ first, offset }) => {
    return await getRocks({ first, offset });
  }
);

// ---------- Meetings tool ------------------------------------------------------

server.tool(
  "getMeetings",
  "List Success.co meetings",
  {
    first: z.number().int().optional().describe("Optional page size"),
    offset: z.number().int().optional().describe("Optional offset"),
  },
  async ({ first, offset }) => {
    return await getMeetings({ first, offset });
  }
);

// ---------- Issues tool ------------------------------------------------------

server.tool(
  "getIssues",
  "List Success.co issues",
  {
    first: z.number().int().optional().describe("Optional page size"),
    offset: z.number().int().optional().describe("Optional offset"),
  },
  async ({ first, offset }) => {
    return await getIssues({ first, offset });
  }
);

// ---------- Headlines tool ------------------------------------------------------

server.tool(
  "getHeadlines",
  "List Success.co headlines",
  {
    first: z.number().int().optional().describe("Optional page size"),
    offset: z.number().int().optional().describe("Optional offset"),
  },
  async ({ first, offset }) => {
    return await getHeadlines({ first, offset });
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

server.registerResource(
  "Get todos",
  "success-co://todos",
  {
    title: "List todos",
    description: "List of all todos on Success.co",
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
          todos${args} {
            nodes {
              id
              todoStatusId
              name
              desc
              teamId
              userId
              statusUpdatedAt
              type
              dueDate
              priorityNo
              createdAt
              stateId
              companyId
              meetingId
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
        contents: data.data.todos.nodes.map((todo) => ({
          uri: `success-co://todos/${todo.id}`,
          text: JSON.stringify(todo),
        })),
        totalCount: data.data.todos.totalCount,
      };
    } catch (error) {
      throw new Error(`Error fetching todos: ${error.message}`);
    }
  }
);

server.registerResource(
  "Get rocks",
  "success-co://rocks",
  {
    title: "List rocks",
    description: "List of all rocks on Success.co",
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
          rocks${args} {
            nodes {
              id
              rockStatusId
              name
              desc
              statusUpdatedAt
              type
              dueDate
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
        contents: data.data.rocks.nodes.map((rock) => ({
          uri: `success-co://rocks/${rock.id}`,
          text: JSON.stringify(rock),
        })),
        totalCount: data.data.rocks.totalCount,
      };
    } catch (error) {
      throw new Error(`Error fetching rocks: ${error.message}`);
    }
  }
);

server.registerResource(
  "Get meetings",
  "success-co://meetings",
  {
    title: "List meetings",
    description: "List of all meetings on Success.co",
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
          meetings${args} {
            nodes {
              id
              meetingInfoId
              date
              startTime
              endTime
              averageRating
              meetingStatusId
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
        contents: data.data.meetings.nodes.map((meeting) => ({
          uri: `success-co://meetings/${meeting.id}`,
          text: JSON.stringify(meeting),
        })),
        totalCount: data.data.meetings.totalCount,
      };
    } catch (error) {
      throw new Error(`Error fetching meetings: ${error.message}`);
    }
  }
);

server.registerResource(
  "Get issues",
  "success-co://issues",
  {
    title: "List issues",
    description: "List of all issues on Success.co",
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
          issues${args} {
            nodes {
              id
              issueStatusId
              name
              desc
              teamId
              userId
              type
              priorityNo
              priorityOrder
              statusUpdatedAt
              meetingId
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
        contents: data.data.issues.nodes.map((issue) => ({
          uri: `success-co://issues/${issue.id}`,
          text: JSON.stringify(issue),
        })),
        totalCount: data.data.issues.totalCount,
      };
    } catch (error) {
      throw new Error(`Error fetching issues: ${error.message}`);
    }
  }
);

server.registerResource(
  "Get headlines",
  "success-co://headlines",
  {
    title: "List headlines",
    description: "List of all headlines on Success.co",
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
          headlines${args} {
            nodes {
              id
              name
              desc
              userId
              teamId
              headlineStatusId
              statusUpdatedAt
              meetingId
              createdAt
              stateId
              companyId
              isCascadingMessage
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
        contents: data.data.headlines.nodes.map((headline) => ({
          uri: `success-co://headlines/${headline.id}`,
          text: JSON.stringify(headline),
        })),
        totalCount: data.data.headlines.totalCount,
      };
    } catch (error) {
      throw new Error(`Error fetching headlines: ${error.message}`);
    }
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
    },
    async ({ first, offset }) => {
      return await getTeams({ first, offset });
    }
  );

  // Users tool
  freshServer.tool(
    "getUsers",
    "List Success.co users",
    {
      first: z.number().int().optional().describe("Optional page size"),
      offset: z.number().int().optional().describe("Optional offset"),
    },
    async ({ first, offset }) => {
      return await getUsers({ first, offset });
    }
  );

  // Todos tool
  freshServer.tool(
    "getTodos",
    "List Success.co todos",
    {
      first: z.number().int().optional().describe("Optional page size"),
      offset: z.number().int().optional().describe("Optional offset"),
    },
    async ({ first, offset }) => {
      return await getTodos({ first, offset });
    }
  );

  // Rocks tool
  freshServer.tool(
    "getRocks",
    "List Success.co rocks",
    {
      first: z.number().int().optional().describe("Optional page size"),
      offset: z.number().int().optional().describe("Optional offset"),
    },
    async ({ first, offset }) => {
      return await getRocks({ first, offset });
    }
  );

  // Meetings tool
  freshServer.tool(
    "getMeetings",
    "List Success.co meetings",
    {
      first: z.number().int().optional().describe("Optional page size"),
      offset: z.number().int().optional().describe("Optional offset"),
    },
    async ({ first, offset }) => {
      return await getMeetings({ first, offset });
    }
  );

  // Issues tool
  freshServer.tool(
    "getIssues",
    "List Success.co issues",
    {
      first: z.number().int().optional().describe("Optional page size"),
      offset: z.number().int().optional().describe("Optional offset"),
    },
    async ({ first, offset }) => {
      return await getIssues({ first, offset });
    }
  );

  // Headlines tool
  freshServer.tool(
    "getHeadlines",
    "List Success.co headlines",
    {
      first: z.number().int().optional().describe("Optional page size"),
      offset: z.number().int().optional().describe("Optional offset"),
    },
    async ({ first, offset }) => {
      return await getHeadlines({ first, offset });
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

  // Add all resources to the fresh server
  // Teams resource
  freshServer.registerResource(
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

  // Add other resources (users, todos, rocks, meetings, issues, headlines)
  // Users resource
  freshServer.registerResource(
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

  // Add remaining resources (todos, rocks, meetings, issues, headlines) with similar patterns
  // For brevity, I'll add them in a more compact way
  const resourceConfigs = [
    {
      name: "Get todos",
      uri: "success-co://todos",
      title: "List todos",
      description: "List of all todos on Success.co",
      queryTemplate: `
        query {
          todos{ARGS} {
            nodes {
              id
              todoStatusId
              name
              desc
              teamId
              userId
              statusUpdatedAt
              type
              dueDate
              priorityNo
              createdAt
              stateId
              companyId
              meetingId
            }
            totalCount
          }
        }
      `,
      mapper: (todo) => ({
        uri: `success-co://todos/${todo.id}`,
        text: JSON.stringify(todo),
      }),
      dataPath: "data.data.todos",
    },
    {
      name: "Get rocks",
      uri: "success-co://rocks",
      title: "List rocks",
      description: "List of all rocks on Success.co",
      queryTemplate: `
        query {
          rocks{ARGS} {
            nodes {
              id
              rockStatusId
              name
              desc
              statusUpdatedAt
              type
              dueDate
              createdAt
              stateId
              companyId
            }
            totalCount
          }
        }
      `,
      mapper: (rock) => ({
        uri: `success-co://rocks/${rock.id}`,
        text: JSON.stringify(rock),
      }),
      dataPath: "data.data.rocks",
    },
    {
      name: "Get meetings",
      uri: "success-co://meetings",
      title: "List meetings",
      description: "List of all meetings on Success.co",
      queryTemplate: `
        query {
          meetings{ARGS} {
            nodes {
              id
              meetingInfoId
              date
              startTime
              endTime
              averageRating
              meetingStatusId
              createdAt
              stateId
              companyId
            }
            totalCount
          }
        }
      `,
      mapper: (meeting) => ({
        uri: `success-co://meetings/${meeting.id}`,
        text: JSON.stringify(meeting),
      }),
      dataPath: "data.data.meetings",
    },
    {
      name: "Get issues",
      uri: "success-co://issues",
      title: "List issues",
      description: "List of all issues on Success.co",
      queryTemplate: `
        query {
          issues{ARGS} {
            nodes {
              id
              issueStatusId
              name
              desc
              teamId
              userId
              type
              priorityNo
              priorityOrder
              statusUpdatedAt
              meetingId
              createdAt
              stateId
              companyId
            }
            totalCount
          }
        }
      `,
      mapper: (issue) => ({
        uri: `success-co://issues/${issue.id}`,
        text: JSON.stringify(issue),
      }),
      dataPath: "data.data.issues",
    },
    {
      name: "Get headlines",
      uri: "success-co://headlines",
      title: "List headlines",
      description: "List of all headlines on Success.co",
      queryTemplate: `
        query {
          headlines{ARGS} {
            nodes {
              id
              name
              desc
              userId
              teamId
              headlineStatusId
              statusUpdatedAt
              meetingId
              createdAt
              stateId
              companyId
              isCascadingMessage
            }
            totalCount
          }
        }
      `,
      mapper: (headline) => ({
        uri: `success-co://headlines/${headline.id}`,
        text: JSON.stringify(headline),
      }),
      dataPath: "data.data.headlines",
    },
  ];

  // Register all resources
  resourceConfigs.forEach((config) => {
    freshServer.registerResource(
      config.name,
      config.uri,
      {
        title: config.title,
        description: config.description,
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

          const query = config.queryTemplate.replace("{ARGS}", args);

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

          // Parse the data path and access the data safely
          const pathParts = config.dataPath.split(".");
          let resourceData = data;
          for (const part of pathParts) {
            resourceData = resourceData[part];
          }

          return {
            contents: resourceData.nodes.map(config.mapper),
            totalCount: resourceData.totalCount,
          };
        } catch (error) {
          throw new Error(
            `Error fetching ${config.name.toLowerCase()}: ${error.message}`
          );
        }
      }
    );
  });

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
      const resources = [
        {
          uri: "success-co://teams",
          name: "Get teams",
          description: "List of all teams setup on Success.co",
          mimeType: "application/json",
        },
        {
          uri: "success-co://users",
          name: "Get users",
          description: "List of all users on Success.co",
          mimeType: "application/json",
        },
        {
          uri: "success-co://todos",
          name: "Get todos",
          description: "List of all todos on Success.co",
          mimeType: "application/json",
        },
        {
          uri: "success-co://rocks",
          name: "Get rocks",
          description: "List of all rocks on Success.co",
          mimeType: "application/json",
        },
        {
          uri: "success-co://meetings",
          name: "Get meetings",
          description: "List of all meetings on Success.co",
          mimeType: "application/json",
        },
        {
          uri: "success-co://issues",
          name: "Get issues",
          description: "List of all issues on Success.co",
          mimeType: "application/json",
        },
        {
          uri: "success-co://headlines",
          name: "Get headlines",
          description: "List of all headlines on Success.co",
          mimeType: "application/json",
        },
      ];

      const response = {
        jsonrpc: "2.0",
        id: mcpRequest.id,
        result: {
          resources: resources,
        },
      };
      console.error(`[MCP] Sending resources/list response:`, response);
      res.json(response);
      return;
    }

    // Handle resources/read request
    if (mcpRequest.method === "resources/read") {
      const { uri } = mcpRequest.params;
      console.error(`[MCP] Resource read request for URI: ${uri}`);

      const apiKey = getSuccessCoApiKey();
      if (!apiKey) {
        res.status(400).json({
          jsonrpc: "2.0",
          id: mcpRequest.id,
          error: {
            code: -32602,
            message:
              "Success.co API key not set. Use setSuccessCoApiKey first.",
          },
        });
        return;
      }

      try {
        // Parse the URI to determine which resource to fetch
        const url = new URL(uri);
        const resourceType = url.pathname.split("/")[1]; // e.g., "teams", "users", etc.

        let query = "";
        let dataPath = "";

        switch (resourceType) {
          case "teams":
            query = `
              query {
                teams {
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
            dataPath = "data.teams";
            break;
          case "users":
            query = `
              query {
                users {
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
            dataPath = "data.users";
            break;
          case "todos":
            query = `
              query {
                todos {
                  nodes {
                    id
                    todoStatusId
                    name
                    desc
                    teamId
                    userId
                    statusUpdatedAt
                    type
                    dueDate
                    priorityNo
                    createdAt
                    stateId
                    companyId
                    meetingId
                  }
                  totalCount
                }
              }
            `;
            dataPath = "data.todos";
            break;
          case "rocks":
            query = `
              query {
                rocks {
                  nodes {
                    id
                    rockStatusId
                    name
                    desc
                    statusUpdatedAt
                    type
                    dueDate
                    createdAt
                    stateId
                    companyId
                  }
                  totalCount
                }
              }
            `;
            dataPath = "data.rocks";
            break;
          case "meetings":
            query = `
              query {
                meetings {
                  nodes {
                    id
                    meetingInfoId
                    date
                    startTime
                    endTime
                    averageRating
                    meetingStatusId
                    createdAt
                    stateId
                    companyId
                  }
                  totalCount
                }
              }
            `;
            dataPath = "data.meetings";
            break;
          case "issues":
            query = `
              query {
                issues {
                  nodes {
                    id
                    issueStatusId
                    name
                    desc
                    teamId
                    userId
                    type
                    priorityNo
                    priorityOrder
                    statusUpdatedAt
                    meetingId
                    createdAt
                    stateId
                    companyId
                  }
                  totalCount
                }
              }
            `;
            dataPath = "data.issues";
            break;
          case "headlines":
            query = `
              query {
                headlines {
                  nodes {
                    id
                    name
                    desc
                    userId
                    teamId
                    headlineStatusId
                    statusUpdatedAt
                    meetingId
                    createdAt
                    stateId
                    companyId
                    isCascadingMessage
                  }
                  totalCount
                }
              }
            `;
            dataPath = "data.headlines";
            break;
          default:
            res.status(400).json({
              jsonrpc: "2.0",
              id: mcpRequest.id,
              error: {
                code: -32602,
                message: `Unknown resource type: ${resourceType}`,
              },
            });
            return;
        }

        // Make the GraphQL request
        const response = await fetch("https://www.success.co/graphql", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ query }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          res.status(500).json({
            jsonrpc: "2.0",
            id: mcpRequest.id,
            error: {
              code: -32603,
              message: `API request failed with status ${response.status}: ${errorText}`,
            },
          });
          return;
        }

        const data = await response.json();

        if (data.errors) {
          res.status(500).json({
            jsonrpc: "2.0",
            id: mcpRequest.id,
            error: {
              code: -32603,
              message: `GraphQL errors: ${JSON.stringify(data.errors)}`,
            },
          });
          return;
        }

        // Parse the data path and access the data safely
        const pathParts = dataPath.split(".");
        let resourceData = data;
        for (const part of pathParts) {
          resourceData = resourceData[part];
        }

        const result = {
          jsonrpc: "2.0",
          id: mcpRequest.id,
          result: {
            contents: resourceData.nodes.map((item) => ({
              uri: `${uri}/${item.id}`,
              mimeType: "application/json",
              text: JSON.stringify(item),
            })),
          },
        };

        console.error(`[MCP] Sending resources/read response:`, result);
        res.json(result);
      } catch (error) {
        console.error(`[MCP] Resource read error:`, error);
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
