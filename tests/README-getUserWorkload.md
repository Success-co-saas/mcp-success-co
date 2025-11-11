# getUserWorkload Test Documentation

## Overview
The `getUserWorkload` tool retrieves workload analysis by user, showing counts of open rocks, issues, and todos. This test suite ensures the tool works correctly with various parameter combinations.

## Test Cases

### Test 1: Basic Usage (No Parameters)
**Purpose:** Verify that the tool returns workload data for all users in the system when no filters are applied.

**Expected Result:**
- Returns workload data for all active users
- Includes summary statistics (totalUsers, totalItems, avgItemsPerUser, etc.)
- Each user has detailed counts for rocks, issues, and todos

---

### Test 2: With Specific teamId
**Purpose:** Verify that filtering by a specific team returns only users from that team.

**Parameters:**
```javascript
{ teamId: "some-team-id" }
```

**Expected Result:**
- Returns workload data only for users on the specified team
- Total users should be ≤ all users in the system

---

### Test 3: With leadershipTeam Flag
**Purpose:** Verify the shortcut parameter for filtering by the leadership team.

**Parameters:**
```javascript
{ leadershipTeam: true }
```

**Expected Result:**
- Automatically finds and uses the leadership team ID
- Returns workload data only for leadership team members
- If no leadership team exists, returns appropriate error message

---

### Test 4: With Specific userId
**Purpose:** Verify that filtering by a specific user returns data for only that user.

**Parameters:**
```javascript
{ userId: "some-user-id" }
```

**Expected Result:**
- Returns workload data for exactly 1 user
- Summary shows totalUsers = 1
- User's workload includes their rocks, issues, and todos

---

### Test 5: With currentUser Flag ⭐ **BUG FIX TEST**
**Purpose:** Verify the bug fix where `currentUser=true` was returning all users instead of just the current user.

**Parameters:**
```javascript
{ currentUser: true }
```

**Expected Result:**
- In OAuth mode: Returns workload data for exactly 1 user (the authenticated user)
- In API key mode: Returns error message requiring OAuth authentication
- **CRITICAL:** Must return totalUsers = 1, not all users

**Bug History:**
- **Before fix:** The `users` query fetched all active users without filtering by userId, causing the function to return workload data for all users (with 0 counts for everyone except the current user)
- **After fix:** Added `userIdFilter` to the users query to filter by the current user's ID

---

### Test 6: Combined teamId and userId
**Purpose:** Verify that multiple filters can be combined successfully.

**Parameters:**
```javascript
{ teamId: "some-team-id", userId: "some-user-id" }
```

**Expected Result:**
- Returns workload data for the specific user
- Items are filtered to only those associated with the specified team

---

### Test 7: Workload Accuracy Validation
**Purpose:** Verify that all workload calculations are mathematically correct.

**Validations:**
1. Each user's `totalItems` equals `rocksCount + issuesCount + todosCount`
2. Summary `totalItems` equals sum of all users' `totalItems`
3. Overloaded users count is accurate (users with > 1.5x average items)
4. Average items per user calculation is correct

---

## Running the Tests

```bash
# Run the test suite
node tests/test-getUserWorkload.js
```

### Environment Requirements
The tests require the following environment variables (in `.env` file):
- `DEVMODE_SUCCESS_API_KEY` - API key for authentication
- `DEVMODE_SUCCESS_USE_API_KEY=true` - Enable API key mode
- `NODE_ENV=development` - Required for API key mode
- `GRAPHQL_ENDPOINT` - GraphQL endpoint URL
- `DB_*` - Database connection credentials

---

## Test Output

The test suite provides detailed output including:
- ✅/❌ Pass/fail status for each test
- Test summary with total, passed, failed counts
- Success rate percentage
- Detailed error messages for failed tests

Example output:
```
=== Test 5: With currentUser flag ===
✅ getUserWorkload (currentUser): Retrieved workload for current user with 15 total items
   Current user: John Doe (john@example.com)
   Rocks: 3, Issues: 7, Todos: 5
```

---

## Known Issues & Edge Cases

1. **OAuth vs API Key Mode:** The `currentUser` parameter only works in OAuth mode. In API key mode, it correctly returns an error.

2. **Empty Teams:** If a team has no users, the combined test may skip with an "expected edge case" message.

3. **No Leadership Team:** If no team is marked as the leadership team, the leadershipTeam test will pass with an appropriate message.

---

## Version History

- **v1.0** - Initial test suite with 6 tests
- **v1.1** - Added Test 5 (currentUser flag) to verify bug fix for user filtering

