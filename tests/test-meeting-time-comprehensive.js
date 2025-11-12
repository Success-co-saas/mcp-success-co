#!/usr/bin/env node

/**
 * Comprehensive Test: Create and Update Meetings with Time (Timezone Support)
 * 
 * Tests both createMeeting and updateMeeting tools with the time parameter
 * to ensure timezone-aware meeting creation and updates work correctly.
 * 
 * Usage:
 *   node tests/test-meeting-time-comprehensive.js
 */

import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { init, createMeeting, updateMeeting, getDatabase, getUserContext } from "../tools.js";

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

console.log("\n🧪 Comprehensive Meeting Time Tests\n");
console.log("=" .repeat(60));

// Get tomorrow's date
const tomorrow = new Date();
tomorrow.setDate(tomorrow.getDate() + 1);
const tomorrowDate = tomorrow.toISOString().split('T')[0];

// Get day after tomorrow
const dayAfter = new Date();
dayAfter.setDate(dayAfter.getDate() + 2);
const dayAfterDate = dayAfter.toISOString().split('T')[0];

let testResults = {
  passed: 0,
  failed: 0,
  total: 0,
};

function logTest(name, passed, details = "") {
  testResults.total++;
  if (passed) {
    testResults.passed++;
    console.log(`✅ ${name}`);
    if (details) console.log(`   ${details}`);
  } else {
    testResults.failed++;
    console.log(`❌ ${name}`);
    if (details) console.log(`   ${details}`);
  }
}

async function verifyMeetingInDB(meetingId, expectedTime) {
  try {
    const context = await getUserContext();
    const db = getDatabase();
    
    const meetings = await db`
      SELECT 
        id,
        date,
        start_time,
        EXTRACT(HOUR FROM date) as date_hour,
        EXTRACT(MINUTE FROM date) as date_minute
      FROM meetings
      WHERE id = ${meetingId}
    `;
    
    if (meetings.length === 0) {
      return { success: false, message: "Meeting not found in DB" };
    }
    
    const meeting = meetings[0];
    const timeStr = `${String(meeting.date_hour).padStart(2, '0')}:${String(meeting.date_minute).padStart(2, '0')}`;
    
    return {
      success: timeStr === expectedTime,
      timeStr,
      message: `DB shows ${timeStr}, expected ${expectedTime}`,
    };
  } catch (error) {
    return { success: false, message: error.message };
  }
}

async function runTests() {
  let createdMeetingId = null;
  
  try {
    console.log("\n📝 Part 1: CREATE MEETING TESTS\n");
    
    // Test 1: Create meeting WITHOUT time (backward compatibility)
    console.log("Test 1: Create meeting WITHOUT time parameter...");
    const result1 = await createMeeting({
      date: tomorrowDate,
      leadershipTeam: true,
      meetingAgendaType: "WEEKLY-L10",
    });

    const response1 = JSON.parse(result1.content[0].text);
    logTest(
      "Create meeting without time",
      response1.success && !response1.meeting.startTime,
      response1.success ? `Meeting ID: ${response1.meeting.id}` : "Failed to create"
    );

    console.log("\n" + "-".repeat(60) + "\n");

    // Test 2: Create meeting WITH time (14:30)
    console.log("Test 2: Create meeting WITH time (14:30)...");
    const result2 = await createMeeting({
      date: tomorrowDate,
      time: "14:30",
      leadershipTeam: true,
      meetingAgendaType: "WEEKLY-L10",
    });

    const response2 = JSON.parse(result2.content[0].text);
    if (response2.success) {
      createdMeetingId = response2.meeting.id;
      const dateTime = new Date(response2.meeting.date);
      const startTime = new Date(response2.meeting.startTime);
      const timesMatch = dateTime.getTime() === startTime.getTime();
      
      logTest(
        "Create meeting with time (14:30)",
        response2.success && response2.meeting.startTime && timesMatch,
        `Meeting ID: ${createdMeetingId}, Times match: ${timesMatch}`
      );
      
      // Verify in database
      const dbVerify = await verifyMeetingInDB(createdMeetingId, "14:30");
      logTest(
        "Database verification (14:30)",
        dbVerify.success,
        dbVerify.message
      );
    } else {
      logTest("Create meeting with time (14:30)", false, "Failed to create");
    }

    console.log("\n" + "-".repeat(60) + "\n");

    // Test 3: Create meeting with different time (09:00)
    console.log("Test 3: Create meeting WITH time (09:00)...");
    const result3 = await createMeeting({
      date: tomorrowDate,
      time: "09:00",
      leadershipTeam: true,
      meetingAgendaType: "WEEKLY-L10",
    });

    const response3 = JSON.parse(result3.content[0].text);
    logTest(
      "Create meeting with time (09:00)",
      response3.success && response3.meeting.startTime,
      response3.success ? `Meeting ID: ${response3.meeting.id}` : "Failed"
    );

    console.log("\n" + "-".repeat(60) + "\n");

    // Test 4: Invalid time format
    console.log("Test 4: Test invalid time format (should fail)...");
    try {
      const result4 = await createMeeting({
        date: tomorrowDate,
        time: "25:99", // Invalid
        leadershipTeam: true,
        meetingAgendaType: "WEEKLY-L10",
      });

      const response4 = result4.content[0].text;
      logTest(
        "Invalid time format rejection",
        response4.includes("Invalid time format"),
        "Correctly rejected invalid time"
      );
    } catch (error) {
      logTest("Invalid time format rejection", true, "Error thrown as expected");
    }

    console.log("\n" + "=".repeat(60));
    console.log("\n📝 Part 2: UPDATE MEETING TESTS\n");

    if (!createdMeetingId) {
      console.log("⚠️ Skipping update tests - no meeting created");
      return;
    }

    // Test 5: Update meeting time only (keep same date)
    console.log("Test 5: Update meeting time to 16:00 (same date)...");
    const result5 = await updateMeeting({
      meetingId: createdMeetingId,
      time: "16:00",
    });

    const response5 = JSON.parse(result5.content[0].text);
    if (response5.success) {
      const dbVerify = await verifyMeetingInDB(createdMeetingId, "16:00");
      logTest(
        "Update time only (16:00)",
        dbVerify.success,
        dbVerify.message
      );
    } else {
      logTest("Update time only (16:00)", false, response5.message || "Failed");
    }

    console.log("\n" + "-".repeat(60) + "\n");

    // Test 6: Update both date and time
    console.log("Test 6: Update both date and time...");
    const result6 = await updateMeeting({
      meetingId: createdMeetingId,
      date: dayAfterDate,
      time: "10:30",
    });

    const response6 = JSON.parse(result6.content[0].text);
    if (response6.success) {
      const dbVerify = await verifyMeetingInDB(createdMeetingId, "10:30");
      logTest(
        "Update date and time (10:30)",
        dbVerify.success,
        dbVerify.message
      );
    } else {
      logTest("Update date and time (10:30)", false, response6.message || "Failed");
    }

    console.log("\n" + "-".repeat(60) + "\n");

    // Test 7: Update date only (time should remain)
    console.log("Test 7: Update date only (without time)...");
    const result7 = await updateMeeting({
      meetingId: createdMeetingId,
      date: tomorrowDate,
    });

    const response7 = JSON.parse(result7.content[0].text);
    logTest(
      "Update date only",
      response7.success,
      response7.success ? "Date updated successfully" : "Failed"
    );

    console.log("\n" + "-".repeat(60) + "\n");

    // Test 8: Update time back to a new time
    console.log("Test 8: Update time to 11:45...");
    const result8 = await updateMeeting({
      meetingId: createdMeetingId,
      time: "11:45",
    });

    const response8 = JSON.parse(result8.content[0].text);
    if (response8.success) {
      const dbVerify = await verifyMeetingInDB(createdMeetingId, "11:45");
      logTest(
        "Update time to 11:45",
        dbVerify.success,
        dbVerify.message
      );
    } else {
      logTest("Update time to 11:45", false, response8.message || "Failed");
    }

    console.log("\n" + "-".repeat(60) + "\n");

    // Test 9: Invalid time format in update
    console.log("Test 9: Test invalid time format in update...");
    try {
      const result9 = await updateMeeting({
        meetingId: createdMeetingId,
        time: "invalid",
      });

      const response9 = result9.content[0].text;
      logTest(
        "Invalid time format in update",
        response9.includes("Invalid time format"),
        "Correctly rejected invalid time"
      );
    } catch (error) {
      logTest("Invalid time format in update", true, "Error thrown as expected");
    }

    console.log("\n" + "=".repeat(60));
    console.log("\n📊 TEST SUMMARY\n");
    console.log(`Total Tests: ${testResults.total}`);
    console.log(`Passed: ${testResults.passed} ✅`);
    console.log(`Failed: ${testResults.failed} ❌`);
    console.log(`Success Rate: ${((testResults.passed / testResults.total) * 100).toFixed(1)}%`);
    
    if (testResults.failed === 0) {
      console.log("\n🎉 All tests passed!\n");
    } else {
      console.log("\n⚠️ Some tests failed. Review the output above.\n");
    }

  } catch (error) {
    console.error("\n❌ Test suite failed with error:");
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
  process.exit(1);
}

if (!process.env.GRAPHQL_ENDPOINT) {
  console.error("❌ Error: GRAPHQL_ENDPOINT not set in .env file");
  process.exit(1);
}

// Run the tests
runTests();

