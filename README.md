# 🟢 Success.co MCP Server

![MCP Server in Node.js banner](https://github.com/user-attachments/assets/6608286c-0dd2-4f15-a797-ed63d902a38a)

## Success.co EOS Framework MCP Server

This MCP server provides comprehensive access to Success.co's EOS (Entrepreneurial Operating System) data, enabling AI assistants like ChatGPT and Claude to answer complex questions about company operations, team performance, project management, and Level 10 meetings.

[Overview](#overview) · [Quick dev setup and notes](#quick-dev-setup-and-notes) · [Features](#features) · [MCP Transport Mechanisms](#mcp-transport-mechanisms) · [Installation](#installation) · [EOS Analysis Tools](#eos-analysis-tools) · [Testing with MCP Inspector](#testing-with-mcp-inspector) · [Setting Environment Variables for Testing](#setting-environment-variables-for-testing) · [Integrating with Cursor AI](#integrating-with-cursor-ai) · [Using the MCP Tool in Cursor (Agent Mode)](#using-the-mcp-tool-in-cursor-agent-mode) · [Code Overview](#code-overview) · [References & Resources](#references--resources) · [License](#license)

## Overview

**MCP (Model Context Protocol)** is a framework that allows you to integrate custom tools into AI-assisted development environments—such as Cursor AI. MCP servers expose functionality (like data retrieval or code analysis) so that an LLM-based IDE can call these tools on demand. Learn more about MCP in the [Model Context Protocol Introduction](https://modelcontextprotocol.io/introduction).

This project demonstrates an MCP server implemented in JavaScript using Node.js that provides comprehensive access to Success.co's EOS framework data. It includes tools for retrieving teams, users, todos, rocks, meetings, issues, headlines, visions, and Scorecard measurables. Most importantly, it includes advanced analytical tools that can answer complex EOS-related questions like "Which company Rocks are at risk of missing their due dates this quarter, and who owns them?", Scorecard questions like "Give me the last 12 weeks of Scorecard measurables for my team and flag any KPI below target", and Level 10 meeting questions like "What are the top 5 open Issues for this week's Level 10 meeting and their owners?"

## Quick dev setup and notes

### Local Development Setup

1. **Start the MCP Server:**

   ```bash
   node mcp-server.js
   ```

   The server will start and listen on port 3001 with both STDIO and HTTP transports available.

2. **Test with MCP Inspector:**

   ```bash
   npx @modelcontextprotocol/inspector
   ```

3. **Connect to the Server:**

   - **Streamable HTTP (Recommended):** `http://localhost:3001/mcp`
   - **Legacy SSE (Backwards Compatible):** `http://localhost:3001/sse`

4. **For External Access (Optional):**

   ```bash
   # Expose server via ngrok for external testing
   ngrok http 3001
   ```

   Tip: To install ngrok, use this to install it and create an account at ngrok.com to get an authtoken

   ```bash
   brew install ngrok
   ```

### Transport Notes

- **Streamable HTTP** is the preferred transport method per MCP specification
- **STDIO** transport is used automatically when integrating with IDEs like Cursor
- **SSE endpoint** is maintained for backwards compatibility with older clients
- The server automatically detects and handles both transport methods

- **Node.js:** Version 20 or higher is required.
- **Success.co API Key:** You'll need a valid Success.co API key to access the data.

## Features

- **EOS Data Access:** Complete access to Success.co's EOS framework data including teams, users, todos, rocks, meetings, issues, headlines, visions, and meeting agendas
- **Level 10 Meeting Analysis:** Specialized tools for analyzing Level 10 meetings, including issue tracking, facilitator/scribe information, and agenda sections
- **Scorecard measurables Analysis:** Comprehensive KPI analysis including target flagging, trend analysis, and performance tracking
- **Advanced Analytics:** Sophisticated analysis tools for at-risk rocks, overdue items, team performance, progress tracking, and meeting insights
- **GraphQL Integration:** Full integration with Success.co's GraphQL API
- **API Key Management:** Secure storage and retrieval of Success.co API keys
- **Input Validation:** Uses [Zod](https://github.com/colinhacks/zod) for schema validation
- **Multiple Transports:** Supports both STDIO and HTTP transports
- **Comprehensive Search:** Intelligent search across all EOS data types
- **Real-time Analysis:** Dynamic analysis of rock statuses, milestones, team performance, and KPI metrics

## MCP Transport Mechanisms

This MCP server supports both standard transport mechanisms defined in the [MCP Specification](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports):

### 1. STDIO Transport (Recommended)

The **stdio** transport is the preferred method for MCP communication:

- **How it works:** The client launches the MCP server as a subprocess
- **Communication:** Server reads JSON-RPC messages from `stdin` and sends responses to `stdout`
- **Message format:** Individual JSON-RPC requests, notifications, or responses delimited by newlines
- **Logging:** Server may write UTF-8 strings to `stderr` for logging purposes
- **Security:** No network exposure, runs locally as a subprocess

**Usage in Cursor IDE:**

```json
{
  "MCP Server Boilerplate": {
    "command": "node",
    "args": ["/path/to/mcp-server.js"],
    "env": {
      "SUCCESS_CO_API_KEY": "your-api-key"
    }
  }
}
```

### 2. Streamable HTTP Transport

The **Streamable HTTP** transport allows the server to operate as an independent process handling multiple client connections:

- **How it works:** Server operates independently and can handle multiple client connections
- **Protocol:** Uses HTTP POST and GET requests with optional Server-Sent Events (SSE)
- **Endpoint:** Single HTTP endpoint (e.g., `https://example.com/mcp`) supporting both POST and GET methods
- **Features:** Supports streaming, server-to-client notifications, and resumable connections

**Security Requirements:**

- **Origin validation:** Servers MUST validate the `Origin` header to prevent DNS rebinding attacks
- **Local binding:** When running locally, servers SHOULD bind only to localhost (127.0.0.1)
- **Authentication:** Servers SHOULD implement proper authentication for all connections

**HTTP Headers:**

- **MCP-Protocol-Version:** Clients MUST include this header (e.g., `MCP-Protocol-Version: 2025-06-18`)
- **Accept:** Clients MUST include `Accept: application/json, text/event-stream`
- **Mcp-Session-Id:** For session management (optional)

**Message Flow:**

1. **Client to Server:** JSON-RPC messages sent via HTTP POST requests
2. **Server to Client:** Responses via `Content-Type: application/json` or `Content-Type: text/event-stream` (SSE)
3. **Streaming:** Server can initiate SSE streams for multiple messages
4. **Resumability:** Supports connection resumption using `Last-Event-ID` header

**Usage with MCP Inspector:**

```bash
# Start server with HTTP transport
node mcp-server.js

# In another terminal, start inspector and connect to HTTP endpoint
npx @modelcontextprotocol/inspector
# Connect to: http://localhost:3001/mcp
```

### Transport Selection

- **For IDE Integration:** Use STDIO transport (recommended for Cursor, VS Code, etc.)
- **For Web Applications:** Use Streamable HTTP transport
- **For Testing:** Both transports work with MCP Inspector

### Backwards Compatibility

The server maintains backwards compatibility with the deprecated HTTP+SSE transport from protocol version 2024-11-05. Clients can automatically detect and use the appropriate transport method.

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


- **Error Handling:**
  Comprehensive error handling for API failures, invalid parameters, and data validation issues.

- **Input Validation:**
  Uses Zod schemas for all tool parameters to ensure data integrity and provide clear error messages.

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
```

The AI agent will automatically infer the appropriate tools to use based on your request and may combine multiple tools to provide comprehensive answers.

## References & Resources

- [Model Context Protocol: typescript-sdk](https://github.com/modelcontextprotocol/typescript-sdk)
- [Use Your Own MCP on Cursor in 5 Minutes](https://dev.to/andyrewlee/use-your-own-mcp-on-cursor-in-5-minutes-1ag4)
- [Model Context Protocol Introduction](https://modelcontextprotocol.io/introduction)
- [Success.co API Documentation](https://coda.io/@successco/success-co-api)
