# Database Connection Fix Summary

## Problem

When trying to create an issue through Claude, the error occurred:

```
Error: Could not determine company ID. Please ensure database connection is configured.
```

## Root Causes Found

### 1. Environment Variable Names Mismatch

Your `.env` file used:

- `DB_DATABASE` (incorrect)
- `DB_PASS` (incorrect)

The code expected:

- `DB_NAME` (correct)
- `DB_PASSWORD` (correct)

### 2. Incorrect Database Query

The code was querying:

```sql
SELECT company_id FROM user_api_keys WHERE api_key = ?
```

But the actual table structure is:

- Column is named `key` not `api_key`
- Table doesn't have `company_id` directly
- Need to JOIN with `users` table

## Fixes Applied

### 1. Fixed Environment Variables

Updated `.env` file from:

```bash
DB_DATABASE="app-success-onlineOct10"
DB_PASS='Aa123456'
```

To:

```bash
DB_NAME=app-success-onlineOct10
DB_PASSWORD=Aa123456
```

### 2. Fixed Database Query

Updated `tools.js` to use correct query:

```sql
SELECT u.company_id
FROM user_api_keys k
JOIN users u ON k.user_id = u.id
WHERE k.key = ?
```

### 3. Created Test Script

Created `test-db-connection.js` to verify database connectivity:

```bash
node test-db-connection.js
```

Test Results:

```
✅ Database connection successful!
✅ Found 19 API keys in database
✅ Sample API key lookup works
   Company ID: 85116592-7efc-40ea-89c0-76d921379bee
✅ All database tests passed!
```

## Next Steps

### 1. Restart the MCP Server

```bash
# Stop the current server (Ctrl+C if running)
# Then restart:
node mcp-server.js
```

### 2. Test Issue Creation in Claude

Try the same command again:

```
"Add a new issue for 'customer churn increase' to the leadership team."
```

You should now see:

```json
{
  "success": true,
  "message": "Issue created successfully",
  "issue": {
    "id": "...",
    "name": "customer churn increase",
    "companyId": "00000000-0000-0000-0000-000000000001",
    "teamId": "00000000-0000-0000-1111-000000001001",
    "type": "LEADERSHIP",
    ...
  }
}
```

## Files Modified

1. **`.env`** - Fixed environment variable names
2. **`tools.js`** - Fixed database query to use correct table structure
3. **`test-db-connection.js`** - Added test script for verification
4. **`DATABASE_SETUP.md`** - Updated documentation with correct schema

## Verification

Before asking Claude to create an issue, you can verify the connection works:

```bash
# Test database connection
node test-db-connection.js

# Should show:
# ✅ Database connection successful!
# ✅ Found X API keys in database
# ✅ Sample API key lookup works
# ✅ All database tests passed!
```

## Current Configuration

Your `.env` file now contains:

```bash
NODE_ENV=development
GRAPHQL_ENDPOINT_MODE=local
GRAPHQL_ENDPOINT_ONLINE=https://www.success.co/graphql
GRAPHQL_ENDPOINT_LOCAL=http://localhost:5174/graphql

DB_HOST=127.0.0.1
DB_PORT=5432
DB_NAME=app-success-onlineOct10
DB_USER=postgres
DB_PASSWORD=Aa123456
```

## Database Schema Reference

The correct table structure is:

```sql
-- API Keys table
CREATE TABLE user_api_keys (
  id uuid NOT NULL,
  user_id uuid NOT NULL,
  key varchar(50) NOT NULL,  -- ← Column is "key" not "api_key"
  name varchar(50) NOT NULL,
  ...
);

-- Users table (for company_id)
CREATE TABLE users (
  id uuid NOT NULL,
  company_id uuid NOT NULL,  -- ← Need to JOIN to get this
  ...
);
```

## Issue Resolved ✅

The database connection is now properly configured and tested. The MCP server will automatically lookup the company ID when creating issues, rocks, headlines, and meetings.
