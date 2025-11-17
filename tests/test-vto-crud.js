#!/usr/bin/env node

/**
 * Test script for VTO CRUD operations
 *
 * This script tests the full lifecycle of VTO components:
 * - Create Core Value, Core Value Detail, Core Focus, Three-Year Goal, Market Strategy
 * - Update each component
 * - Delete each component
 */

import {
  init,
  getLeadershipVTO,
  createVTOCoreValue,
  createVTOCoreValueDetail,
  createVTOCoreFocus,
  createVTOThreeYearGoal,
  createVTOMarketStrategy,
  updateVTOCoreValue,
  updateVTOCoreValueDetail,
  updateVTOCoreFocus,
  updateVTOThreeYearGoal,
  updateVTOMarketStrategy,
  deleteVTOCoreValue,
  deleteVTOCoreValueDetail,
  deleteVTOCoreFocus,
  deleteVTOThreeYearGoal,
  deleteVTOMarketStrategy,
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

// Utility function to parse text result
function parseResult(result) {
  try {
    return result.content[0].text;
  } catch (error) {
    console.error("Error parsing result:", error);
    return null;
  }
}

// Utility function to extract ID from result text
function extractId(text, pattern) {
  const match = text.match(pattern);
  return match ? match[1] : null;
}

async function testVTOCRUD() {
  console.log("\n═══════════════════════════════════════════════");
  console.log("  VTO CRUD TEST");
  console.log("═══════════════════════════════════════════════\n");

  let visionId = null;
  let coreValueId = null;
  let coreValueDetailId = null;
  let coreFocusId = null;
  let threeYearGoalId = null;
  let marketStrategyId = null;

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

    // Step 1: Get the leadership VTO to find vision ID
    console.log("Step 1: Fetching leadership VTO to get vision ID...\n");
    const vtoResult = await getLeadershipVTO({ stateId: "ACTIVE" });
    const vtoText = parseResult(vtoResult);
    
    if (!vtoText) {
      console.log("❌ Failed to fetch VTO");
      return;
    }

    // Extract vision ID from VTO text (handles markdown format)
    const visionIdMatch = vtoText.match(/Vision ID:\*?\*? ([a-f0-9-]+)/i);
    if (visionIdMatch) {
      visionId = visionIdMatch[1];
      console.log(`✅ Found vision ID: ${visionId}\n`);
    } else {
      console.log("❌ Could not extract vision ID from VTO");
      console.log("VTO text sample:", vtoText.substring(0, 200));
      return;
    }

    // ========================================================================
    // TEST 1: CORE VALUE CRUD
    // ========================================================================
    console.log("═══════════════════════════════════════════════");
    console.log("TEST 1: Core Value CRUD");
    console.log("═══════════════════════════════════════════════\n");

    // CREATE Core Value
    console.log("Step 1.1: Creating Core Value...\n");
    const createCoreValueResult = await createVTOCoreValue({
      visionId,
      name: "E2E Test Value: Integrity",
      cascadeAll: false,
    });

    const createCoreValueText = parseResult(createCoreValueResult);
    console.log("Result:", createCoreValueText, "\n");

    coreValueId = extractId(createCoreValueText, /ID:\*?\*? ([a-f0-9-]+)/i);
    if (coreValueId) {
      console.log(`✅ Created Core Value with ID: ${coreValueId}\n`);
    } else {
      console.log("❌ Failed to create Core Value\n");
      return;
    }

    // UPDATE Core Value
    console.log("Step 1.2: Updating Core Value...\n");
    const updateCoreValueResult = await updateVTOCoreValue({
      coreValueId,
      name: "E2E Test Value: Integrity (UPDATED)",
      cascadeAll: true,
    });

    const updateCoreValueText = parseResult(updateCoreValueResult);
    console.log("Result:", updateCoreValueText, "\n");

    if (updateCoreValueText.includes("✅")) {
      console.log("✅ Successfully updated Core Value\n");
    } else {
      console.log("❌ Failed to update Core Value\n");
    }

    // ========================================================================
    // TEST 2: CORE VALUE DETAIL CRUD
    // ========================================================================
    console.log("═══════════════════════════════════════════════");
    console.log("TEST 2: Core Value Detail CRUD");
    console.log("═══════════════════════════════════════════════\n");

    // CREATE Core Value Detail
    console.log("Step 2.1: Creating Core Value Detail...\n");
    const createDetailResult = await createVTOCoreValueDetail({
      coreValueId,
      name: "E2E Test Detail: Always be honest",
      desc: "We maintain integrity in all our dealings",
      position: 1,
      cascadeAll: false,
    });

    const createDetailText = parseResult(createDetailResult);
    console.log("Result:", createDetailText, "\n");

    coreValueDetailId = extractId(createDetailText, /ID:\*?\*? ([a-f0-9-]+)/i);
    if (coreValueDetailId) {
      console.log(`✅ Created Core Value Detail with ID: ${coreValueDetailId}\n`);
    } else {
      console.log("❌ Failed to create Core Value Detail\n");
      return;
    }

    // UPDATE Core Value Detail
    console.log("Step 2.2: Updating Core Value Detail...\n");
    const updateDetailResult = await updateVTOCoreValueDetail({
      coreValueDetailId,
      name: "E2E Test Detail: Always be honest (UPDATED)",
      desc: "Updated description - maintain integrity always",
      position: 2,
    });

    const updateDetailText = parseResult(updateDetailResult);
    console.log("Result:", updateDetailText, "\n");

    if (updateDetailText.includes("✅")) {
      console.log("✅ Successfully updated Core Value Detail\n");
    } else {
      console.log("❌ Failed to update Core Value Detail\n");
    }

    // ========================================================================
    // TEST 3: CORE FOCUS CRUD
    // ========================================================================
    console.log("═══════════════════════════════════════════════");
    console.log("TEST 3: Core Focus CRUD");
    console.log("═══════════════════════════════════════════════\n");

    // CREATE Core Focus
    console.log("Step 3.1: Creating Core Focus...\n");
    const createCoreFocusResult = await createVTOCoreFocus({
      visionId,
      name: "E2E Test Core Focus",
      desc: "This is our primary focus for the next 3 years",
      cascadeAll: false,
    });

    const createCoreFocusText = parseResult(createCoreFocusResult);
    console.log("Result:", createCoreFocusText, "\n");

    coreFocusId = extractId(createCoreFocusText, /ID:\*?\*? ([a-f0-9-]+)/i);
    if (coreFocusId) {
      console.log(`✅ Created Core Focus with ID: ${coreFocusId}\n`);
    } else {
      console.log("❌ Failed to create Core Focus\n");
      return;
    }

    // UPDATE Core Focus
    console.log("Step 3.2: Updating Core Focus...\n");
    const updateCoreFocusResult = await updateVTOCoreFocus({
      coreFocusId,
      name: "E2E Test Core Focus (UPDATED)",
      desc: "Updated description of our primary focus",
    });

    const updateCoreFocusText = parseResult(updateCoreFocusResult);
    console.log("Result:", updateCoreFocusText, "\n");

    if (updateCoreFocusText.includes("✅")) {
      console.log("✅ Successfully updated Core Focus\n");
    } else {
      console.log("❌ Failed to update Core Focus\n");
    }

    // ========================================================================
    // TEST 4: THREE-YEAR GOAL CRUD
    // ========================================================================
    console.log("═══════════════════════════════════════════════");
    console.log("TEST 4: Three-Year Goal CRUD");
    console.log("═══════════════════════════════════════════════\n");

    // CREATE Three-Year Goal
    console.log("Step 4.1: Creating Three-Year Goal...\n");
    const createGoalResult = await createVTOThreeYearGoal({
      visionId,
      name: "E2E Test Goal: Revenue $10M",
      futureDate: "2027-12-31",
      cascadeAll: false,
    });

    const createGoalText = parseResult(createGoalResult);
    console.log("Result:", createGoalText, "\n");

    threeYearGoalId = extractId(createGoalText, /ID:\*?\*? ([a-f0-9-]+)/i);
    if (threeYearGoalId) {
      console.log(`✅ Created Three-Year Goal with ID: ${threeYearGoalId}\n`);
    } else {
      console.log("❌ Failed to create Three-Year Goal\n");
      return;
    }

    // UPDATE Three-Year Goal
    console.log("Step 4.2: Updating Three-Year Goal...\n");
    const updateGoalResult = await updateVTOThreeYearGoal({
      goalId: threeYearGoalId,
      name: "E2E Test Goal: Revenue $15M (UPDATED)",
      futureDate: "2028-12-31",
    });

    const updateGoalText = parseResult(updateGoalResult);
    console.log("Result:", updateGoalText, "\n");

    if (updateGoalText.includes("✅")) {
      console.log("✅ Successfully updated Three-Year Goal\n");
    } else {
      console.log("❌ Failed to update Three-Year Goal\n");
    }

    // ========================================================================
    // TEST 5: MARKET STRATEGY CRUD
    // ========================================================================
    console.log("═══════════════════════════════════════════════");
    console.log("TEST 5: Market Strategy CRUD");
    console.log("═══════════════════════════════════════════════\n");

    // CREATE Market Strategy
    console.log("Step 5.1: Creating Market Strategy...\n");
    const createStrategyResult = await createVTOMarketStrategy({
      visionId,
      name: "E2E Test Strategy",
      idealCustomer: "Small to medium-sized businesses",
      idealCustomerDesc: "Companies with 10-250 employees",
      provenProcess: "Our proven EOS implementation process",
      provenProcessDesc: "We follow the EOS methodology",
      guarantee: "100% satisfaction guarantee",
      guaranteeDesc: "We stand behind our work",
      uniqueValueProposition: "We help businesses run on EOS",
      showProvenProcess: true,
      showGuarantee: true,
      cascadeAll: false,
    });

    const createStrategyText = parseResult(createStrategyResult);
    console.log("Result:", createStrategyText, "\n");

    marketStrategyId = extractId(createStrategyText, /ID:\*?\*? ([a-f0-9-]+)/i);
    if (marketStrategyId) {
      console.log(`✅ Created Market Strategy with ID: ${marketStrategyId}\n`);
    } else {
      console.log("❌ Failed to create Market Strategy\n");
      return;
    }

    // UPDATE Market Strategy
    console.log("Step 5.2: Updating Market Strategy...\n");
    const updateStrategyResult = await updateVTOMarketStrategy({
      marketStrategyId,
      name: "E2E Test Strategy (UPDATED)",
      idealCustomer: "Medium to large businesses",
      uniqueValueProposition: "We help businesses thrive with EOS",
    });

    const updateStrategyText = parseResult(updateStrategyResult);
    console.log("Result:", updateStrategyText, "\n");

    if (updateStrategyText.includes("✅")) {
      console.log("✅ Successfully updated Market Strategy\n");
    } else {
      console.log("❌ Failed to update Market Strategy\n");
    }

    // ========================================================================
    // TEST 6: DELETE ALL COMPONENTS
    // ========================================================================
    console.log("═══════════════════════════════════════════════");
    console.log("TEST 6: Cleanup - Delete All Components");
    console.log("═══════════════════════════════════════════════\n");

    // DELETE Core Value Detail (must delete before Core Value due to foreign key)
    if (coreValueDetailId) {
      console.log("Step 6.1: Deleting Core Value Detail...\n");
      const deleteDetailResult = await deleteVTOCoreValueDetail({
        detailId: coreValueDetailId,
      });
      const deleteDetailText = parseResult(deleteDetailResult);
      console.log("Result:", deleteDetailText, "\n");
      
      if (deleteDetailText.includes("✅")) {
        console.log("✅ Successfully deleted Core Value Detail\n");
        coreValueDetailId = null;
      } else {
        console.log("❌ Failed to delete Core Value Detail\n");
      }
    }

    // DELETE Core Value
    if (coreValueId) {
      console.log("Step 6.2: Deleting Core Value...\n");
      const deleteCoreValueResult = await deleteVTOCoreValue({
        coreValueId,
      });
      const deleteCoreValueText = parseResult(deleteCoreValueResult);
      console.log("Result:", deleteCoreValueText, "\n");
      
      if (deleteCoreValueText.includes("✅")) {
        console.log("✅ Successfully deleted Core Value\n");
        coreValueId = null;
      } else {
        console.log("❌ Failed to delete Core Value\n");
      }
    }

    // DELETE Core Focus
    if (coreFocusId) {
      console.log("Step 6.3: Deleting Core Focus...\n");
      const deleteCoreFocusResult = await deleteVTOCoreFocus({
        coreFocusId,
      });
      const deleteCoreFocusText = parseResult(deleteCoreFocusResult);
      console.log("Result:", deleteCoreFocusText, "\n");
      
      if (deleteCoreFocusText.includes("✅")) {
        console.log("✅ Successfully deleted Core Focus\n");
        coreFocusId = null;
      } else {
        console.log("❌ Failed to delete Core Focus\n");
      }
    }

    // DELETE Three-Year Goal
    if (threeYearGoalId) {
      console.log("Step 6.4: Deleting Three-Year Goal...\n");
      const deleteGoalResult = await deleteVTOThreeYearGoal({
        goalId: threeYearGoalId,
      });
      const deleteGoalText = parseResult(deleteGoalResult);
      console.log("Result:", deleteGoalText, "\n");
      
      if (deleteGoalText.includes("✅")) {
        console.log("✅ Successfully deleted Three-Year Goal\n");
        threeYearGoalId = null;
      } else {
        console.log("❌ Failed to delete Three-Year Goal\n");
      }
    }

    // DELETE Market Strategy
    if (marketStrategyId) {
      console.log("Step 6.5: Deleting Market Strategy...\n");
      const deleteStrategyResult = await deleteVTOMarketStrategy({
        marketStrategyId,
      });
      const deleteStrategyText = parseResult(deleteStrategyResult);
      console.log("Result:", deleteStrategyText, "\n");
      
      if (deleteStrategyText.includes("✅")) {
        console.log("✅ Successfully deleted Market Strategy\n");
        marketStrategyId = null;
      } else {
        console.log("❌ Failed to delete Market Strategy\n");
      }
    }

    console.log("═══════════════════════════════════════════════");
    console.log("✅ ALL VTO CRUD TESTS COMPLETED SUCCESSFULLY!");
    console.log("═══════════════════════════════════════════════\n");
  } catch (error) {
    console.error("\n❌ Test failed with error:");
    console.error(error);
    console.error("\nStack trace:");
    console.error(error.stack);

    // Cleanup on error
    console.log("\n🧹 Attempting cleanup...");
    
    try {
      if (coreValueDetailId) {
        await deleteVTOCoreValueDetail({ detailId: coreValueDetailId });
        console.log("✅ Cleaned up Core Value Detail");
      }
      if (coreValueId) {
        await deleteVTOCoreValue({ coreValueId });
        console.log("✅ Cleaned up Core Value");
      }
      if (coreFocusId) {
        await deleteVTOCoreFocus({ coreFocusId });
        console.log("✅ Cleaned up Core Focus");
      }
      if (threeYearGoalId) {
        await deleteVTOThreeYearGoal({ goalId: threeYearGoalId });
        console.log("✅ Cleaned up Three-Year Goal");
      }
      if (marketStrategyId) {
        await deleteVTOMarketStrategy({ marketStrategyId });
        console.log("✅ Cleaned up Market Strategy");
      }
      console.log("✅ Cleanup successful\n");
    } catch (cleanupError) {
      console.error("❌ Cleanup failed:", cleanupError.message);
    }
  }
}

// Run the test
testVTOCRUD();

