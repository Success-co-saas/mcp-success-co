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
