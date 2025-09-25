#!/usr/bin/env node

/**
 * Test script for Level 10 meeting analysis functionality
 * This demonstrates how to use the new analytical tools for EOS Level 10 meetings
 */

import { analyzeEOSData } from "./tools.js";

async function testLevel10Analysis() {
  console.log("Testing Level 10 Meeting Analysis...\n");

  // Test 1: Level 10 meeting issues analysis
  console.log("1. Testing Level 10 meeting issues analysis:");
  try {
    const level10Result = await analyzeEOSData({
      query:
        "What are the top 5 open Issues for this week's Level 10 meeting and their owners?",
      timeframe: "week",
    });
    console.log(
      "Level 10 meeting issues result:",
      JSON.stringify(level10Result, null, 2)
    );
  } catch (error) {
    console.error("Error testing Level 10 meeting issues:", error.message);
  }

  console.log("\n" + "=".repeat(50) + "\n");

  // Test 2: General meeting analysis
  console.log("2. Testing general meeting analysis:");
  try {
    const meetingResult = await analyzeEOSData({
      query:
        "Show me all meetings scheduled for this week and their facilitators",
      timeframe: "week",
    });
    console.log(
      "Meeting analysis result:",
      JSON.stringify(meetingResult, null, 2)
    );
  } catch (error) {
    console.error("Error testing meeting analysis:", error.message);
  }

  console.log("\n" + "=".repeat(50) + "\n");

  // Test 3: Issue analysis
  console.log("3. Testing issue analysis:");
  try {
    const issueResult = await analyzeEOSData({
      query: "What are the highest priority issues that need attention?",
      timeframe: "month",
    });
    console.log("Issue analysis result:", JSON.stringify(issueResult, null, 2));
  } catch (error) {
    console.error("Error testing issue analysis:", error.message);
  }

  console.log("\n" + "=".repeat(50) + "\n");

  // Test 4: Level 10 meeting with team filter
  console.log("4. Testing Level 10 meeting with team filter:");
  try {
    const teamLevel10Result = await analyzeEOSData({
      query: "Show me Level 10 meeting issues for the leadership team",
      timeframe: "quarter",
    });
    console.log(
      "Team-filtered Level 10 result:",
      JSON.stringify(teamLevel10Result, null, 2)
    );
  } catch (error) {
    console.error("Error testing team-filtered Level 10:", error.message);
  }

  console.log("\n" + "=".repeat(50) + "\n");

  // Test 5: Meeting agenda analysis
  console.log("5. Testing meeting agenda analysis:");
  try {
    const agendaResult = await analyzeEOSData({
      query: "What meeting agendas do we have and who are the facilitators?",
      timeframe: "month",
    });
    console.log(
      "Meeting agenda result:",
      JSON.stringify(agendaResult, null, 2)
    );
  } catch (error) {
    console.error("Error testing meeting agenda analysis:", error.message);
  }
}

// Run the test
testLevel10Analysis().catch(console.error);

