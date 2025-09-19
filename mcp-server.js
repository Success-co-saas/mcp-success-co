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
} from "./tools.js";

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
            totalCount: data.data.headlines.totalCount,
            results: data.data.headlines.nodes.map((headline) => ({
              id: headline.id,
              name: headline.name,
              description: headline.desc || "",
              status: headline.headlineStatusId,
              teamId: headline.teamId,
              userId: headline.userId,
              meetingId: headline.meetingId,
              isCascadingMessage: headline.isCascadingMessage,
              createdAt: headline.createdAt,
              statusUpdatedAt: headline.statusUpdatedAt,
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
  "Search Success.co data (supports: teams, users, todos, rocks, meetings, issues, headlines).",
  {
    query: z
      .string()
      .describe(
        "What to look up, e.g., 'list my teams', 'show users', 'find todos', 'get meetings'"
      ),
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

    const wantsTodos =
      /\b(todo|todos|task|tasks|to-do|to-dos)\b/.test(q) ||
      /list.*todo/.test(q) ||
      /show.*todo/.test(q) ||
      /find.*todo/.test(q) ||
      /get.*todo/.test(q);

    const wantsRocks =
      /\b(rock|rocks|priority|priorities)\b/.test(q) ||
      /list.*rock/.test(q) ||
      /show.*rock/.test(q) ||
      /find.*rock/.test(q) ||
      /get.*rock/.test(q);

    const wantsMeetings =
      /\b(meeting|meetings|session|sessions)\b/.test(q) ||
      /list.*meeting/.test(q) ||
      /show.*meeting/.test(q) ||
      /find.*meeting/.test(q) ||
      /get.*meeting/.test(q);

    const wantsIssues =
      /\b(issue|issues|problem|problems|concern|concerns)\b/.test(q) ||
      /list.*issue/.test(q) ||
      /show.*issue/.test(q) ||
      /find.*issue/.test(q) ||
      /get.*issue/.test(q);

    const wantsHeadlines =
      /\b(headline|headlines|news|update|updates|announcement|announcements)\b/.test(
        q
      ) ||
      /list.*headline/.test(q) ||
      /show.*headline/.test(q) ||
      /find.*headline/.test(q) ||
      /get.*headline/.test(q);

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

    if (wantsTodos) {
      const gql = `
        query {
          todos {
          nodes {
            id
            name
            desc
              type
              priorityNo
              dueDate
          }
          totalCount
        }
      }
    `;
      const result = await callSuccessCoGraphQL(gql);
      if (!result.ok)
        return { content: [{ type: "text", text: result.error }] };

      const { data } = result;
      const hits = (data?.data?.todos?.nodes || []).map((t) => ({
        id: String(t.id), // REQUIRED by ChatGPT's fetch contract
        title: t.name ?? String(t.id),
        snippet:
          `${t.type || ""} ${t.desc || ""}`.trim() ||
          `Priority: ${t.priorityNo}`,
        // optional extras are fine, but keep required ones present
      }));

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              kind: "todos",
              totalCount: data?.data?.todos?.totalCount ?? hits.length,
              hits,
            }),
          },
        ],
      };
    }

    if (wantsRocks) {
      const gql = `
        query {
          rocks {
            nodes {
              id
              name
              desc
              type
              dueDate
            }
            totalCount
          }
        }
      `;
      const result = await callSuccessCoGraphQL(gql);
      if (!result.ok)
        return { content: [{ type: "text", text: result.error }] };

      const { data } = result;
      const hits = (data?.data?.rocks?.nodes || []).map((r) => ({
        id: String(r.id), // REQUIRED by ChatGPT's fetch contract
        title: r.name ?? String(r.id),
        snippet:
          `${r.type || ""} ${r.desc || ""}`.trim() || `Due: ${r.dueDate}`,
        // optional extras are fine, but keep required ones present
      }));

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              kind: "rocks",
              totalCount: data?.data?.rocks?.totalCount ?? hits.length,
              hits,
            }),
          },
        ],
      };
    }

    if (wantsMeetings) {
      const gql = `
        query {
          meetings {
            nodes {
              id
              date
              startTime
              endTime
              averageRating
            }
            totalCount
          }
        }
      `;
      const result = await callSuccessCoGraphQL(gql);
      if (!result.ok)
        return { content: [{ type: "text", text: result.error }] };

      const { data } = result;
      const hits = (data?.data?.meetings?.nodes || []).map((m) => ({
        id: String(m.id), // REQUIRED by ChatGPT's fetch contract
        title: `Meeting on ${m.date}`,
        snippet: `${m.startTime || ""} - ${m.endTime || ""} (Rating: ${
          m.averageRating || "N/A"
        })`,
        // optional extras are fine, but keep required ones present
      }));

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              kind: "meetings",
              totalCount: data?.data?.meetings?.totalCount ?? hits.length,
              hits,
            }),
          },
        ],
      };
    }

    if (wantsIssues) {
      const gql = `
        query {
          issues {
            nodes {
              id
              name
              desc
              type
              priorityNo
            }
            totalCount
          }
        }
      `;
      const result = await callSuccessCoGraphQL(gql);
      if (!result.ok)
        return { content: [{ type: "text", text: result.error }] };

      const { data } = result;
      const hits = (data?.data?.issues?.nodes || []).map((i) => ({
        id: String(i.id), // REQUIRED by ChatGPT's fetch contract
        title: i.name ?? String(i.id),
        snippet:
          `${i.type || ""} ${i.desc || ""}`.trim() ||
          `Priority: ${i.priorityNo}`,
        // optional extras are fine, but keep required ones present
      }));

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              kind: "issues",
              totalCount: data?.data?.issues?.totalCount ?? hits.length,
              hits,
            }),
          },
        ],
      };
    }

    if (wantsHeadlines) {
      const gql = `
        query {
          headlines {
            nodes {
              id
              name
              desc
              headlineStatusId
            }
            totalCount
          }
        }
      `;
      const result = await callSuccessCoGraphQL(gql);
      if (!result.ok)
        return { content: [{ type: "text", text: result.error }] };

      const { data } = result;
      const hits = (data?.data?.headlines?.nodes || []).map((h) => ({
        id: String(h.id), // REQUIRED by ChatGPT's fetch contract
        title: h.name ?? String(h.id),
        snippet: h.desc || `Status: ${h.headlineStatusId}`,
        // optional extras are fine, but keep required ones present
      }));

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              kind: "headlines",
              totalCount: data?.data?.headlines?.totalCount ?? hits.length,
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
          text: "I support searching for: teams, users, todos, rocks, meetings, issues, headlines. Try: 'List my teams', 'Show users', 'Find todos', 'Get meetings', etc.",
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
    // Accept both raw ids like "123" and URIs like "success-co://teams/123", "success-co://users/123", etc.
    const teamMatch = /^success-co:\/\/teams\/(.+)$/.exec(id);
    const userMatch = /^success-co:\/\/users\/(.+)$/.exec(id);
    const todoMatch = /^success-co:\/\/todos\/(.+)$/.exec(id);
    const rockMatch = /^success-co:\/\/rocks\/(.+)$/.exec(id);
    const meetingMatch = /^success-co:\/\/meetings\/(.+)$/.exec(id);
    const issueMatch = /^success-co:\/\/issues\/(.+)$/.exec(id);
    const headlineMatch = /^success-co:\/\/headlines\/(.+)$/.exec(id);

    const teamId = teamMatch ? teamMatch[1] : null;
    const userId = userMatch ? userMatch[1] : null;
    const todoId = todoMatch ? todoMatch[1] : null;
    const rockId = rockMatch ? rockMatch[1] : null;
    const meetingId = meetingMatch ? meetingMatch[1] : null;
    const issueId = issueMatch ? issueMatch[1] : null;
    const headlineId = headlineMatch ? headlineMatch[1] : null;
    const rawId =
      teamId ||
      userId ||
      todoId ||
      rockId ||
      meetingId ||
      issueId ||
      headlineId ||
      id;

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

    // Helper function to make GraphQL requests
    const makeGraphQLRequest = async (query, variables = {}) => {
      const url = "https://www.success.co/graphql";
      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query, variables }),
      });

      if (response.ok) {
        const data = await response.json();
        if (!data.errors) {
          return data;
        }
      }
      return null;
    };

    // Try to fetch as team
    if (
      teamId ||
      (!userId &&
        !todoId &&
        !rockId &&
        !meetingId &&
        !issueId &&
        !headlineId &&
        !teamMatch &&
        !userMatch &&
        !todoMatch &&
        !rockMatch &&
        !meetingMatch &&
        !issueMatch &&
        !headlineMatch)
    ) {
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

      const result = await makeGraphQLRequest(gql, { id: rawId });
      if (result?.data?.team) {
        return {
          content: [{ type: "text", text: JSON.stringify(result.data.team) }],
        };
      }
    }

    // Try to fetch as user
    if (
      userId ||
      (!teamId &&
        !todoId &&
        !rockId &&
        !meetingId &&
        !issueId &&
        !headlineId &&
        !teamMatch &&
        !userMatch &&
        !todoMatch &&
        !rockMatch &&
        !meetingMatch &&
        !issueMatch &&
        !headlineMatch)
    ) {
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

      const result = await makeGraphQLRequest(gql, { id: rawId });
      if (result?.data?.user) {
        return {
          content: [{ type: "text", text: JSON.stringify(result.data.user) }],
        };
      }
    }

    // Try to fetch as todo
    if (
      todoId ||
      (!teamId &&
        !userId &&
        !rockId &&
        !meetingId &&
        !issueId &&
        !headlineId &&
        !teamMatch &&
        !userMatch &&
        !todoMatch &&
        !rockMatch &&
        !meetingMatch &&
        !issueMatch &&
        !headlineMatch)
    ) {
      const gql = `
        query ($id: ID!) {
          todo(id: $id) {
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
        }
      `;

      const result = await makeGraphQLRequest(gql, { id: rawId });
      if (result?.data?.todo) {
        return {
          content: [{ type: "text", text: JSON.stringify(result.data.todo) }],
        };
      }
    }

    // Try to fetch as rock
    if (
      rockId ||
      (!teamId &&
        !userId &&
        !todoId &&
        !meetingId &&
        !issueId &&
        !headlineId &&
        !teamMatch &&
        !userMatch &&
        !todoMatch &&
        !rockMatch &&
        !meetingMatch &&
        !issueMatch &&
        !headlineMatch)
    ) {
      const gql = `
        query ($id: ID!) {
          rock(id: $id) {
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
        }
      `;

      const result = await makeGraphQLRequest(gql, { id: rawId });
      if (result?.data?.rock) {
        return {
          content: [{ type: "text", text: JSON.stringify(result.data.rock) }],
        };
      }
    }

    // Try to fetch as meeting
    if (
      meetingId ||
      (!teamId &&
        !userId &&
        !todoId &&
        !rockId &&
        !issueId &&
        !headlineId &&
        !teamMatch &&
        !userMatch &&
        !todoMatch &&
        !rockMatch &&
        !meetingMatch &&
        !issueMatch &&
        !headlineMatch)
    ) {
      const gql = `
        query ($id: ID!) {
          meeting(id: $id) {
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
        }
      `;

      const result = await makeGraphQLRequest(gql, { id: rawId });
      if (result?.data?.meeting) {
        return {
          content: [
            { type: "text", text: JSON.stringify(result.data.meeting) },
          ],
        };
      }
    }

    // Try to fetch as issue
    if (
      issueId ||
      (!teamId &&
        !userId &&
        !todoId &&
        !rockId &&
        !meetingId &&
        !headlineId &&
        !teamMatch &&
        !userMatch &&
        !todoMatch &&
        !rockMatch &&
        !meetingMatch &&
        !issueMatch &&
        !headlineMatch)
    ) {
      const gql = `
        query ($id: ID!) {
          issue(id: $id) {
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
        }
      `;

      const result = await makeGraphQLRequest(gql, { id: rawId });
      if (result?.data?.issue) {
        return {
          content: [{ type: "text", text: JSON.stringify(result.data.issue) }],
        };
      }
    }

    // Try to fetch as headline
    if (
      headlineId ||
      (!teamId &&
        !userId &&
        !todoId &&
        !rockId &&
        !meetingId &&
        !issueId &&
        !teamMatch &&
        !userMatch &&
        !todoMatch &&
        !rockMatch &&
        !meetingMatch &&
        !issueMatch &&
        !headlineMatch)
    ) {
      const gql = `
        query ($id: ID!) {
          headline(id: $id) {
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
        }
      `;

      const result = await makeGraphQLRequest(gql, { id: rawId });
      if (result?.data?.headline) {
        return {
          content: [
            { type: "text", text: JSON.stringify(result.data.headline) },
          ],
        };
      }
    }

    // If none worked, return error
    return {
      content: [
        {
          type: "text",
          text: `No team, user, todo, rock, meeting, issue, or headline found for id ${rawId}`,
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
  freshServer.tool(
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
              totalCount: data.data.headlines.totalCount,
              results: data.data.headlines.nodes.map((headline) => ({
                id: headline.id,
                name: headline.name,
                description: headline.desc || "",
                status: headline.headlineStatusId,
                teamId: headline.teamId,
                userId: headline.userId,
                meetingId: headline.meetingId,
                isCascadingMessage: headline.isCascadingMessage,
                createdAt: headline.createdAt,
                statusUpdatedAt: headline.statusUpdatedAt,
              })),
            }),
          },
        ],
      };
    }
  );

  // Search tool
  freshServer.tool(
    "search",
    "Search Success.co data (supports: teams, users, todos, rocks, meetings, issues, headlines).",
    {
      query: z
        .string()
        .describe(
          "What to look up, e.g., 'list my teams', 'show users', 'find todos', 'get meetings'"
        ),
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

      const wantsTodos =
        /\b(todo|todos|task|tasks|to-do|to-dos)\b/.test(q) ||
        /list.*todo/.test(q) ||
        /show.*todo/.test(q) ||
        /find.*todo/.test(q) ||
        /get.*todo/.test(q);

      const wantsRocks =
        /\b(rock|rocks|priority|priorities)\b/.test(q) ||
        /list.*rock/.test(q) ||
        /show.*rock/.test(q) ||
        /find.*rock/.test(q) ||
        /get.*rock/.test(q);

      const wantsMeetings =
        /\b(meeting|meetings|session|sessions)\b/.test(q) ||
        /list.*meeting/.test(q) ||
        /show.*meeting/.test(q) ||
        /find.*meeting/.test(q) ||
        /get.*meeting/.test(q);

      const wantsIssues =
        /\b(issue|issues|problem|problems|concern|concerns)\b/.test(q) ||
        /list.*issue/.test(q) ||
        /show.*issue/.test(q) ||
        /find.*issue/.test(q) ||
        /get.*issue/.test(q);

      const wantsHeadlines =
        /\b(headline|headlines|news|update|updates|announcement|announcements)\b/.test(
          q
        ) ||
        /list.*headline/.test(q) ||
        /show.*headline/.test(q) ||
        /find.*headline/.test(q) ||
        /get.*headline/.test(q);

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
          id: String(t.id),
          title: t.name ?? String(t.id),
          snippet: t.desc || "",
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
          id: String(u.id),
          title: `${u.firstName} ${u.lastName}`,
          snippet: `${u.jobTitle || ""} ${u.desc || ""}`.trim() || u.email,
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

      if (wantsTodos) {
        const gql = `
          query {
            todos {
            nodes {
              id
              name
              desc
                type
                priorityNo
                dueDate
            }
            totalCount
          }
        }
      `;
        const result = await callSuccessCoGraphQL(gql);
        if (!result.ok)
          return { content: [{ type: "text", text: result.error }] };

        const { data } = result;
        const hits = (data?.data?.todos?.nodes || []).map((t) => ({
          id: String(t.id),
          title: t.name ?? String(t.id),
          snippet:
            `${t.type || ""} ${t.desc || ""}`.trim() ||
            `Priority: ${t.priorityNo}`,
        }));

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                kind: "todos",
                totalCount: data?.data?.todos?.totalCount ?? hits.length,
                hits,
              }),
            },
          ],
        };
      }

      if (wantsRocks) {
        const gql = `
          query {
            rocks {
              nodes {
                id
                name
                desc
                type
                dueDate
              }
              totalCount
            }
          }
        `;
        const result = await callSuccessCoGraphQL(gql);
        if (!result.ok)
          return { content: [{ type: "text", text: result.error }] };

        const { data } = result;
        const hits = (data?.data?.rocks?.nodes || []).map((r) => ({
          id: String(r.id),
          title: r.name ?? String(r.id),
          snippet:
            `${r.type || ""} ${r.desc || ""}`.trim() || `Due: ${r.dueDate}`,
        }));

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                kind: "rocks",
                totalCount: data?.data?.rocks?.totalCount ?? hits.length,
                hits,
              }),
            },
          ],
        };
      }

      if (wantsMeetings) {
        const gql = `
          query {
            meetings {
              nodes {
                id
                date
                startTime
                endTime
                averageRating
              }
              totalCount
            }
          }
        `;
        const result = await callSuccessCoGraphQL(gql);
        if (!result.ok)
          return { content: [{ type: "text", text: result.error }] };

        const { data } = result;
        const hits = (data?.data?.meetings?.nodes || []).map((m) => ({
          id: String(m.id),
          title: `Meeting on ${m.date}`,
          snippet: `${m.startTime || ""} - ${m.endTime || ""} (Rating: ${
            m.averageRating || "N/A"
          })`,
        }));

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                kind: "meetings",
                totalCount: data?.data?.meetings?.totalCount ?? hits.length,
                hits,
              }),
            },
          ],
        };
      }

      if (wantsIssues) {
        const gql = `
          query {
            issues {
              nodes {
                id
                name
                desc
                type
                priorityNo
              }
              totalCount
            }
          }
        `;
        const result = await callSuccessCoGraphQL(gql);
        if (!result.ok)
          return { content: [{ type: "text", text: result.error }] };

        const { data } = result;
        const hits = (data?.data?.issues?.nodes || []).map((i) => ({
          id: String(i.id),
          title: i.name ?? String(i.id),
          snippet:
            `${i.type || ""} ${i.desc || ""}`.trim() ||
            `Priority: ${i.priorityNo}`,
        }));

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                kind: "issues",
                totalCount: data?.data?.issues?.totalCount ?? hits.length,
                hits,
              }),
            },
          ],
        };
      }

      if (wantsHeadlines) {
        const gql = `
          query {
            headlines {
              nodes {
                id
                name
                desc
                headlineStatusId
              }
              totalCount
            }
          }
        `;
        const result = await callSuccessCoGraphQL(gql);
        if (!result.ok)
          return { content: [{ type: "text", text: result.error }] };

        const { data } = result;
        const hits = (data?.data?.headlines?.nodes || []).map((h) => ({
          id: String(h.id),
          title: h.name ?? String(h.id),
          snippet: h.desc || `Status: ${h.headlineStatusId}`,
        }));

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                kind: "headlines",
                totalCount: data?.data?.headlines?.totalCount ?? hits.length,
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
            text: "I support searching for: teams, users, todos, rocks, meetings, issues, headlines. Try: 'List my teams', 'Show users', 'Find todos', 'Get meetings', etc.",
          },
        ],
      };
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
      // Accept both raw ids like "123" and URIs like "success-co://teams/123", "success-co://users/123", etc.
      const teamMatch = /^success-co:\/\/teams\/(.+)$/.exec(id);
      const userMatch = /^success-co:\/\/users\/(.+)$/.exec(id);
      const todoMatch = /^success-co:\/\/todos\/(.+)$/.exec(id);
      const rockMatch = /^success-co:\/\/rocks\/(.+)$/.exec(id);
      const meetingMatch = /^success-co:\/\/meetings\/(.+)$/.exec(id);
      const issueMatch = /^success-co:\/\/issues\/(.+)$/.exec(id);
      const headlineMatch = /^success-co:\/\/headlines\/(.+)$/.exec(id);

      const teamId = teamMatch ? teamMatch[1] : null;
      const userId = userMatch ? userMatch[1] : null;
      const todoId = todoMatch ? todoMatch[1] : null;
      const rockId = rockMatch ? rockMatch[1] : null;
      const meetingId = meetingMatch ? meetingMatch[1] : null;
      const issueId = issueMatch ? issueMatch[1] : null;
      const headlineId = headlineMatch ? headlineMatch[1] : null;
      const rawId =
        teamId ||
        userId ||
        todoId ||
        rockId ||
        meetingId ||
        issueId ||
        headlineId ||
        id;

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

      // Helper function to make GraphQL requests
      const makeGraphQLRequest = async (query, variables = {}) => {
        const url = "https://www.success.co/graphql";
        const response = await fetch(url, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ query, variables }),
        });

        if (response.ok) {
          const data = await response.json();
          if (!data.errors) {
            return data;
          }
        }
        return null;
      };

      // Try to fetch as team
      if (
        teamId ||
        (!userId &&
          !todoId &&
          !rockId &&
          !meetingId &&
          !issueId &&
          !headlineId &&
          !teamMatch &&
          !userMatch &&
          !todoMatch &&
          !rockMatch &&
          !meetingMatch &&
          !issueMatch &&
          !headlineMatch)
      ) {
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

        const result = await makeGraphQLRequest(gql, { id: rawId });
        if (result?.data?.team) {
          return {
            content: [{ type: "text", text: JSON.stringify(result.data.team) }],
          };
        }
      }

      // Try to fetch as user
      if (
        userId ||
        (!teamId &&
          !todoId &&
          !rockId &&
          !meetingId &&
          !issueId &&
          !headlineId &&
          !teamMatch &&
          !userMatch &&
          !todoMatch &&
          !rockMatch &&
          !meetingMatch &&
          !issueMatch &&
          !headlineMatch)
      ) {
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

        const result = await makeGraphQLRequest(gql, { id: rawId });
        if (result?.data?.user) {
          return {
            content: [{ type: "text", text: JSON.stringify(result.data.user) }],
          };
        }
      }

      // Try to fetch as todo
      if (
        todoId ||
        (!teamId &&
          !userId &&
          !rockId &&
          !meetingId &&
          !issueId &&
          !headlineId &&
          !teamMatch &&
          !userMatch &&
          !todoMatch &&
          !rockMatch &&
          !meetingMatch &&
          !issueMatch &&
          !headlineMatch)
      ) {
        const gql = `
          query ($id: ID!) {
            todo(id: $id) {
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
          }
        `;

        const result = await makeGraphQLRequest(gql, { id: rawId });
        if (result?.data?.todo) {
          return {
            content: [{ type: "text", text: JSON.stringify(result.data.todo) }],
          };
        }
      }

      // Try to fetch as rock
      if (
        rockId ||
        (!teamId &&
          !userId &&
          !todoId &&
          !meetingId &&
          !issueId &&
          !headlineId &&
          !teamMatch &&
          !userMatch &&
          !todoMatch &&
          !rockMatch &&
          !meetingMatch &&
          !issueMatch &&
          !headlineMatch)
      ) {
        const gql = `
          query ($id: ID!) {
            rock(id: $id) {
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
          }
        `;

        const result = await makeGraphQLRequest(gql, { id: rawId });
        if (result?.data?.rock) {
          return {
            content: [{ type: "text", text: JSON.stringify(result.data.rock) }],
          };
        }
      }

      // Try to fetch as meeting
      if (
        meetingId ||
        (!teamId &&
          !userId &&
          !todoId &&
          !rockId &&
          !issueId &&
          !headlineId &&
          !teamMatch &&
          !userMatch &&
          !todoMatch &&
          !rockMatch &&
          !meetingMatch &&
          !issueMatch &&
          !headlineMatch)
      ) {
        const gql = `
          query ($id: ID!) {
            meeting(id: $id) {
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
          }
        `;

        const result = await makeGraphQLRequest(gql, { id: rawId });
        if (result?.data?.meeting) {
          return {
            content: [
              { type: "text", text: JSON.stringify(result.data.meeting) },
            ],
          };
        }
      }

      // Try to fetch as issue
      if (
        issueId ||
        (!teamId &&
          !userId &&
          !todoId &&
          !rockId &&
          !meetingId &&
          !headlineId &&
          !teamMatch &&
          !userMatch &&
          !todoMatch &&
          !rockMatch &&
          !meetingMatch &&
          !issueMatch &&
          !headlineMatch)
      ) {
        const gql = `
          query ($id: ID!) {
            issue(id: $id) {
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
          }
        `;

        const result = await makeGraphQLRequest(gql, { id: rawId });
        if (result?.data?.issue) {
          return {
            content: [
              { type: "text", text: JSON.stringify(result.data.issue) },
            ],
          };
        }
      }

      // Try to fetch as headline
      if (
        headlineId ||
        (!teamId &&
          !userId &&
          !todoId &&
          !rockId &&
          !meetingId &&
          !issueId &&
          !teamMatch &&
          !userMatch &&
          !todoMatch &&
          !rockMatch &&
          !meetingMatch &&
          !issueMatch &&
          !headlineMatch)
      ) {
        const gql = `
          query ($id: ID!) {
            headline(id: $id) {
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
          }
        `;

        const result = await makeGraphQLRequest(gql, { id: rawId });
        if (result?.data?.headline) {
          return {
            content: [
              { type: "text", text: JSON.stringify(result.data.headline) },
            ],
          };
        }
      }

      // If none worked, return error
      return {
        content: [
          {
            type: "text",
            text: `No team, user, todo, rock, meeting, issue, or headline found for id ${rawId}`,
          },
        ],
      };
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
        const stored = storeSuccessCoApiKey(args.apiKey);
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
      },
      getSuccessCoApiKey: async () => {
        const apiKey = getSuccessCoApiKey();
        return {
          content: [
            {
              type: "text",
              text: apiKey || "Success.co API key not set",
            },
          ],
        };
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
        const { first, offset } = args;
        const argsStr =
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
            headlines${argsStr} {
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
                totalCount: data.data.headlines.totalCount,
                results: data.data.headlines.nodes.map((headline) => ({
                  id: headline.id,
                  name: headline.name,
                  description: headline.desc || "",
                  status: headline.headlineStatusId,
                  teamId: headline.teamId,
                  userId: headline.userId,
                  meetingId: headline.meetingId,
                  isCascadingMessage: headline.isCascadingMessage,
                  createdAt: headline.createdAt,
                  statusUpdatedAt: headline.statusUpdatedAt,
                })),
              }),
            },
          ],
        };
      },
      search: async (args) => {
        const { query } = args;
        const q = (query || "").toLowerCase();

        const wantsTeams =
          /\b(team|teams|my team|my teams)\b/.test(q) ||
          /list.*team/.test(q) ||
          /show.*team/.test(q);

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
            id: String(t.id),
            title: t.name ?? String(t.id),
            snippet: t.desc || "",
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

        return {
          content: [
            {
              type: "text",
              text: "I support searching for: teams, users, todos, rocks, meetings, issues, headlines. Try: 'List my teams', 'Show users', 'Find todos', 'Get meetings', etc.",
            },
          ],
        };
      },
      fetch: async (args) => {
        const { id } = args;
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

        // Helper function to make GraphQL requests
        const makeGraphQLRequest = async (query, variables = {}) => {
          const url = "https://www.success.co/graphql";
          const response = await fetch(url, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${apiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ query, variables }),
          });

          if (response.ok) {
            const data = await response.json();
            if (!data.errors) {
              return data;
            }
          }
          return null;
        };

        // Try to fetch as team first
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

        const result = await makeGraphQLRequest(gql, { id });
        if (result?.data?.team) {
          return {
            content: [{ type: "text", text: JSON.stringify(result.data.team) }],
          };
        }

        // If none worked, return error
        return {
          content: [
            {
              type: "text",
              text: `No item found for id ${id}`,
            },
          ],
        };
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
