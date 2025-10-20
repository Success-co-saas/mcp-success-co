// Main export file for all Success.co MCP Server tools
// This file aggregates all tool modules for easy importing

// Core infrastructure
export {
  getDatabase,
  getLeadershipTeamId,
  getUserAndCompanyInfoForApiKey,
  getContextForApiKey,
  getUserContext,
  testDatabaseConnection,
  init,
  logGraphQLCall,
  logToolCallStart,
  logToolCallEnd,
  callSuccessCoGraphQL,
  getGraphQLEndpoint,
  getSuccessCoApiKey,
  getIsDevMode,
  setAuthContext,
  runWithAuthContext,
  getAuthContext,
  shouldUseApiKeyMode,
} from "./core.js";

// Error handling
export * from "./errors.js";

// Common helpers
export * from "./commonHelpers.js";

// Teams
export { getTeams } from "./teamsTools.js";

// Users
export { getUsers } from "./usersTools.js";

// Todos
export { getTodos, createTodo, updateTodo } from "./todosTools.js";

// Rocks - These need to be created
export { getRocks, createRock, updateRock } from "./rocksTools.js";

// Issues - These need to be created
export { getIssues, createIssue, updateIssue } from "./issuesTools.js";

// Headlines - These need to be created
export {
  getHeadlines,
  createHeadline,
  updateHeadline,
} from "./headlinesTools.js";

// Meetings - These need to be created
export {
  getMeetings,
  getMeetingInfos,
  getMeetingAgendas,
  getMeetingDetails,
  createMeeting,
  updateMeeting,
} from "./meetingsTools.js";

// Milestones
export { getMilestones } from "./milestonesTools.js";

// Scorecard/Measurables - These need to be created
export {
  getScorecardMeasurables,
  createScorecardMeasurableEntry,
  updateScorecardMeasurableEntry,
} from "./scorecardTools.js";

// People Analyzer
export { getPeopleAnalyzerSessions } from "./peopleAnalyzerTools.js";

// Org Checkups
export { getOrgCheckups } from "./orgCheckupsTools.js";

// Vision/Traction Organizer
export { getLeadershipVTO } from "./vtoTools.js";

// Accountability Chart
export { getAccountabilityChart } from "./accountabilityChartTools.js";

// Search and Fetch - These need to be created
export { search, fetch } from "./searchAndFetchTools.js";
