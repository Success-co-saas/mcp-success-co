#!/usr/bin/env node

/**
 * Test the EXACT scenario reported by the user that was failing
 * 
 * Original failing parameters:
 * {
 *   fromMeetings: true,
 *   status: 'ALL',
 *   createdAfter: '2025-11-10T00:00:00Z',
 *   createdBefore: '2025-11-16T23:59:59Z',
 *   first: 200
 * }
 * 
 * Error was:
 * "HTTP error! status: 400, details: There can be only one input field named "createdAt"."
 */

import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { getTodos, init } from "../tools.js";

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

async function testOriginalBugScenario() {
  console.log("=== Testing EXACT Original Bug Scenario ===\n");
  console.log("Original parameters that were failing:");
  console.log(JSON.stringify({
    fromMeetings: true,
    status: 'ALL',
    createdAfter: '2025-11-10T00:00:00Z',
    createdBefore: '2025-11-16T23:59:59Z',
    first: 200
  }, null, 2));
  console.log("\n");

  console.log("Previous error:");
  console.log("  'HTTP error! status: 400, details: There can be only one input field named \"createdAt\".'");
  console.log("\n");

  console.log("Testing now with fix...\n");

  try {
    const result = await getTodos({
      fromMeetings: true,
      status: 'ALL',
      createdAfter: '2025-11-10T00:00:00Z',
      createdBefore: '2025-11-16T23:59:59Z',
      first: 200
    });

    const data = JSON.parse(result.content[0].text);
    
    console.log("✅ SUCCESS! The bug is fixed!");
    console.log("\nResults:");
    console.log(`  Total todos from meetings: ${data.summary.totalCount}`);
    console.log(`  Status breakdown:`);
    console.log(`    - TODO: ${data.summary.todoCount}`);
    console.log(`    - COMPLETE: ${data.summary.completeCount}`);
    console.log(`    - OVERDUE: ${data.summary.overdueCount}`);
    
    if (data.results.length > 0) {
      console.log(`\nSample results (first 3):`);
      data.results.slice(0, 3).forEach((todo, idx) => {
        console.log(`  ${idx + 1}. ${todo.name}`);
        console.log(`     - Status: ${todo.status}`);
        console.log(`     - Created: ${todo.createdAt}`);
        console.log(`     - Meeting ID: ${todo.meetingId}`);
      });
    } else {
      console.log(`\nNo todos found matching these criteria (but query executed successfully!)`);
    }

    console.log("\n=== TEST PASSED ===");
    process.exit(0);

  } catch (error) {
    console.log("❌ FAILED!");
    console.log("Error:", error.message);
    if (error.message.includes("There can be only one input field named")) {
      console.log("\n⚠️  The original bug still exists!");
    }
    console.log("\n=== TEST FAILED ===");
    process.exit(1);
  }
}

testOriginalBugScenario().catch((error) => {
  console.error("❌ Test crashed:", error);
  process.exit(1);
});

