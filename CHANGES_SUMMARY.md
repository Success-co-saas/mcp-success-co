# Database Integration Changes Summary

## Problem

When creating issues (or other entities) through the MCP server, the GraphQL API was requiring a `companyId` field that wasn't being provided, causing mutations to fail with errors like:

```
Variable "$input" of required type "CreateIssueInput!" was not provided.
```

## Solution

Implemented automatic company ID lookup from the database using the user's API key, eliminating the need to manually provide `companyId` in mutation operations.

## Changes Made

### 1. Added PostgreSQL Database Package

**File:** `package.json`

- Added `"postgres": "^3.4.7"` dependency

### 2. Added Database Connection Logic

**File:** `tools.js`

#### New Imports

```javascript
import postgres from "postgres";
```

#### New Variables

```javascript
let sql = null;
let companyIdCache = new Map();
```

#### New Functions

- **`initDatabaseConnection()`** - Initializes PostgreSQL connection using environment variables
- **`getDatabase()`** - Returns the database connection instance
- **`getCompanyIdForApiKey(apiKey)`** - Queries the `user_api_keys` table to get company_id

#### Updated Functions

- **`init(config)`** - Now accepts and uses database configuration parameters
- **`createIssue()`** - Automatically fetches and includes `companyId`
- **`createRock()`** - Automatically fetches and includes `companyId`
- **`createHeadline()`** - Automatically fetches and includes `companyId`
- **`createMeeting()`** - Automatically fetches and includes `companyId`

### 3. Updated Server Configuration

**File:** `mcp-server.js`

Added database configuration to the `init()` call:

```javascript
init({
  // ... existing config ...
  DATABASE_URL: process.env.DATABASE_URL,
  DB_HOST: process.env.DB_HOST,
  DB_PORT: process.env.DB_PORT,
  DB_NAME: process.env.DB_NAME,
  DB_USER: process.env.DB_USER,
  DB_PASSWORD: process.env.DB_PASSWORD,
});
```

### 4. Updated Documentation

**File:** `README.md`

Added new section "Configure Database Connection (Required for Mutations)" with:

- Instructions for setting up `.env` file
- Two configuration options (DATABASE_URL vs individual parameters)
- Note about read-only tools still working without database

### 5. Created Setup Documentation

**File:** `DATABASE_SETUP.md` (new file)

Comprehensive guide covering:

- Why database access is required
- Setup instructions
- How it works internally
- Troubleshooting guide
- Security considerations

## Database Query

The server performs this query to look up company ID:

```sql
SELECT company_id
FROM user_api_keys
WHERE api_key = $1
LIMIT 1
```

Results are cached in memory for performance.

## Environment Variables

### Required for Mutations

Either use `DATABASE_URL`:

```bash
DATABASE_URL=postgresql://user:password@host:port/database
```

Or individual parameters:

```bash
DB_HOST=localhost
DB_PORT=5432
DB_NAME=successco
DB_USER=postgres
DB_PASSWORD=password
```

### Optional Configuration

```bash
SUCCESS_CO_API_KEY=your-api-key
GRAPHQL_ENDPOINT_MODE=online
NODE_ENV=development
DEBUG=true
```

## Benefits

1. **No Manual Company ID Required** - Users don't need to know or provide company ID
2. **Automatic Lookup** - Company ID is determined from API key
3. **Caching** - Results are cached to minimize database queries
4. **Error Handling** - Clear error messages when database is not configured
5. **Backward Compatible** - Read-only tools work without database access

## Testing

### Install Dependencies

```bash
pnpm install
```

### Create .env File

```bash
cat > .env << 'EOF'
DATABASE_URL=postgresql://user:password@localhost:5432/successco
SUCCESS_CO_API_KEY=your-api-key
EOF
```

### Start Server

```bash
node mcp-server.js
```

### Test Mutation

In Claude or MCP Inspector:

```
"Add a new issue for 'customer churn increase' to the leadership team."
```

Expected result:

```json
{
  "success": true,
  "message": "Issue created successfully",
  "issue": {
    "id": "...",
    "name": "customer churn increase",
    "companyId": "...",
    "type": "LEADERSHIP",
    ...
  }
}
```

## Migration Notes

### For Existing Users

1. Install the `postgres` package: `pnpm install`
2. Create a `.env` file with database credentials
3. Restart the MCP server
4. Test a mutation operation

### No Breaking Changes

- All existing read operations continue to work
- Only mutation operations now require database access
- Clear error messages guide users to configure database

## Security

- `.env` file is in `.gitignore`
- Only `SELECT` permission needed on `user_api_keys` table
- Company ID is cached in memory (not persisted)
- Database credentials never exposed in logs or API responses
