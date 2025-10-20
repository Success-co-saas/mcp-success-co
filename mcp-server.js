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
  initOAuthValidator,
  validateOAuthToken,
  extractBearerToken,
} from "./oauth-validator.js";

import {
  init,
  testDatabaseConnection,
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
  callSuccessCoGraphQL,
  getScorecardMeasurables,
  getMeetingInfos,
  getMeetingAgendas,
  getLeadershipVTO,
  getAccountabilityChart,
  getMeetingDetails,
  getPeopleAnalyzerSessions,
  getOrgCheckups,
  createIssue,
  createRock,
  createTodo,
  updateTodo,
  createHeadline,
  createMeeting,
  updateIssue,
  updateRock,
  updateHeadline,
  updateMeeting,
  createScorecardMeasurableEntry,
  updateScorecardMeasurableEntry,
  logToolCallStart,
  logToolCallEnd,
  runWithAuthContext,
} from "./tools.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Set up file logging in dev mode
const isDevelopment =
  process.env.NODE_ENV === "development" ||
  process.env.NODE_ENV !== "production";
const logFile = isDevelopment ? "/tmp/mcp-server.log" : null;

// Override console.error to write to both console and file in dev mode
const originalConsoleError = console.error;
if (logFile) {
  console.error = function (...args) {
    const timestamp = new Date().toISOString();
    // Convert objects to JSON strings for logging
    const formattedArgs = args.map((arg) => {
      if (typeof arg === "object" && arg !== null) {
        try {
          return JSON.stringify(arg);
        } catch (e) {
          return String(arg);
        }
      }
      return String(arg);
    });
    const message = `[${timestamp}] ${formattedArgs.join(" ")}\n`;

    // Write to console
    originalConsoleError.apply(console, args);

    // Write to file
    try {
      fs.appendFileSync(logFile, message);
    } catch (err) {
      // Silently fail if can't write to log file
    }
  };

  // Clear log file on startup
  try {
    fs.writeFileSync(
      logFile,
      `=== MCP Server Started at ${new Date().toISOString()} ===\n`
    );
    originalConsoleError(`[LOGGING] Logging to ${logFile}`);
  } catch (err) {
    originalConsoleError(
      `[LOGGING] Could not initialize log file: ${err.message}`
    );
  }
}

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
  DEVMODE_SUCCESS_API_KEY: process.env.DEVMODE_SUCCESS_API_KEY,
  DEVMODE_SUCCESS_USE_API_KEY: process.env.DEVMODE_SUCCESS_USE_API_KEY,
  DATABASE_URL: process.env.DATABASE_URL,
  DB_HOST: process.env.DB_HOST,
  DB_PORT: process.env.DB_PORT,
  DB_NAME: process.env.DB_NAME,
  DB_USER: process.env.DB_USER,
  DB_PASS: process.env.DB_PASS,
});

// Initialize OAuth validator with database connection
initOAuthValidator({
  DATABASE_URL: process.env.DATABASE_URL,
  DB_HOST: process.env.DB_HOST,
  DB_PORT: process.env.DB_PORT,
  DB_NAME: process.env.DB_NAME,
  DB_USER: process.env.DB_USER,
  DB_PASS: process.env.DB_PASS,
});

const API_KEY_FILE = path.join(__dirname, ".api_key");

// Check if running in development mode
const isDev =
  process.env.NODE_ENV === "development" ||
  process.env.NODE_ENV !== "production";

// Test database connection at startup
(async () => {
  console.error("[STARTUP] Testing database connection...");
  const dbTest = await testDatabaseConnection();

  if (!dbTest.ok) {
    console.error("\n❌ DATABASE CONNECTION FAILED!");
    console.error(`Error: ${dbTest.error}`);
    console.error(
      "\nDatabase connection is required for mutation operations (create/update)."
    );
    console.error(
      "Please ensure your .env file contains correct database credentials:"
    );
    console.error("  - DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASS");
    console.error("  OR (alternative)");
    console.error(
      "  - DATABASE_URL=postgresql://user:password@host:port/database"
    );
    console.error("\nFor help, see DATABASE_SETUP.md");
    console.error("\nExiting...\n");
    process.exit(1);
  }

  console.error(`✅ ${dbTest.message}`);
  console.error("[STARTUP] Database connection verified.\n");
})().catch((error) => {
  console.error("\n❌ STARTUP ERROR!");
  console.error(`Error: ${error.message}`);
  console.error("\nExiting...\n");
  process.exit(1);
});

// --- Success.co API key management ------------------------------------------

// --- MCP server --------------------------------------------------------------

// --- Tool Definitions (Single Source of Truth) ---------------------------------

// Define all tools in one place to avoid duplication
const toolDefinitions = [
  {
    name: "getTeams",
    description:
      "List Success.co teams. Each team includes an 'isLeadership' flag indicating if it's the leadership team. Use this to find the leadership team ID before querying for leadership-specific data. Supports keyword search.",
    handler: async ({ first, offset, keyword }) =>
      await getTeams({ first, offset, keyword }),
    schema: {
      first: z.number().int().optional().describe("Optional page size"),
      offset: z.number().int().optional().describe("Optional offset"),
      keyword: z
        .string()
        .optional()
        .describe(
          "Search for teams with names containing this keyword (case-insensitive)"
        ),
    },
    required: [],
  },
  {
    name: "getUsers",
    description:
      "List Success.co users. Use leadershipTeam=true to automatically filter by the leadership team. Filter by teamId to get users on a specific team.",
    handler: async ({ first, offset, teamId, leadershipTeam }) =>
      await getUsers({ first, offset, teamId, leadershipTeam }),
    schema: {
      first: z.number().int().optional().describe("Optional page size"),
      offset: z.number().int().optional().describe("Optional offset"),
      teamId: z.string().optional().describe("Filter by team ID"),
      leadershipTeam: z
        .boolean()
        .optional()
        .describe(
          "If true, automatically use the leadership team ID (shortcut instead of calling getTeams first)"
        ),
    },
    required: [],
  },
  {
    name: "getTodos",
    description:
      "List Success.co todos. Use leadershipTeam=true to automatically filter by the leadership team. Use fromMeetings=true to get only todos from Level 10 meetings. Filter by teamId, userId, status (TODO, COMPLETE, OVERDUE, ALL), or keyword. Supports date filtering for creation and completion dates.",
    handler: async ({
      first,
      offset,
      fromMeetings,
      teamId,
      leadershipTeam,
      userId,
      status,
      keyword,
      createdAfter,
      createdBefore,
      completedAfter,
      completedBefore,
    }) =>
      await getTodos({
        first,
        offset,
        fromMeetings,
        teamId,
        leadershipTeam,
        userId,
        status,
        keyword,
        createdAfter,
        createdBefore,
        completedAfter,
        completedBefore,
      }),
    schema: {
      first: z.number().int().optional().describe("Optional page size"),
      offset: z.number().int().optional().describe("Optional offset"),
      fromMeetings: z
        .boolean()
        .optional()
        .describe(
          "If true, only return todos linked to meetings (Level 10 meetings)"
        ),
      teamId: z.string().optional().describe("Filter by team ID"),
      leadershipTeam: z
        .boolean()
        .optional()
        .describe(
          "If true, automatically use the leadership team ID (shortcut instead of calling getTeams first)"
        ),
      userId: z.string().optional().describe("Filter by user ID"),
      status: z
        .enum(["TODO", "COMPLETE", "OVERDUE", "ALL"])
        .optional()
        .default("TODO")
        .describe(
          'Filter by status: "TODO" for active todos (default), "COMPLETE" for completed todos, "OVERDUE" for todos past their due date, "ALL" for all todos regardless of status'
        ),
      keyword: z
        .string()
        .optional()
        .describe(
          "Search for todos with names containing this keyword (case-insensitive)"
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
    description:
      "List Success.co rocks with ownership and team information. Use leadershipTeam=true to automatically filter by the leadership team. Returns userId (rock owner) and teamIds (associated teams) for each rock. Perfect for analyzing accountability and team execution. Supports keyword search.",
    handler: async ({
      first,
      offset,
      status,
      userId,
      teamId,
      leadershipTeam,
      keyword,
    }) =>
      await getRocks({
        first,
        offset,
        rockStatusId: status,
        userId,
        teamId,
        leadershipTeam,
        keyword,
      }),
    schema: {
      first: z.number().int().optional().describe("Optional page size"),
      offset: z.number().int().optional().describe("Optional offset"),
      status: z
        .enum(["ONTRACK", "OFFTRACK", "COMPLETE", "INCOMPLETE"])
        .optional()
        .describe("Rock status filter"),
      userId: z
        .string()
        .optional()
        .describe(
          "Filter rocks by user ID (rock owner). Use getUsers to find user IDs."
        ),
      teamId: z
        .string()
        .optional()
        .describe("Filter rocks by team ID. Use getTeams to find team IDs."),
      leadershipTeam: z
        .boolean()
        .optional()
        .describe(
          "If true, automatically use the leadership team ID (shortcut instead of calling getTeams first)"
        ),
      keyword: z
        .string()
        .optional()
        .describe(
          "Search for rocks with names containing this keyword (case-insensitive)"
        ),
    },
    required: [],
  },
  {
    name: "getMeetings",
    description:
      "List Success.co meetings. IMPORTANT: Either teamId or leadershipTeam is REQUIRED. Use leadershipTeam=true to automatically filter by the leadership team. Supports filtering by team, meeting agenda, and dates. Note: Only one of meetingAgendaId or meetingAgendaType can be used.",
    handler: async ({
      first,
      offset,
      teamId,
      leadershipTeam,
      meetingAgendaId,
      meetingAgendaType,
      dateAfter,
      dateBefore,
    }) =>
      await getMeetings({
        first,
        offset,
        teamId,
        leadershipTeam,
        meetingAgendaId,
        meetingAgendaType,
        dateAfter,
        dateBefore,
      }),
    schema: {
      first: z.number().int().optional().describe("Optional page size"),
      offset: z.number().int().optional().describe("Optional offset"),
      teamId: z
        .string()
        .optional()
        .describe(
          "Filter by team ID (either this or leadershipTeam is required)"
        ),
      leadershipTeam: z
        .boolean()
        .optional()
        .describe(
          "If true, automatically use the leadership team ID (shortcut instead of calling getTeams first; either this or teamId is required)"
        ),
      meetingAgendaId: z
        .string()
        .optional()
        .describe(
          "Filter by meeting agenda ID (only one of meetingAgendaId or meetingAgendaType can be used)"
        ),
      meetingAgendaType: z
        .string()
        .optional()
        .describe(
          "Filter by meeting agenda type (only one of meetingAgendaId or meetingAgendaType can be used)"
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
      "List Success.co issues. Use leadershipTeam=true to automatically filter by the leadership team. Supports filtering by team, user, status, type, meeting linkage, and dates.",
    handler: async ({
      first,
      offset,
      teamId,
      leadershipTeam,
      userId,
      status,
      type,
      fromMeetings,
      createdAfter,
      createdBefore,
      statusUpdatedBefore,
    }) =>
      await getIssues({
        first,
        offset,
        teamId,
        leadershipTeam,
        userId,
        status,
        type,
        fromMeetings,
        createdAfter,
        createdBefore,
        statusUpdatedBefore,
      }),
    schema: {
      first: z.number().int().optional().describe("Optional page size"),
      offset: z.number().int().optional().describe("Optional offset"),
      teamId: z.string().optional().describe("Filter by team ID"),
      leadershipTeam: z
        .boolean()
        .optional()
        .describe(
          "If true, automatically use the leadership team ID (shortcut instead of calling getTeams first)"
        ),
      userId: z.string().optional().describe("Filter by user ID"),
      status: z
        .enum(["TODO", "COMPLETE", "ALL"])
        .optional()
        .default("TODO")
        .describe(
          'Filter by status: "TODO" for open issues (default), "COMPLETE" for completed/resolved issues, "ALL" for all issues regardless of status'
        ),
      type: z
        .enum(["Short-term", "Long-term", "ALL"])
        .optional()
        .default("Short-term")
        .describe(
          'Filter by type: "Short-term" for immediate issues (default), "Long-term" for strategic issues, "ALL" for all types'
        ),
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
      "List Success.co headlines. Use leadershipTeam=true to automatically filter by the leadership team. Supports filtering by date, keyword, status, team, user, and meeting linkage. Perfect for queries like 'Show me all people headlines from this week' or 'List company headlines related to hiring'. Can also fetch a specific headline by ID.",
    handler: async ({
      first,
      offset,
      headlineId,
      teamId,
      leadershipTeam,
      userId,
      fromMeetings,
      createdAfter,
      createdBefore,
      keyword,
      status,
    }) =>
      await getHeadlines({
        first,
        offset,
        headlineId,
        teamId,
        leadershipTeam,
        userId,
        fromMeetings,
        createdAfter,
        createdBefore,
        keyword,
        status,
      }),
    schema: {
      first: z.number().int().optional().describe("Optional page size"),
      offset: z.number().int().optional().describe("Optional offset"),
      headlineId: z
        .string()
        .optional()
        .describe("Filter by specific headline ID"),
      teamId: z.string().optional().describe("Filter by team ID"),
      leadershipTeam: z
        .boolean()
        .optional()
        .describe(
          "If true, automatically use the leadership team ID (shortcut instead of calling getTeams first)"
        ),
      userId: z.string().optional().describe("Filter by user ID"),
      status: z
        .enum(["Not shared", "Shared"])
        .optional()
        .describe("Filter by headline status (defaults to 'Not shared')"),
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
    description:
      "List Success.co milestones on rocks. Use leadershipTeam=true to automatically filter by the leadership team.",
    handler: async ({
      first,
      offset,
      rockId,
      userId,
      teamId,
      leadershipTeam,
    }) =>
      await getMilestones({
        first,
        offset,
        rockId,
        userId,
        teamId,
        leadershipTeam,
      }),
    schema: {
      first: z.number().int().optional().describe("Optional page size"),
      offset: z.number().int().optional().describe("Optional offset"),
      rockId: z.string().optional().describe("Filter by rock ID"),
      userId: z.string().optional().describe("Filter by user ID"),
      teamId: z.string().optional().describe("Filter by team ID"),
      leadershipTeam: z
        .boolean()
        .optional()
        .describe(
          "If true, automatically use the leadership team ID (shortcut instead of calling getTeams first)"
        ),
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
      "Get scorecard data (KPIs) with their values. Use leadershipTeam=true to automatically filter by the leadership team. Provides comprehensive scorecard analysis with data fields and their corresponding values. Supports flexible date filtering: use startDate/endDate for precise ranges, or use periods/type for relative periods (e.g., 'last 13 weeks', 'last 6 months'). Defaults to last 13 weeks of data when no date parameters are provided. Use status to filter by ACTIVE (default), ARCHIVED, or ALL measurables.",
    handler: async ({
      first,
      offset,
      teamId,
      leadershipTeam,
      userId,
      type,
      dataFieldId,
      startDate,
      endDate,
      periods,
      status,
    }) =>
      await getScorecardMeasurables({
        first,
        offset,
        teamId,
        leadershipTeam,
        userId,
        type,
        dataFieldId,
        startDate,
        endDate,
        periods,
        status,
      }),
    schema: {
      first: z.number().int().optional().describe("Optional page size"),
      offset: z.number().int().optional().describe("Optional offset"),
      teamId: z.string().optional().describe("Filter by team ID"),
      leadershipTeam: z
        .boolean()
        .optional()
        .describe(
          "If true, automatically use the leadership team ID (shortcut instead of calling getTeams first)"
        ),
      userId: z.string().optional().describe("Filter by user ID"),
      type: z
        .enum(["weekly", "monthly", "quarterly", "annually"])
        .optional()
        .describe(
          "Data field type filter (defaults to 'weekly'). Used with periods parameter when startDate/endDate are not provided to calculate date ranges."
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
      status: z
        .enum(["ACTIVE", "ARCHIVED", "ALL"])
        .optional()
        .describe(
          "Filter by measurable status (defaults to ACTIVE). Use ACTIVE for active measurables, ARCHIVED for archived measurables, or ALL to include both."
        ),
    },
    required: [],
  },
  {
    name: "getMeetingInfos",
    description:
      "List Success.co meeting infos. Use leadershipTeam=true to automatically filter by the leadership team.",
    handler: async ({
      first,
      offset,
      teamId,
      leadershipTeam,
      meetingInfoStatusId,
    }) =>
      await getMeetingInfos({
        first,
        offset,
        teamId,
        leadershipTeam,
        meetingInfoStatusId,
      }),
    schema: {
      first: z.number().int().optional().describe("Optional page size"),
      offset: z.number().int().optional().describe("Optional offset"),
      teamId: z.string().optional().describe("Filter by team ID"),
      leadershipTeam: z
        .boolean()
        .optional()
        .describe(
          "If true, automatically use the leadership team ID (shortcut instead of calling getTeams first)"
        ),
      meetingInfoStatusId: z
        .string()
        .optional()
        .describe("Filter by meeting info status ID"),
    },
    required: [],
  },
  {
    name: "getMeetingAgendas",
    description:
      "List Success.co meeting agendas (templates for meetings). These are used to create meeting series. Use leadershipTeam=true to automatically filter by the leadership team. Use this to find agenda IDs needed for creating meeting infos or understanding meeting structure.",
    handler: async ({
      first,
      offset,
      teamId,
      leadershipTeam,
      meetingAgendaStatusId,
      meetingAgendaTypeId,
      builtIn,
    }) =>
      await getMeetingAgendas({
        first,
        offset,
        teamId,
        leadershipTeam,
        meetingAgendaStatusId,
        meetingAgendaTypeId,
        builtIn,
      }),
    schema: {
      first: z.number().int().optional().describe("Optional page size"),
      offset: z.number().int().optional().describe("Optional offset"),
      teamId: z.string().optional().describe("Filter by team ID"),
      leadershipTeam: z
        .boolean()
        .optional()
        .describe(
          "If true, automatically use the leadership team ID (shortcut instead of calling getTeams first)"
        ),
      meetingAgendaStatusId: z
        .string()
        .optional()
        .describe("Filter by meeting agenda status ID"),
      meetingAgendaTypeId: z
        .string()
        .optional()
        .describe("Filter by agenda type (e.g., 'LEVEL10', 'CUSTOM')"),
      builtIn: z
        .boolean()
        .optional()
        .describe(
          "Filter by built-in agendas (true for built-in, false for custom)"
        ),
    },
    required: [],
  },
  {
    name: "getLeadershipVTO",
    description:
      "Get the complete leadership Vision/Traction Organizer in one call. Fetches all VTO components (core values, core focus, goals, market strategies) in parallel for maximum efficiency.",
    handler: async () => await getLeadershipVTO({}),
    schema: {},
    required: [],
  },
  {
    name: "getAccountabilityChart",
    description:
      "Get the complete accountability chart (organizational structure) for the company. Fetches all users, their roles, teams, and reporting relationships to answer questions like 'Who reports to the Integrator?' or 'What is the organizational structure?'. This tool provides a comprehensive view of the company's organizational hierarchy including key EOS roles like Integrator and Visionary.",
    handler: async ({ teamId }) => await getAccountabilityChart({ teamId }),
    schema: {
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
      "Get comprehensive meeting details including all related items (headlines, todos, issues, ratings) for a specific meeting. Returns the meeting with its associated headlines, todos, and issues in a single call.",
    handler: async ({ meetingId }) =>
      await getMeetingDetails({
        meetingId,
      }),
    schema: {
      meetingId: z
        .string()
        .describe("Meeting ID to fetch details for (required)"),
    },
    required: ["meetingId"],
  },
  {
    name: "getPeopleAnalyzerSessions",
    description:
      "Get People Analyzer sessions with user scores including 'Gets it', 'Wants it', 'Capacity to do it', 'Right person', and 'Right seat' ratings. Use leadershipTeam=true to automatically filter by the leadership team. Perfect for queries like 'Show me the people analyzer results for the leadership team', 'Who's rated below a 3 on Gets it?', or 'Summarize people analyzer trends for the last quarter'.",
    handler: async ({
      first,
      offset,
      teamId,
      leadershipTeam,
      sessionId,
      createdAfter,
      createdBefore,
    }) =>
      await getPeopleAnalyzerSessions({
        first,
        offset,
        teamId,
        leadershipTeam,
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
      teamId: z.string().optional().describe("Filter by team ID"),
      leadershipTeam: z
        .boolean()
        .optional()
        .describe(
          "If true, automatically use the leadership team ID (shortcut instead of calling getTeams first)"
        ),
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
      checkupId,
      createdAfter,
      createdBefore,
    }) =>
      await getOrgCheckups({
        first,
        offset,
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
    name: "createIssue",
    description:
      "Create a new issue in Success.co. Use leadershipTeam=true to automatically assign to the leadership team. Perfect for queries like 'Add a new issue for customer churn increase to the leadership team'. Either teamId or leadershipTeam is REQUIRED.",
    handler: async ({
      name,
      desc,
      teamId,
      leadershipTeam,
      userId,
      priority,
      type,
    }) =>
      await createIssue({
        name,
        desc,
        teamId,
        leadershipTeam,
        userId,
        priority,
        type,
      }),
    schema: {
      name: z.string().describe("Issue name/title (required)"),
      desc: z
        .string()
        .optional()
        .describe("Issue description or additional details"),
      teamId: z
        .string()
        .optional()
        .describe(
          "Team ID to assign the issue to (either this or leadershipTeam is required)"
        ),
      leadershipTeam: z
        .boolean()
        .optional()
        .describe(
          "If true, automatically assign to the leadership team (shortcut instead of calling getTeams first)"
        ),
      userId: z
        .string()
        .optional()
        .describe(
          "User ID to assign the issue to (optional - defaults to current user from API key)"
        ),
      priority: z
        .enum(["No priority", "Low", "Medium", "High"])
        .optional()
        .describe(
          "Priority level: 'High' (most urgent), 'Medium', 'Low', or 'No priority' (defaults to 'Medium')"
        ),
      type: z
        .enum(["Short-term", "Long-term"])
        .optional()
        .describe(
          "Issue type: 'Short-term' for immediate issues or 'Long-term' for strategic issues (defaults to 'Short-term')"
        ),
    },
    required: ["name"],
  },
  {
    name: "createRock",
    description:
      "Create a new Rock (90-day priority) in Success.co. IMPORTANT: Rocks MUST be assigned to at least one team - either provide 'teamId' or set 'leadershipTeam=true'. Supports assigning to multiple teams with comma-separated IDs. New rocks always start with status 'ONTRACK'. Perfect for queries like 'Create a Rock for marketing and sales teams to launch referral program due next quarter'.",
    handler: async ({
      name,
      desc,
      dueDate,
      teamId,
      leadershipTeam,
      userId,
      type,
    }) =>
      await createRock({
        name,
        desc,
        dueDate,
        teamId,
        leadershipTeam,
        userId,
        type,
      }),
    schema: {
      name: z.string().describe("Rock name/title (required)"),
      desc: z.string().optional().describe("Rock description or details"),
      dueDate: z
        .string()
        .optional()
        .describe(
          "Due date in YYYY-MM-DD format. If not provided, defaults to the last date of the current quarter based on the company's quarter dates."
        ),
      teamId: z
        .string()
        .optional()
        .describe(
          "Team ID(s) to assign the rock to (REQUIRED unless leadershipTeam is true). Provide single team ID or comma-separated IDs for multiple teams (e.g., 'team-id-1,team-id-2')"
        ),
      leadershipTeam: z
        .boolean()
        .optional()
        .describe(
          "If true, automatically assign to the leadership team (REQUIRED unless teamId is provided). Use this shortcut instead of calling getTeams first."
        ),
      userId: z
        .string()
        .optional()
        .describe(
          "User ID to assign the rock to (use getUsers to find the user ID)"
        ),
      type: z
        .enum(["Personal", "Company"])
        .optional()
        .describe(
          "Rock type: 'Personal' for individual rocks or 'Company' for company-wide rocks (defaults to 'Company')"
        ),
    },
    required: ["name"],
  },
  {
    name: "createTodo",
    description:
      "Create a new to-do in Success.co. Use leadershipTeam=true to automatically assign to the leadership team. Perfect for queries like 'Add a to-do to follow up with vendor' or 'Create a to-do for the leadership team to review Q4 budget'. Either teamId or leadershipTeam is REQUIRED.",
    handler: async ({ name, desc, teamId, leadershipTeam, userId, dueDate }) =>
      await createTodo({ name, desc, teamId, leadershipTeam, userId, dueDate }),
    schema: {
      name: z.string().describe("Todo name/title (required)"),
      desc: z
        .string()
        .optional()
        .describe("Todo description or additional details"),
      teamId: z
        .string()
        .optional()
        .describe(
          "Team ID to assign the todo to (either this or leadershipTeam is required)"
        ),
      leadershipTeam: z
        .boolean()
        .optional()
        .describe(
          "If true, automatically assign to the leadership team (shortcut instead of calling getTeams first)"
        ),
      userId: z
        .string()
        .optional()
        .describe(
          "User ID to assign the todo to (optional - defaults to current user from API key)"
        ),
      dueDate: z
        .string()
        .optional()
        .describe("Due date in YYYY-MM-DD format (e.g., 2024-12-31)"),
    },
    required: ["name"],
  },
  {
    name: "updateTodo",
    description:
      "Update an existing to-do in Success.co. Perfect for queries like 'Mark the to-do follow up with vendor as complete'. Use getTodos first to find the specific to-do ID by searching for the to-do name.",
    handler: async ({ todoId, todoStatusId, name, desc, dueDate }) =>
      await updateTodo({ todoId, todoStatusId, name, desc, dueDate }),
    schema: {
      todoId: z
        .string()
        .describe(
          "Todo ID (required). Use getTodos with keyword search to find the ID."
        ),
      todoStatusId: z
        .enum(["TODO", "COMPLETE"])
        .optional()
        .describe("New status: 'TODO' for open, 'COMPLETE' for completed"),
      name: z.string().optional().describe("Update the to-do name"),
      desc: z.string().optional().describe("Update the to-do description"),
      dueDate: z
        .string()
        .optional()
        .describe("Update the due date (YYYY-MM-DD format)"),
    },
    required: ["todoId"],
  },
  {
    name: "createHeadline",
    description:
      "Create a new headline in Success.co. Use leadershipTeam=true to automatically associate with the leadership team. Perfect for queries like 'Add a headline: Won major client contract with ABC Corp'. Headlines are good news or updates shared during meetings. IMPORTANT: You must provide either 'teamId' or 'leadershipTeam=true'.",
    handler: async ({
      name,
      desc,
      teamId,
      leadershipTeam,
      userId,
      status,
      isCascadingMessage,
    }) =>
      await createHeadline({
        name,
        desc,
        teamId,
        leadershipTeam,
        userId,
        status,
        isCascadingMessage,
      }),
    schema: {
      name: z
        .string()
        .describe(
          "Headline text (required). Keep it concise and positive - this is good news!"
        ),
      desc: z
        .string()
        .optional()
        .describe("Additional details or description for the headline"),
      teamId: z
        .string()
        .optional()
        .describe(
          "Team ID to associate with (required if leadershipTeam is not true)"
        ),
      leadershipTeam: z
        .boolean()
        .optional()
        .describe(
          "If true, automatically associate with the leadership team (required if teamId not provided)"
        ),
      userId: z
        .string()
        .optional()
        .describe(
          "User ID to associate with (use getUsers to find the user ID)"
        ),
      status: z
        .enum(["Shared", "Not shared"])
        .optional()
        .describe("Headline status (defaults to 'Not shared')"),
      isCascadingMessage: z
        .boolean()
        .optional()
        .describe(
          "Whether this is a cascading message to be shared across teams (defaults to false)"
        ),
    },
    required: ["name"],
  },
  {
    name: "createMeeting",
    description:
      "Create a new meeting instance in Success.co. Perfect for queries like 'Schedule a Level 10 meeting for the leadership team next Monday'. Provide either meetingAgendaId or meetingAgendaType (e.g., 'WEEKLY-L10', 'QUARTERLY-PULSING-AGENDA'). The tool will create a meeting info and then the meeting automatically. Meeting status defaults to 'NOT-STARTED', and start/end times are set when the meeting is started/ended.",
    handler: async ({
      date,
      meetingAgendaId,
      meetingAgendaType,
      teamId,
      leadershipTeam,
      name,
    }) =>
      await createMeeting({
        date,
        meetingAgendaId,
        meetingAgendaType,
        teamId,
        leadershipTeam,
        name,
      }),
    schema: {
      date: z
        .string()
        .describe(
          "Meeting date in YYYY-MM-DD format (required). For 'next Monday', calculate the date."
        ),
      meetingAgendaId: z
        .string()
        .optional()
        .describe(
          "Meeting agenda ID (optional if meetingAgendaType is provided). Use getMeetingAgendas to find available agendas."
        ),
      meetingAgendaType: z
        .enum([
          "ANNUAL-PLANNING-DAY-1",
          "ANNUAL-PLANNING-DAY-2",
          "QUARTERLY-PULSING-AGENDA",
          "WEEKLY-L10",
          "FOCUS-DAY",
          "VISION-BUILDING-SESSION",
        ])
        .optional()
        .describe(
          "Meeting agenda type (optional if meetingAgendaId is provided). Automatically looks up the agenda for the team."
        ),
      teamId: z
        .string()
        .optional()
        .describe(
          "Team ID (optional if leadershipTeam is true). The team for which to create the meeting."
        ),
      leadershipTeam: z
        .boolean()
        .optional()
        .describe(
          "If true, automatically use the leadership team (optional if teamId is provided)"
        ),
      name: z
        .string()
        .optional()
        .describe(
          "Optional name for the meeting (defaults to the agenda name)"
        ),
    },
    required: ["date"],
  },
  {
    name: "updateIssue",
    description:
      "Update an existing issue in Success.co. Use leadershipTeam=true to reassign to the leadership team. Perfect for queries like 'Close the issue about pricing inconsistencies' or 'Change the priority of the customer churn issue to High'. Use getIssues first to find the issue ID.",
    handler: async ({
      issueId,
      name,
      desc,
      issueStatusId,
      teamId,
      leadershipTeam,
      userId,
      priority,
    }) =>
      await updateIssue({
        issueId,
        name,
        desc,
        issueStatusId,
        teamId,
        leadershipTeam,
        userId,
        priority,
      }),
    schema: {
      issueId: z
        .string()
        .describe(
          "Issue ID (required). Use getIssues to search for the issue by name or criteria."
        ),
      name: z.string().optional().describe("Update the issue name/title"),
      desc: z.string().optional().describe("Update the issue description"),
      issueStatusId: z
        .enum(["TODO", "COMPLETE"])
        .optional()
        .describe(
          "Update status: 'TODO' for open issues, 'COMPLETE' for completed/resolved issues"
        ),
      teamId: z.string().optional().describe("Reassign to a different team"),
      leadershipTeam: z
        .boolean()
        .optional()
        .describe(
          "If true, reassign to the leadership team (shortcut instead of calling getTeams first)"
        ),
      userId: z
        .string()
        .optional()
        .describe("Reassign to a different user (use getUsers to find ID)"),
      priority: z
        .enum(["No priority", "Low", "Medium", "High"])
        .optional()
        .describe(
          "Update priority level: 'High', 'Medium', 'Low', or 'No priority'"
        ),
    },
    required: ["issueId"],
  },
  {
    name: "updateRock",
    description:
      "Update an existing Rock in Success.co. Perfect for queries like 'Mark the referral program rock as complete', 'Change the due date for the marketing rock to next month', or 'Reassign this rock to the Sales and Marketing teams'. Use getRocks first to find the rock ID. IMPORTANT: When updating team assignments, the teamId parameter REPLACES all existing team assignments - any teams not listed will be removed. Omit teamId to leave team assignments unchanged.",
    handler: async ({ rockId, name, desc, status, dueDate, userId, teamId }) =>
      await updateRock({
        rockId,
        name,
        desc,
        status,
        dueDate,
        userId,
        teamId,
      }),
    schema: {
      rockId: z
        .string()
        .describe(
          "Rock ID (required). Use getRocks to search for the rock by name or criteria."
        ),
      name: z.string().optional().describe("Update the rock name/title"),
      desc: z.string().optional().describe("Update the rock description"),
      status: z
        .enum(["ONTRACK", "OFFTRACK", "COMPLETE", "INCOMPLETE"])
        .optional()
        .describe("Update rock status"),
      dueDate: z
        .string()
        .optional()
        .describe("Update due date (YYYY-MM-DD format)"),
      userId: z
        .string()
        .optional()
        .describe("Reassign to a different user (use getUsers to find ID)"),
      teamId: z
        .string()
        .optional()
        .describe(
          "REPLACES all team assignments. Provide single team ID or comma-separated IDs for multiple teams (e.g., 'team-id-1,team-id-2'). Teams not listed will be removed. Omit this field to keep existing team assignments unchanged."
        ),
    },
    required: ["rockId"],
  },
  {
    name: "updateHeadline",
    description:
      "Update an existing headline in Success.co. Use leadershipTeam=true to reassign to the leadership team. Perfect for queries like 'Edit the ABC Corp headline to add more details' or 'Change the headline status'. Use getHeadlines first to find the headline ID.",
    handler: async ({
      headlineId,
      name,
      desc,
      status,
      teamId,
      leadershipTeam,
      userId,
      isCascadingMessage,
    }) =>
      await updateHeadline({
        headlineId,
        name,
        desc,
        status,
        teamId,
        leadershipTeam,
        userId,
        isCascadingMessage,
      }),
    schema: {
      headlineId: z
        .string()
        .describe(
          "Headline ID (required). Use getHeadlines with keyword search to find the ID."
        ),
      name: z.string().optional().describe("Update the headline text"),
      desc: z.string().optional().describe("Update the headline description"),
      status: z
        .enum(["Shared", "Not shared"])
        .optional()
        .describe("Update the headline status"),
      teamId: z.string().optional().describe("Update team association"),
      leadershipTeam: z
        .boolean()
        .optional()
        .describe(
          "If true, reassign to the leadership team (shortcut instead of calling getTeams first)"
        ),
      userId: z
        .string()
        .optional()
        .describe("Update user association (use getUsers to find ID)"),
      isCascadingMessage: z
        .boolean()
        .optional()
        .describe("Update whether this cascades to all teams"),
    },
    required: ["headlineId"],
  },
  {
    name: "updateMeeting",
    description:
      "Update an existing meeting in Success.co. Perfect for queries like 'Reschedule next Monday's L10 to Tuesday' or 'Cancel tomorrow's meeting'. Use getMeetings or getMeetingDetails first to find the meeting ID. To cancel a meeting, set state to 'DELETED'.",
    handler: async ({ meetingId, date, state }) =>
      await updateMeeting({
        meetingId,
        date,
        state,
      }),
    schema: {
      meetingId: z
        .string()
        .describe(
          "Meeting ID (required). Use getMeetings to find the specific meeting instance."
        ),
      date: z
        .string()
        .optional()
        .describe("Update meeting date (YYYY-MM-DD format)"),
      state: z
        .enum(["ACTIVE", "DELETED"])
        .optional()
        .describe(
          "Meeting state. Set to 'DELETED' to cancel a meeting, 'ACTIVE' to restore it."
        ),
    },
    required: ["meetingId"],
  },
  {
    name: "createScorecardMeasurableEntry",
    description:
      "Create or update a scorecard measurable entry. Perfect for natural language commands like 'Set Bugs reported by customers to 15' or 'Set Revenue to 5000'. The start date is automatically calculated based on the metric's frequency (weekly=Monday, monthly=1st of month, quarterly=quarter start, annually=Jan 1). With overwrite=true, it will update existing entries for the same period instead of erroring. Use getScorecardMeasurables to find the dataFieldId, or search by metric name.",
    handler: async ({ dataFieldId, value, startDate, note, overwrite }) =>
      await createScorecardMeasurableEntry({
        dataFieldId,
        value,
        startDate,
        note,
        overwrite,
      }),
    schema: {
      dataFieldId: z
        .string()
        .describe(
          "Data field (measurable) ID (required). Use getScorecardMeasurables to find available metrics and their IDs, or search by metric name."
        ),
      value: z
        .string()
        .describe(
          "The value to record (required). Can be a number, currency amount, percentage, etc. depending on the metric's unit type."
        ),
      startDate: z
        .string()
        .optional()
        .describe(
          "Optional start date in YYYY-MM-DD format. If not provided, defaults to current period (this week's Monday for weekly metrics, first of this month for monthly metrics, current quarter start for quarterly metrics, Jan 1 of this year for annual metrics)."
        ),
      note: z
        .string()
        .optional()
        .describe(
          "Optional note to attach to this entry (e.g., explanation of the value, context, etc.)"
        ),
      overwrite: z
        .boolean()
        .optional()
        .describe(
          "If true, will update any existing entry for the same period instead of returning an error. Perfect for 'Set X to Y' commands where you want to ensure the value is set regardless of whether an entry exists. Defaults to false."
        ),
    },
    required: ["dataFieldId", "value"],
  },
  {
    name: "updateScorecardMeasurableEntry",
    description:
      "Update an existing scorecard measurable entry (data value). Perfect for queries like 'Change the Revenue entry from last week to 300' or 'Update the note on this month's leads entry'. Note: Entries cannot be moved to different periods - only value and note can be updated. Use getScorecardMeasurables to find entries and their IDs.",
    handler: async ({ entryId, value, note }) =>
      await updateScorecardMeasurableEntry({
        entryId,
        value,
        note,
      }),
    schema: {
      entryId: z
        .string()
        .describe(
          "Entry ID (required). This is the ID of the data_values record to update. Use getScorecardMeasurables to find entry IDs."
        ),
      value: z
        .string()
        .optional()
        .describe(
          "The new value to record. Can be a number, currency amount, percentage, etc. depending on the metric's unit type."
        ),
      note: z
        .string()
        .optional()
        .describe(
          "Update the note. Can be set to empty string to clear the note."
        ),
    },
    required: ["entryId"],
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
  return toolDefinitions
    .map((tool) => ({
      name: tool.name,
      description: tool.description,
      inputSchema: {
        type: "object",
        properties: Object.keys(tool.schema).reduce((props, key) => {
          const zodSchema = tool.schema[key];
          // Convert Zod schema to JSON schema (simplified)

          // Handle ZodDefault (when .default() is chained)
          let schemaToProcess = zodSchema;
          let defaultValue = undefined;
          if (zodSchema._def?.typeName === "ZodDefault") {
            defaultValue = zodSchema._def.defaultValue();
            schemaToProcess = zodSchema._def.innerType;
          }

          if (schemaToProcess._def?.typeName === "ZodString") {
            props[key] = {
              type: "string",
              description: schemaToProcess.description || "",
            };
            if (defaultValue !== undefined) props[key].default = defaultValue;
          } else if (schemaToProcess._def?.typeName === "ZodNumber") {
            props[key] = {
              type: schemaToProcess._def?.checks?.some((c) => c.kind === "int")
                ? "integer"
                : "number",
              description: schemaToProcess.description || "",
            };
            if (defaultValue !== undefined) props[key].default = defaultValue;
          } else if (schemaToProcess._def?.typeName === "ZodBoolean") {
            props[key] = {
              type: "boolean",
              description: schemaToProcess.description || "",
            };
            if (defaultValue !== undefined) props[key].default = defaultValue;
          } else if (schemaToProcess._def?.typeName === "ZodEnum") {
            props[key] = {
              type: "string",
              enum: schemaToProcess._def.values,
              description: schemaToProcess.description || "",
            };
            if (defaultValue !== undefined) props[key].default = defaultValue;
          } else if (schemaToProcess._def?.typeName === "ZodOptional") {
            const innerSchema = schemaToProcess._def.innerType;
            if (innerSchema._def?.typeName === "ZodString") {
              props[key] = {
                type: "string",
                description: innerSchema.description || "",
              };
              if (defaultValue !== undefined) props[key].default = defaultValue;
            } else if (innerSchema._def?.typeName === "ZodNumber") {
              props[key] = {
                type: innerSchema._def?.checks?.some((c) => c.kind === "int")
                  ? "integer"
                  : "number",
                description: innerSchema.description || "",
              };
              if (defaultValue !== undefined) props[key].default = defaultValue;
            } else if (innerSchema._def?.typeName === "ZodBoolean") {
              props[key] = {
                type: "boolean",
                description: innerSchema.description || "",
              };
              if (defaultValue !== undefined) props[key].default = defaultValue;
            } else if (innerSchema._def?.typeName === "ZodEnum") {
              props[key] = {
                type: "string",
                enum: innerSchema._def.values,
                description: innerSchema.description || "",
              };
              if (defaultValue !== undefined) props[key].default = defaultValue;
            }
          }
          return props;
        }, {}),
        required: tool.required,
      },
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
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

// Log all incoming requests
app.use((req, res, next) => {
  console.error(`\n[REQUEST] ${req.method} ${req.path}`);
  console.error(
    `[REQUEST] URL: ${req.protocol}://${req.get("host")}${req.originalUrl}`
  );
  console.error(`[REQUEST] User-Agent: ${req.headers["user-agent"] || "N/A"}`);
  next();
});

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
    console.error(`[CORS] Handling OPTIONS preflight request`);
    res.sendStatus(200);
    return;
  }

  next();
});

// Add authentication middleware for MCP endpoints
app.use("/mcp", async (req, res, next) => {
  const authHeader = req.headers.authorization;

  // Log all incoming requests to /mcp
  console.error(`[AUTH] ${req.method} ${req.path}`);
  console.error(
    `[AUTH] Full URL: ${req.protocol}://${req.get("host")}${req.originalUrl}`
  );
  console.error(`[AUTH] Headers:`, JSON.stringify(req.headers, null, 2));

  // Log authentication attempts
  if (authHeader) {
    console.error(
      `[AUTH] Authorization header present: "${authHeader.substring(0, 20)}..."`
    );
  } else {
    console.error(`[AUTH] No Authorization header present`);
  }

  // Skip authentication for health check and certain endpoints
  if (req.path === "/health" || req.method === "OPTIONS") {
    console.error(`[AUTH] Skipping auth for ${req.path}`);
    return next();
  }

  // Helper function to send OAuth challenge
  const sendOAuthChallenge = (message, error) => {
    // Construct resource URL from request to support ngrok and production URLs
    const protocol =
      req.headers["x-forwarded-proto"] || (req.secure ? "https" : "http");
    const host = req.headers["x-forwarded-host"] || req.headers.host;

    // OAuth endpoints are now served by ServiceAPI, not MCP server
    // Use OAUTH_SERVER_URL if set, otherwise fall back to same host
    const oauthServerUrl =
      process.env.OAUTH_SERVER_URL || `${protocol}://${host}`;
    const resourceMetadataUrl = `${oauthServerUrl}/.well-known/oauth-protected-resource`;

    // Set WWW-Authenticate header as per RFC 6750 and MCP OAuth spec
    const wwwAuthHeader = `Bearer realm="mcp", resource_metadata="${resourceMetadataUrl}"`;
    res.setHeader("WWW-Authenticate", wwwAuthHeader);

    console.error(`[AUTH] ======== SENDING 401 OAUTH CHALLENGE ========`);
    console.error(`[AUTH] WWW-Authenticate: ${wwwAuthHeader}`);
    console.error(`[AUTH] Resource metadata URL: ${resourceMetadataUrl}`);
    console.error(`[AUTH] Error code: ${error || "unauthorized"}`);
    console.error(`[AUTH] Message: ${message}`);
    console.error(`[AUTH] =============================================`);

    return res.status(401).json({
      error: error || "unauthorized",
      message:
        message ||
        "Authentication required. Provide a valid OAuth Bearer token.",
    });
  };

  // Try OAuth token first (Bearer token)
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = extractBearerToken(authHeader);
    if (token) {
      console.error(`[AUTH] Validating OAuth token`);
      const validation = await validateOAuthToken(token);

      if (validation.valid) {
        console.error(`[AUTH] ======== AUTHENTICATION SUCCESSFUL ========`);
        console.error(`[AUTH] User: ${validation.userEmail}`);
        console.error(`[AUTH] Company: ${validation.companyId}`);
        console.error(`[AUTH] Client: ${validation.clientId}`);
        console.error(`[AUTH] Mode: OAuth (access token)`);
        console.error(`[AUTH] ============================================`);
        // Attach user info and access token to request for downstream use
        req.oauth = {
          accessToken: token, // Store the access token for GraphQL calls
          userId: validation.userId,
          companyId: validation.companyId,
          userEmail: validation.userEmail,
          clientId: validation.clientId,
        };
        return next();
      } else {
        console.error(
          `[AUTH] OAuth token validation failed: ${validation.error}`
        );
        return sendOAuthChallenge(
          validation.message || "Invalid or expired OAuth token",
          validation.error
        );
      }
    }
  }

  // Fall back to API key authentication (only in development with explicit flag)
  const isDevelopment =
    process.env.NODE_ENV === "development" ||
    process.env.NODE_ENV !== "production";
  const useApiKey = process.env.DEVMODE_SUCCESS_USE_API_KEY === "true";

  if (isDevelopment && useApiKey && process.env.DEVMODE_SUCCESS_API_KEY) {
    if (
      authHeader === `Bearer ${process.env.DEVMODE_SUCCESS_API_KEY}` ||
      authHeader === process.env.DEVMODE_SUCCESS_API_KEY
    ) {
      console.error(`[AUTH] ======== AUTHENTICATION SUCCESSFUL ========`);
      console.error(
        `[AUTH] Mode: API Key (DEVMODE_SUCCESS_USE_API_KEY=true in dev mode)`
      );
      console.error(`[AUTH] ============================================`);
      req.apiKey = true;
      req.oauth = {
        isApiKeyMode: true, // Flag to indicate API key mode
      };
      return next();
    }
  }

  // No valid authentication found - send OAuth challenge
  console.error(`[AUTH] No valid authentication provided`);
  return sendOAuthChallenge(
    "Authentication required. Provide a valid OAuth Bearer token or API key.",
    "unauthorized"
  );
});

// Store transports for each session type
const transports = {
  streamable: {},
  sse: {},
};

// Health check endpoint
app.get("/health", (req, res) => {
  console.error(`[HEALTH] Health check requested`);
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
    // Note: Use 'mcp-session-id' as per MCP spec (not 'x-mcp-session-id')
    const sessionId = req.headers["mcp-session-id"];

    // Check if this is an initialize request (starts a new session)
    const isInitialize =
      req.body &&
      req.body.method === "initialize" &&
      req.body.jsonrpc === "2.0";

    // Get existing transport or create new one for initialize
    let transport = sessionId ? transports.streamable[sessionId] : null;

    if (!transport && isInitialize) {
      // Create new transport with session callback
      transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () =>
          `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        onsessioninitialized: (newSessionId) => {
          transports.streamable[newSessionId] = transport;
          console.error(`[MCP] Session initialized: ${newSessionId}`);
        },
      });

      transport.onclose = () => {
        if (transport.sessionId) {
          console.error(`[MCP] Session closed: ${transport.sessionId}`);
          delete transports.streamable[transport.sessionId];
        }
      };

      // Connect the transport to a fresh server instance
      const requestServer = createFreshMcpServer();
      await requestServer.connect(transport);
      console.error(`[MCP] Created new transport for initialize request`);
    } else if (!transport && !isInitialize) {
      console.error(
        `[MCP] No session found and not an initialize request. Session ID: ${sessionId}`
      );
      res.status(400).json({
        jsonrpc: "2.0",
        error: {
          code: -32000,
          message: "Bad Request: No valid session ID provided",
        },
        id: null,
      });
      return;
    }

    // Use the SDK's built-in request handler
    console.error(`[MCP] Handling request with transport.handleRequest()`);
    console.error(
      `[MCP] Method: ${req.body?.method}, Session: ${
        transport.sessionId || "none"
      }`
    );

    // Set up authentication context for downstream tool calls
    const authContext = req.oauth || {};
    console.error(
      `[MCP] Auth context:`,
      authContext.isApiKeyMode
        ? "API Key mode"
        : authContext.accessToken
        ? "OAuth mode"
        : "None"
    );

    // Let the SDK handle the request properly with auth context
    await runWithAuthContext(authContext, async () => {
      await transport.handleRequest(req, res, req.body);
    });
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

// Add GET and DELETE handlers for session management
app.get("/mcp", async (req, res) => {
  try {
    console.error(`[MCP] Received GET request for session management`);

    const sessionId = req.headers["mcp-session-id"];
    if (!sessionId || !transports.streamable[sessionId]) {
      console.error(`[MCP] Invalid or missing session ID: ${sessionId}`);
      res.status(400).send("Invalid or missing session ID");
      return;
    }

    const transport = transports.streamable[sessionId];
    const authContext = req.oauth || {};
    await runWithAuthContext(authContext, async () => {
      await transport.handleRequest(req, res);
    });
  } catch (error) {
    console.error(`[MCP] Error in GET /mcp:`, error);
    if (!res.headersSent) {
      res.status(500).send("Internal server error");
    }
  }
});

app.delete("/mcp", async (req, res) => {
  try {
    console.error(`[MCP] Received DELETE request for session cleanup`);

    const sessionId = req.headers["mcp-session-id"];
    if (!sessionId || !transports.streamable[sessionId]) {
      console.error(`[MCP] Invalid or missing session ID: ${sessionId}`);
      res.status(400).send("Invalid or missing session ID");
      return;
    }

    const transport = transports.streamable[sessionId];
    const authContext = req.oauth || {};
    await runWithAuthContext(authContext, async () => {
      await transport.handleRequest(req, res);
    });

    // Clean up session after DELETE
    delete transports.streamable[sessionId];
    console.error(`[MCP] Session deleted: ${sessionId}`);
  } catch (error) {
    console.error(`[MCP] Error in DELETE /mcp:`, error);
    if (!res.headersSent) {
      res.status(500).send("Internal server error");
    }
  }
});

// Remove the old manual JSON-RPC handling - the SDK now handles everything
// The transport.handleRequest() method properly implements the MCP protocol

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

    const authContext = req.oauth || {};
    await runWithAuthContext(authContext, async () => {
      await server.connect(transport);
    });
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
      const authContext = req.oauth || {};
      await runWithAuthContext(authContext, async () => {
        await transport.handlePostMessage(req, res, req.body);
      });
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

// REMOVED: All the manual JSON-RPC handling code below
// The StreamableHTTPServerTransport now handles everything properly
// including initialize, tools/list, tools/call, resources/list, and notifications

// Log .env file loading status
if (fs.existsSync(envPath)) {
  console.error(`[STARTUP] Found .env file at ${envPath}`);
} else {
  console.error(`[STARTUP] No .env file found at ${envPath}`);
}

// Validate required environment variables at startup
if (!process.env.GRAPHQL_ENDPOINT_MODE) {
  const error =
    "GRAPHQL_ENDPOINT_MODE environment variable is required but not set";
  console.error(`[STARTUP ERROR] ${error}`);
  console.error(
    `[STARTUP ERROR] Please set GRAPHQL_ENDPOINT_MODE in your environment or .env file`
  );
  console.error(`[STARTUP ERROR] Example: GRAPHQL_ENDPOINT_MODE=online`);
  console.error(`[STARTUP ERROR] Valid values: 'online', 'local'`);
  process.exit(1);
}

// Log startup information
console.error("[STARTUP] Starting MCP server");

// Always start HTTP server (with error handling for port conflicts)
const PORT = process.env.PORT || 3001;
console.error(`[STARTUP] Starting HTTP server on port ${PORT}`);
const httpServer = app
  .listen(PORT, () => {
    console.error(`[STARTUP] HTTP server is running on port ${PORT}`);
  })
  .on("error", (error) => {
    if (error.code === "EADDRINUSE" && isDev) {
      // ok for these to be console.error
      console.error(
        `Port ${PORT} is already in use. Run this command to kill the process:`
      );
      console.error(`lsof -ti:${PORT} | xargs kill -9`);
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
    console.error("[STARTUP] STDIO transport connected successfully");
  })
  .catch((error) => {
    console.error(
      `[STARTUP] Error connecting STDIO transport: ${error.message}`
    );
    // Don't exit - HTTP server might still be running
  });

// Handle process termination signals
process.on("SIGINT", () => {
  console.error("[SHUTDOWN] Received SIGINT, shutting down");
  if (httpServer) {
    httpServer.close();
  }
  process.exit(0);
});

process.on("SIGTERM", () => {
  console.error("[SHUTDOWN] Received SIGTERM, shutting down");
  if (httpServer) {
    httpServer.close();
  }
  process.exit(0);
});

// Keep the process alive for STDIO transport
process.stdin.resume();

// EVERYTHING BELOW THIS LINE WAS REMOVED - THE SDK HANDLES IT
// Previously we had manual handling of:
// - initialize
// - tools/list
// - tools/call
// - resources/list
// - notifications
// All of this is now properly handled by transport.handleRequest()
