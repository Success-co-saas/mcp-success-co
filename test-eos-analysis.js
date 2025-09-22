#!/usr/bin/env node

/**
 * Test script for EOS data analysis functionality
 * This demonstrates how to use the new analytical tools
 */

import { analyzeEOSData } from "./tools.js";

async function testEOSAnalysis() {
  console.log("Testing EOS Data Analysis...\n");

  // Test 1: At-risk rocks analysis
  console.log("1. Testing at-risk rocks analysis:");
  try {
    const atRiskResult = await analyzeEOSData({
      query:
        "Which company Rocks are at risk of missing their due dates this quarter, and who owns them?",
      timeframe: "quarter",
    });
    console.log("At-risk rocks result:", JSON.stringify(atRiskResult, null, 2));
  } catch (error) {
    console.error("Error testing at-risk rocks:", error.message);
  }

  console.log("\n" + "=".repeat(50) + "\n");

  // Test 2: Overdue items analysis
  console.log("2. Testing overdue items analysis:");
  try {
    const overdueResult = await analyzeEOSData({
      query: "Show me all overdue rocks and who owns them",
      timeframe: "month",
    });
    console.log(
      "Overdue items result:",
      JSON.stringify(overdueResult, null, 2)
    );
  } catch (error) {
    console.error("Error testing overdue items:", error.message);
  }

  console.log("\n" + "=".repeat(50) + "\n");

  // Test 3: Rock progress analysis
  console.log("3. Testing rock progress analysis:");
  try {
    const progressResult = await analyzeEOSData({
      query: "What is the current progress status of all rocks?",
      timeframe: "quarter",
    });
    console.log(
      "Rock progress result:",
      JSON.stringify(progressResult, null, 2)
    );
  } catch (error) {
    console.error("Error testing rock progress:", error.message);
  }

  console.log("\n" + "=".repeat(50) + "\n");

  // Test 4: Team performance analysis
  console.log("4. Testing team performance analysis:");
  try {
    const teamResult = await analyzeEOSData({
      query: "How are teams performing with their rocks?",
      timeframe: "quarter",
    });
    console.log(
      "Team performance result:",
      JSON.stringify(teamResult, null, 2)
    );
  } catch (error) {
    console.error("Error testing team performance:", error.message);
  }

  console.log("\n" + "=".repeat(50) + "\n");

  // Test 5: General help
  console.log("5. Testing general help:");
  try {
    const helpResult = await analyzeEOSData({
      query: "What can you analyze?",
    });
    console.log("Help result:", JSON.stringify(helpResult, null, 2));
  } catch (error) {
    console.error("Error testing help:", error.message);
  }
}

// Run the test
testEOSAnalysis().catch(console.error);
