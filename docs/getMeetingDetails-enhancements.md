# getMeetingDetails Tool Enhancements

## Overview
The `getMeetingDetails` tool has been enhanced to make it super easy to get details about the most recent **FINISHED** L10 (Level 10) meeting for a team, without needing to know the specific meeting ID.

## New Parameters

### `lastFinishedL10` (boolean, default: `false`)
When set to `true`, automatically finds and returns the most recent **FINISHED** L10 meeting for the specified team. Only returns meetings with status `"FINISHED"` (completed meetings), not scheduled or in-progress meetings.

### `teamId` (string, optional)
The team ID to find the last finished L10 meeting for. Required when `lastFinishedL10=true` unless `leadershipTeam=true`.

### `leadershipTeam` (boolean, optional)
If `true`, automatically uses the leadership team ID. Perfect shortcut for getting the last finished leadership L10 meeting.

### `meetingId` (string, now optional)
The specific meeting ID. Now optional when using `lastFinishedL10=true`.

## Usage Examples

### 🎯 Most Common Use Case: Last Finished Leadership L10
```javascript
// Get the most recent FINISHED L10 meeting for the leadership team
getMeetingDetails({ 
  lastFinishedL10: true, 
  leadershipTeam: true 
})
```

This is perfect for queries like:
- "Show me the last L10 meeting"
- "What happened in our most recent Level 10 meeting?"
- "Give me details from the last leadership meeting"

**Note:** Only returns meetings with status `"FINISHED"` - ensuring you get completed meetings with all their data, not scheduled or in-progress meetings.

### Get Last Finished L10 for a Specific Team
```javascript
// Get the most recent FINISHED L10 meeting for a specific team
getMeetingDetails({ 
  lastFinishedL10: true, 
  teamId: "team-123" 
})
```

### Traditional Usage (Still Works)
```javascript
// Get a specific meeting by ID
getMeetingDetails({ 
  meetingId: "meeting-456" 
})
```

## What It Returns

The tool returns comprehensive meeting details including:
- **Meeting Info**: Date, times, status, rating
- **Headlines**: All good news shared in the meeting
- **Todos**: All action items created
- **Issues**: All issues discussed
- **Ratings**: Meeting ratings if available

### Example Response

```json
{
  "meeting": {
    "id": "meeting-789",
    "meetingInfoId": "info-123",
    "date": "2024-10-25",
    "startTime": "09:00:00",
    "endTime": "10:30:00",
    "averageRating": 8.5,
    "status": "COMPLETED",
    "createdAt": "2024-10-25T09:00:00Z"
  },
  "headlines": [
    {
      "id": "headline-001",
      "name": "Closed major deal with ABC Corp",
      "userId": "user-123",
      "status": "Shared",
      "createdAt": "2024-10-25T09:15:00Z"
    }
  ],
  "todos": [
    {
      "id": "todo-001",
      "name": "Follow up with client on contract",
      "userId": "user-456",
      "status": "TODO",
      "dueDate": "2024-11-01",
      "createdAt": "2024-10-25T10:00:00Z"
    }
  ],
  "issues": [
    {
      "id": "issue-001",
      "name": "Hiring process taking too long",
      "userId": "user-789",
      "status": "TODO",
      "createdAt": "2024-10-25T09:45:00Z"
    }
  ]
}
```

## Benefits

### Before (Multiple Steps)
```javascript
// Step 1: Get meetings for the team
const meetings = await getMeetings({ 
  leadershipTeam: true,
  meetingAgendaType: "WEEKLY-L10",
  first: 1
})

// Step 2: Filter for finished meetings
const finishedMeetings = meetings.results.filter(m => m.status === 'FINISHED')

// Step 3: Extract meeting ID from results
const meetingId = finishedMeetings[0].id

// Step 4: Get meeting details
const details = await getMeetingDetails({ meetingId })
```

### After (One Step)
```javascript
// One simple call!
const details = await getMeetingDetails({ 
  lastFinishedL10: true, 
  leadershipTeam: true 
})
```

## How It Works

When `lastFinishedL10=true`:
1. Finds the team's L10 meeting info (WEEKLY-L10 agenda type)
2. Queries for the most recent **FINISHED** meeting for that meeting info (ordered by date descending)
3. Fetches all the comprehensive details for that meeting
4. Returns everything in one response

**Important:** Only meetings with `meetingStatusId: "FINISHED"` are returned, ensuring you get completed meetings with all action items, headlines, and issues captured.

## Error Handling

The tool provides helpful error messages:

**No L10 meeting setup:**
```json
{
  "error": "No L10 meeting found for this team",
  "teamId": "team-123",
  "suggestion": "This team may not have a Level 10 meeting set up."
}
```

**No finished meetings yet:**
```json
{
  "error": "No finished L10 meetings found for this team",
  "teamId": "team-123",
  "suggestion": "This team may not have had any completed Level 10 meetings yet, or they are still in progress."
}
```

## Use Cases

### Weekly Status Updates
```javascript
// Perfect for: "What was discussed in this week's L10?"
getMeetingDetails({ lastFinishedL10: true, leadershipTeam: true })
```

### Follow-up on Action Items
```javascript
// "What todos came out of the last meeting?"
getMeetingDetails({ lastFinishedL10: true, leadershipTeam: true })
// Then filter results.todos
```

### Meeting Analysis
```javascript
// "How did our last meeting rate?"
getMeetingDetails({ lastFinishedL10: true, leadershipTeam: true })
// Check meeting.averageRating
```

### Team-Specific Reviews
```javascript
// "Show me the last sales team L10"
getMeetingDetails({ lastFinishedL10: true, teamId: "sales-team-id" })
```

## Backward Compatibility

All existing queries continue to work exactly as before:
- `getMeetingDetails({ meetingId: "xyz" })` works the same
- New parameters are all optional with safe defaults
- No breaking changes to the API

## Smart Defaults

- `lastFinishedL10: false` - Maintains backward compatibility
- Works with `leadershipTeam` shortcut consistently
- Automatically finds WEEKLY-L10 agenda type meetings
- Filters for `meetingStatusId: "FINISHED"` to ensure completed meetings only
- Orders by date descending to get the most recent

## Why "FINISHED" Only?

By filtering for `"FINISHED"` status meetings, the tool ensures:
- ✅ All meeting data is complete (todos, issues, headlines captured)
- ✅ Meeting has been held (not just scheduled)
- ✅ Ratings and outcomes are available
- ✅ Action items have been assigned
- ❌ Doesn't return scheduled future meetings
- ❌ Doesn't return in-progress meetings

This enhancement saves the LLM (and users) significant effort by eliminating the need to chain multiple queries together when all they want is "the last meeting's details"! 🎉

