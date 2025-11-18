# GraphQL Tools - Simplified with Introspection

## Overview

The Success.co MCP server provides **2 simple tools** that leverage GraphQL's built-in introspection capabilities to discover and interact with the API.

## The Two Tools

### 1. getGraphQLOverview

Returns:
- API endpoint and authentication info
- Common entities (Todo, Rock, Issue, CoreValue, etc.)
- **Introspection query examples** (list types, get type details, list queries/mutations)
- Usage examples for queries, mutations, and V/TO operations
- Common patterns and tips

**Purpose**: Teach the AI how to use GraphQL introspection to explore the schema

### 2. executeGraphQL

Execute any GraphQL operation:
- **Introspection queries** (explore the schema)
- **Data queries** (fetch data)
- **Mutations** (create/update/delete data)

**Purpose**: Universal tool for all GraphQL operations

## Why Introspection?

GraphQL has **built-in schema introspection**. You can query the schema itself using special queries:

### List All Types
```graphql
{
  __schema {
    types {
      name
      kind
      description
    }
  }
}
```

### Get Type Details
```graphql
{
  __type(name: "CoreValue") {
    name
    description
    fields {
      name
      description
      type {
        name
        kind
        ofType { name kind }
      }
    }
  }
}
```

### List All Queries
```graphql
{
  __schema {
    queryType {
      fields {
        name
        description
        args {
          name
          type { name kind }
        }
      }
    }
  }
}
```

### List All Mutations
```graphql
{
  __schema {
    mutationType {
      fields {
        name
        description
        args {
          name
          type { name kind }
        }
      }
    }
  }
}
```

## Example: AI Workflow

**User**: "Update my V/TO core value to 'Integrity'"

**AI Assistant**:

1. **Call**: `getGraphQLOverview()`
   - Learn about introspection and see examples

2. **Call**: `executeGraphQL({ query: "{ __type(name: \"CoreValue\") { fields { name type { name } } } }" })`
   - Discover: CoreValue has fields: id, value, detail, sortOrder

3. **Call**: `executeGraphQL({ query: "{ __schema { mutationType { fields { name } } } }" })`
   - Find: `updateCoreValue` mutation exists

4. **Call**: `executeGraphQL({ query: "mutation UpdateCoreValue($id: ID!, $value: String!) { updateCoreValue(input: { id: $id, coreValuePatch: { value: $value } }) { coreValue { id value } } }", variables: { id: "...", value: "Integrity" } })`
   - Execute the update

**Done!** ✅

## Benefits

| Feature | Custom Tools | Introspection |
|---------|-------------|---------------|
| Tools needed | 7 | **2** |
| Code lines | ~400 | **~230** |
| Schema file needed | Yes | **No** |
| Custom parsing | Yes | **No** |
| Standard GraphQL | No | **Yes** |
| Portable knowledge | No | **Yes** |
| Maintenance | Complex | **Simple** |

## Key Advantages

✅ **Simpler**: 2 tools instead of 7  
✅ **Standard**: Uses GraphQL conventions  
✅ **Flexible**: AI constructs introspection queries as needed  
✅ **Maintainable**: No custom schema parsing  
✅ **Portable**: AI learns once, works with any GraphQL API  
✅ **Self-Documenting**: Schema describes itself  
✅ **Fast**: No timeouts, queries are small and targeted  

## Technical Details

- **File**: `tools/graphqlTools.js` (305 lines)
- **Exports**: `getGraphQLOverview`, `executeGraphQL`
- **Schema file**: Not needed at runtime (only for reference)
- **Authentication**: Automatically handled via auth context
- **Company scoping**: Row-level security enforced automatically

## Testing

Run the test suite:
```bash
node tests/graphql-simple.test.js
```

Tests verify:
- Overview provides introspection examples
- Introspection query structures are valid
- Data queries work
- Mutations work
- All without timeouts

## Migration

Previous implementation had 7 tools:
1. ~~getGraphQLSchema~~ (replaced by introspection)
2. ~~listGraphQLTypes~~ (replaced by `__schema` introspection)
3. ~~getGraphQLType~~ (replaced by `__type` introspection)
4. ~~listGraphQLQueries~~ (replaced by `__schema.queryType` introspection)
5. ~~listGraphQLMutations~~ (replaced by `__schema.mutationType` introspection)
6. ~~searchGraphQLSchema~~ (replaced by targeted introspection)
7. `executeGraphQL` ✅ (kept)

New implementation has 2 tools:
1. `getGraphQLOverview` ✅ (teaches introspection)
2. `executeGraphQL` ✅ (executes everything)

## Summary

The simplified approach uses GraphQL's built-in introspection instead of custom tools. This is **simpler, more maintainable, and follows GraphQL standards**. AI assistants can explore the schema dynamically using introspection queries, just like GraphiQL and other GraphQL tools do.

**Total tool count**: 49 tools (down from 54)  
**GraphQL tools**: 2 (down from 7)  
**Code lines**: 305 (down from ~400)  
**Complexity**: Simple ✨

