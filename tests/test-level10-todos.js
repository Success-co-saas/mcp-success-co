#!/usr/bin/env node

/**
 * MCP Client to fetch open to-dos from Level 10 meetings
 */

const MCP_SERVER_URL = "http://localhost:3001/mcp";

async function callMCPTool(toolName, args = {}) {
  try {
    const toolResponse = await fetch(MCP_SERVER_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: Date.now(),
        method: "tools/call",
        params: {
          name: toolName,
          arguments: args,
        },
      }),
    });

    if (!toolResponse.ok) {
      throw new Error(`HTTP error! status: ${toolResponse.status}`);
    }

    const toolResult = await toolResponse.json();

    if (toolResult.error) {
      throw new Error(`Tool error: ${JSON.stringify(toolResult.error)}`);
    }

    return toolResult.result;
  } catch (error) {
    console.error(`Error calling ${toolName}:`, error.message);
    throw error;
  }
}

async function main() {
  console.log("=".repeat(80));
  console.log("QUERY: List all of my open to-dos from our Level 10 meetings");
  console.log("=".repeat(80));
  console.log();

  try {
    // Step 1: Get todos linked to meetings (Level 10 meetings) using the new parameter
    console.log("Step 1: Fetching to-dos from Level 10 meetings...");
    const todosResult = await callMCPTool("getTodos", {
      fromMeetings: true,
    });

    let level10Todos = [];
    let totalCount = 0;
    if (todosResult.content && todosResult.content.length > 0) {
      const todosText = todosResult.content[0].text;
      try {
        const parsedData = JSON.parse(todosText);
        // The data is wrapped in an object with results array
        level10Todos = Array.isArray(parsedData)
          ? parsedData
          : parsedData.results || parsedData.todos || [];
        totalCount = parsedData.totalCount || level10Todos.length;
      } catch (e) {
        console.error("Error parsing todos:", e.message);
        console.error("Todos text:", todosText.substring(0, 200));
      }
    }
    console.log(
      `✓ Found ${level10Todos.length} Level 10 todos (all statuses)\n`
    );

    // Debug: Show status breakdown
    const statusCounts = {};
    level10Todos.forEach((todo) => {
      statusCounts[todo.status] = (statusCounts[todo.status] || 0) + 1;
    });
    console.log("  Status breakdown:", statusCounts);
    console.log();

    // Step 2: Filter for open todos - any status that's not COMPLETE
    console.log("Step 2: Filtering for open to-dos...");
    const openLevel10Todos = level10Todos.filter((todo) => {
      return todo.status !== "COMPLETE";
    });

    console.log(
      `✓ Found ${openLevel10Todos.length} open to-dos from Level 10 meetings\n`
    );

    // Step 3: Display results
    console.log("=".repeat(80));
    console.log("OPEN TO-DOS FROM LEVEL 10 MEETINGS");
    console.log("=".repeat(80));
    console.log();

    if (openLevel10Todos.length === 0) {
      console.log("No open to-dos found from Level 10 meetings.");
    } else {
      openLevel10Todos.forEach((todo, index) => {
        console.log(`${index + 1}. ${todo.name}`);
        console.log(`   Status: ${todo.status}`);
        console.log(`   Type: ${todo.type}`);
        console.log(`   Priority: ${todo.priority}`);
        console.log(`   Due Date: ${todo.dueDate || "Not set"}`);
        console.log(`   Meeting ID: ${todo.meetingId}`);
        console.log(`   Owner ID: ${todo.userId}`);

        if (todo.description && todo.description.trim() !== "") {
          // Strip HTML tags for cleaner output
          const cleanDesc = todo.description
            .replace(/<[^>]*>/g, "")
            .trim()
            .substring(0, 150);
          if (cleanDesc) {
            console.log(
              `   Description: ${cleanDesc}${
                cleanDesc.length >= 150 ? "..." : ""
              }`
            );
          }
        }
        console.log();
      });

      // Summary
      console.log("=".repeat(80));
      console.log("SUMMARY");
      console.log("=".repeat(80));
      console.log(
        `Total open to-dos from Level 10 meetings: ${openLevel10Todos.length}`
      );

      // Group by status
      const byStatus = {};
      openLevel10Todos.forEach((todo) => {
        byStatus[todo.status] = (byStatus[todo.status] || 0) + 1;
      });
      console.log("\nBy Status:");
      Object.entries(byStatus).forEach(([status, count]) => {
        console.log(`  ${status}: ${count}`);
      });

      // Group by meeting ID
      const byMeeting = {};
      openLevel10Todos.forEach((todo) => {
        const meetingId = todo.meetingId || "No Meeting";
        byMeeting[meetingId] = (byMeeting[meetingId] || 0) + 1;
      });
      console.log("\nBy Meeting ID:");
      Object.entries(byMeeting).forEach(([meetingId, count]) => {
        console.log(`  ${meetingId}: ${count}`);
      });
    }
  } catch (error) {
    console.error("\n❌ Failed to execute query:", error.message);
    process.exit(1);
  }
}

main();
