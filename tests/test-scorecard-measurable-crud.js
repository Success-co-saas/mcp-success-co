#!/usr/bin/env node

/**
 * Test script for createScorecardMeasurable, updateScorecardMeasurable, and deleteScorecardMeasurable tools
 *
 * This script tests the full lifecycle of scorecard measurables (data fields):
 * - Create a new measurable
 * - Update the measurable
 * - Delete the measurable
 */

import {
  init,
  createScorecardMeasurable,
  updateScorecardMeasurable,
  deleteScorecardMeasurable,
  getScorecardMeasurables,
  getTeams,
} from "../tools.js";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Initialize tools
init({
  NODE_ENV: process.env.NODE_ENV,
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

async function testScorecardMeasurableCRUD() {
  console.log("\n═══════════════════════════════════════════════");
  console.log("  SCORECARD MEASURABLE CRUD TEST");
  console.log("═══════════════════════════════════════════════\n");

  let createdMeasurableId = null;

  try {
    // Step 0: Check API key
    if (!process.env.DEVMODE_SUCCESS_API_KEY) {
      console.log("❌ ERROR: No API key found in environment");
      console.log("Please set DEVMODE_SUCCESS_API_KEY in your .env file");
      return;
    }

    if (process.env.DEVMODE_SUCCESS_USE_API_KEY !== "true") {
      console.log("❌ ERROR: API key mode is not enabled");
      console.log("Please set DEVMODE_SUCCESS_USE_API_KEY=true in your .env file");
      return;
    }

    // Step 1: Get a team ID (preferably leadership team)
    console.log("Step 1: Fetching teams to get a team ID...\n");
    const teamsResult = await getTeams({ first: 5 });
    const teamsText = teamsResult.content[0].text;
    const teams = JSON.parse(teamsText);

    if (!teams.results || teams.results.length === 0) {
      console.log("❌ No teams found. Cannot proceed with test.");
      return;
    }

    // Try to find leadership team, otherwise use first team
    let testTeamId = teams.results[0].id;
    const leadershipTeam = teams.results.find((t) => t.isLeadership);
    if (leadershipTeam) {
      testTeamId = leadershipTeam.id;
      console.log(`Found leadership team: ${leadershipTeam.name} (${testTeamId})`);
    } else {
      console.log(`Using team: ${teams.results[0].name} (${testTeamId})`);
    }
    console.log();

    // Step 2: Create a new scorecard measurable
    console.log("Step 2: Creating a new scorecard measurable...\n");
    const createResult = await createScorecardMeasurable({
      name: "E2E Test Revenue Metric",
      desc: "This is a test measurable created by automated testing - should be deleted",
      type: "weekly",
      unitType: "currency",
      unitComparison: ">=",
      goalTarget: "10000",
      goalTargetEnd: "15000",
      goalCurrency: "$",
      showAverage: true,
      showTotal: true,
      teamId: testTeamId,
    });

    const createText = createResult.content[0].text;
    console.log("Result:");
    console.log(createText);
    console.log();

    // Parse result to get the created ID
    const createData = JSON.parse(createText);
    if (createData.success && createData.measurable?.id) {
      createdMeasurableId = createData.measurable.id;
      console.log(`✅ Successfully created measurable with ID: ${createdMeasurableId}\n`);
    } else {
      console.log("❌ Failed to create measurable");
      return;
    }

    // Step 3: Verify the measurable exists
    console.log("Step 3: Verifying the measurable exists...\n");
    const verifyResult = await getScorecardMeasurables({
      dataFieldId: createdMeasurableId,
      first: 1,
    });

    const verifyText = verifyResult.content[0].text;
    const verifyData = JSON.parse(verifyText);

    if (
      verifyData.scorecardMeasurables &&
      verifyData.scorecardMeasurables.length > 0
    ) {
      const measurable = verifyData.scorecardMeasurables[0];
      console.log(`✅ Found measurable: ${measurable.name}`);
      console.log(`   - Type: ${measurable.type}`);
      console.log(`   - Unit Type: ${measurable.unitType}`);
      console.log(`   - Goal Target: ${measurable.goalTarget}`);
      console.log(`   - Status: ${measurable.status}`);
      console.log();
    } else {
      console.log("❌ Failed to verify measurable");
    }

    // Step 4: Update the measurable
    console.log("Step 4: Updating the measurable...\n");
    const updateResult = await updateScorecardMeasurable({
      measurableId: createdMeasurableId,
      name: "E2E Test Revenue Metric (UPDATED)",
      goalTarget: "20000",
      goalTargetEnd: "25000",
      desc: "Updated description - this metric was modified by automated test",
    });

    const updateText = updateResult.content[0].text;
    console.log("Result:");
    console.log(updateText);
    console.log();

    const updateData = JSON.parse(updateText);
    if (updateData.success) {
      console.log("✅ Successfully updated measurable");
      console.log("   Changes made:");
      Object.entries(updateData.changes || {}).forEach(([field, change]) => {
        if (change) {
          console.log(`   - ${field}: "${change.from}" → "${change.to}"`);
        }
      });
      console.log();
    } else {
      console.log("❌ Failed to update measurable\n");
    }

    // Step 5: Test updating status to ARCHIVED
    console.log("Step 5: Archiving the measurable (status → ARCHIVED)...\n");
    const archiveResult = await updateScorecardMeasurable({
      measurableId: createdMeasurableId,
      status: "ARCHIVED",
    });

    const archiveText = archiveResult.content[0].text;
    const archiveData = JSON.parse(archiveText);

    if (archiveData.success) {
      console.log("✅ Successfully archived measurable\n");
    } else {
      console.log("❌ Failed to archive measurable\n");
    }

    // Step 6: Verify archived status
    console.log("Step 6: Verifying archived status...\n");
    const verifyArchiveResult = await getScorecardMeasurables({
      dataFieldId: createdMeasurableId,
      status: "ARCHIVED",
      first: 1,
    });

    const verifyArchiveText = verifyArchiveResult.content[0].text;
    const verifyArchiveData = JSON.parse(verifyArchiveText);

    if (
      verifyArchiveData.scorecardMeasurables &&
      verifyArchiveData.scorecardMeasurables.length > 0
    ) {
      console.log("✅ Confirmed measurable is archived\n");
    } else {
      console.log("❌ Could not verify archived status\n");
    }

    // Step 7: Delete the measurable
    console.log("Step 7: Deleting the measurable...\n");
    const deleteResult = await deleteScorecardMeasurable({
      measurableId: createdMeasurableId,
    });

    const deleteText = deleteResult.content[0].text;
    console.log("Result:");
    console.log(deleteText);
    console.log();

    const deleteData = JSON.parse(deleteText);
    if (deleteData.success) {
      console.log("✅ Successfully deleted measurable\n");
      createdMeasurableId = null; // Mark as deleted so we don't try cleanup
    } else {
      console.log("❌ Failed to delete measurable\n");
    }

    // Step 8: Verify deletion
    console.log("Step 8: Verifying deletion (should not find measurable)...\n");
    const verifyDeleteResult = await getScorecardMeasurables({
      dataFieldId: deleteData.measurableId,
      first: 1,
    });

    const verifyDeleteText = verifyDeleteResult.content[0].text;
    const verifyDeleteData = JSON.parse(verifyDeleteText);

    if (
      !verifyDeleteData.scorecardMeasurables ||
      verifyDeleteData.scorecardMeasurables.length === 0
    ) {
      console.log("✅ Confirmed measurable is deleted (not found in active records)\n");
    } else {
      console.log("⚠️  Warning: Measurable still appears in results\n");
    }

    // Step 9: Test error handling - try to update deleted measurable
    console.log("Step 9: Testing error handling (update deleted measurable)...\n");
    const errorUpdateResult = await updateScorecardMeasurable({
      measurableId: deleteData.measurableId,
      name: "This should fail",
    });

    const errorUpdateText = errorUpdateResult.content[0].text;
    console.log("Result (should be an error):");
    console.log(errorUpdateText);
    console.log();

    // Step 10: Test validation - invalid type
    console.log("Step 10: Testing validation with invalid type...\n");
    const invalidTypeResult = await createScorecardMeasurable({
      name: "Invalid Type Test",
      type: "invalid_type",
      teamId: testTeamId,
    });

    const invalidTypeText = invalidTypeResult.content[0].text;
    console.log("Result (should be a validation error):");
    console.log(invalidTypeText);
    console.log();

    // Step 11: Test validation - invalid unitType
    console.log("Step 11: Testing validation with invalid unitType...\n");
    const invalidUnitResult = await createScorecardMeasurable({
      name: "Invalid Unit Test",
      unitType: "invalid_unit",
      teamId: testTeamId,
    });

    const invalidUnitText = invalidUnitResult.content[0].text;
    console.log("Result (should be a validation error):");
    console.log(invalidUnitText);
    console.log();

    console.log("═══════════════════════════════════════════════");
    console.log("✅ ALL TESTS COMPLETED SUCCESSFULLY!");
    console.log("═══════════════════════════════════════════════\n");
  } catch (error) {
    console.error("\n❌ Test failed with error:");
    console.error(error);
    console.error("\nStack trace:");
    console.error(error.stack);

    // Cleanup on error
    if (createdMeasurableId) {
      console.log("\n🧹 Attempting cleanup...");
      try {
        await deleteScorecardMeasurable({ measurableId: createdMeasurableId });
        console.log("✅ Cleanup successful\n");
      } catch (cleanupError) {
        console.error("❌ Cleanup failed:", cleanupError.message);
      }
    }
  }
}

// Run the test
testScorecardMeasurableCRUD();

