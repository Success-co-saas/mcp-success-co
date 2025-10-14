# Leadership Team Quick Reference

## TL;DR

Instead of calling `getTeams()` to find the leadership team, just use `forLeadershipTeam: true` in any function that accepts a `teamId`.

## Quick Examples

### Creating an Issue for Leadership Team

```javascript
// ❌ OLD WAY (2 steps)
const teams = await getTeams({});
const leadershipTeam = teams.results.find((t) => t.isLeadership);
await createIssue({ name: "Issue", teamId: leadershipTeam.id });

// ✅ NEW WAY (1 step)
await createIssue({ name: "Issue", forLeadershipTeam: true });
```

### Getting Leadership Team Todos

```javascript
// ❌ OLD WAY
const teams = await getTeams({});
const leadershipTeam = teams.results.find((t) => t.isLeadership);
await getTodos({ teamId: leadershipTeam.id });

// ✅ NEW WAY
await getTodos({ forLeadershipTeam: true });
```

### Getting Leadership Meeting Details

```javascript
// ❌ OLD WAY
const teams = await getTeams({});
const leadershipTeam = teams.results.find((t) => t.isLeadership);
await getMeetingDetails({ teamId: leadershipTeam.id });

// ✅ NEW WAY
await getMeetingDetails({ forLeadershipTeam: true });
```

## Functions Supporting forLeadershipTeam

All these functions now accept `forLeadershipTeam: true`:

### Read/Query Functions

- `getTodos({ forLeadershipTeam: true })`
- `getIssues({ forLeadershipTeam: true })`
- `getHeadlines({ forLeadershipTeam: true })`
- `getMeetingDetails({ forLeadershipTeam: true })`
- `getScorecardMeasurables({ forLeadershipTeam: true })`
- `getPeopleAnalyzerSessions({ forLeadershipTeam: true })`
- `getUsersOnTeams({ forLeadershipTeam: true })`
- `getMeetingInfos({ forLeadershipTeam: true })`

### Write/Mutation Functions

- `createIssue({ name: "...", forLeadershipTeam: true })`
- `createRock({ name: "...", dueDate: "...", forLeadershipTeam: true })`
- `createHeadline({ name: "...", forLeadershipTeam: true })`
- `updateIssue({ issueId: "...", forLeadershipTeam: true })`
- `updateRock({ rockId: "...", forLeadershipTeam: true })`
- `updateHeadline({ headlineId: "...", forLeadershipTeam: true })`

## When to Use

Use `forLeadershipTeam: true` whenever:

- User says "leadership team", "leadership", "L10", "executive team"
- User asks about "the leadership meeting", "our L10 meeting"
- User wants to "add an issue to leadership", "create a leadership rock"
- Context clearly indicates leadership vs departmental teams

## Combining with Other Parameters

You can combine `forLeadershipTeam` with other filters:

```javascript
// Get last week's leadership meeting headlines
await getMeetingDetails({
  forLeadershipTeam: true,
  dateAfter: "2025-10-07",
  dateBefore: "2025-10-14",
});

// Get open leadership issues
await getIssues({
  forLeadershipTeam: true,
  status: "OPEN",
});

// Get this week's leadership todos
await getTodos({
  forLeadershipTeam: true,
  createdAfter: "2025-10-07",
});
```

## Error Handling

If no leadership team is found, you'll get a clear error:

```
"Error: Could not find leadership team. Please ensure a team is marked as the leadership team."
```

This typically means the database doesn't have a team with `isLeadership: true`.

## Technical Notes

- The parameter is optional and defaults to `false`
- If both `teamId` and `forLeadershipTeam: true` are provided, `teamId` wins
- Uses the `getLeadershipTeamId()` helper internally
- Requires database access to be configured
- Only queries once per call (no caching across calls)
