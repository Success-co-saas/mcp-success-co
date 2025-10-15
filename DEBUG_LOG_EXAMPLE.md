# Debug Log Format Example

This document shows what the improved debug log format looks like with the new three-phase logging.

## Example: Successful Tool Call with GraphQL Queries

```
================================================================================
>>> TOOL CALL START: getMeetings [2024-10-15T17:30:00.123Z]
================================================================================
Arguments:
{
  "teamId": "team-abc-123",
  "dateAfter": "2024-10-01",
  "first": 5
}
--------------------------------------------------------------------------------

=== GraphQL Call 2024-10-15T17:30:00.150Z ===
URL: https://api.success.co/graphql
Status: 200
Query: query { meetingInfos(filter: {teamId: {equalTo: "team-abc-123"}, stateId: {equalTo: "ACTIVE"}}) { nodes { id name teamId team { id name } } } }
Response: {
  "data": {
    "meetingInfos": {
      "nodes": [
        {"id": "mi-1", "name": "Weekly L10", "teamId": "team-abc-123", "team": {"id": "team-abc-123", "name": "Leadership Team"}}
      ]
    }
  }
}
=== End GraphQL Call ===

=== GraphQL Call 2024-10-15T17:30:00.275Z ===
URL: https://api.success.co/graphql
Status: 200
Query: query { meetings(filter: {stateId: {equalTo: "ACTIVE"}, meetingInfoId: {in: ["mi-1"]}, date: {greaterThanOrEqualTo: "2024-10-01"}}, first: 5, orderBy: DATE_DESC) { nodes { id meetingInfoId date startTime endTime averageRating meetingStatusId createdAt stateId companyId } totalCount } }
Response: {
  "data": {
    "meetings": {
      "nodes": [
        {"id": "meeting-1", "meetingInfoId": "mi-1", "date": "2024-10-14", "startTime": "09:00", "endTime": "10:00"},
        {"id": "meeting-2", "meetingInfoId": "mi-1", "date": "2024-10-07", "startTime": "09:00", "endTime": "10:00"}
      ],
      "totalCount": 2
    }
  }
}
=== End GraphQL Call ===

--------------------------------------------------------------------------------
<<< TOOL CALL END: getMeetings [2024-10-15T17:30:00.321Z]
Result:
{
  "content": [
    {
      "type": "text",
      "text": "{\"totalCount\":2,\"results\":[{\"id\":\"meeting-1\",\"meetingInfoId\":\"mi-1\",\"meetingInfoName\":\"Weekly L10\",\"teamId\":\"team-abc-123\",\"teamName\":\"Leadership Team\",\"date\":\"2024-10-14\",\"startTime\":\"09:00\",\"endTime\":\"10:00\",\"averageRating\":null,\"status\":\"COMPLETE\",\"createdAt\":\"2024-10-01T08:00:00Z\"},{\"id\":\"meeting-2\",\"meetingInfoId\":\"mi-1\",\"meetingInfoName\":\"Weekly L10\",\"teamId\":\"team-abc-123\",\"teamName\":\"Leadership Team\",\"date\":\"2024-10-07\",\"startTime\":\"09:00\",\"endTime\":\"10:00\",\"averageRating\":4.5,\"status\":\"COMPLETE\",\"createdAt\":\"2024-09-30T08:00:00Z\"}]}"
    }
  ]
}
================================================================================
```

## Example: Tool Call with Error

```
================================================================================
>>> TOOL CALL START: getTeams [2024-10-15T17:31:00.456Z]
================================================================================
Arguments:
{
  "first": 10
}
--------------------------------------------------------------------------------

=== GraphQL Call 2024-10-15T17:31:00.489Z ===
URL: https://api.success.co/graphql
Status: 401
Query: query { teams(first: 10) { nodes { id name isLeadership } totalCount } }
Response: {
  "errors": [
    {
      "message": "Access denied - Invalid API key (1)"
    }
  ]
}
=== End GraphQL Call ===

--------------------------------------------------------------------------------
<<< TOOL CALL END: getTeams [2024-10-15T17:31:00.498Z]
ERROR:
HTTP error! status: 401, details: Access denied - Invalid API key (1)
================================================================================
```

## Example: Multiple Tool Calls in Sequence

```
================================================================================
>>> TOOL CALL START: getTeams [2024-10-15T17:32:00.100Z]
================================================================================
Arguments:
{
  "first": 1
}
--------------------------------------------------------------------------------

=== GraphQL Call 2024-10-15T17:32:00.125Z ===
URL: https://api.success.co/graphql
Status: 200
Query: query { teams(first: 1) { nodes { id name isLeadership } totalCount } }
Response: {"data": {"teams": {"nodes": [{"id": "team-123", "name": "Leadership", "isLeadership": true}], "totalCount": 15}}}
=== End GraphQL Call ===

--------------------------------------------------------------------------------
<<< TOOL CALL END: getTeams [2024-10-15T17:32:00.145Z]
Result:
{
  "content": [
    {
      "type": "text",
      "text": "{\"totalCount\":15,\"results\":[{\"id\":\"team-123\",\"name\":\"Leadership\",\"isLeadership\":true}]}"
    }
  ]
}
================================================================================

================================================================================
>>> TOOL CALL START: getTodos [2024-10-15T17:32:01.200Z]
================================================================================
Arguments:
{
  "teamId": "team-123",
  "status": "TODO",
  "first": 5
}
--------------------------------------------------------------------------------

=== GraphQL Call 2024-10-15T17:32:01.225Z ===
URL: https://api.success.co/graphql
Status: 200
Query: query { todos(filter: {teamId: {equalTo: "team-123"}, todoStatusId: {equalTo: "TODO"}}, first: 5) { nodes { id name desc todoStatusId dueDate } totalCount } }
Response: {"data": {"todos": {"nodes": [{"id": "todo-1", "name": "Complete report", "desc": "", "todoStatusId": "TODO", "dueDate": "2024-10-20"}], "totalCount": 8}}}
=== End GraphQL Call ===

--------------------------------------------------------------------------------
<<< TOOL CALL END: getTodos [2024-10-15T17:32:01.242Z]
Result:
{
  "content": [
    {
      "type": "text",
      "text": "{\"totalCount\":8,\"results\":[{\"id\":\"todo-1\",\"name\":\"Complete report\",\"description\":\"\",\"status\":\"TODO\",\"dueDate\":\"2024-10-20\"}]}"
    }
  ]
}
================================================================================
```

## Reading the Log

### Visual Markers

- `================================================================================` - Major separator (tool call boundaries)
- `--------------------------------------------------------------------------------` - Minor separator (between phases)
- `>>> TOOL CALL START` - Beginning of a tool execution
- `<<< TOOL CALL END` - End of a tool execution
- `=== GraphQL Call ===` - GraphQL request/response (happens during tool execution)

### Flow

1. **START**: Tool name + arguments + timestamp
2. **DURING**: Any GraphQL calls made by the tool (can be 0, 1, or many)
3. **END**: Final result or error + timestamp

### Performance Analysis

You can calculate tool execution time by comparing timestamps:

- Start: `2024-10-15T17:30:00.123Z`
- End: `2024-10-15T17:30:00.321Z`
- Duration: ~198ms

### Troubleshooting

1. **No GraphQL calls between START and END**: Tool returned early (validation error, cache hit, etc.)
2. **Multiple GraphQL calls**: Tool made multiple API requests (e.g., getMeetings fetches meetingInfos first)
3. **GraphQL error followed by tool error**: API error was handled and returned to user
4. **Tool error with no GraphQL call**: Validation failed before making any API calls
