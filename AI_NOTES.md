# AI Development Notes for Success.co MCP Server

## Critical Database Patterns

### Always Filter by stateId = 'ACTIVE'

**CRITICAL**: Always include `stateId: {equalTo: "ACTIVE"}` in GraphQL queries to avoid pulling back deleted/inactive records.

**Pattern:**

```graphql
query {
  tableName(filter: {stateId: {equalTo: "ACTIVE"}}) {
    nodes {
      # fields
    }
  }
}
```

**Why this matters:**

- The Success.co database uses soft deletes
- Records are marked as inactive rather than physically deleted
- Without this filter, you'll get old/deleted data mixed with current data
- This causes duplicate entries, invalid data, and confusing results

**Examples of tables that need this filter:**

- `orgCharts`
- `orgChartSeats`
- `orgChartRolesResponsibilities`
- `users`
- `teams`
- `rocks`
- `todos`
- `meetings`
- `issues`
- `headlines`
- `visions`
- And most other main entity tables

### Data Deduplication Patterns

When dealing with roles and responsibilities or other data that might have duplicates:

1. **Create unique keys** based on meaningful field combinations
2. **Filter invalid entries** (single characters, empty names, etc.)
3. **Use Set for deduplication** to track seen combinations

**Example:**

```javascript
const uniqueRoles = [];
const seen = new Set();

roles.forEach((role) => {
  const key = `${role.name}:${role.description || ""}`;
  const cleanName = role.name ? role.name.trim() : "";

  const isValidRole =
    cleanName &&
    cleanName.length > 2 &&
    !/^[A-Z]$/.test(cleanName) && // Single letters
    !/^\d+$/.test(cleanName); // Just numbers

  if (!seen.has(key) && isValidRole) {
    seen.add(key);
    uniqueRoles.push(role);
  }
});
```

### GraphQL Response Structure

**Always use:** `result.data.data.tableName.nodes`
**Not:** `result.data.tableName.nodes`

The response has a nested structure where the actual data is at `data.data.{queryName}.nodes`.

### Batch Processing for Large Datasets

When querying large numbers of records, use batch processing:

```javascript
const batchSize = 50;
for (let i = 0; i < items.length; i += batchSize) {
  const batch = items.slice(i, i + batchSize);
  // Process batch
}
```

## Common Issues and Solutions

### HTTP 400 Errors

- Usually caused by complex nested queries
- Solution: Separate into multiple queries
- Use batch processing for large datasets

### Duplicate Data

- Always include `stateId: {equalTo: "ACTIVE"}` filter
- Implement deduplication logic for known duplicate-prone data
- Filter out invalid/incomplete entries

### Missing User Names

- Seat holders are stored as comma-separated IDs
- Always query users table to get actual names
- Use batch processing for large numbers of user IDs

## Best Practices

1. **Always filter by stateId = 'ACTIVE'**
2. **Use batch processing for large datasets**
3. **Implement deduplication for known duplicate-prone data**
4. **Clean and validate data before display**
5. **Use proper GraphQL response structure**
6. **Handle errors gracefully with meaningful messages**
7. **Log queries and responses for debugging (in dev mode)**
