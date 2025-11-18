# V/TO Tools Migration Guide

## Overview

The specialized V/TO tools have been **disabled** in favor of the more flexible `executeGraphQL` tool. This document shows how to migrate from the old tools to the new GraphQL approach.

## Why the Change?

The `executeGraphQL` tool provides:
- ✅ **More flexibility** - Access ANY V/TO field
- ✅ **Better control** - Full GraphQL query power
- ✅ **Simpler codebase** - Fewer specialized tools
- ✅ **Batch operations** - Update multiple items in one call

## Migration Examples

### 1. Get Leadership V/TO

#### Old Way (Specialized Tool)
```javascript
getLeadershipVTO()
```

#### New Way (GraphQL)
```javascript
executeGraphQL({
  query: `
    query {
      leaderships(first: 1) {
        nodes {
          id
          coreValues(orderBy: SORT_ORDER_ASC) {
            nodes {
              id
              value
              detail
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
          coreFocuses(orderBy: SORT_ORDER_ASC) {
            nodes {
              id
              focus
              sortOrder
            }
          }
          threeYearGoals(orderBy: SORT_ORDER_ASC) {
            nodes {
              id
              goal
              sortOrder
            }
          }
          marketStrategies(orderBy: SORT_ORDER_ASC) {
            nodes {
              id
              strategy
              sortOrder
            }
          }
        }
      }
    }
  `
})
```

**Benefit**: You can now request exactly the fields you need!

---

### 2. Update Core Value

#### Old Way (Specialized Tool)
```javascript
updateVTOCoreValue({
  coreValueId: "core_value_123",
  name: "Integrity",
  cascadeAll: true
})
```

#### New Way (GraphQL)
```javascript
executeGraphQL({
  query: `
    mutation UpdateCoreValue($id: ID!, $value: String!) {
      updateCoreValue(
        input: {
          id: $id
          coreValuePatch: {
            value: $value
          }
        }
      ) {
        coreValue {
          id
          value
          detail
          sortOrder
          updatedAt
        }
      }
    }
  `,
  variables: {
    id: "WyJjb3JlX3ZhbHVlcyIsIjEyMyJd",
    value: "Integrity"
  }
})
```

**Benefit**: You can update multiple fields at once and control the response!

---

### 3. Create Core Value

#### Old Way (Specialized Tool)
```javascript
createVTOCoreValue({
  visionId: "vision_123",
  name: "Integrity",
  cascadeAll: true
})
```

#### New Way (GraphQL)
```javascript
executeGraphQL({
  query: `
    mutation CreateCoreValue($leadershipId: ID!, $value: String!) {
      createCoreValue(
        input: {
          coreValue: {
            leadershipId: $leadershipId
            value: $value
            sortOrder: 1
          }
        }
      ) {
        coreValue {
          id
          value
          sortOrder
          createdAt
        }
      }
    }
  `,
  variables: {
    leadershipId: "WyJsZWFkZXJzaGlwcyIsIjEyMyJd",
    value: "Integrity"
  }
})
```

**Benefit**: You can set all fields (including sortOrder) in one operation!

---

### 4. Delete Core Value

#### Old Way (Specialized Tool)
```javascript
deleteVTOCoreValue({
  coreValueId: "core_value_123"
})
```

#### New Way (GraphQL)
```javascript
executeGraphQL({
  query: `
    mutation DeleteCoreValue($id: ID!) {
      deleteCoreValue(input: { id: $id }) {
        deletedCoreValueId
      }
    }
  `,
  variables: {
    id: "WyJjb3JlX3ZhbHVlcyIsIjEyMyJd"
  }
})
```

**Benefit**: Same simplicity, more control!

---

### 5. Update Multiple V/TO Items (NEW CAPABILITY!)

#### Old Way (Not Possible!)
You had to make multiple API calls:
```javascript
updateVTOCoreValue({ coreValueId: "1", name: "Integrity" })
updateVTOCoreValue({ coreValueId: "2", name: "Accountability" })
updateVTOCoreValue({ coreValueId: "3", name: "Excellence" })
// 3 separate API calls!
```

#### New Way (Batch Operation)
```javascript
executeGraphQL({
  query: `
    mutation UpdateMultipleCoreValues(
      $id1: ID!, $value1: String!,
      $id2: ID!, $value2: String!,
      $id3: ID!, $value3: String!
    ) {
      cv1: updateCoreValue(input: { 
        id: $id1, 
        coreValuePatch: { value: $value1 } 
      }) {
        coreValue { id value }
      }
      
      cv2: updateCoreValue(input: { 
        id: $id2, 
        coreValuePatch: { value: $value2 } 
      }) {
        coreValue { id value }
      }
      
      cv3: updateCoreValue(input: { 
        id: $id3, 
        coreValuePatch: { value: $value3 } 
      }) {
        coreValue { id value }
      }
    }
  `,
  variables: {
    id1: "WyJjb3JlX3ZhbHVlcyIsIjEyMyJd",
    value1: "Integrity",
    id2: "WyJjb3JlX3ZhbHVlcyIsIjQ1NiJd",
    value2: "Accountability",
    id3: "WyJjb3JlX3ZhbHVlcyIsIjc4OSJd",
    value3: "Excellence"
  }
})
```

**Benefit**: 1 API call instead of 3! **3x faster!**

---

## Common V/TO Operations

### Get Core Values Only
```graphql
query {
  leaderships(first: 1) {
    nodes {
      coreValues {
        nodes {
          id
          value
          detail
        }
      }
    }
  }
}
```

### Get 3-Year Goals Only
```graphql
query {
  leaderships(first: 1) {
    nodes {
      threeYearGoals {
        nodes {
          id
          goal
          futureDate
        }
      }
    }
  }
}
```

### Update Core Focus
```graphql
mutation UpdateCoreFocus($id: ID!, $focus: String!) {
  updateCoreFocus(
    input: {
      id: $id
      coreFocusPatch: { focus: $focus }
    }
  ) {
    coreFocus {
      id
      focus
    }
  }
}
```

### Create Market Strategy
```graphql
mutation CreateMarketStrategy($leadershipId: ID!, $strategy: String!) {
  createMarketStrategy(
    input: {
      marketStrategy: {
        leadershipId: $leadershipId
        strategy: $strategy
        sortOrder: 1
      }
    }
  ) {
    marketStrategy {
      id
      strategy
    }
  }
}
```

---

## Tips for Migration

1. **Use getGraphQLSchema()** to discover available fields
2. **Start with simple queries** then add complexity
3. **Use variables** for parameterized queries (safer)
4. **Batch operations** when updating multiple items
5. **Request only needed fields** for better performance

---

## Getting Help

- **Schema Reference**: Call `getGraphQLSchema()` to see all available fields
- **Documentation**: See `docs/graphql-direct-access.md` for complete guide
- **Examples**: Look at `tests/graphql-integration.test.js` for more examples

---

## Re-enabling Old Tools

If you need to re-enable the old V/TO tools:

1. Open `toolDefinitions.js`
2. Find lines 1323-1661 (commented section)
3. Remove the `/*` at line 1323 and `*/` at line 1661
4. Restart the MCP server

All code is preserved and can be re-enabled anytime!

---

## Summary

| Aspect | Old V/TO Tools | New GraphQL Approach |
|--------|---------------|---------------------|
| **Flexibility** | Limited fields | ALL fields accessible |
| **Control** | Fixed operations | Full query power |
| **Batch ops** | Not possible | Easy with aliases |
| **Code complexity** | 16 specialized tools | 1 general-purpose tool |
| **Learning curve** | Tool-specific | Learn GraphQL once |
| **Maintenance** | Per-tool updates | Schema-driven |

**Result**: More power, more flexibility, simpler codebase! 🚀

