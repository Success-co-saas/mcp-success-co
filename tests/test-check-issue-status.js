import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { init, getIssues } from "./tools.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, ".env") });

console.log("Checking existing issue status IDs...\n");

// Initialize tools
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

async function checkIssueStatuses() {
  try {
    const result = await getIssues({ first: 5, stateId: "ACTIVE" });
    const data = JSON.parse(result.content[0].text);

    if (data.totalCount === 0) {
      console.log("No existing issues found to check status IDs");
      process.exit(0);
    }

    console.log(
      `Found ${data.totalCount} issues. Showing first ${data.results.length}:\n`
    );

    const statusIds = new Set();
    data.results.forEach((issue, idx) => {
      console.log(`Issue ${idx + 1}:`);
      console.log(`  Name: ${issue.name}`);
      console.log(`  Status: ${issue.status}`);
      console.log(`  Team ID: ${issue.teamId || "N/A"}`);
      console.log(`  User ID: ${issue.userId || "N/A"}`);
      console.log();
      statusIds.add(issue.status);
    });

    console.log("Status IDs in use:");
    statusIds.forEach((statusId) => {
      console.log(`  - ${statusId}`);
    });

    process.exit(0);
  } catch (error) {
    console.error("Error:", error.message);
    process.exit(1);
  }
}

checkIssueStatuses();
