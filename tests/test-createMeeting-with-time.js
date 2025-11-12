#!/usr/bin/env node

/**
 * Test: Create Meeting with Time (Timezone Support)
 * 
 * Quick test for createMeeting with time parameter.
 * For comprehensive tests of both create and update, use:
 *   node tests/test-meeting-time-comprehensive.js
 * 
 * Usage:
 *   node tests/test-createMeeting-with-time.js
 */

import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { init, createMeeting } from "../tools.js";

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

console.log("\n🧪 Testing createMeeting with timezone support...\n");

// Get tomorrow's date
const tomorrow = new Date();
tomorrow.setDate(tomorrow.getDate() + 1);
const tomorrowDate = tomorrow.toISOString().split('T')[0];

console.log(`📅 Test date: ${tomorrowDate}`);
console.log(`⏰ Test time: 14:30 (user's timezone)\n`);

async function runTest() {
  try {
    // Test 1: Create meeting WITHOUT time (backward compatibility)
    console.log("Test 1: Creating meeting WITHOUT time parameter...");
    const result1 = await createMeeting({
      date: tomorrowDate,
      leadershipTeam: true,
      meetingAgendaType: "WEEKLY-L10",
    });

    const response1 = JSON.parse(result1.content[0].text);
    
    if (response1.success) {
      console.log("✅ PASS: Meeting created without time");
      console.log(`   Meeting ID: ${response1.meeting.id}`);
      console.log(`   Date: ${response1.meeting.date}`);
      console.log(`   Start Time: ${response1.meeting.startTime || 'null (as expected)'}`);
    } else {
      console.log("❌ FAIL: Failed to create meeting without time");
      console.log(`   Error: ${JSON.stringify(response1, null, 2)}`);
    }

    console.log("\n" + "=".repeat(60) + "\n");

    // Test 2: Create meeting WITH time
    console.log("Test 2: Creating meeting WITH time parameter (14:30)...");
    const result2 = await createMeeting({
      date: tomorrowDate,
      time: "14:30",
      leadershipTeam: true,
      meetingAgendaType: "WEEKLY-L10",
    });

    const response2 = JSON.parse(result2.content[0].text);
    
    if (response2.success) {
      console.log("✅ PASS: Meeting created with time");
      console.log(`   Meeting ID: ${response2.meeting.id}`);
      console.log(`   Date: ${response2.meeting.date}`);
      console.log(`   Start Time: ${response2.meeting.startTime}`);
      console.log(`   URL: ${response2.meeting.url}`);
      
      if (response2.meeting.startTime) {
        const startTimeDate = new Date(response2.meeting.startTime);
        console.log(`   Parsed Start Time: ${startTimeDate.toISOString()}`);
        console.log(`   ✅ Start time was set successfully!`);
      } else {
        console.log(`   ⚠️ Warning: Start time is null`);
      }
    } else {
      console.log("❌ FAIL: Failed to create meeting with time");
      console.log(`   Error: ${JSON.stringify(response2, null, 2)}`);
    }

    console.log("\n" + "=".repeat(60) + "\n");

    // Test 3: Invalid time format
    console.log("Test 3: Testing invalid time format (should fail gracefully)...");
    try {
      const result3 = await createMeeting({
        date: tomorrowDate,
        time: "25:99", // Invalid time
        leadershipTeam: true,
        meetingAgendaType: "WEEKLY-L10",
      });

      const response3 = result3.content[0].text;
      
      if (response3.includes("Invalid time format") || response3.includes("Error")) {
        console.log("✅ PASS: Invalid time format rejected correctly");
        console.log(`   Message: ${response3}`);
      } else {
        console.log("❌ FAIL: Invalid time should have been rejected");
        console.log(`   Response: ${response3}`);
      }
    } catch (error) {
      console.log("✅ PASS: Invalid time format rejected with error");
      console.log(`   Error: ${error.message}`);
    }

    console.log("\n" + "=".repeat(60) + "\n");

    // Test 4: Different time format
    console.log("Test 4: Testing different time (09:00)...");
    const result4 = await createMeeting({
      date: tomorrowDate,
      time: "09:00",
      leadershipTeam: true,
      meetingAgendaType: "WEEKLY-L10",
    });

    const response4 = JSON.parse(result4.content[0].text);
    
    if (response4.success && response4.meeting.startTime) {
      console.log("✅ PASS: Meeting created with 09:00 time");
      console.log(`   Meeting ID: ${response4.meeting.id}`);
      console.log(`   Start Time: ${response4.meeting.startTime}`);
    } else {
      console.log("❌ FAIL: Failed to create meeting with 09:00 time");
      console.log(`   Response: ${JSON.stringify(response4, null, 2)}`);
    }

    console.log("\n" + "=".repeat(60) + "\n");
    console.log("✨ Test suite completed!\n");

  } catch (error) {
    console.error("\n❌ Test failed with error:");
    console.error(error);
    console.error("\nStack trace:");
    console.error(error.stack);
    process.exit(1);
  }
}

// Check for required environment variables
if (!process.env.DEVMODE_SUCCESS_API_KEY) {
  console.error("❌ Error: DEVMODE_SUCCESS_API_KEY not set in .env file");
  process.exit(1);
}

if (process.env.DEVMODE_SUCCESS_USE_API_KEY !== "true") {
  console.error("❌ Error: DEVMODE_SUCCESS_USE_API_KEY must be set to 'true' in .env file");
  console.error("   This is required for testing with API keys.");
  process.exit(1);
}

if (!process.env.GRAPHQL_ENDPOINT) {
  console.error("❌ Error: GRAPHQL_ENDPOINT not set in .env file");
  process.exit(1);
}

// Run the test
runTest();

