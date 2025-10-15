# Analytics Capabilities

This document shows how an AI can answer analytical questions using the MCP tools.

## Enhanced getRocks Tool

The `getRocks` tool has been enhanced to include:

- **userId**: The ID of the user who owns the rock
- **teamIds**: Array of team IDs associated with the rock
- **New filters**: Can now filter by `userId` and `teamId`

This enables accountability and team performance analysis.

## Questions the AI Can Now Answer

### 1. "Based on current scorecard trends, which KPIs might miss target next quarter?"

**Tools needed:**

- `getScorecardMeasurables` (with `type` and `periods` parameters)

**How the AI does it:**

1. Call `getScorecardMeasurables` with appropriate timeframe (e.g., `type: "weekly", periods: 13`)
2. For each KPI, analyze the `values` array to calculate trends:
   - Compare recent values vs historical
   - Calculate velocity/slope
   - Check current value against `goalTarget`
   - Consider `unitComparison` (GREATER_THAN, LESS_THAN, EQUAL_TO)
3. Identify KPIs where:
   - Current value is below goal AND trending downward (for GREATER_THAN goals)
   - Current value is above goal AND trending upward (for LESS_THAN goals)
   - Value is deviating from goal (for EQUAL_TO goals)

**Example approach:**

```
For KPI "Customer Satisfaction Score":
- Goal: 95 (GREATER_THAN)
- Recent 4 weeks: [88, 87, 85, 84]
- Trend: Declining at ~1 point per week
- Projection: Will reach ~80 next quarter
- Verdict: AT RISK ⚠️
```

---

### 2. "Which teams have the strongest execution based on Rocks and To-Do completion?"

**Tools needed:**

- `getTeams`
- `getRocks` (with `teamId` filter)
- `getTodos` (with `teamId` filter)

**How the AI does it:**

1. Call `getTeams` to get all teams
2. For each team:
   - Call `getRocks` with `teamId` filter
   - Calculate rock completion rate: `COMPLETE / (COMPLETE + ONTRACK + OFFTRACK + INCOMPLETE)`
   - Call `getTodos` with `teamId` filter
   - Calculate todo completion rate: `COMPLETE / (COMPLETE + TODO + OVERDUE)`
3. Calculate weighted execution score (e.g., 60% rocks + 40% todos)
4. Rank teams by execution score

**Example output:**

```
Team Rankings (by Execution Score):
1. Engineering: 92% (Rocks: 95%, Todos: 88%)
2. Sales: 87% (Rocks: 90%, Todos: 82%)
3. Marketing: 78% (Rocks: 75%, Todos: 82%)
4. Operations: 65% (Rocks: 60%, Todos: 72%)
```

---

### 3. "Correlate Rock completion rate with meeting scores."

**Tools needed:**

- `getRocks` (optionally with `teamId` filter)
- `getMeetings` or `getMeetingDetails`

**How the AI does it:**

1. Call `getRocks` to get all rocks with `statusUpdatedAt` and `createdAt`
2. Call `getMeetingDetails` with date ranges to get meetings with `averageRating`
3. Group data by time period (e.g., by month):
   - For each month:
     - Count rocks completed (using `statusUpdatedAt` where `status: "COMPLETE"`)
     - Count total rocks (using `createdAt`)
     - Calculate completion rate
     - Calculate average meeting rating
4. Calculate Pearson correlation coefficient between completion rates and meeting scores
5. Identify months with high/low correlation

**Example output:**

```
Rock Completion vs Meeting Scores (Last 6 Months):

Month       | Rock Rate | Avg Meeting |
------------|-----------|-------------|
2025-04     | 85%       | 8.2         |
2025-05     | 92%       | 8.8         |
2025-06     | 78%       | 7.5         |
2025-07     | 88%       | 8.4         |
2025-08     | 95%       | 9.1         |
2025-09     | 82%       | 7.9         |

Correlation: 0.94 (Strong Positive)
Interpretation: Teams with higher rock completion rates consistently have better meeting scores.
```

---

### 4. "Identify people or teams consistently behind on their accountabilities."

**Tools needed:**

- `getUsers` or `getUsersOnTeams` (optionally with `teamId` filter)
- `getRocks` (with `userId` filter)
- `getTodos` (with `userId` filter)

**How the AI does it:**

1. Call `getUsers` or `getUsersOnTeams` to get all people
2. For each person:
   - Call `getRocks` with `userId` filter
   - Calculate rock metrics:
     - Completion rate
     - Number of OFFTRACK rocks
     - Number of INCOMPLETE rocks
   - Call `getTodos` with `userId` filter
   - Calculate todo metrics:
     - Completion rate
     - Number of OVERDUE todos
3. Calculate accountability score (weighted average of rock and todo completion)
4. Identify people below threshold (e.g., <70% completion)
5. Group by teams to identify team patterns

**Example output:**

```
People Behind on Accountabilities (< 70%):

Name            | Score | Rocks      | Todos      | Issues
----------------|-------|------------|------------|------------------
John Doe        | 58%   | 2/5 (40%)  | 8/12 (67%) | 2 overdue todos
Jane Smith      | 65%   | 3/4 (75%)  | 5/9 (56%)  | 3 overdue todos, 1 offtrack rock
Bob Johnson     | 52%   | 1/3 (33%)  | 6/11 (55%) | 4 overdue todos, 2 offtrack rocks

Team Patterns:
- Operations Team: 3 members below threshold (40% of team)
- Sales Team: All members above threshold ✓
```

---

## Summary

All four analytical questions can now be answered by an AI using the existing MCP tools:

1. ✅ **KPI Trends**: Use `getScorecardMeasurables` to get historical data with goals
2. ✅ **Team Execution**: Use `getTeams`, `getRocks` (with teamIds), and `getTodos`
3. ✅ **Rock-Meeting Correlation**: Use `getRocks` (with timestamps) and `getMeetingDetails` (with averageRating)
4. ✅ **Accountability Analysis**: Use `getUsers`, `getRocks` (with userId), and `getTodos` (with userId)

The AI performs all calculations, trend analysis, correlations, and insights generation based on the raw data returned by these tools.
