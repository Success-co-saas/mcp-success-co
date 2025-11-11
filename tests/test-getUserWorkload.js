#!/usr/bin/env node

/**
 * Comprehensive Test Suite for getUserWorkload Tool
 * 
 * This script tests the getUserWorkload tool with various parameter combinations:
 * 1. Basic usage (no parameters)
 * 2. With specific teamId
 * 3. With leadershipTeam flag
 * 4. With specific userId
 * 5. With currentUser flag (tests the bug fix for filtering by current user)
 * 6. Combined parameters (teamId + userId)
 * 7. Workload accuracy validation
 * 
 * Usage:
 *   node tests/test-getUserWorkload.js
 * 
 * Environment variables required (in .env file):
 *   DEVMODE_SUCCESS_API_KEY - API key for authentication
 *   DEVMODE_SUCCESS_USE_API_KEY=true - REQUIRED to enable API key mode
 *   NODE_ENV=development - Required for API key mode
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
  results: [],
};

/**
 * Log test result
 */
function logResult(testName, status, message = "", error = null) {
  stats.total++;
  
  const emoji = {
    pass: "✅",
    fail: "❌",
  }[status] || "❔";
  
  const result = {
    test: testName,
    status,
    message,
    error: error?.message,
  };
  
  if (status === "pass") {
    stats.passed++;
  } else if (status === "fail") {
    stats.failed++;
  }
  
  stats.results.push(result);
  console.log(`${emoji} ${testName}: ${message}`);
  if (error) {
    console.log(`   Error: ${error.message}`);
    if (error.stack && process.env.DEBUG) {
      console.log(`   Stack: ${error.stack}`);
    }
  }
}

/**
 * Parse result content
 */
function parseResult(result) {
  if (!result || !result.content || !result.content[0]) {
    throw new Error("Invalid result format");
  }
  
  const text = result.content[0].text;
  
  // Check if it's an error message
  if (text.includes("Error")) {
    return text;
  }
  
  try {
    return JSON.parse(text);
  } catch (e) {
    return { _isText: true, text };
  }
}

/**
 * Validate workload data structure
 */
function validateWorkloadData(data) {
  if (!data.summary) {
    return { valid: false, error: "Missing summary field" };
  }
  
  if (!Array.isArray(data.userWorkload)) {
    return { valid: false, error: "userWorkload is not an array" };
  }
  
  // Validate summary structure
  const requiredSummaryFields = ['totalUsers', 'totalItems', 'avgItemsPerUser', 'maxItems', 'overloadedUsersCount'];
  for (const field of requiredSummaryFields) {
    if (!(field in data.summary)) {
      return { valid: false, error: `Missing summary.${field}` };
    }
  }
  
  // Validate user workload structure
  if (data.userWorkload.length > 0) {
    const user = data.userWorkload[0];
    const requiredUserFields = ['userId', 'userName', 'email', 'rocksCount', 'issuesCount', 'todosCount', 'totalItems'];
    for (const field of requiredUserFields) {
      if (!(field in user)) {
        return { valid: false, error: `Missing userWorkload[0].${field}` };
      }
    }
  }
  
  // Validate overloadedUsers structure
  if (!Array.isArray(data.overloadedUsers)) {
    return { valid: false, error: "overloadedUsers is not an array" };
  }
  
  return { valid: true };
}

/**
 * Test 1: Basic usage with no parameters
 */
async function testBasicUsage() {
  try {
    console.log("\n=== Test 1: Basic usage (no parameters) ===");
    const result = await tools.getUserWorkload({});
    const data = parseResult(result);
    
    // Check if it's an error message
    if (typeof data === 'string' && data.includes('Error')) {
      logResult("getUserWorkload (basic)", "fail", data);
      return;
    }
    
    const validation = validateWorkloadData(data);
    if (!validation.valid) {
      logResult("getUserWorkload (basic)", "fail", validation.error);
      return;
    }
    
    logResult(
      "getUserWorkload (basic)",
      "pass",
      `Retrieved workload for ${data.summary.totalUsers} users with ${data.summary.totalItems} total items`
    );
    
    console.log(`   Total users: ${data.summary.totalUsers}`);
    console.log(`   Total items: ${data.summary.totalItems}`);
    console.log(`   Average items per user: ${data.summary.avgItemsPerUser}`);
    console.log(`   Overloaded users: ${data.summary.overloadedUsersCount}`);
    
    return data;
  } catch (error) {
    logResult("getUserWorkload (basic)", "fail", "", error);
    return null;
  }
}

/**
 * Test 2: With specific teamId
 */
async function testWithTeamId() {
  try {
    console.log("\n=== Test 2: With specific teamId ===");
    
    // First get a team ID
    const teamsResult = await tools.getTeams({ first: 1 });
    const teamsData = parseResult(teamsResult);
    
    if (!teamsData.results || teamsData.results.length === 0) {
      logResult("getUserWorkload (with teamId)", "fail", "No teams available for testing");
      return;
    }
    
    const teamId = teamsData.results[0].id;
    console.log(`   Using team ID: ${teamId} (${teamsData.results[0].name})`);
    
    const result = await tools.getUserWorkload({ teamId });
    const data = parseResult(result);
    
    // Check if it's an error message
    if (typeof data === 'string' && data.includes('Error')) {
      logResult("getUserWorkload (with teamId)", "fail", data);
      return;
    }
    
    const validation = validateWorkloadData(data);
    if (!validation.valid) {
      logResult("getUserWorkload (with teamId)", "fail", validation.error);
      return;
    }
    
    logResult(
      "getUserWorkload (with teamId)",
      "pass",
      `Retrieved workload for ${data.summary.totalUsers} team members with ${data.summary.totalItems} total items`
    );
    
    console.log(`   Total users in team: ${data.summary.totalUsers}`);
    console.log(`   Total items: ${data.summary.totalItems}`);
    
    return data;
  } catch (error) {
    logResult("getUserWorkload (with teamId)", "fail", "", error);
    return null;
  }
}

/**
 * Test 3: With leadershipTeam flag
 */
async function testWithLeadershipTeam() {
  try {
    console.log("\n=== Test 3: With leadershipTeam flag ===");
    
    const result = await tools.getUserWorkload({ leadershipTeam: true });
    const data = parseResult(result);
    
    // Check if it's an error message
    if (typeof data === 'string') {
      if (data.includes('Could not find leadership team')) {
        logResult("getUserWorkload (leadershipTeam)", "pass", "No leadership team configured (expected)");
        return null;
      } else if (data.includes('Error')) {
        logResult("getUserWorkload (leadershipTeam)", "fail", data);
        return null;
      }
    }
    
    const validation = validateWorkloadData(data);
    if (!validation.valid) {
      logResult("getUserWorkload (leadershipTeam)", "fail", validation.error);
      return;
    }
    
    logResult(
      "getUserWorkload (leadershipTeam)",
      "pass",
      `Retrieved workload for ${data.summary.totalUsers} leadership team members with ${data.summary.totalItems} total items`
    );
    
    console.log(`   Leadership team users: ${data.summary.totalUsers}`);
    console.log(`   Total items: ${data.summary.totalItems}`);
    
    return data;
  } catch (error) {
    logResult("getUserWorkload (leadershipTeam)", "fail", "", error);
    return null;
  }
}

/**
 * Test 4: With specific userId
 */
async function testWithUserId() {
  try {
    console.log("\n=== Test 4: With specific userId ===");
    
    // First get a user ID
    const usersResult = await tools.getUsers({ first: 1 });
    const usersData = parseResult(usersResult);
    
    if (!usersData.results || usersData.results.length === 0) {
      logResult("getUserWorkload (with userId)", "fail", "No users available for testing");
      return;
    }
    
    const userId = usersData.results[0].id;
    console.log(`   Using user ID: ${userId} (${usersData.results[0].name})`);
    
    const result = await tools.getUserWorkload({ userId });
    const data = parseResult(result);
    
    // Check if it's an error message
    if (typeof data === 'string' && data.includes('Error')) {
      logResult("getUserWorkload (with userId)", "fail", data);
      return;
    }
    
    const validation = validateWorkloadData(data);
    if (!validation.valid) {
      logResult("getUserWorkload (with userId)", "fail", validation.error);
      return;
    }
    
    // When filtered by userId, should return data for that single user
    if (data.summary.totalUsers > 1) {
      logResult("getUserWorkload (with userId)", "fail", `Expected 1 user, got ${data.summary.totalUsers}`);
      return;
    }
    
    logResult(
      "getUserWorkload (with userId)",
      "pass",
      `Retrieved workload for user with ${data.summary.totalItems} total items`
    );
    
    if (data.userWorkload.length > 0) {
      const user = data.userWorkload[0];
      console.log(`   User: ${user.userName} (${user.email})`);
      console.log(`   Rocks: ${user.rocksCount}, Issues: ${user.issuesCount}, Todos: ${user.todosCount}`);
    }
    
    return data;
  } catch (error) {
    logResult("getUserWorkload (with userId)", "fail", "", error);
    return null;
  }
}

/**
 * Test 5: With currentUser flag (OAuth mode simulation)
 */
async function testWithCurrentUser() {
  try {
    console.log("\n=== Test 5: With currentUser flag ===");
    
    // Note: This test requires OAuth authentication to work properly
    // In API key mode, it should return an error about requiring OAuth
    const result = await tools.getUserWorkload({ currentUser: true });
    const data = parseResult(result);
    
    // Check if it's an error message about OAuth requirement (expected in API key mode)
    if (typeof data === 'string') {
      if (data.includes('requires OAuth authentication')) {
        logResult("getUserWorkload (currentUser)", "pass", "Correctly requires OAuth authentication (API key mode detected)");
        return null;
      } else if (data.includes('Error')) {
        logResult("getUserWorkload (currentUser)", "fail", data);
        return null;
      }
    }
    
    // If we got data (OAuth mode), validate it
    const validation = validateWorkloadData(data);
    if (!validation.valid) {
      logResult("getUserWorkload (currentUser)", "fail", validation.error);
      return;
    }
    
    // CRITICAL: When using currentUser=true, should return data for ONLY ONE user
    if (data.summary.totalUsers !== 1) {
      logResult(
        "getUserWorkload (currentUser)", 
        "fail", 
        `Expected exactly 1 user (current user), got ${data.summary.totalUsers} users. This indicates the bug where all users were returned.`
      );
      console.log(`   ⚠️  BUG DETECTED: currentUser=true returned ${data.summary.totalUsers} users instead of 1`);
      if (data.userWorkload.length > 0) {
        console.log(`   Users returned: ${data.userWorkload.map(u => u.userName).join(', ')}`);
      }
      return;
    }
    
    logResult(
      "getUserWorkload (currentUser)",
      "pass",
      `Retrieved workload for current user with ${data.summary.totalItems} total items`
    );
    
    if (data.userWorkload.length > 0) {
      const user = data.userWorkload[0];
      console.log(`   Current user: ${user.userName} (${user.email})`);
      console.log(`   Rocks: ${user.rocksCount}, Issues: ${user.issuesCount}, Todos: ${user.todosCount}`);
    }
    
    return data;
  } catch (error) {
    logResult("getUserWorkload (currentUser)", "fail", "", error);
    return null;
  }
}

/**
 * Test 6: Combined teamId and userId
 */
async function testCombinedTeamAndUser() {
  try {
    console.log("\n=== Test 6: Combined teamId and userId ===");
    
    // First get a team ID and user ID
    const teamsResult = await tools.getTeams({ first: 1 });
    const teamsData = parseResult(teamsResult);
    
    if (!teamsData.results || teamsData.results.length === 0) {
      logResult("getUserWorkload (combined)", "fail", "No teams available for testing");
      return;
    }
    
    const teamId = teamsData.results[0].id;
    
    const usersResult = await tools.getUsers({ teamId, first: 1 });
    const usersData = parseResult(usersResult);
    
    if (!usersData.results || usersData.results.length === 0) {
      logResult("getUserWorkload (combined)", "pass", "No users in team (expected edge case)");
      return;
    }
    
    const userId = usersData.results[0].id;
    console.log(`   Using team ID: ${teamId} and user ID: ${userId}`);
    
    const result = await tools.getUserWorkload({ teamId, userId });
    const data = parseResult(result);
    
    // Check if it's an error message
    if (typeof data === 'string' && data.includes('Error')) {
      logResult("getUserWorkload (combined)", "fail", data);
      return;
    }
    
    const validation = validateWorkloadData(data);
    if (!validation.valid) {
      logResult("getUserWorkload (combined)", "fail", validation.error);
      return;
    }
    
    logResult(
      "getUserWorkload (combined)",
      "pass",
      `Retrieved workload for specific user in team with ${data.summary.totalItems} total items`
    );
    
    console.log(`   Total users: ${data.summary.totalUsers}`);
    console.log(`   Total items: ${data.summary.totalItems}`);
    
    return data;
  } catch (error) {
    logResult("getUserWorkload (combined)", "fail", "", error);
    return null;
  }
}

/**
 * Test 7: Verify workload counts are accurate
 */
async function testWorkloadAccuracy(basicData) {
  if (!basicData) {
    logResult("getUserWorkload (accuracy)", "skip", "Skipped due to basic test failure");
    return;
  }
  
  try {
    console.log("\n=== Test 7: Verify workload accuracy ===");
    
    // Verify that totalItems equals sum of all items
    let calculatedTotal = 0;
    for (const user of basicData.userWorkload) {
      calculatedTotal += user.totalItems;
      
      // Verify that user's totalItems equals sum of their rocks/issues/todos
      const userTotal = user.rocksCount + user.issuesCount + user.todosCount;
      if (user.totalItems !== userTotal) {
        logResult(
          "getUserWorkload (accuracy)",
          "fail",
          `User ${user.userName} totalItems mismatch: ${user.totalItems} != ${userTotal}`
        );
        return;
      }
    }
    
    if (calculatedTotal !== basicData.summary.totalItems) {
      logResult(
        "getUserWorkload (accuracy)",
        "fail",
        `Total items mismatch: ${basicData.summary.totalItems} != ${calculatedTotal}`
      );
      return;
    }
    
    // Verify overloaded users calculation
    const avgItems = basicData.summary.avgItemsPerUser;
    const overloadThreshold = avgItems * 1.5;
    const calculatedOverloaded = basicData.userWorkload.filter(u => u.totalItems > overloadThreshold).length;
    
    if (calculatedOverloaded !== basicData.summary.overloadedUsersCount) {
      logResult(
        "getUserWorkload (accuracy)",
        "fail",
        `Overloaded count mismatch: ${basicData.summary.overloadedUsersCount} != ${calculatedOverloaded}`
      );
      return;
    }
    
    logResult(
      "getUserWorkload (accuracy)",
      "pass",
      "All workload calculations are accurate"
    );
  } catch (error) {
    logResult("getUserWorkload (accuracy)", "fail", "", error);
  }
}

/**
 * Print summary
 */
function printSummary() {
  console.log("\n" + "=".repeat(60));
  console.log("TEST SUMMARY");
  console.log("=".repeat(60));
  console.log(`Total tests: ${stats.total}`);
  console.log(`✅ Passed: ${stats.passed}`);
  console.log(`❌ Failed: ${stats.failed}`);
  console.log(`Success rate: ${((stats.passed / stats.total) * 100).toFixed(1)}%`);
  console.log("=".repeat(60));
  
  if (stats.failed > 0) {
    console.log("\nFailed tests:");
    stats.results
      .filter(r => r.status === "fail")
      .forEach(r => {
        console.log(`  ❌ ${r.test}: ${r.message}`);
        if (r.error) {
          console.log(`     Error: ${r.error}`);
        }
      });
  }
  
  process.exit(stats.failed > 0 ? 1 : 0);
}

/**
 * Run all tests
 */
async function runAllTests() {
  console.log("=".repeat(60));
  console.log("getUserWorkload Tool - Comprehensive Test Suite");
  console.log("=".repeat(60));
  
  // Run tests
  const basicData = await testBasicUsage();
  await testWithTeamId();
  await testWithLeadershipTeam();
  await testWithUserId();
  await testWithCurrentUser();
  await testCombinedTeamAndUser();
  await testWorkloadAccuracy(basicData);
  
  // Print summary
  printSummary();
}

// Run the tests
runAllTests().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});

