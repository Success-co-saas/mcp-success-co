#!/usr/bin/env node

/**
 * Update the 3-Year Picture for Demo Marketing Inc
 */

import {
  init,
  updateVTOThreeYearGoal,
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

async function updateThreeYearPicture() {
  console.log("\n═══════════════════════════════════════════════");
  console.log("  UPDATE 3-YEAR PICTURE");
  console.log("═══════════════════════════════════════════════\n");

  try {
    // The 3-Year Picture goal ID from Claude's session
    // This ID is for Demo Marketing Inc's 3-year picture
    const goalId = "862d5842-2d4c-4c3e-a6bb-75a9ac253cf2";

    const newThreeYearPicture = `Revenue & Growth: $18M annual revenue (from $12M) | 75 client accounts | 60 team members | NPS 80+ || Service Excellence: Brand Strategy practice at $3M | 98% on-time delivery | 4+ year retention | Industry case studies in 3 verticals || Team & Culture: Best Place to Work award | Full career dev framework | 90%+ satisfaction | Remote-first with collaborative hub || Market Position: Top 5 Midwest B2B agency | Thought leadership platform | 3 major tech partnerships | Proprietary methodology trademarked`;

    console.log("Updating 3-Year Picture...\n");
    console.log("Goal ID:", goalId);
    console.log("New content:", newThreeYearPicture.substring(0, 100) + "...\n");

    const updateResult = await updateVTOThreeYearGoal({
      goalId,
      name: newThreeYearPicture,
      futureDate: "2028-11-17",
      cascadeAll: true,
    });

    const updateText = updateResult.content[0].text;
    console.log("Result:");
    console.log(updateText);
    console.log("\n");

    // Verify the update
    console.log("Verifying update...\n");
    const vtoResult = await getLeadershipVTO({ stateId: "ACTIVE" });
    const vtoText = vtoResult.content[0].text;
    
    // Find the 3-year picture section
    const threeYearSection = vtoText.match(/## Goals & Planning[\s\S]*?(?=##|$)/);
    if (threeYearSection) {
      console.log("Updated Goals & Planning section:");
      console.log(threeYearSection[0]);
    }

    console.log("\n═══════════════════════════════════════════════");
    console.log("✅ 3-YEAR PICTURE UPDATED!");
    console.log("═══════════════════════════════════════════════\n");
  } catch (error) {
    console.error("\n❌ Update failed with error:");
    console.error(error);
    console.error("\nStack trace:");
    console.error(error.stack);
  }
}

// Run the update
updateThreeYearPicture();

