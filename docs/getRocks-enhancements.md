# getRocks Tool Enhancements

## Overview
The `getRocks` tool has been enhanced with two powerful new features:
1. **Automatic Milestone Inclusion** - Milestones are now included by default with each rock
2. **Smart Time Period Filtering** - Easy filtering by year or quarter with "this_year" as the default

## New Parameters

### `includeMilestones` (boolean, default: `true`)
Controls whether milestones are included in the rock response.

```javascript
// Include milestones (default behavior)
getRocks({ leadershipTeam: true })

// Exclude milestones for faster queries
getRocks({ leadershipTeam: true, includeMilestones: false })
```

### `timePeriod` (enum, default: `"this_year"`)
Filters rocks by their due date based on the selected time period.

**Options:**
- `"this_year"` (default) - Rocks due in the current calendar year
- `"current_quarter"` - Rocks due in the current quarter (Q1-Q4)
- `"previous_quarter"` - Rocks due in the previous quarter
- `"all"` - All rocks, no date filtering

```javascript
// Get this year's rocks (default)
getRocks({ leadershipTeam: true })

// Get rocks for the current quarter
getRocks({ leadershipTeam: true, timePeriod: "current_quarter" })

// Get rocks from the previous quarter
getRocks({ leadershipTeam: true, timePeriod: "previous_quarter" })

// Get all rocks regardless of due date
getRocks({ leadershipTeam: true, timePeriod: "all" })
```

## Response Format

The response now includes:
- `timePeriod` - Which time period was used for filtering
- `milestones` - Array of milestones for each rock (when `includeMilestones=true`)

### Example Response

```json
{
  "totalCount": 5,
  "timePeriod": "this_year",
  "results": [
    {
      "id": "rock-123",
      "name": "Launch New Product",
      "description": "Launch our new SaaS product by Q4",
      "status": "ONTRACK",
      "type": "company",
      "dueDate": "2024-12-31",
      "createdAt": "2024-01-15T10:00:00Z",
      "statusUpdatedAt": "2024-10-15T14:30:00Z",
      "userId": "user-456",
      "teamIds": ["team-789"],
      "milestones": [
        {
          "id": "milestone-001",
          "name": "Complete Beta Testing",
          "dueDate": "2024-11-15",
          "userId": "user-456",
          "status": "TODO",
          "createdAt": "2024-01-15T10:05:00Z"
        },
        {
          "id": "milestone-002",
          "name": "Marketing Materials Ready",
          "dueDate": "2024-12-01",
          "userId": "user-789",
          "status": "COMPLETE",
          "createdAt": "2024-01-15T10:10:00Z"
        }
      ]
    }
  ]
}
```

## Use Cases

### View Progress on This Year's Rocks
```javascript
getRocks({ 
  leadershipTeam: true,
  timePeriod: "this_year"
})
```
Perfect for annual reviews, year-end planning, or seeing all the rocks and their milestones for the current year.

### Focus on Current Quarter Execution
```javascript
getRocks({ 
  leadershipTeam: true,
  timePeriod: "current_quarter"
})
```
Great for quarterly planning sessions, weekly status meetings, or tracking 90-day priorities.

### Review Previous Quarter Performance
```javascript
getRocks({ 
  leadershipTeam: true,
  timePeriod: "previous_quarter",
  status: "COMPLETE"
})
```
Ideal for retrospectives, quarterly reviews, or analyzing what was accomplished last quarter.

### Get Rocks Without Milestones (Performance)
```javascript
getRocks({ 
  leadershipTeam: true,
  includeMilestones: false
})
```
Use when you only need a quick list of rocks without the extra milestone data - faster queries.

## Smart Defaults

The tool uses smart defaults to provide the most useful data:
- **`timePeriod: "this_year"`** - Most teams want to see their current year's rocks
- **`includeMilestones: true`** - Milestones provide valuable context on rock progress
- **`first: 50`** - Reasonable page size for most queries

These defaults mean you can simply call:
```javascript
getRocks({ leadershipTeam: true })
```

And get this year's rocks with all their milestones - the most common use case!

## Backward Compatibility

All existing queries continue to work exactly as before. The new parameters are optional with sensible defaults, so:
- Existing calls without `timePeriod` automatically filter to "this_year" (likely the desired behavior)
- Existing calls without `includeMilestones` now get milestones included (added value)
- If you want the old behavior of no date filtering, use `timePeriod: "all"`

## Quarter Calculation

Quarters are calculated using standard calendar quarters:
- **Q1**: January 1 - March 31
- **Q2**: April 1 - June 30
- **Q3**: July 1 - September 30
- **Q4**: October 1 - December 31

The "previous_quarter" automatically handles year boundaries (e.g., Q4 2023 when it's Q1 2024).

