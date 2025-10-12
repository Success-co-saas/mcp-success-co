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
  getTeams,
  getUsers,
  getTodos,
  getRocks,
  getMeetings,
  getIssues,
  getHeadlines,
  getVisions,
  getVisionCoreValues,
  getVisionCoreFocusTypes,
  getVisionThreeYearGoals,
  getVisionMarketStrategies,
  getRockStatuses,
  getMilestones,
  getMilestoneStatuses,
  getTeamsOnRocks,
  analyzeEOSData,
  search,
  fetch,
  setSuccessCoApiKey,
  getSuccessCoApiKeyTool,
  getGraphQLDebugLog,
  getSuccessCoApiKey,
  callSuccessCoGraphQL,
  getDataFields,
  getDataValues,
  getTeamsOnDataFields,
  getDataFieldStatuses,
  analyzeScorecardMetrics,
  getMeetingInfos,
  getMeetingAgendas,
  getMeetingAgendaSections,
  getMeetingInfoStatuses,
  getMeetingAgendaStatuses,
  getMeetingAgendaTypes,
  getIssueStatuses,
  getLeadershipVTO,
} from "./tools.js";

// Ensure Node 18+ for global fetch.

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load environment variables from .env file (silently to avoid polluting STDIO)
// Load from the script directory regardless of current working directory
const envPath = path.join(__dirname, ".env");
try {
  const result = dotenv.config({
    path: envPath,
    silent: true,
    quiet: true,
    override: false,
  });
  // Note: We can't log here because logToFile isn't defined yet
} catch (error) {
  // Silently ignore .env file errors to avoid polluting STDIO
}
const API_KEY_FILE = path.join(__dirname, ".api_key");

// Check if running in development mode
const isDev =
  process.env.NODE_ENV === "development" ||
  process.env.NODE_ENV !== "production";

// --- Success.co API key management ------------------------------------------

// --- MCP server --------------------------------------------------------------

const server = new McpServer({
  name: "Success.co MCP Server",
  version: "0.0.3",
});

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

// Tool to get GraphQL debug log status and recent entries
server.tool(
  "getGraphQLDebugLog",
  "Get GraphQL debug log status and recent entries (dev mode only)",
  {
    type: "object",
    properties: {
      lines: {
        type: "number",
        description: "Number of recent lines to show (default: 50)",
        default: 50,
      },
    },
  },
  async (args) => {
    return await getGraphQLDebugLog(args);
  }
);

// ---------- Teams tool (kept) -----------------------------------------------

server.tool(
  "getTeams",
  "List Success.co teams",
  {
    first: z.number().int().optional().describe("Optional page size"),
    offset: z.number().int().optional().describe("Optional offset"),
    stateId: z
      .string()
      .optional()
      .describe("Team state filter (defaults to 'ACTIVE')"),
  },
  async ({ first, offset, stateId }) => {
    return await getTeams({ first, offset, stateId });
  }
);

// ---------- Users tool ------------------------------------------------------

server.tool(
  "getUsers",
  "List Success.co users",
  {
    first: z.number().int().optional().describe("Optional page size"),
    offset: z.number().int().optional().describe("Optional offset"),
    stateId: z
      .string()
      .optional()
      .describe("User state filter (defaults to 'ACTIVE')"),
  },
  async ({ first, offset, stateId }) => {
    return await getUsers({ first, offset, stateId });
  }
);

// ---------- Todos tool ------------------------------------------------------

server.tool(
  "getTodos",
  "List Success.co todos",
  {
    first: z.number().int().optional().describe("Optional page size"),
    offset: z.number().int().optional().describe("Optional offset"),
    stateId: z
      .string()
      .optional()
      .describe("Todo state filter (defaults to 'ACTIVE')"),
  },
  async ({ first, offset, stateId }) => {
    return await getTodos({ first, offset, stateId });
  }
);

// ---------- Rocks tool ------------------------------------------------------

server.tool(
  "getRocks",
  "List Success.co rocks",
  {
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
  async ({ first, offset, stateId, rockStatusId }) => {
    return await getRocks({ first, offset, stateId, rockStatusId });
  }
);

// ---------- Meetings tool ------------------------------------------------------

server.tool(
  "getMeetings",
  "List Success.co meetings",
  {
    first: z.number().int().optional().describe("Optional page size"),
    offset: z.number().int().optional().describe("Optional offset"),
    stateId: z
      .string()
      .optional()
      .describe("Meeting state filter (defaults to 'ACTIVE')"),
  },
  async ({ first, offset, stateId }) => {
    return await getMeetings({ first, offset, stateId });
  }
);

// ---------- Issues tool ------------------------------------------------------

server.tool(
  "getIssues",
  "List Success.co issues",
  {
    first: z.number().int().optional().describe("Optional page size"),
    offset: z.number().int().optional().describe("Optional offset"),
    stateId: z
      .string()
      .optional()
      .describe("Issue state filter (defaults to 'ACTIVE')"),
  },
  async ({ first, offset, stateId }) => {
    return await getIssues({ first, offset, stateId });
  }
);

// ---------- Headlines tool ------------------------------------------------------

server.tool(
  "getHeadlines",
  "List Success.co headlines",
  {
    first: z.number().int().optional().describe("Optional page size"),
    offset: z.number().int().optional().describe("Optional offset"),
    stateId: z
      .string()
      .optional()
      .describe("Headline state filter (defaults to 'ACTIVE')"),
  },
  async ({ first, offset, stateId }) => {
    return await getHeadlines({ first, offset, stateId });
  }
);

// ---------- Visions tool ------------------------------------------------------

server.tool(
  "getVisions",
  "List Success.co visions",
  {
    first: z.number().int().optional().describe("Optional page size"),
    offset: z.number().int().optional().describe("Optional offset"),
    stateId: z
      .string()
      .optional()
      .describe("Vision state filter (defaults to 'ACTIVE')"),
    teamId: z.string().optional().describe("Filter by team ID"),
    isLeadership: z.boolean().optional().describe("Filter by leadership team"),
  },
  async ({ first, offset, stateId, teamId, isLeadership }) => {
    return await getVisions({ first, offset, stateId, teamId, isLeadership });
  }
);

// ---------- Vision Core Values tool -------------------------------------------

server.tool(
  "getVisionCoreValues",
  "List Success.co vision core values",
  {
    first: z.number().int().optional().describe("Optional page size"),
    offset: z.number().int().optional().describe("Optional offset"),
    stateId: z
      .string()
      .optional()
      .describe("Core value state filter (defaults to 'ACTIVE')"),
    visionId: z.string().optional().describe("Filter by vision ID"),
  },
  async ({ first, offset, stateId, visionId }) => {
    return await getVisionCoreValues({ first, offset, stateId, visionId });
  }
);

// ---------- Vision Core Focus Types tool -------------------------------------

server.tool(
  "getVisionCoreFocusTypes",
  "List Success.co vision core focus types",
  {
    first: z.number().int().optional().describe("Optional page size"),
    offset: z.number().int().optional().describe("Optional offset"),
    stateId: z
      .string()
      .optional()
      .describe("Core focus state filter (defaults to 'ACTIVE')"),
    visionId: z.string().optional().describe("Filter by vision ID"),
    type: z.string().optional().describe("Filter by type"),
  },
  async ({ first, offset, stateId, visionId, type }) => {
    return await getVisionCoreFocusTypes({
      first,
      offset,
      stateId,
      visionId,
      type,
    });
  }
);

// ---------- Vision Three Year Goals tool -------------------------------------

server.tool(
  "getVisionThreeYearGoals",
  "List Success.co vision three year goals",
  {
    first: z.number().int().optional().describe("Optional page size"),
    offset: z.number().int().optional().describe("Optional offset"),
    stateId: z
      .string()
      .optional()
      .describe("Goal state filter (defaults to 'ACTIVE')"),
    visionId: z.string().optional().describe("Filter by vision ID"),
    type: z.string().optional().describe("Filter by type"),
  },
  async ({ first, offset, stateId, visionId, type }) => {
    return await getVisionThreeYearGoals({
      first,
      offset,
      stateId,
      visionId,
      type,
    });
  }
);

// ---------- Vision Market Strategies tool -------------------------------------

server.tool(
  "getVisionMarketStrategies",
  "List Success.co vision market strategies",
  {
    first: z.number().int().optional().describe("Optional page size"),
    offset: z.number().int().optional().describe("Optional offset"),
    stateId: z
      .string()
      .optional()
      .describe("Strategy state filter (defaults to 'ACTIVE')"),
    visionId: z.string().optional().describe("Filter by vision ID"),
    isCustom: z.boolean().optional().describe("Filter by custom status"),
  },
  async ({ first, offset, stateId, visionId, isCustom }) => {
    return await getVisionMarketStrategies({
      first,
      offset,
      stateId,
      visionId,
      isCustom,
    });
  }
);

// ---------- Rock Statuses tool ----------------------------------------------

server.tool(
  "getRockStatuses",
  "List Success.co rock statuses",
  {
    first: z.number().int().optional().describe("Optional page size"),
    offset: z.number().int().optional().describe("Optional offset"),
    stateId: z
      .string()
      .optional()
      .describe("Rock status state filter (defaults to 'ACTIVE')"),
  },
  async ({ first, offset, stateId }) => {
    return await getRockStatuses({ first, offset, stateId });
  }
);

// ---------- Milestones tool -------------------------------------------------

server.tool(
  "getMilestones",
  "List Success.co milestones",
  {
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
  async ({ first, offset, stateId, rockId, userId, teamId }) => {
    return await getMilestones({
      first,
      offset,
      stateId,
      rockId,
      userId,
      teamId,
    });
  }
);

// ---------- Milestone Statuses tool -----------------------------------------

server.tool(
  "getMilestoneStatuses",
  "List Success.co milestone statuses",
  {
    first: z.number().int().optional().describe("Optional page size"),
    offset: z.number().int().optional().describe("Optional offset"),
  },
  async ({ first, offset }) => {
    return await getMilestoneStatuses({ first, offset });
  }
);

// ---------- Teams on Rocks tool --------------------------------------------

server.tool(
  "getTeamsOnRocks",
  "List Success.co teams on rocks relationships",
  {
    first: z.number().int().optional().describe("Optional page size"),
    offset: z.number().int().optional().describe("Optional offset"),
    stateId: z
      .string()
      .optional()
      .describe("Team-rock state filter (defaults to 'ACTIVE')"),
    rockId: z.string().optional().describe("Filter by rock ID"),
    teamId: z.string().optional().describe("Filter by team ID"),
  },
  async ({ first, offset, stateId, rockId, teamId }) => {
    return await getTeamsOnRocks({ first, offset, stateId, rockId, teamId });
  }
);

// ---------- EOS Data Analysis tool ------------------------------------------

server.tool(
  "analyzeEOSData",
  "Analyze EOS/Traction framework data to answer complex business questions. Automatically detects query intent and provides comprehensive analysis of rocks, teams, and performance metrics. Use this for questions about project status, deadlines, team performance, and business operations.",
  {
    query: z
      .string()
      .describe(
        "The analytical question to answer (e.g., 'Which rocks are at risk?', 'Show overdue items', 'How is team performance?')"
      ),
    teamId: z
      .string()
      .optional()
      .describe("Optional team filter - filter analysis to specific team"),
    userId: z
      .string()
      .optional()
      .describe("Optional user filter - filter analysis to specific user"),
    timeframe: z
      .string()
      .optional()
      .describe(
        "Optional timeframe filter - 'quarter', 'month', 'week', or 'year'"
      ),
  },
  async ({ query, teamId, userId, timeframe }) => {
    return await analyzeEOSData({ query, teamId, userId, timeframe });
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

// ---------- Data Fields tool (Scorecard KPIs) ---------------------------------

server.tool(
  "getDataFields",
  "List Success.co data fields (Scorecard KPIs)",
  {
    first: z.number().int().optional().describe("Optional page size"),
    offset: z.number().int().optional().describe("Optional offset"),
    stateId: z
      .string()
      .optional()
      .describe("Data field state filter (defaults to 'ACTIVE')"),
    teamId: z.string().optional().describe("Filter by team ID"),
    userId: z.string().optional().describe("Filter by user ID"),
    type: z.string().optional().describe("Filter by data field type"),
  },
  async ({ first, offset, stateId, teamId, userId, type }) => {
    return await getDataFields({
      first,
      offset,
      stateId,
      teamId,
      userId,
      type,
    });
  }
);

// ---------- Data Values tool (Scorecard metrics) -----------------------------

server.tool(
  "getDataValues",
  "List Success.co data values (Scorecard metrics)",
  {
    first: z.number().int().optional().describe("Optional page size"),
    offset: z.number().int().optional().describe("Optional offset"),
    stateId: z
      .string()
      .optional()
      .describe("Data value state filter (defaults to 'ACTIVE')"),
    dataFieldId: z.string().optional().describe("Filter by data field ID"),
    startDate: z
      .string()
      .optional()
      .describe("Filter by start date (YYYY-MM-DD)"),
    endDate: z.string().optional().describe("Filter by end date (YYYY-MM-DD)"),
  },
  async ({ first, offset, stateId, dataFieldId, startDate, endDate }) => {
    return await getDataValues({
      first,
      offset,
      stateId,
      dataFieldId,
      startDate,
      endDate,
    });
  }
);

// ---------- Teams on Data Fields tool (Scorecard team assignments) ------------

server.tool(
  "getTeamsOnDataFields",
  "List Success.co teams on data fields relationships (Scorecard team assignments)",
  {
    first: z.number().int().optional().describe("Optional page size"),
    offset: z.number().int().optional().describe("Optional offset"),
    stateId: z
      .string()
      .optional()
      .describe("Team-data field state filter (defaults to 'ACTIVE')"),
    teamId: z.string().optional().describe("Filter by team ID"),
    dataFieldId: z.string().optional().describe("Filter by data field ID"),
  },
  async ({ first, offset, stateId, teamId, dataFieldId }) => {
    return await getTeamsOnDataFields({
      first,
      offset,
      stateId,
      teamId,
      dataFieldId,
    });
  }
);

// ---------- Data Field Statuses tool ------------------------------------------

server.tool(
  "getDataFieldStatuses",
  "List Success.co data field statuses",
  {
    first: z.number().int().optional().describe("Optional page size"),
    offset: z.number().int().optional().describe("Optional offset"),
    stateId: z
      .string()
      .optional()
      .describe("Data field status state filter (defaults to 'ACTIVE')"),
  },
  async ({ first, offset, stateId }) => {
    return await getDataFieldStatuses({ first, offset, stateId });
  }
);

// ---------- Scorecard Metrics Analysis tool ------------------------------------

server.tool(
  "analyzeScorecardMetrics",
  "Analyze Scorecard metrics and KPIs to answer business questions. Automatically detects query intent and provides comprehensive analysis of KPIs, targets, and performance trends. Use this for questions about scorecard performance, KPI targets, and metric analysis.",
  {
    query: z
      .string()
      .describe(
        "The analytical question to answer (e.g., 'Give me the last 12 weeks of Scorecard metrics for my team and flag any KPI below target', 'Show KPI trends', 'Which KPIs are underperforming?')"
      ),
    teamId: z
      .string()
      .optional()
      .describe("Optional team filter - filter analysis to specific team"),
    userId: z
      .string()
      .optional()
      .describe("Optional user filter - filter analysis to specific user"),
    timeframe: z
      .string()
      .optional()
      .describe(
        "Optional timeframe filter - 'quarter', 'month', 'week', or 'year'"
      ),
    weeks: z
      .number()
      .int()
      .optional()
      .describe("Number of weeks to analyze (defaults to 12)"),
  },
  async ({ query, teamId, userId, timeframe, weeks }) => {
    return await analyzeScorecardMetrics({
      query,
      teamId,
      userId,
      timeframe,
      weeks,
    });
  }
);

// ---------- Meeting Infos tool -------------------------------------------------

server.tool(
  "getMeetingInfos",
  "List Success.co meeting infos",
  {
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
  async ({ first, offset, stateId, teamId, meetingInfoStatusId }) => {
    return await getMeetingInfos({
      first,
      offset,
      stateId,
      teamId,
      meetingInfoStatusId,
    });
  }
);

// ---------- Meeting Agendas tool -----------------------------------------------

server.tool(
  "getMeetingAgendas",
  "List Success.co meeting agendas",
  {
    first: z.number().int().optional().describe("Optional page size"),
    offset: z.number().int().optional().describe("Optional offset"),
    stateId: z
      .string()
      .optional()
      .describe("Meeting agenda state filter (defaults to 'ACTIVE')"),
    teamId: z.string().optional().describe("Filter by team ID"),
    meetingAgendaStatusId: z
      .string()
      .optional()
      .describe("Filter by meeting agenda status ID"),
    meetingAgendaTypeId: z
      .string()
      .optional()
      .describe("Filter by meeting agenda type ID"),
  },
  async ({
    first,
    offset,
    stateId,
    teamId,
    meetingAgendaStatusId,
    meetingAgendaTypeId,
  }) => {
    return await getMeetingAgendas({
      first,
      offset,
      stateId,
      teamId,
      meetingAgendaStatusId,
      meetingAgendaTypeId,
    });
  }
);

// ---------- Meeting Agenda Sections tool ---------------------------------------

server.tool(
  "getMeetingAgendaSections",
  "List Success.co meeting agenda sections",
  {
    first: z.number().int().optional().describe("Optional page size"),
    offset: z.number().int().optional().describe("Optional offset"),
    stateId: z
      .string()
      .optional()
      .describe("Meeting agenda section state filter (defaults to 'ACTIVE')"),
    meetingAgendaId: z
      .string()
      .optional()
      .describe("Filter by meeting agenda ID"),
    type: z.string().optional().describe("Filter by section type"),
  },
  async ({ first, offset, stateId, meetingAgendaId, type }) => {
    return await getMeetingAgendaSections({
      first,
      offset,
      stateId,
      meetingAgendaId,
      type,
    });
  }
);

// ---------- Meeting Info Statuses tool -----------------------------------------

server.tool(
  "getMeetingInfoStatuses",
  "List Success.co meeting info statuses",
  {
    first: z.number().int().optional().describe("Optional page size"),
    offset: z.number().int().optional().describe("Optional offset"),
    stateId: z
      .string()
      .optional()
      .describe("Meeting info status state filter (defaults to 'ACTIVE')"),
  },
  async ({ first, offset, stateId }) => {
    return await getMeetingInfoStatuses({ first, offset, stateId });
  }
);

// ---------- Meeting Agenda Statuses tool ---------------------------------------

server.tool(
  "getMeetingAgendaStatuses",
  "List Success.co meeting agenda statuses",
  {
    first: z.number().int().optional().describe("Optional page size"),
    offset: z.number().int().optional().describe("Optional offset"),
    stateId: z
      .string()
      .optional()
      .describe("Meeting agenda status state filter (defaults to 'ACTIVE')"),
  },
  async ({ first, offset, stateId }) => {
    return await getMeetingAgendaStatuses({ first, offset, stateId });
  }
);

// ---------- Meeting Agenda Types tool ------------------------------------------

server.tool(
  "getMeetingAgendaTypes",
  "List Success.co meeting agenda types",
  {
    first: z.number().int().optional().describe("Optional page size"),
    offset: z.number().int().optional().describe("Optional offset"),
    stateId: z
      .string()
      .optional()
      .describe("Meeting agenda type state filter (defaults to 'ACTIVE')"),
  },
  async ({ first, offset, stateId }) => {
    return await getMeetingAgendaTypes({ first, offset, stateId });
  }
);

// ---------- Issue Statuses tool ------------------------------------------------

server.tool(
  "getIssueStatuses",
  "List Success.co issue statuses",
  {
    first: z.number().int().optional().describe("Optional page size"),
    offset: z.number().int().optional().describe("Optional offset"),
    stateId: z
      .string()
      .optional()
      .describe("Issue status state filter (defaults to 'ACTIVE')"),
  },
  async ({ first, offset, stateId }) => {
    return await getIssueStatuses({ first, offset, stateId });
  }
);

// ---------- Leadership VTO tool ------------------------------------------------

server.tool(
  "getLeadershipVTO",
  "Get the complete leadership Vision/Traction Organizer in one call. Fetches all VTO components (core values, core focus, goals, market strategies) in parallel for maximum efficiency.",
  {
    stateId: z
      .string()
      .optional()
      .describe("State filter (defaults to 'ACTIVE')"),
  },
  async ({ stateId }) => {
    return await getLeadershipVTO({ stateId });
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

  // Tool to get GraphQL debug log status and recent entries
  freshServer.tool(
    "getGraphQLDebugLog",
    "Get GraphQL debug log status and recent entries (dev mode only)",
    {
      lines: z
        .number()
        .optional()
        .describe("Number of recent lines to show (default: 50)"),
    },
    async (args) => {
      return await getGraphQLDebugLog(args);
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
      stateId: z
        .string()
        .optional()
        .describe("Team state filter (defaults to 'ACTIVE')"),
    },
    async ({ first, offset, stateId }) => {
      return await getTeams({ first, offset, stateId });
    }
  );

  // Users tool
  freshServer.tool(
    "getUsers",
    "List Success.co users",
    {
      first: z.number().int().optional().describe("Optional page size"),
      offset: z.number().int().optional().describe("Optional offset"),
      stateId: z
        .string()
        .optional()
        .describe("User state filter (defaults to 'ACTIVE')"),
    },
    async ({ first, offset, stateId }) => {
      return await getUsers({ first, offset, stateId });
    }
  );

  // Todos tool
  freshServer.tool(
    "getTodos",
    "List Success.co todos",
    {
      first: z.number().int().optional().describe("Optional page size"),
      offset: z.number().int().optional().describe("Optional offset"),
      stateId: z
        .string()
        .optional()
        .describe("Todo state filter (defaults to 'ACTIVE')"),
    },
    async ({ first, offset, stateId }) => {
      return await getTodos({ first, offset, stateId });
    }
  );

  // Rocks tool
  freshServer.tool(
    "getRocks",
    "List Success.co rocks",
    {
      first: z.number().int().optional().describe("Optional page size"),
      offset: z.number().int().optional().describe("Optional offset"),
      stateId: z
        .string()
        .optional()
        .describe("Rock state filter (defaults to 'ACTIVE')"),
      rockStatusId: z
        .string()
        .optional()
        .describe("Rock status filter (defaults to blank)"),
    },
    async ({ first, offset, stateId, rockStatusId }) => {
      return await getRocks({ first, offset, stateId, rockStatusId });
    }
  );

  // Meetings tool
  freshServer.tool(
    "getMeetings",
    "List Success.co meetings",
    {
      first: z.number().int().optional().describe("Optional page size"),
      offset: z.number().int().optional().describe("Optional offset"),
      stateId: z
        .string()
        .optional()
        .describe("Meeting state filter (defaults to 'ACTIVE')"),
    },
    async ({ first, offset, stateId }) => {
      return await getMeetings({ first, offset, stateId });
    }
  );

  // Issues tool
  freshServer.tool(
    "getIssues",
    "List Success.co issues",
    {
      first: z.number().int().optional().describe("Optional page size"),
      offset: z.number().int().optional().describe("Optional offset"),
      stateId: z
        .string()
        .optional()
        .describe("Issue state filter (defaults to 'ACTIVE')"),
    },
    async ({ first, offset, stateId }) => {
      return await getIssues({ first, offset, stateId });
    }
  );

  // Headlines tool
  freshServer.tool(
    "getHeadlines",
    "List Success.co headlines",
    {
      first: z.number().int().optional().describe("Optional page size"),
      offset: z.number().int().optional().describe("Optional offset"),
      stateId: z
        .string()
        .optional()
        .describe("Headline state filter (defaults to 'ACTIVE')"),
    },
    async ({ first, offset, stateId }) => {
      return await getHeadlines({ first, offset, stateId });
    }
  );

  // Visions tool
  freshServer.tool(
    "getVisions",
    "List Success.co visions",
    {
      first: z.number().int().optional().describe("Optional page size"),
      offset: z.number().int().optional().describe("Optional offset"),
      stateId: z
        .string()
        .optional()
        .describe("Vision state filter (defaults to 'ACTIVE')"),
      teamId: z.string().optional().describe("Filter by team ID"),
      isLeadership: z
        .boolean()
        .optional()
        .describe("Filter by leadership team"),
    },
    async ({ first, offset, stateId, teamId, isLeadership }) => {
      return await getVisions({ first, offset, stateId, teamId, isLeadership });
    }
  );

  // Vision Core Values tool
  freshServer.tool(
    "getVisionCoreValues",
    "List Success.co vision core values",
    {
      first: z.number().int().optional().describe("Optional page size"),
      offset: z.number().int().optional().describe("Optional offset"),
      stateId: z
        .string()
        .optional()
        .describe("Core value state filter (defaults to 'ACTIVE')"),
      visionId: z.string().optional().describe("Filter by vision ID"),
    },
    async ({ first, offset, stateId, visionId }) => {
      return await getVisionCoreValues({ first, offset, stateId, visionId });
    }
  );

  // Vision Core Focus Types tool
  freshServer.tool(
    "getVisionCoreFocusTypes",
    "List Success.co vision core focus types",
    {
      first: z.number().int().optional().describe("Optional page size"),
      offset: z.number().int().optional().describe("Optional offset"),
      stateId: z
        .string()
        .optional()
        .describe("Core focus state filter (defaults to 'ACTIVE')"),
      visionId: z.string().optional().describe("Filter by vision ID"),
      type: z.string().optional().describe("Filter by type"),
    },
    async ({ first, offset, stateId, visionId, type }) => {
      return await getVisionCoreFocusTypes({
        first,
        offset,
        stateId,
        visionId,
        type,
      });
    }
  );

  // Vision Three Year Goals tool
  freshServer.tool(
    "getVisionThreeYearGoals",
    "List Success.co vision three year goals",
    {
      first: z.number().int().optional().describe("Optional page size"),
      offset: z.number().int().optional().describe("Optional offset"),
      stateId: z
        .string()
        .optional()
        .describe("Goal state filter (defaults to 'ACTIVE')"),
      visionId: z.string().optional().describe("Filter by vision ID"),
      type: z.string().optional().describe("Filter by type"),
    },
    async ({ first, offset, stateId, visionId, type }) => {
      return await getVisionThreeYearGoals({
        first,
        offset,
        stateId,
        visionId,
        type,
      });
    }
  );

  // Vision Market Strategies tool
  freshServer.tool(
    "getVisionMarketStrategies",
    "List Success.co vision market strategies",
    {
      first: z.number().int().optional().describe("Optional page size"),
      offset: z.number().int().optional().describe("Optional offset"),
      stateId: z
        .string()
        .optional()
        .describe("Strategy state filter (defaults to 'ACTIVE')"),
      visionId: z.string().optional().describe("Filter by vision ID"),
      isCustom: z.boolean().optional().describe("Filter by custom status"),
    },
    async ({ first, offset, stateId, visionId, isCustom }) => {
      return await getVisionMarketStrategies({
        first,
        offset,
        stateId,
        visionId,
        isCustom,
      });
    }
  );

  // Rock Statuses tool
  freshServer.tool(
    "getRockStatuses",
    "List Success.co rock statuses",
    {
      first: z.number().int().optional().describe("Optional page size"),
      offset: z.number().int().optional().describe("Optional offset"),
      stateId: z
        .string()
        .optional()
        .describe("Rock status state filter (defaults to 'ACTIVE')"),
    },
    async ({ first, offset, stateId }) => {
      return await getRockStatuses({ first, offset, stateId });
    }
  );

  // Milestones tool
  freshServer.tool(
    "getMilestones",
    "List Success.co milestones",
    {
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
    async ({ first, offset, stateId, rockId, userId, teamId }) => {
      return await getMilestones({
        first,
        offset,
        stateId,
        rockId,
        userId,
        teamId,
      });
    }
  );

  // Milestone Statuses tool
  freshServer.tool(
    "getMilestoneStatuses",
    "List Success.co milestone statuses",
    {
      first: z.number().int().optional().describe("Optional page size"),
      offset: z.number().int().optional().describe("Optional offset"),
    },
    async ({ first, offset }) => {
      return await getMilestoneStatuses({ first, offset });
    }
  );

  // Teams on Rocks tool
  freshServer.tool(
    "getTeamsOnRocks",
    "List Success.co teams on rocks relationships",
    {
      first: z.number().int().optional().describe("Optional page size"),
      offset: z.number().int().optional().describe("Optional offset"),
      stateId: z
        .string()
        .optional()
        .describe("Team-rock state filter (defaults to 'ACTIVE')"),
      rockId: z.string().optional().describe("Filter by rock ID"),
      teamId: z.string().optional().describe("Filter by team ID"),
    },
    async ({ first, offset, stateId, rockId, teamId }) => {
      return await getTeamsOnRocks({ first, offset, stateId, rockId, teamId });
    }
  );

  // EOS Data Analysis tool
  freshServer.tool(
    "analyzeEOSData",
    "Analyze EOS/Traction framework data to answer complex business questions. Automatically detects query intent and provides comprehensive analysis of rocks, teams, and performance metrics. Use this for questions about project status, deadlines, team performance, and business operations.",
    {
      query: z
        .string()
        .describe(
          "The analytical question to answer (e.g., 'Which rocks are at risk?', 'Show overdue items', 'How is team performance?')"
        ),
      teamId: z
        .string()
        .optional()
        .describe("Optional team filter - filter analysis to specific team"),
      userId: z
        .string()
        .optional()
        .describe("Optional user filter - filter analysis to specific user"),
      timeframe: z
        .string()
        .optional()
        .describe(
          "Optional timeframe filter - 'quarter', 'month', 'week', or 'year'"
        ),
    },
    async ({ query, teamId, userId, timeframe }) => {
      return await analyzeEOSData({ query, teamId, userId, timeframe });
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

  // Data Fields tool
  freshServer.tool(
    "getDataFields",
    "List Success.co data fields (Scorecard KPIs)",
    {
      first: z.number().int().optional().describe("Optional page size"),
      offset: z.number().int().optional().describe("Optional offset"),
      stateId: z
        .string()
        .optional()
        .describe("Data field state filter (defaults to 'ACTIVE')"),
      teamId: z.string().optional().describe("Filter by team ID"),
      userId: z.string().optional().describe("Filter by user ID"),
      type: z.string().optional().describe("Filter by data field type"),
    },
    async ({ first, offset, stateId, teamId, userId, type }) => {
      return await getDataFields({
        first,
        offset,
        stateId,
        teamId,
        userId,
        type,
      });
    }
  );

  // Data Values tool
  freshServer.tool(
    "getDataValues",
    "List Success.co data values (Scorecard metrics)",
    {
      first: z.number().int().optional().describe("Optional page size"),
      offset: z.number().int().optional().describe("Optional offset"),
      stateId: z
        .string()
        .optional()
        .describe("Data value state filter (defaults to 'ACTIVE')"),
      dataFieldId: z.string().optional().describe("Filter by data field ID"),
      startDate: z
        .string()
        .optional()
        .describe("Filter by start date (YYYY-MM-DD)"),
      endDate: z
        .string()
        .optional()
        .describe("Filter by end date (YYYY-MM-DD)"),
    },
    async ({ first, offset, stateId, dataFieldId, startDate, endDate }) => {
      return await getDataValues({
        first,
        offset,
        stateId,
        dataFieldId,
        startDate,
        endDate,
      });
    }
  );

  // Teams on Data Fields tool
  freshServer.tool(
    "getTeamsOnDataFields",
    "List Success.co teams on data fields relationships (Scorecard team assignments)",
    {
      first: z.number().int().optional().describe("Optional page size"),
      offset: z.number().int().optional().describe("Optional offset"),
      stateId: z
        .string()
        .optional()
        .describe("Team-data field state filter (defaults to 'ACTIVE')"),
      teamId: z.string().optional().describe("Filter by team ID"),
      dataFieldId: z.string().optional().describe("Filter by data field ID"),
    },
    async ({ first, offset, stateId, teamId, dataFieldId }) => {
      return await getTeamsOnDataFields({
        first,
        offset,
        stateId,
        teamId,
        dataFieldId,
      });
    }
  );

  // Data Field Statuses tool
  freshServer.tool(
    "getDataFieldStatuses",
    "List Success.co data field statuses",
    {
      first: z.number().int().optional().describe("Optional page size"),
      offset: z.number().int().optional().describe("Optional offset"),
      stateId: z
        .string()
        .optional()
        .describe("Data field status state filter (defaults to 'ACTIVE')"),
    },
    async ({ first, offset, stateId }) => {
      return await getDataFieldStatuses({ first, offset, stateId });
    }
  );

  // Scorecard Metrics Analysis tool
  freshServer.tool(
    "analyzeScorecardMetrics",
    "Analyze Scorecard metrics and KPIs to answer business questions. Automatically detects query intent and provides comprehensive analysis of KPIs, targets, and performance trends. Use this for questions about scorecard performance, KPI targets, and metric analysis.",
    {
      query: z
        .string()
        .describe(
          "The analytical question to answer (e.g., 'Give me the last 12 weeks of Scorecard metrics for my team and flag any KPI below target', 'Show KPI trends', 'Which KPIs are underperforming?')"
        ),
      teamId: z
        .string()
        .optional()
        .describe("Optional team filter - filter analysis to specific team"),
      userId: z
        .string()
        .optional()
        .describe("Optional user filter - filter analysis to specific user"),
      timeframe: z
        .string()
        .optional()
        .describe(
          "Optional timeframe filter - 'quarter', 'month', 'week', or 'year'"
        ),
      weeks: z
        .number()
        .int()
        .optional()
        .describe("Number of weeks to analyze (defaults to 12)"),
    },
    async ({ query, teamId, userId, timeframe, weeks }) => {
      return await analyzeScorecardMetrics({
        query,
        teamId,
        userId,
        timeframe,
        weeks,
      });
    }
  );

  // Meeting Infos tool
  freshServer.tool(
    "getMeetingInfos",
    "List Success.co meeting infos",
    {
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
    async ({ first, offset, stateId, teamId, meetingInfoStatusId }) => {
      return await getMeetingInfos({
        first,
        offset,
        stateId,
        teamId,
        meetingInfoStatusId,
      });
    }
  );

  // Meeting Agendas tool
  freshServer.tool(
    "getMeetingAgendas",
    "List Success.co meeting agendas",
    {
      first: z.number().int().optional().describe("Optional page size"),
      offset: z.number().int().optional().describe("Optional offset"),
      stateId: z
        .string()
        .optional()
        .describe("Meeting agenda state filter (defaults to 'ACTIVE')"),
      teamId: z.string().optional().describe("Filter by team ID"),
      meetingAgendaStatusId: z
        .string()
        .optional()
        .describe("Filter by meeting agenda status ID"),
      meetingAgendaTypeId: z
        .string()
        .optional()
        .describe("Filter by meeting agenda type ID"),
    },
    async ({
      first,
      offset,
      stateId,
      teamId,
      meetingAgendaStatusId,
      meetingAgendaTypeId,
    }) => {
      return await getMeetingAgendas({
        first,
        offset,
        stateId,
        teamId,
        meetingAgendaStatusId,
        meetingAgendaTypeId,
      });
    }
  );

  // Meeting Agenda Sections tool
  freshServer.tool(
    "getMeetingAgendaSections",
    "List Success.co meeting agenda sections",
    {
      first: z.number().int().optional().describe("Optional page size"),
      offset: z.number().int().optional().describe("Optional offset"),
      stateId: z
        .string()
        .optional()
        .describe("Meeting agenda section state filter (defaults to 'ACTIVE')"),
      meetingAgendaId: z
        .string()
        .optional()
        .describe("Filter by meeting agenda ID"),
      type: z.string().optional().describe("Filter by section type"),
    },
    async ({ first, offset, stateId, meetingAgendaId, type }) => {
      return await getMeetingAgendaSections({
        first,
        offset,
        stateId,
        meetingAgendaId,
        type,
      });
    }
  );

  // Meeting Info Statuses tool
  freshServer.tool(
    "getMeetingInfoStatuses",
    "List Success.co meeting info statuses",
    {
      first: z.number().int().optional().describe("Optional page size"),
      offset: z.number().int().optional().describe("Optional offset"),
      stateId: z
        .string()
        .optional()
        .describe("Meeting info status state filter (defaults to 'ACTIVE')"),
    },
    async ({ first, offset, stateId }) => {
      return await getMeetingInfoStatuses({ first, offset, stateId });
    }
  );

  // Meeting Agenda Statuses tool
  freshServer.tool(
    "getMeetingAgendaStatuses",
    "List Success.co meeting agenda statuses",
    {
      first: z.number().int().optional().describe("Optional page size"),
      offset: z.number().int().optional().describe("Optional offset"),
      stateId: z
        .string()
        .optional()
        .describe("Meeting agenda status state filter (defaults to 'ACTIVE')"),
    },
    async ({ first, offset, stateId }) => {
      return await getMeetingAgendaStatuses({ first, offset, stateId });
    }
  );

  // Meeting Agenda Types tool
  freshServer.tool(
    "getMeetingAgendaTypes",
    "List Success.co meeting agenda types",
    {
      first: z.number().int().optional().describe("Optional page size"),
      offset: z.number().int().optional().describe("Optional offset"),
      stateId: z
        .string()
        .optional()
        .describe("Meeting agenda type state filter (defaults to 'ACTIVE')"),
    },
    async ({ first, offset, stateId }) => {
      return await getMeetingAgendaTypes({ first, offset, stateId });
    }
  );

  // Issue Statuses tool
  freshServer.tool(
    "getIssueStatuses",
    "List Success.co issue statuses",
    {
      first: z.number().int().optional().describe("Optional page size"),
      offset: z.number().int().optional().describe("Optional offset"),
      stateId: z
        .string()
        .optional()
        .describe("Issue status state filter (defaults to 'ACTIVE')"),
    },
    async ({ first, offset, stateId }) => {
      return await getIssueStatuses({ first, offset, stateId });
    }
  );

  // Leadership VTO tool
  freshServer.tool(
    "getLeadershipVTO",
    "Get the complete leadership Vision/Traction Organizer in one call. Fetches all VTO components (core values, core focus, goals, market strategies) in parallel for maximum efficiency.",
    {
      stateId: z
        .string()
        .optional()
        .describe("State filter (defaults to 'ACTIVE')"),
    },
    async ({ stateId }) => {
      return await getLeadershipVTO({ stateId });
    }
  );

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
    const toolHandlers = {
      setSuccessCoApiKey: async (args) => {
        return await setSuccessCoApiKey(args);
      },
      getSuccessCoApiKey: async () => {
        return await getSuccessCoApiKeyTool({});
      },
      getGraphQLDebugLog: async (args) => {
        return await getGraphQLDebugLog(args);
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
      getVisions: async (args) => {
        return await getVisions(args);
      },
      getVisionCoreValues: async (args) => {
        return await getVisionCoreValues(args);
      },
      getVisionCoreFocusTypes: async (args) => {
        return await getVisionCoreFocusTypes(args);
      },
      getVisionThreeYearGoals: async (args) => {
        return await getVisionThreeYearGoals(args);
      },
      getVisionMarketStrategies: async (args) => {
        return await getVisionMarketStrategies(args);
      },
      getRockStatuses: async (args) => {
        return await getRockStatuses(args);
      },
      getMilestones: async (args) => {
        return await getMilestones(args);
      },
      getMilestoneStatuses: async (args) => {
        return await getMilestoneStatuses(args);
      },
      getTeamsOnRocks: async (args) => {
        return await getTeamsOnRocks(args);
      },
      analyzeEOSData: async (args) => {
        return await analyzeEOSData(args);
      },
      search: async (args) => {
        return await search(args);
      },
      fetch: async (args) => {
        return await fetch(args);
      },
      getDataFields: async (args) => {
        return await getDataFields(args);
      },
      getDataValues: async (args) => {
        return await getDataValues(args);
      },
      getTeamsOnDataFields: async (args) => {
        return await getTeamsOnDataFields(args);
      },
      getDataFieldStatuses: async (args) => {
        return await getDataFieldStatuses(args);
      },
      analyzeScorecardMetrics: async (args) => {
        return await analyzeScorecardMetrics(args);
      },
      getMeetingInfos: async (args) => {
        return await getMeetingInfos(args);
      },
      getMeetingAgendas: async (args) => {
        return await getMeetingAgendas(args);
      },
      getMeetingAgendaSections: async (args) => {
        return await getMeetingAgendaSections(args);
      },
      getMeetingInfoStatuses: async (args) => {
        return await getMeetingInfoStatuses(args);
      },
      getMeetingAgendaStatuses: async (args) => {
        return await getMeetingAgendaStatuses(args);
      },
      getMeetingAgendaTypes: async (args) => {
        return await getMeetingAgendaTypes(args);
      },
      getIssueStatuses: async (args) => {
        return await getIssueStatuses(args);
      },
      getLeadershipVTO: async (args) => {
        return await getLeadershipVTO(args);
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
              stateId: {
                type: "string",
                description: "Team state filter (defaults to 'ACTIVE')",
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
              stateId: {
                type: "string",
                description: "User state filter (defaults to 'ACTIVE')",
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
              stateId: {
                type: "string",
                description: "Todo state filter (defaults to 'ACTIVE')",
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
              stateId: {
                type: "string",
                description: "Rock state filter (defaults to 'ACTIVE')",
              },
              rockStatusId: {
                type: "string",
                description: "Rock status filter (defaults to blank)",
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
              stateId: {
                type: "string",
                description: "Meeting state filter (defaults to 'ACTIVE')",
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
              stateId: {
                type: "string",
                description: "Issue state filter (defaults to 'ACTIVE')",
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
              stateId: {
                type: "string",
                description: "Headline state filter (defaults to 'ACTIVE')",
              },
            },
          },
        },
        {
          name: "getVisions",
          description: "List Success.co visions",
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
              stateId: {
                type: "string",
                description: "Vision state filter (defaults to 'ACTIVE')",
              },
              teamId: {
                type: "string",
                description: "Filter by team ID",
              },
              isLeadership: {
                type: "boolean",
                description: "Filter by leadership team",
              },
            },
          },
        },
        {
          name: "getVisionCoreValues",
          description: "List Success.co vision core values",
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
              stateId: {
                type: "string",
                description: "Core value state filter (defaults to 'ACTIVE')",
              },
              visionId: {
                type: "string",
                description: "Filter by vision ID",
              },
            },
          },
        },
        {
          name: "getVisionCoreFocusTypes",
          description: "List Success.co vision core focus types",
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
              stateId: {
                type: "string",
                description: "Core focus state filter (defaults to 'ACTIVE')",
              },
              visionId: {
                type: "string",
                description: "Filter by vision ID",
              },
              type: {
                type: "string",
                description: "Filter by type",
              },
            },
          },
        },
        {
          name: "getVisionThreeYearGoals",
          description: "List Success.co vision three year goals",
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
              stateId: {
                type: "string",
                description: "Goal state filter (defaults to 'ACTIVE')",
              },
              visionId: {
                type: "string",
                description: "Filter by vision ID",
              },
              type: {
                type: "string",
                description: "Filter by type",
              },
            },
          },
        },
        {
          name: "getVisionMarketStrategies",
          description: "List Success.co vision market strategies",
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
              stateId: {
                type: "string",
                description: "Strategy state filter (defaults to 'ACTIVE')",
              },
              visionId: {
                type: "string",
                description: "Filter by vision ID",
              },
              isCustom: {
                type: "boolean",
                description: "Filter by custom status",
              },
            },
          },
        },
        {
          name: "getRockStatuses",
          description: "List Success.co rock statuses",
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
              stateId: {
                type: "string",
                description: "Rock status state filter (defaults to 'ACTIVE')",
              },
            },
          },
        },
        {
          name: "getMilestones",
          description: "List Success.co milestones",
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
              stateId: {
                type: "string",
                description: "Milestone state filter (defaults to 'ACTIVE')",
              },
              rockId: {
                type: "string",
                description: "Filter by rock ID",
              },
              userId: {
                type: "string",
                description: "Filter by user ID",
              },
              teamId: {
                type: "string",
                description: "Filter by team ID",
              },
            },
          },
        },
        {
          name: "getMilestoneStatuses",
          description: "List Success.co milestone statuses",
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
          name: "getTeamsOnRocks",
          description: "List Success.co teams on rocks relationships",
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
              stateId: {
                type: "string",
                description: "Team-rock state filter (defaults to 'ACTIVE')",
              },
              rockId: {
                type: "string",
                description: "Filter by rock ID",
              },
              teamId: {
                type: "string",
                description: "Filter by team ID",
              },
            },
          },
        },
        {
          name: "analyzeEOSData",
          description:
            "Analyze EOS/Traction framework data to answer complex business questions. Automatically detects query intent and provides comprehensive analysis of rocks, teams, and performance metrics. Use this for questions about project status, deadlines, team performance, and business operations.",
          inputSchema: {
            type: "object",
            properties: {
              query: {
                type: "string",
                description:
                  "The analytical question to answer (e.g., 'Which rocks are at risk?', 'Show overdue items', 'How is team performance?')",
              },
              teamId: {
                type: "string",
                description:
                  "Optional team filter - filter analysis to specific team",
              },
              userId: {
                type: "string",
                description:
                  "Optional user filter - filter analysis to specific user",
              },
              timeframe: {
                type: "string",
                description:
                  "Optional timeframe filter - 'quarter', 'month', 'week', or 'year'",
              },
            },
            required: ["query"],
          },
        },
        {
          name: "search",
          description:
            "Search Success.co data (supports: teams, users, todos, rocks, meetings, issues, headlines, visions).",
          inputSchema: {
            type: "object",
            properties: {
              query: {
                type: "string",
                description:
                  "What to look up, e.g., 'list my teams', 'show users', 'find todos', 'get meetings', 'show vision'",
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
        {
          name: "getDataFields",
          description: "List Success.co data fields (Scorecard KPIs)",
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
              stateId: {
                type: "string",
                description: "Data field state filter (defaults to 'ACTIVE')",
              },
              teamId: {
                type: "string",
                description: "Filter by team ID",
              },
              userId: {
                type: "string",
                description: "Filter by user ID",
              },
              type: {
                type: "string",
                description: "Filter by data field type",
              },
            },
          },
        },
        {
          name: "getDataValues",
          description: "List Success.co data values (Scorecard metrics)",
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
              stateId: {
                type: "string",
                description: "Data value state filter (defaults to 'ACTIVE')",
              },
              dataFieldId: {
                type: "string",
                description: "Filter by data field ID",
              },
              startDate: {
                type: "string",
                description: "Filter by start date (YYYY-MM-DD)",
              },
              endDate: {
                type: "string",
                description: "Filter by end date (YYYY-MM-DD)",
              },
            },
          },
        },
        {
          name: "getTeamsOnDataFields",
          description:
            "List Success.co teams on data fields relationships (Scorecard team assignments)",
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
              stateId: {
                type: "string",
                description:
                  "Team-data field state filter (defaults to 'ACTIVE')",
              },
              teamId: {
                type: "string",
                description: "Filter by team ID",
              },
              dataFieldId: {
                type: "string",
                description: "Filter by data field ID",
              },
            },
          },
        },
        {
          name: "getDataFieldStatuses",
          description: "List Success.co data field statuses",
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
              stateId: {
                type: "string",
                description:
                  "Data field status state filter (defaults to 'ACTIVE')",
              },
            },
          },
        },
        {
          name: "analyzeScorecardMetrics",
          description:
            "Analyze Scorecard metrics and KPIs to answer business questions. Automatically detects query intent and provides comprehensive analysis of KPIs, targets, and performance trends. Use this for questions about scorecard performance, KPI targets, and metric analysis.",
          inputSchema: {
            type: "object",
            properties: {
              query: {
                type: "string",
                description:
                  "The analytical question to answer (e.g., 'Give me the last 12 weeks of Scorecard metrics for my team and flag any KPI below target', 'Show KPI trends', 'Which KPIs are underperforming?')",
              },
              teamId: {
                type: "string",
                description:
                  "Optional team filter - filter analysis to specific team",
              },
              userId: {
                type: "string",
                description:
                  "Optional user filter - filter analysis to specific user",
              },
              timeframe: {
                type: "string",
                description:
                  "Optional timeframe filter - 'quarter', 'month', 'week', or 'year'",
              },
              weeks: {
                type: "integer",
                description: "Number of weeks to analyze (defaults to 12)",
              },
            },
            required: ["query"],
          },
        },
        {
          name: "getMeetingInfos",
          description: "List Success.co meeting infos",
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
              stateId: {
                type: "string",
                description: "Meeting info state filter (defaults to 'ACTIVE')",
              },
              teamId: {
                type: "string",
                description: "Filter by team ID",
              },
              meetingInfoStatusId: {
                type: "string",
                description: "Filter by meeting info status ID",
              },
            },
          },
        },
        {
          name: "getMeetingAgendas",
          description: "List Success.co meeting agendas",
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
              stateId: {
                type: "string",
                description:
                  "Meeting agenda state filter (defaults to 'ACTIVE')",
              },
              teamId: {
                type: "string",
                description: "Filter by team ID",
              },
              meetingAgendaStatusId: {
                type: "string",
                description: "Filter by meeting agenda status ID",
              },
              meetingAgendaTypeId: {
                type: "string",
                description: "Filter by meeting agenda type ID",
              },
            },
          },
        },
        {
          name: "getMeetingAgendaSections",
          description: "List Success.co meeting agenda sections",
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
              stateId: {
                type: "string",
                description:
                  "Meeting agenda section state filter (defaults to 'ACTIVE')",
              },
              meetingAgendaId: {
                type: "string",
                description: "Filter by meeting agenda ID",
              },
              type: {
                type: "string",
                description: "Filter by section type",
              },
            },
          },
        },
        {
          name: "getMeetingInfoStatuses",
          description: "List Success.co meeting info statuses",
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
              stateId: {
                type: "string",
                description:
                  "Meeting info status state filter (defaults to 'ACTIVE')",
              },
            },
          },
        },
        {
          name: "getMeetingAgendaStatuses",
          description: "List Success.co meeting agenda statuses",
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
              stateId: {
                type: "string",
                description:
                  "Meeting agenda status state filter (defaults to 'ACTIVE')",
              },
            },
          },
        },
        {
          name: "getMeetingAgendaTypes",
          description: "List Success.co meeting agenda types",
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
              stateId: {
                type: "string",
                description:
                  "Meeting agenda type state filter (defaults to 'ACTIVE')",
              },
            },
          },
        },
        {
          name: "getIssueStatuses",
          description: "List Success.co issue statuses",
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
              stateId: {
                type: "string",
                description: "Issue status state filter (defaults to 'ACTIVE')",
              },
            },
          },
        },
        {
          name: "getLeadershipVTO",
          description:
            "Get the complete leadership Vision/Traction Organizer in one call. Fetches all VTO components (core values, core focus, goals, market strategies) in parallel for maximum efficiency.",
          inputSchema: {
            type: "object",
            properties: {
              stateId: {
                type: "string",
                description: "State filter (defaults to 'ACTIVE')",
              },
            },
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
      logToFile(
        "Port 3001 is already in use. Run this command to kill the process:"
      );
      logToFile("lsof -ti:3001 | xargs kill -9");
    } else {
      logToFile(`HTTP server error: ${error.message}`);
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
