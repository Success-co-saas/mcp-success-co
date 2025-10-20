// Test the enhanced getTodos tool with new filters
import { getTodos } from "./tools.js";
import { init } from "./tools.js";

// Initialize tools with environment config
init({
  NODE_ENV: process.env.NODE_ENV,
  DEBUG: process.env.DEBUG,
  GRAPHQL_ENDPOINT_MODE: process.env.GRAPHQL_ENDPOINT_MODE,
  GRAPHQL_ENDPOINT_LOCAL: process.env.GRAPHQL_ENDPOINT_LOCAL,
  GRAPHQL_ENDPOINT_ONLINE: process.env.GRAPHQL_ENDPOINT_ONLINE,
  DEVMODE_SUCCESS_API_KEY: process.env.DEVMODE_SUCCESS_API_KEY,
});

async function testEnhancedGetTodos() {
  console.log("=== Testing Enhanced getTodos Tool ===\n");

  // Test 1: Get all TODO status todos
  console.log("Test 1: Get all TODO status todos");
  const todoResult = await getTodos({ status: "TODO", first: 5 });
  console.log(
    "Result:",
    JSON.stringify(JSON.parse(todoResult.content[0].text), null, 2)
  );
  console.log("\n");

  // Test 2: Get all COMPLETE status todos
  console.log("Test 2: Get all COMPLETE status todos");
  const completeResult = await getTodos({ status: "COMPLETE", first: 5 });
  console.log(
    "Result:",
    JSON.stringify(JSON.parse(completeResult.content[0].text), null, 2)
  );
  console.log("\n");

  // Test 3: Get all OVERDUE todos (TODO status with past due date)
  console.log("Test 3: Get all OVERDUE todos");
  const overdueResult = await getTodos({ status: "OVERDUE", first: 5 });
  console.log(
    "Result:",
    JSON.stringify(JSON.parse(overdueResult.content[0].text), null, 2)
  );
  console.log("\n");

  // Test 4: Filter by userId (replace with actual userId from your system)
  // console.log("Test 4: Get todos for specific user");
  // const userResult = await getTodos({ userId: "YOUR_USER_ID", first: 5 });
  // console.log("Result:", JSON.stringify(JSON.parse(userResult.content[0].text), null, 2));
  // console.log("\n");

  // Test 5: Filter by teamId (replace with actual teamId from your system)
  // console.log("Test 5: Get todos for specific team");
  // const teamResult = await getTodos({ teamId: "YOUR_TEAM_ID", first: 5 });
  // console.log("Result:", JSON.stringify(JSON.parse(teamResult.content[0].text), null, 2));
  // console.log("\n");

  // Test 6: Combine filters - get overdue todos for a specific user
  // console.log("Test 6: Get overdue todos for specific user");
  // const combinedResult = await getTodos({ userId: "YOUR_USER_ID", status: "OVERDUE", first: 5 });
  // console.log("Result:", JSON.stringify(JSON.parse(combinedResult.content[0].text), null, 2));
  // console.log("\n");

  // Test 7: Invalid status should return error
  console.log("Test 7: Invalid status should return error");
  const invalidResult = await getTodos({ status: "INVALID" });
  console.log("Result:", invalidResult.content[0].text);
  console.log("\n");
}

testEnhancedGetTodos().catch(console.error);
