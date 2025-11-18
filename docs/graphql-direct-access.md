# GraphQL Direct Access Tools

The MCP server now includes two powerful tools for direct GraphQL API access, giving AI assistants the ability to construct and execute any valid GraphQL query or mutation.

## Overview

While the MCP server provides 70+ specialized tools for common operations (like `getTodos`, `createRock`, `updateIssue`), there are scenarios where you need more flexibility:

- Complex queries with custom filtering/sorting
- Batch operations updating multiple entities
- Accessing fields not exposed by specialized tools
- Operations on entities not covered by existing tools
- Advanced PostGraphile filtering capabilities

## Available Tools

### 1. `getGraphQLSchema`

Retrieves the complete GraphQL schema, documentation, and usage examples.

**Parameters:** None

**Returns:**
- Complete GraphQL schema (PostGraphile introspection format)
- API endpoint information  
- Usage examples and common patterns
- Tips for working with the Success.co GraphQL API

**When to use:**
- Before constructing custom GraphQL queries
- To understand available types, fields, and relationships
- To discover what operations are possible

**Example:**
```javascript
// AI Assistant calls this to understand the schema
getGraphQLSchema()

// Returns:
{
  "schema": { /* Full PostGraphile introspection schema */ },
  "endpoint": "http://localhost:5174/graphql",
  "authentication": "Automatically handled",
  "usage": { /* Examples and tips */ },
  "commonPatterns": { /* Query patterns */ }
}
```

### 2. `executeGraphQL`

Execute any valid GraphQL query or mutation against the Success.co API.

**Parameters:**
- `query` (required): The GraphQL query or mutation string
- `variables` (optional): Variables object for parameterized queries

**Returns:**
- `success`: Boolean indicating if the operation succeeded
- `data`: Response data from the GraphQL API (if successful)
- `error`: Error message (if failed)

**Authentication:** Automatically handled using OAuth token or API key

## Usage Examples

### Example 1: Get V/TO Core Values with Details

Using direct GraphQL access to get nested relationships:

```graphql
query GetVTOCoreValues {
  leaderships(first: 1) {
    nodes {
      id
      coreValues(orderBy: SORT_ORDER_ASC) {
        nodes {
          id
          value
          sortOrder
          coreValueDetails(orderBy: SORT_ORDER_ASC) {
            nodes {
              id
              detail
              sortOrder
            }
          }
        }
      }
    }
  }
}
```

### Example 2: Update V/TO Core Value with Multiple Fields

```javascript
executeGraphQL({
  query: `
    mutation UpdateCoreValue($id: ID!, $value: String!, $detail: String!) {
      updateCoreValue(
        input: {
          id: $id
          coreValuePatch: {
            value: $value
            detail: $detail
          }
        }
      ) {
        coreValue {
          id
          value
          detail
          updatedAt
        }
      }
    }
  `,
  variables: {
    id: "WyJjb3JlX3ZhbHVlcyIsIjEyMyJd",
    value: "Integrity",
    detail: "Do what's right, even when no one is watching"
  }
})
```

### Example 3: Complex Todo Query with Filtering

```graphql
query GetMyHighPriorityTodos {
  todos(
    condition: { 
      userId: "user_123",
      priority: "HIGH",
      stateId: "active"
    }
    orderBy: [DUE_AT_ASC, CREATED_AT_DESC]
    first: 20
  ) {
    nodes {
      id
      desc
      dueAt
      priority
      createdAt
      user {
        name
        email
      }
      team {
        name
      }
      meeting {
        meetAt
        info {
          name
        }
      }
    }
    totalCount
  }
}
```

### Example 4: Batch Create Multiple Items

```javascript
executeGraphQL({
  query: `
    mutation CreateMultipleTodos(
      $todo1: TodoInput!,
      $todo2: TodoInput!,
      $todo3: TodoInput!
    ) {
      t1: createTodo(input: { todo: $todo1 }) {
        todo { id desc }
      }
      t2: createTodo(input: { todo: $todo2 }) {
        todo { id desc }
      }
      t3: createTodo(input: { todo: $todo3 }) {
        todo { id desc }
      }
    }
  `,
  variables: {
    todo1: {
      desc: "First todo",
      userId: "user_123",
      companyId: "company_456",
      stateId: "active"
    },
    todo2: {
      desc: "Second todo",
      userId: "user_123",
      companyId: "company_456",
      stateId: "active"
    },
    todo3: {
      desc: "Third todo",
      userId: "user_123",
      companyId: "company_456",
      stateId: "active"
    }
  }
})
```

### Example 5: Query with Nested Relationships

```graphql
query GetRocksWithDetails {
  rocks(
    condition: { status: "OPEN" }
    orderBy: DUE_AT_ASC
    first: 10
  ) {
    nodes {
      id
      desc
      dueAt
      status
      user {
        id
        name
        email
      }
      team {
        id
        name
        isLeadership
      }
      todos(condition: { stateId: "active" }) {
        nodes {
          id
          desc
          dueAt
        }
      }
      comments {
        nodes {
          id
          comment
          createdAt
          user {
            name
          }
        }
      }
    }
  }
}
```

## Common Patterns

### Filtering with Conditions

```graphql
# Exact match
condition: { userId: "123", stateId: "active" }

# Multiple conditions (AND)
condition: { 
  priority: "HIGH",
  status: "OPEN",
  teamId: "team_456"
}
```

### Sorting

```graphql
# Single field
orderBy: DUE_AT_ASC

# Multiple fields (priority order)
orderBy: [PRIORITY_DESC, DUE_AT_ASC, CREATED_AT_DESC]

# Available sort directions: _ASC, _DESC
```

### Pagination

```graphql
# Basic pagination
first: 50
offset: 0

# Cursor-based pagination
first: 50
after: "cursor_string_here"

# Get total count
{
  todos(first: 50) {
    nodes { id desc }
    totalCount
    pageInfo {
      hasNextPage
      endCursor
    }
  }
}
```

### Creating Entities

```graphql
mutation {
  createTodo(input: {
    todo: {
      desc: "New todo"
      userId: "user_123"
      companyId: "company_456"
      stateId: "active"
      priority: "MEDIUM"
      dueAt: "2024-12-31T23:59:59Z"
    }
  }) {
    todo {
      id
      desc
      createdAt
    }
  }
}
```

### Updating Entities

```graphql
mutation {
  updateRock(input: {
    id: "WyJyb2NrcyIsIjEyMyJd"
    rockPatch: {
      desc: "Updated description"
      status: "COMPLETE"
      completedAt: "2024-11-18T00:00:00Z"
    }
  }) {
    rock {
      id
      desc
      status
      completedAt
    }
  }
}
```

### Deleting Entities

```graphql
mutation {
  deleteIssue(input: { 
    id: "WyJpc3N1ZXMiLCIxMjMiXQ==" 
  }) {
    deletedIssueId
  }
}
```

## Important Notes

### Authentication
- **Automatic**: No need to pass tokens manually
- Uses the same OAuth token or API key as other MCP tools
- Authentication context is preserved across all requests

### Company Scoping
- All queries are automatically scoped to the authenticated user's company
- Row-level security enforces permissions based on user role
- You can only access data from your own company

### PostGraphile Conventions
- Tables are pluralized: `todos`, `rocks`, `issues`, `meetings`
- Mutations follow pattern: `create[Type]`, `update[Type]`, `delete[Type]`
- Updates use `[type]Patch` objects: `todoPatch`, `rockPatch`, etc.
- Node IDs are global (base64-encoded strings like `WyJ0b2RvcyIsIjEyMyJd`)

### Available Entities

All Success.co entities are available:
- **Core**: `todos`, `rocks`, `issues`, `headlines`, `milestones`
- **Meetings**: `meetings`, `meetingInfos`, `meetingAgendas`
- **V/TO**: `leaderships`, `coreValues`, `coreValueDetails`, `coreFocuses`, `threeYearGoals`, `marketStrategies`
- **Scorecard**: `measurables`, `measurableEntries`
- **Organization**: `teams`, `users`, `companies`
- **Other**: `comments`, `orgCheckups`, `accountabilityChartSeats`

## When to Use Direct GraphQL vs. Specialized Tools

### Use Specialized Tools When:
- ✅ The operation is straightforward (get, create, update, delete)
- ✅ The tool provides all the fields you need
- ✅ You want simpler, more guided interactions
- ✅ You're performing common operations

### Use Direct GraphQL When:
- ✅ You need complex filtering or relationships
- ✅ You need to access fields not exposed by specialized tools
- ✅ You want to batch multiple operations
- ✅ You need more control over the exact data returned
- ✅ The specialized tools are too restrictive
- ✅ You're working with V/TO data (which has complex nested structures)

## Troubleshooting

### Invalid Query Syntax
If you get syntax errors, use `getGraphQLSchema` to check:
- Available field names
- Required vs optional fields
- Correct type names
- Available mutations

### Authentication Errors
- Verify the user is authenticated (check `user://current` resource)
- Ensure the API endpoint is configured correctly
- Check that the OAuth token hasn't expired

### Permission Errors
- Row-level security may prevent access to certain data
- Verify the user has permissions for the requested operation
- Check that you're querying data from the correct company

### Field Not Found
- Use `getGraphQLSchema` to discover available fields
- Check for typos in field names (GraphQL is case-sensitive)
- Verify the field exists on that type

## Examples for Common Use Cases

### 1. Updating V/TO Core Values

This was previously difficult with specialized tools. Now it's straightforward:

```javascript
// First, get the current V/TO structure
executeGraphQL({
  query: `
    query GetVTO {
      leaderships(first: 1) {
        nodes {
          id
          coreValues {
            nodes { id value detail sortOrder }
          }
        }
      }
    }
  `
})

// Then update a core value
executeGraphQL({
  query: `
    mutation UpdateCoreValue($id: ID!, $value: String!) {
      updateCoreValue(input: { 
        id: $id 
        coreValuePatch: { value: $value } 
      }) {
        coreValue { id value }
      }
    }
  `,
  variables: {
    id: "WyJjb3JlX3ZhbHVlcyIsIjEyMyJd",
    value: "Updated Core Value"
  }
})
```

### 2. Complex Dashboard Query

Get everything needed for a dashboard in one query:

```graphql
query GetDashboard {
  todos: todos(condition: { stateId: "active" }, first: 10) {
    nodes { id desc dueAt }
  }
  
  rocks: rocks(condition: { status: "OPEN" }, first: 5) {
    nodes { id desc dueAt }
  }
  
  issues: issues(condition: { status: "OPEN" }, first: 5) {
    nodes { id desc priority }
  }
  
  recentMeetings: meetings(orderBy: MEET_AT_DESC, first: 3) {
    nodes { id meetAt info { name } }
  }
}
```

### 3. Bulk Status Updates

Update multiple items at once:

```javascript
executeGraphQL({
  query: `
    mutation BulkComplete(
      $rock1: ID!, $rock2: ID!, $rock3: ID!,
      $completedAt: Datetime!
    ) {
      r1: updateRock(input: { 
        id: $rock1, 
        rockPatch: { status: "COMPLETE", completedAt: $completedAt } 
      }) {
        rock { id status }
      }
      
      r2: updateRock(input: { 
        id: $rock2, 
        rockPatch: { status: "COMPLETE", completedAt: $completedAt } 
      }) {
        rock { id status }
      }
      
      r3: updateRock(input: { 
        id: $rock3, 
        rockPatch: { status: "COMPLETE", completedAt: $completedAt } 
      }) {
        rock { id status }
      }
    }
  `,
  variables: {
    rock1: "WyJyb2NrcyIsIjEyMyJd",
    rock2: "WyJyb2NrcyIsIjQ1NiJd",
    rock3: "WyJyb2NrcyIsIjc4OSJd",
    completedAt: "2024-11-18T00:00:00Z"
  }
})
```

## Schema Exploration

The GraphQL schema is huge (180,000+ lines). Here's how to explore it effectively:

1. **Start with `getGraphQLSchema`** - This provides:
   - Complete schema structure
   - Common patterns and examples
   - Tips specific to Success.co API

2. **Look at the types** - Each entity (table) has:
   - Query type (pluralized): `todos`, `rocks`, `issues`
   - Mutation types: `createTodo`, `updateTodo`, `deleteTodo`
   - Input types: `TodoInput`, `TodoPatch`
   - Filter types: `TodoCondition`, `TodoFilter`

3. **Understand relationships** - Fields like `user`, `team`, `meeting` provide nested data

4. **Check available filters** - PostGraphile provides powerful filtering:
   - `condition`: Exact match filtering
   - `filter`: Advanced filtering with operators
   - `orderBy`: Sorting options

## Best Practices

1. **Use parameterized queries** with variables for safety and reusability
2. **Request only needed fields** to reduce response size
3. **Use batch operations** when updating multiple items
4. **Handle errors gracefully** - check the `success` field in responses
5. **Leverage the schema** - call `getGraphQLSchema` when unsure about available fields
6. **Follow PostGraphile conventions** - use patch objects for updates
7. **Test queries gradually** - start simple, then add complexity

## Limitations

- Cannot bypass row-level security (intentional)
- Cannot access data from other companies (intentional)
- Query complexity limits may apply (to prevent DoS)
- Some administrative operations may be restricted based on user role

## Support

For questions or issues with the GraphQL direct access tools:
- Check the GraphQL schema using `getGraphQLSchema`
- Review the PostGraphile documentation: https://www.graphile.org/postgraphile/
- Contact Success.co support: https://www.success.co/support

