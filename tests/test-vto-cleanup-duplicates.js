#!/usr/bin/env node

/**
 * Clean up duplicate empty VTO Core Focus items
 */

import {
  init,
  deleteVTOCoreFocus,
  getLeadershipVTO,
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

async function cleanupDuplicates() {
  console.log("\n═══════════════════════════════════════════════");
  console.log("  VTO DUPLICATE CLEANUP");
  console.log("═══════════════════════════════════════════════\n");

  try {
    // Step 1: Get current VTO state
    console.log("Step 1: Fetching current VTO state...\n");
    const vtoResult = await getLeadershipVTO({ stateId: "ACTIVE" });
    const vtoText = vtoResult.content[0].text;
    
    console.log("Current VTO:");
    console.log(vtoText.substring(0, 500));
    console.log("...\n");

    // Step 2: Delete the empty duplicate Core Focus items
    // These IDs are the ORIGINAL empty placeholders that need to be removed
    const emptyCoreFocusIds = [
      { id: "831650f6-7a09-4e40-8cf0-fa74103fcc7a", name: "Purpose/Cause/Passion (empty)" },
      { id: "57cf5fea-1a60-4087-ae98-ed31b1a68865", name: "Niche (empty)" },
      { id: "4915b6cf-d7d6-4d83-bcd6-c3bfdfc75a76", name: "10-year target (empty)" },
    ];

    console.log("Step 2: Deleting empty duplicate Core Focus items...\n");
    
    for (const item of emptyCoreFocusIds) {
      console.log(`Deleting: ${item.name} (${item.id})...`);
      
      try {
        const deleteResult = await deleteVTOCoreFocus({
          coreFocusId: item.id,
        });
        
        const deleteText = deleteResult.content[0].text;
        console.log(`Result: ${deleteText}\n`);
      } catch (error) {
        console.log(`⚠️  Could not delete ${item.name}: ${error.message}\n`);
      }
    }

    // Step 3: Verify cleanup
    console.log("Step 3: Verifying cleanup...\n");
    const finalVtoResult = await getLeadershipVTO({ stateId: "ACTIVE" });
    const finalVtoText = finalVtoResult.content[0].text;
    
    console.log("Final VTO State:");
    console.log(finalVtoText);
    console.log("\n");

    console.log("═══════════════════════════════════════════════");
    console.log("✅ CLEANUP COMPLETED!");
    console.log("═══════════════════════════════════════════════\n");
  } catch (error) {
    console.error("\n❌ Cleanup failed with error:");
    console.error(error);
    console.error("\nStack trace:");
    console.error(error.stack);
  }
}

// Run the cleanup
cleanupDuplicates();

