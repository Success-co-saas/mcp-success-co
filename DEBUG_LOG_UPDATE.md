# Debug Logging Enhancement

## Summary

Enhanced the debug logging system to capture both GraphQL calls and MCP tool requests/responses in a unified debug log file.

## Changes Made

### 1. Log File Renamed

- **Old**: `/tmp/mcp-success-co-graphql-debug.log`
- **New**: `/tmp/mcp-success-co-debug.log`

The new name reflects that the log now contains both GraphQL and tool call information.

### 2. New Tool Logging Functions (`tools.js`)

Added two functions to log MCP tool invocations with better flow visibility:

```javascript
export function logToolCallStart(toolName, args)
export function logToolCallEnd(toolName, result, error = null)
```

**Features**:

- Logs tool request BEFORE execution (shows what's being called)
- Logs GraphQL calls DURING execution (existing functionality)
- Logs tool response/error AFTER execution (shows the result)
- Only logs when `isDevMode` is enabled (NODE_ENV=development or DEBUG=true)
- Appends to the same debug log file as GraphQL calls
- Clear visual separation with borders for easy reading

**Log Format** (shows complete flow):

```
================================================================================
>>> TOOL CALL START: getTeams [2024-10-15T16:28:00.000Z]
================================================================================
Arguments:
{
  "first": 10,
  "offset": 0
}
--------------------------------------------------------------------------------

=== GraphQL Call 2024-10-15T16:28:00.100Z ===
URL: https://api.success.co/graphql
Status: 200
Query: query { teams(first: 10) { nodes { id name } } }
Response: {...}
=== End GraphQL Call ===

--------------------------------------------------------------------------------
<<< TOOL CALL END: getTeams [2024-10-15T16:28:00.250Z]
Result:
{
  "content": [...]
}
================================================================================
```

### 3. MCP Server Integration (`mcp-server.js`)

Updated the tool call handler to log the complete flow:

- **Line 1762**: Logs tool call START before execution begins
- **Line 1767**: Logs tool call END with result after successful execution
- **Line 1780**: Logs tool call END with error after failed execution
- Imported both `logToolCallStart` and `logToolCallEnd` functions

### 4. Log Contents

The debug log now contains a complete execution flow for each tool call:

1. **Tool Call START**: Shows the tool name and arguments being passed
2. **GraphQL Calls** (during execution): All GraphQL API requests made by the tool
3. **Tool Call END**: Shows the final result or error from the tool

This three-phase logging makes it easy to trace the complete lifecycle of each tool invocation.

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

1. **Complete Flow Visibility**: See the entire lifecycle of each tool call from start to finish
2. **Unified Logging**: Tool calls, GraphQL requests, and responses all in chronological order
3. **Easy Debugging**: Clear visual separation with borders makes it easy to find and read each tool call
4. **Request/Response Correlation**: Arguments logged before execution, results logged after
5. **GraphQL Traceability**: See exactly which GraphQL calls were made during each tool execution
6. **Performance Analysis**: Timestamps on START and END let you measure tool execution time
7. **Error Tracking**: Capture both GraphQL and tool-level errors with full context
8. **Development Only**: No performance impact in production

## Notes

- Logging only occurs when development mode is enabled
- The log file is located in `/tmp` which is typically cleared on system restart
- Log entries include ISO timestamps for easy correlation
- Failed log writes do not break functionality (fail silently with console error)
