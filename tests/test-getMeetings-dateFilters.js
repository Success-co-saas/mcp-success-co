#!/usr/bin/env node

/**
 * Test Script for getMeetings Date Filters
 * 
 * Tests the getMeetings tool with various date filter combinations to ensure
 * the GraphQL query is properly constructed without duplicate field names.
 * 
 * This test specifically addresses the bug where using both dateAfter and
 * dateBefore caused a GraphQL error: "There can be only one input field named 'date'."
 * 
 * Usage:
 *   node tests/test-getMeetings-dateFilters.js
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
  
  stats.results.push(result);
  
  if (status === "pass") {
    stats.passed++;
    console.log(`${emoji} ${testName}: ${message}`);
  } else {
    stats.failed++;
    console.log(`${emoji} ${testName}: ${message}`);
    if (error) {
      console.log(`   Error: ${error.message}`);
      if (error.stack) {
        console.log(`   Stack: ${error.stack.split('\n').slice(0, 3).join('\n')}`);
      }
    }
  }
}

/**
 * Run test with error handling
 */
async function runTest(testName, testFn) {
  try {
    await testFn();
  } catch (error) {
    logResult(testName, "fail", "Test threw an error", error);
  }
}

/**
 * Main test suite
 */
async function runTests() {
  console.log("🧪 Testing getMeetings Date Filters\n");
  console.log("=" .repeat(60));
  
  // Test 1: getMeetings with dateAfter only
  await runTest("getMeetings with dateAfter only", async () => {
    const result = await tools.getMeetings({
      leadershipTeam: true,
      dateAfter: "2025-11-03",
      first: 5,
    });
    
    if (!result || !result.content || result.content.length === 0) {
      throw new Error("No content returned");
    }
    
    const text = result.content[0].text;
    
    // Check for error message in response
    if (text.includes("HTTP error") || text.includes("There can be only one input field")) {
      throw new Error(`GraphQL error in response: ${text}`);
    }
    
    // Parse the result
    const data = JSON.parse(text);
    
    if (data.totalCount === undefined) {
      throw new Error("Response missing totalCount");
    }
    
    logResult(
      "getMeetings with dateAfter only",
      "pass",
      `Retrieved ${data.totalCount} meetings with dateAfter filter`
    );
  });

  // Test 2: getMeetings with dateBefore only
  await runTest("getMeetings with dateBefore only", async () => {
    const result = await tools.getMeetings({
      leadershipTeam: true,
      dateBefore: "2025-11-09",
      first: 5,
    });
    
    if (!result || !result.content || result.content.length === 0) {
      throw new Error("No content returned");
    }
    
    const text = result.content[0].text;
    
    // Check for error message in response
    if (text.includes("HTTP error") || text.includes("There can be only one input field")) {
      throw new Error(`GraphQL error in response: ${text}`);
    }
    
    // Parse the result
    const data = JSON.parse(text);
    
    if (data.totalCount === undefined) {
      throw new Error("Response missing totalCount");
    }
    
    logResult(
      "getMeetings with dateBefore only",
      "pass",
      `Retrieved ${data.totalCount} meetings with dateBefore filter`
    );
  });

  // Test 3: getMeetings with both dateAfter AND dateBefore (the bug scenario)
  await runTest("getMeetings with both dateAfter AND dateBefore", async () => {
    const result = await tools.getMeetings({
      leadershipTeam: true,
      dateAfter: "2025-11-03",
      dateBefore: "2025-11-09",
      first: 5,
    });
    
    if (!result || !result.content || result.content.length === 0) {
      throw new Error("No content returned");
    }
    
    const text = result.content[0].text;
    
    // Check for error message in response - this was the original bug
    if (text.includes("HTTP error") || text.includes("There can be only one input field")) {
      throw new Error(`GraphQL error in response (BUG NOT FIXED): ${text}`);
    }
    
    // Parse the result
    const data = JSON.parse(text);
    
    if (data.totalCount === undefined) {
      throw new Error("Response missing totalCount");
    }
    
    logResult(
      "getMeetings with both dateAfter AND dateBefore",
      "pass",
      `✨ Retrieved ${data.totalCount} meetings with date range filter (BUG FIXED!)`
    );
  });

  // Test 4: getMeetings with date range that spans a week
  await runTest("getMeetings with specific date range", async () => {
    const result = await tools.getMeetings({
      leadershipTeam: true,
      dateAfter: "2025-01-01",
      dateBefore: "2025-12-31",
      first: 10,
    });
    
    if (!result || !result.content || result.content.length === 0) {
      throw new Error("No content returned");
    }
    
    const text = result.content[0].text;
    
    // Check for error message in response
    if (text.includes("HTTP error") || text.includes("There can be only one input field")) {
      throw new Error(`GraphQL error in response: ${text}`);
    }
    
    // Parse the result
    const data = JSON.parse(text);
    
    if (data.totalCount === undefined) {
      throw new Error("Response missing totalCount");
    }
    
    // Verify that meetings are within the date range
    if (data.results && data.results.length > 0) {
      for (const meeting of data.results) {
        const meetingDate = new Date(meeting.date);
        const afterDate = new Date("2025-01-01");
        const beforeDate = new Date("2025-12-31");
        
        if (meetingDate < afterDate || meetingDate > beforeDate) {
          throw new Error(
            `Meeting date ${meeting.date} is outside the requested range (2025-01-01 to 2025-12-31)`
          );
        }
      }
      
      logResult(
        "getMeetings with specific date range",
        "pass",
        `Retrieved ${data.totalCount} meetings, all within date range 2025-01-01 to 2025-12-31`
      );
    } else {
      logResult(
        "getMeetings with specific date range",
        "pass",
        `Retrieved ${data.totalCount} meetings (no results to verify dates)`
      );
    }
  });

  // Test 5: getMeetings with no date filters (control test)
  await runTest("getMeetings with no date filters", async () => {
    const result = await tools.getMeetings({
      leadershipTeam: true,
      first: 5,
    });
    
    if (!result || !result.content || result.content.length === 0) {
      throw new Error("No content returned");
    }
    
    const text = result.content[0].text;
    
    // Check for error message in response
    if (text.includes("HTTP error")) {
      throw new Error(`GraphQL error in response: ${text}`);
    }
    
    // Parse the result
    const data = JSON.parse(text);
    
    if (data.totalCount === undefined) {
      throw new Error("Response missing totalCount");
    }
    
    logResult(
      "getMeetings with no date filters",
      "pass",
      `Retrieved ${data.totalCount} meetings without date filtering`
    );
  });

  // Print summary
  console.log("\n" + "=".repeat(60));
  console.log("📊 Test Summary");
  console.log("=".repeat(60));
  console.log(`Total Tests: ${stats.total}`);
  console.log(`✅ Passed: ${stats.passed}`);
  console.log(`❌ Failed: ${stats.failed}`);
  console.log(`Success Rate: ${((stats.passed / stats.total) * 100).toFixed(1)}%`);
  
  if (stats.failed > 0) {
    console.log("\n❌ Failed Tests:");
    stats.results
      .filter((r) => r.status === "fail")
      .forEach((r) => {
        console.log(`  - ${r.test}: ${r.message}`);
        if (r.error) console.log(`    Error: ${r.error}`);
      });
  }
  
  console.log("\n" + "=".repeat(60));
  
  // Exit with appropriate code
  process.exit(stats.failed > 0 ? 1 : 0);
}

// Run the tests
runTests().catch((error) => {
  console.error("Fatal error running tests:", error);
  process.exit(1);
});

