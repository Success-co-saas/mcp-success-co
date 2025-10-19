# MCP OAuth Quick Start Guide

## Current Status

✅ **Working:**

- OAuth discovery endpoint (`/.well-known/oauth-protected-resource`)
- 401 challenge with proper `WWW-Authenticate` header
- Client is correctly discovering the authorization server
- ServiceAPI OAuth routes are implemented

⚠️ **Issue:**
Client is being redirected to `/authorize` on the wrong server. This should now be fixed by pointing to ServiceAPI.

## What Just Changed

### MCP Server Updates

1. **Added `/.well-known/oauth-protected-resource` endpoint**

   - Returns OAuth metadata including authorization server URL
   - Defaults to the same URL as the resource (auto-detected from request)
   - Can be overridden with `OAUTH_AUTHORIZATION_SERVER` env var

2. **Updated 401 responses to include OAuth challenge header**

   - Returns `WWW-Authenticate: Bearer realm="mcp", resource_metadata="..."`
   - Properly implements RFC 6750 OAuth 2.0 Bearer Token Usage

3. **Dynamic URL detection**
   - Automatically detects ngrok and production URLs
   - Supports `x-forwarded-proto` and `x-forwarded-host` headers

## Next Steps

### 1. Update OAuth Client Redirect URIs

The client is trying to use `http://localhost:6274/oauth/callback` as the redirect URI. You need to add this to the database:

```sql
-- Connect to your database
psql -h your-host -U your-user -d your-database

-- Check current redirect URIs
SELECT client_id, client_name, redirect_uris
FROM oauth_clients
WHERE client_id = 'mcp-client-default';

-- Update to include the client's callback URL
UPDATE oauth_clients
SET redirect_uris = ARRAY[
  'http://localhost:3000/callback',
  'http://localhost:6274/oauth/callback',
  'https://localhost:3000/callback',
  'https://localhost:6274/oauth/callback'
]
WHERE client_id = 'mcp-client-default';
```

### 2. Configure Environment Variables (Optional)

The MCP server and ServiceAPI should be behind the same ngrok URL. If you need to use a different authorization server URL, update the MCP server `.env`:

```bash
# By default, uses the same URL as the resource (auto-detected from request)
# Only set this if you need to override:
# OAUTH_AUTHORIZATION_SERVER=https://your-custom-auth-server.com
```

### 3. Restart MCP Server

```bash
cd /Users/topper/dev/success.co/mcp-success-co
# Kill existing process if running
lsof -ti:3001 | xargs kill -9
# Start server
node mcp-server.js
```

### 4. Test the Flow

The OAuth flow should now work as follows:

1. **Client connects without auth** → Gets 401 with `WWW-Authenticate` header
2. **Client fetches metadata** → `GET /.well-known/oauth-protected-resource`
3. **Client redirects to ServiceAPI** → `https://successcodev.ngrok.app/oauth/authorize?...`
4. **User logs in** (if needed) → Google/Microsoft OAuth
5. **User approves access** → Shows authorization UI
6. **ServiceAPI issues code** → Redirects to `http://localhost:6274/oauth/callback?code=...`
7. **Client exchanges code** → `POST https://successcodev.ngrok.app/oauth/token`
8. **Client gets token** → Uses token to access MCP server
9. **MCP server validates token** → Queries database, allows access

## Testing URLs

### Check OAuth Discovery

```bash
curl https://successcodev.ngrok.app/.well-known/oauth-protected-resource
```

Expected response:

```json
{
  "resource": "https://successcodev.ngrok.app",
  "authorization_servers": ["https://successcodev.ngrok.app"],
  "scopes_supported": ["mcp:tools", "mcp:resources", "mcp:prompts"],
  "bearer_methods_supported": ["header"],
  "resource_documentation": "https://modelcontextprotocol.io/docs/tutorials/security/authorization"
}
```

### Test Authorization Endpoint (Browser)

```
https://successcodev.ngrok.app/oauth/authorize?client_id=mcp-client-default&redirect_uri=http://localhost:6274/oauth/callback&response_type=code&state=test123
```

Should show the authorization UI (after logging in if needed).

## Architecture

```
┌─────────────────┐
│  MCP Client     │ (Claude Desktop, etc.)
└────────┬────────┘
         │
         │ 1. Connect without auth
         ▼
┌──────────────────────────────────────────────────┐
│  ngrok (https://successcodev.ngrok.app)          │
│                                                  │
│  ┌────────────────────────────────────────────┐ │
│  │ MCP Server (:3001)                         │ │
│  │  • POST /mcp - MCP requests                │ │
│  │  • GET /.well-known/oauth-...              │ │
│  │  • Returns 401 + WWW-Authenticate          │ │
│  └────────────────────────────────────────────┘ │
│                                                  │
│  ┌────────────────────────────────────────────┐ │
│  │ ServiceAPI (:3000)                         │ │
│  │  • GET /oauth/authorize - Shows UI         │ │
│  │  • POST /oauth/authorize - Issues code     │ │
│  │  • POST /oauth/token - Issues token        │ │
│  │  • POST /oauth/revoke - Revokes token      │ │
│  │  • GET /oauth/tokeninfo - Token info       │ │
│  └────────────────────────────────────────────┘ │
└────────┬─────────────────────────────────────────┘
         │
         │ 2. Token validation
         ▼
┌─────────────────────────────────────────┐
│  Database (PostgreSQL)                  │
│                                         │
│  • oauth_clients                        │
│  • oauth_authorization_codes            │
│  • oauth_access_tokens                  │
└─────────────────────────────────────────┘
```

## Troubleshooting

### "Invalid redirect_uri"

**Solution:** Add the client's callback URL to the database (see Step 1 above)

### Still redirecting to wrong URL

**Solution:**

1. Check the `/.well-known/oauth-protected-resource` response
2. Verify `OAUTH_AUTHORIZATION_SERVER` is set correctly (if needed)
3. Restart the MCP server

### "Client not found"

**Solution:** Check that the OAuth schema has been applied to the database:

```sql
SELECT * FROM oauth_clients WHERE client_id = 'mcp-client-default';
```

If empty, run the schema migration:

```bash
psql -h your-host -U your-user -d your-database -f schema/oauth_schema.sql
```

### ServiceAPI not accessible

**Solution:** Make sure ServiceAPI is running and accessible:

```bash
curl https://app.success.co/health
```

## Environment Variables Reference

### MCP Server (.env)

```bash
# Required
NODE_ENV=development
GRAPHQL_ENDPOINT_MODE=online
GRAPHQL_ENDPOINT_ONLINE=https://app.success.co/graphql
DB_HOST=your-host
DB_PORT=5432
DB_NAME=your-db
DB_USER=your-user
DB_PASS=your-password

# Optional OAuth configuration
OAUTH_AUTHORIZATION_SERVER=https://successcodev.ngrok.app  # Default: auto-detected
MCP_RESOURCE_URL=https://successcodev.ngrok.app     # Auto-detected
MCP_SERVER_PORT=3001                                # Default

# Development fallback
SUCCESS_CO_API_KEY=your-api-key-for-dev
```

## Support

If issues persist:

1. **Check logs:**

   ```bash
   tail -f /Users/topper/dev/success.co/mcp-success-co/mcp.log
   ```

2. **Verify database:**

   ```sql
   -- Check OAuth tables
   \dt oauth_*

   -- Check client configuration
   SELECT * FROM oauth_clients;
   ```

3. **Test each endpoint:**
   - MCP health: `https://successcodev.ngrok.app/health`
   - OAuth metadata: `https://successcodev.ngrok.app/.well-known/oauth-protected-resource`
   - ServiceAPI health: `https://successcodev.ngrok.app/health`
   - Authorization UI: `https://successcodev.ngrok.app/oauth/authorize?...`

## Summary

The OAuth implementation uses the same ngrok URL for both the MCP server (resource server) and ServiceAPI (authorization server). Both servers run behind the same ngrok tunnel on different ports, with ngrok routing requests based on the path.

**Key Points:**

- MCP Server handles `/mcp` and `/.well-known` endpoints (port 3001)
- ServiceAPI handles `/oauth/*` endpoints (port 3000)
- Both use the same ngrok URL (e.g., `https://successcodev.ngrok.app`)
- Authorization server URL defaults to the same URL as the resource server

Once you update the redirect URIs in the database and restart the MCP server, the OAuth flow should complete successfully!
