# Leadership Team Shortcut Feature

## Overview

Added a `forLeadershipTeam` boolean parameter to all endpoints that accept a `teamId` parameter. This allows the LLM to automatically use the leadership team without having to first look up all teams.

## Problem Solved

Previously, when the LLM wanted to add an issue (or perform any other operation) on the leadership team, it had to:

1. Call `getTeams` to list all teams
2. Find the team with `isLeadership: true`
3. Extract the team ID
4. Call the actual operation with the team ID

Now it can simply:

1. Call the operation with `forLeadershipTeam: true`

## Implementation

### New Helper Function

Added `getLeadershipTeamId()` function that:

- Queries the teams table for the team with `isLeadership: true`
- Returns the team ID if found
- Returns null if not found
- Includes debug logging when in development mode

### Updated Functions

The following functions now support the `forLeadershipTeam` parameter:

#### Query Functions (Read Operations)

- `getTodos` - Get todos for leadership team
- `getIssues` - Get issues for leadership team
- `getHeadlines` - Get headlines for leadership team
- `getMeetingDetails` - Get meeting details for leadership team
- `getScorecardMeasurables` - Get scorecard data for leadership team
- `getPeopleAnalyzerSessions` - Get people analyzer sessions for leadership team
- `getUsersOnTeams` - Get team membership for leadership team
- `getMeetingInfos` - Get meeting info/series for leadership team

#### Mutation Functions (Write Operations)

- `createIssue` - Create issue for leadership team
- `createRock` - Create rock for leadership team
- `createHeadline` - Create headline for leadership team
- `updateIssue` - Update issue's team to leadership team
- `updateRock` - Update rock's team to leadership team
- `updateHeadline` - Update headline's team to leadership team

## Usage Examples

### Before (Old Way)

```javascript
// Step 1: Get all teams
const teams = await getTeams({ stateId: "ACTIVE" });

// Step 2: Find leadership team
const leadershipTeam = teams.results.find((t) => t.isLeadership);

// Step 3: Create issue
const issue = await createIssue({
  name: "Important leadership issue",
  teamId: leadershipTeam.id,
  desc: "This needs attention",
});
```

### After (New Way)

```javascript
// Single step - directly create issue for leadership team
const issue = await createIssue({
  name: "Important leadership issue",
  forLeadershipTeam: true,
  desc: "This needs attention",
});
```

## Parameter Behavior

- If `forLeadershipTeam: true` is provided and no `teamId` is provided, the function will automatically look up and use the leadership team ID
- If both `teamId` and `forLeadershipTeam: true` are provided, `teamId` takes precedence (the explicit parameter wins)
- If `forLeadershipTeam: false` or not provided, behavior is unchanged from before
- If leadership team cannot be found, the function returns an error message

## Error Handling

If the leadership team lookup fails, functions return:

```json
{
  "content": [
    {
      "type": "text",
      "text": "Error: Could not find leadership team. Please ensure a team is marked as the leadership team."
    }
  ]
}
```

## Testing

Run the test file to verify the feature:

```bash
node test-leadership-team-shortcut.js
```

The test file includes:

- Getting todos for leadership team
- Getting issues for leadership team
- Getting headlines for leadership team
- Getting meeting details for leadership team
- Creating an issue for leadership team

## Benefits

1. **Reduced API Calls**: Eliminates the need for an extra `getTeams` call
2. **Simplified Logic**: LLM doesn't need to parse and filter team results
3. **Better Performance**: Fewer round trips to the API
4. **Cleaner Code**: More intuitive and readable
5. **Less Token Usage**: Reduced conversation length in LLM context
6. **Backwards Compatible**: Existing code using `teamId` continues to work

## API Documentation Updates

All affected functions' JSDoc comments have been updated to include:

- `@param {boolean} [args.forLeadershipTeam] - If true, automatically use the leadership team ID`

## Database Dependency

This feature requires database access to be configured (via `DATABASE_URL` or individual DB parameters) as it needs to query the teams table to find the leadership team.
