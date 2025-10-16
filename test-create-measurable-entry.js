/**
 * Test script for createScorecardMeasurableEntry and updateScorecardMeasurableEntry tools
 *
 * This script tests the creation and updating of measurable entries (data values) for scorecard metrics.
 */

import {
  init,
  createScorecardMeasurableEntry,
  updateScorecardMeasurableEntry,
  getScorecardMeasurables,
  setSuccessCoApiKey,
} from "./tools.js";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Initialize tools
init({
  NODE_ENV: process.env.NODE_ENV,
  DEBUG: process.env.DEBUG,
  GRAPHQL_ENDPOINT_MODE: process.env.GRAPHQL_ENDPOINT_MODE,
  GRAPHQL_ENDPOINT_LOCAL: process.env.GRAPHQL_ENDPOINT_LOCAL,
  GRAPHQL_ENDPOINT_ONLINE: process.env.GRAPHQL_ENDPOINT_ONLINE,
  SUCCESS_CO_API_KEY: process.env.SUCCESS_CO_API_KEY,
  DATABASE_URL: process.env.DATABASE_URL,
  DB_HOST: process.env.DB_HOST,
  DB_PORT: process.env.DB_PORT,
  DB_NAME: process.env.DB_NAME,
  DB_USER: process.env.DB_USER,
  DB_PASSWORD: process.env.DB_PASSWORD,
});

async function testCreateMeasurableEntry() {
  console.log("\n=== Testing createMeasurableEntry ===\n");

  try {
    // Step 1: Set API key if not already set
    if (!process.env.SUCCESS_CO_API_KEY) {
      console.log("❌ ERROR: No API key found in environment");
      console.log("Please set SUCCESS_CO_API_KEY in your .env file");
      return;
    }

    // Step 2: Get scorecard measurables to find a data field ID
    console.log(
      "Step 1: Fetching scorecard measurables to find a data field...\n"
    );
    const measurablesResult = await getScorecardMeasurables({
      first: 5,
      leadershipTeam: true,
    });

    const measurablesText = measurablesResult.content[0].text;
    const measurables = JSON.parse(measurablesText);

    if (
      !measurables.scorecardMeasurables ||
      measurables.scorecardMeasurables.length === 0
    ) {
      console.log(
        "❌ No scorecard measurables found. Please create some measurables first."
      );
      return;
    }

    const firstMeasurable = measurables.scorecardMeasurables[0];
    console.log(`Found measurable: ${firstMeasurable.name}`);
    console.log(`  - ID: ${firstMeasurable.id}`);
    console.log(`  - Type: ${firstMeasurable.type}`);
    console.log(`  - Unit Type: ${firstMeasurable.unitType}`);
    console.log(`  - Current Goal: ${firstMeasurable.goalTarget}`);
    console.log();

    // Step 3: Test creating a measurable entry without startDate (should use current period)
    console.log(
      "Step 2: Creating measurable entry without startDate (should use current period)...\n"
    );
    const testValue = "123.45";
    const testNote = "Test entry created by automated test";

    const createResult1 = await createScorecardMeasurableEntry({
      dataFieldId: firstMeasurable.id,
      value: testValue,
      note: testNote,
    });

    const createText1 = createResult1.content[0].text;
    console.log("Result:");
    console.log(createText1);
    console.log();

    // Parse the result to get the entry ID for update tests
    let createdEntryId = null;
    try {
      const createData1 = JSON.parse(createText1);
      if (createData1.success) {
        createdEntryId = createData1.entry.id;
      }
    } catch (e) {
      // Ignore parsing errors
    }

    // Step 4: Test creating another entry with a specific startDate
    console.log("Step 3: Testing with a specific startDate...\n");

    // Calculate a date in the past based on the measurable type
    let testStartDate;
    const today = new Date();

    if (firstMeasurable.type === "WEEKLY") {
      // Get Monday of last week
      const lastWeek = new Date(today);
      lastWeek.setDate(lastWeek.getDate() - 7);
      const day = lastWeek.getDay();
      const diff = lastWeek.getDate() - day + (day === 0 ? -6 : 1);
      lastWeek.setDate(diff);
      testStartDate = lastWeek.toISOString().split("T")[0];
    } else if (firstMeasurable.type === "MONTHLY") {
      // First day of last month
      const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      testStartDate = lastMonth.toISOString().split("T")[0];
    } else if (firstMeasurable.type === "QUARTERLY") {
      // Use current quarter start
      testStartDate = null; // Let it calculate automatically
    } else if (firstMeasurable.type === "ANNUALLY") {
      // January 1 of current year
      testStartDate = `${today.getFullYear()}-01-01`;
    }

    if (testStartDate) {
      console.log(`Using startDate: ${testStartDate}`);
      const createResult2 = await createScorecardMeasurableEntry({
        dataFieldId: firstMeasurable.id,
        value: "456.78",
        startDate: testStartDate,
        note: "Test entry with specific date",
      });

      const createText2 = createResult2.content[0].text;
      console.log("Result:");
      console.log(createText2);
      console.log();
    }

    // Step 5: Test updating the created entry (if we have an ID)
    if (createdEntryId) {
      console.log(
        `Step 4: Testing updateScorecardMeasurableEntry with ID ${createdEntryId}...\n`
      );

      // Test updating the value
      console.log("  4a: Updating value to 999.99...\n");
      const updateResult1 = await updateScorecardMeasurableEntry({
        entryId: createdEntryId,
        value: "999.99",
      });

      const updateText1 = updateResult1.content[0].text;
      console.log("Result:");
      console.log(updateText1);
      console.log();

      // Test updating the note
      console.log("  4b: Updating note...\n");
      const updateResult2 = await updateScorecardMeasurableEntry({
        entryId: createdEntryId,
        note: "Updated note via automated test",
      });

      const updateText2 = updateResult2.content[0].text;
      console.log("Result:");
      console.log(updateText2);
      console.log();

      // Test updating both value and note
      console.log("  4c: Updating both value and note...\n");
      const updateResult3 = await updateScorecardMeasurableEntry({
        entryId: createdEntryId,
        value: "777.77",
        note: "Final update - both fields changed",
      });

      const updateText3 = updateResult3.content[0].text;
      console.log("Result:");
      console.log(updateText3);
      console.log();
    }

    // Step 5.5: Test creating entry with future date (should error)
    console.log("Step 4.5: Testing future date validation...\n");
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 7); // 7 days in the future
    const futureDateStr = futureDate.toISOString().split("T")[0];

    console.log(
      `Attempting to create entry with future date: ${futureDateStr}`
    );
    const futureDateResult = await createScorecardMeasurableEntry({
      dataFieldId: firstMeasurable.id,
      value: "100",
      startDate: futureDateStr,
      note: "This should fail - future date",
    });

    const futureDateText = futureDateResult.content[0].text;
    console.log("Result (should be an error):");
    console.log(futureDateText);
    console.log();

    // Step 6: Test error handling - try to create duplicate entry
    console.log("Step 5: Testing duplicate entry detection...\n");
    const duplicateResult = await createScorecardMeasurableEntry({
      dataFieldId: firstMeasurable.id,
      value: testValue,
      note: "This should fail - duplicate entry",
    });

    const duplicateText = duplicateResult.content[0].text;
    console.log("Result (should be an error):");
    console.log(duplicateText);
    console.log();

    // Step 7: Test validation - invalid value for numeric type
    if (
      firstMeasurable.unitType === "number" ||
      firstMeasurable.unitType === "currency"
    ) {
      console.log("Step 6: Testing validation with invalid value...\n");
      const invalidResult = await createScorecardMeasurableEntry({
        dataFieldId: firstMeasurable.id,
        value: "not a number",
        note: "This should fail - invalid value",
      });

      const invalidText = invalidResult.content[0].text;
      console.log("Result (should be a validation error):");
      console.log(invalidText);
      console.log();
    }

    // Step 8: Test update with no changes (should error)
    if (createdEntryId) {
      console.log(
        "Step 7: Testing update with no fields provided (should error)...\n"
      );
      const noUpdateResult = await updateScorecardMeasurableEntry({
        entryId: createdEntryId,
      });

      const noUpdateText = noUpdateResult.content[0].text;
      console.log("Result (should be an error):");
      console.log(noUpdateText);
      console.log();
    }

    // Step 9: Test update with invalid entry ID
    console.log("Step 8: Testing update with invalid entry ID...\n");
    const invalidUpdateResult = await updateScorecardMeasurableEntry({
      entryId: "00000000-0000-0000-0000-000000000000",
      value: "100",
    });

    const invalidUpdateText = invalidUpdateResult.content[0].text;
    console.log("Result (should be an error):");
    console.log(invalidUpdateText);
    console.log();

    console.log("\n✅ All tests completed!\n");
  } catch (error) {
    console.error("\n❌ Test failed with error:");
    console.error(error);
    console.error("\nStack trace:");
    console.error(error.stack);
  }
}

// Run the test
testCreateMeasurableEntry();
