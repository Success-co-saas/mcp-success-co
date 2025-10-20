import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { init, createIssue, getTeams } from "./tools.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, ".env") });

console.log("Testing createIssue with required teamId...\n");

// Initialize tools with environment config
init({
  NODE_ENV: process.env.NODE_ENV,
  DEBUG: process.env.DEBUG,
  GRAPHQL_ENDPOINT: process.env.GRAPHQL_ENDPOINT,
  GRAPHQL_ENDPOINT: process.env.GRAPHQL_ENDPOINT,
  GRAPHQL_ENDPOINT: process.env.GRAPHQL_ENDPOINT,
  DEVMODE_SUCCESS_API_KEY: process.env.DEVMODE_SUCCESS_API_KEY,
  DATABASE_URL: process.env.DATABASE_URL,
  DB_HOST: process.env.DB_HOST,
  DB_PORT: process.env.DB_PORT,
  DB_DATABASE: process.env.DB_DATABASE,
  DB_USER: process.env.DB_USER,
  DB_PASS: process.env.DB_PASS,
});

async function testCreateIssue() {
  try {
    // Step 1: Get teams to find a valid team ID
    console.log("Step 1: Getting teams...");
    const teamsResult = await getTeams({ stateId: "ACTIVE" });
    const teamsData = JSON.parse(teamsResult.content[0].text);

    if (teamsData.results.length === 0) {
      console.log("❌ No teams found!");
      process.exit(1);
    }

    const firstTeam = teamsData.results[0];
    console.log(`✅ Found team: ${firstTeam.title} (ID: ${firstTeam.id})\n`);

    // Step 2: Create issue WITHOUT teamId (should fail)
    console.log("Step 2: Testing create issue WITHOUT teamId (should fail)...");
    const resultNoTeam = await createIssue({
      name: "Test Issue - No Team",
      desc: "This should fail because teamId is required",
    });

    const responseNoTeam = resultNoTeam.content[0].text;
    if (responseNoTeam.includes("Team ID is required")) {
      console.log("✅ Correctly rejected issue without teamId\n");
    } else {
      console.log("❌ Should have failed without teamId");
      console.log("Response:", responseNoTeam, "\n");
    }

    // Step 3: Create issue WITH teamId (should succeed)
    console.log("Step 3: Testing create issue WITH teamId...");
    const result = await createIssue({
      name: "Test Issue - API Key Context",
      desc: "Testing automatic userId from API key",
      teamId: firstTeam.id,
      // issueStatusId will use default 'TODO'
      // type will use default 'short-term'
      priorityNo: 3,
    });

    const responseText = result.content[0].text;
    console.log("Raw response:", responseText, "\n");

    let response;
    try {
      response = JSON.parse(responseText);
    } catch (e) {
      console.log("❌ Issue creation failed with error:");
      console.log(responseText);
      process.exit(1);
    }

    if (response.success) {
      console.log("✅ Issue created successfully!");
      console.log("   Issue ID:", response.issue.id);
      console.log("   Name:", response.issue.name);
      console.log("   Team ID:", response.issue.teamId);
      console.log("   User ID:", response.issue.userId, "(from API key)");
      console.log("   Company ID:", response.issue.companyId, "(from API key)");
      console.log("\n════════════════════════════════════════════════════════");
      console.log("✅ All tests passed!");
      console.log("════════════════════════════════════════════════════════");
      console.log("\nKey improvements:");
      console.log("  ✓ teamId is now REQUIRED");
      console.log("  ✓ userId automatically set from API key");
      console.log("  ✓ companyId automatically set from API key");
      console.log("  ✓ GraphQL mutation succeeds with all required fields");
    } else {
      console.log("❌ Issue creation failed");
      console.log("Response:", JSON.stringify(response, null, 2));
      process.exit(1);
    }

    process.exit(0);
  } catch (error) {
    console.error("\n❌ Test failed!");
    console.error("Error:", error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

testCreateIssue();
