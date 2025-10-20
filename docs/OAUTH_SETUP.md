# OAuth Setup Guide for MCP Server

This guide explains how to set up OAuth authorization for your MCP server.

## Overview

The MCP server now supports OAuth 2.0 authorization flow, allowing secure authentication through your Success.co account. Users can authorize MCP clients (like Claude Desktop) to access their Success.co data.

## Architecture

1. **MCP Client** → Initiates authorization request
2. **MCP Server** → Redirects to OAuth authorization endpoint
3. **ServiceAPI** → Handles authorization UI and OAuth flow
4. **User** → Logs in (if needed) and approves access
5. **ServiceAPI** → Issues authorization code
6. **MCP Client** → Exchanges code for access token
7. **MCP Server** → Validates token and allows API access

## Database Setup

### 1. Run the OAuth Schema Migration

Execute the SQL migration to create the required OAuth tables:

```bash
psql -h your-host -U your-user -d your-database -f schema/oauth_schema.sql
```

This creates:

- `oauth_clients` - Registered OAuth clients
- `oauth_authorization_codes` - Temporary auth codes
- `oauth_access_tokens` - Access tokens

### 2. Register Your OAuth Client

The migration includes a default client for development. For production, register a new client:

```sql
INSERT INTO oauth_clients (
  client_id,
  client_secret,
  client_name,
  redirect_uris
) VALUES (
  'your-client-id',
  'your-client-secret',
  'Claude Desktop',
  ARRAY['http://localhost:3000/callback', 'https://your-app.com/callback']
);
```

## Environment Configuration

### MCP Server (.env)

Add these variables to your MCP server `.env` file:

```bash
# Server Configuration
NODE_ENV=development
PORT=3001

# GraphQL Endpoint
GRAPHQL_ENDPOINT_MODE=online
GRAPHQL_ENDPOINT_ONLINE=https://app.success.co/graphql

# Database (required for OAuth) - Use existing individual parameters
DB_HOST=your-db-host
DB_PORT=5432
DB_NAME=your-db-name
DB_USER=your-db-user
DB_PASS=your-db-password

# Alternatively, you can use DATABASE_URL instead:
# DATABASE_URL=postgresql://user:password@host:port/database

# API Key (development fallback)
DEVMODE_SUCCESS_API_KEY=your-dev-api-key-here

# Server URL (for OAuth callbacks via ngrok)
MCP_SERVER_URL=https://your-ngrok-url.ngrok-free.app
```

### ServiceAPI (.env)

The serviceapi should already have these, but verify:

```bash
# Server URL (must be accessible to MCP server)
SERVER_URL=https://app.success.co/

# Session Configuration
SESSION_SECRET=your-session-secret
REDIS_CONN_STRING=redis://localhost:6379

# OAuth Providers (existing)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
MICROSOFT_CLIENT_ID=your-microsoft-client-id
MICROSOFT_CLIENT_SECRET=your-microsoft-client-secret
```

## Local Development with ngrok

### 1. Install ngrok

```bash
brew install ngrok
# or download from https://ngrok.com/
```

### 2. Start ngrok tunnel

```bash
ngrok http 3001
```

This will output something like:

```
Forwarding https://df6e2f2e0e95.ngrok-free.app -> http://localhost:3001
```

### 3. Update Environment

Set `MCP_SERVER_URL` in your `.env`:

```bash
MCP_SERVER_URL=https://df6e2f2e0e95.ngrok-free.app
```

### 4. Update OAuth Client Redirect URIs

Update your OAuth client in the database to include the ngrok URL:

```sql
UPDATE oauth_clients
SET redirect_uris = ARRAY[
  'http://localhost:3000/callback',
  'https://df6e2f2e0e95.ngrok-free.app/mcp/callback'
]
WHERE client_id = 'your-client-id';
```

## OAuth Flow

### 1. Authorization Request

Client initiates authorization:

```
GET https://app.success.co/mcp/authorize?
  client_id=your-client-id&
  redirect_uri=https://your-app.com/callback&
  response_type=code&
  state=random-state-string
```

### 2. User Login (if needed)

If not logged in, user is redirected to `/signin` and then back to the authorization page.

### 3. User Approval

User sees authorization UI and clicks "Authorize Access" or "Cancel".

### 4. Authorization Code

On approval, user is redirected with an authorization code:

```
https://your-app.com/callback?
  code=auth-code-here&
  state=random-state-string
```

### 5. Token Exchange

Client exchanges code for access token:

```bash
POST https://app.success.co/mcp/token
Content-Type: application/json

{
  "grant_type": "authorization_code",
  "code": "auth-code-here",
  "redirect_uri": "https://your-app.com/callback",
  "client_id": "your-client-id",
  "client_secret": "your-client-secret"
}
```

Response:

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "Bearer",
  "expires_in": 7776000,
  "scope": "access"
}
```

### 6. API Requests

Use the access token in subsequent API requests:

```bash
POST https://df6e2f2e0e95.ngrok-free.app/mcp
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "getTeams",
    "arguments": {}
  }
}
```

## Testing OAuth

### 1. Test Authorization Endpoint

Visit in browser:

```
https://app.success.co/mcp/authorize?client_id=mcp-client-default&redirect_uri=http://localhost:3000/callback&response_type=code
```

### 2. Test Token Info

```bash
curl -X GET https://app.success.co/mcp/tokeninfo \
  -H "Authorization: Bearer your-access-token"
```

### 3. Test Token Revocation

```bash
curl -X POST https://app.success.co/mcp/revoke \
  -H "Content-Type: application/json" \
  -d '{
    "token": "your-access-token",
    "client_id": "your-client-id",
    "client_secret": "your-client-secret"
  }'
```

## Security Considerations

### Token Expiration

- Authorization codes: 10 minutes
- Access tokens: 90 days

### Token Storage

- Never commit tokens to version control
- Store access tokens securely on the client
- Rotate client secrets regularly

### HTTPS Required

- Always use HTTPS in production
- OAuth requires secure connections
- ngrok provides HTTPS for local development

## Troubleshooting

### "Invalid redirect_uri"

- Ensure the redirect URI matches exactly what's registered in `oauth_clients`
- Include protocol (http:// or https://)

### "Token expired"

- Access tokens expire after 90 days
- Request a new token through the authorization flow

### "Invalid client credentials"

- Verify client_id and client_secret
- Check that client is ACTIVE in database

### "No valid authentication"

- Ensure Authorization header is formatted: `Bearer <token>`
- Verify token is still valid and not revoked

## API Endpoints

### ServiceAPI Endpoints

- `GET /mcp/authorize` - Authorization UI
- `POST /mcp/authorize` - Process authorization
- `POST /mcp/token` - Exchange code for token
- `POST /mcp/revoke` - Revoke access token
- `GET /mcp/tokeninfo` - Get token information

### MCP Server Endpoints

All endpoints under `/mcp/*` now support OAuth authentication:

- `POST /mcp` - JSON-RPC MCP requests
- `GET /sse` - Server-Sent Events connection
- `GET /health` - Health check (no auth required)

## Development vs Production

### Development

- Use API key authentication: `DEVMODE_SUCCESS_API_KEY`
- Use ngrok for local OAuth testing
- Use default OAuth client

### Production

- Use OAuth exclusively
- Register production OAuth clients
- Use strong, unique client secrets
- Configure proper redirect URIs
- Enable HTTPS

## Support

For questions or issues:

- Check the logs: `tail -f mcp.log`
- Review database: `SELECT * FROM oauth_access_tokens WHERE user_email = 'your@email.com';`
- Contact: support@success.co
