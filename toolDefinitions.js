import { z } from "zod";
import {
  getTeams,
  getUsers,
  getCurrentUser,
  getTodos,
  getRocks,
  getMeetings,
  getIssues,
  getHeadlines,
  getMilestones,
  search,
  fetch,
  getScorecardMeasurables,
  createScorecardMeasurable,
  updateScorecardMeasurable,
  deleteScorecardMeasurable,
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
  deleteTodo,
  deleteIssue,
  deleteRock,
  deleteHeadline,
  deleteMilestone,
  createMilestone,
  updateMilestone,
  getComments,
  createComment,
  updateComment,
  deleteComment,
  getExecutionHealth,
  getUserWorkload,
  getCompanyInsights,
  getAuthContext,
} from "./tools.js";
import { trackToolCall } from "./utils/statsTracker.js";

/**
 * Tool definitions - Single Source of Truth
 */
export const toolDefinitions = [
  {
    name: "getTeams",
    description:
      "List Success.co teams. Each team includes an 'isLeadership' flag indicating if it's the leadership team. Use this to find the leadership team ID before querying for leadership-specific data. Supports keyword search.",
    readOnly: true,
    annotations: {
      title: "Get Teams",
      readOnlyHint: true,
      idempotentHint: true,
      openWorldHint: true,
    },
    handler: async ({ first, offset, keyword }) =>
      await getTeams({ first, offset, keyword }),
    schema: {
      first: z
        .number()
        .int()
        .optional()
        .default(50)
        .describe("Optional page size (defaults to 50)"),
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
    readOnly: true,
    annotations: {
      title: "Get Users",
      readOnlyHint: true,
      idempotentHint: true,
      openWorldHint: true,
    },
    handler: async ({ first, offset, teamId, leadershipTeam }) =>
      await getUsers({ first, offset, teamId, leadershipTeam }),
    schema: {
      first: z
        .number()
        .int()
        .optional()
        .default(50)
        .describe("Optional page size (defaults to 50)"),
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
    name: "getCurrentUser",
    description:
      "Get information about the currently authenticated user (you). Use this to find your own userId when you need to filter data by 'my' or 'I' or similar.",
    readOnly: true,
    annotations: {
      title: "Get Current User",
      readOnlyHint: true,
      idempotentHint: true,
      openWorldHint: false,
    },
    handler: async () => await getCurrentUser(),
    schema: {},
    required: [],
  },
  {
    name: "getTodos",
    description:
      "List Success.co todos. Use leadershipTeam=true to automatically filter by the leadership team. Use currentUser=true to filter by the authenticated user. Use fromMeetings=true to get only todos from Level 10 meetings. Filter by teamId, userId, status (TODO, COMPLETE, OVERDUE, ALL), or keyword. Supports date filtering for creation and completion dates.",
    readOnly: true,
    annotations: {
      title: "Get Todos",
      readOnlyHint: true,
      idempotentHint: true,
      openWorldHint: true,
    },
    handler: async ({
      first,
      offset,
      fromMeetings,
      teamId,
      leadershipTeam,
      userId,
      currentUser,
      status,
      keyword,
      createdAfter,
      createdBefore,
      completedAfter,
      completedBefore,
    }) => {
      // Validate that both userId and currentUser are not provided
      if (userId && currentUser) {
        throw new Error(
          "Cannot provide both userId and currentUser. Use one or the other."
        );
      }

      // Resolve currentUser to userId
      const auth = getAuthContext();
      let effectiveUserId = userId;
      if (currentUser) {
        if (!auth || auth.isApiKeyMode) {
          throw new Error(
            "currentUser=true requires OAuth authentication (not available in API key mode)"
          );
        }
        effectiveUserId = auth.userId;
      }

      // Auto-inject userId if not provided
      if (!effectiveUserId) {
        effectiveUserId = auth && !auth.isApiKeyMode ? auth.userId : undefined;
      }

      return await getTodos({
        first,
        offset,
        fromMeetings,
        teamId,
        leadershipTeam,
        userId: effectiveUserId,
        status,
        keyword,
        createdAfter,
        createdBefore,
        completedAfter,
        completedBefore,
      });
    },
    schema: {
      first: z
        .number()
        .int()
        .optional()
        .default(50)
        .describe("Optional page size (defaults to 50)"),
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
      currentUser: z
        .boolean()
        .optional()
        .describe(
          "If true, automatically filter by the authenticated user (shortcut instead of providing userId)"
        ),
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
      "List Success.co rocks with ownership, team information, and milestones. By default, returns rocks for 'this_year' with milestones included. Use leadershipTeam=true to automatically filter by the leadership team. Use currentUser=true to filter by the authenticated user. Returns userId (rock owner), teamIds (associated teams), and milestones for each rock. Perfect for analyzing accountability, team execution, and rock progress. Supports keyword search and flexible time period filtering.",
    readOnly: true,
    annotations: {
      title: "Get Rocks",
      readOnlyHint: true,
      idempotentHint: true,
      openWorldHint: true,
    },
    handler: async ({
      first,
      offset,
      status,
      userId,
      currentUser,
      teamId,
      leadershipTeam,
      keyword,
      includeMilestones,
      timePeriod,
    }) => {
      // Validate that both userId and currentUser are not provided
      if (userId && currentUser) {
        throw new Error(
          "Cannot provide both userId and currentUser. Use one or the other."
        );
      }

      // Resolve currentUser to userId
      const auth = getAuthContext();
      let effectiveUserId = userId;
      if (currentUser) {
        if (!auth || auth.isApiKeyMode) {
          throw new Error(
            "currentUser=true requires OAuth authentication (not available in API key mode)"
          );
        }
        effectiveUserId = auth.userId;
      }

      // Auto-inject userId if not provided
      if (!effectiveUserId) {
        effectiveUserId = auth && !auth.isApiKeyMode ? auth.userId : undefined;
      }

      return await getRocks({
        first,
        offset,
        rockStatusId: status,
        userId: effectiveUserId,
        teamId,
        leadershipTeam,
        keyword,
        includeMilestones,
        timePeriod,
      });
    },
    schema: {
      first: z
        .number()
        .int()
        .optional()
        .default(50)
        .describe("Optional page size (defaults to 50)"),
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
      currentUser: z
        .boolean()
        .optional()
        .describe(
          "If true, automatically filter by the authenticated user (shortcut instead of providing userId)"
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
      includeMilestones: z
        .boolean()
        .optional()
        .default(true)
        .describe(
          "Include milestones for each rock (defaults to true). Set to false to exclude milestones for faster queries."
        ),
      timePeriod: z
        .enum(["this_year", "current_quarter", "previous_quarter", "all"])
        .optional()
        .default("this_year")
        .describe(
          "Filter rocks by time period (defaults to 'this_year'): 'this_year' for rocks due this calendar year, 'current_quarter' for rocks due in the current quarter, 'previous_quarter' for rocks from last quarter, 'all' for all rocks regardless of due date."
        ),
    },
    required: [],
  },
  {
    name: "getMeetings",
    description:
      "List Success.co meetings. IMPORTANT: Either teamId or leadershipTeam is REQUIRED. Use leadershipTeam=true to automatically filter by the leadership team. Supports filtering by team, meeting agenda, and dates. Note: Only one of meetingAgendaId or meetingAgendaType can be used.",
    readOnly: true,
    annotations: {
      title: "Get Meetings",
      readOnlyHint: true,
      idempotentHint: true,
      openWorldHint: true,
    },
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
      first: z
        .number()
        .int()
        .optional()
        .default(50)
        .describe("Optional page size (defaults to 50)"),
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
      "List Success.co issues. Use leadershipTeam=true to automatically filter by the leadership team. Use currentUser=true to filter by the authenticated user. Supports filtering by team, user, status, type, meeting linkage, and dates.",
    readOnly: true,
    annotations: {
      title: "Get Issues",
      readOnlyHint: true,
      idempotentHint: true,
      openWorldHint: true,
    },
    handler: async ({
      first,
      offset,
      teamId,
      leadershipTeam,
      userId,
      currentUser,
      status,
      type,
      fromMeetings,
      createdAfter,
      createdBefore,
      statusUpdatedBefore,
    }) => {
      // Validate that both userId and currentUser are not provided
      if (userId && currentUser) {
        throw new Error(
          "Cannot provide both userId and currentUser. Use one or the other."
        );
      }

      // Resolve currentUser to userId
      const auth = getAuthContext();
      let effectiveUserId = userId;
      if (currentUser) {
        if (!auth || auth.isApiKeyMode) {
          throw new Error(
            "currentUser=true requires OAuth authentication (not available in API key mode)"
          );
        }
        effectiveUserId = auth.userId;
      }

      // Auto-inject userId if not provided
      if (!effectiveUserId) {
        effectiveUserId = auth && !auth.isApiKeyMode ? auth.userId : undefined;
      }

      return await getIssues({
        first,
        offset,
        teamId,
        leadershipTeam,
        userId: effectiveUserId,
        status,
        type,
        fromMeetings,
        createdAfter,
        createdBefore,
        statusUpdatedBefore,
      });
    },
    schema: {
      first: z
        .number()
        .int()
        .optional()
        .default(50)
        .describe("Optional page size (defaults to 50)"),
      offset: z.number().int().optional().describe("Optional offset"),
      teamId: z.string().optional().describe("Filter by team ID"),
      leadershipTeam: z
        .boolean()
        .optional()
        .describe(
          "If true, automatically use the leadership team ID (shortcut instead of calling getTeams first)"
        ),
      userId: z.string().optional().describe("Filter by user ID"),
      currentUser: z
        .boolean()
        .optional()
        .describe(
          "If true, automatically filter by the authenticated user (shortcut instead of providing userId)"
        ),
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
      "List Success.co headlines. Use leadershipTeam=true to automatically filter by the leadership team. Use currentUser=true to filter by the authenticated user. Supports filtering by date, keyword, status, team, user, and meeting linkage. Perfect for queries like 'Show me all people headlines from this week' or 'List company headlines related to hiring'. Can also fetch a specific headline by ID.",
    readOnly: true,
    annotations: {
      title: "Get Headlines",
      readOnlyHint: true,
      idempotentHint: true,
      openWorldHint: true,
    },
    handler: async ({
      first,
      offset,
      headlineId,
      teamId,
      leadershipTeam,
      userId,
      currentUser,
      fromMeetings,
      createdAfter,
      createdBefore,
      keyword,
      status,
    }) => {
      // Validate that both userId and currentUser are not provided
      if (userId && currentUser) {
        throw new Error(
          "Cannot provide both userId and currentUser. Use one or the other."
        );
      }

      // Resolve currentUser to userId
      const auth = getAuthContext();
      let effectiveUserId = userId;
      if (currentUser) {
        if (!auth || auth.isApiKeyMode) {
          throw new Error(
            "currentUser=true requires OAuth authentication (not available in API key mode)"
          );
        }
        effectiveUserId = auth.userId;
      }

      // Auto-inject userId if not provided
      if (!effectiveUserId) {
        effectiveUserId = auth && !auth.isApiKeyMode ? auth.userId : undefined;
      }

      return await getHeadlines({
        first,
        offset,
        headlineId,
        teamId,
        leadershipTeam,
        userId: effectiveUserId,
        fromMeetings,
        createdAfter,
        createdBefore,
        keyword,
        status,
      });
    },
    schema: {
      first: z
        .number()
        .int()
        .optional()
        .default(50)
        .describe("Optional page size (defaults to 50)"),
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
      currentUser: z
        .boolean()
        .optional()
        .describe(
          "If true, automatically filter by the authenticated user (shortcut instead of providing userId)"
        ),
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
      "List Success.co milestones on rocks. Use leadershipTeam=true to automatically filter by the leadership team. Use currentUser=true to filter by the authenticated user.",
    readOnly: true,
    annotations: {
      title: "Get Milestones",
      readOnlyHint: true,
      idempotentHint: true,
      openWorldHint: true,
    },
    handler: async ({
      first,
      offset,
      rockId,
      userId,
      currentUser,
      teamId,
      leadershipTeam,
    }) => {
      // Validate that both userId and currentUser are not provided
      if (userId && currentUser) {
        throw new Error(
          "Cannot provide both userId and currentUser. Use one or the other."
        );
      }

      // Resolve currentUser to userId
      const auth = getAuthContext();
      let effectiveUserId = userId;
      if (currentUser) {
        if (!auth || auth.isApiKeyMode) {
          throw new Error(
            "currentUser=true requires OAuth authentication (not available in API key mode)"
          );
        }
        effectiveUserId = auth.userId;
      }

      // Auto-inject userId if not provided
      if (!effectiveUserId) {
        effectiveUserId = auth && !auth.isApiKeyMode ? auth.userId : undefined;
      }

      return await getMilestones({
        first,
        offset,
        rockId,
        userId: effectiveUserId,
        teamId,
        leadershipTeam,
      });
    },
    schema: {
      first: z
        .number()
        .int()
        .optional()
        .default(50)
        .describe("Optional page size (defaults to 50)"),
      offset: z.number().int().optional().describe("Optional offset"),
      rockId: z.string().optional().describe("Filter by rock ID"),
      userId: z.string().optional().describe("Filter by user ID"),
      currentUser: z
        .boolean()
        .optional()
        .describe(
          "If true, automatically filter by the authenticated user (shortcut instead of providing userId)"
        ),
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
    readOnly: true,
    annotations: {
      title: "Search",
      readOnlyHint: true,
      idempotentHint: true,
      openWorldHint: true,
    },
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
    readOnly: true,
    annotations: {
      title: "Fetch Item",
      readOnlyHint: true,
      idempotentHint: true,
      openWorldHint: true,
    },
    handler: async ({ id }) => await fetch({ id }),
    schema: {
      id: z.string().describe("The id from a previous search hit."),
    },
    required: ["id"],
  },
  {
    name: "getScorecardMeasurables",
    description:
      "Get scorecard data (KPIs) with their values. Use leadershipTeam=true to automatically filter by the leadership team. Use currentUser=true to filter by the authenticated user. Provides comprehensive scorecard analysis with data fields and their corresponding values. Supports flexible date filtering: use startDate/endDate for precise ranges, or use periods/type for relative periods (e.g., 'last 13 weeks', 'last 6 months'). Defaults to last 13 weeks of data when no date parameters are provided. Use status to filter by ACTIVE (default), ARCHIVED, or ALL measurables.",
    readOnly: true,
    annotations: {
      title: "Get Scorecard Measurables",
      readOnlyHint: true,
      idempotentHint: true,
      openWorldHint: true,
    },
    handler: async ({
      first,
      offset,
      teamId,
      leadershipTeam,
      userId,
      currentUser,
      type,
      dataFieldId,
      startDate,
      endDate,
      periods,
      status,
    }) => {
      // Validate that both userId and currentUser are not provided
      if (userId && currentUser) {
        throw new Error(
          "Cannot provide both userId and currentUser. Use one or the other."
        );
      }

      // Resolve currentUser to userId
      const auth = getAuthContext();
      let effectiveUserId = userId;
      if (currentUser) {
        if (!auth || auth.isApiKeyMode) {
          throw new Error(
            "currentUser=true requires OAuth authentication (not available in API key mode)"
          );
        }
        effectiveUserId = auth.userId;
      }

      // Auto-inject userId if not provided
      if (!effectiveUserId) {
        effectiveUserId = auth && !auth.isApiKeyMode ? auth.userId : undefined;
      }

      return await getScorecardMeasurables({
        first,
        offset,
        teamId,
        leadershipTeam,
        userId: effectiveUserId,
        type,
        dataFieldId,
        startDate,
        endDate,
        periods,
        status,
      });
    },
    schema: {
      first: z
        .number()
        .int()
        .optional()
        .default(50)
        .describe("Optional page size (defaults to 50)"),
      offset: z.number().int().optional().describe("Optional offset"),
      teamId: z.string().optional().describe("Filter by team ID"),
      leadershipTeam: z
        .boolean()
        .optional()
        .describe(
          "If true, automatically use the leadership team ID (shortcut instead of calling getTeams first)"
        ),
      userId: z.string().optional().describe("Filter by user ID"),
      currentUser: z
        .boolean()
        .optional()
        .describe(
          "If true, automatically filter by the authenticated user (shortcut instead of providing userId)"
        ),
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
    name: "createScorecardMeasurable",
    description:
      "Create a new scorecard measurable (KPI/metric). Perfect for queries like 'Create a new weekly measurable called Revenue' or 'Add a monthly measurable for customer satisfaction score'. Use teamId or leadershipTeam to associate with a team. Measurables track performance over time and can be weekly, monthly, quarterly, or annually.",
    readOnly: false,
    annotations: {
      title: "Create Scorecard Measurable",
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: true,
    },
    handler: async ({
      name,
      desc,
      type,
      unitType,
      unitComparison,
      goalTarget,
      goalTargetEnd,
      goalCurrency,
      showAverage,
      showTotal,
      autoFormat,
      autoRoundDecimals,
      userId,
      teamId,
      leadershipTeam,
    }) =>
      await createScorecardMeasurable({
        name,
        desc,
        type,
        unitType,
        unitComparison,
        goalTarget,
        goalTargetEnd,
        goalCurrency,
        showAverage,
        showTotal,
        autoFormat,
        autoRoundDecimals,
        userId,
        teamId,
        leadershipTeam,
      }),
    schema: {
      name: z.string().describe("Measurable name (required)"),
      desc: z
        .string()
        .optional()
        .describe("Description of what this measurable tracks"),
      type: z
        .enum(["weekly", "monthly", "quarterly", "annually"])
        .optional()
        .default("weekly")
        .describe(
          "Frequency of measurement: 'weekly' (default), 'monthly', 'quarterly', or 'annually'"
        ),
      unitType: z
        .enum(["number", "currency", "percentage"])
        .optional()
        .default("number")
        .describe(
          "Type of value: 'number' (default), 'currency', or 'percentage'"
        ),
      unitComparison: z
        .enum([">=", "<=", "=", ">", "<"])
        .optional()
        .default(">=")
        .describe(
          "Comparison operator for goal: '>=' (default, higher is better), '<=' (lower is better), '=' (exact match), '>' (strictly higher), '<' (strictly lower)"
        ),
      goalTarget: z
        .string()
        .optional()
        .default("100")
        .describe("Goal target value (default: 100)"),
      goalTargetEnd: z
        .string()
        .optional()
        .default("100")
        .describe("Goal target end value for ranges (default: 100)"),
      goalCurrency: z
        .string()
        .optional()
        .default("$")
        .describe("Currency symbol if unitType is 'currency' (default: '$')"),
      showAverage: z
        .boolean()
        .optional()
        .default(true)
        .describe("Show average in reports (default: true)"),
      showTotal: z
        .boolean()
        .optional()
        .default(true)
        .describe("Show total in reports (default: true)"),
      autoFormat: z
        .boolean()
        .optional()
        .default(false)
        .describe("Auto format values (default: false)"),
      autoRoundDecimals: z
        .boolean()
        .optional()
        .default(false)
        .describe("Auto round decimals (default: false)"),
      userId: z
        .string()
        .optional()
        .describe(
          "User ID (owner) - defaults to authenticated user if not provided"
        ),
      teamId: z
        .string()
        .optional()
        .describe(
          "Team ID to associate with this measurable (comma-separated for multiple teams)"
        ),
      leadershipTeam: z
        .boolean()
        .optional()
        .describe(
          "If true, automatically associate with the leadership team"
        ),
    },
    required: ["name"],
  },
  {
    name: "updateScorecardMeasurable",
    description:
      "Update an existing scorecard measurable (KPI/metric). Perfect for queries like 'Change the Revenue measurable goal to 150' or 'Update the customer satisfaction measurable to monthly'. Use getScorecardMeasurables to find the measurable ID. Can update name, description, type, unit type, goals, and status (set to ARCHIVED to archive).",
    readOnly: false,
    annotations: {
      title: "Update Scorecard Measurable",
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
    handler: async ({
      measurableId,
      name,
      desc,
      type,
      unitType,
      unitComparison,
      goalTarget,
      goalTargetEnd,
      goalCurrency,
      showAverage,
      showTotal,
      autoFormat,
      autoRoundDecimals,
      status,
    }) =>
      await updateScorecardMeasurable({
        measurableId,
        name,
        desc,
        type,
        unitType,
        unitComparison,
        goalTarget,
        goalTargetEnd,
        goalCurrency,
        showAverage,
        showTotal,
        autoFormat,
        autoRoundDecimals,
        status,
      }),
    schema: {
      measurableId: z
        .string()
        .describe(
          "Measurable ID (required). Use getScorecardMeasurables to find the ID."
        ),
      name: z.string().optional().describe("Update the measurable name"),
      desc: z.string().optional().describe("Update the description"),
      type: z
        .enum(["weekly", "monthly", "quarterly", "annually"])
        .optional()
        .describe(
          "Update frequency: 'weekly', 'monthly', 'quarterly', or 'annually'"
        ),
      unitType: z
        .enum(["number", "currency", "percentage"])
        .optional()
        .describe("Update value type: 'number', 'currency', or 'percentage'"),
      unitComparison: z
        .enum([">=", "<=", "=", ">", "<"])
        .optional()
        .describe(
          "Update comparison operator: '>=', '<=', '=', '>', or '<'"
        ),
      goalTarget: z
        .string()
        .optional()
        .describe("Update the goal target value"),
      goalTargetEnd: z
        .string()
        .optional()
        .describe("Update the goal target end value for ranges"),
      goalCurrency: z
        .string()
        .optional()
        .describe("Update the currency symbol"),
      showAverage: z
        .boolean()
        .optional()
        .describe("Update whether to show average in reports"),
      showTotal: z
        .boolean()
        .optional()
        .describe("Update whether to show total in reports"),
      autoFormat: z
        .boolean()
        .optional()
        .describe("Update auto format setting"),
      autoRoundDecimals: z
        .boolean()
        .optional()
        .describe("Update auto round decimals setting"),
      status: z
        .enum(["ACTIVE", "ARCHIVED"])
        .optional()
        .describe(
          "Update status: 'ACTIVE' for active measurables, 'ARCHIVED' to archive"
        ),
    },
    required: ["measurableId"],
  },
  {
    name: "deleteScorecardMeasurable",
    description:
      "Delete a scorecard measurable (KPI/metric). This is a soft delete that marks the measurable and all its associated data values as DELETED. Perfect for queries like 'Delete the Revenue measurable' or 'Remove the customer satisfaction KPI'. Use getScorecardMeasurables to find the measurable ID. WARNING: This will also delete all historical data values associated with this measurable.",
    readOnly: false,
    annotations: {
      title: "Delete Scorecard Measurable",
      readOnlyHint: false,
      destructiveHint: true,
      idempotentHint: true,
      openWorldHint: true,
    },
    handler: async ({ measurableId }) =>
      await deleteScorecardMeasurable({ measurableId }),
    schema: {
      measurableId: z
        .string()
        .describe(
          "Measurable ID (required). Use getScorecardMeasurables to find the ID."
        ),
    },
    required: ["measurableId"],
  },
  {
    name: "getMeetingInfos",
    description:
      "List Success.co meeting infos. Use leadershipTeam=true to automatically filter by the leadership team.",
    readOnly: true,
    annotations: {
      title: "Get Meeting Infos",
      readOnlyHint: true,
      idempotentHint: true,
      openWorldHint: true,
    },
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
      first: z
        .number()
        .int()
        .optional()
        .default(50)
        .describe("Optional page size (defaults to 50)"),
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
    readOnly: true,
    annotations: {
      title: "Get Meeting Agendas",
      readOnlyHint: true,
      idempotentHint: true,
      openWorldHint: true,
    },
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
      first: z
        .number()
        .int()
        .optional()
        .default(50)
        .describe("Optional page size (defaults to 50)"),
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
    readOnly: true,
    annotations: {
      title: "Get Leadership VTO",
      readOnlyHint: true,
      idempotentHint: true,
      openWorldHint: true,
    },
    handler: async () => await getLeadershipVTO({}),
    schema: {},
    required: [],
  },
  {
    name: "getAccountabilityChart",
    description:
      "Get the complete accountability chart (organizational structure) for the company. Fetches all users, their roles, teams, and reporting relationships to answer questions like 'Who reports to the Integrator?' or 'What is the organizational structure?'. This tool provides a comprehensive view of the company's organizational hierarchy including key EOS roles like Integrator and Visionary.",
    readOnly: true,
    annotations: {
      title: "Get Accountability Chart",
      readOnlyHint: true,
      idempotentHint: true,
      openWorldHint: true,
    },
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
      "Get comprehensive meeting details including all related items (headlines, todos, issues, ratings) for a specific meeting. Can fetch by specific meetingId OR use lastFinishedL10=true to automatically get the most recent FINISHED L10 meeting for a team. Only returns meetings with status 'FINISHED' when using lastFinishedL10. Returns the meeting with its associated headlines, todos, and issues in a single call. Perfect for queries like 'Show me the last L10 meeting for the leadership team' or 'What happened in our most recent Level 10 meeting?'",
    readOnly: true,
    annotations: {
      title: "Get Meeting Details",
      readOnlyHint: true,
      idempotentHint: true,
      openWorldHint: true,
    },
    handler: async ({ meetingId, lastFinishedL10, teamId, leadershipTeam }) =>
      await getMeetingDetails({
        meetingId,
        lastFinishedL10,
        teamId,
        leadershipTeam,
      }),
    schema: {
      meetingId: z
        .string()
        .optional()
        .describe(
          "Meeting ID to fetch details for (required unless lastFinishedL10 is true)"
        ),
      lastFinishedL10: z
        .boolean()
        .optional()
        .default(false)
        .describe(
          "If true, automatically fetch the most recent FINISHED L10 (Level 10) meeting for the specified team. Only returns meetings with status 'FINISHED'. Requires teamId or leadershipTeam to be provided."
        ),
      teamId: z
        .string()
        .optional()
        .describe(
          "Team ID to find the last finished L10 meeting for (required when lastFinishedL10=true, unless leadershipTeam is true)"
        ),
      leadershipTeam: z
        .boolean()
        .optional()
        .describe(
          "If true, automatically use the leadership team ID (shortcut instead of providing teamId). Use with lastFinishedL10=true to get the last finished L10 meeting for the leadership team."
        ),
    },
    required: [],
  },
  {
    name: "getPeopleAnalyzerSessions",
    description:
      "Get People Analyzer sessions with user scores including 'Gets it', 'Wants it', 'Capacity to do it', 'Right person', and 'Right seat' ratings. Use leadershipTeam=true to automatically filter by the leadership team. Perfect for queries like 'Show me the people analyzer results for the leadership team', 'Who's rated below a 3 on Gets it?', or 'Summarize people analyzer trends for the last quarter'.",
    readOnly: true,
    annotations: {
      title: "Get People Analyzer Sessions",
      readOnlyHint: true,
      idempotentHint: true,
      openWorldHint: true,
    },
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
        .default(50)
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
    readOnly: true,
    annotations: {
      title: "Get Organization Checkups",
      readOnlyHint: true,
      idempotentHint: true,
      openWorldHint: true,
    },
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
        .default(50)
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
      "Create a new issue in Success.co. Use leadershipTeam=true to automatically assign to the leadership team. Use currentUser=true to assign to the authenticated user. Perfect for queries like 'Add a new issue for customer churn increase to the leadership team'. Either teamId or leadershipTeam is REQUIRED.",
    readOnly: false,
    annotations: {
      title: "Create Issue",
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: true,
    },
    handler: async ({
      name,
      desc,
      teamId,
      leadershipTeam,
      userId,
      currentUser,
      priority,
      type,
    }) => {
      // Validate that both userId and currentUser are not provided
      if (userId && currentUser) {
        throw new Error(
          "Cannot provide both userId and currentUser. Use one or the other."
        );
      }

      // Resolve currentUser to userId
      const auth = getAuthContext();
      let effectiveUserId = userId;
      if (currentUser) {
        if (!auth || auth.isApiKeyMode) {
          throw new Error(
            "currentUser=true requires OAuth authentication (not available in API key mode)"
          );
        }
        effectiveUserId = auth.userId;
      }

      // Auto-inject userId if not provided
      if (!effectiveUserId) {
        effectiveUserId = auth && !auth.isApiKeyMode ? auth.userId : undefined;
      }

      return await createIssue({
        name,
        desc,
        teamId,
        leadershipTeam,
        userId: effectiveUserId,
        priority,
        type,
      });
    },
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
      currentUser: z
        .boolean()
        .optional()
        .describe(
          "If true, automatically assign to the authenticated user (shortcut instead of providing userId)"
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
    readOnly: false,
    annotations: {
      title: "Create Rock",
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: true,
    },
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
      "Create a new to-do in Success.co. Use leadershipTeam=true to automatically assign to the leadership team. Use currentUser=true to assign to the authenticated user. Perfect for queries like 'Add a to-do to follow up with vendor' or 'Create a to-do for the leadership team to review Q4 budget'. Either teamId or leadershipTeam is REQUIRED.",
    readOnly: false,
    annotations: {
      title: "Create Todo",
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: true,
    },
    handler: async ({
      name,
      desc,
      teamId,
      leadershipTeam,
      userId,
      currentUser,
      dueDate,
      priority,
      type,
    }) => {
      // Validate that both userId and currentUser are not provided
      if (userId && currentUser) {
        throw new Error(
          "Cannot provide both userId and currentUser. Use one or the other."
        );
      }

      // Resolve currentUser to userId
      const auth = getAuthContext();
      let effectiveUserId = userId;
      if (currentUser) {
        if (!auth || auth.isApiKeyMode) {
          throw new Error(
            "currentUser=true requires OAuth authentication (not available in API key mode)"
          );
        }
        effectiveUserId = auth.userId;
      }

      // Auto-inject userId if not provided
      if (!effectiveUserId) {
        effectiveUserId = auth && !auth.isApiKeyMode ? auth.userId : undefined;
      }

      return await createTodo({
        name,
        desc,
        teamId,
        leadershipTeam,
        userId: effectiveUserId,
        dueDate,
        priority,
        type,
      });
    },
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
      currentUser: z
        .boolean()
        .optional()
        .describe(
          "If true, automatically assign to the authenticated user (shortcut instead of providing userId)"
        ),
      dueDate: z
        .string()
        .optional()
        .describe(
          "Due date in YYYY-MM-DD format (e.g., 2024-12-31). Defaults to 7 days from now if not provided."
        ),
      priority: z
        .enum(["High", "Medium", "Low", "No priority"])
        .optional()
        .describe(
          "Priority level: 'High', 'Medium', 'Low', or 'No priority' (defaults to 'No priority' if not provided)"
        ),
      type: z
        .enum(["team", "private"])
        .optional()
        .describe(
          "Todo type: 'team' for team todos or 'private' for private todos (defaults to 'team')"
        ),
    },
    required: ["name"],
  },
  {
    name: "updateTodo",
    description:
      "Update an existing to-do in Success.co. Perfect for queries like 'Mark the to-do follow up with vendor as complete'. Use getTodos first to find the specific to-do ID by searching for the to-do name.",
    readOnly: false,
    annotations: {
      title: "Update Todo",
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
    handler: async ({ todoId, todoStatusId, name, desc, dueDate, priority }) =>
      await updateTodo({ todoId, todoStatusId, name, desc, dueDate, priority }),
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
      priority: z
        .enum(["High", "Medium", "Low", "No priority"])
        .optional()
        .describe(
          "Priority level: 'High', 'Medium', 'Low', or 'No priority'"
        ),
    },
    required: ["todoId"],
  },
  {
    name: "createHeadline",
    description:
      "Create a new headline in Success.co. Use leadershipTeam=true to automatically associate with the leadership team. Use currentUser=true to assign to the authenticated user. Perfect for queries like 'Add a headline: Won major client contract with ABC Corp'. Headlines are good news or updates shared during meetings. IMPORTANT: You must provide either 'teamId' or 'leadershipTeam=true'.",
    readOnly: false,
    annotations: {
      title: "Create Headline",
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: true,
    },
    handler: async ({
      name,
      desc,
      teamId,
      leadershipTeam,
      userId,
      currentUser,
      status,
      isCascadingMessage,
    }) => {
      // Validate that both userId and currentUser are not provided
      if (userId && currentUser) {
        throw new Error(
          "Cannot provide both userId and currentUser. Use one or the other."
        );
      }

      // Resolve currentUser to userId
      const auth = getAuthContext();
      let effectiveUserId = userId;
      if (currentUser) {
        if (!auth || auth.isApiKeyMode) {
          throw new Error(
            "currentUser=true requires OAuth authentication (not available in API key mode)"
          );
        }
        effectiveUserId = auth.userId;
      }

      return await createHeadline({
        name,
        desc,
        teamId,
        leadershipTeam,
        userId: effectiveUserId,
        status,
        isCascadingMessage,
      });
    },
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
      currentUser: z
        .boolean()
        .optional()
        .describe(
          "If true, automatically assign to the authenticated user (shortcut instead of providing userId)"
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
    readOnly: false,
    annotations: {
      title: "Create Meeting",
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: true,
    },
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
      "Update an existing issue in Success.co. Use leadershipTeam=true to reassign to the leadership team. Use currentUser=true to reassign to the authenticated user. Perfect for queries like 'Close the issue about pricing inconsistencies' or 'Change the priority of the customer churn issue to High'. Use getIssues first to find the issue ID.",
    readOnly: false,
    annotations: {
      title: "Update Issue",
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
    handler: async ({
      issueId,
      name,
      desc,
      issueStatusId,
      teamId,
      leadershipTeam,
      userId,
      currentUser,
      priority,
    }) => {
      // Validate that both userId and currentUser are not provided
      if (userId && currentUser) {
        throw new Error(
          "Cannot provide both userId and currentUser. Use one or the other."
        );
      }

      // Resolve currentUser to userId
      const auth = getAuthContext();
      let effectiveUserId = userId;
      if (currentUser) {
        if (!auth || auth.isApiKeyMode) {
          throw new Error(
            "currentUser=true requires OAuth authentication (not available in API key mode)"
          );
        }
        effectiveUserId = auth.userId;
      }

      return await updateIssue({
        issueId,
        name,
        desc,
        issueStatusId,
        teamId,
        leadershipTeam,
        userId: effectiveUserId,
        priority,
      });
    },
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
      currentUser: z
        .boolean()
        .optional()
        .describe(
          "If true, automatically reassign to the authenticated user (shortcut instead of providing userId)"
        ),
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
      "Update an existing Rock in Success.co. Use currentUser=true to reassign to the authenticated user. Perfect for queries like 'Mark the referral program rock as complete', 'Change the due date for the marketing rock to next month', or 'Reassign this rock to the Sales and Marketing teams'. Use getRocks first to find the rock ID. IMPORTANT: When updating team assignments, the teamId parameter REPLACES all existing team assignments - any teams not listed will be removed. Omit teamId to leave team assignments unchanged.",
    readOnly: false,
    annotations: {
      title: "Update Rock",
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
    handler: async ({
      rockId,
      name,
      desc,
      status,
      dueDate,
      userId,
      currentUser,
      teamId,
    }) => {
      // Validate that both userId and currentUser are not provided
      if (userId && currentUser) {
        throw new Error(
          "Cannot provide both userId and currentUser. Use one or the other."
        );
      }

      // Resolve currentUser to userId
      const auth = getAuthContext();
      let effectiveUserId = userId;
      if (currentUser) {
        if (!auth || auth.isApiKeyMode) {
          throw new Error(
            "currentUser=true requires OAuth authentication (not available in API key mode)"
          );
        }
        effectiveUserId = auth.userId;
      }

      return await updateRock({
        rockId,
        name,
        desc,
        status,
        dueDate,
        userId: effectiveUserId,
        teamId,
      });
    },
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
      currentUser: z
        .boolean()
        .optional()
        .describe(
          "If true, automatically reassign to the authenticated user (shortcut instead of providing userId)"
        ),
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
      "Update an existing headline in Success.co. Use leadershipTeam=true to reassign to the leadership team. Use currentUser=true to reassign to the authenticated user. Perfect for queries like 'Edit the ABC Corp headline to add more details' or 'Change the headline status'. Use getHeadlines first to find the headline ID.",
    readOnly: false,
    annotations: {
      title: "Update Headline",
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
    handler: async ({
      headlineId,
      name,
      desc,
      status,
      teamId,
      leadershipTeam,
      userId,
      currentUser,
      isCascadingMessage,
    }) => {
      // Validate that both userId and currentUser are not provided
      if (userId && currentUser) {
        throw new Error(
          "Cannot provide both userId and currentUser. Use one or the other."
        );
      }

      // Resolve currentUser to userId
      const auth = getAuthContext();
      let effectiveUserId = userId;
      if (currentUser) {
        if (!auth || auth.isApiKeyMode) {
          throw new Error(
            "currentUser=true requires OAuth authentication (not available in API key mode)"
          );
        }
        effectiveUserId = auth.userId;
      }

      return await updateHeadline({
        headlineId,
        name,
        desc,
        status,
        teamId,
        leadershipTeam,
        userId: effectiveUserId,
        isCascadingMessage,
      });
    },
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
      currentUser: z
        .boolean()
        .optional()
        .describe(
          "If true, automatically reassign to the authenticated user (shortcut instead of providing userId)"
        ),
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
    readOnly: false,
    annotations: {
      title: "Update Meeting",
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
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
    readOnly: false,
    annotations: {
      title: "Create Scorecard Entry",
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: true,
    },
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
    readOnly: false,
    annotations: {
      title: "Update Scorecard Entry",
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
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
  {
    name: "deleteTodo",
    description:
      "Delete a todo in Success.co. This marks the todo as DELETED. Perfect for queries like 'Delete the todo about follow up with vendor'. Use getTodos first to find the todo ID by searching for the todo name.",
    readOnly: false,
    annotations: {
      title: "Delete Todo",
      readOnlyHint: false,
      destructiveHint: true,
      idempotentHint: true,
      openWorldHint: true,
    },
    handler: async ({ todoId }) => await deleteTodo({ todoId }),
    schema: {
      todoId: z
        .string()
        .describe(
          "Todo ID (required). Use getTodos with keyword search to find the ID."
        ),
    },
    required: ["todoId"],
  },
  {
    name: "deleteIssue",
    description:
      "Delete an issue in Success.co. This marks the issue as DELETED. Perfect for queries like 'Delete the issue about customer churn'. Use getIssues first to find the issue ID by searching for the issue name.",
    readOnly: false,
    annotations: {
      title: "Delete Issue",
      readOnlyHint: false,
      destructiveHint: true,
      idempotentHint: true,
      openWorldHint: true,
    },
    handler: async ({ issueId }) => await deleteIssue({ issueId }),
    schema: {
      issueId: z
        .string()
        .describe(
          "Issue ID (required). Use getIssues with keyword search to find the ID."
        ),
    },
    required: ["issueId"],
  },
  {
    name: "deleteRock",
    description:
      "Delete a rock in Success.co. This marks the rock as DELETED. Perfect for queries like 'Delete the marketing rock'. Use getRocks first to find the rock ID by searching for the rock name.",
    readOnly: false,
    annotations: {
      title: "Delete Rock",
      readOnlyHint: false,
      destructiveHint: true,
      idempotentHint: true,
      openWorldHint: true,
    },
    handler: async ({ rockId }) => await deleteRock({ rockId }),
    schema: {
      rockId: z
        .string()
        .describe(
          "Rock ID (required). Use getRocks with keyword search to find the ID."
        ),
    },
    required: ["rockId"],
  },
  {
    name: "deleteHeadline",
    description:
      "Delete a headline in Success.co. This marks the headline as DELETED. Perfect for queries like 'Delete the headline about ABC Corp'. Use getHeadlines first to find the headline ID by searching for the headline text.",
    readOnly: false,
    annotations: {
      title: "Delete Headline",
      readOnlyHint: false,
      destructiveHint: true,
      idempotentHint: true,
      openWorldHint: true,
    },
    handler: async ({ headlineId }) => await deleteHeadline({ headlineId }),
    schema: {
      headlineId: z
        .string()
        .describe(
          "Headline ID (required). Use getHeadlines with keyword search to find the ID."
        ),
    },
    required: ["headlineId"],
  },
  {
    name: "createMilestone",
    description:
      "Create a new milestone on a rock in Success.co. Use currentUser=true to assign to the authenticated user. Milestones are checkpoints or sub-tasks within a rock. Perfect for queries like 'Add a milestone to the referral program rock'. Use getRocks to find the rock ID.",
    readOnly: false,
    annotations: {
      title: "Create Milestone",
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: true,
    },
    handler: async ({ name, rockId, dueDate, userId, currentUser }) => {
      // Validate that both userId and currentUser are not provided
      if (userId && currentUser) {
        throw new Error(
          "Cannot provide both userId and currentUser. Use one or the other."
        );
      }

      // Resolve currentUser to userId
      const auth = getAuthContext();
      let effectiveUserId = userId;
      if (currentUser) {
        if (!auth || auth.isApiKeyMode) {
          throw new Error(
            "currentUser=true requires OAuth authentication (not available in API key mode)"
          );
        }
        effectiveUserId = auth.userId;
      }

      return await createMilestone({
        name,
        rockId,
        dueDate,
        userId: effectiveUserId,
      });
    },
    schema: {
      name: z.string().describe("Milestone name/description (required)"),
      rockId: z
        .string()
        .describe(
          "Rock ID to add this milestone to (required). Use getRocks to find the rock ID."
        ),
      dueDate: z
        .string()
        .optional()
        .describe("Due date in YYYY-MM-DD format (e.g., 2024-12-31)"),
      userId: z
        .string()
        .optional()
        .describe(
          "User ID to assign the milestone to (optional - use getUsers to find the user ID)"
        ),
      currentUser: z
        .boolean()
        .optional()
        .describe(
          "If true, automatically assign to the authenticated user (shortcut instead of providing userId)"
        ),
    },
    required: ["name", "rockId"],
  },
  {
    name: "updateMilestone",
    description:
      "Update a milestone in Success.co. Use currentUser=true to reassign to the authenticated user. Perfect for queries like 'Mark the milestone complete' or 'Change the due date of the milestone'. Use getMilestones to find the milestone ID.",
    readOnly: false,
    annotations: {
      title: "Update Milestone",
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
    handler: async ({
      milestoneId,
      name,
      dueDate,
      userId,
      currentUser,
      milestoneStatusId,
    }) => {
      // Validate that both userId and currentUser are not provided
      if (userId && currentUser) {
        throw new Error(
          "Cannot provide both userId and currentUser. Use one or the other."
        );
      }

      // Resolve currentUser to userId
      const auth = getAuthContext();
      let effectiveUserId = userId;
      if (currentUser) {
        if (!auth || auth.isApiKeyMode) {
          throw new Error(
            "currentUser=true requires OAuth authentication (not available in API key mode)"
          );
        }
        effectiveUserId = auth.userId;
      }

      return await updateMilestone({
        milestoneId,
        name,
        dueDate,
        userId: effectiveUserId,
        milestoneStatusId,
      });
    },
    schema: {
      milestoneId: z
        .string()
        .describe(
          "Milestone ID (required). Use getMilestones to search for the milestone."
        ),
      name: z.string().optional().describe("Update the milestone name"),
      dueDate: z
        .string()
        .optional()
        .describe("Update due date (YYYY-MM-DD format)"),
      userId: z
        .string()
        .optional()
        .describe("Reassign to a different user (use getUsers to find ID)"),
      currentUser: z
        .boolean()
        .optional()
        .describe(
          "If true, automatically reassign to the authenticated user (shortcut instead of providing userId)"
        ),
      milestoneStatusId: z
        .enum(["TODO", "COMPLETE"])
        .optional()
        .describe("Update status: 'TODO' for open, 'COMPLETE' for completed"),
    },
    required: ["milestoneId"],
  },
  {
    name: "deleteMilestone",
    description:
      "Delete a milestone in Success.co. This marks the milestone as DELETED. Perfect for queries like 'Delete the first milestone on the marketing rock'. Use getMilestones to find the milestone ID.",
    readOnly: false,
    annotations: {
      title: "Delete Milestone",
      readOnlyHint: false,
      destructiveHint: true,
      idempotentHint: true,
      openWorldHint: true,
    },
    handler: async ({ milestoneId }) => await deleteMilestone({ milestoneId }),
    schema: {
      milestoneId: z
        .string()
        .describe(
          "Milestone ID (required). Use getMilestones to search for the milestone."
        ),
    },
    required: ["milestoneId"],
  },
  {
    name: "getComments",
    description:
      "Get comments for entities in Success.co. Comments can be attached to todos, issues, rocks, milestones, meetings, and other entities. Perfect for queries like 'Show me comments on this issue' or 'Get all comments from last week'. Use currentUser=true to filter by the authenticated user. Use specific entity filters to narrow results.",
    readOnly: true,
    annotations: {
      title: "Get Comments",
      readOnlyHint: true,
      idempotentHint: true,
      openWorldHint: true,
    },
    handler: async ({
      first,
      offset,
      entityType,
      entityId,
      userId,
      currentUser,
      createdAfter,
      createdBefore,
    }) => {
      // Validate that both userId and currentUser are not provided
      if (userId && currentUser) {
        throw new Error(
          "Cannot provide both userId and currentUser. Use one or the other."
        );
      }

      // Resolve currentUser to userId
      const auth = getAuthContext();
      let effectiveUserId = userId;
      if (currentUser) {
        if (!auth || auth.isApiKeyMode) {
          throw new Error(
            "currentUser=true requires OAuth authentication (not available in API key mode)"
          );
        }
        effectiveUserId = auth.userId;
      }

      return await getComments({
        first,
        offset,
        entityType,
        entityId,
        userId: effectiveUserId,
        createdAfter,
        createdBefore,
      });
    },
    schema: {
      first: z
        .number()
        .int()
        .optional()
        .default(50)
        .describe("Optional page size (defaults to 50)"),
      offset: z.number().int().optional().describe("Optional offset"),
      entityType: z
        .enum(["issue", "rock", "todo", "milestone", "meeting"])
        .optional()
        .describe(
          "Filter by entity type: 'issue', 'rock', 'todo', 'milestone', 'meeting'"
        ),
      entityId: z
        .string()
        .optional()
        .describe(
          "Filter by specific entity ID (e.g., get all comments for a specific issue)"
        ),
      userId: z
        .string()
        .optional()
        .describe("Filter by comment author (user ID)"),
      currentUser: z
        .boolean()
        .optional()
        .describe(
          "If true, automatically filter by the authenticated user (shortcut instead of providing userId)"
        ),
      createdAfter: z
        .string()
        .optional()
        .describe(
          "Filter comments created after this date (ISO 8601 format, e.g., 2024-01-01T00:00:00Z)"
        ),
      createdBefore: z
        .string()
        .optional()
        .describe(
          "Filter comments created before this date (ISO 8601 format, e.g., 2024-12-31T23:59:59Z)"
        ),
    },
    required: [],
  },
  {
    name: "createComment",
    description:
      "Create a new comment on an entity in Success.co. Comments can be added to todos, issues, rocks, milestones, meetings, and other entities. Perfect for queries like 'Add a comment to the issue about customer churn' or 'Comment on the marketing rock'.",
    readOnly: false,
    annotations: {
      title: "Create Comment",
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: true,
    },
    handler: async ({ comment, entityType, entityId }) =>
      await createComment({ comment, entityType, entityId }),
    schema: {
      comment: z.string().describe("Comment text (required)"),
      entityType: z
        .enum(["issue", "rock", "todo", "milestone", "meeting"])
        .describe(
          "Entity type to comment on (required): 'issue', 'rock', 'todo', 'milestone', 'meeting'"
        ),
      entityId: z
        .string()
        .describe(
          "Entity ID to comment on (required). Use the appropriate get tool to find the entity ID."
        ),
    },
    required: ["comment", "entityType", "entityId"],
  },
  {
    name: "updateComment",
    description:
      "Update an existing comment in Success.co. Perfect for queries like 'Edit my comment on the issue' or 'Update the comment text'. Use getComments to find the comment ID.",
    readOnly: false,
    annotations: {
      title: "Update Comment",
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
    handler: async ({ commentId, comment }) =>
      await updateComment({ commentId, comment }),
    schema: {
      commentId: z
        .string()
        .describe(
          "Comment ID (required). Use getComments to find the comment ID."
        ),
      comment: z.string().describe("Updated comment text (required)"),
    },
    required: ["commentId", "comment"],
  },
  {
    name: "deleteComment",
    description:
      "Delete a comment in Success.co. This marks the comment as DELETED. Perfect for queries like 'Delete my comment on the issue'. Use getComments to find the comment ID.",
    readOnly: false,
    annotations: {
      title: "Delete Comment",
      readOnlyHint: false,
      destructiveHint: true,
      idempotentHint: true,
      openWorldHint: true,
    },
    handler: async ({ commentId }) => await deleteComment({ commentId }),
    schema: {
      commentId: z
        .string()
        .describe(
          "Comment ID (required). Use getComments to find the comment ID."
        ),
    },
    required: ["commentId"],
  },
  {
    name: "getExecutionHealth",
    description:
      "Get comprehensive execution health overview across rocks, issues, and todos. Returns health score (0-100), status breakdown by entity type, blockers, and recommendations. Perfect for answering 'How is my company executing?', 'What's blocking us?', or 'Give me an execution overview'. Use leadershipTeam=true to focus on leadership team. This is the best tool for high-level insights about company execution.",
    readOnly: true,
    annotations: {
      title: "Get Execution Health",
      readOnlyHint: true,
      idempotentHint: true,
      openWorldHint: true,
    },
    handler: async ({ teamId, leadershipTeam }) =>
      await getExecutionHealth({ teamId, leadershipTeam }),
    schema: {
      teamId: z
        .string()
        .optional()
        .describe("Filter by specific team ID (optional)"),
      leadershipTeam: z
        .boolean()
        .optional()
        .describe(
          "If true, automatically use the leadership team ID (shortcut for leadership team execution)"
        ),
    },
    required: [],
  },
  {
    name: "getUserWorkload",
    description:
      "Get aggregated workload analysis by user showing counts of open rocks, issues, and todos. Returns summary statistics including average workload and overloaded users (those with 150% more than average). Perfect for answering 'Who's overloaded?', 'Show me team workload distribution', or 'How many items does each person have?'. Use leadershipTeam=true to analyze leadership team workload. Use currentUser=true to analyze only the authenticated user.",
    readOnly: true,
    annotations: {
      title: "Get User Workload",
      readOnlyHint: true,
      idempotentHint: true,
      openWorldHint: true,
    },
    handler: async ({ teamId, leadershipTeam, userId, currentUser }) => {
      // Validate that both userId and currentUser are not provided
      if (userId && currentUser) {
        throw new Error(
          "Cannot provide both userId and currentUser. Use one or the other."
        );
      }

      // Resolve currentUser to userId
      const auth = getAuthContext();
      let effectiveUserId = userId;
      if (currentUser) {
        if (!auth || auth.isApiKeyMode) {
          throw new Error(
            "currentUser=true requires OAuth authentication (not available in API key mode)"
          );
        }
        effectiveUserId = auth.userId;
      }

      // Auto-inject userId if not provided
      if (!effectiveUserId) {
        effectiveUserId = auth && !auth.isApiKeyMode ? auth.userId : undefined;
      }

      return await getUserWorkload({
        teamId,
        leadershipTeam,
        userId: effectiveUserId,
      });
    },
    schema: {
      teamId: z
        .string()
        .optional()
        .describe("Filter by specific team ID (optional)"),
      leadershipTeam: z
        .boolean()
        .optional()
        .describe(
          "If true, automatically use the leadership team ID (shortcut for leadership team workload)"
        ),
      userId: z
        .string()
        .optional()
        .describe("Get workload for specific user (optional)"),
      currentUser: z
        .boolean()
        .optional()
        .describe(
          "If true, automatically get workload for the authenticated user (shortcut instead of providing userId)"
        ),
    },
    required: [],
  },
  {
    name: "getCompanyInsights",
    description:
      "Get high-level company insights combining execution health, quarterly rock progress, and key metrics. Returns overall health score, current quarter completion rate, days remaining in quarter, execution metrics across all entity types, blockers, and actionable insights. Perfect for answering 'Based on the data you can see, give me some insights about my company', 'How are we doing overall?', or 'What should I focus on?'. This is the best tool for comprehensive company overview and strategic insights.",
    readOnly: true,
    annotations: {
      title: "Get Company Insights",
      readOnlyHint: true,
      idempotentHint: true,
      openWorldHint: true,
    },
    handler: async () => await getCompanyInsights({}),
    schema: {},
    required: [],
  },
];

/**
 * Register all tools on an MCP server
 */
export function registerToolsOnServer(server) {
  toolDefinitions.forEach((tool) => {
    // Wrap the handler to track stats
    const wrappedHandler = async (params) => {
      const startTime = Date.now();
      let success = true;
      let error = null;
      let result;

      try {
        // Execute the original handler
        result = await tool.handler(params);
        return result;
      } catch (err) {
        success = false;
        error = err.message;
        throw err; // Re-throw to maintain original error behavior
      } finally {
        const duration = Date.now() - startTime;

        // Get auth context for tracking
        const auth = getAuthContext();
        const userId = auth?.userId || null;
        const companyId = auth?.companyId || null;

        // Track the call asynchronously (fire-and-forget)
        trackToolCall({
          toolName: tool.name,
          userId,
          companyId,
          parameters: params,
          duration,
          success,
          error,
        }).catch(() => {
          // Silently ignore stats tracking errors
        });
      }
    };

    server.tool(
      tool.name,
      tool.description,
      tool.schema,
      wrappedHandler,
      tool.annotations ? { annotations: tool.annotations } : undefined
    );
  });
}

/**
 * Convert tool definitions to JSON schema format
 */
export function getToolsAsJsonSchema() {
  return toolDefinitions
    .map((tool) => ({
      name: tool.name,
      description: tool.description,
      readOnly: tool.readOnly,
      inputSchema: {
        type: "object",
        properties: Object.keys(tool.schema).reduce((props, key) => {
          const zodSchema = tool.schema[key];

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
