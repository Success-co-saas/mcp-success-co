# Database Setup for MCP Success.co Server

## Overview

The MCP Success.co Server now requires database access to automatically determine the company ID when creating or updating entities (issues, rocks, todos, headlines, meetings). This eliminates the need to manually provide the `companyId` parameter.

## Why Database Access is Required

The Success.co GraphQL API requires a `companyId` field when creating entities. Previously, this would need to be manually provided, but now the server automatically looks it up from the database using your API key.

## Setup Instructions

### 1. Create a `.env` File

Create a `.env` file in the project root directory (`/Users/topper/dev/success.co/mcp-success-co/.env`).

### 2. Choose Your Configuration Method

**Option A: Using DATABASE_URL (Recommended)**

Add a single connection string to your `.env` file:

```bash
DATABASE_URL=postgresql://username:password@hostname:5432/database_name
```

Example:

```bash
DATABASE_URL=postgresql://postgres:mypassword@localhost:5432/successco
```

**Option B: Using Individual Parameters**

Add individual connection parameters to your `.env` file:

```bash
DB_HOST=localhost
DB_PORT=5432
DB_NAME=successco
DB_USER=postgres
DB_PASS=mypassword
```

### 3. Optional: Add Other Environment Variables

Your `.env` file can also include other configuration:

```bash
# Database connection (choose Option A or Option B above)
DATABASE_URL=postgresql://postgres:mypassword@localhost:5432/successco

# API Configuration
SUCCESS_CO_API_KEY=your-api-key-here
GRAPHQL_ENDPOINT_MODE=online
GRAPHQL_ENDPOINT_ONLINE=https://www.success.co/graphql

# Development settings
NODE_ENV=development
DEBUG=true
```

## How It Works

1. When you call a mutation tool (e.g., `createIssue`), the server:

   - Retrieves your API key (e.g., `suc_api_b7eef7e8...`)
   - Strips the `suc_api_` prefix (database stores keys without this prefix)
   - Queries the database with a JOIN:
     ```sql
     SELECT u.company_id
     FROM user_api_keys k
     JOIN users u ON k.user_id = u.id
     WHERE k.key = ?  -- Query uses key WITHOUT prefix
     ```
   - Caches the result for subsequent requests
   - Automatically includes the `companyId` in the GraphQL mutation

2. The company ID is cached in memory, so the database is only queried once per API key per server session.

## Database Schema Reference

The server queries two tables:

**user_api_keys table:**

```sql
CREATE TABLE "public"."user_api_keys" (
  "id" uuid NOT NULL,
  "user_id" uuid NOT NULL,
  "key" varchar(50) NOT NULL,  -- Note: Stores key WITHOUT "suc_api_" prefix
  "name" varchar(50) NOT NULL,
  "label" varchar(255),
  "created_at" timestamptz NOT NULL,
  "last_used_at" timestamptz,
  "revoked" bool NOT NULL DEFAULT false
);
```

**Important:**

- The database stores API keys **without** the `suc_api_` prefix
- Full API key: `suc_api_b7eef7e84ae010979869cd51c09b65d580756d83`
- Stored in DB: `b7eef7e84ae010979869cd51c09b65d580756d83`
- The server automatically strips the prefix before querying

**users table (for company_id):**

```sql
CREATE TABLE "public"."users" (
  "id" uuid NOT NULL,
  "company_id" uuid NOT NULL,
  ...
);
```

## Troubleshooting

### Error: "Could not determine company ID"

This error occurs when:

- Database connection is not configured in `.env`
- Database credentials are incorrect
- The API key is not found in the `user_api_keys` table

**Solution:**

1. Verify your `.env` file exists and contains correct database credentials
2. Test database connectivity: `node test-db-connection.js`
3. Verify your API key exists in the database:
   ```sql
   SELECT u.company_id, k.key
   FROM user_api_keys k
   JOIN users u ON k.user_id = u.id
   WHERE k.key = 'your-api-key';
   ```

### Error: Database connection failed

**Solution:**

- Check that PostgreSQL is running
- Verify hostname, port, username, and password
- Ensure the database name is correct
- Check firewall rules if connecting to a remote database

## Testing

After setting up the database connection, test it by creating an issue:

```bash
# Start the server
node mcp-server.js

# In Claude or another MCP client, try:
"Add a new issue for 'test database connection' to the leadership team."
```

If successful, you'll see:

```json
{
  "success": true,
  "message": "Issue created successfully",
  "issue": {
    "id": "...",
    "name": "test database connection",
    "companyId": "...",
    ...
  }
}
```

## What Changed

### Modified Files

1. **`package.json`** - Added `postgres` package dependency
2. **`tools.js`** - Added database connection and company ID lookup functions
3. **`mcp-server.js`** - Added database environment variables to config
4. **`README.md`** - Added database setup documentation

### New Functions in tools.js

- `initDatabaseConnection()` - Initializes PostgreSQL connection
- `getDatabase()` - Returns database connection instance
- `getCompanyIdForApiKey(apiKey)` - Queries company ID for an API key

### Updated Mutation Functions

All mutation functions now automatically include `companyId`:

- `createIssue()`
- `createRock()`
- `createHeadline()`
- `createMeeting()`

## Security Considerations

- Keep your `.env` file secure and never commit it to version control
- The `.env` file is already in `.gitignore`
- Use environment variables in production rather than `.env` files
- Rotate API keys and database passwords regularly
- Use read-only database credentials if possible (only `SELECT` permission needed)

## Package Information

The server uses the `postgres` package (version ^3.4.7):

- **NPM Package:** https://www.npmjs.com/package/postgres
- **GitHub:** https://github.com/porsager/postgres
- **Features:** Connection pooling, prepared statements, automatic reconnection
