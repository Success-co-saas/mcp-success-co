// Success.co MCP Server Tools
// This file contains the tool function implementations

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { validateStateId } from "./helpers.js";

// Logging - Debug
const DEBUG_LOG_FILE = "/tmp/mcp-success-co-graphql-debug.log";
let isDevMode = false;
let envConfig = {};

/**
 * Initialize tools with environment configuration
 * @param {Object} config - Environment configuration object
 * @param {string} config.NODE_ENV - The NODE_ENV value
 * @param {string} config.DEBUG - The DEBUG value
 * @param {string} config.GRAPHQL_ENDPOINT_MODE - The GRAPHQL_ENDPOINT_MODE value
 * @param {string} config.GRAPHQL_ENDPOINT_LOCAL - The GRAPHQL_ENDPOINT_LOCAL value
 * @param {string} config.GRAPHQL_ENDPOINT_ONLINE - The GRAPHQL_ENDPOINT_ONLINE value
 * @param {string} config.SUCCESS_CO_API_KEY - The SUCCESS_CO_API_KEY value
 */
export function init(config) {
  envConfig = config || {};
  isDevMode =
    envConfig.NODE_ENV === "development" || envConfig.DEBUG === "true";
}

/**
 * Log GraphQL request and response to debug file
 * @param {string} url - The GraphQL endpoint URL
 * @param {string} query - The GraphQL query
 * @param {Object} response - The response object
 * @param {number} status - HTTP status code
 */
function logGraphQLCall(url, query, response, status) {
  if (!isDevMode) return;

  try {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      url,
      query: query.replace(/\s+/g, " ").trim(), // Clean up whitespace
      status,
      response: response ? JSON.stringify(response, null, 2) : null,
    };

    const logLine =
      `\n=== GraphQL Call ${timestamp} ===\n` +
      `URL: ${logEntry.url}\n` +
      `Status: ${logEntry.status}\n` +
      `Query: ${logEntry.query}\n` +
      `Response: ${logEntry.response}\n` +
      `=== End GraphQL Call ===\n`;

    fs.appendFileSync(DEBUG_LOG_FILE, logLine, "utf8");
  } catch (error) {
    // Silently fail logging to avoid breaking the main functionality
    console.error("Failed to write GraphQL debug log:", error.message);
  }
}

/**
 * Calls the Success.co GraphQL API
 * @param {string} query - The GraphQL query string
 * @returns {Promise<{ok: boolean, data?: any, error?: string}>}
 */
export async function callSuccessCoGraphQL(query) {
  const apiKey = getSuccessCoApiKey();
  if (!apiKey) {
    return {
      ok: false,
      error:
        "Success.co API key not set. Use the setSuccessCoApiKey tool first.",
    };
  }

  const url = getGraphQLEndpoint();
  const response = await globalThis.fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query }),
  });

  if (!response.ok) {
    // Log failed request
    logGraphQLCall(url, query, null, response.status);
    return {
      ok: false,
      error: `HTTP error! status: ${response.status}`,
    };
  }

  const data = await response.json();

  // Log successful request
  logGraphQLCall(url, query, data, response.status);

  return { ok: true, data };
}

/**
 * Gets the GraphQL endpoint URL based on environment configuration
 * @returns {string}
 */
export function getGraphQLEndpoint() {
  const mode = envConfig.GRAPHQL_ENDPOINT_MODE || "online";

  if (mode === "local") {
    return envConfig.GRAPHQL_ENDPOINT_LOCAL || "http://localhost:5174/graphql";
  }

  return envConfig.GRAPHQL_ENDPOINT_ONLINE || "https://www.success.co/graphql";
}

/**
 * Gets Success.co API key from environment or file
 * @returns {string|null}
 */
export function getSuccessCoApiKey() {
  if (envConfig.SUCCESS_CO_API_KEY) return envConfig.SUCCESS_CO_API_KEY;

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
 * Stores Success.co API key to file
 * @param {string} apiKey - The API key to store
 * @returns {boolean} - Whether the storage was successful
 */
function storeSuccessCoApiKey(apiKey) {
  try {
    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    const API_KEY_FILE = path.join(__dirname, ".api_key");
    fs.writeFileSync(API_KEY_FILE, apiKey, "utf8");
    return true;
  } catch (error) {
    console.error("Error storing API key:", error);
    return false;
  }
}

/**
 * Set the Success.co API key
 * @param {Object} args - Arguments object
 * @param {string} args.apiKey - The API key for Success.co
 * @returns {Promise<{content: Array<{type: string, text: string}>}>}
 */
export async function setSuccessCoApiKey(args) {
  const { apiKey } = args;

  if (!apiKey || apiKey.trim() === "") {
    return {
      content: [
        {
          type: "text",
          text: "Error: API key cannot be blank",
        },
      ],
    };
  }

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

/**
 * Get the Success.co API key (env or stored file)
 * @param {Object} args - Arguments object (no parameters needed)
 * @returns {Promise<{content: Array<{type: string, text: string}>}>}
 */
export async function getSuccessCoApiKeyTool(args) {
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

/**
 * Get GraphQL debug log status and recent entries
 * @param {Object} args - Arguments object
 * @param {number} [args.lines] - Number of recent lines to show (default: 50)
 * @returns {Promise<{content: Array<{type: string, text: string}>}>}
 */
export async function getGraphQLDebugLog(args) {
  const { lines = 50 } = args;

  if (!isDevMode) {
    return {
      content: [
        {
          type: "text",
          text: "GraphQL debug logging is disabled. Enable with NODE_ENV=development or DEBUG=true",
        },
      ],
    };
  }

  try {
    if (!fs.existsSync(DEBUG_LOG_FILE)) {
      return {
        content: [
          {
            type: "text",
            text: `Debug log file does not exist yet: ${DEBUG_LOG_FILE}\nMake some GraphQL calls to generate log entries.`,
          },
        ],
      };
    }

    const logContent = fs.readFileSync(DEBUG_LOG_FILE, "utf8");
    const logLines = logContent.split("\n");
    const recentLines = logLines.slice(-lines).join("\n");

    const stats = fs.statSync(DEBUG_LOG_FILE);

    return {
      content: [
        {
          type: "text",
          text:
            `GraphQL Debug Log Status:\n` +
            `File: ${DEBUG_LOG_FILE}\n` +
            `Size: ${(stats.size / 1024).toFixed(2)} KB\n` +
            `Last Modified: ${stats.mtime.toISOString()}\n` +
            `Dev Mode: ${isDevMode}\n\n` +
            `Last ${lines} lines:\n` +
            `---\n${recentLines}\n---`,
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `Error reading debug log: ${error.message}`,
        },
      ],
    };
  }
}

/**
 * List Success.co teams
 * @param {Object} args - Arguments object
 * @param {number} [args.first] - Optional page size
 * @param {number} [args.offset] - Optional offset
 * @param {string} [args.stateId] - Team state filter (defaults to 'ACTIVE')
 * @returns {Promise<{content: Array<{type: string, text: string}>}>}
 */
export async function getTeams(args) {
  const { first, offset, stateId = "ACTIVE" } = args;
  // Validate stateId
  const validation = validateStateId(stateId);
  if (!validation.isValid) {
    return {
      content: [{ type: "text", text: validation.error }],
    };
  }
  const filterStr = [
    `stateId: {equalTo: "${stateId}"}`,
    first !== undefined ? `first: ${first}` : "",
    offset !== undefined ? `offset: ${offset}` : "",
  ]
    .filter(Boolean)
    .join(", ");

  const query = `
    query {
      teams(${filterStr ? `filter: {${filterStr}}` : ""}) {
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
 * @param {string} [args.stateId] - User state filter (defaults to 'ACTIVE')
 * @returns {Promise<{content: Array<{type: string, text: string}>}>}
 */
export async function getUsers(args) {
  const { first, offset, stateId = "ACTIVE" } = args;
  // Validate stateId
  const validation = validateStateId(stateId);
  if (!validation.isValid) {
    return {
      content: [{ type: "text", text: validation.error }],
    };
  }
  const filterStr = [
    `stateId: {equalTo: "${stateId}"}`,
    first !== undefined ? `first: ${first}` : "",
    offset !== undefined ? `offset: ${offset}` : "",
  ]
    .filter(Boolean)
    .join(", ");

  const query = `
    query {
      users(${filterStr ? `filter: {${filterStr}}` : ""}) {
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
 * @param {string} [args.stateId] - Todo state filter (defaults to 'ACTIVE')
 * @returns {Promise<{content: Array<{type: string, text: string}>}>}
 */
export async function getTodos(args) {
  const { first, offset, stateId = "ACTIVE" } = args;
  // Validate stateId
  const validation = validateStateId(stateId);
  if (!validation.isValid) {
    return {
      content: [{ type: "text", text: validation.error }],
    };
  }
  const filterStr = [
    `stateId: {equalTo: "${stateId}"}`,
    first !== undefined ? `first: ${first}` : "",
    offset !== undefined ? `offset: ${offset}` : "",
  ]
    .filter(Boolean)
    .join(", ");

  const query = `
    query {
      todos(${filterStr ? `filter: {${filterStr}}` : ""}) {
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
 * @param {string} [args.stateId] - Rock state filter (defaults to 'ACTIVE')
 * @param {string} [args.rockStatusId] - Rock status filter (defaults to blank)
 * @returns {Promise<{content: Array<{type: string, text: string}>}>}
 */
export async function getRocks(args) {
  const { first, offset, stateId = "ACTIVE", rockStatusId = "" } = args;
  // Validate stateId
  const validation = validateStateId(stateId);
  if (!validation.isValid) {
    return {
      content: [{ type: "text", text: validation.error }],
    };
  }
  // Validate rockStatusId
  if (
    rockStatusId !== "" &&
    !["ONTRACK", "OFFTRACK", "COMPLETE", "INCOMPLETE"].includes(rockStatusId)
  ) {
    return {
      content: [
        {
          type: "text",
          text: "Invalid rock status - must be ONTRACK, OFFTRACK, COMPLETE, or INCOMPLETE",
        },
      ],
    };
  }
  const filterStr = [
    `stateId: {equalTo: "${stateId}"}`,
    rockStatusId ? `rockStatusId: {equalTo: "${rockStatusId}"}` : "",
    first !== undefined ? `first: ${first}` : "",
    offset !== undefined ? `offset: ${offset}` : "",
  ]
    .filter(Boolean)
    .join(", ");

  const query = `
    query {
      rocks(${filterStr ? `filter: {${filterStr}}` : ""}) {
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
            rockStatusId: rock.rockStatusId,
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
 * @param {string} [args.stateId] - Meeting state filter (defaults to 'ACTIVE')
 * @returns {Promise<{content: Array<{type: string, text: string}>}>}
 */
export async function getMeetings(args) {
  const { first, offset, stateId = "ACTIVE" } = args;
  // Validate stateId
  const validation = validateStateId(stateId);
  if (!validation.isValid) {
    return {
      content: [{ type: "text", text: validation.error }],
    };
  }
  const filterStr = [
    `stateId: {equalTo: "${stateId}"}`,
    first !== undefined ? `first: ${first}` : "",
    offset !== undefined ? `offset: ${offset}` : "",
  ]
    .filter(Boolean)
    .join(", ");

  const query = `
    query {
      meetings(${filterStr ? `filter: {${filterStr}}` : ""}) {
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
 * @param {string} [args.stateId] - Issue state filter (defaults to 'ACTIVE')
 * @returns {Promise<{content: Array<{type: string, text: string}>}>}
 */
export async function getIssues(args) {
  const { first, offset, stateId = "ACTIVE" } = args;
  // Validate stateId
  const validation = validateStateId(stateId);
  if (!validation.isValid) {
    return {
      content: [{ type: "text", text: validation.error }],
    };
  }
  const filterStr = [
    `stateId: {equalTo: "${stateId}"}`,
    first !== undefined ? `first: ${first}` : "",
    offset !== undefined ? `offset: ${offset}` : "",
  ]
    .filter(Boolean)
    .join(", ");

  const query = `
    query {
      issues(${filterStr ? `filter: {${filterStr}}` : ""}) {
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
 * @param {string} [args.stateId] - Headline state filter (defaults to 'ACTIVE')
 * @returns {Promise<{content: Array<{type: string, text: string}>}>}
 */
export async function getHeadlines(args) {
  const { first, offset, stateId = "ACTIVE" } = args;
  // Validate stateId
  const validation = validateStateId(stateId);
  if (!validation.isValid) {
    return {
      content: [{ type: "text", text: validation.error }],
    };
  }
  const filterStr = [
    `stateId: {equalTo: "${stateId}"}`,
    first !== undefined ? `first: ${first}` : "",
    offset !== undefined ? `offset: ${offset}` : "",
  ]
    .filter(Boolean)
    .join(", ");

  const query = `
    query {
      headlines(${filterStr ? `filter: {${filterStr}}` : ""}) {
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
 * List Success.co visions
 * @param {Object} args - Arguments object
 * @param {number} [args.first] - Optional page size
 * @param {number} [args.offset] - Optional offset
 * @param {string} [args.stateId] - Vision state filter (defaults to 'ACTIVE')
 * @param {string} [args.teamId] - Filter by team ID
 * @param {boolean} [args.isLeadership] - Filter by leadership team
 * @returns {Promise<{content: Array<{type: string, text: string}>}>}
 */
export async function getVisions(args) {
  const { first, offset, stateId = "ACTIVE", teamId, isLeadership } = args;
  // Validate stateId
  const validation = validateStateId(stateId);
  if (!validation.isValid) {
    return {
      content: [{ type: "text", text: validation.error }],
    };
  }

  const filterParts = [`stateId: {equalTo: "${stateId}"}`];
  if (teamId) filterParts.push(`teamId: {equalTo: "${teamId}"}`);
  if (isLeadership !== undefined)
    filterParts.push(`isLeadership: {equalTo: ${isLeadership}}`);

  const filterStr = filterParts.join(", ");

  // Build query parameters separately
  const queryParams = [];
  if (filterStr) queryParams.push(`filter: {${filterStr}}`);
  if (first !== undefined) queryParams.push(`first: ${first}`);
  if (offset !== undefined) queryParams.push(`offset: ${offset}`);

  const queryParamStr = queryParams.join(", ");

  const query = `
    query {
      visions(${queryParamStr}) {
        nodes {
          id
          teamId
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
          totalCount: data.data.visions.totalCount,
          results: data.data.visions.nodes.map((vision) => ({
            id: vision.id,
            teamId: vision.teamId,
            isLeadership: vision.isLeadership,
            createdAt: vision.createdAt,
            status: vision.stateId,
          })),
        }),
      },
    ],
  };
}

/**
 * List Success.co vision core values
 * @param {Object} args - Arguments object
 * @param {number} [args.first] - Optional page size
 * @param {number} [args.offset] - Optional offset
 * @param {string} [args.stateId] - Core value state filter (defaults to 'ACTIVE')
 * @param {string} [args.visionId] - Filter by vision ID
 * @returns {Promise<{content: Array<{type: string, text: string}>}>}
 */
export async function getVisionCoreValues(args) {
  const { first, offset, stateId = "ACTIVE", visionId } = args;
  // Validate stateId
  const validation = validateStateId(stateId);
  if (!validation.isValid) {
    return {
      content: [{ type: "text", text: validation.error }],
    };
  }

  const filterParts = [`stateId: {equalTo: "${stateId}"}`];
  if (visionId) filterParts.push(`visionId: {equalTo: "${visionId}"}`);

  const filterStr = filterParts.join(", ");

  // Build query parameters separately
  const queryParams = [];
  if (filterStr) queryParams.push(`filter: {${filterStr}}`);
  if (first !== undefined) queryParams.push(`first: ${first}`);
  if (offset !== undefined) queryParams.push(`offset: ${offset}`);

  const queryParamStr = queryParams.join(", ");

  const query = `
    query {
      visionCoreValues(${queryParamStr}) {
        nodes {
          id
          name
          cascadeAll
          visionId
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
          totalCount: data.data.visionCoreValues.totalCount,
          results: data.data.visionCoreValues.nodes.map((coreValue) => ({
            id: coreValue.id,
            name: coreValue.name,
            cascadeAll: coreValue.cascadeAll,
            visionId: coreValue.visionId,
            createdAt: coreValue.createdAt,
            status: coreValue.stateId,
          })),
        }),
      },
    ],
  };
}

/**
 * List Success.co vision core focus types
 * @param {Object} args - Arguments object
 * @param {number} [args.first] - Optional page size
 * @param {number} [args.offset] - Optional offset
 * @param {string} [args.stateId] - Core focus state filter (defaults to 'ACTIVE')
 * @param {string} [args.visionId] - Filter by vision ID
 * @param {string} [args.type] - Filter by type
 * @returns {Promise<{content: Array<{type: string, text: string}>}>}
 */
export async function getVisionCoreFocusTypes(args) {
  const { first, offset, stateId = "ACTIVE", visionId, type } = args;
  // Validate stateId
  const validation = validateStateId(stateId);
  if (!validation.isValid) {
    return {
      content: [{ type: "text", text: validation.error }],
    };
  }

  const filterParts = [`stateId: {equalTo: "${stateId}"}`];
  if (visionId) filterParts.push(`visionId: {equalTo: "${visionId}"}`);
  if (type) filterParts.push(`type: {equalTo: "${type}"}`);

  const filterStr = filterParts.join(", ");

  // Build query parameters separately
  const queryParams = [];
  if (filterStr) queryParams.push(`filter: {${filterStr}}`);
  if (first !== undefined) queryParams.push(`first: ${first}`);
  if (offset !== undefined) queryParams.push(`offset: ${offset}`);

  const queryParamStr = queryParams.join(", ");

  const query = `
    query {
      visionCoreFocusTypes(${queryParamStr}) {
        nodes {
          id
          name
          coreFocusName
          desc
          src
          type
          visionId
          cascadeAll
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
          totalCount: data.data.visionCoreFocusTypes.totalCount,
          results: data.data.visionCoreFocusTypes.nodes.map((coreFocus) => ({
            id: coreFocus.id,
            name: coreFocus.name,
            coreFocusName: coreFocus.coreFocusName,
            description: coreFocus.desc,
            src: coreFocus.src,
            type: coreFocus.type,
            visionId: coreFocus.visionId,
            cascadeAll: coreFocus.cascadeAll,
            createdAt: coreFocus.createdAt,
            status: coreFocus.stateId,
          })),
        }),
      },
    ],
  };
}

/**
 * List Success.co vision three year goals
 * @param {Object} args - Arguments object
 * @param {number} [args.first] - Optional page size
 * @param {number} [args.offset] - Optional offset
 * @param {string} [args.stateId] - Goal state filter (defaults to 'ACTIVE')
 * @param {string} [args.visionId] - Filter by vision ID
 * @param {string} [args.type] - Filter by type
 * @returns {Promise<{content: Array<{type: string, text: string}>}>}
 */
export async function getVisionThreeYearGoals(args) {
  const { first, offset, stateId = "ACTIVE", visionId, type } = args;
  // Validate stateId
  const validation = validateStateId(stateId);
  if (!validation.isValid) {
    return {
      content: [{ type: "text", text: validation.error }],
    };
  }

  const filterParts = [`stateId: {equalTo: "${stateId}"}`];
  if (visionId) filterParts.push(`visionId: {equalTo: "${visionId}"}`);
  if (type) filterParts.push(`type: {equalTo: "${type}"}`);

  const filterStr = filterParts.join(", ");

  // Build query parameters separately
  const queryParams = [];
  if (filterStr) queryParams.push(`filter: {${filterStr}}`);
  if (first !== undefined) queryParams.push(`first: ${first}`);
  if (offset !== undefined) queryParams.push(`offset: ${offset}`);

  const queryParamStr = queryParams.join(", ");

  const query = `
    query {
      visionThreeYearGoals(${queryParamStr}) {
        nodes {
          id
          name
          futureDate
          cascadeAll
          visionId
          type
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
          totalCount: data.data.visionThreeYearGoals.totalCount,
          results: data.data.visionThreeYearGoals.nodes.map((goal) => ({
            id: goal.id,
            name: goal.name,
            futureDate: goal.futureDate,
            cascadeAll: goal.cascadeAll,
            visionId: goal.visionId,
            type: goal.type,
            createdAt: goal.createdAt,
            status: goal.stateId,
          })),
        }),
      },
    ],
  };
}

/**
 * List Success.co vision market strategies
 * @param {Object} args - Arguments object
 * @param {number} [args.first] - Optional page size
 * @param {number} [args.offset] - Optional offset
 * @param {string} [args.stateId] - Strategy state filter (defaults to 'ACTIVE')
 * @param {string} [args.visionId] - Filter by vision ID
 * @param {boolean} [args.isCustom] - Filter by custom status
 * @returns {Promise<{content: Array<{type: string, text: string}>}>}
 */
export async function getVisionMarketStrategies(args) {
  const { first, offset, stateId = "ACTIVE", visionId, isCustom } = args;
  // Validate stateId
  const validation = validateStateId(stateId);
  if (!validation.isValid) {
    return {
      content: [{ type: "text", text: validation.error }],
    };
  }

  const filterParts = [`stateId: {equalTo: "${stateId}"}`];
  if (visionId) filterParts.push(`visionId: {equalTo: "${visionId}"}`);
  if (isCustom !== undefined)
    filterParts.push(`isCustom: {equalTo: ${isCustom}}`);

  const filterStr = filterParts.join(", ");

  // Build query parameters separately
  const queryParams = [];
  if (filterStr) queryParams.push(`filter: {${filterStr}}`);
  if (first !== undefined) queryParams.push(`first: ${first}`);
  if (offset !== undefined) queryParams.push(`offset: ${offset}`);

  const queryParamStr = queryParams.join(", ");

  const query = `
    query {
      visionMarketStrategies(${queryParamStr}) {
        nodes {
          id
          name
          cascadeAll
          visionId
          idealCustomer
          idealCustomerDesc
          provenProcess
          provenProcessDesc
          guarantee
          guaranteeDesc
          uniqueValueProposition
          showProvenProcess
          showGuarantee
          isCustom
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
          totalCount: data.data.visionMarketStrategies.totalCount,
          results: data.data.visionMarketStrategies.nodes.map((strategy) => ({
            id: strategy.id,
            name: strategy.name,
            cascadeAll: strategy.cascadeAll,
            visionId: strategy.visionId,
            idealCustomer: strategy.idealCustomer,
            idealCustomerDesc: strategy.idealCustomerDesc,
            provenProcess: strategy.provenProcess,
            provenProcessDesc: strategy.provenProcessDesc,
            guarantee: strategy.guarantee,
            guaranteeDesc: strategy.guaranteeDesc,
            uniqueValueProposition: strategy.uniqueValueProposition,
            showProvenProcess: strategy.showProvenProcess,
            showGuarantee: strategy.showGuarantee,
            isCustom: strategy.isCustom,
            createdAt: strategy.createdAt,
            status: strategy.stateId,
          })),
        }),
      },
    ],
  };
}

/**
 * List Success.co rock statuses
 * @param {Object} args - Arguments object
 * @param {number} [args.first] - Optional page size
 * @param {number} [args.offset] - Optional offset
 * @param {string} [args.stateId] - Rock status state filter (defaults to 'ACTIVE')
 * @returns {Promise<{content: Array<{type: string, text: string}>}>}
 */
export async function getRockStatuses(args) {
  const { first, offset, stateId = "ACTIVE" } = args;
  // Validate stateId
  const validation = validateStateId(stateId);
  if (!validation.isValid) {
    return {
      content: [{ type: "text", text: validation.error }],
    };
  }
  const filterStr = [
    `stateId: {equalTo: "${stateId}"}`,
    first !== undefined ? `first: ${first}` : "",
    offset !== undefined ? `offset: ${offset}` : "",
  ]
    .filter(Boolean)
    .join(", ");

  const query = `
    query {
      rockStatuses(${filterStr ? `filter: {${filterStr}}` : ""}) {
        nodes {
          id
          name
          color
          type
          order
          builtIn
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
          totalCount: data.data.rockStatuses.totalCount,
          results: data.data.rockStatuses.nodes.map((status) => ({
            id: status.id,
            name: status.name,
            color: status.color,
            type: status.type,
            order: status.order,
            builtIn: status.builtIn,
            createdAt: status.createdAt,
            status: status.stateId,
          })),
        }),
      },
    ],
  };
}

/**
 * List Success.co milestones
 * @param {Object} args - Arguments object
 * @param {number} [args.first] - Optional page size
 * @param {number} [args.offset] - Optional offset
 * @param {string} [args.stateId] - Milestone state filter (defaults to 'ACTIVE')
 * @param {string} [args.rockId] - Filter by rock ID
 * @param {string} [args.userId] - Filter by user ID
 * @param {string} [args.teamId] - Filter by team ID
 * @returns {Promise<{content: Array<{type: string, text: string}>}>}
 */
export async function getMilestones(args) {
  const { first, offset, stateId = "ACTIVE", rockId, userId, teamId } = args;
  // Validate stateId
  const validation = validateStateId(stateId);
  if (!validation.isValid) {
    return {
      content: [{ type: "text", text: validation.error }],
    };
  }

  const filterParts = [`stateId: {equalTo: "${stateId}"}`];
  if (rockId) filterParts.push(`rockId: {equalTo: "${rockId}"}`);
  if (userId) filterParts.push(`userId: {equalTo: "${userId}"}`);
  if (teamId) filterParts.push(`teamId: {equalTo: "${teamId}"}`);
  if (first !== undefined) filterParts.push(`first: ${first}`);
  if (offset !== undefined) filterParts.push(`offset: ${offset}`);

  const filterStr = filterParts.join(", ");

  const query = `
    query {
      milestones(${filterStr ? `filter: {${filterStr}}` : ""}) {
        nodes {
          id
          rockId
          name
          dueDate
          userId
          milestoneStatusId
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
          totalCount: data.data.milestones.totalCount,
          results: data.data.milestones.nodes.map((milestone) => ({
            id: milestone.id,
            rockId: milestone.rockId,
            name: milestone.name,
            dueDate: milestone.dueDate,
            userId: milestone.userId,
            milestoneStatusId: milestone.milestoneStatusId,
            createdAt: milestone.createdAt,
            status: milestone.stateId,
          })),
        }),
      },
    ],
  };
}

/**
 * List Success.co milestone statuses
 * @param {Object} args - Arguments object
 * @param {number} [args.first] - Optional page size
 * @param {number} [args.offset] - Optional offset
 * @returns {Promise<{content: Array<{type: string, text: string}>}>}
 */
export async function getMilestoneStatuses(args) {
  const { first, offset } = args;
  const filterStr = [
    first !== undefined ? `first: ${first}` : "",
    offset !== undefined ? `offset: ${offset}` : "",
  ]
    .filter(Boolean)
    .join(", ");

  const query = `
    query {
      milestoneStatuses(${filterStr ? `filter: {${filterStr}}` : ""}) {
        nodes {
          id
          name
          color
          order
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
          totalCount: data.data.milestoneStatuses.totalCount,
          results: data.data.milestoneStatuses.nodes.map((status) => ({
            id: status.id,
            name: status.name,
            color: status.color,
            order: status.order,
          })),
        }),
      },
    ],
  };
}

/**
 * List Success.co teams on rocks relationships
 * @param {Object} args - Arguments object
 * @param {number} [args.first] - Optional page size
 * @param {number} [args.offset] - Optional offset
 * @param {string} [args.stateId] - Team-rock state filter (defaults to 'ACTIVE')
 * @param {string} [args.rockId] - Filter by rock ID
 * @param {string} [args.teamId] - Filter by team ID
 * @returns {Promise<{content: Array<{type: string, text: string}>}>}
 */
export async function getTeamsOnRocks(args) {
  const { first, offset, stateId = "ACTIVE", rockId, teamId } = args;
  // Validate stateId
  const validation = validateStateId(stateId);
  if (!validation.isValid) {
    return {
      content: [{ type: "text", text: validation.error }],
    };
  }

  const filterParts = [`stateId: {equalTo: "${stateId}"}`];
  if (rockId) filterParts.push(`rockId: {equalTo: "${rockId}"}`);
  if (teamId) filterParts.push(`teamId: {equalTo: "${teamId}"}`);
  if (first !== undefined) filterParts.push(`first: ${first}`);
  if (offset !== undefined) filterParts.push(`offset: ${offset}`);

  const filterStr = filterParts.join(", ");

  const query = `
    query {
      teamsOnRocks(${filterStr ? `filter: {${filterStr}}` : ""}) {
        nodes {
          id
          rockId
          teamId
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
          totalCount: data.data.teamsOnRocks.totalCount,
          results: data.data.teamsOnRocks.nodes.map((teamOnRock) => ({
            id: teamOnRock.id,
            rockId: teamOnRock.rockId,
            teamId: teamOnRock.teamId,
            createdAt: teamOnRock.createdAt,
            status: teamOnRock.stateId,
          })),
        }),
      },
    ],
  };
}

/**
 * Analyze EOS data for complex queries like at-risk rocks, overdue items, etc.
 * @param {Object} args - Arguments object
 * @param {string} args.query - The analytical query to perform
 * @param {string} [args.teamId] - Optional team filter
 * @param {string} [args.userId] - Optional user filter
 * @param {string} [args.timeframe] - Optional timeframe (e.g., 'quarter', 'month', 'week')
 * @returns {Promise<{content: Array<{type: string, text: string}>}>}
 */
export async function analyzeEOSData(args) {
  const { query, teamId, userId, timeframe = "quarter" } = args;
  const q = (query || "").toLowerCase();

  // Check for Level 10 meeting queries
  if (
    q.includes("level 10") ||
    q.includes("level10") ||
    q.includes("l10") ||
    (q.includes("meeting") && q.includes("issue"))
  ) {
    return await analyzeLevel10MeetingIssues({ teamId, userId, timeframe });
  }

  // Check for meeting-related queries
  if (
    q.includes("meeting") ||
    q.includes("agenda") ||
    q.includes("facilitator") ||
    q.includes("scribe")
  ) {
    return await analyzeMeetingData({ teamId, userId, timeframe });
  }

  // Check for issue-related queries
  if (
    q.includes("issue") ||
    q.includes("problem") ||
    q.includes("challenge") ||
    q.includes("priority")
  ) {
    return await analyzeIssueData({ teamId, userId, timeframe });
  }

  // Check for at-risk rocks queries
  if (
    q.includes("at risk") ||
    q.includes("at-risk") ||
    q.includes("missing") ||
    q.includes("due date")
  ) {
    return await analyzeAtRiskRocks({ teamId, userId, timeframe });
  }

  // Check for overdue items queries
  if (q.includes("overdue") || q.includes("late") || q.includes("past due")) {
    return await analyzeOverdueItems({ teamId, userId, timeframe });
  }

  // Check for rock progress queries
  if (
    q.includes("progress") ||
    q.includes("status") ||
    q.includes("completion")
  ) {
    return await analyzeRockProgress({ teamId, userId, timeframe });
  }

  // Check for team performance queries
  if (
    q.includes("performance") ||
    q.includes("team") ||
    q.includes("productivity")
  ) {
    return await analyzeTeamPerformance({ teamId, timeframe });
  }

  // Check for vision/VTO queries
  if (
    q.includes("vision") ||
    q.includes("traction") ||
    q.includes("organizer") ||
    q.includes("vto") ||
    q.includes("core values") ||
    q.includes("three year") ||
    q.includes("market strategy") ||
    q.includes("core focus")
  ) {
    return await analyzeVisionTractionOrganizer({ teamId, userId, timeframe });
  }

  return {
    content: [
      {
        type: "text",
        text: "I can analyze: Level 10 meetings, issues, meetings, at-risk rocks, overdue items, rock progress, team performance, and Vision/Traction Organizer. Try queries like 'What are the top 5 open Issues for this week's Level 10 meeting?' or 'Which rocks are at risk of missing their due dates?' or 'Summarize our company's Vision/Traction Organizer'",
      },
    ],
  };
}

/**
 * Analyze at-risk rocks (rocks that might miss their due dates)
 */
async function analyzeAtRiskRocks({ teamId, userId, timeframe }) {
  const now = new Date();
  let daysAhead = 30; // Default to 30 days ahead

  if (timeframe === "quarter") daysAhead = 90;
  else if (timeframe === "month") daysAhead = 30;
  else if (timeframe === "week") daysAhead = 7;

  const futureDate = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);

  const filterParts = [
    `stateId: {equalTo: "ACTIVE"}`,
    `dueDate: {lessThanOrEqualTo: "${futureDate.toISOString()}"}`,
    `rockStatusId: {notEqualTo: "COMPLETE"}`,
  ];

  if (teamId) filterParts.push(`userId: {equalTo: "${userId}"}`);
  if (userId) filterParts.push(`userId: {equalTo: "${userId}"}`);

  const filterStr = filterParts.join(", ");

  const query = `
    query {
      rocks(filter: {${filterStr}}) {
        nodes {
          id
          name
          desc
          dueDate
          rockStatusId
          userId
          type
          createdAt
          statusUpdatedAt
        }
        totalCount
      }
    }
  `;

  const result = await callSuccessCoGraphQL(query);
  if (!result.ok) {
    return { content: [{ type: "text", text: result.error }] };
  }

  const rocks = result.data?.data?.rocks?.nodes || [];

  // Get user information for each rock
  const rocksWithUsers = await Promise.all(
    rocks.map(async (rock) => {
      const userQuery = `
        query {
          user(id: "${rock.userId}") {
            id
            firstName
            lastName
            jobTitle
            email
          }
        }
      `;
      const userResult = await callSuccessCoGraphQL(userQuery);
      const user = userResult.ok ? userResult.data?.data?.user : null;

      return {
        ...rock,
        owner: user ? `${user.firstName} ${user.lastName}` : "Unknown",
        ownerTitle: user?.jobTitle || "",
        ownerEmail: user?.email || "",
        daysUntilDue: Math.ceil(
          (new Date(rock.dueDate) - now) / (1000 * 60 * 60 * 24)
        ),
      };
    })
  );

  // Sort by days until due (most urgent first)
  rocksWithUsers.sort((a, b) => a.daysUntilDue - b.daysUntilDue);

  return {
    content: [
      {
        type: "text",
        text: JSON.stringify({
          analysis: "at-risk-rocks",
          timeframe: timeframe,
          totalCount: rocksWithUsers.length,
          results: rocksWithUsers.map((rock) => ({
            id: rock.id,
            name: rock.name,
            description: rock.desc || "",
            dueDate: rock.dueDate,
            daysUntilDue: rock.daysUntilDue,
            status: rock.rockStatusId,
            type: rock.type,
            owner: rock.owner,
            ownerTitle: rock.ownerTitle,
            ownerEmail: rock.ownerEmail,
            createdAt: rock.createdAt,
            statusUpdatedAt: rock.statusUpdatedAt,
          })),
        }),
      },
    ],
  };
}

/**
 * Analyze overdue items
 */
async function analyzeOverdueItems({ teamId, userId, timeframe }) {
  const now = new Date();

  const filterParts = [
    `stateId: {equalTo: "ACTIVE"}`,
    `dueDate: {lessThan: "${now.toISOString()}"}`,
    `rockStatusId: {notEqualTo: "COMPLETE"}`,
  ];

  if (teamId) filterParts.push(`userId: {equalTo: "${userId}"}`);
  if (userId) filterParts.push(`userId: {equalTo: "${userId}"}`);

  const filterStr = filterParts.join(", ");

  const query = `
    query {
      rocks(filter: {${filterStr}}) {
        nodes {
          id
          name
          desc
          dueDate
          rockStatusId
          userId
          type
          createdAt
          statusUpdatedAt
        }
        totalCount
      }
    }
  `;

  const result = await callSuccessCoGraphQL(query);
  if (!result.ok) {
    return { content: [{ type: "text", text: result.error }] };
  }

  const rocks = result.data?.data?.rocks?.nodes || [];

  // Get user information for each rock
  const rocksWithUsers = await Promise.all(
    rocks.map(async (rock) => {
      const userQuery = `
        query {
          user(id: "${rock.userId}") {
            id
            firstName
            lastName
            jobTitle
            email
          }
        }
      `;
      const userResult = await callSuccessCoGraphQL(userQuery);
      const user = userResult.ok ? userResult.data?.data?.user : null;

      return {
        ...rock,
        owner: user ? `${user.firstName} ${user.lastName}` : "Unknown",
        ownerTitle: user?.jobTitle || "",
        ownerEmail: user?.email || "",
        daysOverdue: Math.ceil(
          (now - new Date(rock.dueDate)) / (1000 * 60 * 60 * 24)
        ),
      };
    })
  );

  // Sort by days overdue (most overdue first)
  rocksWithUsers.sort((a, b) => b.daysOverdue - a.daysOverdue);

  return {
    content: [
      {
        type: "text",
        text: JSON.stringify({
          analysis: "overdue-items",
          timeframe: timeframe,
          totalCount: rocksWithUsers.length,
          results: rocksWithUsers.map((rock) => ({
            id: rock.id,
            name: rock.name,
            description: rock.desc || "",
            dueDate: rock.dueDate,
            daysOverdue: rock.daysOverdue,
            status: rock.rockStatusId,
            type: rock.type,
            owner: rock.owner,
            ownerTitle: rock.ownerTitle,
            ownerEmail: rock.ownerEmail,
            createdAt: rock.createdAt,
            statusUpdatedAt: rock.statusUpdatedAt,
          })),
        }),
      },
    ],
  };
}

/**
 * Analyze rock progress
 */
async function analyzeRockProgress({ teamId, userId, timeframe }) {
  const filterParts = [`stateId: {equalTo: "ACTIVE"}`];

  if (teamId) filterParts.push(`userId: {equalTo: "${userId}"}`);
  if (userId) filterParts.push(`userId: {equalTo: "${userId}"}`);

  const filterStr = filterParts.join(", ");

  const query = `
    query {
      rocks(filter: {${filterStr}}) {
        nodes {
          id
          name
          desc
          dueDate
          rockStatusId
          userId
          type
          createdAt
          statusUpdatedAt
        }
        totalCount
      }
    }
  `;

  const result = await callSuccessCoGraphQL(query);
  if (!result.ok) {
    return { content: [{ type: "text", text: result.error }] };
  }

  const rocks = result.data?.data?.rocks?.nodes || [];

  // Group by status
  const statusGroups = {};
  rocks.forEach((rock) => {
    if (!statusGroups[rock.rockStatusId]) {
      statusGroups[rock.rockStatusId] = [];
    }
    statusGroups[rock.rockStatusId].push(rock);
  });

  return {
    content: [
      {
        type: "text",
        text: JSON.stringify({
          analysis: "rock-progress",
          timeframe: timeframe,
          totalCount: rocks.length,
          statusBreakdown: Object.keys(statusGroups).map((status) => ({
            status: status,
            count: statusGroups[status].length,
            percentage: Math.round(
              (statusGroups[status].length / rocks.length) * 100
            ),
          })),
          results: rocks.map((rock) => ({
            id: rock.id,
            name: rock.name,
            description: rock.desc || "",
            dueDate: rock.dueDate,
            status: rock.rockStatusId,
            type: rock.type,
            userId: rock.userId,
            createdAt: rock.createdAt,
            statusUpdatedAt: rock.statusUpdatedAt,
          })),
        }),
      },
    ],
  };
}

/**
 * Analyze team performance
 */
async function analyzeTeamPerformance({ teamId, timeframe }) {
  // Get teams
  const teamsQuery = `
    query {
      teams(filter: {stateId: {equalTo: "ACTIVE"}}) {
        nodes {
          id
          name
          desc
          color
          isLeadership
        }
        totalCount
      }
    }
  `;

  const teamsResult = await callSuccessCoGraphQL(teamsQuery);
  if (!teamsResult.ok) {
    return { content: [{ type: "text", text: teamsResult.error }] };
  }

  const teams = teamsResult.data?.data?.teams?.nodes || [];

  // Get rocks for each team
  const teamPerformance = await Promise.all(
    teams.map(async (team) => {
      const rocksQuery = `
        query {
          rocks(filter: {stateId: {equalTo: "ACTIVE"}}) {
            nodes {
              id
              name
              rockStatusId
              dueDate
              userId
            }
            totalCount
          }
        }
      `;

      const rocksResult = await callSuccessCoGraphQL(rocksQuery);
      const rocks = rocksResult.ok
        ? rocksResult.data?.data?.rocks?.nodes || []
        : [];

      // Filter rocks for this team (assuming rocks are associated with teams through users)
      const teamRocks = rocks.filter((rock) => {
        // This is a simplified approach - in reality you'd need to check team membership
        return true; // For now, include all rocks
      });

      const statusCounts = {};
      teamRocks.forEach((rock) => {
        statusCounts[rock.rockStatusId] =
          (statusCounts[rock.rockStatusId] || 0) + 1;
      });

      return {
        teamId: team.id,
        teamName: team.name,
        teamDescription: team.desc,
        teamColor: team.color,
        isLeadership: team.isLeadership,
        totalRocks: teamRocks.length,
        statusBreakdown: statusCounts,
      };
    })
  );

  return {
    content: [
      {
        type: "text",
        text: JSON.stringify({
          analysis: "team-performance",
          timeframe: timeframe,
          totalTeams: teams.length,
          results: teamPerformance,
        }),
      },
    ],
  };
}

/**
 * Analyze Level 10 meeting issues
 */
async function analyzeLevel10MeetingIssues({ teamId, userId, timeframe }) {
  try {
    // Get Level 10 meeting agendas (assuming they have a specific type or name pattern)
    const meetingAgendasQuery = `
      query {
        meetingAgendas(filter: {stateId: {equalTo: "ACTIVE"}}) {
          nodes {
            id
            name
            desc
            teamId
            meetingAgendaTypeId
            facilitatorUserId
            scribeUserId
            team {
              id
              name
              desc
              color
              isLeadership
            }
            facilitator {
              id
              firstName
              lastName
              email
              jobTitle
            }
            scribe {
              id
              firstName
              lastName
              email
              jobTitle
            }
            meetingAgendaSections {
              id
              name
              desc
              type
              visible
              duration
              order
            }
          }
        }
      }
    `;

    const agendasResult = await callSuccessCoGraphQL(meetingAgendasQuery);
    if (!agendasResult.ok) {
      return { content: [{ type: "text", text: agendasResult.error }] };
    }

    const agendas = agendasResult.data?.data?.meetingAgendas?.nodes || [];

    // Filter for Level 10 meetings (assuming they contain "Level 10" in name or are a specific type)
    const level10Agendas = agendas.filter(
      (agenda) =>
        agenda.name.toLowerCase().includes("level 10") ||
        agenda.name.toLowerCase().includes("l10") ||
        agenda.meetingAgendaTypeId === "LEVEL_10"
    );

    // Get issues for each Level 10 meeting
    const meetingIssues = await Promise.all(
      level10Agendas.map(async (agenda) => {
        const issuesQuery = `
          query {
            issues(filter: {stateId: {equalTo: "ACTIVE"}}) {
              nodes {
                id
                name
                desc
                issueStatusId
                teamId
                userId
                type
                priorityNo
                priorityOrder
                statusUpdatedAt
                meetingId
                createdAt
                user {
                  id
                  firstName
                  lastName
                  email
                  jobTitle
                }
                team {
                  id
                  name
                  desc
                  color
                }
                issueStatus {
                  id
                  name
                  color
                  type
                  order
                }
              }
            }
          }
        `;

        const issuesResult = await callSuccessCoGraphQL(issuesQuery);
        const issues = issuesResult.ok
          ? issuesResult.data?.data?.issues?.nodes || []
          : [];

        // Filter issues for this team and open status
        const openIssues = issues.filter(
          (issue) =>
            issue.teamId === agenda.teamId &&
            issue.issueStatusId !== "RESOLVED" &&
            issue.issueStatusId !== "CLOSED"
        );

        // Sort by priority (lower priorityNo = higher priority)
        const sortedIssues = openIssues.sort(
          (a, b) => (a.priorityNo || 999) - (b.priorityNo || 999)
        );

        return {
          agendaId: agenda.id,
          agendaName: agenda.name,
          agendaDescription: agenda.desc,
          teamId: agenda.teamId,
          teamName: agenda.team.name,
          teamColor: agenda.team.color,
          facilitator: agenda.facilitator
            ? {
                id: agenda.facilitator.id,
                name: `${agenda.facilitator.firstName} ${agenda.facilitator.lastName}`,
                email: agenda.facilitator.email,
                jobTitle: agenda.facilitator.jobTitle,
              }
            : null,
          scribe: agenda.scribe
            ? {
                id: agenda.scribe.id,
                name: `${agenda.scribe.firstName} ${agenda.scribe.lastName}`,
                email: agenda.scribe.email,
                jobTitle: agenda.scribe.jobTitle,
              }
            : null,
          sections: agenda.meetingAgendaSections.map((section) => ({
            id: section.id,
            name: section.name,
            description: section.desc,
            type: section.type,
            visible: section.visible,
            duration: section.duration,
            order: section.order,
          })),
          openIssues: sortedIssues.slice(0, 5).map((issue) => ({
            id: issue.id,
            name: issue.name,
            description: issue.desc,
            status: issue.issueStatusId,
            statusName: issue.issueStatus?.name,
            statusColor: issue.issueStatus?.color,
            priority: issue.priorityNo,
            priorityOrder: issue.priorityOrder,
            owner: {
              id: issue.user.id,
              name: `${issue.user.firstName} ${issue.user.lastName}`,
              email: issue.user.email,
              jobTitle: issue.user.jobTitle,
            },
            team: {
              id: issue.team.id,
              name: issue.team.name,
              color: issue.team.color,
            },
            createdAt: issue.createdAt,
            statusUpdatedAt: issue.statusUpdatedAt,
          })),
        };
      })
    );

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              analysis: "level-10-meeting-issues",
              timeframe: timeframe,
              totalLevel10Meetings: level10Agendas.length,
              results: meetingIssues,
              summary: {
                totalOpenIssues: meetingIssues.reduce(
                  (sum, meeting) => sum + meeting.openIssues.length,
                  0
                ),
                meetingsWithIssues: meetingIssues.filter(
                  (meeting) => meeting.openIssues.length > 0
                ).length,
              },
            },
            null,
            2
          ),
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `Error analyzing Level 10 meeting issues: ${error.message}`,
        },
      ],
    };
  }
}

/**
 * Analyze meeting data
 */
async function analyzeMeetingData({ teamId, userId, timeframe }) {
  try {
    // Get meeting infos
    const meetingInfosQuery = `
      query {
        meetingInfos(filter: {stateId: {equalTo: "ACTIVE"}}) {
          nodes {
            id
            name
            desc
            meetingAgendaId
            teamId
            meetingInfoStatusId
            meetingRepeatsId
            createdAt
            ownerUserId
            repeatInterval
            repeatUnit
            selectedDays
            team {
              id
              name
              desc
              color
              isLeadership
            }
            meetingAgenda {
              id
              name
              desc
              meetingAgendaTypeId
              facilitatorUserId
              scribeUserId
            }
            owner {
              id
              firstName
              lastName
              email
              jobTitle
            }
            meetingInfoStatus {
              id
              name
              color
              type
              order
            }
          }
        }
      }
    `;

    const meetingInfosResult = await callSuccessCoGraphQL(meetingInfosQuery);
    if (!meetingInfosResult.ok) {
      return { content: [{ type: "text", text: meetingInfosResult.error }] };
    }

    const meetingInfos =
      meetingInfosResult.data?.data?.meetingInfos?.nodes || [];

    // Get actual meetings
    const meetingsQuery = `
      query {
        meetings(filter: {stateId: {equalTo: "ACTIVE"}}) {
          nodes {
            id
            meetingInfoId
            date
            startTime
            endTime
            averageRating
            totalPausedTimeInSecs
            meetingStatusId
            facilitatorUserId
            scribeUserId
            createdAt
            meetingInfo {
              id
              name
              desc
              teamId
              team {
                id
                name
                desc
                color
              }
            }
            facilitator {
              id
              firstName
              lastName
              email
              jobTitle
            }
            scribe {
              id
              firstName
              lastName
              email
              jobTitle
            }
            meetingStatus {
              id
              name
              order
            }
          }
        }
      }
    `;

    const meetingsResult = await callSuccessCoGraphQL(meetingsQuery);
    const meetings = meetingsResult.ok
      ? meetingsResult.data?.data?.meetings?.nodes || []
      : [];

    // Analyze meeting data
    const analysis = {
      meetingInfos: meetingInfos.map((info) => ({
        id: info.id,
        name: info.name,
        description: info.desc,
        team: {
          id: info.team.id,
          name: info.team.name,
          color: info.team.color,
          isLeadership: info.team.isLeadership,
        },
        agenda: info.meetingAgenda
          ? {
              id: info.meetingAgenda.id,
              name: info.meetingAgenda.name,
              type: info.meetingAgenda.meetingAgendaTypeId,
            }
          : null,
        owner: {
          id: info.owner.id,
          name: `${info.owner.firstName} ${info.owner.lastName}`,
          email: info.owner.email,
          jobTitle: info.owner.jobTitle,
        },
        status: info.meetingInfoStatus
          ? {
              id: info.meetingInfoStatus.id,
              name: info.meetingInfoStatus.name,
              color: info.meetingInfoStatus.color,
              type: info.meetingInfoStatus.type,
            }
          : null,
        repeatInterval: info.repeatInterval,
        repeatUnit: info.repeatUnit,
        selectedDays: info.selectedDays,
        createdAt: info.createdAt,
      })),
      meetings: meetings.map((meeting) => ({
        id: meeting.id,
        date: meeting.date,
        startTime: meeting.startTime,
        endTime: meeting.endTime,
        averageRating: meeting.averageRating,
        totalPausedTimeInSecs: meeting.totalPausedTimeInSecs,
        team: {
          id: meeting.meetingInfo.team.id,
          name: meeting.meetingInfo.team.name,
          color: meeting.meetingInfo.team.color,
        },
        facilitator: meeting.facilitator
          ? {
              id: meeting.facilitator.id,
              name: `${meeting.facilitator.firstName} ${meeting.facilitator.lastName}`,
              email: meeting.facilitator.email,
              jobTitle: meeting.facilitator.jobTitle,
            }
          : null,
        scribe: meeting.scribe
          ? {
              id: meeting.scribe.id,
              name: `${meeting.scribe.firstName} ${meeting.scribe.lastName}`,
              email: meeting.scribe.email,
              jobTitle: meeting.scribe.jobTitle,
            }
          : null,
        status: meeting.meetingStatus
          ? {
              id: meeting.meetingStatus.id,
              name: meeting.meetingStatus.name,
            }
          : null,
        createdAt: meeting.createdAt,
      })),
      summary: {
        totalMeetingInfos: meetingInfos.length,
        totalMeetings: meetings.length,
        averageRating:
          meetings.length > 0
            ? meetings.reduce((sum, m) => sum + (m.averageRating || 0), 0) /
              meetings.length
            : 0,
        teamsWithMeetings: [
          ...new Set(meetings.map((m) => m.meetingInfo.team.id)),
        ].length,
      },
    };

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(analysis, null, 2),
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `Error analyzing meeting data: ${error.message}`,
        },
      ],
    };
  }
}

/**
 * Analyze issue data
 */
async function analyzeIssueData({ teamId, userId, timeframe }) {
  try {
    const issuesQuery = `
      query {
        issues(filter: {stateId: {equalTo: "ACTIVE"}}) {
          nodes {
            id
            name
            desc
            issueStatusId
            teamId
            userId
            type
            priorityNo
            priorityOrder
            statusUpdatedAt
            meetingId
            createdAt
            user {
              id
              firstName
              lastName
              email
              jobTitle
            }
            team {
              id
              name
              desc
              color
              isLeadership
            }
            issueStatus {
              id
              name
              color
              type
              order
            }
          }
        }
      }
    `;

    const issuesResult = await callSuccessCoGraphQL(issuesQuery);
    if (!issuesResult.ok) {
      return { content: [{ type: "text", text: issuesResult.error }] };
    }

    const issues = issuesResult.data?.data?.issues?.nodes || [];

    // Filter by team if specified
    const filteredIssues = teamId
      ? issues.filter((issue) => issue.teamId === teamId)
      : issues;

    // Filter by user if specified
    const finalIssues = userId
      ? filteredIssues.filter((issue) => issue.userId === userId)
      : filteredIssues;

    // Group by status
    const statusGroups = {};
    finalIssues.forEach((issue) => {
      const status = issue.issueStatusId;
      if (!statusGroups[status]) {
        statusGroups[status] = {
          statusId: status,
          statusName: issue.issueStatus?.name,
          statusColor: issue.issueStatus?.color,
          statusType: issue.issueStatus?.type,
          issues: [],
        };
      }
      statusGroups[status].issues.push({
        id: issue.id,
        name: issue.name,
        description: issue.desc,
        type: issue.type,
        priority: issue.priorityNo,
        priorityOrder: issue.priorityOrder,
        owner: {
          id: issue.user.id,
          name: `${issue.user.firstName} ${issue.user.lastName}`,
          email: issue.user.email,
          jobTitle: issue.user.jobTitle,
        },
        team: {
          id: issue.team.id,
          name: issue.team.name,
          color: issue.team.color,
          isLeadership: issue.team.isLeadership,
        },
        createdAt: issue.createdAt,
        statusUpdatedAt: issue.statusUpdatedAt,
        meetingId: issue.meetingId,
      });
    });

    // Sort issues within each status by priority
    Object.values(statusGroups).forEach((group) => {
      group.issues.sort((a, b) => (a.priority || 999) - (b.priority || 999));
    });

    const analysis = {
      summary: {
        totalIssues: finalIssues.length,
        teamFilter: teamId || "all",
        userFilter: userId || "all",
        timeframe: timeframe,
        statusBreakdown: Object.keys(statusGroups).map((statusId) => ({
          statusId,
          statusName: statusGroups[statusId].statusName,
          statusColor: statusGroups[statusId].statusColor,
          count: statusGroups[statusId].issues.length,
        })),
      },
      issuesByStatus: statusGroups,
      topPriorityIssues: finalIssues
        .filter((issue) => issue.priorityNo && issue.priorityNo < 10)
        .sort((a, b) => (a.priorityNo || 999) - (b.priorityNo || 999))
        .slice(0, 10)
        .map((issue) => ({
          id: issue.id,
          name: issue.name,
          description: issue.desc,
          priority: issue.priorityNo,
          owner: {
            id: issue.user.id,
            name: `${issue.user.firstName} ${issue.user.lastName}`,
            email: issue.user.email,
            jobTitle: issue.user.jobTitle,
          },
          team: {
            id: issue.team.id,
            name: issue.team.name,
            color: issue.team.color,
          },
          status: {
            id: issue.issueStatusId,
            name: issue.issueStatus?.name,
            color: issue.issueStatus?.color,
          },
          createdAt: issue.createdAt,
          statusUpdatedAt: issue.statusUpdatedAt,
        })),
    };

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(analysis, null, 2),
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `Error analyzing issue data: ${error.message}`,
        },
      ],
    };
  }
}

/**
 * Search Success.co data (supports: teams, users, todos, rocks, meetings, issues, headlines, visions)
 * @param {Object} args - Arguments object
 * @param {string} args.query - What to look up, e.g., 'list my teams', 'show users', 'find todos', 'get meetings', 'show vision'
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

  const wantsVisions =
    /\b(vision|visions|core values|core focus|three year goals|3 year goals|marketing strategy|market strategy)\b/.test(
      q
    ) ||
    /show.*vision/.test(q) ||
    /list.*vision/.test(q) ||
    /find.*vision/.test(q) ||
    /get.*vision/.test(q) ||
    /leadership.*team/.test(q) ||
    /current.*vision/.test(q);

  if (wantsTeams) {
    const gql = `
      query {
        teams(filter: {stateId: {equalTo: "ACTIVE"}}) {
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
        users(filter: {stateId: {equalTo: "ACTIVE"}}) {
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
        todos(filter: {stateId: {equalTo: "ACTIVE"}}) {
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
        rocks(filter: {stateId: {equalTo: "ACTIVE"}}) {
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
        meetings(filter: {stateId: {equalTo: "ACTIVE"}}) {
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
        issues(filter: {stateId: {equalTo: "ACTIVE"}}) {
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
        headlines(filter: {stateId: {equalTo: "ACTIVE"}}) {
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

  if (wantsVisions) {
    // First get leadership team visions
    const visionsGql = `
      query {
        visions(filter: {stateId: {equalTo: "ACTIVE"}, isLeadership: {equalTo: true}}) {
          nodes {
            id
            teamId
            isLeadership
            createdAt
          }
          totalCount
        }
      }
    `;
    const visionsResult = await callSuccessCoGraphQL(visionsGql);
    if (!visionsResult.ok)
      return { content: [{ type: "text", text: visionsResult.error }] };

    const { data: visionsData } = visionsResult;
    const leadershipVisions = visionsData?.data?.visions?.nodes || [];

    if (leadershipVisions.length === 0) {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              kind: "visions",
              totalCount: 0,
              hits: [],
              message: "No leadership team visions found",
            }),
          },
        ],
      };
    }

    // Get the first leadership vision (assuming there's typically one)
    const leadershipVision = leadershipVisions[0];

    // Get core values for this vision
    const coreValuesGql = `
      query {
        visionCoreValues(filter: {stateId: {equalTo: "ACTIVE"}, visionId: {equalTo: "${leadershipVision.id}"}}) {
          nodes {
            id
            name
            cascadeAll
            visionId
          }
          totalCount
        }
      }
    `;
    const coreValuesResult = await callSuccessCoGraphQL(coreValuesGql);

    // Get core focus types for this vision
    const coreFocusGql = `
      query {
        visionCoreFocusTypes(filter: {stateId: {equalTo: "ACTIVE"}, visionId: {equalTo: "${leadershipVision.id}"}}) {
          nodes {
            id
            name
            coreFocusName
            desc
            type
            visionId
          }
          totalCount
        }
      }
    `;
    const coreFocusResult = await callSuccessCoGraphQL(coreFocusGql);

    // Get three year goals for this vision
    const goalsGql = `
      query {
        visionThreeYearGoals(filter: {stateId: {equalTo: "ACTIVE"}, visionId: {equalTo: "${leadershipVision.id}"}}) {
          nodes {
            id
            name
            futureDate
            type
            visionId
          }
          totalCount
        }
      }
    `;
    const goalsResult = await callSuccessCoGraphQL(goalsGql);

    // Get market strategies for this vision
    const strategiesGql = `
      query {
        visionMarketStrategies(filter: {stateId: {equalTo: "ACTIVE"}, visionId: {equalTo: "${leadershipVision.id}"}}) {
          nodes {
            id
            name
            idealCustomer
            idealCustomerDesc
            provenProcess
            provenProcessDesc
            guarantee
            guaranteeDesc
            uniqueValueProposition
            visionId
          }
          totalCount
        }
      }
    `;
    const strategiesResult = await callSuccessCoGraphQL(strategiesGql);

    const hits = [];

    // Add core values
    if (
      coreValuesResult.ok &&
      coreValuesResult.data?.data?.visionCoreValues?.nodes
    ) {
      coreValuesResult.data.data.visionCoreValues.nodes.forEach((cv) => {
        hits.push({
          id: String(cv.id),
          title: `Core Value: ${cv.name}`,
          snippet: `Vision ID: ${cv.visionId}`,
          type: "core_value",
        });
      });
    }

    // Add core focus
    if (
      coreFocusResult.ok &&
      coreFocusResult.data?.data?.visionCoreFocusTypes?.nodes
    ) {
      coreFocusResult.data.data.visionCoreFocusTypes.nodes.forEach((cf) => {
        hits.push({
          id: String(cf.id),
          title: `Core Focus: ${cf.name}`,
          snippet: cf.desc || cf.coreFocusName || `Type: ${cf.type}`,
          type: "core_focus",
        });
      });
    }

    // Add three year goals
    if (goalsResult.ok && goalsResult.data?.data?.visionThreeYearGoals?.nodes) {
      goalsResult.data.data.visionThreeYearGoals.nodes.forEach((goal) => {
        hits.push({
          id: String(goal.id),
          title: `3-Year Goal: ${goal.name}`,
          snippet: `Target Date: ${goal.futureDate} | Type: ${goal.type}`,
          type: "three_year_goal",
        });
      });
    }

    // Add market strategies
    if (
      strategiesResult.ok &&
      strategiesResult.data?.data?.visionMarketStrategies?.nodes
    ) {
      strategiesResult.data.data.visionMarketStrategies.nodes.forEach(
        (strategy) => {
          hits.push({
            id: String(strategy.id),
            title: `Marketing Strategy: ${strategy.name}`,
            snippet: `Ideal Customer: ${strategy.idealCustomer} | Value Prop: ${strategy.uniqueValueProposition}`,
            type: "market_strategy",
          });
        }
      );
    }

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            kind: "visions",
            totalCount: hits.length,
            hits,
            visionId: leadershipVision.id,
            teamId: leadershipVision.teamId,
            isLeadership: leadershipVision.isLeadership,
          }),
        },
      ],
    };
  }

  return {
    content: [
      {
        type: "text",
        text: "I support searching for: teams, users, todos, rocks, meetings, issues, headlines, visions. Try: 'List my teams', 'Show users', 'Find todos', 'Get meetings', 'Show vision', etc.",
      },
    ],
  };
}

/**
 * Fetch a single Success.co item by id returned from search
 * @param {Object} args - Arguments object
 * @param {string} args.id - The id from a previous search hit
 * @returns {Promise<{content: Array<{type: string, text: string}>}>}
 */
export async function fetch(args) {
  const { id } = args;

  // Accept both raw ids like "123" and URIs like "success-co://teams/123", "success-co://users/123", etc.
  const teamMatch = /^success-co:\/\/teams\/(.+)$/.exec(id);
  const userMatch = /^success-co:\/\/users\/(.+)$/.exec(id);
  const todoMatch = /^success-co:\/\/todos\/(.+)$/.exec(id);
  const rockMatch = /^success-co:\/\/rocks\/(.+)$/.exec(id);
  const meetingMatch = /^success-co:\/\/meetings\/(.+)$/.exec(id);
  const issueMatch = /^success-co:\/\/issues\/(.+)$/.exec(id);
  const headlineMatch = /^success-co:\/\/headlines\/(.+)$/.exec(id);
  const visionMatch = /^success-co:\/\/visions\/(.+)$/.exec(id);
  const coreValueMatch = /^success-co:\/\/visionCoreValues\/(.+)$/.exec(id);
  const coreFocusMatch = /^success-co:\/\/visionCoreFocusTypes\/(.+)$/.exec(id);
  const goalMatch = /^success-co:\/\/visionThreeYearGoals\/(.+)$/.exec(id);
  const strategyMatch = /^success-co:\/\/visionMarketStrategies\/(.+)$/.exec(
    id
  );

  const teamId = teamMatch ? teamMatch[1] : null;
  const userId = userMatch ? userMatch[1] : null;
  const todoId = todoMatch ? todoMatch[1] : null;
  const rockId = rockMatch ? rockMatch[1] : null;
  const meetingId = meetingMatch ? meetingMatch[1] : null;
  const issueId = issueMatch ? issueMatch[1] : null;
  const headlineId = headlineMatch ? headlineMatch[1] : null;
  const visionId = visionMatch ? visionMatch[1] : null;
  const coreValueId = coreValueMatch ? coreValueMatch[1] : null;
  const coreFocusId = coreFocusMatch ? coreFocusMatch[1] : null;
  const goalId = goalMatch ? goalMatch[1] : null;
  const strategyId = strategyMatch ? strategyMatch[1] : null;
  const rawId =
    teamId ||
    userId ||
    todoId ||
    rockId ||
    meetingId ||
    issueId ||
    headlineId ||
    visionId ||
    coreValueId ||
    coreFocusId ||
    goalId ||
    strategyId ||
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
    const url = getGraphQLEndpoint();
    const response = await globalThis.fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query, variables }),
    });

    if (response.ok) {
      const data = await response.json();
      // Log successful request
      logGraphQLCall(url, query, data, response.status);
      if (!data.errors) {
        return data;
      }
    } else {
      // Log failed request
      logGraphQLCall(url, query, null, response.status);
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
        content: [{ type: "text", text: JSON.stringify(result.data.meeting) }],
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
        content: [{ type: "text", text: JSON.stringify(result.data.headline) }],
      };
    }
  }

  // Try to fetch as vision
  if (
    visionId ||
    (!teamId &&
      !userId &&
      !todoId &&
      !rockId &&
      !meetingId &&
      !issueId &&
      !headlineId &&
      !coreValueId &&
      !coreFocusId &&
      !goalId &&
      !strategyId &&
      !teamMatch &&
      !userMatch &&
      !todoMatch &&
      !rockMatch &&
      !meetingMatch &&
      !issueMatch &&
      !headlineMatch &&
      !visionMatch &&
      !coreValueMatch &&
      !coreFocusMatch &&
      !goalMatch &&
      !strategyMatch)
  ) {
    const gql = `
      query ($id: ID!) {
        vision(id: $id) {
          id
          teamId
          isLeadership
          createdAt
          stateId
          companyId
        }
      }
    `;

    const result = await makeGraphQLRequest(gql, { id: rawId });
    if (result?.data?.vision) {
      return {
        content: [{ type: "text", text: JSON.stringify(result.data.vision) }],
      };
    }
  }

  // Try to fetch as vision core value
  if (
    coreValueId ||
    (!teamId &&
      !userId &&
      !todoId &&
      !rockId &&
      !meetingId &&
      !issueId &&
      !headlineId &&
      !visionId &&
      !coreFocusId &&
      !goalId &&
      !strategyId &&
      !teamMatch &&
      !userMatch &&
      !todoMatch &&
      !rockMatch &&
      !meetingMatch &&
      !issueMatch &&
      !headlineMatch &&
      !visionMatch &&
      !coreValueMatch &&
      !coreFocusMatch &&
      !goalMatch &&
      !strategyMatch)
  ) {
    const gql = `
      query ($id: ID!) {
        visionCoreValue(id: $id) {
          id
          name
          cascadeAll
          visionId
          createdAt
          stateId
          companyId
        }
      }
    `;

    const result = await makeGraphQLRequest(gql, { id: rawId });
    if (result?.data?.visionCoreValue) {
      return {
        content: [
          { type: "text", text: JSON.stringify(result.data.visionCoreValue) },
        ],
      };
    }
  }

  // Try to fetch as vision core focus type
  if (
    coreFocusId ||
    (!teamId &&
      !userId &&
      !todoId &&
      !rockId &&
      !meetingId &&
      !issueId &&
      !headlineId &&
      !visionId &&
      !coreValueId &&
      !goalId &&
      !strategyId &&
      !teamMatch &&
      !userMatch &&
      !todoMatch &&
      !rockMatch &&
      !meetingMatch &&
      !issueMatch &&
      !headlineMatch &&
      !visionMatch &&
      !coreValueMatch &&
      !coreFocusMatch &&
      !goalMatch &&
      !strategyMatch)
  ) {
    const gql = `
      query ($id: ID!) {
        visionCoreFocusType(id: $id) {
          id
          name
          coreFocusName
          desc
          src
          type
          visionId
          cascadeAll
          createdAt
          stateId
          companyId
        }
      }
    `;

    const result = await makeGraphQLRequest(gql, { id: rawId });
    if (result?.data?.visionCoreFocusType) {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result.data.visionCoreFocusType),
          },
        ],
      };
    }
  }

  // Try to fetch as vision three year goal
  if (
    goalId ||
    (!teamId &&
      !userId &&
      !todoId &&
      !rockId &&
      !meetingId &&
      !issueId &&
      !headlineId &&
      !visionId &&
      !coreValueId &&
      !coreFocusId &&
      !strategyId &&
      !teamMatch &&
      !userMatch &&
      !todoMatch &&
      !rockMatch &&
      !meetingMatch &&
      !issueMatch &&
      !headlineMatch &&
      !visionMatch &&
      !coreValueMatch &&
      !coreFocusMatch &&
      !goalMatch &&
      !strategyMatch)
  ) {
    const gql = `
      query ($id: ID!) {
        visionThreeYearGoal(id: $id) {
          id
          name
          futureDate
          cascadeAll
          visionId
          type
          createdAt
          stateId
          companyId
        }
      }
    `;

    const result = await makeGraphQLRequest(gql, { id: rawId });
    if (result?.data?.visionThreeYearGoal) {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result.data.visionThreeYearGoal),
          },
        ],
      };
    }
  }

  // Try to fetch as vision market strategy
  if (
    strategyId ||
    (!teamId &&
      !userId &&
      !todoId &&
      !rockId &&
      !meetingId &&
      !issueId &&
      !headlineId &&
      !visionId &&
      !coreValueId &&
      !coreFocusId &&
      !goalId &&
      !teamMatch &&
      !userMatch &&
      !todoMatch &&
      !rockMatch &&
      !meetingMatch &&
      !issueMatch &&
      !headlineMatch &&
      !visionMatch &&
      !coreValueMatch &&
      !coreFocusMatch &&
      !goalMatch &&
      !strategyMatch)
  ) {
    const gql = `
      query ($id: ID!) {
        visionMarketStrategy(id: $id) {
          id
          name
          cascadeAll
          visionId
          idealCustomer
          idealCustomerDesc
          provenProcess
          provenProcessDesc
          guarantee
          guaranteeDesc
          uniqueValueProposition
          showProvenProcess
          showGuarantee
          isCustom
          createdAt
          stateId
          companyId
        }
      }
    `;

    const result = await makeGraphQLRequest(gql, { id: rawId });
    if (result?.data?.visionMarketStrategy) {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result.data.visionMarketStrategy),
          },
        ],
      };
    }
  }

  // If none worked, return error
  return {
    content: [
      {
        type: "text",
        text: `No team, user, todo, rock, meeting, issue, headline, vision, core value, core focus, goal, or strategy found for id ${rawId}`,
      },
    ],
  };
}

// ---------- Data Fields tool (Scorecard KPIs) ---------------------------------

export async function getDataFields(args) {
  const {
    first = 50,
    offset = 0,
    stateId = "ACTIVE",
    teamId,
    userId,
    type,
  } = args;

  if (!validateStateId(stateId)) {
    return {
      content: [
        {
          type: "text",
          text: "Error: Invalid stateId. Must be 'ACTIVE' or 'INACTIVE'",
        },
      ],
    };
  }

  const filterStr = [`stateId: {equalTo: "${stateId}"}`]
    .filter(Boolean)
    .join(", ");

  const query = `
    query {
      dataFields(${first !== undefined ? `first: ${first}` : ""}${
    offset !== undefined ? `, offset: ${offset}` : ""
  }${filterStr ? `, filter: {${filterStr}}` : ""}) {
        nodes {
          id
          name
          desc
          userId
          type
          unitType
          unitComparison
          goalTarget
          goalTargetEnd
          goalCurrency
          showAverage
          showTotal
          autoFormat
          autoRoundDecimals
          dataFieldStatusId
          statusUpdatedAt
          createdAt
          stateId
          formula
          order
        }
        totalCount
      }
    }
  `;

  const result = await callSuccessCoGraphQL(query);

  if (!result.ok) {
    return {
      content: [
        {
          type: "text",
          text: `Error fetching data fields: ${result.error}`,
        },
      ],
    };
  }

  const dataFields = result.data?.data?.dataFields?.nodes || [];

  // Apply additional filters if provided
  let filteredDataFields = dataFields;
  if (teamId) {
    // Note: This would require a separate query to get teamsOnDataFields relationships
    // For now, we'll return all data fields and let the client filter
  }
  if (userId) {
    filteredDataFields = filteredDataFields.filter(
      (field) => field.userId === userId
    );
  }
  if (type) {
    filteredDataFields = filteredDataFields.filter(
      (field) => field.type === type
    );
  }

  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(
          {
            dataFields: filteredDataFields,
            totalCount: result.data?.data?.dataFields?.totalCount || 0,
          },
          null,
          2
        ),
      },
    ],
  };
}

// ---------- Data Values tool (Scorecard metrics) -----------------------------

export async function getDataValues(args) {
  const {
    first = 50,
    offset = 0,
    stateId = "ACTIVE",
    dataFieldId,
    startDate,
    endDate,
  } = args;

  if (!validateStateId(stateId)) {
    return {
      content: [
        {
          type: "text",
          text: "Error: Invalid stateId. Must be 'ACTIVE' or 'INACTIVE'",
        },
      ],
    };
  }

  const filterStr = [`stateId: {equalTo: "${stateId}"}`]
    .filter(Boolean)
    .join(", ");

  const query = `
    query {
      dataValues(${first !== undefined ? `first: ${first}` : ""}${
    offset !== undefined ? `, offset: ${offset}` : ""
  }${filterStr ? `, filter: {${filterStr}}` : ""}) {
        nodes {
          id
          dataFieldId
          startDate
          value
          createdAt
          stateId
          customGoalTarget
          customGoalTargetEnd
          note
        }
        totalCount
      }
    }
  `;

  const result = await callSuccessCoGraphQL(query);

  if (!result.ok) {
    return {
      content: [
        {
          type: "text",
          text: `Error fetching data values: ${result.error}`,
        },
      ],
    };
  }

  let dataValues = result.data?.data?.dataValues?.nodes || [];

  // Apply additional filters if provided
  if (dataFieldId) {
    dataValues = dataValues.filter(
      (value) => value.dataFieldId === dataFieldId
    );
  }
  if (startDate) {
    const start = new Date(startDate);
    dataValues = dataValues.filter(
      (value) => new Date(value.startDate) >= start
    );
  }
  if (endDate) {
    const end = new Date(endDate);
    dataValues = dataValues.filter((value) => new Date(value.startDate) <= end);
  }

  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(
          {
            dataValues,
            totalCount: result.data?.data?.dataValues?.totalCount || 0,
          },
          null,
          2
        ),
      },
    ],
  };
}

// ---------- Teams on Data Fields tool (Scorecard team assignments) ------------

export async function getTeamsOnDataFields(args) {
  const {
    first = 50,
    offset = 0,
    stateId = "ACTIVE",
    teamId,
    dataFieldId,
  } = args;

  if (!validateStateId(stateId)) {
    return {
      content: [
        {
          type: "text",
          text: "Error: Invalid stateId. Must be 'ACTIVE' or 'INACTIVE'",
        },
      ],
    };
  }

  const filterStr = [`stateId: {equalTo: "${stateId}"}`]
    .filter(Boolean)
    .join(", ");

  const query = `
    query {
      teamsOnDataFields(${first !== undefined ? `first: ${first}` : ""}${
    offset !== undefined ? `, offset: ${offset}` : ""
  }${filterStr ? `, filter: {${filterStr}}` : ""}) {
        nodes {
          id
          dataFieldId
          teamId
          createdAt
          stateId
        }
        totalCount
      }
    }
  `;

  const result = await callSuccessCoGraphQL(query);

  if (!result.ok) {
    return {
      content: [
        {
          type: "text",
          text: `Error fetching teams on data fields: ${result.error}`,
        },
      ],
    };
  }

  let teamsOnDataFields = result.data?.data?.teamsOnDataFields?.nodes || [];

  // Apply additional filters if provided
  if (teamId) {
    teamsOnDataFields = teamsOnDataFields.filter(
      (rel) => rel.teamId === teamId
    );
  }
  if (dataFieldId) {
    teamsOnDataFields = teamsOnDataFields.filter(
      (rel) => rel.dataFieldId === dataFieldId
    );
  }

  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(
          {
            teamsOnDataFields,
            totalCount: result.data?.data?.teamsOnDataFields?.totalCount || 0,
          },
          null,
          2
        ),
      },
    ],
  };
}

// ---------- Data Field Statuses tool ------------------------------------------

export async function getDataFieldStatuses(args) {
  const { first = 50, offset = 0, stateId = "ACTIVE" } = args;

  if (!validateStateId(stateId)) {
    return {
      content: [
        {
          type: "text",
          text: "Error: Invalid stateId. Must be 'ACTIVE' or 'INACTIVE'",
        },
      ],
    };
  }

  const filterStr = [`stateId: {equalTo: "${stateId}"}`]
    .filter(Boolean)
    .join(", ");

  const query = `
    query {
      dataFieldStatuses(${first !== undefined ? `first: ${first}` : ""}${
    offset !== undefined ? `, offset: ${offset}` : ""
  }${filterStr ? `, filter: {${filterStr}}` : ""}) {
        nodes {
          id
          name
          color
          order
          createdAt
          stateId
        }
        totalCount
      }
    }
  `;

  const result = await callSuccessCoGraphQL(query);

  if (!result.ok) {
    return {
      content: [
        {
          type: "text",
          text: `Error fetching data field statuses: ${result.error}`,
        },
      ],
    };
  }

  const dataFieldStatuses = result.data?.data?.dataFieldStatuses?.nodes || [];

  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(
          {
            dataFieldStatuses,
            totalCount: result.data?.data?.dataFieldStatuses?.totalCount || 0,
          },
          null,
          2
        ),
      },
    ],
  };
}

// ---------- Scorecard Metrics Analysis tool ------------------------------------

export async function analyzeScorecardMetrics(args) {
  const { query, teamId, userId, timeframe, weeks = 12 } = args;

  if (!query) {
    return {
      content: [
        {
          type: "text",
          text: "Error: Query is required for Scorecard analysis",
        },
      ],
    };
  }

  // Parse the query to understand what analysis is needed
  const queryLower = query.toLowerCase();

  if (
    queryLower.includes("scorecard") ||
    queryLower.includes("kpi") ||
    queryLower.includes("metric")
  ) {
    return await analyzeScorecardData({ teamId, userId, timeframe, weeks });
  }

  if (
    queryLower.includes("below target") ||
    queryLower.includes("under target") ||
    queryLower.includes("missed target")
  ) {
    return await analyzeKPIBelowTarget({ teamId, userId, timeframe, weeks });
  }

  if (
    queryLower.includes("trend") ||
    queryLower.includes("performance") ||
    queryLower.includes("progress")
  ) {
    return await analyzeKPITrends({ teamId, userId, timeframe, weeks });
  }

  // Default to general scorecard analysis
  return await analyzeScorecardData({ teamId, userId, timeframe, weeks });
}

// Helper function to analyze general scorecard data
async function analyzeScorecardData({ teamId, userId, timeframe, weeks }) {
  try {
    // Get data fields (KPIs)
    const dataFieldsResult = await getDataFields({ teamId, userId });
    const dataFieldsData = JSON.parse(dataFieldsResult.content[0].text);
    const dataFields = dataFieldsData.dataFields || [];

    // Get teams on data fields relationships
    const teamsOnDataFieldsResult = await getTeamsOnDataFields({ teamId });
    const teamsOnDataFieldsData = JSON.parse(
      teamsOnDataFieldsResult.content[0].text
    );
    const teamsOnDataFields = teamsOnDataFieldsData.teamsOnDataFields || [];

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - weeks * 7);

    // Get data values for the time period
    const dataValuesResult = await getDataValues({
      startDate: startDate.toISOString().split("T")[0],
      endDate: endDate.toISOString().split("T")[0],
    });
    const dataValuesData = JSON.parse(dataValuesResult.content[0].text);
    const dataValues = dataValuesData.dataValues || [];

    // Group data values by data field
    const valuesByField = {};
    dataValues.forEach((value) => {
      if (!valuesByField[value.dataFieldId]) {
        valuesByField[value.dataFieldId] = [];
      }
      valuesByField[value.dataFieldId].push(value);
    });

    // Build analysis
    const analysis = {
      summary: {
        totalKPIs: dataFields.length,
        timeRange: `${weeks} weeks`,
        startDate: startDate.toISOString().split("T")[0],
        endDate: endDate.toISOString().split("T")[0],
        teamFilter: teamId || "All teams",
        userFilter: userId || "All users",
      },
      kpis: dataFields.map((field) => {
        const values = valuesByField[field.id] || [];
        const latestValue =
          values.length > 0 ? values[values.length - 1] : null;

        return {
          id: field.id,
          name: field.name,
          description: field.desc,
          type: field.type,
          unitType: field.unitType,
          goalTarget: field.goalTarget,
          goalTargetEnd: field.goalTargetEnd,
          goalCurrency: field.goalCurrency,
          latestValue: latestValue
            ? {
                value: latestValue.value,
                date: latestValue.startDate,
                note: latestValue.note,
              }
            : null,
          totalDataPoints: values.length,
          dataPoints: values.map((v) => ({
            date: v.startDate,
            value: v.value,
            note: v.note,
          })),
        };
      }),
    };

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(analysis, null, 2),
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `Error analyzing scorecard data: ${error.message}`,
        },
      ],
    };
  }
}

// Helper function to analyze KPIs below target
async function analyzeKPIBelowTarget({ teamId, userId, timeframe, weeks }) {
  try {
    // Get scorecard data first
    const scorecardResult = await analyzeScorecardData({
      teamId,
      userId,
      timeframe,
      weeks,
    });
    const scorecardData = JSON.parse(scorecardResult.content[0].text);

    const belowTargetKPIs = [];

    scorecardData.kpis.forEach((kpi) => {
      if (kpi.latestValue && kpi.goalTarget) {
        const currentValue = parseFloat(kpi.latestValue.value);
        const targetValue = parseFloat(kpi.goalTarget);

        if (!isNaN(currentValue) && !isNaN(targetValue)) {
          const isBelowTarget =
            kpi.unitComparison === "GREATER_THAN"
              ? currentValue < targetValue
              : currentValue > targetValue;

          if (isBelowTarget) {
            belowTargetKPIs.push({
              ...kpi,
              currentValue,
              targetValue,
              variance: Math.abs(currentValue - targetValue),
              variancePercent: Math.abs(
                ((currentValue - targetValue) / targetValue) * 100
              ),
            });
          }
        }
      }
    });

    const analysis = {
      summary: {
        totalKPIsAnalyzed: scorecardData.kpis.length,
        kpisBelowTarget: belowTargetKPIs.length,
        timeRange: scorecardData.summary.timeRange,
        teamFilter: scorecardData.summary.teamFilter,
        userFilter: scorecardData.summary.userFilter,
      },
      belowTargetKPIs: belowTargetKPIs.sort(
        (a, b) => b.variancePercent - a.variancePercent
      ),
    };

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(analysis, null, 2),
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `Error analyzing KPIs below target: ${error.message}`,
        },
      ],
    };
  }
}

// Helper function to analyze KPI trends
async function analyzeKPITrends({ teamId, userId, timeframe, weeks }) {
  try {
    // Get scorecard data first
    const scorecardResult = await analyzeScorecardData({
      teamId,
      userId,
      timeframe,
      weeks,
    });
    const scorecardData = JSON.parse(scorecardResult.content[0].text);

    const trendAnalysis = scorecardData.kpis.map((kpi) => {
      const values = kpi.dataPoints
        .map((dp) => ({
          date: new Date(dp.date),
          value: parseFloat(dp.value),
        }))
        .filter((dp) => !isNaN(dp.value))
        .sort((a, b) => a.date - b.date);

      let trend = "stable";
      let trendStrength = 0;

      if (values.length >= 2) {
        const firstValue = values[0].value;
        const lastValue = values[values.length - 1].value;
        const change = lastValue - firstValue;
        const changePercent = (change / firstValue) * 100;

        trendStrength = Math.abs(changePercent);

        if (changePercent > 5) {
          trend = "improving";
        } else if (changePercent < -5) {
          trend = "declining";
        } else {
          trend = "stable";
        }
      }

      return {
        ...kpi,
        trend,
        trendStrength: Math.round(trendStrength * 100) / 100,
        dataPoints: values,
      };
    });

    const analysis = {
      summary: {
        totalKPIsAnalyzed: scorecardData.kpis.length,
        improvingKPIs: trendAnalysis.filter((kpi) => kpi.trend === "improving")
          .length,
        decliningKPIs: trendAnalysis.filter((kpi) => kpi.trend === "declining")
          .length,
        stableKPIs: trendAnalysis.filter((kpi) => kpi.trend === "stable")
          .length,
        timeRange: scorecardData.summary.timeRange,
        teamFilter: scorecardData.summary.teamFilter,
        userFilter: scorecardData.summary.userFilter,
      },
      kpiTrends: trendAnalysis.sort(
        (a, b) => b.trendStrength - a.trendStrength
      ),
    };

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(analysis, null, 2),
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `Error analyzing KPI trends: ${error.message}`,
        },
      ],
    };
  }
}

// ---------- Meeting Infos tool -------------------------------------------------

export async function getMeetingInfos(args) {
  const {
    first = 50,
    offset = 0,
    stateId = "ACTIVE",
    teamId,
    meetingInfoStatusId,
  } = args;

  const query = `
    query GetMeetingInfos($first: Int, $offset: Int, $stateId: String, $teamId: String, $meetingInfoStatusId: String) {
      meetingInfos(
        first: $first
        offset: $offset
        where: {
          stateId: { equals: $stateId }
          ${teamId ? "teamId: { equals: $teamId }" : ""}
          ${
            meetingInfoStatusId
              ? "meetingInfoStatusId: { equals: $meetingInfoStatusId }"
              : ""
          }
        }
        orderBy: { createdAt: desc }
      ) {
        id
        name
        desc
        meetingAgendaId
        teamId
        meetingInfoStatusId
        meetingRepeatsId
        createdAt
        isBulkUpdate
        stateId
        companyId
        ownerUserId
        repeatInterval
        repeatUnit
        selectedDays
        team {
          id
          name
          desc
          color
          isLeadership
        }
        meetingAgenda {
          id
          name
          desc
          meetingAgendaStatusId
          meetingRepeatsId
          builtIn
          meetingAgendaTypeId
          facilitatorUserId
          scribeUserId
        }
        owner {
          id
          firstName
          lastName
          email
          jobTitle
        }
        meetingInfoStatus {
          id
          name
          color
          type
          order
        }
      }
    }
  `;

  const variables = {
    first,
    offset,
    stateId,
    ...(teamId && { teamId }),
    ...(meetingInfoStatusId && { meetingInfoStatusId }),
  };

  return await callSuccessCoGraphQL(query, variables);
}

/**
 * Analyze Vision/Traction Organizer data
 */
async function analyzeVisionTractionOrganizer({ teamId, userId, timeframe }) {
  try {
    // Get all vision-related data
    const [
      visions,
      coreValues,
      coreFocusTypes,
      threeYearGoals,
      marketStrategies,
    ] = await Promise.all([
      getVisions({ first: 50, stateId: "ACTIVE", teamId }),
      getVisionCoreValues({ first: 50, stateId: "ACTIVE" }),
      getVisionCoreFocusTypes({ first: 50, stateId: "ACTIVE" }),
      getVisionThreeYearGoals({ first: 50, stateId: "ACTIVE" }),
      getVisionMarketStrategies({ first: 50, stateId: "ACTIVE" }),
    ]);

    // Parse the JSON responses
    const visionsData = JSON.parse(visions.content[0].text);
    const coreValuesData = JSON.parse(coreValues.content[0].text);
    const coreFocusData = JSON.parse(coreFocusTypes.content[0].text);
    const goalsData = JSON.parse(threeYearGoals.content[0].text);
    const strategiesData = JSON.parse(marketStrategies.content[0].text);

    // Filter by team if specified
    let filteredVisions = visionsData.results;
    if (teamId) {
      filteredVisions = visionsData.results.filter(
        (vision) => vision.teamId === teamId
      );
    }

    // Build comprehensive VTO summary
    let summary = `# Vision/Traction Organizer Summary\n\n`;

    if (filteredVisions.length > 0) {
      summary += `## Vision Overview\n`;
      summary += `Found ${filteredVisions.length} vision(s) for ${
        teamId ? "the specified team" : "the organization"
      }.\n\n`;

      filteredVisions.forEach((vision, index) => {
        summary += `### Vision ${index + 1}\n`;
        summary += `- **ID**: ${vision.id}\n`;
        summary += `- **Team ID**: ${vision.teamId}\n`;
        summary += `- **Leadership Team**: ${
          vision.isLeadership ? "Yes" : "No"
        }\n`;
        summary += `- **Created**: ${new Date(
          vision.createdAt
        ).toLocaleDateString()}\n`;
        summary += `- **Status**: ${vision.status}\n\n`;
      });
    }

    if (coreValuesData.results.length > 0) {
      summary += `## Core Values\n`;
      summary += `Found ${coreValuesData.results.length} core value(s):\n\n`;

      coreValuesData.results.forEach((value, index) => {
        summary += `### ${value.name}\n`;
        summary += `- **ID**: ${value.id}\n`;
        summary += `- **Vision ID**: ${value.visionId}\n`;
        summary += `- **Cascade All**: ${value.cascadeAll ? "Yes" : "No"}\n`;
        summary += `- **Created**: ${new Date(
          value.createdAt
        ).toLocaleDateString()}\n\n`;
      });
    }

    if (coreFocusData.results.length > 0) {
      summary += `## Core Focus Areas\n`;
      summary += `Found ${coreFocusData.results.length} core focus area(s):\n\n`;

      coreFocusData.results.forEach((focus, index) => {
        summary += `### ${focus.name}\n`;
        summary += `- **ID**: ${focus.id}\n`;
        summary += `- **Core Focus Name**: ${focus.coreFocusName}\n`;
        summary += `- **Description**: ${focus.description || "N/A"}\n`;
        summary += `- **Type**: ${focus.type}\n`;
        summary += `- **Vision ID**: ${focus.visionId}\n`;
        summary += `- **Created**: ${new Date(
          focus.createdAt
        ).toLocaleDateString()}\n\n`;
      });
    }

    if (goalsData.results.length > 0) {
      summary += `## Three-Year Goals\n`;
      summary += `Found ${goalsData.results.length} three-year goal(s):\n\n`;

      goalsData.results.forEach((goal, index) => {
        summary += `### ${goal.name}\n`;
        summary += `- **ID**: ${goal.id}\n`;
        summary += `- **Future Date**: ${
          goal.futureDate
            ? new Date(goal.futureDate).toLocaleDateString()
            : "N/A"
        }\n`;
        summary += `- **Type**: ${goal.type}\n`;
        summary += `- **Vision ID**: ${goal.visionId}\n`;
        summary += `- **Created**: ${new Date(
          goal.createdAt
        ).toLocaleDateString()}\n\n`;
      });
    }

    if (strategiesData.results.length > 0) {
      summary += `## Market Strategies\n`;
      summary += `Found ${strategiesData.results.length} market strateg(ies):\n\n`;

      strategiesData.results.forEach((strategy, index) => {
        summary += `### Strategy ${index + 1}\n`;
        summary += `- **ID**: ${strategy.id}\n`;
        summary += `- **Vision ID**: ${strategy.visionId}\n`;
        summary += `- **Custom**: ${strategy.isCustom ? "Yes" : "No"}\n`;
        summary += `- **Created**: ${new Date(
          strategy.createdAt
        ).toLocaleDateString()}\n\n`;
      });
    }

    // Add summary statistics
    summary += `## Summary Statistics\n`;
    summary += `- **Total Visions**: ${filteredVisions.length}\n`;
    summary += `- **Total Core Values**: ${coreValuesData.results.length}\n`;
    summary += `- **Total Core Focus Areas**: ${coreFocusData.results.length}\n`;
    summary += `- **Total Three-Year Goals**: ${goalsData.results.length}\n`;
    summary += `- **Total Market Strategies**: ${strategiesData.results.length}\n\n`;

    if (
      filteredVisions.length === 0 &&
      coreValuesData.results.length === 0 &&
      coreFocusData.results.length === 0 &&
      goalsData.results.length === 0 &&
      strategiesData.results.length === 0
    ) {
      summary += `⚠️ **No Vision/Traction Organizer data found.** This could mean:\n`;
      summary += `- No VTO data has been set up yet\n`;
      summary += `- The data is inactive or archived\n`;
      summary += `- There's an issue with data access permissions\n`;
    }

    return {
      content: [
        {
          type: "text",
          text: summary,
        },
      ],
    };
  } catch (error) {
    console.error("Error analyzing Vision/Traction Organizer:", error);
    return {
      content: [
        {
          type: "text",
          text: `Error analyzing Vision/Traction Organizer: ${error.message}`,
        },
      ],
    };
  }
}

/**
 * List Success.co issue statuses
 * @param {Object} args - Arguments object
 * @param {number} [args.first] - Optional page size
 * @param {number} [args.offset] - Optional offset
 * @param {string} [args.stateId] - Issue status state filter (defaults to 'ACTIVE')
 * @returns {Promise<{content: Array<{type: string, text: string}>}>}
 */
export async function getIssueStatuses(args) {
  const { first, offset, stateId = "ACTIVE" } = args;
  // Validate stateId
  const validation = validateStateId(stateId);
  if (!validation.isValid) {
    return {
      content: [{ type: "text", text: validation.error }],
    };
  }
  const filterStr = [
    `stateId: {equalTo: "${stateId}"}`,
    first !== undefined ? `first: ${first}` : "",
    offset !== undefined ? `offset: ${offset}` : "",
  ]
    .filter(Boolean)
    .join(", ");

  const query = `
    query {
      issueStatuses(${filterStr ? `filter: {${filterStr}}` : ""}) {
        nodes {
          id
          name
          color
          type
          order
          builtIn
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
          totalCount: data.data.issueStatuses.totalCount,
          results: data.data.issueStatuses.nodes.map((status) => ({
            id: status.id,
            name: status.name,
            color: status.color,
            type: status.type,
            order: status.order,
            builtIn: status.builtIn,
            createdAt: status.createdAt,
            status: status.stateId,
          })),
        }),
      },
    ],
  };
}
/**
 * List Success.co meeting agendas
 * @param {Object} args - Arguments object
 * @param {number} [args.first] - Optional page size
 * @param {number} [args.offset] - Optional offset
 * @param {string} [args.stateId] - Meeting agenda state filter (defaults to 'ACTIVE')
 * @param {string} [args.teamId] - Filter by team ID
 * @param {string} [args.meetingAgendaStatusId] - Filter by meeting agenda status ID
 * @param {string} [args.meetingAgendaTypeId] - Filter by meeting agenda type ID
 * @returns {Promise<{content: Array<{type: string, text: string}>}>}
 */
export async function getMeetingAgendas(args) {
  const {
    first = 50,
    offset = 0,
    stateId = "ACTIVE",
    teamId,
    meetingAgendaStatusId,
    meetingAgendaTypeId,
  } = args;

  const filterParts = [`stateId: {equalTo: "${stateId}"}`];
  if (teamId) filterParts.push(`teamId: {equalTo: "${teamId}"}`);
  if (meetingAgendaStatusId)
    filterParts.push(
      `meetingAgendaStatusId: {equalTo: "${meetingAgendaStatusId}"}`
    );
  if (meetingAgendaTypeId)
    filterParts.push(
      `meetingAgendaTypeId: {equalTo: "${meetingAgendaTypeId}"}`
    );

  const filterStr = filterParts.join(", ");

  const query = `
    query {
      meetingAgendas(filter: {${filterStr}}, first: ${first}, offset: ${offset}) {
        nodes {
          id
          name
          desc
          teamId
          meetingAgendaStatusId
          meetingAgendaTypeId
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
          totalCount: data.data.meetingAgendas.totalCount,
          results: data.data.meetingAgendas.nodes.map((agenda) => ({
            id: agenda.id,
            name: agenda.name,
            description: agenda.desc,
            teamId: agenda.teamId,
            meetingAgendaStatusId: agenda.meetingAgendaStatusId,
            meetingAgendaTypeId: agenda.meetingAgendaTypeId,
            createdAt: agenda.createdAt,
            status: agenda.stateId,
          })),
        }),
      },
    ],
  };
}

/**
 * List Success.co meeting agenda sections
 * @param {Object} args - Arguments object
 * @param {number} [args.first] - Optional page size
 * @param {number} [args.offset] - Optional offset
 * @param {string} [args.stateId] - Meeting agenda section state filter (defaults to 'ACTIVE')
 * @param {string} [args.meetingAgendaId] - Filter by meeting agenda ID
 * @param {string} [args.type] - Filter by section type
 * @returns {Promise<{content: Array<{type: string, text: string}>}>}
 */
export async function getMeetingAgendaSections(args) {
  const {
    first = 50,
    offset = 0,
    stateId = "ACTIVE",
    meetingAgendaId,
    type,
  } = args;

  const filterParts = [`stateId: {equalTo: "${stateId}"}`];
  if (meetingAgendaId)
    filterParts.push(`meetingAgendaId: {equalTo: "${meetingAgendaId}"}`);
  if (type) filterParts.push(`type: {equalTo: "${type}"}`);

  const filterStr = filterParts.join(", ");

  const query = `
    query {
      meetingAgendaSections(filter: {${filterStr}}, first: ${first}, offset: ${offset}) {
        nodes {
          id
          name
          desc
          meetingAgendaId
          type
          order
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
          totalCount: data.data.meetingAgendaSections.totalCount,
          results: data.data.meetingAgendaSections.nodes.map((section) => ({
            id: section.id,
            name: section.name,
            description: section.desc,
            meetingAgendaId: section.meetingAgendaId,
            type: section.type,
            order: section.order,
            createdAt: section.createdAt,
            status: section.stateId,
          })),
        }),
      },
    ],
  };
}

/**
 * List Success.co meeting info statuses
 * @param {Object} args - Arguments object
 * @param {number} [args.first] - Optional page size
 * @param {number} [args.offset] - Optional offset
 * @param {string} [args.stateId] - Meeting info status state filter (defaults to 'ACTIVE')
 * @returns {Promise<{content: Array<{type: string, text: string}>}>}
 */
export async function getMeetingInfoStatuses(args) {
  const { first, offset, stateId = "ACTIVE" } = args;
  const filterStr = [
    `stateId: {equalTo: "${stateId}"}`,
    first !== undefined ? `first: ${first}` : "",
    offset !== undefined ? `offset: ${offset}` : "",
  ]
    .filter(Boolean)
    .join(", ");

  const query = `
    query {
      meetingInfoStatuses(${filterStr ? `filter: {${filterStr}}` : ""}) {
        nodes {
          id
          name
          color
          type
          order
          builtIn
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
          totalCount: data.data.meetingInfoStatuses.totalCount,
          results: data.data.meetingInfoStatuses.nodes.map((status) => ({
            id: status.id,
            name: status.name,
            color: status.color,
            type: status.type,
            order: status.order,
            builtIn: status.builtIn,
            createdAt: status.createdAt,
            status: status.stateId,
          })),
        }),
      },
    ],
  };
}

/**
 * List Success.co meeting agenda statuses
 * @param {Object} args - Arguments object
 * @param {number} [args.first] - Optional page size
 * @param {number} [args.offset] - Optional offset
 * @param {string} [args.stateId] - Meeting agenda status state filter (defaults to 'ACTIVE')
 * @returns {Promise<{content: Array<{type: string, text: string}>}>}
 */
export async function getMeetingAgendaStatuses(args) {
  const { first, offset, stateId = "ACTIVE" } = args;
  const filterStr = [
    `stateId: {equalTo: "${stateId}"}`,
    first !== undefined ? `first: ${first}` : "",
    offset !== undefined ? `offset: ${offset}` : "",
  ]
    .filter(Boolean)
    .join(", ");

  const query = `
    query {
      meetingAgendaStatuses(${filterStr ? `filter: {${filterStr}}` : ""}) {
        nodes {
          id
          name
          color
          type
          order
          builtIn
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
          totalCount: data.data.meetingAgendaStatuses.totalCount,
          results: data.data.meetingAgendaStatuses.nodes.map((status) => ({
            id: status.id,
            name: status.name,
            color: status.color,
            type: status.type,
            order: status.order,
            builtIn: status.builtIn,
            createdAt: status.createdAt,
            status: status.stateId,
          })),
        }),
      },
    ],
  };
}

/**
 * List Success.co meeting agenda types
 * @param {Object} args - Arguments object
 * @param {number} [args.first] - Optional page size
 * @param {number} [args.offset] - Optional offset
 * @param {string} [args.stateId] - Meeting agenda type state filter (defaults to 'ACTIVE')
 * @returns {Promise<{content: Array<{type: string, text: string}>}>}
 */
export async function getMeetingAgendaTypes(args) {
  const { first, offset, stateId = "ACTIVE" } = args;
  const filterStr = [
    `stateId: {equalTo: "${stateId}"}`,
    first !== undefined ? `first: ${first}` : "",
    offset !== undefined ? `offset: ${offset}` : "",
  ]
    .filter(Boolean)
    .join(", ");

  const query = `
    query {
      meetingAgendaTypes(${filterStr ? `filter: {${filterStr}}` : ""}) {
        nodes {
          id
          name
          color
          type
          order
          builtIn
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
          totalCount: data.data.meetingAgendaTypes.totalCount,
          results: data.data.meetingAgendaTypes.nodes.map((type) => ({
            id: type.id,
            name: type.name,
            color: type.color,
            type: type.type,
            order: type.order,
            builtIn: type.builtIn,
            createdAt: type.createdAt,
            status: type.stateId,
          })),
        }),
      },
    ],
  };
}

/**
 * Get the complete leadership Vision/Traction Organizer in one call
 * @param {Object} args - Arguments object
 * @param {string} args.stateId - State filter (defaults to 'ACTIVE')
 * @returns {Promise<{content: Array<{type: string, text: string}>}>}
 */
export async function getLeadershipVTO(args) {
  const { stateId = "ACTIVE" } = args;

  // Validate stateId
  const validation = validateStateId(stateId);
  if (!validation.isValid) {
    return {
      content: [{ type: "text", text: validation.error }],
    };
  }

  try {
    // Step 1: Find the leadership vision
    const visionsQuery = `
      query {
        visions(filter: {stateId: {equalTo: "${stateId}"}, isLeadership: {equalTo: true}}) {
          nodes {
            id
            teamId
            isLeadership
            createdAt
            stateId
            companyId
          }
          totalCount
        }
      }
    `;

    const visionsResult = await callSuccessCoGraphQL(visionsQuery);
    if (!visionsResult.ok) {
      return { content: [{ type: "text", text: visionsResult.error }] };
    }

    const visions = visionsResult.data.data.visions.nodes;
    if (visions.length === 0) {
      return {
        content: [
          {
            type: "text",
            text: "No leadership vision found. Please ensure you have a vision marked as leadership.",
          },
        ],
      };
    }

    const leadershipVision = visions[0];
    const visionId = leadershipVision.id;

    // Step 2: Fetch all VTO components in parallel
    const [
      coreValuesResult,
      coreFocusResult,
      threeYearGoalsResult,
      marketStrategiesResult,
    ] = await Promise.all([
      // Core Values
      callSuccessCoGraphQL(`
        query {
          visionCoreValues(filter: {stateId: {equalTo: "${stateId}"}, visionId: {equalTo: "${visionId}"}}) {
            nodes {
              id
              name
              cascadeAll
              visionId
              createdAt
              stateId
              companyId
            }
            totalCount
          }
        }
      `),

      // Core Focus Types
      callSuccessCoGraphQL(`
        query {
          visionCoreFocusTypes(filter: {stateId: {equalTo: "${stateId}"}, visionId: {equalTo: "${visionId}"}}) {
            nodes {
              id
              name
              coreFocusName
              desc
              src
              type
              visionId
              cascadeAll
              createdAt
              stateId
              companyId
            }
            totalCount
          }
        }
      `),

      // Three Year Goals
      callSuccessCoGraphQL(`
        query {
          visionThreeYearGoals(filter: {stateId: {equalTo: "${stateId}"}, visionId: {equalTo: "${visionId}"}}) {
            nodes {
              id
              name
              futureDate
              cascadeAll
              visionId
              type
              createdAt
              stateId
              companyId
            }
            totalCount
          }
        }
      `),

      // Market Strategies
      callSuccessCoGraphQL(`
        query {
          visionMarketStrategies(filter: {stateId: {equalTo: "${stateId}"}, visionId: {equalTo: "${visionId}"}}) {
            nodes {
              id
              name
              cascadeAll
              visionId
              idealCustomer
              idealCustomerDesc
              provenProcess
              provenProcessDesc
              guarantee
              guaranteeDesc
              uniqueValueProposition
              showProvenProcess
              showGuarantee
              isCustom
              createdAt
              stateId
              companyId
            }
            totalCount
          }
        }
      `),
    ]);

    // Check for errors in any of the parallel requests
    const errors = [];
    if (!coreValuesResult.ok)
      errors.push(`Core Values: ${coreValuesResult.error}`);
    if (!coreFocusResult.ok)
      errors.push(`Core Focus: ${coreFocusResult.error}`);
    if (!threeYearGoalsResult.ok)
      errors.push(`Three Year Goals: ${threeYearGoalsResult.error}`);
    if (!marketStrategiesResult.ok)
      errors.push(`Market Strategies: ${marketStrategiesResult.error}`);

    if (errors.length > 0) {
      return {
        content: [
          {
            type: "text",
            text: `Error fetching VTO components: ${errors.join(", ")}`,
          },
        ],
      };
    }

    // Extract data from results
    const coreValues = coreValuesResult.data.data.visionCoreValues.nodes;
    const coreFocusTypes = coreFocusResult.data.data.visionCoreFocusTypes.nodes;
    const threeYearGoals =
      threeYearGoalsResult.data.data.visionThreeYearGoals.nodes;
    const marketStrategies =
      marketStrategiesResult.data.data.visionMarketStrategies.nodes;

    // Build comprehensive VTO summary
    let vtoSummary = `# Leadership Vision/Traction Organizer Summary\n\n`;
    vtoSummary += `**Vision ID:** ${leadershipVision.id}\n`;
    vtoSummary += `**Team ID:** ${leadershipVision.teamId}\n`;
    vtoSummary += `**Created:** ${new Date(
      leadershipVision.createdAt
    ).toLocaleDateString()}\n`;
    vtoSummary += `**Status:** ${leadershipVision.stateId}\n\n`;

    // Core Values Section
    if (coreValues.length > 0) {
      vtoSummary += `## Core Values\n`;
      coreValues.forEach((value) => {
        vtoSummary += `• **${value.name}** (${
          value.cascadeAll ? "Cascades to all teams" : "Leadership only"
        })\n`;
      });
      vtoSummary += `\n`;
    }

    // Core Focus Types Section
    if (coreFocusTypes.length > 0) {
      vtoSummary += `## Core Focus\n`;
      coreFocusTypes.forEach((focus) => {
        vtoSummary += `• **${focus.name || focus.type}** (${focus.type})\n`;
        if (focus.desc) {
          // Clean up HTML tags from description
          const cleanDesc = focus.desc.replace(/<[^>]*>/g, "").trim();
          if (cleanDesc) {
            vtoSummary += `  - ${cleanDesc}\n`;
          }
        }
      });
      vtoSummary += `\n`;
    }

    // Three Year Goals Section
    if (threeYearGoals.length > 0) {
      vtoSummary += `## Goals & Planning\n`;
      threeYearGoals.forEach((goal) => {
        vtoSummary += `• **${goal.name}** (${goal.type})\n`;
        if (goal.futureDate) {
          vtoSummary += `  - Target Date: ${new Date(
            goal.futureDate
          ).toLocaleDateString()}\n`;
        }
      });
      vtoSummary += `\n`;
    }

    // Market Strategies Section
    if (marketStrategies.length > 0) {
      vtoSummary += `## Market Strategy\n`;
      marketStrategies.forEach((strategy) => {
        vtoSummary += `• **${strategy.name}**\n`;

        if (strategy.idealCustomer) {
          vtoSummary += `  - Target Market: ${strategy.idealCustomer}\n`;
        }

        if (strategy.idealCustomerDesc) {
          const cleanDesc = strategy.idealCustomerDesc
            .replace(/<[^>]*>/g, "")
            .trim();
          if (cleanDesc) {
            vtoSummary += `  - Market Description: ${cleanDesc}\n`;
          }
        }

        if (strategy.provenProcess) {
          vtoSummary += `  - Proven Process: ${strategy.provenProcess}\n`;
        }

        if (strategy.guarantee && strategy.showGuarantee) {
          vtoSummary += `  - Guarantee: ${strategy.guarantee}\n`;
          if (strategy.guaranteeDesc) {
            const cleanDesc = strategy.guaranteeDesc
              .replace(/<[^>]*>/g, "")
              .trim();
            if (cleanDesc) {
              vtoSummary += `    ${cleanDesc}\n`;
            }
          }
        }

        if (strategy.uniqueValueProposition) {
          vtoSummary += `  - Unique Value Proposition: ${strategy.uniqueValueProposition}\n`;
        }
      });
      vtoSummary += `\n`;
    }

    // Add summary statistics
    vtoSummary += `## Summary Statistics\n`;
    vtoSummary += `• Core Values: ${coreValues.length}\n`;
    vtoSummary += `• Core Focus Items: ${coreFocusTypes.length}\n`;
    vtoSummary += `• Goals & Plans: ${threeYearGoals.length}\n`;
    vtoSummary += `• Market Strategies: ${marketStrategies.length}\n`;

    return {
      content: [
        {
          type: "text",
          text: vtoSummary,
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `Error fetching leadership VTO: ${error.message}`,
        },
      ],
    };
  }
}

/**
 * Get the accountability chart (organizational structure) for the company
 * This tool fetches the complete organizational hierarchy including all users,
 * their roles, teams, and reporting relationships to answer questions like
 * "Who reports to the Integrator?" or "What is the organizational structure?"
 *
 * @param {Object} params - Parameters for the accountability chart query
 * @param {string} params.stateId - State filter (defaults to 'ACTIVE')
 * @param {string} params.teamId - Optional team filter to focus on specific team
 * @returns {Promise<Object>} The accountability chart data
 */
export async function getAccountabilityChart({
  stateId = "ACTIVE",
  teamId,
} = {}) {
  try {
    // First, get the primary org chart
    const orgChartsQuery = `
      query {
        orgCharts(filter: {stateId: {equalTo: "${stateId}"}, isPrimaryChart: {equalTo: 1}}) {
          nodes {
            id
            name
            description
            isPrimaryChart
            userId
            companyId
            createdAt
            updatedAt
          }
          totalCount
        }
      }
    `;

    // Execute the org charts query
    const orgChartsResult = await callSuccessCoGraphQL(orgChartsQuery);

    // Check for errors
    if (!orgChartsResult.ok) {
      return {
        content: [
          {
            type: "text",
            text: `Error fetching org charts: ${orgChartsResult.error}`,
          },
        ],
      };
    }

    const orgCharts = orgChartsResult.data.data.orgCharts.nodes;

    if (orgCharts.length === 0) {
      return {
        content: [
          {
            type: "text",
            text: "No primary org chart found. Please ensure there is an org chart marked as primary (isPrimaryChart = 1).",
          },
        ],
      };
    }

    const primaryOrgChart = orgCharts[0]; // Get the first (and should be only) primary chart

    // Now get the org chart seats for this primary chart
    const orgChartSeatsQuery = `
      query {
        orgChartSeats(filter: {orgChartId: {equalTo: "${primaryOrgChart.id}"}, stateId: {equalTo: "${stateId}"}}) {
          nodes {
            id
            name
            parentId
            order
            holders
            orgChartId
            createdAt
            updatedAt
          }
          totalCount
        }
      }
    `;

    // Execute the org chart seats query
    const orgChartSeatsResult = await callSuccessCoGraphQL(orgChartSeatsQuery);

    // Check for errors
    if (!orgChartSeatsResult.ok) {
      return {
        content: [
          {
            type: "text",
            text: `Error fetching org chart seats: ${orgChartSeatsResult.error}`,
          },
        ],
      };
    }

    const orgChartSeats = orgChartSeatsResult.data.data.orgChartSeats.nodes;

    // Get all unique user IDs from seat holders
    const allHolderIds = new Set();
    orgChartSeats.forEach((seat) => {
      if (seat.holders) {
        // Split by comma and clean up whitespace
        const holderIds = seat.holders
          .split(",")
          .map((id) => id.trim())
          .filter((id) => id);
        holderIds.forEach((id) => allHolderIds.add(id));
      }
    });

    // Get user information for all holders
    const usersMap = {};
    if (allHolderIds.size > 0) {
      const userIds = Array.from(allHolderIds);

      // Query users in batches to avoid very long queries
      const batchSize = 50;
      for (let i = 0; i < userIds.length; i += batchSize) {
        const batch = userIds.slice(i, i + batchSize);
        const userIdsStr = batch.map((id) => `"${id}"`).join(", ");

        const usersQuery = `
          query {
            users(filter: {id: {in: [${userIdsStr}]}}) {
              nodes {
                id
                firstName
                lastName
                email
                jobTitle
              }
            }
          }
        `;

        const usersResult = await callSuccessCoGraphQL(usersQuery);
        if (usersResult.ok && usersResult.data.data.users.nodes) {
          usersResult.data.data.users.nodes.forEach((user) => {
            usersMap[user.id] = user;
          });
        }
      }
    }

    let accountabilityChart = `# Accountability Chart\n\n`;
    accountabilityChart += `**Chart:** ${primaryOrgChart.name}\n`;
    if (primaryOrgChart.description) {
      accountabilityChart += `**Description:** ${primaryOrgChart.description}\n`;
    }
    accountabilityChart += `Generated on: ${new Date().toLocaleDateString()}\n\n`;

    if (orgChartSeats.length === 0) {
      accountabilityChart += `No seats found in the primary org chart.\n`;
      return {
        content: [
          {
            type: "text",
            text: accountabilityChart,
          },
        ],
      };
    }
    // Build the organizational hierarchy
    const seatsById = {};
    const rootSeats = [];

    // First pass: create seat objects and find root seats
    orgChartSeats.forEach((seat) => {
      seatsById[seat.id] = {
        ...seat,
        children: [],
        level: 0, // Will be calculated
      };

      // Find root seats (those with no parent or parent not in our data)
      if (!seat.parentId || !seatsById[seat.parentId]) {
        rootSeats.push(seat.id);
      }
    });

    // Second pass: build parent-child relationships and calculate levels
    const calculateLevel = (seatId, level = 0) => {
      const seat = seatsById[seatId];
      if (!seat) return;

      seat.level = level;

      // Find children
      Object.values(seatsById).forEach((otherSeat) => {
        if (otherSeat.parentId === seatId) {
          seat.children.push(otherSeat.id);
          calculateLevel(otherSeat.id, level + 1);
        }
      });
    };

    // Calculate levels starting from root seats
    rootSeats.forEach((rootSeatId) => {
      calculateLevel(rootSeatId, 0);
    });

    // Sort seats by level and then by order
    const sortedSeats = Object.values(seatsById).sort((a, b) => {
      if (a.level !== b.level) {
        return a.level - b.level;
      }
      return a.order - b.order;
    });

    // Display the organizational structure
    accountabilityChart += `## Organizational Structure\n\n`;

    sortedSeats.forEach((seat) => {
      const indent = "  ".repeat(seat.level);
      accountabilityChart += `${indent}### ${seat.name}\n`;

      if (seat.holders) {
        // Split holders by comma and look up names
        const holderIds = seat.holders
          .split(",")
          .map((id) => id.trim())
          .filter((id) => id);
        const holderNames = [];

        holderIds.forEach((holderId) => {
          const user = usersMap[holderId];
          if (user) {
            holderNames.push(
              `${user.firstName} ${user.lastName} (ID: ${user.id})`
            );
          } else {
            holderNames.push(`Unknown User (ID: ${holderId})`);
          }
        });

        if (holderNames.length > 0) {
          accountabilityChart += `${indent}**Seat Holders:**\n`;
          holderNames.forEach((name) => {
            accountabilityChart += `${indent}  • ${name}\n`;
          });
        } else {
          accountabilityChart += `${indent}**Seat Holders:** *Vacant*\n`;
        }
      } else {
        accountabilityChart += `${indent}**Seat Holders:** *Vacant*\n`;
      }

      // Note: Role responsibilities would need a separate query to fetch
      // For now, we'll focus on the basic seat structure

      accountabilityChart += `\n`;
    });

    // Add summary information
    accountabilityChart += `## Summary\n\n`;
    accountabilityChart += `- **Total Seats:** ${orgChartSeats.length}\n`;
    accountabilityChart += `- **Filled Seats:** ${
      orgChartSeats.filter((seat) => seat.holders && seat.holders.trim()).length
    }\n`;
    accountabilityChart += `- **Vacant Seats:** ${
      orgChartSeats.filter((seat) => !seat.holders || !seat.holders.trim())
        .length
    }\n`;
    accountabilityChart += `- **Chart ID:** ${primaryOrgChart.id}\n`;

    return {
      content: [
        {
          type: "text",
          text: accountabilityChart,
        },
      ],
    };
  } catch (error) {
    console.error("Error fetching accountability chart:", error);
    return {
      content: [
        {
          type: "text",
          text: `Error fetching accountability chart: ${error.message}`,
        },
      ],
    };
  }
}
