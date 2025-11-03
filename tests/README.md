# MCP Tools End-to-End Test Suite

Comprehensive testing suite for all Success.co MCP tools.

## Overview

The `e2e-all-tools.js` script provides comprehensive end-to-end testing of all MCP tools:

1. **GET/Read-Only Tools**: Tests all 21 read-only tools that fetch data
2. **Write Tools**: Tests the complete lifecycle (Create → Update → Delete) for:
   - Todos
   - Issues
   - Rocks (including Milestones)
   - Headlines
   - Comments
   - Scorecard Measurable Entries

## Prerequisites

Ensure your `.env` file is properly configured with:

```env
# Required for all tests
DEVMODE_SUCCESS_API_KEY=your-api-key-here
DEVMODE_SUCCESS_USE_API_KEY=true  # ⚠️ REQUIRED - enables API key mode for testing
NODE_ENV=development
GRAPHQL_ENDPOINT=http://localhost:5174/graphql

# Required for write operations (create/update/delete)
DB_HOST=localhost
DB_PORT=5432
DB_DATABASE=your_database
DB_USER=your_user
DB_PASS=your_password

# OR use connection string
DATABASE_URL=postgresql://user:password@host:port/database
```

⚠️ **IMPORTANT**: Tests require `DEVMODE_SUCCESS_USE_API_KEY=true` to be set in your `.env` file. 

Without this setting, API key authentication is disabled by default and tests will fail with:
```
Error: Authentication required. No valid OAuth token or API key found.
```

This is a safety feature - API key mode is only available when explicitly enabled in development mode.

## Running Tests

### Run All Tests

```bash
node tests/e2e-all-tools.js
```

### Expected Output

```
═══════════════════════════════════════════════════════════
  SUCCESS.CO MCP SERVER - END-TO-END TEST SUITE
═══════════════════════════════════════════════════════════

📖 PHASE 1: Testing GET/Read-Only Tools
───────────────────────────────────────────────────────────

✅ getTeams (Found 5 teams)
✅ getUsers (Found 12 users)
✅ getTodos (Found 24 todos)
...

═══════════════════════════════════════════════════════════

✏️  PHASE 2: Testing Write Tools (Create/Update/Delete)
───────────────────────────────────────────────────────────

🔄 Testing Todo Lifecycle (Create -> Update -> Delete)...

✅ createTodo (Created todo: abc-123)
✅ updateTodo (Updated todo: abc-123)
✅ deleteTodo (Deleted todo: abc-123)
...

═══════════════════════════════════════════════════════════
  TEST RESULTS
═══════════════════════════════════════════════════════════

Total Tests:    45
✅ Passed:      42 (93%)
❌ Failed:      0 (0%)
⏭️  Skipped:     3 (7%)

═══════════════════════════════════════════════════════════

✅ All tests passed!
```

## Test Coverage

### Read-Only Tools (21 tools)

- ✅ `getTeams` - List teams
- ✅ `getUsers` - List users
- ✅ `getTodos` - List todos with filters
- ✅ `getRocks` - List rocks with milestones
- ✅ `getMeetings` - List meetings by team
- ✅ `getIssues` - List issues with filters
- ✅ `getHeadlines` - List headlines
- ✅ `getMilestones` - List milestones
- ✅ `search` - Universal search
- ✅ `getScorecardMeasurables` - Get KPI data
- ✅ `getMeetingInfos` - List meeting configurations
- ✅ `getMeetingAgendas` - List meeting templates
- ✅ `getLeadershipVTO` - Get Vision/Traction Organizer
- ✅ `getAccountabilityChart` - Get org structure
- ✅ `getMeetingDetails` - Get detailed meeting data
- ✅ `getPeopleAnalyzerSessions` - Get people analyzer scores
- ✅ `getOrgCheckups` - Get org checkup sessions
- ✅ `getComments` - List comments
- ✅ `getExecutionHealth` - Get execution health metrics
- ✅ `getUserWorkload` - Get workload analysis
- ✅ `getCompanyInsights` - Get company insights

### Write Tools (24 operations across 8 entities)

#### Todos
- ✅ `createTodo` - Create new todo
- ✅ `updateTodo` - Update todo (name, status, description, due date)
- ✅ `deleteTodo` - Delete todo

#### Issues
- ✅ `createIssue` - Create new issue
- ✅ `updateIssue` - Update issue (name, status, priority, team, user)
- ✅ `deleteIssue` - Delete issue

#### Rocks
- ✅ `createRock` - Create new rock
- ✅ `updateRock` - Update rock (name, status, due date, teams)
- ✅ `deleteRock` - Delete rock

#### Milestones (on Rocks)
- ✅ `createMilestone` - Create milestone on rock
- ✅ `updateMilestone` - Update milestone (name, status, due date)
- ✅ `deleteMilestone` - Delete milestone

#### Headlines
- ✅ `createHeadline` - Create new headline
- ✅ `updateHeadline` - Update headline (name, status, cascading)
- ✅ `deleteHeadline` - Delete headline

#### Comments
- ✅ `createComment` - Add comment to entity
- ✅ `updateComment` - Update comment text
- ✅ `deleteComment` - Delete comment

#### Scorecard Entries
- ✅ `createScorecardMeasurableEntry` - Create/update scorecard entry
- ✅ `updateScorecardMeasurableEntry` - Update existing entry

#### Meetings
- ✅ `createMeeting` - Create new meeting instance
- ✅ `updateMeeting` - Update meeting (date, state)

## Test Features

### Automatic Data Management
- **Data Discovery**: Automatically fetches and stores IDs for teams, users, etc.
- **Cleanup**: Automatically deletes all created test items after tests complete
- **Dependency Handling**: Tests run in correct order to ensure dependencies are available

### Smart Skipping
- Tests automatically skip if required data is not available
- Example: `getMeetings` skips if no team ID found
- Skipped tests don't count as failures

### Comprehensive Lifecycle Testing
Each write tool is tested with:
1. **Create**: Verify item creation with all common parameters
2. **Update**: Verify updates work correctly
3. **Delete**: Verify deletion and cleanup

### Error Handling
- Catches and reports errors without stopping test suite
- Provides detailed error messages for debugging
- Exit code 0 for success, 1 for failures

## Troubleshooting

### "Authentication required. No valid OAuth token or API key found" errors
- **Most common cause**: Missing `DEVMODE_SUCCESS_USE_API_KEY=true` in `.env`
- API key mode is disabled by default as a safety feature
- Add `DEVMODE_SUCCESS_USE_API_KEY=true` to your `.env` file
- Ensure `NODE_ENV=development` is also set

### "No team ID available" errors
- The test requires at least one active team in the database
- Create a team using the Success.co app first

### "Failed to call [tool]" errors
- Check `.env` file configuration
- Verify GraphQL endpoint is accessible
- Ensure database credentials are correct
- Check API key is valid
- **Ensure `DEVMODE_SUCCESS_USE_API_KEY=true` is set**

### Database connection errors
- Verify database is running
- Check credentials in `.env`
- Ensure database accepts connections from localhost

### API Key errors
- Generate a valid API key in Success.co
- Add to `.env` as `DEVMODE_SUCCESS_API_KEY`
- **Add `DEVMODE_SUCCESS_USE_API_KEY=true` to enable API key mode**

## Development

### Adding New Tool Tests

To add tests for a new tool:

1. **For GET tools**: Add a test function like:
```javascript
async function testGetNewThing() {
  try {
    const result = await callTool("getNewThing", { first: 10 });
    const data = parseResult(result);
    
    if (data.results && Array.isArray(data.results)) {
      logResult("getNewThing", "pass", `Found ${data.results.length} items`);
    } else {
      logResult("getNewThing", "fail", "Invalid response format");
    }
  } catch (error) {
    logResult("getNewThing", "fail", "", error);
  }
}
```

2. **For Write tools**: Add a lifecycle test:
```javascript
async function testNewThingLifecycle() {
  console.log("\n🔄 Testing NewThing Lifecycle...\n");
  
  let createdId = null;
  
  // CREATE
  try {
    const result = await callTool("createNewThing", { name: "Test" });
    const data = parseResult(result);
    if (data.success && data.newThing.id) {
      createdId = data.newThing.id;
      createdItems.newThings.push(createdId);
      logResult("createNewThing", "pass", `Created: ${createdId}`);
    }
  } catch (error) {
    logResult("createNewThing", "fail", "", error);
    return;
  }
  
  // UPDATE
  try {
    const result = await callTool("updateNewThing", { id: createdId, name: "Updated" });
    logResult("updateNewThing", "pass", `Updated: ${createdId}`);
  } catch (error) {
    logResult("updateNewThing", "fail", "", error);
  }
  
  // DELETE
  try {
    const result = await callTool("deleteNewThing", { id: createdId });
    logResult("deleteNewThing", "pass", `Deleted: ${createdId}`);
    createdItems.newThings = createdItems.newThings.filter(id => id !== createdId);
  } catch (error) {
    logResult("deleteNewThing", "fail", "", error);
  }
}
```

3. Add the test to the main runner in `runAllTests()`

## Continuous Integration

This test suite is designed to be run in CI/CD pipelines:

```yaml
# Example GitHub Actions
- name: Run E2E Tests
  run: node tests/e2e-all-tools.js
  env:
    DEVMODE_SUCCESS_API_KEY: ${{ secrets.API_KEY }}
    GRAPHQL_ENDPOINT: ${{ secrets.GRAPHQL_ENDPOINT }}
    DATABASE_URL: ${{ secrets.DATABASE_URL }}
```

## License

Same as parent project.

