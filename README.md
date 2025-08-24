# 🟢 MCP Server in Node.js

![MCP Server in Node.js banner](https://github.com/user-attachments/assets/6608286c-0dd2-4f15-a797-ed63d902a38a)

## Build and run a custom MCP Server in Node.js in just 2 minutes ⏱️

[Overview](#overview) · [Features](#features) · [Installation](#installation) · [Testing with MCP Inspector](#testing-with-mcp-inspector) · [Setting Environment Variables for Testing](#setting-environment-variables-for-testing) · [Integrating with Cursor AI](#integrating-with-cursor-ai) · [Using the MCP Tool in Cursor (Agent Mode)](#using-the-mcp-tool-in-cursor-agent-mode) · [Code Overview](#code-overview) · [What is MCP?](#what-is-mcp) · [References & Resources](#references--resources) · [License](#license)

## Overview

**MCP (Model Context Protocol)** is a framework that allows you to integrate custom tools into AI-assisted development environments—such as Cursor AI. MCP servers expose functionality (like data retrieval or code analysis) so that an LLM-based IDE can call these tools on demand. Learn more about MCP in the [Model Context Protocol Introduction](https://modelcontextprotocol.io/introduction).

This project demonstrates an MCP server implemented in JavaScript using Node.js. It defines two tools: **add**, which takes two numeric inputs and returns their sum, and **getApiKey**, which retrieves the API key from the `API_KEY` environment variable. It also provides a predefined prompt **add_numbers** that allows AI models to infer the usage of the addition tool.

## Requirements

- **Node.js:** Version 20 or higher is required.

## Features

- **MCP Integration:** Exposes tool functionality to LLM-based IDEs.
- **Addition Tool:** Accepts two numeric parameters and returns their sum.
- **MCP Prompt:** Provides a predefined prompt ("add_numbers") that allow AI models to infer tool usage.
- **Env Var Retrieval:** Demonstrates how to load an example environment variable from the configuration file.
- **Input Validation:** Uses [Zod](https://github.com/colinhacks/zod) for schema validation.
- **Standard I/O Transport:** Connects via `StdioServerTransport` for integration with development environments.

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

## Testing with MCP Inspector

The MCP Inspector is a debugging tool that lets you test your server's tools interactively before integrating with an IDE.

**Option 1: Run directly with npx**

```bash
npx @modelcontextprotocol/inspector node ./mcp-server.js
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

To test the `getApiKey` tool with different API keys, you can set environment variables before running the inspector:

**Linux/macOS (Bash/Zsh):**

```bash
# Temporary (current session only)
export API_KEY="your-test-key"
npm run inspector

# Or set for single command
API_KEY="your-test-key" npm run inspector
```

**Windows (Command Prompt):**

```cmd
# Set for current session
set API_KEY=your-test-key
npm run inspector
```

**Windows (PowerShell):**

```powershell
# Set for current session
$env:API_KEY="your-test-key"
npm run inspector

# Or set for single command
$env:API_KEY="your-test-key"; npm run inspector
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
      "API_KEY": "abc-1234567890"
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
      "API_KEY": "abc-1234567890"
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
        "API_KEY": "abc-1234567890"
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
  Defines environment variables for your MCP server process. In this example, the `API_KEY` is set to `"abc-1234567890"`. Adjust this value as needed for your environment.

## Code Overview

The project comprises the following key parts:

- **MCP Server Initialization:**  
  The MCP server is instantiated using `McpServer` from the MCP SDK and connected via `StdioServerTransport`.

- **Tool Definitions:**

  - **add:**  
    Defined with a Zod schema that accepts two numbers (`a` and `b`) and returns their sum as text.
  - **getApiKey:**  
    Retrieves the API key from the environment variable `API_KEY` and returns it as text.

- **Prompt Definition:**
  - **add_numbers:**  
    A predefined prompt that allows AI models to infer the usage of the addition tool.

**Important Note**: It's not required to have a prompt defined for a tool. This example just demonstrates one of the capabilities of prompts, allowing the AI model to infer which tool to use based on your input. The AI can also use tools directly when it determines they're needed for a task.

## Using the MCP Tool in Cursor (Agent Mode)

With the MCP server integrated into Cursor IDE and with Agent mode enabled, you can use the tools in several ways:

### Addition Tool Usage

**Method 1: Natural Language Prompt**
Simply use a natural language prompt like:

```
add 3 and 5
```

or

```
what is 7 plus 12?
```

**Method 2: Prompt-Based Tool Invocation**
Type the following prompt in the chat:

```
/add_numbers
```

**Note**: The prompt name is "add_numbers" and you can invoke it by typing `/add_numbers` in the chat.

When you press Enter after typing this prompt, Cursor will automatically:

1. Recognize that you want to use the `add` tool from the Node Server
2. Display a GUI prompt asking for the two number parameters
3. The AI model will infer that it needs to use the `add` tool to calculate the result

**Parameters for the Addition Tool:**

- **Parameter `a`**: First number to add
- **Parameter `b`**: Second number to add
- **Returns**: The sum of the two numbers as text

### API Key Tool Usage

For the `getApiKey` tool, you can use:

```
what is my API key?
```

or

```
get my API key
```

The AI agent will automatically infer the appropriate tool to use based on your request.

## References & Resources

- [Model Context Protocol: typescript-sdk](https://github.com/modelcontextprotocol/typescript-sdk)
- [Use Your Own MCP on Cursor in 5 Minutes](https://dev.to/andyrewlee/use-your-own-mcp-on-cursor-in-5-minutes-1ag4)
- [Model Context Protocol Introduction](https://modelcontextprotocol.io/introduction)

## License

This project is licensed under the [MIT License](LICENSE).
