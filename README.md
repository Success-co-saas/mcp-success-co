# 🟢 Success.co MCP Server

This MCP server provides comprehensive access to Success.co's EOS (Entrepreneurial Operating System) data, enabling AI assistants like Claude and ChatGPT to answer complex questions about company operations, team performance, rocks, issues, todos, and Level 10 meetings.

**[Model Context Protocol (MCP)](https://modelcontextprotocol.io/introduction)** allows you to integrate custom tools into AI assistants, giving them access to your Success.co data for intelligent analysis and assistance.

---

## 🚀 Fast Setup

### Prerequisites

- **Node.js 20+**
- **Success.co Account** with API access

### Option 1: Connect to Claude Desktop (Recommended)

1. **Install dependencies:**

   ```bash
   npm install
   ```

2. **Create a `.env` file** in the project root with dev-mode API key:

   ```bash
   # DEV-MODE API KEY (required for Claude Desktop)
   DEVMODE_SUCCESS_USE_API_KEY=true
   DEVMODE_SUCCESS_API_KEY=suc_api_2dff029c8e7a170e95f01e41a750ec94d0fd3abc
   ```

   **Why?** Claude Desktop connects directly to the MCP server via STDIO, bypassing the OAuth flow. You must use the dev-mode API key method for authentication.

3. **Configure Claude Desktop:**

   Edit `~/Library/Application Support/Claude/claude_desktop_config.json`:

   ```json
   {
     "mcpServers": {
       "success": {
         "command": "node",
         "args": ["/Users/YOUR_USERNAME/path/to/mcp-success-co/index.js"],
         "cwd": "/Users/YOUR_USERNAME/path/to/mcp-success-co"
       }
     }
   }
   ```

   **Important Notes:**

   - Replace paths with your actual installation directory
   - Claude Desktop will start the MCP server automatically on launch
   - **Do not run the server manually** when using Claude Desktop
   - Claude uses STDIO transport, so **avoid console.log/console.info** (use the built-in logger instead)

4. **Restart Claude Desktop** to load the MCP server

5. **Start required services** (for local testing with live data):

   ```bash
   # Terminal 1: Start ServiceAPI (port 4001)
   cd serviceapi-success-co
   npm start

   # Terminal 2: Start Vite proxy (port 5174)
   cd app.success.co
   npm run dev
   ```

6. **Test in Claude:** Ask questions like "Show me all open rocks" or "What issues need attention?"

### Option 2: Test with MCP Inspector

Use the MCP Inspector for interactive testing and debugging.

1. **Start required services:**

   ```bash
   # Terminal 1: Start ServiceAPI
   cd serviceapi-success-co
   npm start

   # Terminal 2: Start MCP Server
   cd mcp-success-co
   node index.js

   # Terminal 3: Start Vite proxy
   cd app.success.co
   npm run dev
   ```

2. **Launch MCP Inspector:**

   ```bash
   npx @modelcontextprotocol/inspector
   ```

3. **Connect to:** `http://localhost:5174/mcp`

4. **Authenticate** using OAuth when prompted

---

## 🧪 Running Tests

```bash
# Run all tests
npm test

# Run specific test
node tests/test-scorecard-analysis.js
```

---

## Authentication

The MCP server uses **OAuth 2.0** for authentication:

- **Token Lifetime:** 90 days
- **Authentication Flow:** Handled automatically through the MCP Inspector or Claude Desktop
- **Setup:** Database configuration required (see `.env` configuration below)

### Development Mode: API Key (Optional)

For local testing without OAuth, you can use API key authentication:

```bash
# .env file
DEVMODE_SUCCESS_USE_API_KEY=true
DEVMODE_SUCCESS_API_KEY=your-api-key-here
NODE_ENV=development
```

⚠️ **API key mode only works in development and is not recommended for production.**

## Configuration

Create a `.env` file in the project root:

```bash
# Database (required for mutations)
DB_HOST=localhost
DB_PORT=5432
DB_DATABASE=successco
DB_USER=postgres
DB_PASS=your-password

# Or use DATABASE_URL
DATABASE_URL=postgresql://user:password@host:port/database

# Development mode with API key (optional)
NODE_ENV=development
DEVMODE_SUCCESS_USE_API_KEY=true
DEVMODE_SUCCESS_API_KEY=your-api-key-here
```

**Note:** Without database configuration, you can still use read-only tools, but create/update operations will fail.

---

## 🔍 Under the Hood

Behind the scenes, the MCP server connects to the Success.co GraphQL API to retrieve and update your EOS data.

**How Authentication Works:**

- **With OAuth (MCP Inspector):** When you connect via the MCP Inspector, an OAuth flow is initiated. Your access token is stored securely and used for all API requests.
- **With Dev-Mode API Key (Claude Desktop):** Since Claude Desktop connects directly via STDIO, it bypasses the OAuth web flow. Instead, you provide your API key in the `.env` file, which is used to authenticate all API requests.

**What Happens When You Ask a Question:**

1. Claude (or the MCP Inspector) sends your query to the MCP server
2. The MCP server determines which tools to use (e.g., `getRocks`, `getIssues`, `getTodos`)
3. The server makes authenticated requests to the Success.co GraphQL API using:
   - Your OAuth access token (if connected via MCP Inspector)
   - Your dev-mode API key (if using Claude Desktop with `DEVMODE_SUCCESS_USE_API_KEY=true`)
4. The API returns your EOS data
5. The MCP server processes and formats the response
6. The answer is returned to Claude (or the MCP Inspector)

All data remains secure - OAuth tokens are stored in your local database, and API keys are only stored in your local `.env` file.

---

## 📚 API & Database Schemas

The `schema/` directory contains schema documentation for AI-assisted development:

- **`schema/graphql_schema.json`** - Complete GraphQL API schema
- **`schema/database_schema.sql`** - Database schema definitions

These files help AI assistants understand the data model and generate accurate queries.

---

## Level 10 Meeting & EOS Data Analysis

The MCP server includes powerful capabilities for analyzing Level 10 meetings, todos, issues, and EOS operational data with enhanced date filtering and comprehensive meeting summaries.

### Enhanced Date Filtering

All major tools now support sophisticated date filtering to answer time-based queries:

#### To-do Queries with Date Filtering

**New Parameters:**

- `createdAfter` / `createdBefore` - Filter by creation date
- `completedAfter` / `completedBefore` - Filter by completion date

**Example Queries:**

- "List all of my open to-dos from our Level 10 meetings"
  - Use: `getTodos` with `fromMeetings=true`, `status="TODO"`, `userId`
- "Which to-dos are overdue?"
  - Use: `getTodos` with `status="OVERDUE"`
- "How many to-dos were completed last week?"
  - Use: `getTodos` with `status="COMPLETE"`, `completedAfter="2024-01-08"`, `completedBefore="2024-01-14"`
- "Create a summary of completed vs open to-dos for the leadership team"
  - Use: Multiple `getTodos` calls with `teamId` and different `status` values

#### Issue Queries with Date Filtering

**New Parameters:**

- `createdAfter` / `createdBefore` - Filter by creation date
- `statusUpdatedBefore` - Find "stuck" issues
- `status` - Filter by issue status (e.g., "OPEN", "CLOSED")
- `teamId`, `userId` - Filter by team or user
- `fromMeetings` - Only issues from meetings

**Example Queries:**

- "Show me all open issues from this week's meetings"
  - Use: `getIssues` with `status="OPEN"`, `fromMeetings=true`, `createdAfter`
- "Which issues have been stuck open for more than 2 weeks?"
  - Use: `getIssues` with `status="OPEN"`, `statusUpdatedBefore` (2 weeks ago)
- "What are the top 3 recurring issues across all departments?"
  - Use: `getIssues` to fetch all issues, then analyze by name patterns
- "Summarize issues by team or topic"
  - Use: `getIssues` grouped by `teamId`

#### Meeting Queries with Comprehensive Details

**New Tool: `getMeetingDetails`**

This powerful tool fetches meetings with all related items (headlines, todos, issues, ratings) in a single call.

**Parameters:**

- `meetingId` - Specific meeting to fetch
- `teamId` - Filter by team (e.g., leadership team)
- `dateAfter` / `dateBefore` - Date range filtering
- `first` - Number of meetings to return (default 10)

**Example Queries:**

- "What were the headlines from our last leadership L10?"
  - Use: `getMeetingDetails` with `teamId` (leadership), `first=1`, sorted by date
- "Summarize last week's departmental meetings"
  - Use: `getMeetingDetails` with `dateAfter` and `dateBefore` for last week
- "How did each team score their last Level 10 meeting?"
  - Use: `getMeetingDetails` grouped by team, check `averageRating`
- "What's the average meeting score for Q4?"
  - Use: `getMeetings` with date range, calculate average of `averageRating`
- "List all to-dos created in this week's meetings"
  - Use: `getMeetingDetails` with date range, extract todos from results

### Meeting Data Structure

Each meeting detail includes:

- **Meeting Info**: Date, time, rating, status
- **Headlines**: All headlines shared in the meeting
- **To-dos**: All to-dos created in the meeting
- **Issues**: All issues discussed in the meeting
- **Summary**: Counts of each item type

### Query Mapping Guide

Here's how to answer each type of query:

#### To-do Queries

1. **"List all of my open to-dos from our Level 10 meetings"**

   - Tool: `getTodos`
   - Params: `fromMeetings=true`, `status="TODO"`, `userId=<user's ID>`

2. **"Which to-dos are overdue?"**

   - Tool: `getTodos`
   - Params: `status="OVERDUE"`

3. **"How many to-dos were completed last week?"**

   - Tool: `getTodos`
   - Params: `status="COMPLETE"`, `completedAfter=<last week start>`, `completedBefore=<last week end>`

4. **"Create a summary of completed vs open to-dos for the leadership team"**

   - Tools: Multiple `getTodos` calls
   - Params: `teamId=<leadership team ID>`, vary `status` between calls

5. **"Which team has the highest completion rate for to-dos?"**
   - Tool: `getTodos` (multiple calls per team)
   - Analysis: Compare completed vs total todos for each team

#### Issue Queries

1. **"Show me all open issues from this week's meetings"**

   - Tool: `getIssues`
   - Params: `status="OPEN"`, `fromMeetings=true`, `createdAfter=<week start>`

2. **"Which issues have been stuck open for more than 2 weeks?"**

   - Tool: `getIssues`
   - Params: `status="OPEN"`, `statusUpdatedBefore=<2 weeks ago>`

3. **"Summarize issues by team or topic"**

   - Tool: `getIssues`
   - Analysis: Group results by `teamId` or analyze `name` field

4. **"What are the top 3 recurring issues across all departments?"**
   - Tool: `getIssues`
   - Analysis: Find patterns in issue names/descriptions

#### Meeting / Level 10 Queries

1. **"What were the headlines from our last leadership L10?"**

   - Tool: `getMeetingDetails`
   - Params: `teamId=<leadership team ID>`, `first=1`, sorted by date DESC

2. **"Summarize last week's departmental meetings"**

   - Tool: `getMeetingDetails`
   - Params: `dateAfter=<last week start>`, `dateBefore=<last week end>`

3. **"How did each team score their last Level 10 meeting?"**

   - Tool: `getMeetingDetails` or `getMeetings`
   - Analysis: Group by team, check `averageRating` field

4. **"What's the average meeting score for Q4?"**

   - Tool: `getMeetings`
   - Params: `dateAfter=<Q4 start>`, `dateBefore=<Q4 end>`
   - Analysis: Calculate average of `averageRating`

5. **"List all to-dos created in this week's meetings"**
   - Tool: `getMeetingDetails`
   - Params: `dateAfter=<week start>`, `dateBefore=<week end>`
   - Analysis: Extract `todos` array from each meeting

## Headlines Analysis

The MCP server now includes enhanced headline filtering for sentiment analysis, topic tracking, and time-based queries.

### Enhanced Headlines Tool

**New Parameters:**

- `createdAfter` / `createdBefore` - Filter by creation date
- `keyword` - Filter by keyword in name or description (case-insensitive)
- `teamId`, `userId` - Filter by team or user
- `fromMeetings` - Only headlines from meetings

**Example Queries:**

1. **"Show me all people headlines from this week"**

   - Tool: `getHeadlines`
   - Params: `createdAfter=<week start>`, `createdBefore=<week end>`

2. **"List company headlines related to hiring"**

   - Tool: `getHeadlines`
   - Params: `keyword="hiring"`

3. **"Summarize positive headlines from the past month"**

   - Tool: `getHeadlines`
   - Params: `keyword="positive"`, `createdAfter=<month start>`

4. **"What headlines are related to client feedback?"**

   - Tool: `getHeadlines`
   - Params: `keyword="client feedback"` or `keyword="customer"`

## People Analyzer

The MCP server includes comprehensive People Analyzer tools for tracking GWC (Gets it, Wants it, Capacity) scores and Right Person/Right Seat evaluations.

### People Analyzer Tool

**Tool: `getPeopleAnalyzerSessions`**

Returns sessions with user scores including:

- **getsIt** - Understanding of the role (1-5 scale)
- **wantsIt** - Desire to do the role (1-5 scale)
- **capacityToDoIt** - Ability to perform the role (1-5 scale)
- **rightPerson** - Cultural fit with core values (1-5 scale)
- **rightSeat** - Fit for the specific role (1-5 scale)

**Parameters:**

- `teamId` - Filter by team (e.g., leadership team)
- `sessionId` - Specific session
- `createdAfter` / `createdBefore` - Date range filtering

**Example Queries:**

1. **"Show me the people analyzer results for the leadership team"**

   - Tool: `getPeopleAnalyzerSessions`
   - Params: `teamId=<leadership team ID>`

2. **"Who's rated below a 3 on 'Gets it'?"**

   - Tool: `getPeopleAnalyzerSessions`
   - Analysis: Filter results where `getsIt < 3`

3. **"Who doesn't meet our core values consistently?"**

   - Tool: `getPeopleAnalyzerSessions`
   - Analysis: Filter results where `rightPerson < 3`

4. **"Summarize people analyzer trends for the last quarter"**

   - Tool: `getPeopleAnalyzerSessions`
   - Params: `createdAfter=<quarter start>`, `createdBefore=<quarter end>`

## Organization Checkup

The MCP server includes Organization Checkup tools for tracking organizational health scores and identifying improvement areas.

### Organization Checkup Tool

**Tool: `getOrgCheckups`**

Returns checkup sessions with:

- Overall score
- Individual question answers (20 questions, Yes/No format)
- Question numbers for identifying specific areas

**Parameters:**

- `checkupId` - Specific checkup session
- `createdAfter` / `createdBefore` - Date range for comparisons

**Example Queries:**

1. **"What's our current organization checkup score?"**

   - Tool: `getOrgCheckups`
   - Params: `first=1` (get most recent)

2. **"Which statements scored lowest?"**

   - Tool: `getOrgCheckups`
   - Analysis: Count "No" answers by question number

3. **"Compare this quarter's checkup to last quarter's"**

   - Tool: `getOrgCheckups` (two calls)
   - Params: Different date ranges for each quarter

4. **"Summarize improvement areas for the next EOS quarter"**

   - Tool: `getOrgCheckups`
   - Analysis: Identify questions with "No" answers

## Teams and People Management

### Team Membership Tool

**Tool: `getUsersOnTeams`**

Returns team membership with enriched user and team data.

**Parameters:**

- `teamId` - Filter by specific team
- `userId` - Filter by specific user

**Example Queries:**

1. **"Who's on the Operations team?"**

   - Tool: `getUsersOnTeams`
   - Params: `teamId=<Operations team ID>`

2. **"List all people with open Rocks"**

   - Tool 1: `getRocks` with `rockStatusId="ONTRACK"` or `"OFFTRACK"`
   - Tool 2: `getUsers` filtered by user IDs from rocks

3. **"Who owns the KPI for customer satisfaction?"**

   - Tool: `getScorecardMeasurables`
   - Analysis: Find data field with name matching "customer satisfaction", get `userId`

4. **"Which team has the lowest Rock completion rate?"**

   - Tool: `getRocks` grouped by team
   - Analysis: Calculate completion rate per team

## Data Mutation Tools (Create & Update)

The MCP server now includes comprehensive mutation capabilities to create and update data in Success.co. These tools enable AI assistants to not just read data, but also take action.

**Available Operations:**

- **Create**: Issue, Rock, Headline, Meeting
- **Update**: Issue, Rock, Todo, Headline, Meeting

All mutation operations follow a consistent pattern:

1. **For Create**: Optionally find related IDs (teams, users) using `get*` tools, then call `create*`
2. **For Update**: Search for the item using `get*` tools to find its ID, then call `update*` with that ID

### Create Issue

**Tool: `createIssue`**

Create new issues to track problems that need to be discussed and resolved.

**Parameters:**

- `name` - Issue title (required)
- `desc` - Issue description
- `teamId` - Team to assign to (use `getTeams` to find ID)
- `userId` - User to assign to
- `issueStatusId` - Status (defaults to 'OPEN')
- `priorityNo` - Priority 1-5 (defaults to 3)
- `type` - 'LEADERSHIP', 'DEPARTMENTAL', or 'COMPANY'

**Example Query:**

**"Add a new issue for 'customer churn increase' to the leadership team"**

- Step 1: `getTeams` to find leadership team (where `isLeadership=true`)
- Step 2: `createIssue` with `name="customer churn increase"`, `teamId=<leadership ID>`, `type="LEADERSHIP"`

### Create Rock

**Tool: `createRock`**

Create new Rocks (90-day priorities) for teams or individuals.

**Parameters:**

- `name` - Rock title (required)
- `desc` - Rock description
- `dueDate` - Due date YYYY-MM-DD (required)
- `teamId` - Team to assign to
- `userId` - User to assign to
- `rockStatusId` - Status (defaults to 'ONTRACK')
- `type` - 'COMPANY', 'LEADERSHIP', or 'DEPARTMENTAL'

**Example Query:**

**"Create a Rock for marketing to 'launch referral program' due next quarter"**

- Step 1: `getTeams` to find marketing team ID
- Step 2: Calculate date 90 days from today
- Step 3: `createRock` with `name="launch referral program"`, `dueDate=<calculated>`, `teamId=<marketing ID>`

### Update Issue

**Tool: `updateIssue`**

Update existing issues including changing status, priority, or reassigning.

**Parameters:**

- `issueId` - Issue ID (required, use `getIssues` to find)
- `name` - Update issue name
- `desc` - Update description
- `issueStatusId` - Update status ('OPEN', 'CLOSED', etc.)
- `teamId` - Reassign to different team
- `userId` - Reassign to different user
- `priorityNo` - Update priority (1-5)

**Example Query:**

**"Close the issue about 'pricing inconsistencies'"**

- Step 1: `getIssues` with keyword "pricing inconsistencies"
- Step 2: `updateIssue` with `issueId=<found ID>`, `issueStatusId="CLOSED"`

### Update Rock

**Tool: `updateRock`**

Update existing Rocks including status, due date, or reassigning.

**Parameters:**

- `rockId` - Rock ID (required, use `getRocks` to find)
- `name` - Update rock name
- `desc` - Update description
- `rockStatusId` - Update status ('ONTRACK', 'OFFTRACK', 'COMPLETE', 'INCOMPLETE')
- `dueDate` - Update due date
- `teamId` - Reassign to different team
- `userId` - Reassign to different user

**Example Query:**

**"Mark the 'launch referral program' rock as complete"**

- Step 1: `getRocks` with name matching "launch referral program"
- Step 2: `updateRock` with `rockId=<found ID>`, `rockStatusId="COMPLETE"`

### Update Todo

**Tool: `updateTodo`**

Update existing to-dos, including marking them as complete.

**Parameters:**

- `todoId` - Todo ID (required, use `getTodos` to find)
- `todoStatusId` - New status ('TODO' or 'COMPLETE')
- `name` - Update the name
- `desc` - Update the description
- `dueDate` - Update the due date

**Example Query:**

**"Mark the to-do 'follow up with vendor' as complete"**

- Step 1: `getTodos` to search for todo with name containing "follow up with vendor"
- Step 2: `updateTodo` with `todoId=<found ID>`, `todoStatusId="COMPLETE"`

### Update Headline

**Tool: `updateHeadline`**

Update existing headlines including text, description, or status.

**Parameters:**

- `headlineId` - Headline ID (required, use `getHeadlines` to find)
- `name` - Update headline text
- `desc` - Update description
- `headlineStatusId` - Update status
- `teamId` - Update team association
- `userId` - Update user association
- `isCascadingMessage` - Update cascade flag

**Example Query:**

**"Edit the ABC Corp headline to add more details"**

- Step 1: `getHeadlines` with keyword "ABC Corp"
- Step 2: `updateHeadline` with `headlineId=<found ID>`, `desc="New details here"`

### Update Meeting

**Tool: `updateMeeting`**

Update existing meetings including time, date, or status.

**Parameters:**

- `meetingId` - Meeting ID (required, use `getMeetings` to find)
- `date` - Update meeting date (YYYY-MM-DD)
- `startTime` - Update start time (HH:MM)
- `endTime` - Update end time (HH:MM)
- `meetingStatusId` - Update status ('SCHEDULED', 'COMPLETED', 'CANCELLED')
- `averageRating` - Update rating

**Example Query:**

**"Reschedule next Monday's L10 to 2pm"**

- Step 1: Calculate next Monday's date
- Step 2: `getMeetings` with `dateAfter=<Monday>`, `dateBefore=<Monday>`
- Step 3: `updateMeeting` with `meetingId=<found ID>`, `startTime="14:00"`

### Create Headline

**Tool: `createHeadline`**

Create headlines to share good news and wins during meetings.

**Parameters:**

- `name` - Headline text (required)
- `desc` - Additional details
- `teamId` - Team to associate with
- `userId` - User to associate with
- `headlineStatusId` - Status (defaults to 'ACTIVE')
- `isCascadingMessage` - Share across teams (defaults to false)

**Example Query:**

**"Add a headline: 'Won major client contract with ABC Corp'"**

- Tool: `createHeadline` with `name="Won major client contract with ABC Corp"`
- Optional: Add `desc` with contract details

### Create Meeting

**Tool: `createMeeting`**

Schedule new meeting instances for existing meeting series.

**Parameters:**

- `date` - Meeting date YYYY-MM-DD (required)
- `meetingInfoId` - Meeting series ID (required, use `getMeetingInfos`)
- `startTime` - Start time HH:MM (defaults to '09:00')
- `endTime` - End time HH:MM (defaults to '10:00')
- `meetingStatusId` - Status (defaults to 'SCHEDULED')

**Example Query:**

**"Schedule a Level 10 meeting for the Integrator team next Monday"**

- Step 1: Calculate next Monday's date
- Step 2: `getTeams` to find Integrator team ID
- Step 3: `getMeetingInfos` with `teamId=<Integrator ID>` to find Level 10 meeting series
- Step 4: `createMeeting` with `date=<Monday date>`, `meetingInfoId=<Level 10 series ID>`

### Mutation Query Patterns

#### Pattern 1: Create with Team Assignment

```text
1. getTeams → find team ID
2. create* → use teamId parameter
```

#### Pattern 2: Create with User Assignment

```text
1. getUsers → find user ID
2. create* → use userId parameter
```

#### Pattern 3: Update Existing Item

```text
1. get* → search for item by name/criteria
2. update* → use ID from search results
```

#### Pattern 4: Multi-step Creation

```text
1. Calculate dates/times (e.g., "next quarter" = today + 90 days)
2. Find related IDs (teams, users, meeting series)
3. create* → use calculated values
```

### Important Notes

- All mutation tools require a valid Success.co API key
- Team and user IDs should be obtained using `getTeams` and `getUsers`
- Date calculations should be done by the AI (e.g., "next Monday", "next quarter")
- Meeting series IDs come from `getMeetingInfos`, not `getMeetings`
- Rock due dates should be calculated as ~90 days (one quarter) from today

## Cross-functional Queries

These complex queries combine multiple tools to provide comprehensive insights:

### 1. **"What's the overall health of our company this quarter?"**

Combine:

- `getOrgCheckups` - Recent checkup score
- `getScorecardMeasurables` - KPI performance
- `getRocks` - Rock completion rates
- `getIssues` - Open issues count

### 2. **"Summarize our EOS performance dashboard for the executive summary"**

Combine:

- `getLeadershipVTO` - Vision/goals alignment
- `getScorecardMeasurables` - Key metrics
- `getRocks` - Priorities status
- `getMeetingDetails` - Recent L10 insights

### 3. **"Which areas of the business show the lowest accountability?"**

Combine:

- `getRocks` - Overdue or incomplete rocks by owner
- `getTodos` - Overdue todos by owner
- `getIssues` - Long-standing open issues
- `getPeopleAnalyzerSessions` - GWC scores

### 4. **"Generate a leadership meeting agenda using current Rocks, Issues, and Scorecard data"**

Combine:

- `getRocks` - At-risk rocks for discussion
- `getIssues` - Top priority open issues
- `getScorecardMeasurables` - KPIs below target
- `getMeetingDetails` - Previous action items

### 5. **"Create a weekly EOS summary email with metrics, Rocks, and highlights"**

Combine:

- `getScorecardMeasurables` - Weekly KPIs
- `getRocks` - Rock progress updates
- `getHeadlines` - Weekly headlines
- `getTodos` - Completed vs open todos

### 6. **"What's trending down in our scorecard that might affect our V/TO goals?"**

Combine:

- `getScorecardMeasurables` - Analyze trends
- `getLeadershipVTO` - Current goals
- Analysis: Match declining KPIs to goal areas

## Scorecard measurables Analysis Tools

The MCP server now includes comprehensive Scorecard measurables analysis capabilities, allowing AI assistants to answer complex questions about KPI performance, targets, and trends.

### Available Scorecard Tools

#### 1. **analyzeScorecardMetrics** - Main Scorecard Analysis Tool

This is the primary tool for Scorecard and KPI analysis. It automatically detects the type of analysis needed based on your query.

**Example Queries:**

- "Give me the last 12 weeks of Scorecard measurables for my team and flag any KPI below target"
- "Which KPIs are below target?"
- "Show me KPI trends over the last quarter"
- "What's the performance of our Scorecard measurables?"

**Parameters:**

- `query` (required): The analytical query to perform
- `teamId` (optional): Filter by specific team
- `userId` (optional): Filter by specific user
- `timeframe` (optional): Analysis timeframe ('quarter', 'month', 'week', 'year')
- `weeks` (optional): Number of weeks to analyze (defaults to 12)

#### 2. **Scorecard Data Retrieval Tools**

- `getDataFields` - List all data fields (KPIs) with their configurations
- `getDataValues` - List all data values (metric measurements) with filtering by date range
- `getDataFieldStatuses` - List available data field statuses

### Scorecard Analysis Capabilities

The `analyzeScorecardMetrics` tool can perform several types of analysis:

#### General Scorecard Analysis

Provides a comprehensive overview of all KPIs and their current values. Returns:

- Total KPI count
- Time range analyzed
- Individual KPI details (name, description, type, unit)
- Latest values with dates and notes
- Data points over time

#### KPI Below Target Analysis

Identifies KPIs that are currently below their target values. Returns:

- Total KPIs analyzed
- Count of KPIs below target
- Individual KPI details with current vs target values
- Variance calculations (absolute and percentage)
- Sorted by variance severity

#### KPI Trends Analysis

Analyzes performance trends over time for all KPIs. Returns:

- Total KPIs analyzed
- Count of improving, declining, and stable KPIs
- Individual KPI trend analysis
- Trend strength calculations
- Sorted by trend significance

### Scorecard Data Structure

The Scorecard system uses the following data structure:

- **Data Fields**: Define the KPIs (name, description, type, unit, targets)
- **Data Values**: Store the actual metric measurements over time
- **Teams on Data Fields**: Assign KPIs to specific teams
- **Data Field Statuses**: Track the status of each KPI

### Example Usage

Here are some example queries you can ask an AI assistant:

**General Scorecard Analysis:**

```
"Give me the last 12 weeks of Scorecard measurables for my team"
"Show me all our KPIs and their current values"
"What Scorecard measurables do we track?"
```

**Target Analysis:**

```
"Flag any KPI below target"
"Which KPIs are underperforming?"
"Show me KPIs that missed their targets"
```

**Trend Analysis:**

```
"Show me KPI trends over the last quarter"
"What's the performance trend of our metrics?"
"Which KPIs are improving vs declining?"
```

**Team-Specific Analysis:**

```
"Show me the Scorecard performance for my team over the last month"
"What KPIs is the sales team responsible for?"
"Which team has the best KPI performance?"
```

### Testing Scorecard Functionality

You can test the Scorecard functionality using the included test script:

```bash
node test-scorecard-analysis.js
```

This will run comprehensive tests of all Scorecard tools and analysis capabilities.

## Using the MCP Tool in Cursor (Agent Mode)

With the MCP server integrated into Cursor IDE and with Agent mode enabled, you can use the tools in several ways:

Which issues are assigned to the leadership team for Level 10?
Find Level 10 meeting agendas and their sections

```

**Meeting Analysis:**

```

Show me all meetings scheduled for this week and their facilitators
What meeting agendas do we have and who are the facilitators?
Which meetings have the highest ratings?
Show me meeting performance metrics for this quarter

```

**Issue Analysis:**

```

What are the highest priority issues that need attention?
Show me all open issues grouped by team
Which issues have been open the longest?
Find issues assigned to specific users

```

### Data Retrieval Tool Usage

You can retrieve specific data types using natural language:

**Teams:**

```

get teams from Success.co
list all teams
show me the first 10 teams

```

**Users:**

```

get users from Success.co
list all users
show me users in the marketing team

```

**Rocks:**

```

get rocks from Success.co
list all rocks
show me rocks for this quarter

```

**Todos:**

```

get todos from Success.co
list all todos
show me todos assigned to John

```

**Meetings:**

```

get meetings from Success.co
list all meetings
show me meetings for this month

```

**Meeting Infos:**

```

get meeting infos from Success.co
list all meeting infos
show me meeting infos for the leadership team

```

**Meeting Agendas:**

```

get meeting agendas from Success.co
list all meeting agendas
show me Level 10 meeting agendas

```

**Meeting Agenda Sections:**

```

get meeting agenda sections from Success.co
list agenda sections for a specific meeting
show me Level 10 agenda sections

```

**Issues:**

```

get issues from Success.co
list all issues
show me high priority issues

```

**Headlines:**

```

get headlines from Success.co
list all headlines
show me recent headlines

```

**Visions:**

```

get visions from Success.co
list all visions
show me leadership team visions

```

### Search Tool Usage

The search tool provides intelligent search across all EOS data types:

```

search for teams
search for users
search for todos
search for rocks
search for meetings
search for issues
search for headlines
search for visions

```

### API Key Management

**Setting the API Key:**

```

set my Success.co API key to "your-api-key-here"

```

**Getting the API Key:**

```

what is my Success.co API key?

```

### Advanced Queries

You can combine multiple concepts in your queries:

```

Show me all rocks that are overdue and who owns them
Which teams have the most incomplete rocks?
Find rocks due in the next 30 days and their owners
Show me the progress of all rocks for the marketing team
Which users have the most overdue todos?

````

The AI agent will automatically infer the appropriate tools to use based on your request and may combine multiple tools to provide comprehensive answers.

---

## 📖 Sample Questions

For a comprehensive list of sample questions and example prompts, see:

**[Sample Questions for Success.co AI MCP Server](https://docs.google.com/document/d/1f303DI0X56r9HmUCgFlDUhwCeHdwyquUTXoHr-Hhj74/edit?tab=t.0)**

Examples include:
- EOS data queries (Rocks, Issues, Todos)
- Level 10 meeting analysis
- Scorecard and KPI analysis
- Team performance tracking
- Cross-functional insights

---

## 🔧 Advanced: Remote Access with Ngrok

To expose your local MCP server for remote testing or external access:

1. **Install ngrok:**

   ```bash
   brew install ngrok
````

2. **Start all local services** (ServiceAPI, MCP Server, Vite proxy)

3. **Expose the Vite proxy:**

   ```bash
   ngrok http 5174
   ```

4. **Connect using the ngrok URL:**

   ```text
   https://your-subdomain.ngrok.app/mcp
   ```

**Note:** Ngrok provides a public URL that tunnels to your local server. OAuth authentication works the same way as local connections.

**Troubleshooting:** If you encounter port conflicts, kill processes on specific ports:

```bash
lsof -ti:6277 | xargs kill -9
```

---

## 📚 References & Resources

- [Model Context Protocol Introduction](https://modelcontextprotocol.io/introduction)
- [Model Context Protocol SDK](https://github.com/modelcontextprotocol/typescript-sdk)
- [Success.co API Documentation](https://coda.io/@successco/success-co-api)
