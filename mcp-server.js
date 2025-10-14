import express from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

import {
  init,
  getTeams,
  getUsers,
  getTodos,
  getRocks,
  getMeetings,
  getIssues,
  getHeadlines,
  getMilestones,
  search,
  fetch,
  setSuccessCoApiKey,
  getSuccessCoApiKeyTool,
  getSuccessCoApiKey,
  callSuccessCoGraphQL,
  getScorecardMeasurables,
  getMeetingInfos,
  getLeadershipVTO,
  getAccountabilityChart,
  getMeetingDetails,
  getPeopleAnalyzerSessions,
  getOrgCheckups,
  getUsersOnTeams,
} from "./tools.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load environment variables from .env file (silently to avoid polluting STDIO)
// Load from the script directory regardless of current working directory
const envPath = path.join(__dirname, ".env");

const result = dotenv.config({
  path: envPath,
  silent: true,
  quiet: true,
  override: false,
});

// Initialize tools with environment configuration
init({
  NODE_ENV: process.env.NODE_ENV,
  DEBUG: process.env.DEBUG,
  GRAPHQL_ENDPOINT_MODE: process.env.GRAPHQL_ENDPOINT_MODE,
  GRAPHQL_ENDPOINT_LOCAL: process.env.GRAPHQL_ENDPOINT_LOCAL,
  GRAPHQL_ENDPOINT_ONLINE: process.env.GRAPHQL_ENDPOINT_ONLINE,
  SUCCESS_CO_API_KEY: process.env.SUCCESS_CO_API_KEY,
});
const API_KEY_FILE = path.join(__dirname, ".api_key");

// Check if running in development mode
const isDev =
  process.env.NODE_ENV === "development" ||
  process.env.NODE_ENV !== "production";

// --- Success.co API key management ------------------------------------------

// --- MCP server --------------------------------------------------------------

// --- Tool Definitions (Single Source of Truth) ---------------------------------

// Define all tools in one place to avoid duplication
const toolDefinitions = [
  {
    name: "setSuccessCoApiKey",
    description: "Set the Success.co API key",
    handler: async ({ apiKey }) => await setSuccessCoApiKey({ apiKey }),
    schema: {
      apiKey: z.string().describe("The API key for Success.co"),
    },
    required: ["apiKey"],
  },
  {
    name: "getSuccessCoApiKey",
    description: "Get the Success.co API key (env or stored file)",
    handler: async () => await getSuccessCoApiKeyTool({}),
    schema: {},
    required: [],
  },
  {
    name: "getTeams",
    description:
      "List Success.co teams. Each team includes an 'isLeadership' flag indicating if it's the leadership team. Use this to find the leadership team ID before querying for leadership-specific data.",
    handler: async ({ first, offset, stateId }) =>
      await getTeams({ first, offset, stateId }),
    schema: {
      first: z.number().int().optional().describe("Optional page size"),
      offset: z.number().int().optional().describe("Optional offset"),
      stateId: z
        .string()
        .optional()
        .describe("Team state filter (defaults to 'ACTIVE')"),
    },
    required: [],
  },
  {
    name: "getUsers",
    description: "List Success.co users",
    handler: async ({ first, offset, stateId }) =>
      await getUsers({ first, offset, stateId }),
    schema: {
      first: z.number().int().optional().describe("Optional page size"),
      offset: z.number().int().optional().describe("Optional offset"),
      stateId: z
        .string()
        .optional()
        .describe("User state filter (defaults to 'ACTIVE')"),
    },
    required: [],
  },
  {
    name: "getTodos",
    description:
      "List Success.co todos. Use fromMeetings=true to get only todos from Level 10 meetings. Filter by teamId, userId, or status (TODO, COMPLETE, OVERDUE). Supports date filtering for creation and completion dates.",
    handler: async ({
      first,
      offset,
      stateId,
      fromMeetings,
      teamId,
      userId,
      status,
      createdAfter,
      createdBefore,
      completedAfter,
      completedBefore,
    }) =>
      await getTodos({
        first,
        offset,
        stateId,
        fromMeetings,
        teamId,
        userId,
        status,
        createdAfter,
        createdBefore,
        completedAfter,
        completedBefore,
      }),
    schema: {
      first: z.number().int().optional().describe("Optional page size"),
      offset: z.number().int().optional().describe("Optional offset"),
      stateId: z
        .string()
        .optional()
        .describe("Todo state filter (defaults to 'ACTIVE')"),
      fromMeetings: z
        .boolean()
        .optional()
        .describe(
          "If true, only return todos linked to meetings (Level 10 meetings)"
        ),
      teamId: z.string().optional().describe("Filter by team ID"),
      userId: z.string().optional().describe("Filter by user ID"),
      status: z
        .enum(["TODO", "COMPLETE", "OVERDUE"])
        .optional()
        .describe(
          'Filter by status: "TODO" for active todos, "COMPLETE" for completed todos, "OVERDUE" for todos past their due date'
        ),
      createdAfter: z
        .string()
        .optional()
        .describe(
          "Filter todos created after this date (ISO 8601 format, e.g., 2024-01-01T00:00:00Z)"
        ),
      createdBefore: z
        .string()
        .optional()
        .describe(
          "Filter todos created before this date (ISO 8601 format, e.g., 2024-12-31T23:59:59Z)"
        ),
      completedAfter: z
        .string()
        .optional()
        .describe(
          "Filter todos completed after this date (ISO 8601 format) - automatically sets status to COMPLETE"
        ),
      completedBefore: z
        .string()
        .optional()
        .describe(
          "Filter todos completed before this date (ISO 8601 format) - automatically sets status to COMPLETE"
        ),
    },
    required: [],
  },
  {
    name: "getRocks",
    description: "List Success.co rocks",
    handler: async ({ first, offset, stateId, rockStatusId }) =>
      await getRocks({ first, offset, stateId, rockStatusId }),
    schema: {
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
    required: [],
  },
  {
    name: "getMeetings",
    description:
      "List Success.co meetings with optional date filtering and meeting series filtering",
    handler: async ({
      first,
      offset,
      stateId,
      meetingInfoId,
      dateAfter,
      dateBefore,
    }) =>
      await getMeetings({
        first,
        offset,
        stateId,
        meetingInfoId,
        dateAfter,
        dateBefore,
      }),
    schema: {
      first: z.number().int().optional().describe("Optional page size"),
      offset: z.number().int().optional().describe("Optional offset"),
      stateId: z
        .string()
        .optional()
        .describe("Meeting state filter (defaults to 'ACTIVE')"),
      meetingInfoId: z
        .string()
        .optional()
        .describe(
          "Filter by meeting info ID (recurring meeting series/configuration)"
        ),
      dateAfter: z
        .string()
        .optional()
        .describe(
          "Filter meetings occurring on or after this date (YYYY-MM-DD format, e.g., 2024-01-01)"
        ),
      dateBefore: z
        .string()
        .optional()
        .describe(
          "Filter meetings occurring on or before this date (YYYY-MM-DD format, e.g., 2024-12-31)"
        ),
    },
    required: [],
  },
  {
    name: "getIssues",
    description:
      "List Success.co issues with filtering by team, user, status, meeting linkage, and dates",
    handler: async ({
      first,
      offset,
      stateId,
      teamId,
      userId,
      status,
      fromMeetings,
      createdAfter,
      createdBefore,
      statusUpdatedBefore,
    }) =>
      await getIssues({
        first,
        offset,
        stateId,
        teamId,
        userId,
        status,
        fromMeetings,
        createdAfter,
        createdBefore,
        statusUpdatedBefore,
      }),
    schema: {
      first: z.number().int().optional().describe("Optional page size"),
      offset: z.number().int().optional().describe("Optional offset"),
      stateId: z
        .string()
        .optional()
        .describe("Issue state filter (defaults to 'ACTIVE')"),
      teamId: z.string().optional().describe("Filter by team ID"),
      userId: z.string().optional().describe("Filter by user ID"),
      status: z
        .string()
        .optional()
        .describe('Filter by status (e.g., "OPEN", "CLOSED")'),
      fromMeetings: z
        .boolean()
        .optional()
        .describe("If true, only return issues linked to meetings"),
      createdAfter: z
        .string()
        .optional()
        .describe(
          "Filter issues created after this date (ISO 8601 format, e.g., 2024-01-01T00:00:00Z)"
        ),
      createdBefore: z
        .string()
        .optional()
        .describe(
          "Filter issues created before this date (ISO 8601 format, e.g., 2024-12-31T23:59:59Z)"
        ),
      statusUpdatedBefore: z
        .string()
        .optional()
        .describe(
          "Filter issues where status was last updated before this date - useful for finding stuck issues"
        ),
    },
    required: [],
  },
  {
    name: "getHeadlines",
    description:
      "List Success.co headlines with filtering by date, keyword, team, user, and meeting linkage. Perfect for queries like 'Show me all people headlines from this week' or 'List company headlines related to hiring'.",
    handler: async ({
      first,
      offset,
      stateId,
      teamId,
      userId,
      fromMeetings,
      createdAfter,
      createdBefore,
      keyword,
    }) =>
      await getHeadlines({
        first,
        offset,
        stateId,
        teamId,
        userId,
        fromMeetings,
        createdAfter,
        createdBefore,
        keyword,
      }),
    schema: {
      first: z.number().int().optional().describe("Optional page size"),
      offset: z.number().int().optional().describe("Optional offset"),
      stateId: z
        .string()
        .optional()
        .describe("Headline state filter (defaults to 'ACTIVE')"),
      teamId: z.string().optional().describe("Filter by team ID"),
      userId: z.string().optional().describe("Filter by user ID"),
      fromMeetings: z
        .boolean()
        .optional()
        .describe("If true, only return headlines from meetings"),
      createdAfter: z
        .string()
        .optional()
        .describe(
          "Filter headlines created after this date (ISO 8601 format, e.g., 2024-01-01T00:00:00Z)"
        ),
      createdBefore: z
        .string()
        .optional()
        .describe(
          "Filter headlines created before this date (ISO 8601 format, e.g., 2024-12-31T23:59:59Z)"
        ),
      keyword: z
        .string()
        .optional()
        .describe(
          "Filter by keyword in headline name or description (case-insensitive, e.g., 'hiring', 'client feedback', 'positive')"
        ),
    },
    required: [],
  },
  {
    name: "getMilestones",
    description: "List Success.co milestones on rocks",
    handler: async ({ first, offset, stateId, rockId, userId, teamId }) =>
      await getMilestones({ first, offset, stateId, rockId, userId, teamId }),
    schema: {
      first: z.number().int().optional().describe("Optional page size"),
      offset: z.number().int().optional().describe("Optional offset"),
      stateId: z
        .string()
        .optional()
        .describe("Milestone state filter (defaults to 'ACTIVE')"),
      rockId: z.string().optional().describe("Filter by rock ID"),
      userId: z.string().optional().describe("Filter by user ID"),
      teamId: z.string().optional().describe("Filter by team ID"),
    },
    required: [],
  },
  {
    name: "search",
    description:
      "Search Success.co data (supports: teams, users, todos, rocks, meetings, issues, headlines, visions).",
    handler: async (args) => await search(args),
    schema: {
      query: z
        .string()
        .describe(
          "What to look up, e.g., 'list my teams', 'show users', 'find todos', 'get meetings', 'show vision'"
        ),
    },
    required: ["query"],
  },
  {
    name: "fetch",
    description: "Fetch a single Success.co item by id returned from search.",
    handler: async ({ id }) => await fetch({ id }),
    schema: {
      id: z.string().describe("The id from a previous search hit."),
    },
    required: ["id"],
  },
  {
    name: "getScorecardMeasurables",
    description:
      "Get scorecard data (KPIs) with their values. Provides comprehensive scorecard analysis with data fields and their corresponding values. Supports flexible date filtering: use startDate/endDate for precise ranges, or use periods/type for relative periods (e.g., 'last 13 weeks', 'last 6 months'). Defaults to last 13 weeks of data when no date parameters are provided.",
    handler: async ({
      first,
      offset,
      stateId,
      teamId,
      userId,
      type,
      dataFieldId,
      startDate,
      endDate,
      periods,
    }) =>
      await getScorecardMeasurables({
        first,
        offset,
        stateId,
        teamId,
        userId,
        type,
        dataFieldId,
        startDate,
        endDate,
        periods,
      }),
    schema: {
      first: z.number().int().optional().describe("Optional page size"),
      offset: z.number().int().optional().describe("Optional offset"),
      stateId: z
        .string()
        .optional()
        .describe("Data field state filter (defaults to 'ACTIVE')"),
      teamId: z.string().optional().describe("Filter by team ID"),
      userId: z.string().optional().describe("Filter by user ID"),
      type: z
        .enum(["weekly", "monthly", "quarterly", "annually"])
        .optional()
        .describe(
          "Data field type filter (WEEKLY, MONTHLY, QUARTERLY, ANNUALLY). Used with periods parameter when startDate/endDate are not provided."
        ),
      dataFieldId: z
        .string()
        .optional()
        .describe("Filter by specific data field ID"),
      startDate: z
        .string()
        .optional()
        .describe(
          "Start date for data filtering (YYYY-MM-DD format). When provided with endDate, overrides periods-based calculation."
        ),
      endDate: z
        .string()
        .optional()
        .describe(
          "End date for data filtering (YYYY-MM-DD format). When provided with startDate, overrides periods-based calculation."
        ),
      periods: z
        .number()
        .int()
        .optional()
        .describe(
          "Number of periods to analyze (defaults to 13). Only used when startDate and endDate are not provided. The actual time span depends on the type parameter (e.g., periods=13 with type='monthly' = 13 months of data)."
        ),
    },
    required: [],
  },
  {
    name: "getMeetingInfos",
    description: "List Success.co meeting infos",
    handler: async ({ first, offset, stateId, teamId, meetingInfoStatusId }) =>
      await getMeetingInfos({
        first,
        offset,
        stateId,
        teamId,
        meetingInfoStatusId,
      }),
    schema: {
      first: z.number().int().optional().describe("Optional page size"),
      offset: z.number().int().optional().describe("Optional offset"),
      stateId: z
        .string()
        .optional()
        .describe("Meeting info state filter (defaults to 'ACTIVE')"),
      teamId: z.string().optional().describe("Filter by team ID"),
      meetingInfoStatusId: z
        .string()
        .optional()
        .describe("Filter by meeting info status ID"),
    },
    required: [],
  },
  {
    name: "getLeadershipVTO",
    description:
      "Get the complete leadership Vision/Traction Organizer in one call. Fetches all VTO components (core values, core focus, goals, market strategies) in parallel for maximum efficiency.",
    handler: async ({ stateId }) => await getLeadershipVTO({ stateId }),
    schema: {
      stateId: z
        .string()
        .optional()
        .describe("State filter (defaults to 'ACTIVE')"),
    },
    required: [],
  },
  {
    name: "getAccountabilityChart",
    description:
      "Get the complete accountability chart (organizational structure) for the company. Fetches all users, their roles, teams, and reporting relationships to answer questions like 'Who reports to the Integrator?' or 'What is the organizational structure?'. This tool provides a comprehensive view of the company's organizational hierarchy including key EOS roles like Integrator and Visionary.",
    handler: async ({ stateId, teamId }) =>
      await getAccountabilityChart({ stateId, teamId }),
    schema: {
      stateId: z
        .string()
        .optional()
        .describe("State filter (defaults to 'ACTIVE')"),
      teamId: z
        .string()
        .optional()
        .describe("Optional team filter to focus on specific team"),
    },
    required: [],
  },
  {
    name: "getMeetingDetails",
    description:
      "Get comprehensive meeting details including all related items (headlines, todos, issues, ratings). Perfect for queries like 'What were the headlines from our last leadership L10?', 'Summarize last week's meetings', or 'List all to-dos created in this week's meetings'. Returns meetings with their associated headlines, todos, and issues in a single call. IMPORTANT: For leadership meetings, first use getTeams to find the team with isLeadership=true, then pass that team's ID to the teamId parameter.",
    handler: async ({
      meetingId,
      teamId,
      dateAfter,
      dateBefore,
      first,
      stateId,
    }) =>
      await getMeetingDetails({
        meetingId,
        teamId,
        dateAfter,
        dateBefore,
        first,
        stateId,
      }),
    schema: {
      meetingId: z
        .string()
        .optional()
        .describe("Specific meeting ID to fetch details for"),
      teamId: z
        .string()
        .optional()
        .describe(
          "Filter meetings by team ID (via meetingInfo). REQUIRED for leadership meetings - use getTeams first to find the leadership team ID (where isLeadership=true)."
        ),
      dateAfter: z
        .string()
        .optional()
        .describe(
          "Filter meetings occurring on or after this date (YYYY-MM-DD format, e.g., 2024-01-01)"
        ),
      dateBefore: z
        .string()
        .optional()
        .describe(
          "Filter meetings occurring on or before this date (YYYY-MM-DD format, e.g., 2024-12-31)"
        ),
      first: z
        .number()
        .int()
        .optional()
        .describe("Number of meetings to return (defaults to 10)"),
      stateId: z
        .string()
        .optional()
        .describe("State filter (defaults to 'ACTIVE')"),
    },
    required: [],
  },
  {
    name: "getPeopleAnalyzerSessions",
    description:
      "Get People Analyzer sessions with user scores including 'Gets it', 'Wants it', 'Capacity to do it', 'Right person', and 'Right seat' ratings. Perfect for queries like 'Show me the people analyzer results for the leadership team', 'Who's rated below a 3 on Gets it?', or 'Summarize people analyzer trends for the last quarter'.",
    handler: async ({
      first,
      offset,
      stateId,
      teamId,
      sessionId,
      createdAfter,
      createdBefore,
    }) =>
      await getPeopleAnalyzerSessions({
        first,
        offset,
        stateId,
        teamId,
        sessionId,
        createdAfter,
        createdBefore,
      }),
    schema: {
      first: z
        .number()
        .int()
        .optional()
        .describe("Optional page size (defaults to 50)"),
      offset: z.number().int().optional().describe("Optional offset"),
      stateId: z
        .string()
        .optional()
        .describe("State filter (defaults to 'ACTIVE')"),
      teamId: z
        .string()
        .optional()
        .describe("Filter by team ID (e.g., leadership team)"),
      sessionId: z
        .string()
        .optional()
        .describe("Filter by specific session ID"),
      createdAfter: z
        .string()
        .optional()
        .describe(
          "Filter sessions created after this date (ISO 8601 format, e.g., 2024-01-01T00:00:00Z)"
        ),
      createdBefore: z
        .string()
        .optional()
        .describe(
          "Filter sessions created before this date (ISO 8601 format, e.g., 2024-12-31T23:59:59Z)"
        ),
    },
    required: [],
  },
  {
    name: "getOrgCheckups",
    description:
      "Get Organization Checkup sessions with question scores. Perfect for queries like 'What's our current organization checkup score?', 'Which statements scored lowest?', or 'Compare this quarter's checkup to last quarter's'. Returns checkup sessions with all question answers and scores.",
    handler: async ({
      first,
      offset,
      stateId,
      checkupId,
      createdAfter,
      createdBefore,
    }) =>
      await getOrgCheckups({
        first,
        offset,
        stateId,
        checkupId,
        createdAfter,
        createdBefore,
      }),
    schema: {
      first: z
        .number()
        .int()
        .optional()
        .describe("Optional page size (defaults to 50)"),
      offset: z.number().int().optional().describe("Optional offset"),
      stateId: z
        .string()
        .optional()
        .describe("State filter (defaults to 'ACTIVE')"),
      checkupId: z
        .string()
        .optional()
        .describe("Filter by specific checkup ID"),
      createdAfter: z
        .string()
        .optional()
        .describe(
          "Filter checkups created after this date (ISO 8601 format, e.g., 2024-01-01T00:00:00Z) - useful for quarterly comparisons"
        ),
      createdBefore: z
        .string()
        .optional()
        .describe(
          "Filter checkups created before this date (ISO 8601 format, e.g., 2024-12-31T23:59:59Z)"
        ),
    },
    required: [],
  },
  {
    name: "getUsersOnTeams",
    description:
      "Get team membership information showing which users are on which teams. Perfect for queries like 'Who's on the Operations team?', 'Which teams is this user a member of?', or analyzing team composition and structure.",
    handler: async ({ teamId, userId, stateId }) =>
      await getUsersOnTeams({ teamId, userId, stateId }),
    schema: {
      teamId: z
        .string()
        .optional()
        .describe(
          "Filter by team ID to see all members of a specific team (e.g., Operations, Sales)"
        ),
      userId: z
        .string()
        .optional()
        .describe("Filter by user ID to see which teams a user belongs to"),
      stateId: z
        .string()
        .optional()
        .describe("State filter (defaults to 'ACTIVE')"),
    },
    required: [],
  },
];

// Helper function to register tools on an MCP server
function registerToolsOnServer(server) {
  toolDefinitions.forEach((tool) => {
    server.tool(tool.name, tool.description, tool.schema, tool.handler);
  });
}

// Helper function to convert tool definitions to JSON schema format
function getToolsAsJsonSchema() {
  return toolDefinitions.map((tool) => ({
    name: tool.name,
    description: tool.description,
    inputSchema: {
      type: "object",
      properties: Object.keys(tool.schema).reduce((props, key) => {
        const zodSchema = tool.schema[key];
        // Convert Zod schema to JSON schema (simplified)
        if (zodSchema._def?.typeName === "ZodString") {
          props[key] = {
            type: "string",
            description: zodSchema.description || "",
          };
        } else if (zodSchema._def?.typeName === "ZodNumber") {
          props[key] = {
            type: zodSchema._def?.checks?.some((c) => c.kind === "int")
              ? "integer"
              : "number",
            description: zodSchema.description || "",
          };
        } else if (zodSchema._def?.typeName === "ZodBoolean") {
          props[key] = {
            type: "boolean",
            description: zodSchema.description || "",
          };
        } else if (zodSchema._def?.typeName === "ZodEnum") {
          props[key] = {
            type: "string",
            enum: zodSchema._def.values,
            description: zodSchema.description || "",
          };
        } else if (zodSchema._def?.typeName === "ZodOptional") {
          const innerSchema = zodSchema._def.innerType;
          if (innerSchema._def?.typeName === "ZodString") {
            props[key] = {
              type: "string",
              description: innerSchema.description || "",
            };
          } else if (innerSchema._def?.typeName === "ZodNumber") {
            props[key] = {
              type: innerSchema._def?.checks?.some((c) => c.kind === "int")
                ? "integer"
                : "number",
              description: innerSchema.description || "",
            };
          } else if (innerSchema._def?.typeName === "ZodBoolean") {
            props[key] = {
              type: "boolean",
              description: innerSchema.description || "",
            };
          } else if (innerSchema._def?.typeName === "ZodEnum") {
            props[key] = {
              type: "string",
              enum: innerSchema._def.values,
              description: innerSchema.description || "",
            };
          }
        }
        return props;
      }, {}),
      required: tool.required,
    },
  }));
}

// Helper function to create tool handlers map
function createToolHandlersMap() {
  const handlers = {};
  toolDefinitions.forEach((tool) => {
    handlers[tool.name] = tool.handler;
  });
  return handlers;
}

const server = new McpServer({
  name: "Success.co MCP Server",
  version: "0.0.3",
});

// Register all tools on the main server
registerToolsOnServer(server);

// Helper function to detect transport type and provide guidance
function detectTransportType(req) {
  const isSSERequest =
    req.method === "GET" &&
    req.headers.accept &&
    req.headers.accept.includes("text/event-stream");

  const isJSONRPCRequest =
    req.method === "POST" &&
    req.headers["content-type"] &&
    req.headers["content-type"].includes("application/json");

  return {
    isSSERequest,
    isJSONRPCRequest,
    hasValidHeaders: isSSERequest || isJSONRPCRequest,
  };
}

function getTransportGuidance(endpoint) {
  const guidance = {
    "/mcp": {
      purpose: "JSON-RPC tool calls",
      method: "POST",
      headers: "Content-Type: application/json",
      example: "POST /mcp with JSON-RPC request body",
    },
    "/sse": {
      purpose: "Server-Sent Events connection",
      method: "GET",
      headers: "Accept: text/event-stream",
      example: "GET /sse with SSE headers",
    },
    "/messages": {
      purpose: "SSE message handling",
      method: "POST",
      headers: "sessionId query parameter",
      example: "POST /messages?sessionId=xxx for SSE messages",
    },
  };

  return guidance[endpoint] || null;
}

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

  // Register all tools using the shared definitions
  registerToolsOnServer(freshServer);

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

    // Detect transport type based on request characteristics
    const transportType = detectTransportType(req);
    const guidance = getTransportGuidance("/mcp");

    // Return friendly error for wrong transport type
    if (transportType.isSSERequest) {
      console.error(
        `[MCP] SSE request detected on /mcp endpoint - use /sse instead`
      );
      res.status(400).json({
        error: "Wrong transport type",
        message:
          "This endpoint expects JSON-RPC requests. For SSE connections, use the /sse endpoint instead.",
        suggestion:
          "Use GET /sse for Server-Sent Events or POST /mcp with JSON-RPC for tool calls",
        guidance: {
          current: "SSE request (GET with Accept: text/event-stream)",
          expected: `${guidance.method} ${req.path} with ${guidance.headers}`,
          example: guidance.example,
        },
      });
      return;
    }

    if (req.method === "GET" && !transportType.isSSERequest) {
      console.error(`[MCP] GET request without SSE headers on /mcp endpoint`);
      res.status(400).json({
        error: "Invalid request method",
        message:
          "GET requests to /mcp must include 'Accept: text/event-stream' header for SSE connections.",
        suggestion:
          "Use POST /mcp with JSON-RPC for tool calls, or GET /sse for Server-Sent Events",
        guidance: {
          current: `GET request without proper SSE headers`,
          expected: `${guidance.method} ${req.path} with ${guidance.headers}`,
          example: guidance.example,
        },
      });
      return;
    }

    if (req.method === "POST" && !transportType.isJSONRPCRequest) {
      console.error(
        `[MCP] POST request without JSON content-type on /mcp endpoint`
      );
      res.status(400).json({
        error: "Invalid content type",
        message:
          "POST requests to /mcp must include 'Content-Type: application/json' header.",
        suggestion:
          "Send JSON-RPC requests with proper headers: Content-Type: application/json",
        guidance: {
          current: `POST request without proper JSON headers`,
          expected: `${guidance.method} ${req.path} with ${guidance.headers}`,
          example: guidance.example,
        },
      });
      return;
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

    // Check if mcpRequest is valid
    if (!mcpRequest || typeof mcpRequest !== "object") {
      console.error(`[MCP] Invalid request body:`, mcpRequest);
      res.status(400).json({
        jsonrpc: "2.0",
        id: null,
        error: {
          code: -32700,
          message: "Parse error - request body must be valid JSON",
        },
      });
      return;
    }

    // Create a fresh server instance for this request
    const requestServer = createFreshMcpServer();

    // Create a direct mapping of tool names to handlers for easier access
    const toolHandlers = createToolHandlersMap();

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
      const tools = getToolsAsJsonSchema();

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
    console.error(`[SSE] Headers:`, req.headers);

    // Detect transport type and provide guidance
    const transportType = detectTransportType(req);
    const guidance = getTransportGuidance("/sse");

    if (transportType.isJSONRPCRequest) {
      console.error(
        `[SSE] JSON-RPC request detected on /sse endpoint - use /mcp instead`
      );
      res.status(400).json({
        error: "Wrong transport type",
        message:
          "This endpoint expects SSE connections. For JSON-RPC requests, use the /mcp endpoint instead.",
        suggestion:
          "Use POST /mcp with JSON-RPC for tool calls, or GET /sse for Server-Sent Events",
        guidance: {
          current:
            "JSON-RPC request (POST with Content-Type: application/json)",
          expected: `${guidance.method} ${req.path} with ${guidance.headers}`,
          example: guidance.example,
        },
      });
      return;
    }

    // Check if Accept header is missing or incorrect for SSE
    if (!transportType.isSSERequest) {
      console.error(
        `[SSE] Missing or incorrect Accept header for SSE connection`
      );
      res.status(400).json({
        error: "Invalid SSE request",
        message:
          "SSE connections must include 'Accept: text/event-stream' header.",
        suggestion:
          "Add 'Accept: text/event-stream' header to your SSE connection request",
        guidance: {
          current: `GET request without proper SSE headers`,
          expected: `${guidance.method} ${req.path} with ${guidance.headers}`,
          example: guidance.example,
        },
      });
      return;
    }

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
  try {
    console.error(`[MESSAGES] Received POST request to /messages`);
    console.error(`[MESSAGES] Headers:`, req.headers);

    const sessionId = String(req.query.sessionId || "");

    // Detect transport type and provide guidance
    const transportType = detectTransportType(req);
    const guidance = getTransportGuidance("/messages");

    if (transportType.isJSONRPCRequest && !sessionId) {
      console.error(
        `[MESSAGES] JSON-RPC request detected on /messages endpoint without sessionId`
      );
      res.status(400).json({
        error: "Wrong transport type",
        message:
          "This endpoint is for SSE message handling. For JSON-RPC requests, use the /mcp endpoint instead.",
        suggestion:
          "Use POST /mcp with JSON-RPC for tool calls, or ensure you have a valid SSE sessionId for /messages",
        guidance: {
          current: "JSON-RPC request without SSE sessionId",
          expected: `${guidance.method} ${req.path} with ${guidance.headers}`,
          example: guidance.example,
        },
      });
      return;
    }

    const transport = transports.sse[sessionId];
    if (transport) {
      await transport.handlePostMessage(req, res, req.body);
    } else {
      console.error(
        `[MESSAGES] No SSE transport found for sessionId: ${sessionId}`
      );
      res.status(400).json({
        error: "No transport found",
        message: `No SSE transport found for sessionId: ${sessionId}`,
        suggestion:
          "Ensure you have an active SSE connection before sending messages",
      });
    }
  } catch (error) {
    console.error(`[MESSAGES] Error in /messages endpoint:`, error);
    if (!res.headersSent) {
      res
        .status(500)
        .json({ error: "Internal server error", details: error.message });
    }
  }
});

// Create a log file for operational logs to avoid polluting STDIO
const logFile = path.join(__dirname, "mcp.log");

function logToFile(message) {
  const timestamp = new Date().toISOString();
  fs.appendFileSync(logFile, `[${timestamp}] ${message}\n`);
}

// Log .env file loading status
if (fs.existsSync(envPath)) {
  logToFile(`Found .env file at ${envPath}`);
} else {
  logToFile(`No .env file found at ${envPath}`);
}

// Validate required environment variables at startup
if (!process.env.GRAPHQL_ENDPOINT_MODE) {
  const error =
    "GRAPHQL_ENDPOINT_MODE environment variable is required but not set";
  console.error(`[STARTUP ERROR] ${error}`);
  logToFile(`STARTUP ERROR: ${error}`);
  console.error(
    `[STARTUP ERROR] Please set GRAPHQL_ENDPOINT_MODE in your environment or .env file`
  );
  console.error(`[STARTUP ERROR] Example: GRAPHQL_ENDPOINT_MODE=online`);
  console.error(`[STARTUP ERROR] Valid values: 'online', 'local'`);
  process.exit(1);
}

// Log startup information to file instead of console
logToFile("Starting MCP server");

// Always start HTTP server (with error handling for port conflicts)
logToFile("Starting HTTP server on port 3001");
const httpServer = app
  .listen(3001, () => {
    logToFile("HTTP server is running on port 3001");
  })
  .on("error", (error) => {
    if (error.code === "EADDRINUSE" && isDev) {
      // ok for these to be console.error
      console.error(
        "Port 3001 is already in use. Run this command to kill the process:"
      );
      console.error("lsof -ti:3001 | xargs kill -9");
    } else {
      console.error(`HTTP server error: ${error.message}`);
    }
    // exit the process
    process.exit(1);
  });

// Check if running in Claude conversation or other non-TTY environment

// Initialize STDIO transport for Claude
const stdioTransport = new StdioServerTransport();

// Connect the STDIO transport to the MCP server
server
  .connect(stdioTransport)
  .then(() => {
    logToFile("STDIO transport connected successfully");
  })
  .catch((error) => {
    logToFile(`Error connecting STDIO transport: ${error.message}`);
    // Don't exit - HTTP server might still be running
  });

// Handle process termination signals
process.on("SIGINT", () => {
  logToFile("Received SIGINT, shutting down");
  if (httpServer) {
    httpServer.close();
  }
  process.exit(0);
});

process.on("SIGTERM", () => {
  logToFile("Received SIGTERM, shutting down");
  if (httpServer) {
    httpServer.close();
  }
  process.exit(0);
});

// Keep the process alive for STDIO transport
process.stdin.resume();
