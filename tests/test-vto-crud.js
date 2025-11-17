#!/usr/bin/env node

/**
 * VTO CRUD Operations Test
 * 
 * Tests all VTO (Vision/Traction Organizer) CRUD operations:
 * - Core Values (create, update, delete)
 * - Core Focus (create, update, delete)
 * - VTO Goals (create, update, delete)
 * - Market Strategies (create, update, delete)
 * 
 * Usage:
 *   node tests/test-vto-crud.js
 */

import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { init, setAuthContext } from "../tools.js";
import * as tools from "../tools.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "..", ".env") });

// Initialize tools
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

// Track created items for cleanup
const createdItems = {
  coreValues: [],
  coreFocus: [],
  goals: [],
  marketStrategies: [],
};

// Test results
const results = {
  total: 0,
  passed: 0,
  failed: 0,
  tests: [],
};

function log(message, type = "info") {
  const emoji = {
    info: "ℹ️",
    success: "✅",
    error: "❌",
    warning: "⚠️",
  };
  console.log(`${emoji[type] || ""}  ${message}`);
}

function logResult(testName, passed, message = "") {
  results.total++;
  if (passed) {
    results.passed++;
    results.tests.push({ name: testName, status: "PASS", message });
    log(`${testName}: ${message}`, "success");
  } else {
    results.failed++;
    results.tests.push({ name: testName, status: "FAIL", message });
    log(`${testName}: ${message}`, "error");
  }
}

async function setup() {
  log("\n🔧 Setting up test environment...\n", "info");
  
  // Set up API key authentication
  const apiKey = process.env.DEVMODE_SUCCESS_API_KEY;
  if (!apiKey) {
    throw new Error("DEVMODE_SUCCESS_API_KEY not found in environment");
  }

  const context = await tools.getContextForApiKey(apiKey);
  if (!context) {
    throw new Error("Failed to get context for API key");
  }

  setAuthContext({
    userId: context.userId,
    userEmail: context.userEmail,
    companyId: context.companyId,
    isApiKeyMode: true,
  });

  log(`✓ Authenticated as: ${context.userEmail}`, "success");
  log(`✓ Company ID: ${context.companyId}\n`, "success");
}

function extractIdFromResponse(content) {
  // Look for ID in the response text
  const match = content.match(/ID:\s*`?([a-f0-9-]+)`?/i);
  return match ? match[1] : null;
}

// ============================================================================
// CORE VALUES TESTS
// ============================================================================

async function testCoreValueLifecycle() {
  log("\n📋 Testing Core Values CRUD Operations", "info");
  
  try {
    // CREATE
    log("\n1. Creating core value...");
    const createResult = await tools.createCoreValue({
      name: "Test Core Value - Be Awesome",
      desc: "This is a test core value created by automated tests",
      position: 10000,
      cascadeAll: false,
    });
    
    const createText = createResult.content[0].text;
    const coreValueId = extractIdFromResponse(createText);
    
    if (createText.includes("✓ Created core value") && coreValueId) {
      createdItems.coreValues.push(coreValueId);
      logResult("createCoreValue", true, `Created with ID: ${coreValueId}`);
    } else {
      logResult("createCoreValue", false, `Failed: ${createText}`);
      return;
    }
    
    // UPDATE
    log("\n2. Updating core value...");
    const updateResult = await tools.updateCoreValue({
      coreValueId: coreValueId,
      name: "Test Core Value - Updated",
      desc: "Updated description",
      position: 15000,
    });
    
    const updateText = updateResult.content[0].text;
    if (updateText.includes("✓ Updated core value")) {
      logResult("updateCoreValue", true, "Updated successfully");
    } else {
      logResult("updateCoreValue", false, `Failed: ${updateText}`);
    }
    
    // VERIFY via getLeadershipVTO
    log("\n3. Verifying core value exists in VTO...");
    const vtoResult = await tools.getLeadershipVTO({});
    const vtoText = vtoResult.content[0].text;
    
    if (vtoText.includes("Test Core Value - Updated") && vtoText.includes(coreValueId)) {
      logResult("verifyCoreValueInVTO", true, "Core value found in VTO");
    } else {
      logResult("verifyCoreValueInVTO", false, "Core value not found in VTO");
    }
    
    // DELETE
    log("\n4. Deleting core value...");
    const deleteResult = await tools.deleteCoreValue({
      coreValueId: coreValueId,
    });
    
    const deleteText = deleteResult.content[0].text;
    if (deleteText.includes("✓ Deleted core value")) {
      logResult("deleteCoreValue", true, "Deleted successfully (soft delete)");
      // Remove from cleanup list since we already deleted it
      createdItems.coreValues = createdItems.coreValues.filter(id => id !== coreValueId);
    } else {
      logResult("deleteCoreValue", false, `Failed: ${deleteText}`);
    }
    
  } catch (error) {
    logResult("coreValueLifecycle", false, `Error: ${error.message}`);
    console.error(error);
  }
}

// ============================================================================
// CORE FOCUS TESTS
// ============================================================================

async function testCoreFocusLifecycle() {
  log("\n🎯 Testing Core Focus CRUD Operations", "info");
  
  try {
    // CREATE
    log("\n1. Creating core focus...");
    const createResult = await tools.createCoreFocus({
      name: "Test Purpose Statement",
      type: "PURPOSE",
      desc: "This is a test purpose statement created by automated tests",
      cascadeAll: false,
    });
    
    const createText = createResult.content[0].text;
    const coreFocusId = extractIdFromResponse(createText);
    
    if (createText.includes("✓ Created core focus") && coreFocusId) {
      createdItems.coreFocus.push(coreFocusId);
      logResult("createCoreFocus", true, `Created with ID: ${coreFocusId}`);
    } else {
      logResult("createCoreFocus", false, `Failed: ${createText}`);
      return;
    }
    
    // UPDATE
    log("\n2. Updating core focus...");
    const updateResult = await tools.updateCoreFocus({
      coreFocusId: coreFocusId,
      name: "Test Purpose Statement - Updated",
      desc: "Updated test purpose statement",
    });
    
    const updateText = updateResult.content[0].text;
    if (updateText.includes("✓ Updated core focus")) {
      logResult("updateCoreFocus", true, "Updated successfully");
    } else {
      logResult("updateCoreFocus", false, `Failed: ${updateText}`);
    }
    
    // VERIFY via getLeadershipVTO
    log("\n3. Verifying core focus exists in VTO...");
    const vtoResult = await tools.getLeadershipVTO({});
    const vtoText = vtoResult.content[0].text;
    
    if (vtoText.includes("Test Purpose Statement - Updated") && vtoText.includes(coreFocusId)) {
      logResult("verifyCoreFocusInVTO", true, "Core focus found in VTO");
    } else {
      logResult("verifyCoreFocusInVTO", false, "Core focus not found in VTO");
    }
    
    // DELETE
    log("\n4. Deleting core focus...");
    const deleteResult = await tools.deleteCoreFocus({
      coreFocusId: coreFocusId,
    });
    
    const deleteText = deleteResult.content[0].text;
    if (deleteText.includes("✓ Deleted core focus")) {
      logResult("deleteCoreFocus", true, "Deleted successfully (soft delete)");
      createdItems.coreFocus = createdItems.coreFocus.filter(id => id !== coreFocusId);
    } else {
      logResult("deleteCoreFocus", false, `Failed: ${deleteText}`);
    }
    
  } catch (error) {
    logResult("coreFocusLifecycle", false, `Error: ${error.message}`);
    console.error(error);
  }
}

// ============================================================================
// VTO GOALS TESTS
// ============================================================================

async function testVTOGoalLifecycle() {
  log("\n🎯 Testing VTO Goals CRUD Operations", "info");
  
  try {
    // CREATE
    log("\n1. Creating VTO goal...");
    const createResult = await tools.createVTOGoal({
      name: "Test 3-Year Goal: Reach $10M in revenue",
      type: "3_YEAR_PICTURE",
      futureDate: "2027-12-31",
      cascadeAll: false,
    });
    
    const createText = createResult.content[0].text;
    const goalId = extractIdFromResponse(createText);
    
    if (createText.includes("✓ Created VTO goal") && goalId) {
      createdItems.goals.push(goalId);
      logResult("createVTOGoal", true, `Created with ID: ${goalId}`);
    } else {
      logResult("createVTOGoal", false, `Failed: ${createText}`);
      return;
    }
    
    // UPDATE
    log("\n2. Updating VTO goal...");
    const updateResult = await tools.updateVTOGoal({
      goalId: goalId,
      name: "Test 3-Year Goal: Reach $15M in revenue",
      futureDate: "2028-06-30",
    });
    
    const updateText = updateResult.content[0].text;
    if (updateText.includes("✓ Updated VTO goal")) {
      logResult("updateVTOGoal", true, "Updated successfully");
    } else {
      logResult("updateVTOGoal", false, `Failed: ${updateText}`);
    }
    
    // VERIFY via getLeadershipVTO
    log("\n3. Verifying VTO goal exists in VTO...");
    const vtoResult = await tools.getLeadershipVTO({});
    const vtoText = vtoResult.content[0].text;
    
    if (vtoText.includes("$15M in revenue") && vtoText.includes(goalId)) {
      logResult("verifyVTOGoalInVTO", true, "VTO goal found in VTO");
    } else {
      logResult("verifyVTOGoalInVTO", false, "VTO goal not found in VTO");
    }
    
    // DELETE
    log("\n4. Deleting VTO goal...");
    const deleteResult = await tools.deleteVTOGoal({
      goalId: goalId,
    });
    
    const deleteText = deleteResult.content[0].text;
    if (deleteText.includes("✓ Deleted VTO goal")) {
      logResult("deleteVTOGoal", true, "Deleted successfully (soft delete)");
      createdItems.goals = createdItems.goals.filter(id => id !== goalId);
    } else {
      logResult("deleteVTOGoal", false, `Failed: ${deleteText}`);
    }
    
  } catch (error) {
    logResult("vtoGoalLifecycle", false, `Error: ${error.message}`);
    console.error(error);
  }
}

// ============================================================================
// MARKET STRATEGY TESTS
// ============================================================================

async function testMarketStrategyLifecycle() {
  log("\n📈 Testing Market Strategy CRUD Operations", "info");
  
  try {
    // CREATE
    log("\n1. Creating market strategy...");
    const createResult = await tools.createMarketStrategy({
      name: "Test Market Strategy",
      idealCustomer: "Small businesses with 10-50 employees",
      idealCustomerDesc: "Growing companies looking to scale",
      provenProcess: "The Test Process",
      provenProcessDesc: "A proven methodology for success",
      guarantee: "100% satisfaction or money back",
      guaranteeDesc: "We stand behind our work",
      uniqueValueProposition: "The fastest implementation in the industry",
      showProvenProcess: true,
      showGuarantee: true,
      cascadeAll: false,
    });
    
    const createText = createResult.content[0].text;
    const strategyId = extractIdFromResponse(createText);
    
    if (createText.includes("✓ Created market strategy") && strategyId) {
      createdItems.marketStrategies.push(strategyId);
      logResult("createMarketStrategy", true, `Created with ID: ${strategyId}`);
    } else {
      logResult("createMarketStrategy", false, `Failed: ${createText}`);
      return;
    }
    
    // UPDATE
    log("\n2. Updating market strategy...");
    const updateResult = await tools.updateMarketStrategy({
      strategyId: strategyId,
      name: "Test Market Strategy - Updated",
      idealCustomer: "Medium businesses with 50-100 employees",
      uniqueValueProposition: "The most comprehensive solution available",
    });
    
    const updateText = updateResult.content[0].text;
    if (updateText.includes("✓ Updated market strategy")) {
      logResult("updateMarketStrategy", true, "Updated successfully");
    } else {
      logResult("updateMarketStrategy", false, `Failed: ${updateText}`);
    }
    
    // VERIFY via getLeadershipVTO
    log("\n3. Verifying market strategy exists in VTO...");
    const vtoResult = await tools.getLeadershipVTO({});
    const vtoText = vtoResult.content[0].text;
    
    if (vtoText.includes("Test Market Strategy - Updated") && vtoText.includes(strategyId)) {
      logResult("verifyMarketStrategyInVTO", true, "Market strategy found in VTO");
    } else {
      logResult("verifyMarketStrategyInVTO", false, "Market strategy not found in VTO");
    }
    
    // DELETE
    log("\n4. Deleting market strategy...");
    const deleteResult = await tools.deleteMarketStrategy({
      strategyId: strategyId,
    });
    
    const deleteText = deleteResult.content[0].text;
    if (deleteText.includes("✓ Deleted market strategy")) {
      logResult("deleteMarketStrategy", true, "Deleted successfully (soft delete)");
      createdItems.marketStrategies = createdItems.marketStrategies.filter(id => id !== strategyId);
    } else {
      logResult("deleteMarketStrategy", false, `Failed: ${deleteText}`);
    }
    
  } catch (error) {
    logResult("marketStrategyLifecycle", false, `Error: ${error.message}`);
    console.error(error);
  }
}

// ============================================================================
// CLEANUP
// ============================================================================

async function cleanup() {
  log("\n🧹 Cleaning up any remaining test items...", "info");
  
  let cleanupCount = 0;
  
  // Clean up core values
  for (const id of createdItems.coreValues) {
    try {
      await tools.deleteCoreValue({ coreValueId: id });
      cleanupCount++;
    } catch (error) {
      log(`Failed to cleanup core value ${id}: ${error.message}`, "warning");
    }
  }
  
  // Clean up core focus
  for (const id of createdItems.coreFocus) {
    try {
      await tools.deleteCoreFocus({ coreFocusId: id });
      cleanupCount++;
    } catch (error) {
      log(`Failed to cleanup core focus ${id}: ${error.message}`, "warning");
    }
  }
  
  // Clean up goals
  for (const id of createdItems.goals) {
    try {
      await tools.deleteVTOGoal({ goalId: id });
      cleanupCount++;
    } catch (error) {
      log(`Failed to cleanup goal ${id}: ${error.message}`, "warning");
    }
  }
  
  // Clean up market strategies
  for (const id of createdItems.marketStrategies) {
    try {
      await tools.deleteMarketStrategy({ strategyId: id });
      cleanupCount++;
    } catch (error) {
      log(`Failed to cleanup market strategy ${id}: ${error.message}`, "warning");
    }
  }
  
  if (cleanupCount > 0) {
    log(`✓ Cleaned up ${cleanupCount} test items\n`, "success");
  } else {
    log("✓ No cleanup needed\n", "success");
  }
}

// ============================================================================
// MAIN TEST RUNNER
// ============================================================================

async function runTests() {
  console.log("\n╔════════════════════════════════════════════════════════════╗");
  console.log("║        VTO CRUD Operations Test Suite                     ║");
  console.log("╚════════════════════════════════════════════════════════════╝\n");
  
  try {
    await setup();
    
    // Run all test suites
    await testCoreValueLifecycle();
    await testCoreFocusLifecycle();
    await testVTOGoalLifecycle();
    await testMarketStrategyLifecycle();
    
    // Cleanup
    await cleanup();
    
    // Print summary
    console.log("\n╔════════════════════════════════════════════════════════════╗");
    console.log("║                    TEST SUMMARY                            ║");
    console.log("╚════════════════════════════════════════════════════════════╝\n");
    
    console.log(`Total Tests:  ${results.total}`);
    console.log(`✅ Passed:     ${results.passed}`);
    console.log(`❌ Failed:     ${results.failed}`);
    console.log(`Success Rate: ${((results.passed / results.total) * 100).toFixed(1)}%\n`);
    
    if (results.failed > 0) {
      console.log("Failed Tests:");
      results.tests
        .filter(t => t.status === "FAIL")
        .forEach(t => console.log(`  ❌ ${t.name}: ${t.message}`));
      console.log("");
      process.exit(1);
    } else {
      console.log("🎉 All tests passed!\n");
      process.exit(0);
    }
    
  } catch (error) {
    console.error("\n❌ Fatal error:", error.message);
    console.error(error.stack);
    
    // Try to cleanup even if tests failed
    try {
      await cleanup();
    } catch (cleanupError) {
      console.error("Cleanup also failed:", cleanupError.message);
    }
    
    process.exit(1);
  }
}

// Run tests
runTests();

