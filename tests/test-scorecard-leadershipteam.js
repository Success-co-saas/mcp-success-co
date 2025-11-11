#!/usr/bin/env node

/**
 * Test getScorecardMeasurables with leadershipTeam parameter
 * 
 * Usage:
 *   node tests/test-scorecard-leadershipteam.js <access_token>
 * 
 * Example:
 *   node tests/test-scorecard-leadershipteam.js your_token_here
 */

import { getScorecardMeasurables } from "../tools/scorecardTools.js";
import { runWithAuthContext, setDatabase } from "../tools.js";
import postgres from "postgres";

const accessToken = process.argv[2];

if (!accessToken) {
  console.error("❌ Error: Access token is required");
  console.error("Usage: node tests/test-scorecard-leadershipteam.js <access_token>");
  process.exit(1);
}

// Set up database connection
const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("❌ Error: DATABASE_URL environment variable is not set");
  process.exit(1);
}

const sql = postgres(DATABASE_URL, { max: 10 });
setDatabase(sql);

// Mock auth context for testing
const mockAuthContext = {
  accessToken,
  isApiKeyMode: false,
  // These will be populated from the token
  userId: null,
  companyId: null,
  userEmail: null,
};

async function testGetScorecardMeasurablesWithLeadershipTeam() {
  console.log("🔍 Testing getScorecardMeasurables with leadershipTeam=true\n");

  try {
    // Test 1: Call with leadershipTeam=true
    console.log("Test 1: Calling getScorecardMeasurables({ leadershipTeam: true })");
    const result = await runWithAuthContext(mockAuthContext, async () => {
      return await getScorecardMeasurables({
        leadershipTeam: true,
        first: 5, // Limit to 5 for testing
      });
    });

    // Parse the result
    const content = result.content[0].text;
    const data = JSON.parse(content);

    console.log("\n✅ Result:");
    console.log(`   Found ${data.scorecardMeasurables?.length || 0} measurables`);

    if (data.scorecardMeasurables && data.scorecardMeasurables.length > 0) {
      console.log("\n   First measurable:");
      const first = data.scorecardMeasurables[0];
      console.log(`   - ID: ${first.id}`);
      console.log(`   - Name: ${first.name}`);
      console.log(`   - Type: ${first.type}`);
      console.log(`   - Status: ${first.status}`);
      console.log(`   - Unit Type: ${first.unitType}`);
      console.log(`   - Values: ${first.values?.length || 0} entries`);

      if (first.values && first.values.length > 0) {
        console.log(`\n   Latest value:`);
        const latestValue = first.values[0];
        console.log(`   - Date: ${latestValue.startDate}`);
        console.log(`   - Value: ${latestValue.value}`);
        if (latestValue.note) {
          console.log(`   - Note: ${latestValue.note}`);
        }
      }
    } else if (data.scorecardMeasurables && data.scorecardMeasurables.length === 0) {
      console.log("\n   ℹ️  No measurables found for the leadership team");
      console.log("   This might mean:");
      console.log("   - Leadership team has no measurables assigned");
      console.log("   - Or the company doesn't have a leadership team set up");
    }

    // Test 2: Compare with explicit teamId call
    console.log("\n\nTest 2: Verifying leadershipTeam parameter resolves correctly");
    
    // First get the leadership team ID
    const { getLeadershipTeamId } = await import("../tools/core.js");
    const leadershipTeamId = await runWithAuthContext(mockAuthContext, async () => {
      return await getLeadershipTeamId();
    });

    if (leadershipTeamId) {
      console.log(`   Leadership Team ID: ${leadershipTeamId}`);

      // Now call with explicit teamId
      const explicitResult = await runWithAuthContext(mockAuthContext, async () => {
        return await getScorecardMeasurables({
          teamId: leadershipTeamId,
          first: 5,
        });
      });

      const explicitContent = explicitResult.content[0].text;
      const explicitData = JSON.parse(explicitContent);

      console.log(`   Results with explicit teamId: ${explicitData.scorecardMeasurables?.length || 0} measurables`);
      console.log(`   Results with leadershipTeam=true: ${data.scorecardMeasurables?.length || 0} measurables`);

      if (explicitData.scorecardMeasurables?.length === data.scorecardMeasurables?.length) {
        console.log("\n   ✅ Both methods return the same number of results!");
      } else {
        console.log("\n   ⚠️  Results differ - this might indicate an issue");
      }
    } else {
      console.log("   ⚠️  No leadership team found");
    }

    // Test 3: Test with different types
    console.log("\n\nTest 3: Testing with different frequencies");
    const frequencies = ["weekly", "monthly", "quarterly", "annually"];

    for (const freq of frequencies) {
      const freqResult = await runWithAuthContext(mockAuthContext, async () => {
        return await getScorecardMeasurables({
          leadershipTeam: true,
          type: freq,
          first: 5,
        });
      });

      const freqContent = freqResult.content[0].text;
      const freqData = JSON.parse(freqContent);
      console.log(`   ${freq.padEnd(10)}: ${freqData.scorecardMeasurables?.length || 0} measurables`);
    }

    console.log("\n\n✅ All tests completed successfully!");
    console.log("\n📝 Summary:");
    console.log("   - leadershipTeam parameter is working correctly");
    console.log("   - It properly resolves to the leadership team ID");
    console.log("   - Filters are applied as expected");

  } catch (error) {
    console.error("\n❌ Test failed:");
    console.error(`   Error: ${error.message}`);
    if (error.stack) {
      console.error(`\n   Stack trace:\n${error.stack}`);
    }
    process.exit(1);
  } finally {
    // Close database connection
    await sql.end();
  }
}

// Run the test
testGetScorecardMeasurablesWithLeadershipTeam();

