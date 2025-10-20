# Quick Start Guide - Refactored Codebase

## What Changed?

Your `index.js` has been refactored from **2,322 lines** to just **203 lines** (91% reduction) by organizing code into focused modules.

## New Project Structure

```
mcp-success-co/
├── index.js                    # Main entry (203 lines) ⭐
├── config.js                   # Configuration ⭐
├── logger.js                   # Logging system ⭐
├── toolDefinitions.js          # All tool definitions ⭐
├── middleware/                 # Middleware modules ⭐
│   ├── cors.js
│   ├── requestLogger.js
│   └── auth.js
├── routes/                     # Route handlers ⭐
│   ├── health.js
│   ├── mcp.js
│   └── sse.js
└── utils/                      # Utility modules ⭐
    ├── sessionManager.js
    └── transportHelpers.js
```

⭐ = New files created during refactoring

## Running the Server

### Development Mode

```bash
npm run dev
# or
NODE_ENV=development node index.js
```

### Production Mode

```bash
npm start
# or
NODE_ENV=production node index.js
```

### Health Check

```bash
npm run health
# or
curl http://localhost:3001/health
```

### With Inspector

```bash
npm run inspector
```

## Environment Variables

### Simplified Configuration

The GraphQL endpoint configuration has been simplified:

```bash
# Single GraphQL endpoint (defaults to http://localhost:5174/graphql)
GRAPHQL_ENDPOINT=https://api.success.co/graphql

# CORS configuration (recommended for production)
CORS_ORIGIN=https://your-domain.com

# OAuth server URL (optional, auto-detected)
OAUTH_SERVER_URL=https://auth.success.co
```

## Key Improvements

### ✅ Better Logging

```javascript
import { logger } from "./logger.js";

// Use structured logging instead of console.error
logger.info("Server started");
logger.warn("High memory usage");
logger.error("Database error", error);
logger.debug("Debug info"); // Only in development
```

### ✅ Graceful Shutdown

Press `Ctrl+C` or send `SIGTERM` - the server will:

1. Stop accepting new connections
2. Clean up all sessions
3. Close database connections
4. Exit cleanly (or force exit after 10s)

### ✅ Session Management

Sessions are automatically tracked and cleaned up:

```bash
curl http://localhost:3001/health
{
  "status": "healthy",
  "sessions": {
    "streamable": 2,
    "sse": 1,
    "total": 3
  },
  "timestamp": "2024-10-20T..."
}
```

### ✅ Configuration Validation

Server validates config at startup:

```
[ERROR] Configuration validation failed:
  - GRAPHQL_ENDPOINT_MODE is required
```

## What Didn't Change

✅ **100% Backward Compatible**

- All tool definitions work exactly the same
- OAuth authentication unchanged
- GraphQL integration unchanged
- Database operations unchanged
- API endpoints unchanged
- MCP protocol implementation unchanged

## Quick Tests

### 1. Syntax Check

```bash
node --check index.js
# Should return nothing (success)
```

### 2. Start Server

```bash
npm start
# Should see:
# [INFO] ✅ HTTP server running on port 3001
# [INFO] Health check: http://localhost:3001/health
```

### 3. Health Check

```bash
curl http://localhost:3001/health
# Should return: {"status":"healthy",...}
```

### 4. Graceful Shutdown

```bash
# Start server
npm start

# In another terminal, send SIGTERM
pkill -TERM node

# Should see:
# [INFO] Received SIGTERM, shutting down gracefully...
# [INFO] HTTP server closed
```

## Common Commands

```bash
# Start server
npm start

# Start in development mode with enhanced logging
npm run dev

# Check if server is running
curl http://localhost:3001/health

# View development logs (macOS/Linux)
tail -f /tmp/mcp-server.log

# Kill server on port 3001 (if stuck)
lsof -ti:3001 | xargs kill -9

# Syntax check all files
node --check index.js config.js logger.js toolDefinitions.js

# Check for linter errors
# (if you have ESLint configured)
npx eslint .
```

## File Locations Quick Reference

| What               | Where                     |
| ------------------ | ------------------------- |
| Main entry point   | `index.js`                |
| Configuration      | `config.js`               |
| Logging            | `logger.js`               |
| Tool definitions   | `toolDefinitions.js`      |
| Authentication     | `middleware/auth.js`      |
| CORS settings      | `middleware/cors.js`      |
| Health check       | `routes/health.js`        |
| MCP endpoints      | `routes/mcp.js`           |
| SSE endpoints      | `routes/sse.js`           |
| Session management | `utils/sessionManager.js` |

## Troubleshooting

### Issue: "Port 3001 already in use"

```bash
lsof -ti:3001 | xargs kill -9
npm start
```

### Issue: "Configuration validation failed"

Check your `.env` file has all required variables:

```bash
cat .env | grep GRAPHQL_ENDPOINT
# Should show: GRAPHQL_ENDPOINT=http://localhost:5174/graphql (or your GraphQL endpoint URL)
```

### Issue: "Database connection failed"

Verify database credentials:

```bash
# Check if DATABASE_URL is set
echo $DATABASE_URL

# Or check individual DB variables
cat .env | grep DB_
```

### Issue: "Cannot find module"

Make sure all new files were created:

```bash
ls -la config.js logger.js toolDefinitions.js
ls -la middleware/ routes/ utils/
```

## Next Steps

1. **Test in development**: `npm run dev`
2. **Review health endpoint**: `curl http://localhost:3001/health`
3. **Check logs**: `tail -f /tmp/mcp-server.log` (development)
4. **Read full docs**: See `REFACTORING.md` for details
5. **Production prep**: See `PRODUCTION_READY.md` for checklist

## Need Help?

- **Refactoring details**: Read `REFACTORING.md`
- **Production deployment**: Read `PRODUCTION_READY.md`
- **API documentation**: See `README.md`
- **OAuth setup**: See `docs/MCP_OAUTH_QUICKSTART.md`

---

**Version**: 0.0.3  
**Last Updated**: October 2024
