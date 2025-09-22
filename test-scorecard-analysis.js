#!/usr/bin/env node

/**
 * Test script for Scorecard metrics analysis functionality
 * This demonstrates how to use the new Scorecard analytical tools
 */

import {
  analyzeScorecardMetrics,
  getDataFields,
  getDataValues,
  getTeamsOnDataFields,
  getDataFieldStatuses,
} from "./tools.js";

async function testScorecardAnalysis() {
  console.log("Testing Scorecard Metrics Analysis...\n");

  // Test 1: Basic Scorecard metrics analysis
  console.log("1. Testing basic Scorecard metrics analysis:");
  try {
    const scorecardResult = await analyzeScorecardMetrics({
      query:
        "Give me the last 12 weeks of Scorecard metrics for my team and flag any KPI below target",
      weeks: 12,
    });
    console.log(
      "Scorecard metrics result:",
      JSON.stringify(scorecardResult, null, 2)
    );
  } catch (error) {
    console.error("Error testing scorecard metrics:", error.message);
  }

  console.log("\n" + "=".repeat(50) + "\n");

  // Test 2: KPI below target analysis
  console.log("2. Testing KPI below target analysis:");
  try {
    const belowTargetResult = await analyzeScorecardMetrics({
      query: "Which KPIs are below target?",
      weeks: 8,
    });
    console.log(
      "Below target KPIs result:",
      JSON.stringify(belowTargetResult, null, 2)
    );
  } catch (error) {
    console.error("Error testing below target KPIs:", error.message);
  }

  console.log("\n" + "=".repeat(50) + "\n");

  // Test 3: KPI trends analysis
  console.log("3. Testing KPI trends analysis:");
  try {
    const trendsResult = await analyzeScorecardMetrics({
      query: "Show me KPI trends and performance over the last quarter",
      timeframe: "quarter",
      weeks: 13,
    });
    console.log("KPI trends result:", JSON.stringify(trendsResult, null, 2));
  } catch (error) {
    console.error("Error testing KPI trends:", error.message);
  }

  console.log("\n" + "=".repeat(50) + "\n");

  // Test 4: Data Fields (KPIs) listing
  console.log("4. Testing Data Fields (KPIs) listing:");
  try {
    const dataFieldsResult = await getDataFields({
      first: 10,
      stateId: "ACTIVE",
    });
    console.log(
      "Data Fields result:",
      JSON.stringify(dataFieldsResult, null, 2)
    );
  } catch (error) {
    console.error("Error testing data fields:", error.message);
  }

  console.log("\n" + "=".repeat(50) + "\n");

  // Test 5: Data Values (metrics) listing
  console.log("5. Testing Data Values (metrics) listing:");
  try {
    const dataValuesResult = await getDataValues({
      first: 20,
      stateId: "ACTIVE",
    });
    console.log(
      "Data Values result:",
      JSON.stringify(dataValuesResult, null, 2)
    );
  } catch (error) {
    console.error("Error testing data values:", error.message);
  }

  console.log("\n" + "=".repeat(50) + "\n");

  // Test 6: Teams on Data Fields relationships
  console.log("6. Testing Teams on Data Fields relationships:");
  try {
    const teamsOnDataFieldsResult = await getTeamsOnDataFields({
      first: 10,
      stateId: "ACTIVE",
    });
    console.log(
      "Teams on Data Fields result:",
      JSON.stringify(teamsOnDataFieldsResult, null, 2)
    );
  } catch (error) {
    console.error("Error testing teams on data fields:", error.message);
  }

  console.log("\n" + "=".repeat(50) + "\n");

  // Test 7: Data Field Statuses
  console.log("7. Testing Data Field Statuses:");
  try {
    const dataFieldStatusesResult = await getDataFieldStatuses({
      first: 10,
      stateId: "ACTIVE",
    });
    console.log(
      "Data Field Statuses result:",
      JSON.stringify(dataFieldStatusesResult, null, 2)
    );
  } catch (error) {
    console.error("Error testing data field statuses:", error.message);
  }

  console.log("\n" + "=".repeat(50) + "\n");

  // Test 8: Team-specific Scorecard analysis
  console.log("8. Testing team-specific Scorecard analysis:");
  try {
    const teamScorecardResult = await analyzeScorecardMetrics({
      query:
        "Show me the Scorecard performance for my team over the last month",
      timeframe: "month",
      weeks: 4,
    });
    console.log(
      "Team Scorecard result:",
      JSON.stringify(teamScorecardResult, null, 2)
    );
  } catch (error) {
    console.error("Error testing team scorecard:", error.message);
  }

  console.log("\n" + "=".repeat(50) + "\n");

  // Test 9: General help
  console.log("9. Testing general help:");
  try {
    const helpResult = await analyzeScorecardMetrics({
      query: "What can you analyze about Scorecard metrics?",
    });
    console.log("Help result:", JSON.stringify(helpResult, null, 2));
  } catch (error) {
    console.error("Error testing help:", error.message);
  }
}

// Run the test
testScorecardAnalysis().catch(console.error);
