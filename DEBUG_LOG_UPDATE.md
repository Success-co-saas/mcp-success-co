# Debug Logging Enhancement

## Summary

Enhanced the debug logging system to capture both GraphQL calls and MCP tool requests/responses in a unified debug log file.

## Changes Made

### 1. Log File Renamed

- **Old**: `/tmp/mcp-success-co-graphql-debug.log`
- **New**: `/tmp/mcp-success-co-debug.log`

The new name reflects that the log now contains both GraphQL and tool call information.

### 2. New Tool Logging Function (`tools.js`)

Added `logToolCall()` function to log MCP tool invocations:

```javascript
export function logToolCall(toolName, args, result, error = null)
```

**Features**:

- Logs tool name, arguments, and results
- Handles both successful calls and errors
- Only logs when `isDevMode` is enabled (NODE_ENV=development or DEBUG=true)
- Appends to the same debug log file as GraphQL calls

**Log Format**:

```
=== Tool Call 2024-10-15T16:28:00.000Z ===
Tool: getTeams
Arguments: {
  "first": 10,
  "offset": 0
}
Result: {
  "content": [...]
}
=== End Tool Call ===
```

### 3. MCP Server Integration (`mcp-server.js`)

Updated the tool call handler to log all tool requests and responses:

- **Line 1755**: Logs successful tool calls with their results
- **Line 1768**: Logs failed tool calls with error messages
- Imported the new `logToolCall` function

### 4. Log Contents

The debug log now contains:

1. **GraphQL Calls**: All GraphQL API requests to Success.co
2. **Tool Calls**: All MCP tool invocations (getTeams, getTodos, createIssue, etc.)

## Usage

### Enable Debug Mode

Set one of these in your `.env` file:

```bash
NODE_ENV=development
# OR
DEBUG=true
```

### View Debug Logs

```bash
tail -f /private/tmp/mcp-success-co-debug.log
```

### Clear Debug Logs

The log file can be cleared manually:

```bash
> /private/tmp/mcp-success-co-debug.log
```

Or programmatically using the `clearDebugLog()` helper function from `helpers.js`.

## Benefits

1. **Unified Logging**: Both GraphQL and tool calls in one place
2. **Better Debugging**: See complete request/response flow
3. **Performance Analysis**: Track which tools are being called and how long they take
4. **Error Tracking**: Capture both GraphQL and tool-level errors
5. **Development Only**: No performance impact in production

## Notes

- Logging only occurs when development mode is enabled
- The log file is located in `/tmp` which is typically cleared on system restart
- Log entries include ISO timestamps for easy correlation
- Failed log writes do not break functionality (fail silently with console error)
