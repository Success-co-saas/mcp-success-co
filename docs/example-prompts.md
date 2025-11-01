# Example Prompts for Testing

## Quick Reference: 20 Realistic EOS Prompts

These prompts demonstrate the types of questions a company running EOS might ask through their LLM, especially via voice interface.

---

## 1. Quick Status Updates (Voice-Friendly)

### 1. "What's our scorecard looking like this week?"
**Best Tool:** `getScorecardMeasurables`
**Parameters:** `leadershipTeam=true, periods=1`
**What it does:** Shows current week's KPIs with goals and trends

### 2. "How are our rocks doing?"
**Best Tool:** `getRocks`
**Parameters:** `leadershipTeam=true, timePeriod=current_quarter`
**What it does:** Shows rock status with summary statistics (onTrack, offTrack, complete counts)

### 3. "Show me my open to-dos"
**Best Tool:** `getTodos`
**Parameters:** `userId=<current_user>, status=TODO`
**What it does:** Lists user's active todos with summary (overdue count, due soon count)

### 4. "What issues are we stuck on?"
**Best Tool:** `getIssues`
**Parameters:** `leadershipTeam=true, status=TODO`
**What it does:** Shows all issues with stuckCount in summary (30+ days old)

### 5. "Give me the highlights from our last L10"
**Best Tool:** `getMeetingDetails`
**Parameters:** `lastFinishedL10=true, leadershipTeam=true`
**What it does:** Returns most recent completed L10 with all headlines, todos, issues, ratings

---

## 2. Strategic Insights

### 6. "Based on the data you can see, give me some insights about my company" ⭐
**Best Tool:** `getCompanyInsights`
**Parameters:** None required
**What it does:** Returns comprehensive company overview with:
- Overall health score (0-100)
- Current quarter progress
- Execution metrics across rocks/issues/todos
- Specific blockers
- Actionable insights

**Example Response:**
```
Your company has a health score of 78 (Good status). 

Q4 2025 Progress:
- 58% of rocks completed (7 of 12) with 45 days remaining
- On track to finish strong

Key Metrics:
- Rocks: 10 on track, 3 off track, 2 overdue
- Issues: 25 open (3 stuck for 30+ days)
- Todos: 50 open (8 overdue)

Blockers:
- 5 rocks need attention (off track or not updated in 14+ days)
- 3 issues stuck for 30+ days
- 8 overdue todos

Recommendations:
- Address off-track rocks immediately
- Review stuck issues in next L10 meeting
- Follow up on overdue items
```

### 7. "Are we on track to hit our annual goals?"
**Best Tools:** `getLeadershipVTO` + `getRocks` + `getScorecardMeasurables`
**Approach:** 
1. Get annual goals from VTO
2. Get current year rocks with completion status
3. Get scorecard data for goal-related metrics
4. Compare progress vs goals

### 8. "Which rocks are most at risk this quarter?"
**Best Tool:** `getRocks`
**Parameters:** `leadershipTeam=true, timePeriod=current_quarter, status=OFFTRACK`
**What it does:** Shows off-track rocks, summary includes atRiskCount

### 9. "Show me completion trends for the last 13 weeks"
**Best Tool:** `getScorecardMeasurables`
**Parameters:** `leadershipTeam=true, periods=13, type=weekly`
**What it does:** Returns 13 weeks of scorecard data with values and goals

### 10. "What's blocking us from executing faster?" ⭐
**Best Tool:** `getExecutionHealth`
**Parameters:** `leadershipTeam=true`
**What it does:** Returns comprehensive execution analysis with:
- Health score and status
- Metrics for rocks (at-risk, overdue)
- Metrics for issues (stuck, high priority)
- Metrics for todos (overdue)
- Specific list of blockers
- Recommendations

**Example Response:**
```
Execution Health: 72/100 (Fair)

Blockers Identified:
- 3 rocks off track
- 2 overdue rocks
- 3 stuck issues (30+ days)
- 5 high priority issues
- 8 overdue todos

Recommendations:
- Address off-track rocks immediately
- Review stuck issues in next L10 meeting
- Follow up on overdue items

Overall: Good execution with some areas requiring attention.
```

---

## 3. People & Accountability

### 11. "Who's overloaded right now?" ⭐
**Best Tool:** `getUserWorkload`
**Parameters:** `leadershipTeam=true`
**What it does:** Returns workload analysis showing:
- Total items per person (rocks + issues + todos)
- Average workload
- Overloaded users (>150% of average)

**Example Response:**
```
Team Workload Analysis:

Summary:
- 8 team members
- 90 total open items
- Average: 11 items per person
- Maximum: 23 items

Overloaded Users (>150% of average):
1. John Doe - 23 items (5 rocks, 10 issues, 8 todos)
2. Jane Smith - 18 items (3 rocks, 8 issues, 7 todos)

Consider redistributing work or removing lower-priority items.
```

### 12. "Show me the people analyzer results for the leadership team"
**Best Tool:** `getPeopleAnalyzerSessions`
**Parameters:** `leadershipTeam=true`
**What it does:** Returns GWC scores (Gets it, Wants it, Capacity) for each person

### 13. "Who owns the marketing function?"
**Best Tool:** `getAccountabilityChart`
**Parameters:** Optional teamId filter
**What it does:** Returns organizational chart with roles and seats

### 14. "Which team members aren't completing their commitments?"
**Best Tool:** `getTodos`
**Parameters:** `leadershipTeam=true, status=OVERDUE`
**What it does:** Shows overdue todos grouped by user

### 15. "How is Sarah doing on her rocks?"
**Best Tool:** `getRocks`
**Parameters:** `userId=<sarah_id>`
**Approach:**
1. First call `getUsers` with keyword="Sarah" to find userId
2. Then call `getRocks` with that userId
**What it does:** Shows all of Sarah's rocks with status

---

## 4. Meeting & Planning

### 16. "What should we discuss in tomorrow's L10?"
**Best Tools:** `getExecutionHealth` + specific items
**Approach:**
1. Call `getExecutionHealth` to see blockers
2. Get high-priority open issues
3. Get overdue todos
4. Get recent headlines

**Example Agenda:**
```
Tomorrow's L10 Agenda Items:

High Priority:
- 3 rocks off track (need discussion)
- 5 high priority issues
- 8 overdue todos to review

Good News:
- 2 rocks completed this week
- Revenue hit goal for 3rd week in a row

Issues to Solve:
- Customer churn increase (stuck 35 days)
- Pricing inconsistency (high priority)
- Backend performance (stuck 42 days)
```

### 17. "Summarize what we've accomplished this quarter"
**Best Tools:** `getRocks` + `getIssues` + `getScorecardMeasurables`
**Approach:**
1. Get rocks for current quarter with status=COMPLETE
2. Get issues resolved this quarter
3. Get scorecard achievements

### 18. "Create our quarterly planning agenda"
**Best Tools:** Multiple
**Approach:**
1. Review last quarter: `getRocks` with `timePeriod=previous_quarter`
2. Get open issues: `getIssues` with `status=TODO`
3. Get goals from VTO: `getLeadershipVTO`
4. Current metrics: `getScorecardMeasurables`

---

## 5. Voice Commands (Quick Actions)

### 19. "Add a rock: Launch new customer portal by end of quarter"
**Best Tool:** `createRock`
**Parameters:**
```json
{
  "name": "Launch new customer portal",
  "leadershipTeam": true,
  "dueDate": "<end_of_quarter_date>"
}
```
**What it does:** Creates new rock, automatically assigns to leadership team, defaults due date to quarter end

### 20. "Mark the budget review todo as complete"
**Best Tools:** `getTodos` + `updateTodo`
**Approach:**
1. Search: `getTodos` with `keyword="budget review"`
2. Update: `updateTodo` with `todoStatusId=COMPLETE`

---

## Voice Optimization Tips

### Best Practices for Voice Prompts:
1. **Be specific but natural:** "Show me leadership team rocks" vs "Get rocks filter by leadership"
2. **Use relative time:** "this week", "last quarter", "next month"
3. **Mention team context:** "for the leadership team", "our team"
4. **Ask for summaries:** "give me an overview", "what's the status"

### Shortcuts Enabled:
- `leadershipTeam=true` - No need to know team ID
- `lastFinishedL10=true` - Gets most recent meeting automatically
- Default periods (13 weeks for scorecard)
- Keyword search (find by name without ID)

### Most Powerful Tools for Insights:
1. **`getCompanyInsights`** - One call for complete overview
2. **`getExecutionHealth`** - Execution analysis with blockers
3. **`getUserWorkload`** - Team workload distribution
4. **`getMeetingDetails`** with `lastFinishedL10=true` - Recent meeting recap

---

## Testing Checklist

### Basic Functionality:
- [ ] Test all 20 example prompts
- [ ] Verify summary statistics are accurate
- [ ] Check health score calculations
- [ ] Test with different team sizes

### Edge Cases:
- [ ] Company with no rocks
- [ ] Team with no issues
- [ ] User with no todos
- [ ] Empty scorecard

### Voice Testing:
- [ ] Natural language variations
- [ ] Response time acceptable (<3 seconds)
- [ ] Clear, concise responses
- [ ] Error messages user-friendly

### Integration:
- [ ] Works with OAuth authentication
- [ ] Works with API key authentication
- [ ] Handles rate limiting gracefully
- [ ] Returns helpful errors

---

## Quick Start for Testing

### 1. Test Company Insights (Most Impressive)
```
Prompt: "Based on the data you can see, give me some insights about my company"
Expected: Health score, quarter progress, blockers, recommendations
```

### 2. Test Execution Health
```
Prompt: "What's blocking us from executing faster?"
Expected: Specific blockers with counts, recommendations
```

### 3. Test Workload Analysis
```
Prompt: "Who's overloaded right now?"
Expected: List of overloaded users with item counts
```

### 4. Test Rock Status
```
Prompt: "How are our rocks doing?"
Expected: Summary with counts by status, at-risk identification
```

### 5. Test Recent Meeting
```
Prompt: "Give me the highlights from our last L10"
Expected: Meeting date, headlines, todos, issues, ratings
```

