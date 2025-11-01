# LLM Prompt Analysis for Success.co EOS Data

## 20 Realistic Prompts for EOS Companies

### Quick Status Updates (Voice-Friendly)
1. **"What's our scorecard looking like this week?"**
   - Needs: Recent scorecard values, goals, trend indicators (✓ Have)
   - Tools: `getScorecardMeasurables` with default periods

2. **"How are our rocks doing?"**
   - Needs: Rock status distribution, ownership, due dates (✓ Have)
   - Tools: `getRocks` with status breakdown

3. **"Show me my open to-dos"**
   - Needs: User's todos filtered by status (✓ Have)
   - Tools: `getTodos` with userId filter

4. **"What issues are we stuck on?"**
   - Needs: Issues with old statusUpdatedAt dates (✓ Have)
   - Tools: `getIssues` with `statusUpdatedBefore` parameter

5. **"Give me the highlights from our last L10"**
   - Needs: Most recent finished L10 meeting with details (✓ Have)
   - Tools: `getMeetingDetails` with `lastFinishedL10=true`

### Strategic Insights
6. **"Based on the data you can see, give me some insights about my company"**
   - Needs: Aggregated data across multiple dimensions
   - **MISSING**: Summary statistics, trends, patterns
   - **RECOMMENDATION**: Add analytics/insights tool or enhance existing tools with summary stats

7. **"Are we on track to hit our annual goals?"**
   - Needs: VTO annual goals + current rock/scorecard progress (✓ Have)
   - Tools: `getLeadershipVTO`, `getRocks`, `getScorecardMeasurables`
   - **ENHANCEMENT**: VTO should include goals with target metrics

8. **"Which rocks are most at risk this quarter?"**
   - Needs: Rocks status=OFFTRACK, overdue milestones, old status dates (✓ Have)
   - Tools: `getRocks` with filters + milestone analysis

9. **"Show me completion trends for the last 13 weeks"**
   - Needs: Historical scorecard data, rock completion rates (✓ Partial)
   - Tools: `getScorecardMeasurables`
   - **MISSING**: Rock completion rate over time, issue resolution rate
   - **RECOMMENDATION**: Add aggregate statistics to rock/issue queries

10. **"What's blocking us from executing faster?"**
    - Needs: Cross-analysis of stuck issues, overdue todos, off-track rocks
    - **MISSING**: Aggregation across entity types
    - **RECOMMENDATION**: Add "execution health" or "blockers" tool

### People & Accountability
11. **"Who's overloaded right now?"**
    - Needs: Count of open items by user across rocks/todos/issues (✓ Partial)
    - **MISSING**: Aggregated workload by user
    - **RECOMMENDATION**: Add `getUserWorkload` tool

12. **"Show me the people analyzer results for the leadership team"**
    - Needs: Most recent people analyzer session with scores (✓ Have)
    - Tools: `getPeopleAnalyzerSessions` with `leadershipTeam=true`

13. **"Who owns the marketing function?"**
    - Needs: Accountability chart with roles/seats (✓ Have)
    - Tools: `getAccountabilityChart`

14. **"Which team members aren't completing their commitments?"**
    - Needs: Overdue todos grouped by user (✓ Have)
    - Tools: `getTodos` with `status=OVERDUE`
    - **ENHANCEMENT**: Add grouping/counting by user in response

15. **"How is Sarah doing on her rocks?"**
    - Needs: User's rocks with status and progress (✓ Have)
    - Tools: `getRocks` filtered by userId

### Meeting & Planning
16. **"What should we discuss in tomorrow's L10?"**
    - Needs: Prioritized issues, overdue todos, off-track rocks, new headlines
    - **MISSING**: Aggregated "meeting prep" view
    - **RECOMMENDATION**: Add `getMeetingPrep` tool

17. **"Summarize what we've accomplished this quarter"**
    - Needs: Completed rocks, resolved issues, scorecard vs goals (this quarter)
    - **MISSING**: Time-boxed completion summaries
    - **RECOMMENDATION**: Add date filters and completion counts to existing tools

18. **"Create our quarterly planning agenda"**
    - Needs: Rocks due next quarter, strategic goals, key issues
    - **MISSING**: Forward-looking planning data
    - **RECOMMENDATION**: Add `getQuarterlyPlanningData` tool

### Voice Commands
19. **"Add a rock: Launch new customer portal by end of quarter"**
    - Needs: Rock creation with NLP parsing (✓ Have)
    - Tools: `createRock`
    - **ENHANCEMENT**: LLM can parse natural language into structured params

20. **"Mark the budget review todo as complete"**
    - Needs: Todo search + update (✓ Have)
    - Tools: `getTodos` (search) + `updateTodo`

## Critical Data Gaps & Recommendations

### 1. Aggregate Statistics (HIGH PRIORITY)
**Problem**: Individual queries return lists, but insights need counts, averages, trends
**Examples**:
- "How many rocks are off track?" - requires counting results
- "What's our average issue resolution time?" - requires aggregation
- "Who has the most open todos?" - requires grouping

**Solution Options**:
a) Add summary fields to existing tool responses (preferred)
b) Create new aggregate/analytics tools
c) Let LLM calculate from data (current approach - works but inefficient)

### 2. Cross-Entity Analysis (MEDIUM PRIORITY)
**Problem**: Questions span multiple entity types
**Examples**:
- "What's blocking us?" - needs issues + todos + rocks
- "Who's overloaded?" - needs count across all entities by user
- "Overall execution health" - needs multiple metrics

**Solution**: Add compound tools like:
- `getExecutionHealth` - returns stuck issues, overdue todos, off-track rocks
- `getUserWorkload` - returns all open items by user with counts
- `getTeamPerformance` - returns team metrics across entities

### 3. Time-Series & Trends (MEDIUM PRIORITY)
**Problem**: Historical comparison and trends
**Examples**:
- "Are we getting better at completing rocks?"
- "Issue resolution time trending"
- "Scorecard trends over time"

**Solution**: 
- Scorecard already has this with `periods` parameter ✓
- Add completion date ranges to rocks/issues/todos
- Add trend calculations to responses

### 4. Meeting Preparation Data (LOW PRIORITY)
**Problem**: "What should we discuss?" needs curated prep
**Solution**: Add `getMeetingPrep` tool that returns:
- High priority open issues
- Overdue todos
- Off-track rocks
- New headlines since last meeting
- Scorecard items below goal

### 5. Natural Language Parsing Helpers
**Current**: LLM must parse dates, find user IDs, etc.
**Enhancement**: Tools already do a good job with:
- `leadershipTeam=true` shortcut ✓
- `keyword` search ✓
- Enum values for status ✓

**Still needs**:
- Relative date parsing ("last week", "this quarter") - LLM handles this well
- User name → userId lookup - could add search parameter

## Data We're Already Providing Well

### Excellent Coverage:
1. ✅ **Rocks**: Status, milestones, ownership, teams, time periods
2. ✅ **Scorecard**: Historical data, goals, trends (last 13 weeks default)
3. ✅ **Meetings**: Recent L10 with all details
4. ✅ **People Analyzer**: GWC scores for team assessment
5. ✅ **VTO**: Complete vision/traction data
6. ✅ **Accountability Chart**: Organizational structure
7. ✅ **Issues**: Filtering by status, dates, assignment
8. ✅ **Todos**: Comprehensive filtering including overdue
9. ✅ **Headlines**: Good/wins tracking
10. ✅ **Comments**: Context on all entities

### Good Shortcuts:
- `leadershipTeam=true` eliminates need to lookup team ID
- `lastFinishedL10=true` gets recent meeting automatically
- Default periods (13 weeks for scorecard)
- Keyword search across entities
- Status enums (TODO/COMPLETE, ONTRACK/OFFTRACK)

## Recommendations Priority Order

### High Priority Enhancements:
1. **Add summary statistics to tool responses**
   - Example: `getRocks` returns: `{ totalCount, onTrackCount, offTrackCount, completeCount, items: [...] }`
   - Example: `getIssues` returns: `{ totalCount, openCount, stuckCount (>30 days), items: [...] }`
   
2. **Add aggregate tools for common insights**
   - `getExecutionHealth` - one call for overall status
   - `getUserWorkload` - workload by user
   - `getCompanyInsights` - high-level company metrics

3. **Enhance date filtering**
   - Add "this quarter", "last quarter" shortcuts
   - Add completion date ranges to all entities

### Medium Priority Enhancements:
4. **Add user search by name**
   - Allow `getUsers` to search by name, not just teamId
   - Currently LLM must search manually

5. **Add meeting preparation tool**
   - `getMeetingPrep` returns curated list for L10

6. **Add trend/comparison helpers**
   - Rock completion rates over time
   - Issue resolution velocity
   - Scorecard goal attainment percentage

### Low Priority Enhancements:
7. **Add batch operations**
   - Update multiple todos at once
   - Bulk rock status updates

8. **Add more VTO detail**
   - Link annual goals to rocks
   - Track goal progress percentage

## Conclusion

**Current State**: The MCP server provides excellent granular data access. An LLM can answer most of these 20 prompts by making 1-3 tool calls and doing some calculation.

**Gap**: Aggregate insights require the LLM to count, group, and analyze lists of items. This works but is inefficient.

**Recommendation**: Add summary statistics to existing tool responses as the highest priority enhancement. This will dramatically improve insight quality and reduce token usage for complex queries.

**Voice Optimization**: Current tools are already well-suited for voice because:
- Natural language friendly descriptions
- Smart defaults (leadership team, current period)
- Shortcuts (lastFinishedL10, leadershipTeam)
- Clear enum values

