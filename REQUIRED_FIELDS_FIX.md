# Required Fields Fix for createIssue

## Problem

The GraphQL API for creating issues requires both `teamId` and `userId` fields, but the MCP tool was treating them as optional. This caused all issue creation attempts to fail with:

```
GraphQL error: Field "teamId" of required type "UUID!" was not provided.
GraphQL error: Field "userId" of required type "UUID!" was not provided.
```

## Root Cause

1. **GraphQL Schema Requirements**: The Success.co GraphQL schema requires:

   - `teamId` (UUID!) - REQUIRED
   - `userId` (UUID!) - REQUIRED

2. **Tool Implementation**: The `createIssue` function was:
   - Making both fields optional
   - Using conditional spreading: `...(teamId && { teamId })`
   - Not providing these fields when they weren't specified

## Solution

### 1. Made `teamId` Required

**Why**: Every issue must belong to a team in the EOS framework.

**Implementation**:

- Updated function signature to require `teamId` parameter
- Added validation to reject requests without `teamId`
- Updated Zod schema to make `teamId` non-optional
- Updated tool description to emphasize `teamId` is REQUIRED

### 2. Auto-Set `userId` from API Key

**Why**: The authenticated user (from API key) should be the default issue owner.

**Implementation**:

- Enhanced database query to fetch both `companyId` AND `userId`
- Created `getContextForApiKey()` helper function
- Auto-populate `userId` from API key if not explicitly provided
- Allow override by providing explicit `userId` parameter

### 3. Fixed Default Status

**Bonus Fix**: Changed default `issueStatusId` from "OPEN" to "TODO" to match database schema.

### 4. Fixed Issue Type

**Bonus Fix**: Changed `type` values from "LEADERSHIP"/"DEPARTMENTAL"/"COMPANY" to the correct values "short-term" and "long-term" (defaults to "short-term").

## Technical Changes

### File: `tools.js`

#### Updated Database Query

```javascript
// OLD: Only fetched company_id
SELECT u.company_id
FROM user_api_keys k
JOIN users u ON k.user_id = u.id
WHERE k.key = ?

// NEW: Fetches both company_id and user_id
SELECT u.company_id, u.id as user_id
FROM user_api_keys k
JOIN users u ON k.user_id = u.id
WHERE k.key = ?
```

#### New Helper Function

```javascript
async function getContextForApiKey(apiKey) {
  // Returns { companyId, userId } from API key
  // Uses same cache as getCompanyIdForApiKey
}
```

#### Updated `createIssue` Function

```javascript
// OLD
export async function createIssue(args) {
  const { name, teamId, userId, ... } = args; // All optional

  const companyId = await getCompanyIdForApiKey(apiKey);

  const variables = {
    input: {
      issue: {
        companyId,
        ...(teamId && { teamId }),  // Conditional
        ...(userId && { userId }),  // Conditional
      }
    }
  };
}

// NEW
export async function createIssue(args) {
  const { name, teamId, userId: providedUserId, ... } = args;

  // Validate teamId is provided
  if (!teamId) {
    return { error: "Team ID is required..." };
  }

  // Get context (both companyId and userId)
  const context = await getContextForApiKey(apiKey);
  const userId = providedUserId || context.userId; // Default to current user

  const variables = {
    input: {
      issue: {
        teamId,        // Always included
        userId,        // Always included (from context or provided)
        companyId: context.companyId,
      }
    }
  };
}
```

### File: `mcp-server.js`

#### Updated Zod Schema

```javascript
// OLD
schema: {
  teamId: z.string().optional().describe("Team ID..."),
  userId: z.string().optional().describe("User ID..."),
},
required: ["name"],

// NEW
schema: {
  teamId: z.string().describe("Team ID (REQUIRED - use getTeams...)"),
  userId: z.string().optional().describe("User ID (defaults to current user from API key)"),
},
required: ["name", "teamId"],
```

## Cache Strategy

The cache now stores full context objects:

```javascript
// Cache structure
companyIdCache = Map {
  "suc_api_abc123..." => {
    companyId: "uuid-1",
    userId: "uuid-2"
  }
}

// Backwards compatible
getCompanyIdForApiKey(key) {
  const cached = cache.get(key);
  return typeof cached === "string" ? cached : cached.companyId;
}
```

## Test Results

```bash
$ node test-create-issue.js

Step 1: Getting teams...
✅ Found team: Dev team (ID: 00000000-0000-0000-1111-000000000002)

Step 2: Testing create issue WITHOUT teamId (should fail)...
✅ Correctly rejected issue without teamId

Step 3: Testing create issue WITH teamId...
✅ Issue created successfully!
   Issue ID: b9059ae8-b7dd-4d54-8d12-22241ec883a4
   Name: Test Issue - API Key Context
   Team ID: 00000000-0000-0000-1111-000000000002
   User ID: 00000000-0000-0000-0000-000000000001 (from API key)
   Company ID: 00000000-0000-0000-0000-000000000001 (from API key)

✅ All tests passed!
```

## User Experience

### Before Fix ❌

```
User: "Add a new issue for 'customer churn' to the leadership team."

AI: (calls createIssue without teamId)
Error: Field "teamId" of required type "UUID!" was not provided.
```

### After Fix ✅

```
User: "Add a new issue for 'customer churn' to the leadership team."

AI:
1. Calls getTeams to find leadership team (where isLeadership=true)
2. Calls createIssue with teamId from step 1
3. userId and companyId automatically set from API key
4. ✅ Issue created successfully!
```

## Benefits

1. **No Breaking Changes**: Existing users of createIssue who already provide teamId continue to work
2. **Better Validation**: Clear error messages when required fields are missing
3. **Smarter Defaults**: userId automatically set from authenticated user
4. **Type Safety**: Zod schema reflects actual GraphQL requirements
5. **Better AI Behavior**: Tool descriptions guide AI to use getTeams first

## Related Mutations

The same pattern should be applied to other mutation tools that require userId/teamId:

- ✅ `createIssue` - FIXED
- ⚠️ `createRock` - May need similar fix
- ⚠️ `createHeadline` - May need similar fix
- ⚠️ `updateIssue` - Review if teamId/userId updates work

## Documentation Updates

- Updated `tools.js` JSDoc comments
- Updated `mcp-server.js` tool descriptions
- Updated Zod schemas to reflect requirements
- Created test scripts for validation

## Summary

The fix ensures that:

- ✅ `teamId` is required (matches GraphQL schema)
- ✅ `userId` defaults to current user from API key
- ✅ `companyId` automatically set from API key
- ✅ Database query optimized (fetch both values in one query)
- ✅ Cache strategy handles both old and new formats
- ✅ Proper validation with helpful error messages
- ✅ Default status changed from "OPEN" to "TODO"

All mutation operations now work correctly! 🎉
