// Success.co MCP Server Tools
// This file contains the tool function implementations

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

/**
 * Calls the Success.co GraphQL API
 * @param {string} query - The GraphQL query string
 * @returns {Promise<{ok: boolean, data?: any, error?: string}>}
 */
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
    return {
      ok: false,
      error: `HTTP error! status: ${response.status}`,
    };
  }

  const data = await response.json();
  return { ok: true, data };
}

/**
 * Gets Success.co API key from environment or file
 * @returns {string|null}
 */
function getSuccessCoApiKey() {
  if (process.env.SUCCESS_CO_API_KEY) return process.env.SUCCESS_CO_API_KEY;

  try {
    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    const API_KEY_FILE = path.join(__dirname, ".api_key");

    if (fs.existsSync(API_KEY_FILE)) {
      return fs.readFileSync(API_KEY_FILE, "utf8").trim();
    }
  } catch (error) {
    // Ignore file read errors
  }

  return null;
}

/**
 * List Success.co teams
 * @param {Object} args - Arguments object
 * @param {number} [args.first] - Optional page size
 * @param {number} [args.offset] - Optional offset
 * @returns {Promise<{content: Array<{type: string, text: string}>}>}
 */
export async function getTeams(args) {
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
      teams${argsStr} {
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

/**
 * List Success.co users
 * @param {Object} args - Arguments object
 * @param {number} [args.first] - Optional page size
 * @param {number} [args.offset] - Optional offset
 * @returns {Promise<{content: Array<{type: string, text: string}>}>}
 */
export async function getUsers(args) {
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
      users${argsStr} {
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

/**
 * List Success.co todos
 * @param {Object} args - Arguments object
 * @param {number} [args.first] - Optional page size
 * @param {number} [args.offset] - Optional offset
 * @returns {Promise<{content: Array<{type: string, text: string}>}>}
 */
export async function getTodos(args) {
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
      todos${argsStr} {
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
          totalCount: data.data.todos.totalCount,
          results: data.data.todos.nodes.map((todo) => ({
            id: todo.id,
            name: todo.name,
            description: todo.desc || "",
            status: todo.todoStatusId,
            type: todo.type,
            priority: todo.priorityNo,
            dueDate: todo.dueDate,
            teamId: todo.teamId,
            userId: todo.userId,
            meetingId: todo.meetingId,
            createdAt: todo.createdAt,
            statusUpdatedAt: todo.statusUpdatedAt,
          })),
        }),
      },
    ],
  };
}

/**
 * List Success.co rocks
 * @param {Object} args - Arguments object
 * @param {number} [args.first] - Optional page size
 * @param {number} [args.offset] - Optional offset
 * @returns {Promise<{content: Array<{type: string, text: string}>}>}
 */
export async function getRocks(args) {
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
      rocks${argsStr} {
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
          totalCount: data.data.rocks.totalCount,
          results: data.data.rocks.nodes.map((rock) => ({
            id: rock.id,
            name: rock.name,
            description: rock.desc || "",
            status: rock.rockStatusId,
            type: rock.type,
            dueDate: rock.dueDate,
            createdAt: rock.createdAt,
            statusUpdatedAt: rock.statusUpdatedAt,
          })),
        }),
      },
    ],
  };
}

/**
 * List Success.co meetings
 * @param {Object} args - Arguments object
 * @param {number} [args.first] - Optional page size
 * @param {number} [args.offset] - Optional offset
 * @returns {Promise<{content: Array<{type: string, text: string}>}>}
 */
export async function getMeetings(args) {
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
      meetings${argsStr} {
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
          totalCount: data.data.meetings.totalCount,
          results: data.data.meetings.nodes.map((meeting) => ({
            id: meeting.id,
            meetingInfoId: meeting.meetingInfoId,
            date: meeting.date,
            startTime: meeting.startTime,
            endTime: meeting.endTime,
            averageRating: meeting.averageRating,
            status: meeting.meetingStatusId,
            createdAt: meeting.createdAt,
          })),
        }),
      },
    ],
  };
}

/**
 * List Success.co issues
 * @param {Object} args - Arguments object
 * @param {number} [args.first] - Optional page size
 * @param {number} [args.offset] - Optional offset
 * @returns {Promise<{content: Array<{type: string, text: string}>}>}
 */
export async function getIssues(args) {
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
      issues${argsStr} {
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
          totalCount: data.data.issues.totalCount,
          results: data.data.issues.nodes.map((issue) => ({
            id: issue.id,
            name: issue.name,
            description: issue.desc || "",
            status: issue.issueStatusId,
            type: issue.type,
            priority: issue.priorityNo,
            priorityOrder: issue.priorityOrder,
            teamId: issue.teamId,
            userId: issue.userId,
            meetingId: issue.meetingId,
            createdAt: issue.createdAt,
            statusUpdatedAt: issue.statusUpdatedAt,
          })),
        }),
      },
    ],
  };
}

/**
 * List Success.co headlines
 * @param {Object} args - Arguments object
 * @param {number} [args.first] - Optional page size
 * @param {number} [args.offset] - Optional offset
 * @returns {Promise<{content: Array<{type: string, text: string}>}>}
 */
export async function getHeadlines(args) {
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
}

/**
 * Search Success.co data (supports: teams, users, todos, rocks, meetings, issues, headlines)
 * @param {Object} args - Arguments object
 * @param {string} args.query - What to look up, e.g., 'list my teams', 'show users', 'find todos', 'get meetings'
 * @returns {Promise<{content: Array<{type: string, text: string}>}>}
 */
export async function search(args) {
  const { query } = args;
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
    if (!result.ok) return { content: [{ type: "text", text: result.error }] };

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
    if (!result.ok) return { content: [{ type: "text", text: result.error }] };

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
    `;
    const result = await callSuccessCoGraphQL(gql);
    if (!result.ok) return { content: [{ type: "text", text: result.error }] };

    const { data } = result;
    const hits = (data?.data?.todos?.nodes || []).map((t) => ({
      id: String(t.id), // REQUIRED by ChatGPT's fetch contract
      title: t.name ?? String(t.id),
      snippet:
        `${t.type || ""} ${t.desc || ""}`.trim() || `Priority: ${t.priorityNo}`,
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
    if (!result.ok) return { content: [{ type: "text", text: result.error }] };

    const { data } = result;
    const hits = (data?.data?.rocks?.nodes || []).map((r) => ({
      id: String(r.id), // REQUIRED by ChatGPT's fetch contract
      title: r.name ?? String(r.id),
      snippet: `${r.type || ""} ${r.desc || ""}`.trim() || `Due: ${r.dueDate}`,
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
    if (!result.ok) return { content: [{ type: "text", text: result.error }] };

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
    if (!result.ok) return { content: [{ type: "text", text: result.error }] };

    const { data } = result;
    const hits = (data?.data?.issues?.nodes || []).map((i) => ({
      id: String(i.id), // REQUIRED by ChatGPT's fetch contract
      title: i.name ?? String(i.id),
      snippet:
        `${i.type || ""} ${i.desc || ""}`.trim() || `Priority: ${i.priorityNo}`,
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
    if (!result.ok) return { content: [{ type: "text", text: result.error }] };

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
