# getMeetings Tool Update

## Summary

Updated the `getMeetings` tool to remove the `meetingInfoId` parameter and add support for `meetingAgendaId` and `meetingAgendaType` parameters instead.

## Changes Made

### 1. Parameter Changes in `tools.js`

**Removed:**

- `meetingInfoId` - Filter by meeting info ID (recurring meeting series)

**Added:**

- `meetingAgendaId` - Filter by meeting agenda ID
- `meetingAgendaType` - Filter by meeting agenda type

**Important Constraint:** Only one of `meetingAgendaId` or `meetingAgendaType` can be provided at a time, not both.

### 2. Updated Function Signature (tools.js:999)

```javascript
export async function getMeetings(args) {
  const {
    first,
    offset,
    stateId = "ACTIVE",
    teamId: providedTeamId,
    forLeadershipTeam = false,
    meetingAgendaId,      // NEW
    meetingAgendaType,    // NEW
    dateAfter,
    dateBefore,
  } = args;
```

### 3. Added Validation (tools.js:1013-1023)

Added validation to ensure only one of the new parameters is provided:

```javascript
// Validate that only one of meetingAgendaId or meetingAgendaType is provided
if (meetingAgendaId && meetingAgendaType) {
  return {
    content: [
      {
        type: "text",
        text: "Error: Only one of meetingAgendaId or meetingAgendaType can be provided, not both.",
      },
    ],
  };
}
```

### 4. Updated Filtering Logic (tools.js:1117-1133)

Replaced the `meetingInfoId` filter with the new agenda filters:

```javascript
// Add meetingAgendaId filter if provided
if (meetingAgendaId) {
  filterItems.push(`meetingAgendaId: {equalTo: "${meetingAgendaId}"}`);
}

// Add meetingAgendaType filter if provided
if (meetingAgendaType) {
  filterItems.push(`meetingAgendaType: {equalTo: "${meetingAgendaType}"}`);
}
```

### 5. Updated Tool Definition in `mcp-server.js` (lines 258-323)

**Updated handler parameters:**

```javascript
handler: async({
  first,
  offset,
  teamId,
  forLeadershipTeam,
  meetingAgendaId, // NEW
  meetingAgendaType, // NEW
  dateAfter,
  dateBefore,
});
```

**Updated schema:**

```javascript
meetingAgendaId: z
  .string()
  .optional()
  .describe(
    "Filter by meeting agenda ID (only one of meetingAgendaId or meetingAgendaType can be used)"
  ),
meetingAgendaType: z
  .string()
  .optional()
  .describe(
    "Filter by meeting agenda type (only one of meetingAgendaId or meetingAgendaType can be used)"
  ),
```

**Updated description:**

```
"List Success.co meetings. IMPORTANT: Either teamId or forLeadershipTeam is REQUIRED.
Use forLeadershipTeam=true to automatically filter by the leadership team.
Supports filtering by team, meeting agenda, and dates.
Note: Only one of meetingAgendaId or meetingAgendaType can be used."
```

## Usage Examples

### Example 1: Filter by Meeting Agenda ID

```javascript
await getMeetings({
  teamId: "team-123",
  meetingAgendaId: "agenda-456",
  first: 10,
});
```

### Example 2: Filter by Meeting Agenda Type

```javascript
await getMeetings({
  forLeadershipTeam: true,
  meetingAgendaType: "L10",
  dateAfter: "2024-01-01",
});
```

### Example 3: Invalid - Both Parameters (Will Error)

```javascript
await getMeetings({
  teamId: "team-123",
  meetingAgendaId: "agenda-456",
  meetingAgendaType: "L10", // ❌ ERROR: Cannot use both
  first: 10,
});

// Returns: "Error: Only one of meetingAgendaId or meetingAgendaType can be provided, not both."
```

### Example 4: Normal Query Without Agenda Filters

```javascript
await getMeetings({
  teamId: "team-123",
  dateAfter: "2024-10-01",
  dateBefore: "2024-10-31",
  first: 20,
});
```

## Backward Compatibility

⚠️ **Breaking Change**: This update removes the `meetingInfoId` parameter. Any code or tools using `meetingInfoId` will need to be updated to use `meetingAgendaId` or `meetingAgendaType` instead.

## Benefits

1. **Better Filtering**: Allows filtering by agenda type (e.g., "L10", "Weekly") in addition to specific agenda IDs
2. **Clearer Intent**: Agenda-based filtering is more intuitive than info-based filtering
3. **Validation**: Prevents conflicting filter parameters
4. **Flexibility**: Supports both specific agenda IDs and broader type-based filtering

## Related Changes

- Updated JSDoc comments in `tools.js`
- Updated tool schema and description in `mcp-server.js`
- Added validation logic to prevent parameter conflicts
- Updated comments in filtering logic

## Testing

The changes have been validated for:

- ✅ Correct parameter extraction
- ✅ Validation logic (rejects both parameters together)
- ✅ GraphQL query construction with new filters
- ✅ No linter errors
- ✅ Proper error messages

## Files Modified

1. `/Users/topper/dev/success.co/mcp-success-co/tools.js`

   - Function signature (line 999)
   - JSDoc comments (lines 986-998)
   - Validation logic (lines 1013-1023)
   - Filtering logic (lines 1117-1133)

2. `/Users/topper/dev/success.co/mcp-success-co/mcp-server.js`
   - Tool description (line 260)
   - Handler parameters (lines 262-270)
   - Handler call (lines 272-281)
   - Schema definitions (lines 297-308)
