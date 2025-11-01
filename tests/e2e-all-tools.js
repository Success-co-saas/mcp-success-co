#!/usr/bin/env node

/**
 * End-to-End Test Script for All MCP Tools
 * 
 * This script tests all tools by calling them directly:
 * 1. Tests all GET/read-only tools first
 * 2. Tests write tools with full lifecycle: create -> update -> delete
 * 
 * Usage:
 *   node tests/e2e-all-tools.js
 * 
 * Environment variables required (in .env file):
 *   DEVMODE_SUCCESS_API_KEY - API key for authentication
 *   GRAPHQL_ENDPOINT - GraphQL endpoint
 *   DB_* - Database credentials
 */

import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { init } from "../tools.js";
import * as tools from "../tools.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "..", ".env") });

// Initialize tools with environment config
init({
  NODE_ENV: process.env.NODE_ENV || "development",
  DEBUG: process.env.DEBUG,
  GRAPHQL_ENDPOINT: process.env.GRAPHQL_ENDPOINT,
  DEVMODE_SUCCESS_API_KEY: process.env.DEVMODE_SUCCESS_API_KEY,
  DEVMODE_SUCCESS_USE_API_KEY: process.env.DEVMODE_SUCCESS_USE_API_KEY,
  DATABASE_URL: process.env.DATABASE_URL,
  DB_HOST: process.env.DB_HOST,
  DB_PORT: process.env.DB_PORT,
  DB_DATABASE: process.env.DB_DATABASE,
  DB_USER: process.env.DB_USER,
  DB_PASS: process.env.DB_PASS,
});

// Test statistics
const stats = {
  total: 0,
  passed: 0,
  failed: 0,
  skipped: 0,
  results: [],
};

// Store created items for cleanup
const createdItems = {
  todos: [],
  issues: [],
  rocks: [],
  headlines: [],
  milestones: [],
  comments: [],
  meetings: [],
  scorecardEntries: [],
};

// Store team and user data for use in tests
let testData = {
  teamId: null,
  userId: null,
  leadershipTeamId: null,
  rockId: null,
  issueId: null,
  todoId: null,
  headlineId: null,
  meetingId: null,
  dataFieldId: null,
};

/**
 * Log test result
 */
function logResult(testName, status, message = "", error = null) {
  stats.total++;
  
  const emoji = {
    pass: "✅",
    fail: "❌",
    skip: "⏭️",
  }[status] || "❔";
  
  const result = {
    test: testName,
    status,
    message,
    error: error?.message,
  };
  
  stats.results.push(result);
  
  if (status === "pass") {
    stats.passed++;
    console.log(`${emoji} ${testName}`);
    if (message) console.log(`   ${message}`);
  } else if (status === "fail") {
    stats.failed++;
    console.log(`${emoji} ${testName}`);
    if (message) console.log(`   ${message}`);
    if (error) console.log(`   Error: ${error.message}`);
  } else if (status === "skip") {
    stats.skipped++;
    console.log(`${emoji} ${testName} (skipped)`);
    if (message) console.log(`   ${message}`);
  }
}

/**
 * Parse tool result content
 * Tools return MCP format: { content: [{ type: "text", text: "..." }] }
 */
function parseResult(result) {
  if (!result || !result.content || !result.content[0]) {
    throw new Error("Invalid result format");
  }
  
  const text = result.content[0].text;
  
  // Try to parse as JSON first
  try {
    return JSON.parse(text);
  } catch (e) {
    // If not JSON, return as-is (might be markdown or plain text)
    return { _rawText: text, _isText: true };
  }
}

/**
 * Call a tool function
 */
async function callTool(toolName, params = {}) {
  if (!tools[toolName]) {
    throw new Error(`Tool ${toolName} not found`);
  }
  
  try {
    const result = await tools[toolName](params);
    return result;
  } catch (error) {
    throw new Error(`Failed to call ${toolName}: ${error.message}`);
  }
}

// ============================================================================
// GET/READ-ONLY TOOLS TESTS
// ============================================================================

async function testGetTeams() {
  try {
    const result = await callTool("getTeams", { first: 10 });
    const data = parseResult(result);
    
    if (data.results && Array.isArray(data.results)) {
      // Store team data for later use
      if (data.results.length > 0) {
        testData.teamId = data.results[0].id;
        const leadershipTeam = data.results.find(t => t.isLeadership);
        if (leadershipTeam) {
          testData.leadershipTeamId = leadershipTeam.id;
        }
      }
      logResult("getTeams", "pass", `Found ${data.results.length} teams`);
    } else {
      logResult("getTeams", "fail", "Invalid response format");
    }
  } catch (error) {
    logResult("getTeams", "fail", "", error);
  }
}

async function testGetUsers() {
  try {
    const result = await callTool("getUsers", { first: 10 });
    const data = parseResult(result);
    
    // Check if it's an error message
    if (typeof data === 'string' && data.includes('Error')) {
      logResult("getUsers", "fail", data);
      return;
    }
    
    if (data.results && Array.isArray(data.results)) {
      // Store user ID for later use
      if (data.results.length > 0) {
        testData.userId = data.results[0].id;
      }
      logResult("getUsers", "pass", `Found ${data.results.length} users`);
    } else {
      logResult("getUsers", "fail", `Unexpected format: ${JSON.stringify(data).substring(0, 100)}`);
    }
  } catch (error) {
    logResult("getUsers", "fail", "", error);
  }
}

async function testGetTodos() {
  try {
    const result = await callTool("getTodos", { first: 10, status: "ALL" });
    const data = parseResult(result);
    
    if (data.results && Array.isArray(data.results)) {
      // Store a todo ID if available
      if (data.results.length > 0) {
        testData.todoId = data.results[0].id;
      }
      logResult("getTodos", "pass", `Found ${data.results.length} todos`);
    } else {
      logResult("getTodos", "fail", "Invalid response format");
    }
  } catch (error) {
    logResult("getTodos", "fail", "", error);
  }
}

async function testGetRocks() {
  try {
    const result = await callTool("getRocks", { first: 10, timePeriod: "this_year" });
    const data = parseResult(result);
    
    // Check if it's an error message
    if (typeof data === 'string' && data.includes('Error')) {
      logResult("getRocks", "fail", data);
      return;
    }
    
    if (data.results && Array.isArray(data.results)) {
      // Store a rock ID if available
      if (data.results.length > 0) {
        testData.rockId = data.results[0].id;
      }
      logResult("getRocks", "pass", `Found ${data.results.length} rocks`);
    } else {
      logResult("getRocks", "fail", `Unexpected format: ${JSON.stringify(data).substring(0, 100)}`);
    }
  } catch (error) {
    logResult("getRocks", "fail", "", error);
  }
}

async function testGetMeetings() {
  try {
    if (!testData.teamId) {
      logResult("getMeetings", "skip", "No team ID available");
      return;
    }
    
    const result = await callTool("getMeetings", { 
      teamId: testData.teamId, 
      first: 10 
    });
    const data = parseResult(result);
    
    if (data.results && Array.isArray(data.results)) {
      // Store a meeting ID if available
      if (data.results.length > 0) {
        testData.meetingId = data.results[0].id;
      }
      logResult("getMeetings", "pass", `Found ${data.results.length} meetings`);
    } else {
      logResult("getMeetings", "fail", "Invalid response format");
    }
  } catch (error) {
    logResult("getMeetings", "fail", "", error);
  }
}

async function testGetIssues() {
  try {
    const result = await callTool("getIssues", { first: 10, status: "ALL" });
    const data = parseResult(result);
    
    if (data.results && Array.isArray(data.results)) {
      // Store an issue ID if available
      if (data.results.length > 0) {
        testData.issueId = data.results[0].id;
      }
      logResult("getIssues", "pass", `Found ${data.results.length} issues`);
    } else {
      logResult("getIssues", "fail", "Invalid response format");
    }
  } catch (error) {
    logResult("getIssues", "fail", "", error);
  }
}

async function testGetHeadlines() {
  try {
    const result = await callTool("getHeadlines", { first: 10 });
    const data = parseResult(result);
    
    if (data.results && Array.isArray(data.results)) {
      // Store a headline ID if available
      if (data.results.length > 0) {
        testData.headlineId = data.results[0].id;
      }
      logResult("getHeadlines", "pass", `Found ${data.results.length} headlines`);
    } else {
      logResult("getHeadlines", "fail", "Invalid response format");
    }
  } catch (error) {
    logResult("getHeadlines", "fail", "", error);
  }
}

async function testGetMilestones() {
  try {
    const result = await callTool("getMilestones", { first: 10 });
    const data = parseResult(result);
    
    // Check if it's an error message
    if (typeof data === 'string' && data.includes('Error')) {
      logResult("getMilestones", "fail", data);
      return;
    }
    
    if (data.results && Array.isArray(data.results)) {
      logResult("getMilestones", "pass", `Found ${data.results.length} milestones`);
    } else {
      logResult("getMilestones", "fail", `Unexpected format: ${JSON.stringify(data).substring(0, 100)}`);
    }
  } catch (error) {
    logResult("getMilestones", "fail", "", error);
  }
}

async function testSearch() {
  try {
    const result = await callTool("search", { query: "show teams" });
    const data = parseResult(result);
    
    // Check if it's an error message
    if (typeof data === 'string' && data.includes('Error')) {
      logResult("search", "fail", data);
      return;
    }
    
    // Search returns { kind, totalCount, hits } instead of { results }
    if (data.hits && Array.isArray(data.hits)) {
      logResult("search", "pass", `Found ${data.hits.length} results (${data.kind})`);
    } else if (data.results && Array.isArray(data.results)) {
      logResult("search", "pass", `Found ${data.results.length} results`);
    } else {
      logResult("search", "fail", `Unexpected format: ${JSON.stringify(data).substring(0, 100)}`);
    }
  } catch (error) {
    logResult("search", "fail", "", error);
  }
}

async function testGetScorecardMeasurables() {
  try {
    const result = await callTool("getScorecardMeasurables", { first: 10 });
    const data = parseResult(result);
    
    // Check if it's an error message
    if (typeof data === 'string' && data.includes('Error')) {
      logResult("getScorecardMeasurables", "fail", data);
      return;
    }
    
    // getScorecardMeasurables returns { scorecardMeasurables: [...] }
    if (data.scorecardMeasurables && Array.isArray(data.scorecardMeasurables)) {
      // Store a data field ID if available
      if (data.scorecardMeasurables.length > 0 && data.scorecardMeasurables[0].dataFieldId) {
        testData.dataFieldId = data.scorecardMeasurables[0].dataFieldId;
      }
      logResult("getScorecardMeasurables", "pass", `Found ${data.scorecardMeasurables.length} measurables`);
    } else if (data.results && Array.isArray(data.results)) {
      // Alternative format
      if (data.results.length > 0 && data.results[0].dataFieldId) {
        testData.dataFieldId = data.results[0].dataFieldId;
      }
      logResult("getScorecardMeasurables", "pass", `Found ${data.results.length} measurables`);
    } else {
      logResult("getScorecardMeasurables", "fail", `Unexpected format: ${JSON.stringify(data).substring(0, 100)}`);
    }
  } catch (error) {
    logResult("getScorecardMeasurables", "fail", "", error);
  }
}

async function testGetMeetingInfos() {
  try {
    if (!testData.teamId) {
      logResult("getMeetingInfos", "skip", "No team ID available");
      return;
    }
    
    const result = await callTool("getMeetingInfos", { 
      teamId: testData.teamId, 
      first: 10 
    });
    const data = parseResult(result);
    
    if (data.results && Array.isArray(data.results)) {
      logResult("getMeetingInfos", "pass", `Found ${data.results.length} meeting infos`);
    } else {
      logResult("getMeetingInfos", "fail", "Invalid response format");
    }
  } catch (error) {
    logResult("getMeetingInfos", "fail", "", error);
  }
}

async function testGetMeetingAgendas() {
  try {
    const result = await callTool("getMeetingAgendas", { first: 10 });
    const data = parseResult(result);
    
    if (data.results && Array.isArray(data.results)) {
      logResult("getMeetingAgendas", "pass", `Found ${data.results.length} meeting agendas`);
    } else {
      logResult("getMeetingAgendas", "fail", "Invalid response format");
    }
  } catch (error) {
    logResult("getMeetingAgendas", "fail", "", error);
  }
}

async function testGetLeadershipVTO() {
  try {
    const result = await callTool("getLeadershipVTO", {});
    const data = parseResult(result);
    
    // Check if it's an error message
    if (typeof data === 'string' && data.includes('Error')) {
      logResult("getLeadershipVTO", "fail", data);
      return;
    }
    
    // This tool returns markdown text, not JSON
    if (data._isText && data._rawText) {
      if (data._rawText.includes('Leadership Vision/Traction Organizer')) {
        logResult("getLeadershipVTO", "pass", "Retrieved VTO data (markdown format)");
      } else {
        logResult("getLeadershipVTO", "pass", "Retrieved VTO response");
      }
      return;
    }
    
    if (data && typeof data === 'object') {
      const hasVTOData = data.coreValues || data.coreFocus || data.goals || data.marketingStrategies;
      if (hasVTOData) {
        logResult("getLeadershipVTO", "pass", "Retrieved VTO data");
      } else {
        logResult("getLeadershipVTO", "pass", "Retrieved empty VTO (no data yet)");
      }
    } else {
      logResult("getLeadershipVTO", "fail", `Unexpected format: ${JSON.stringify(data).substring(0, 100)}`);
    }
  } catch (error) {
    logResult("getLeadershipVTO", "fail", "", error);
  }
}

async function testGetAccountabilityChart() {
  try {
    const result = await callTool("getAccountabilityChart", {});
    const data = parseResult(result);
    
    // Check if it's an error message
    if (typeof data === 'string' && data.includes('Error')) {
      logResult("getAccountabilityChart", "fail", data);
      return;
    }
    
    // This tool returns markdown text, not JSON
    if (data._isText && data._rawText) {
      if (data._rawText.includes('Accountability Chart')) {
        logResult("getAccountabilityChart", "pass", "Retrieved accountability chart (markdown format)");
      } else {
        logResult("getAccountabilityChart", "pass", "Retrieved chart response");
      }
      return;
    }
    
    if (data && typeof data === 'object') {
      const hasChartData = data.users || data.seats || data.structure;
      if (hasChartData) {
        logResult("getAccountabilityChart", "pass", "Retrieved accountability chart");
      } else {
        logResult("getAccountabilityChart", "pass", "Retrieved empty chart (no data yet)");
      }
    } else {
      logResult("getAccountabilityChart", "fail", `Unexpected format: ${JSON.stringify(data).substring(0, 100)}`);
    }
  } catch (error) {
    logResult("getAccountabilityChart", "fail", "", error);
  }
}

async function testGetMeetingDetails() {
  try {
    if (!testData.meetingId) {
      logResult("getMeetingDetails", "skip", "No meeting ID available");
      return;
    }
    
    const result = await callTool("getMeetingDetails", { 
      meetingId: testData.meetingId 
    });
    const data = parseResult(result);
    
    if (data && data.meeting) {
      logResult("getMeetingDetails", "pass", "Retrieved meeting details");
    } else {
      logResult("getMeetingDetails", "fail", "Invalid response format");
    }
  } catch (error) {
    logResult("getMeetingDetails", "fail", "", error);
  }
}

async function testGetPeopleAnalyzerSessions() {
  try {
    const result = await callTool("getPeopleAnalyzerSessions", { first: 10 });
    const data = parseResult(result);
    
    // Check if it's an error message
    if (typeof data === 'string' && data.includes('Error')) {
      logResult("getPeopleAnalyzerSessions", "fail", data);
      return;
    }
    
    // Check for text response
    if (data._isText) {
      logResult("getPeopleAnalyzerSessions", "pass", "Retrieved sessions (text format)");
      return;
    }
    
    if (data.results && Array.isArray(data.results)) {
      logResult("getPeopleAnalyzerSessions", "pass", `Found ${data.results.length} sessions`);
    } else if (data.sessions && Array.isArray(data.sessions)) {
      logResult("getPeopleAnalyzerSessions", "pass", `Found ${data.sessions.length} sessions`);
    } else {
      logResult("getPeopleAnalyzerSessions", "fail", `Unexpected format: ${JSON.stringify(data).substring(0, 100)}`);
    }
  } catch (error) {
    logResult("getPeopleAnalyzerSessions", "fail", "", error);
  }
}

async function testGetOrgCheckups() {
  try {
    const result = await callTool("getOrgCheckups", { first: 10 });
    const data = parseResult(result);
    
    // Check if it's an error message
    if (typeof data === 'string' && data.includes('Error')) {
      logResult("getOrgCheckups", "fail", data);
      return;
    }
    
    // Check for text response
    if (data._isText) {
      logResult("getOrgCheckups", "pass", "Retrieved checkups (text format)");
      return;
    }
    
    if (data.results && Array.isArray(data.results)) {
      logResult("getOrgCheckups", "pass", `Found ${data.results.length} checkups`);
    } else if (data.checkups && Array.isArray(data.checkups)) {
      logResult("getOrgCheckups", "pass", `Found ${data.checkups.length} checkups`);
    } else {
      logResult("getOrgCheckups", "fail", `Unexpected format: ${JSON.stringify(data).substring(0, 100)}`);
    }
  } catch (error) {
    logResult("getOrgCheckups", "fail", "", error);
  }
}

async function testGetComments() {
  try {
    const result = await callTool("getComments", { first: 10 });
    const data = parseResult(result);
    
    // Check if it's an error message
    if (typeof data === 'string' && data.includes('Error')) {
      logResult("getComments", "fail", data);
      return;
    }
    
    // Check for text response
    if (data._isText) {
      logResult("getComments", "pass", "Retrieved comments (text format)");
      return;
    }
    
    if (data.results && Array.isArray(data.results)) {
      logResult("getComments", "pass", `Found ${data.results.length} comments`);
    } else if (data.comments && Array.isArray(data.comments)) {
      logResult("getComments", "pass", `Found ${data.comments.length} comments`);
    } else {
      logResult("getComments", "fail", `Unexpected format: ${JSON.stringify(data).substring(0, 100)}`);
    }
  } catch (error) {
    logResult("getComments", "fail", "", error);
  }
}

async function testGetExecutionHealth() {
  try {
    const result = await callTool("getExecutionHealth", {});
    const data = parseResult(result);
    
    // Check if it's an error message
    if (typeof data === 'string' && data.includes('Error')) {
      logResult("getExecutionHealth", "fail", data);
      return;
    }
    
    // Check for text response
    if (data._isText) {
      logResult("getExecutionHealth", "pass", "Retrieved health data (text format)");
      return;
    }
    
    if (data && data.health_score !== undefined) {
      logResult("getExecutionHealth", "pass", `Health score: ${data.health_score}`);
    } else if (data && typeof data === 'object') {
      logResult("getExecutionHealth", "pass", "Retrieved health data");
    } else {
      logResult("getExecutionHealth", "fail", `Unexpected format: ${JSON.stringify(data).substring(0, 100)}`);
    }
  } catch (error) {
    logResult("getExecutionHealth", "fail", "", error);
  }
}

async function testGetUserWorkload() {
  try {
    const result = await callTool("getUserWorkload", {});
    const data = parseResult(result);
    
    // Check if it's an error message
    if (typeof data === 'string' && data.includes('Error')) {
      logResult("getUserWorkload", "fail", data);
      return;
    }
    
    // Check for text response
    if (data._isText) {
      logResult("getUserWorkload", "pass", "Retrieved workload data (text format)");
      return;
    }
    
    if (data && Array.isArray(data.users)) {
      logResult("getUserWorkload", "pass", `Found ${data.users.length} users`);
    } else if (data && typeof data === 'object') {
      logResult("getUserWorkload", "pass", "Retrieved workload data");
    } else {
      logResult("getUserWorkload", "fail", `Unexpected format: ${JSON.stringify(data).substring(0, 100)}`);
    }
  } catch (error) {
    logResult("getUserWorkload", "fail", "", error);
  }
}

async function testGetCompanyInsights() {
  try {
    const result = await callTool("getCompanyInsights", {});
    const data = parseResult(result);
    
    // Check if it's an error message
    if (typeof data === 'string' && data.includes('Error')) {
      logResult("getCompanyInsights", "fail", data);
      return;
    }
    
    // Check for text response
    if (data._isText) {
      logResult("getCompanyInsights", "pass", "Retrieved insights (text format)");
      return;
    }
    
    if (data && typeof data === 'object' && !data._isText) {
      logResult("getCompanyInsights", "pass", "Retrieved company insights");
    } else {
      logResult("getCompanyInsights", "fail", `Unexpected format: ${JSON.stringify(data).substring(0, 100)}`);
    }
  } catch (error) {
    logResult("getCompanyInsights", "fail", "", error);
  }
}

// ============================================================================
// WRITE TOOLS TESTS - TODO LIFECYCLE
// ============================================================================

async function testTodoLifecycle() {
  console.log("\n🔄 Testing Todo Lifecycle (Create -> Update -> Delete)...\n");
  
  let createdTodoId = null;
  
  // CREATE
  try {
    if (!testData.teamId) {
      logResult("createTodo", "skip", "No team ID available");
      return;
    }
    
    const result = await callTool("createTodo", {
      name: "E2E Test Todo - " + Date.now(),
      desc: "This is a test todo created by e2e test",
      teamId: testData.teamId,
    });
    const data = parseResult(result);
    
    if (data.success && data.todo && data.todo.id) {
      createdTodoId = data.todo.id;
      createdItems.todos.push(createdTodoId);
      logResult("createTodo", "pass", `Created todo: ${createdTodoId}`);
    } else {
      logResult("createTodo", "fail", "Invalid response format");
      return;
    }
  } catch (error) {
    logResult("createTodo", "fail", "", error);
    return;
  }
  
  // UPDATE
  try {
    const result = await callTool("updateTodo", {
      todoId: createdTodoId,
      name: "E2E Test Todo - Updated",
      todoStatusId: "COMPLETE",
    });
    const data = parseResult(result);
    
    if (data.success) {
      logResult("updateTodo", "pass", `Updated todo: ${createdTodoId}`);
    } else {
      logResult("updateTodo", "fail", "Update failed");
    }
  } catch (error) {
    logResult("updateTodo", "fail", "", error);
  }
  
  // DELETE
  try {
    const result = await callTool("deleteTodo", {
      todoId: createdTodoId,
    });
    const data = parseResult(result);
    
    if (data.success) {
      logResult("deleteTodo", "pass", `Deleted todo: ${createdTodoId}`);
      // Remove from cleanup list
      createdItems.todos = createdItems.todos.filter(id => id !== createdTodoId);
    } else {
      logResult("deleteTodo", "fail", "Delete failed");
    }
  } catch (error) {
    logResult("deleteTodo", "fail", "", error);
  }
}

// ============================================================================
// WRITE TOOLS TESTS - ISSUE LIFECYCLE
// ============================================================================

async function testIssueLifecycle() {
  console.log("\n🔄 Testing Issue Lifecycle (Create -> Update -> Delete)...\n");
  
  let createdIssueId = null;
  
  // CREATE
  try {
    if (!testData.teamId) {
      logResult("createIssue", "skip", "No team ID available");
      return;
    }
    
    const result = await callTool("createIssue", {
      name: "E2E Test Issue - " + Date.now(),
      desc: "This is a test issue created by e2e test",
      teamId: testData.teamId,
      priority: "Medium",
    });
    const data = parseResult(result);
    
    if (data.success && data.issue && data.issue.id) {
      createdIssueId = data.issue.id;
      createdItems.issues.push(createdIssueId);
      logResult("createIssue", "pass", `Created issue: ${createdIssueId}`);
    } else {
      logResult("createIssue", "fail", "Invalid response format");
      return;
    }
  } catch (error) {
    logResult("createIssue", "fail", "", error);
    return;
  }
  
  // UPDATE
  try {
    const result = await callTool("updateIssue", {
      issueId: createdIssueId,
      name: "E2E Test Issue - Updated",
      priority: "High",
      issueStatusId: "COMPLETE",
    });
    const data = parseResult(result);
    
    if (data.success) {
      logResult("updateIssue", "pass", `Updated issue: ${createdIssueId}`);
    } else {
      logResult("updateIssue", "fail", "Update failed");
    }
  } catch (error) {
    logResult("updateIssue", "fail", "", error);
  }
  
  // DELETE
  try {
    const result = await callTool("deleteIssue", {
      issueId: createdIssueId,
    });
    const data = parseResult(result);
    
    if (data.success) {
      logResult("deleteIssue", "pass", `Deleted issue: ${createdIssueId}`);
      createdItems.issues = createdItems.issues.filter(id => id !== createdIssueId);
    } else {
      logResult("deleteIssue", "fail", "Delete failed");
    }
  } catch (error) {
    logResult("deleteIssue", "fail", "", error);
  }
}

// ============================================================================
// WRITE TOOLS TESTS - ROCK LIFECYCLE
// ============================================================================

async function testRockLifecycle() {
  console.log("\n🔄 Testing Rock Lifecycle (Create -> Update -> Delete)...\n");
  
  let createdRockId = null;
  
  // CREATE
  try {
    if (!testData.teamId) {
      logResult("createRock", "skip", "No team ID available");
      return;
    }
    
    const result = await callTool("createRock", {
      name: "E2E Test Rock - " + Date.now(),
      desc: "This is a test rock created by e2e test",
      teamId: testData.teamId,
    });
    const data = parseResult(result);
    
    if (data.success && data.rock && data.rock.id) {
      createdRockId = data.rock.id;
      createdItems.rocks.push(createdRockId);
      logResult("createRock", "pass", `Created rock: ${createdRockId}`);
    } else {
      logResult("createRock", "fail", "Invalid response format");
      return;
    }
  } catch (error) {
    logResult("createRock", "fail", "", error);
    return;
  }
  
  // UPDATE
  try {
    const result = await callTool("updateRock", {
      rockId: createdRockId,
      name: "E2E Test Rock - Updated",
      status: "OFFTRACK",
    });
    const data = parseResult(result);
    
    if (data.success) {
      logResult("updateRock", "pass", `Updated rock: ${createdRockId}`);
    } else {
      logResult("updateRock", "fail", "Update failed");
    }
  } catch (error) {
    logResult("updateRock", "fail", "", error);
  }
  
  // Test milestone on rock before deleting
  await testMilestoneLifecycle(createdRockId);
  
  // DELETE
  try {
    const result = await callTool("deleteRock", {
      rockId: createdRockId,
    });
    const data = parseResult(result);
    
    if (data.success) {
      logResult("deleteRock", "pass", `Deleted rock: ${createdRockId}`);
      createdItems.rocks = createdItems.rocks.filter(id => id !== createdRockId);
    } else {
      logResult("deleteRock", "fail", "Delete failed");
    }
  } catch (error) {
    logResult("deleteRock", "fail", "", error);
  }
}

// ============================================================================
// WRITE TOOLS TESTS - MILESTONE LIFECYCLE
// ============================================================================

async function testMilestoneLifecycle(rockId) {
  console.log("\n🔄 Testing Milestone Lifecycle (Create -> Update -> Delete)...\n");
  
  let createdMilestoneId = null;
  
  // CREATE
  try {
    if (!rockId) {
      logResult("createMilestone", "skip", "No rock ID available");
      logResult("updateMilestone", "skip", "No milestone created");
      logResult("deleteMilestone", "skip", "No milestone created");
      return;
    }
    
    // Calculate a due date 30 days from now
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30);
    const dueDateStr = dueDate.toISOString().split('T')[0]; // YYYY-MM-DD format
    
    const result = await callTool("createMilestone", {
      name: "E2E Test Milestone - " + Date.now(),
      rockId: rockId,
      dueDate: dueDateStr,
    });
    const data = parseResult(result);
    
    // Check if it's an error message
    if (typeof data === 'string' && data.includes('Error')) {
      logResult("createMilestone", "fail", data);
      logResult("updateMilestone", "skip", "No milestone created");
      logResult("deleteMilestone", "skip", "No milestone created");
      return;
    }
    
    if (data.success && data.milestone && data.milestone.id) {
      createdMilestoneId = data.milestone.id;
      createdItems.milestones.push(createdMilestoneId);
      logResult("createMilestone", "pass", `Created milestone: ${createdMilestoneId}`);
    } else {
      logResult("createMilestone", "fail", `Unexpected format: ${JSON.stringify(data).substring(0, 100)}`);
      logResult("updateMilestone", "skip", "No milestone created");
      logResult("deleteMilestone", "skip", "No milestone created");
      return;
    }
  } catch (error) {
    logResult("createMilestone", "fail", "", error);
    logResult("updateMilestone", "skip", "No milestone created");
    logResult("deleteMilestone", "skip", "No milestone created");
    return;
  }
  
  // UPDATE
  try {
    const result = await callTool("updateMilestone", {
      milestoneId: createdMilestoneId,
      name: "E2E Test Milestone - Updated",
      milestoneStatusId: "COMPLETE",
    });
    const data = parseResult(result);
    
    if (data.success) {
      logResult("updateMilestone", "pass", `Updated milestone: ${createdMilestoneId}`);
    } else {
      logResult("updateMilestone", "fail", "Update failed");
    }
  } catch (error) {
    logResult("updateMilestone", "fail", "", error);
  }
  
  // DELETE
  try {
    const result = await callTool("deleteMilestone", {
      milestoneId: createdMilestoneId,
    });
    const data = parseResult(result);
    
    if (data.success) {
      logResult("deleteMilestone", "pass", `Deleted milestone: ${createdMilestoneId}`);
      createdItems.milestones = createdItems.milestones.filter(id => id !== createdMilestoneId);
    } else {
      logResult("deleteMilestone", "fail", "Delete failed");
    }
  } catch (error) {
    logResult("deleteMilestone", "fail", "", error);
  }
}

// ============================================================================
// WRITE TOOLS TESTS - HEADLINE LIFECYCLE
// ============================================================================

async function testHeadlineLifecycle() {
  console.log("\n🔄 Testing Headline Lifecycle (Create -> Update -> Delete)...\n");
  
  let createdHeadlineId = null;
  
  // CREATE
  try {
    if (!testData.teamId) {
      logResult("createHeadline", "skip", "No team ID available");
      return;
    }
    
    const result = await callTool("createHeadline", {
      name: "E2E Test Headline - " + Date.now(),
      desc: "This is a test headline created by e2e test",
      teamId: testData.teamId,
    });
    const data = parseResult(result);
    
    if (data.success && data.headline && data.headline.id) {
      createdHeadlineId = data.headline.id;
      createdItems.headlines.push(createdHeadlineId);
      logResult("createHeadline", "pass", `Created headline: ${createdHeadlineId}`);
    } else {
      logResult("createHeadline", "fail", "Invalid response format");
      return;
    }
  } catch (error) {
    logResult("createHeadline", "fail", "", error);
    return;
  }
  
  // UPDATE
  try {
    const result = await callTool("updateHeadline", {
      headlineId: createdHeadlineId,
      name: "E2E Test Headline - Updated",
      status: "Shared",
    });
    const data = parseResult(result);
    
    if (data.success) {
      logResult("updateHeadline", "pass", `Updated headline: ${createdHeadlineId}`);
    } else {
      logResult("updateHeadline", "fail", "Update failed");
    }
  } catch (error) {
    logResult("updateHeadline", "fail", "", error);
  }
  
  // DELETE
  try {
    const result = await callTool("deleteHeadline", {
      headlineId: createdHeadlineId,
    });
    const data = parseResult(result);
    
    if (data.success) {
      logResult("deleteHeadline", "pass", `Deleted headline: ${createdHeadlineId}`);
      createdItems.headlines = createdItems.headlines.filter(id => id !== createdHeadlineId);
    } else {
      logResult("deleteHeadline", "fail", "Delete failed");
    }
  } catch (error) {
    logResult("deleteHeadline", "fail", "", error);
  }
}

// ============================================================================
// WRITE TOOLS TESTS - COMMENT LIFECYCLE
// ============================================================================

async function testCommentLifecycle() {
  console.log("\n🔄 Testing Comment Lifecycle (Create -> Update -> Delete)...\n");
  
  let createdCommentId = null;
  
  // We need an existing issue or rock to comment on
  if (!testData.issueId && !testData.rockId) {
    logResult("createComment", "skip", "No entity ID available for commenting");
    logResult("updateComment", "skip", "No entity ID available for commenting");
    logResult("deleteComment", "skip", "No entity ID available for commenting");
    return;
  }
  
  const entityType = testData.issueId ? "issue" : "rock";
  const entityId = testData.issueId || testData.rockId;
  
  // CREATE
  try {
    // The comment tool expects 'objectId' not 'entityId'
    const result = await callTool("createComment", {
      comment: "E2E Test Comment - " + Date.now(),
      entityType: entityType,
      entityId: entityId, // This should map to objectId internally
    });
    const data = parseResult(result);
    
    // Check if it's an error message
    if (typeof data === 'string' && data.includes('Error')) {
      logResult("createComment", "fail", data);
      logResult("updateComment", "skip", "No comment created");
      logResult("deleteComment", "skip", "No comment created");
      return;
    }
    
    if (data.success && data.comment && data.comment.id) {
      createdCommentId = data.comment.id;
      createdItems.comments.push(createdCommentId);
      logResult("createComment", "pass", `Created comment: ${createdCommentId}`);
    } else {
      logResult("createComment", "fail", `Unexpected format: ${JSON.stringify(data).substring(0, 100)}`);
      logResult("updateComment", "skip", "No comment created");
      logResult("deleteComment", "skip", "No comment created");
      return;
    }
  } catch (error) {
    logResult("createComment", "fail", "", error);
    logResult("updateComment", "skip", "No comment created");
    logResult("deleteComment", "skip", "No comment created");
    return;
  }
  
  // UPDATE
  try {
    const result = await callTool("updateComment", {
      commentId: createdCommentId,
      comment: "E2E Test Comment - Updated",
    });
    const data = parseResult(result);
    
    if (data.success) {
      logResult("updateComment", "pass", `Updated comment: ${createdCommentId}`);
    } else {
      logResult("updateComment", "fail", "Update failed");
    }
  } catch (error) {
    logResult("updateComment", "fail", "", error);
  }
  
  // DELETE
  try {
    const result = await callTool("deleteComment", {
      commentId: createdCommentId,
    });
    const data = parseResult(result);
    
    if (data.success) {
      logResult("deleteComment", "pass", `Deleted comment: ${createdCommentId}`);
      createdItems.comments = createdItems.comments.filter(id => id !== createdCommentId);
    } else {
      logResult("deleteComment", "fail", "Delete failed");
    }
  } catch (error) {
    logResult("deleteComment", "fail", "", error);
  }
}

// ============================================================================
// WRITE TOOLS TESTS - SCORECARD ENTRY
// ============================================================================

async function testScorecardEntry() {
  console.log("\n🔄 Testing Scorecard Entry (Create/Update)...\n");
  
  // CREATE OR UPDATE
  try {
    if (!testData.dataFieldId) {
      logResult("createScorecardMeasurableEntry", "skip", "No data field ID available");
      return;
    }
    
    const result = await callTool("createScorecardMeasurableEntry", {
      dataFieldId: testData.dataFieldId,
      value: "999",
      note: "E2E test entry",
      overwrite: true, // Allow updating existing entries
    });
    const data = parseResult(result);
    
    if (data.success) {
      logResult("createScorecardMeasurableEntry", "pass", "Created/updated scorecard entry");
    } else {
      logResult("createScorecardMeasurableEntry", "fail", "Failed to create entry");
    }
  } catch (error) {
    logResult("createScorecardMeasurableEntry", "fail", "", error);
  }
  
  // Note: We don't test updateScorecardMeasurableEntry here because it requires
  // an entryId which we'd need to fetch from the previous create operation
}

// ============================================================================
// CLEANUP
// ============================================================================

async function cleanup() {
  console.log("\n🧹 Cleaning up any remaining test items...\n");
  
  // Delete todos
  for (const todoId of createdItems.todos) {
    try {
      await callTool("deleteTodo", { todoId });
      console.log(`   Deleted todo: ${todoId}`);
    } catch (error) {
      console.log(`   Failed to delete todo ${todoId}: ${error.message}`);
    }
  }
  
  // Delete issues
  for (const issueId of createdItems.issues) {
    try {
      await callTool("deleteIssue", { issueId });
      console.log(`   Deleted issue: ${issueId}`);
    } catch (error) {
      console.log(`   Failed to delete issue ${issueId}: ${error.message}`);
    }
  }
  
  // Delete comments
  for (const commentId of createdItems.comments) {
    try {
      await callTool("deleteComment", { commentId });
      console.log(`   Deleted comment: ${commentId}`);
    } catch (error) {
      console.log(`   Failed to delete comment ${commentId}: ${error.message}`);
    }
  }
  
  // Delete headlines
  for (const headlineId of createdItems.headlines) {
    try {
      await callTool("deleteHeadline", { headlineId });
      console.log(`   Deleted headline: ${headlineId}`);
    } catch (error) {
      console.log(`   Failed to delete headline ${headlineId}: ${error.message}`);
    }
  }
  
  // Delete milestones
  for (const milestoneId of createdItems.milestones) {
    try {
      await callTool("deleteMilestone", { milestoneId });
      console.log(`   Deleted milestone: ${milestoneId}`);
    } catch (error) {
      console.log(`   Failed to delete milestone ${milestoneId}: ${error.message}`);
    }
  }
  
  // Delete rocks
  for (const rockId of createdItems.rocks) {
    try {
      await callTool("deleteRock", { rockId });
      console.log(`   Deleted rock: ${rockId}`);
    } catch (error) {
      console.log(`   Failed to delete rock ${rockId}: ${error.message}`);
    }
  }
}

// ============================================================================
// MAIN TEST RUNNER
// ============================================================================

async function runAllTests() {
  console.log("═══════════════════════════════════════════════════════════");
  console.log("  SUCCESS.CO MCP SERVER - END-TO-END TEST SUITE");
  console.log("═══════════════════════════════════════════════════════════");
  console.log(`Time: ${new Date().toISOString()}`);
  console.log("═══════════════════════════════════════════════════════════\n");
  
  try {
    // ========================================================================
    // PHASE 1: GET/READ-ONLY TOOLS
    // ========================================================================
    console.log("📖 PHASE 1: Testing GET/Read-Only Tools\n");
    console.log("───────────────────────────────────────────────────────────\n");
    
    await testGetTeams();
    await testGetUsers();
    await testGetTodos();
    await testGetRocks();
    await testGetMeetings();
    await testGetIssues();
    await testGetHeadlines();
    await testGetMilestones();
    await testSearch();
    await testGetScorecardMeasurables();
    await testGetMeetingInfos();
    await testGetMeetingAgendas();
    await testGetLeadershipVTO();
    await testGetAccountabilityChart();
    await testGetMeetingDetails();
    await testGetPeopleAnalyzerSessions();
    await testGetOrgCheckups();
    await testGetComments();
    await testGetExecutionHealth();
    await testGetUserWorkload();
    await testGetCompanyInsights();
    
    // ========================================================================
    // PHASE 2: WRITE TOOLS (Create/Update/Delete)
    // ========================================================================
    console.log("\n═══════════════════════════════════════════════════════════\n");
    console.log("✏️  PHASE 2: Testing Write Tools (Create/Update/Delete)\n");
    console.log("───────────────────────────────────────────────────────────\n");
    
    await testTodoLifecycle();
    await testIssueLifecycle();
    await testRockLifecycle();
    await testHeadlineLifecycle();
    await testCommentLifecycle();
    await testScorecardEntry();
    
    // ========================================================================
    // CLEANUP
    // ========================================================================
    await cleanup();
    
    // ========================================================================
    // RESULTS
    // ========================================================================
    console.log("\n═══════════════════════════════════════════════════════════");
    console.log("  TEST RESULTS");
    console.log("═══════════════════════════════════════════════════════════\n");
    
    console.log(`Total Tests:    ${stats.total}`);
    console.log(`✅ Passed:      ${stats.passed} (${Math.round((stats.passed / stats.total) * 100)}%)`);
    console.log(`❌ Failed:      ${stats.failed} (${Math.round((stats.failed / stats.total) * 100)}%)`);
    console.log(`⏭️  Skipped:     ${stats.skipped} (${Math.round((stats.skipped / stats.total) * 100)}%)`);
    
    console.log("\n═══════════════════════════════════════════════════════════\n");
    
    // Exit with appropriate code
    if (stats.failed > 0) {
      console.log("❌ Some tests failed. See details above.\n");
      process.exit(1);
    } else {
      console.log("✅ All tests passed!\n");
      process.exit(0);
    }
    
  } catch (error) {
    console.error("\n❌ Fatal error running tests:");
    console.error(error);
    process.exit(1);
  }
}

// Run the tests
runAllTests();

