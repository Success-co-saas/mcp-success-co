/**
 * Test script to diagnose API key context lookup issues
 */

import { init, getSuccessCoApiKey, testDatabaseConnection } from "./tools.js";
import dotenv from "dotenv";
import postgres from "postgres";

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
  DB_PASS: process.env.DB_PASS,
});

async function diagnoseApiKeyContext() {
  console.log("\n=== API Key Context Diagnostic ===\n");

  // Step 1: Check if API key is set
  console.log("Step 1: Checking if API key is set...");
  const apiKey = getSuccessCoApiKey();
  if (!apiKey) {
    console.log("❌ No API key found!");
    console.log("Please set SUCCESS_CO_API_KEY in your .env file");
    return;
  }
  console.log(`✅ API key found (starts with: ${apiKey.substring(0, 12)}...)`);
  console.log();

  // Step 2: Test database connection
  console.log("Step 2: Testing database connection...");
  const dbTest = await testDatabaseConnection();
  if (!dbTest.ok) {
    console.log("❌ Database connection failed!");
    console.log(`Error: ${dbTest.error}`);
    return;
  }
  console.log(`✅ ${dbTest.message}`);
  console.log();

  // Step 3: Try to lookup API key in database
  console.log("Step 3: Looking up API key in database...");

  let db;
  try {
    if (process.env.DATABASE_URL) {
      db = postgres(process.env.DATABASE_URL, {
        max: 10,
        idle_timeout: 20,
        connect_timeout: 10,
      });
    } else {
      db = postgres({
        host: process.env.DB_HOST,
        port: parseInt(process.env.DB_PORT || "5432", 10),
        database: process.env.DB_NAME,
        username: process.env.DB_USER,
        password: process.env.DB_PASS,
        max: 10,
        idle_timeout: 20,
        connect_timeout: 10,
      });
    }

    // Strip the "suc_api_" prefix if present
    const keyWithoutPrefix = apiKey.startsWith("suc_api_")
      ? apiKey.substring(8)
      : apiKey;

    console.log(
      `Looking for key (without prefix): ${keyWithoutPrefix.substring(0, 8)}...`
    );

    // Check if the key exists
    const keyResult = await db`
      SELECT id, user_id, created_at
      FROM user_api_keys
      WHERE key = ${keyWithoutPrefix}
      LIMIT 1
    `;

    if (keyResult.length === 0) {
      console.log("❌ API key not found in database!");
      console.log();
      console.log("Possible reasons:");
      console.log("1. The API key is incorrect or expired");
      console.log("2. The API key was created in a different database");
      console.log("3. The prefix 'suc_api_' might be handled differently");
      console.log();
      console.log("Try checking the user_api_keys table:");
      console.log(
        `  SELECT * FROM user_api_keys WHERE key LIKE '%${keyWithoutPrefix.substring(
          keyWithoutPrefix.length - 8
        )}%';`
      );
      await db.end();
      return;
    }

    console.log(`✅ API key found in database!`);
    console.log(`   Key ID: ${keyResult[0].id}`);
    console.log(`   User ID: ${keyResult[0].user_id}`);
    console.log(`   Created: ${keyResult[0].created_at}`);
    console.log();

    // Check if the user exists and has a company
    const userResult = await db`
      SELECT u.id, u.company_id, u.email, c.name as company_name
      FROM users u
      LEFT JOIN companies c ON u.company_id = c.id
      WHERE u.id = ${keyResult[0].user_id}
      LIMIT 1
    `;

    if (userResult.length === 0) {
      console.log("❌ User not found for this API key!");
      await db.end();
      return;
    }

    if (!userResult[0].company_id) {
      console.log("❌ User has no company_id!");
      console.log(`   User ID: ${userResult[0].id}`);
      console.log(`   Email: ${userResult[0].email || "N/A"}`);
      await db.end();
      return;
    }

    console.log("✅ User found with company!");
    console.log(`   User ID: ${userResult[0].id}`);
    console.log(`   Email: ${userResult[0].email || "N/A"}`);
    console.log(`   Company ID: ${userResult[0].company_id}`);
    console.log(`   Company Name: ${userResult[0].company_name || "N/A"}`);
    console.log();

    console.log("🎉 Everything looks good!");
    console.log("The API key context should work properly.");

    await db.end();
  } catch (error) {
    console.error("❌ Error during diagnostic:", error.message);
    if (db) {
      await db.end();
    }
  }
}

// Run the diagnostic
diagnoseApiKeyContext().catch(console.error);
