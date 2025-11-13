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
export { getUsers, getCurrentUser } from "./usersTools.js";

// Todos
export { getTodos, createTodo, updateTodo, deleteTodo } from "./todosTools.js";

// Rocks
export { getRocks, createRock, updateRock, deleteRock } from "./rocksTools.js";

// Issues
export {
  getIssues,
  createIssue,
  updateIssue,
  deleteIssue,
} from "./issuesTools.js";

// Headlines
export {
  getHeadlines,
  createHeadline,
  updateHeadline,
  deleteHeadline,
} from "./headlinesTools.js";

// Meetings
export {
  getMeetings,
  getMeetingInfos,
  getMeetingAgendas,
  getMeetingDetails,
  createMeeting,
  updateMeeting,
} from "./meetingsTools.js";

// Milestones
export {
  getMilestones,
  createMilestone,
  updateMilestone,
  deleteMilestone,
} from "./milestonesTools.js";

// Scorecard/Measurables
export {
  getScorecardMeasurables,
  createScorecardMeasurable,
  updateScorecardMeasurable,
  deleteScorecardMeasurable,
  createScorecardMeasurableEntry,
  updateScorecardMeasurableEntry,
} from "./scorecardTools.js";

// Org Checkups
export { getOrgCheckups } from "./orgCheckupsTools.js";

// Vision/Traction Organizer
export { getLeadershipVTO } from "./vtoTools.js";

// Accountability Chart
export { getAccountabilityChart } from "./accountabilityChartTools.js";

// Search and Fetch
export { search, fetch } from "./searchAndFetchTools.js";

// Comments
export {
  getComments,
  createComment,
  updateComment,
  deleteComment,
} from "./commentsTools.js";

// Insights & Analytics
export {
  getExecutionHealth,
  getUserWorkload,
  getCompanyInsights,
} from "./insightsTools.js";

// Help & Discovery
export { getSampleQuestions } from "./helpTools.js";
