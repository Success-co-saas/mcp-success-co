#!/usr/bin/env node

/**
 * Test the getTodos date filter bug fix (createdAfter + createdBefore)
 * 
 * This test verifies that combining createdAfter and createdBefore parameters
 * works correctly after fixing the duplicate GraphQL field bug.
 */

import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { getTodos, init } from "../tools.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "..", ".env") });

// Initialize tools with environment config
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

async function testTodosDateFilters() {
  console.log("=== Testing getTodos Date Filters (Bug Fix) ===\n");

  // Test 1: createdAfter only
  console.log("Test 1: Filter by createdAfter only");
  try {
    const result1 = await getTodos({
      createdAfter: "2025-11-01T00:00:00Z",
      status: "ALL",
      first: 5,
    });
    const data1 = JSON.parse(result1.content[0].text);
    console.log("✓ Success - Found", data1.summary.totalCount, "todos");
    console.log("  Sample results:", data1.results.slice(0, 2).map(t => ({
      id: t.id,
      name: t.name,
      createdAt: t.createdAt,
    })));
  } catch (error) {
    console.log("✗ Failed:", error.message);
  }
  console.log("\n");

  // Test 2: createdBefore only
  console.log("Test 2: Filter by createdBefore only");
  try {
    const result2 = await getTodos({
      createdBefore: "2025-11-15T23:59:59Z",
      status: "ALL",
      first: 5,
    });
    const data2 = JSON.parse(result2.content[0].text);
    console.log("✓ Success - Found", data2.summary.totalCount, "todos");
    console.log("  Sample results:", data2.results.slice(0, 2).map(t => ({
      id: t.id,
      name: t.name,
      createdAt: t.createdAt,
    })));
  } catch (error) {
    console.log("✗ Failed:", error.message);
  }
  console.log("\n");

  // Test 3: Both createdAfter and createdBefore (THIS WAS THE BUG)
  console.log("Test 3: Filter by both createdAfter AND createdBefore (BUG FIX)");
  try {
    const result3 = await getTodos({
      createdAfter: "2025-11-10T00:00:00Z",
      createdBefore: "2025-11-16T23:59:59Z",
      status: "ALL",
      first: 200,
    });
    const data3 = JSON.parse(result3.content[0].text);
    console.log("✓ Success - Found", data3.summary.totalCount, "todos");
    console.log("  Summary:", {
      total: data3.summary.totalCount,
      todo: data3.summary.todoCount,
      complete: data3.summary.completeCount,
      overdue: data3.summary.overdueCount,
    });
    console.log("  Sample results:", data3.results.slice(0, 3).map(t => ({
      id: t.id,
      name: t.name.substring(0, 50),
      status: t.status,
      createdAt: t.createdAt,
    })));
  } catch (error) {
    console.log("✗ Failed:", error.message);
  }
  console.log("\n");

  // Test 4: Combine date filter with fromMeetings (ORIGINAL FAILING CASE)
  console.log("Test 4: Filter with date range AND fromMeetings=true (ORIGINAL BUG)");
  try {
    const result4 = await getTodos({
      fromMeetings: true,
      status: "ALL",
      createdAfter: "2025-11-10T00:00:00Z",
      createdBefore: "2025-11-16T23:59:59Z",
      first: 200,
    });
    const data4 = JSON.parse(result4.content[0].text);
    console.log("✓ Success - Found", data4.summary.totalCount, "meeting todos");
    console.log("  Summary:", {
      total: data4.summary.totalCount,
      todo: data4.summary.todoCount,
      complete: data4.summary.completeCount,
    });
    console.log("  Sample results:", data4.results.slice(0, 3).map(t => ({
      id: t.id,
      name: t.name.substring(0, 50),
      status: t.status,
      meetingId: t.meetingId,
      createdAt: t.createdAt,
    })));
  } catch (error) {
    console.log("✗ Failed:", error.message);
  }
  console.log("\n");

  // Test 5: completedAfter only
  console.log("Test 5: Filter by completedAfter only");
  try {
    const result5 = await getTodos({
      completedAfter: "2025-11-01T00:00:00Z",
      first: 5,
    });
    const data5 = JSON.parse(result5.content[0].text);
    console.log("✓ Success - Found", data5.summary.totalCount, "completed todos");
    console.log("  Sample results:", data5.results.slice(0, 2).map(t => ({
      id: t.id,
      name: t.name.substring(0, 50),
      status: t.status,
      statusUpdatedAt: t.statusUpdatedAt,
    })));
  } catch (error) {
    console.log("✗ Failed:", error.message);
  }
  console.log("\n");

  // Test 6: completedBefore only
  console.log("Test 6: Filter by completedBefore only");
  try {
    const result6 = await getTodos({
      completedBefore: "2025-11-15T23:59:59Z",
      first: 5,
    });
    const data6 = JSON.parse(result6.content[0].text);
    console.log("✓ Success - Found", data6.summary.totalCount, "completed todos");
    console.log("  Sample results:", data6.results.slice(0, 2).map(t => ({
      id: t.id,
      name: t.name.substring(0, 50),
      status: t.status,
      statusUpdatedAt: t.statusUpdatedAt,
    })));
  } catch (error) {
    console.log("✗ Failed:", error.message);
  }
  console.log("\n");

  // Test 7: Both completedAfter and completedBefore (WOULD HAVE SAME BUG)
  console.log("Test 7: Filter by both completedAfter AND completedBefore");
  try {
    const result7 = await getTodos({
      completedAfter: "2025-11-01T00:00:00Z",
      completedBefore: "2025-11-15T23:59:59Z",
      first: 10,
    });
    const data7 = JSON.parse(result7.content[0].text);
    console.log("✓ Success - Found", data7.summary.totalCount, "completed todos");
    console.log("  Sample results:", data7.results.slice(0, 2).map(t => ({
      id: t.id,
      name: t.name.substring(0, 50),
      status: t.status,
      statusUpdatedAt: t.statusUpdatedAt,
    })));
  } catch (error) {
    console.log("✗ Failed:", error.message);
  }
  console.log("\n");

  console.log("=== All Date Filter Tests Completed ===");
}

testTodosDateFilters().catch(console.error);

