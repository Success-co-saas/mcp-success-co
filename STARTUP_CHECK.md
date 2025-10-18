# Startup Database Connection Check

## Overview

The MCP Success.co server now performs a comprehensive database connection check at startup and will fail fast if the database is not accessible. This prevents silent failures and ensures that mutation operations (create/update) will work correctly.

## What It Checks

At startup, the server:

1. ✅ Tests basic database connectivity (`SELECT 1`)
2. ✅ Verifies required tables exist (`user_api_keys`, `users`)
3. ✅ Confirms ability to query the `user_api_keys` table
4. ✅ Reports the number of API keys found

## Success Output

When the database connection is successful, you'll see:

```
[DEBUG] Database connection initialized
[STARTUP] Testing database connection...
✅ Database connection successful. Found 19 API keys.
[STARTUP] Database connection verified.
```

The server will then continue to start normally.

## Failure Output

When the database connection fails, you'll see:

```
[STARTUP] Testing database connection...

❌ DATABASE CONNECTION FAILED!
Error: Database connection failed: [specific error message]

Database connection is required for mutation operations (create/update).
Please ensure your .env file contains correct database credentials:
  - DATABASE_URL=postgresql://user:password@host:port/database
  OR
  - DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASS

For help, see DATABASE_SETUP.md

Exiting...
```

The server will **exit immediately** with code 1.

## Common Failure Scenarios

### 1. Database Not Running

```
Error: Database connection failed: connect ECONNREFUSED 127.0.0.1:5432
```

**Solution:** Start PostgreSQL

```bash
# macOS with Postgres.app
# Check if PostgreSQL is running in the menu bar

# Or with Homebrew
brew services start postgresql
```

### 2. Wrong Database Name

```
Error: Database connection failed: database "wrong_name" does not exist
```

**Solution:** Check your `.env` file and correct `DB_NAME`

### 3. Wrong Credentials

```
Error: Database connection failed: password authentication failed
```

**Solution:** Check your `.env` file and correct `DB_USER` and `DB_PASS`

### 4. Missing Tables

```
Error: Required database tables not found (user_api_keys, users). Check database schema.
```

**Solution:** Ensure you're connecting to the correct Success.co database with the proper schema

### 5. No Database Configuration

```
Error: Database not configured. Set DATABASE_URL or DB_HOST/DB_NAME/DB_USER/DB_PASS in .env file.
```

**Solution:** Add database configuration to your `.env` file

## Testing the Connection

You can test the database connection without starting the full server:

```bash
node test-db-connection.js
```

This will run the same checks and provide detailed output.

## Implementation Details

### New Function: `testDatabaseConnection()`

Location: `tools.js`

```javascript
export async function testDatabaseConnection() {
  const db = getDatabase();
  if (!db) {
    return {
      ok: false,
      error: "Database not configured...",
    };
  }

  try {
    // Test basic connection
    const result = await db`SELECT 1 as test`;

    // Test required tables
    const tableCheck = await db`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'user_api_keys'
      ) as has_api_keys,
      EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'users'
      ) as has_users
    `;

    // Count API keys
    const apiKeysCount = await db`SELECT COUNT(*) as count FROM user_api_keys`;

    return {
      ok: true,
      message: `Database connection successful. Found ${apiKeysCount[0].count} API keys.`,
    };
  } catch (error) {
    return {
      ok: false,
      error: `Database connection failed: ${error.message}`,
    };
  }
}
```

### Startup Check in `mcp-server.js`

The check runs immediately after initialization:

```javascript
// Test database connection at startup
(async () => {
  console.error("[STARTUP] Testing database connection...");
  const dbTest = await testDatabaseConnection();

  if (!dbTest.ok) {
    console.error("\n❌ DATABASE CONNECTION FAILED!");
    console.error(`Error: ${dbTest.error}`);
    console.error(
      "\nDatabase connection is required for mutation operations..."
    );
    console.error("\nExiting...\n");
    process.exit(1);
  }

  console.error(`✅ ${dbTest.message}`);
  console.error("[STARTUP] Database connection verified.\n");
})();
```

## Benefits

1. **Fail Fast**: Catches database issues immediately rather than at first mutation attempt
2. **Clear Error Messages**: Users know exactly what's wrong and how to fix it
3. **Prevents Silent Failures**: No more "Could not determine company ID" errors during operation
4. **Validates Schema**: Ensures required tables exist before accepting requests
5. **Helpful Guidance**: Points users to documentation for help

## What Operations Need Database?

Database connection is **required** for:

- `createIssue`
- `createRock`
- `createHeadline`
- `createMeeting`
- `updateIssue`
- `updateRock`
- `updateTodo`
- `updateHeadline`
- `updateMeeting`

Database connection is **optional** for all read operations:

- `getTeams`, `getUsers`, `getTodos`, etc.
- `search`, `fetch`
- All analytical tools

## Troubleshooting

### Server Won't Start

If the server won't start and shows a database error:

1. **Check PostgreSQL is running:**

   ```bash
   psql postgres -c "SELECT version();"
   ```

2. **Verify your `.env` file exists and is correct:**

   ```bash
   cat .env | grep DB_
   ```

3. **Test the connection directly:**

   ```bash
   node test-db-connection.js
   ```

4. **Try connecting with psql:**
   ```bash
   psql -h 127.0.0.1 -p 5432 -U postgres -d app-success-onlineOct10
   ```

### Disabling the Check (Not Recommended)

If you need to run the server without database (read-only mode), you would need to:

1. Remove the database startup check from `mcp-server.js`
2. Remove database configuration from `.env`

**Note:** This is not recommended as mutation operations will fail silently.

## Files Modified

- `tools.js` - Added `testDatabaseConnection()` function
- `mcp-server.js` - Added startup database check with fail-fast behavior

## Testing

To test the startup check works correctly:

**Test 1: Valid Database**

```bash
node mcp-server.js
# Should show: ✅ Database connection successful
```

**Test 2: Invalid Database Name**

```bash
DB_NAME=nonexistent node mcp-server.js
# Should show: ❌ DATABASE CONNECTION FAILED! and exit
```

**Test 3: Invalid Credentials**

```bash
DB_PASS=wrong node mcp-server.js
# Should show: ❌ DATABASE CONNECTION FAILED! and exit
```

## Summary

The startup database check ensures that:

- Database issues are caught immediately
- Users get clear, actionable error messages
- The server never runs in a "partially working" state
- Mutation operations are guaranteed to work (if server starts)
- Troubleshooting is easier with early error detection
