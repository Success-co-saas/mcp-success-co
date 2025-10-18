// Test the new forLeadershipTeam parameter

import * as tools from "./tools.js";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Initialize tools
tools.init({
  NODE_ENV: process.env.NODE_ENV || "development",
  DEBUG: process.env.DEBUG || "true",
  GRAPHQL_ENDPOINT_MODE: process.env.GRAPHQL_ENDPOINT_MODE || "online",
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

async function testLeadershipTeamShortcut() {
  console.log("Testing forLeadershipTeam parameter...\n");

  try {
    // Test 1: Get leadership team todos using the shortcut
    console.log(
      "Test 1: Get todos for leadership team using forLeadershipTeam=true"
    );
    const todosResult = await tools.getTodos({
      forLeadershipTeam: true,
      first: 5,
    });
    console.log("Result:", JSON.stringify(todosResult, null, 2));
    console.log("\n---\n");

    // Test 2: Get leadership team issues
    console.log(
      "Test 2: Get issues for leadership team using forLeadershipTeam=true"
    );
    const issuesResult = await tools.getIssues({
      forLeadershipTeam: true,
      first: 5,
    });
    console.log("Result:", JSON.stringify(issuesResult, null, 2));
    console.log("\n---\n");

    // Test 3: Get leadership team headlines
    console.log(
      "Test 3: Get headlines for leadership team using forLeadershipTeam=true"
    );
    const headlinesResult = await tools.getHeadlines({
      forLeadershipTeam: true,
      first: 5,
    });
    console.log("Result:", JSON.stringify(headlinesResult, null, 2));
    console.log("\n---\n");

    // Test 4: Get leadership team meeting details
    console.log(
      "Test 4: Get meeting details for leadership team using forLeadershipTeam=true"
    );
    const meetingDetailsResult = await tools.getMeetingDetails({
      forLeadershipTeam: true,
      first: 2,
    });
    console.log("Result:", JSON.stringify(meetingDetailsResult, null, 2));
    console.log("\n---\n");

    // Test 5: Create an issue for the leadership team
    console.log(
      "Test 5: Create issue for leadership team using forLeadershipTeam=true"
    );
    const createIssueResult = await tools.createIssue({
      name: "Test issue for leadership team",
      desc: "This is a test issue created using the forLeadershipTeam shortcut",
      forLeadershipTeam: true,
      priorityNo: 3,
    });
    console.log("Result:", JSON.stringify(createIssueResult, null, 2));
    console.log("\n---\n");

    console.log("All tests completed!");
  } catch (error) {
    console.error("Error during testing:", error);
    process.exit(1);
  }
}

// Run the test
testLeadershipTeamShortcut().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
