# 🟢 Success.co MCP Server

![MCP Server in Node.js banner](https://github.com/user-attachments/assets/6608286c-0dd2-4f15-a797-ed63d902a38a)

## Success.co EOS Framework MCP Server

This MCP server provides comprehensive access to Success.co's EOS (Entrepreneurial Operating System) data, enabling AI assistants like ChatGPT and Claude to answer complex questions about company operations, team performance, project management, and Level 10 meetings.

[Overview](#overview) · [Features](#features) · [Installation](#installation) · [EOS Analysis Tools](#eos-analysis-tools) · [Testing with MCP Inspector](#testing-with-mcp-inspector) · [Setting Environment Variables for Testing](#setting-environment-variables-for-testing) · [Integrating with Cursor AI](#integrating-with-cursor-ai) · [Using the MCP Tool in Cursor (Agent Mode)](#using-the-mcp-tool-in-cursor-agent-mode) · [Code Overview](#code-overview) · [References & Resources](#references--resources) · [License](#license)

## Overview

**MCP (Model Context Protocol)** is a framework that allows you to integrate custom tools into AI-assisted development environments—such as Cursor AI. MCP servers expose functionality (like data retrieval or code analysis) so that an LLM-based IDE can call these tools on demand. Learn more about MCP in the [Model Context Protocol Introduction](https://modelcontextprotocol.io/introduction).

This project demonstrates an MCP server implemented in JavaScript using Node.js that provides comprehensive access to Success.co's EOS framework data. It includes tools for retrieving teams, users, todos, rocks, meetings, issues, headlines, visions, and Scorecard metrics. Most importantly, it includes advanced analytical tools that can answer complex EOS-related questions like "Which company Rocks are at risk of missing their due dates this quarter, and who owns them?", Scorecard questions like "Give me the last 12 weeks of Scorecard metrics for my team and flag any KPI below target", and Level 10 meeting questions like "What are the top 5 open Issues for this week's Level 10 meeting and their owners?"

## Quick dev setup and notes

- Run this locally
- Run a proxy to it ngrok http :3001
- Run npx @modelcontextprotocol/inspector
- Connect on either Streamable HTTP (/mcp) or alternatively SSE (/sse). Note that Streamable HTTP is preferred.
- You should be able to list and run tools

* **Node.js:** Version 20 or higher is required.
* **Success.co API Key:** You'll need a valid Success.co API key to access the data.

## Features

- **EOS Data Access:** Complete access to Success.co's EOS framework data including teams, users, todos, rocks, meetings, issues, headlines, visions, and meeting agendas
- **Level 10 Meeting Analysis:** Specialized tools for analyzing Level 10 meetings, including issue tracking, facilitator/scribe information, and agenda sections
- **Scorecard Metrics Analysis:** Comprehensive KPI analysis including target flagging, trend analysis, and performance tracking
- **Advanced Analytics:** Sophisticated analysis tools for at-risk rocks, overdue items, team performance, progress tracking, and meeting insights
- **GraphQL Integration:** Full integration with Success.co's GraphQL API
- **API Key Management:** Secure storage and retrieval of Success.co API keys
- **Input Validation:** Uses [Zod](https://github.com/colinhacks/zod) for schema validation
- **Multiple Transports:** Supports both STDIO and HTTP transports
- **Comprehensive Search:** Intelligent search across all EOS data types
- **Real-time Analysis:** Dynamic analysis of rock statuses, milestones, team performance, and KPI metrics

## Installation

1. **Clone the Repository**

   ```bash
   git clone <repository_url>
   cd <repository_directory>
   ```

2. **Install Dependencies**

   You can install the project dependencies in one of two ways:

   **Option 1: Install using the existing `package.json`**

   Simply run:

   ```bash
   npm install
   ```

   **Option 2: Install dependencies manually**

   If you prefer, delete the existing `package.json` and install the required packages manually:

   ```bash
   npm install @modelcontextprotocol/sdk zod
   ```

   Then, update the newly generated `package.json` file to include the following lines, which enables ES Modules and adds the mcp inspector command:

   ```json
   "type": "module",
   "scripts": {
    "inspector": "npx @modelcontextprotocol/inspector node ./mcp-server.js"
   }
   ```

3. **Set up your Success.co API Key**

   You'll need to set your Success.co API key. You can do this in two ways:

   **Option 1: Set environment variable**

   ```bash
   export SUCCESS_CO_API_KEY="your-success-co-api-key"
   ```

   **Option 2: Use the MCP tool to set it**
   Once the server is running, you can use the `setSuccessCoApiKey` tool to store your API key securely.

## EOS Analysis Tools

The MCP server includes powerful analytical tools specifically designed for EOS framework analysis. These tools can answer complex questions about your company's operations, team performance, and project management.

### Available Analysis Tools

#### 1. **analyzeEOSData** - Main Analysis Tool

This is the primary tool for complex EOS queries. It automatically detects the type of analysis needed based on your query.

**Example Queries:**

- "Which company Rocks are at risk of missing their due dates this quarter, and who owns them?"
- "Show me all overdue rocks and who owns them"
- "What is the current progress status of all rocks?"
- "How are teams performing with their rocks?"

**Parameters:**

- `query` (required): The analytical query to perform
- `teamId` (optional): Filter by specific team
- `userId` (optional): Filter by specific user
- `timeframe` (optional): Analysis timeframe ('quarter', 'month', 'week')

#### 2. **Data Retrieval Tools**

- `getTeams` - List all teams
- `getUsers` - List all users
- `getTodos` - List all todos
- `getRocks` - List all rocks
- `getMeetings` - List all meetings
- `getIssues` - List all issues
- `getHeadlines` - List all headlines
- `getVisions` - List all visions
- `getRockStatuses` - List rock statuses
- `getMilestones` - List milestones
- `getMilestoneStatuses` - List milestone statuses
- `getTeamsOnRocks` - List team-rock relationships

#### 3. **Search Tool**

- `search` - Intelligent search across all EOS data types

#### 4. **Fetch Tool**

- `fetch` - Retrieve detailed information about specific items by ID

### Analysis Capabilities

The `analyzeEOSData` tool can perform several types of analysis:

#### At-Risk Rocks Analysis

Identifies rocks that are at risk of missing their due dates within a specified timeframe. Returns:

- Rock details (name, description, due date)
- Owner information (name, title, email)
- Days until due date
- Current status

#### Overdue Items Analysis

Finds all rocks that are past their due date and not completed. Returns:

- Rock details
- Owner information
- Days overdue
- Current status

#### Rock Progress Analysis

Provides a comprehensive overview of rock progress across the organization. Returns:

- Total rock count
- Status breakdown with percentages
- Individual rock details

#### Team Performance Analysis

Analyzes team performance based on rock completion and status. Returns:

- Team information
- Rock counts per team
- Status breakdown per team

#### Level 10 Meeting Analysis

Specialized analysis for Level 10 meetings, including issue tracking and meeting management. Returns:

- Level 10 meeting agendas and their details
- Open issues for each meeting (sorted by priority)
- Facilitator and scribe information
- Meeting agenda sections and timing
- Issue owners and team assignments

#### Meeting Data Analysis

Comprehensive analysis of all meeting-related data. Returns:

- Meeting infos and their status
- Meeting agendas and types
- Facilitator and scribe assignments
- Meeting ratings and performance metrics
- Team meeting schedules

#### Issue Analysis

Detailed analysis of organizational issues and their management. Returns:

- Issues grouped by status
- Priority-based issue ranking
- Issue owners and team assignments
- Issue creation and update timestamps
- Meeting associations

### Example Usage

Here are some example queries you can ask an AI assistant:

**At-Risk Analysis:**

```
"Which rocks are at risk of missing their due dates this quarter?"
"Show me rocks that might be late this month"
"Find rocks due in the next 30 days"
```

**Overdue Analysis:**

```
"Show me all overdue rocks"
"Which rocks are past their due date?"
"Find late rocks and who owns them"
```

**Progress Analysis:**

```
"What's the current status of all rocks?"
"Show me rock completion rates"
"How many rocks are complete vs incomplete?"
```

**Team Analysis:**

```
"How are teams performing with their rocks?"
"Which team has the most overdue rocks?"
"Show me team rock completion rates"
```

## Scorecard Metrics Analysis Tools

The MCP server now includes comprehensive Scorecard metrics analysis capabilities, allowing AI assistants to answer complex questions about KPI performance, targets, and trends.

### Available Scorecard Tools

#### 1. **analyzeScorecardMetrics** - Main Scorecard Analysis Tool

This is the primary tool for Scorecard and KPI analysis. It automatically detects the type of analysis needed based on your query.

**Example Queries:**

- "Give me the last 12 weeks of Scorecard metrics for my team and flag any KPI below target"
- "Which KPIs are below target?"
- "Show me KPI trends over the last quarter"
- "What's the performance of our Scorecard metrics?"

**Parameters:**

- `query` (required): The analytical query to perform
- `teamId` (optional): Filter by specific team
- `userId` (optional): Filter by specific user
- `timeframe` (optional): Analysis timeframe ('quarter', 'month', 'week', 'year')
- `weeks` (optional): Number of weeks to analyze (defaults to 12)

#### 2. **Scorecard Data Retrieval Tools**

- `getDataFields` - List all data fields (KPIs) with their configurations
- `getDataValues` - List all data values (metric measurements) with filtering by date range
- `getTeamsOnDataFields` - List team assignments to specific KPIs
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
"Give me the last 12 weeks of Scorecard metrics for my team"
"Show me all our KPIs and their current values"
"What Scorecard metrics do we track?"
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

## Testing with MCP Inspector

The MCP Inspector is a debugging tool that lets you test your server's tools interactively before integrating with an IDE.

**Option 1: Run directly with npx**

```bash
npx @modelcontextprotocol/inspector node ./mcp-server.js
```

Note to just run the inspector on it's own:

```bash
npx @modelcontextprotocol/inspector
```

**Option 2: Use the npm script**

```bash
npm run inspector
```

This will:

1. Start the MCP inspector server
2. Open your browser to the inspector interface
3. Allow you to test tools, resources, and prompts

Open the MCP Server Inspector on the browser:
http://localhost:6274/

## Setting Environment Variables for Testing

To test the API key tools with different keys, you can set environment variables before running the inspector:

**Linux/macOS (Bash/Zsh):**

```bash
# Temporary (current session only)
export API_KEY="your-test-key"
export SUCCESS_CO_API_KEY="your-success-co-api-key"
npm run inspector

# Or set for single command
API_KEY="your-test-key" SUCCESS_CO_API_KEY="your-success-co-api-key" npm run inspector
```

**Windows (Command Prompt):**

```cmd
# Set for current session
set API_KEY=your-test-key
set SUCCESS_CO_API_KEY=your-success-co-api-key
npm run inspector
```

**Windows (PowerShell):**

```powershell
# Set for current session
$env:API_KEY="your-test-key"
$env:SUCCESS_CO_API_KEY="your-success-co-api-key"
npm run inspector

# Or set for single command
$env:API_KEY="your-test-key"; $env:SUCCESS_CO_API_KEY="your-success-co-api-key"; npm run inspector
```

## Integrating with Cursor AI

To integrate this MCP server with Cursor IDE, you need to add the configuration through Cursor's settings interface:

1. Open Cursor IDE
2. Go to **Settings** → **Tools & Integrations**
3. Click on **Add Custom MCP Server**
4. Add the configuration below

**Important:** If you already have other MCP servers configured, don't overwrite the entire configuration. Instead, add the `"MCP Server Boilerplate"` object to the existing `"mcpServers"` object.

**Sample Configuration File:** This project includes a sample configuration file at [`./cursor/mcp.json`](./cursor/mcp.json) that you can reference or copy from.

### Configuration Structure

Below is the configuration you need to add:

**Linux/macOS example:**

```json
{
  "MCP Server Boilerplate": {
    "command": "node",
    "args": ["/home/john/mcp-server-node/mcp-server.js"],
    "env": {
      "API_KEY": "abc-1234567890",
      "SUCCESS_CO_API_KEY": "your-success-co-api-key"
    }
  }
}
```

**Windows example:**

```json
{
  "MCP Server Boilerplate": {
    "command": "node",
    "args": ["C:\\Users\\john\\mcp-server-node\\mcp-server.js"],
    "env": {
      "API_KEY": "abc-1234567890",
      "SUCCESS_CO_API_KEY": "your-success-co-api-key"
    }
  }
}
```

**If you have existing MCP servers configured, your full configuration might look like this:**

```json
{
  "mcpServers": {
    "existing-server": {
      "command": "python",
      "args": ["/path/to/existing/server.py"]
    },
    "MCP Server Boilerplate": {
      "command": "node",
      "args": ["/home/john/mcp-server-node/mcp-server.js"],
      "env": {
        "API_KEY": "abc-1234567890",
        "SUCCESS_CO_API_KEY": "your-success-co-api-key"
      }
    }
  }
}
```

### Configuration Parameters

- **MCP Server Boilerplate:**  
  This is the key for your server configuration. You can name it as you like.

- **command:**  
  The Node.js executable to run your server. You can use either:

  - `"node"` (if Node.js is in your PATH)
  - The full path to your Node.js executable (if needed)

  **Finding your Node.js path:**

  **Linux/macOS:**

  ```bash
  which node
  # Example output: /home/john/.nvm/versions/node/v20.13.1/bin/node
  ```

  **Windows (Command Prompt):**

  ```cmd
  where node
  # Example output: C:\Program Files\nodejs\node.exe
  ```

  **Windows (PowerShell):**

  ```powershell
  Get-Command node
  # Example output: C:\Program Files\nodejs\node.exe
  ```

- **args:**  
  An array containing the absolute path to your MCP server file.

  **Linux/macOS examples:**

  ```json
  ["/home/john/mcp-server-node/mcp-server.js"]
  ```

  **Windows examples:**

  ```json
  ["C:\\Users\\john\\mcp-server-node\\mcp-server.js"]
  ```

- **env:** (Optional)  
  Defines environment variables for your MCP server process. In this example, the `API_KEY` is set to `"abc-1234567890"` and `SUCCESS_CO_API_KEY` is set to `"your-success-co-api-key"`. Adjust these values as needed for your environment.

## Code Overview

The project comprises the following key parts:

- **MCP Server Initialization:**  
  The MCP server is instantiated using `McpServer` from the MCP SDK and connected via `StdioServerTransport` and `StreamableHTTPServerTransport`.

- **Tool Definitions:**

  - **API Key Management:**

    - `setSuccessCoApiKey`: Stores the Success.co API key securely for future use
    - `getSuccessCoApiKey`: Retrieves the stored Success.co API key

  - **Data Retrieval Tools:**

    - `getTeams`: Fetches teams from the Success.co GraphQL API
    - `getUsers`: Fetches users from the Success.co GraphQL API
    - `getTodos`: Fetches todos from the Success.co GraphQL API
    - `getRocks`: Fetches rocks from the Success.co GraphQL API
    - `getMeetings`: Fetches meetings from the Success.co GraphQL API
    - `getIssues`: Fetches issues from the Success.co GraphQL API
    - `getHeadlines`: Fetches headlines from the Success.co GraphQL API
    - `getVisions`: Fetches visions from the Success.co GraphQL API
    - `getRockStatuses`: Fetches rock statuses from the Success.co GraphQL API
    - `getMilestones`: Fetches milestones from the Success.co GraphQL API
    - `getMilestoneStatuses`: Fetches milestone statuses from the Success.co GraphQL API
    - `getTeamsOnRocks`: Fetches team-rock relationships from the Success.co GraphQL API

  - **Analysis Tools:**

    - `analyzeEOSData`: Main analytical tool that can perform complex EOS analysis including:
      - At-risk rocks analysis
      - Overdue items analysis
      - Rock progress analysis
      - Team performance analysis

  - **Utility Tools:**
    - `search`: Intelligent search across all EOS data types
    - `fetch`: Retrieve detailed information about specific items by ID

- **GraphQL Integration:**
  All tools use the Success.co GraphQL API with proper error handling, pagination support, and data validation.

- **Analysis Engine:**
  The `analyzeEOSData` tool includes sophisticated analysis functions that can:

  - Calculate days until due dates
  - Identify overdue items
  - Group data by status and team
  - Provide performance metrics
  - Cross-reference user and team information

- **Error Handling:**
  Comprehensive error handling for API failures, invalid parameters, and data validation issues.

- **Input Validation:**
  Uses Zod schemas for all tool parameters to ensure data integrity and provide clear error messages.

## Using the MCP Tool in Cursor (Agent Mode)

With the MCP server integrated into Cursor IDE and with Agent mode enabled, you can use the tools in several ways:

### EOS Analysis Tool Usage

The primary tool for complex EOS queries is `analyzeEOSData`. You can use natural language prompts like:

**At-Risk Rocks Analysis:**

```
Which company Rocks are at risk of missing their due dates this quarter, and who owns them?
```

**Overdue Items Analysis:**

```
Show me all overdue rocks and who owns them
```

**Progress Analysis:**

```
What is the current progress status of all rocks?
```

**Team Performance Analysis:**

```
How are teams performing with their rocks?
```

**Level 10 Meeting Analysis:**

```
What are the top 5 open Issues for this week's Level 10 meeting and their owners?
Show me all Level 10 meetings and their facilitators
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
```

The AI agent will automatically infer the appropriate tools to use based on your request and may combine multiple tools to provide comprehensive answers.

## References & Resources

- [Model Context Protocol: typescript-sdk](https://github.com/modelcontextprotocol/typescript-sdk)
- [Use Your Own MCP on Cursor in 5 Minutes](https://dev.to/andyrewlee/use-your-own-mcp-on-cursor-in-5-minutes-1ag4)
- [Model Context Protocol Introduction](https://modelcontextprotocol.io/introduction)
- [Success.co API Documentation](https://coda.io/@successco/success-co-api)
