# Testing OAuth Flow

## Prerequisites

1. ✅ Database migration completed (`oauth_schema.sql`)
2. ✅ ServiceAPI running
3. ✅ MCP Server running
4. ✅ ngrok tunnel active: `ngrok http 3001`

## Default Test Client Credentials

```
Client ID:      mcp-client-default
Client Secret:  mcp-secret-change-this-in-production
Redirect URI:   http://localhost:3000/callback
Scope:          access
```

## Step-by-Step Testing

### Step 1: Start Authorization Flow

Open this URL in your browser (update the redirect_uri if needed):

```
https://app.success.co/mcp/authorize?client_id=mcp-client-default&redirect_uri=http://localhost:3000/callback&response_type=code&state=test123
```

**What happens:**

- If not logged in → redirects to `/signin`
- After login → shows beautiful authorization UI
- Click "Authorize Access"

### Step 2: Capture Authorization Code

After clicking "Authorize Access", you'll be redirected to:

```
http://localhost:3000/callback?code=AUTHORIZATION_CODE&state=test123
```

**Copy the `code` parameter from the URL** (it will look like a long random string).

### Step 3: Exchange Code for Access Token

Use curl to exchange the code for an access token:

```bash
curl -X POST https://app.success.co/mcp/token \
  -H "Content-Type: application/json" \
  -d '{
    "grant_type": "authorization_code",
    "code": "YOUR_AUTHORIZATION_CODE_HERE",
    "redirect_uri": "http://localhost:3000/callback",
    "client_id": "mcp-client-default",
    "client_secret": "mcp-secret-change-this-in-production"
  }'
```

**Expected Response:**

```json
{
  "access_token": "some-long-token-string",
  "token_type": "Bearer",
  "expires_in": 7776000,
  "scope": "access"
}
```

**Copy the `access_token`** - you'll use this for API requests.

### Step 4: Verify Token

Test that your token is valid:

```bash
curl -X GET https://app.success.co/mcp/tokeninfo \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN_HERE"
```

**Expected Response:**

```json
{
  "active": true,
  "user_id": "your-user-uuid",
  "company_id": "your-company-uuid",
  "user_email": "your@email.com",
  "client_id": "mcp-client-default",
  "scope": "access"
}
```

### Step 5: Test MCP API with OAuth Token

Now test the MCP server with your OAuth token:

```bash
curl -X POST https://YOUR-NGROK-URL.ngrok-free.app/mcp \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/list",
    "params": {}
  }'
```

**Expected Response:**

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "tools": [
      {
        "name": "getTeams",
        "description": "List Success.co teams...",
        ...
      },
      ...
    ]
  }
}
```

### Step 6: Test Actual Tool Call

Try calling a real tool:

```bash
curl -X POST https://YOUR-NGROK-URL.ngrok-free.app/mcp \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/call",
    "params": {
      "name": "getTeams",
      "arguments": {}
    }
  }'
```

## Testing with MCP Inspector

MCP Inspector can test the API calls **after** you have an OAuth token:

1. **Get an OAuth token** using the browser flow above (Steps 1-3)

2. **Start MCP Inspector:**

   ```bash
   npx @modelcontextprotocol/inspector
   ```

3. **Configure Connection:**

   - Server URL: `https://YOUR-NGROK-URL.ngrok-free.app/mcp`
   - Transport: Streamable HTTP
   - Add Header: `Authorization: Bearer YOUR_ACCESS_TOKEN_HERE`

4. **Test Tools:**
   - Click "Connect"
   - You should see all available tools
   - Try calling `getTeams` or other tools

## Common Issues

### ❌ "Invalid redirect_uri"

**Problem:** The redirect URI doesn't match what's registered.

**Solution:** Check your database:

```sql
SELECT client_id, redirect_uris FROM oauth_clients WHERE client_id = 'mcp-client-default';
```

Update if needed:

```sql
UPDATE oauth_clients
SET redirect_uris = ARRAY['http://localhost:3000/callback', 'YOUR_ACTUAL_REDIRECT_URI']
WHERE client_id = 'mcp-client-default';
```

### ❌ "Invalid grant" when exchanging code

**Problem:** Code expired (10 minutes) or already used.

**Solution:** Start over from Step 1 to get a fresh code.

### ❌ "Token not found or inactive"

**Problem:** Token doesn't exist or was revoked.

**Solution:** Check database:

```sql
SELECT access_token, user_email, expires_at, state_id
FROM oauth_access_tokens
WHERE user_email = 'your@email.com'
ORDER BY created_at DESC;
```

### ❌ "No valid authentication provided"

**Problem:** Authorization header is missing or malformed.

**Solution:** Ensure header is exactly: `Authorization: Bearer YOUR_TOKEN`

### ❌ Can't reach authorization page

**Problem:** ServiceAPI not running or URL wrong.

**Solution:**

- Check ServiceAPI is running
- Verify URL: `https://app.success.co/mcp/authorize`
- Check browser console for errors

## Quick Test Script

Save this as `test-oauth.sh`:

```bash
#!/bin/bash

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
CLIENT_ID="mcp-client-default"
CLIENT_SECRET="mcp-secret-change-this-in-production"
REDIRECT_URI="http://localhost:3000/callback"
SERVICEAPI_URL="https://app.success.co"
MCP_SERVER_URL="https://YOUR-NGROK-URL.ngrok-free.app"

echo -e "${GREEN}=== OAuth Test Script ===${NC}\n"

# Step 1
echo -e "${YELLOW}Step 1: Open this URL in your browser:${NC}"
echo "${SERVICEAPI_URL}/mcp/authorize?client_id=${CLIENT_ID}&redirect_uri=${REDIRECT_URI}&response_type=code&state=test123"
echo ""

# Step 2
echo -e "${YELLOW}Step 2: After authorizing, paste the authorization code here:${NC}"
read -p "Authorization Code: " AUTH_CODE
echo ""

# Step 3
echo -e "${YELLOW}Step 3: Exchanging code for token...${NC}"
TOKEN_RESPONSE=$(curl -s -X POST "${SERVICEAPI_URL}/mcp/token" \
  -H "Content-Type: application/json" \
  -d "{
    \"grant_type\": \"authorization_code\",
    \"code\": \"${AUTH_CODE}\",
    \"redirect_uri\": \"${REDIRECT_URI}\",
    \"client_id\": \"${CLIENT_ID}\",
    \"client_secret\": \"${CLIENT_SECRET}\"
  }")

echo "$TOKEN_RESPONSE" | jq '.'
ACCESS_TOKEN=$(echo "$TOKEN_RESPONSE" | jq -r '.access_token')
echo ""

if [ "$ACCESS_TOKEN" == "null" ] || [ -z "$ACCESS_TOKEN" ]; then
  echo -e "${RED}❌ Failed to get access token${NC}"
  exit 1
fi

echo -e "${GREEN}✅ Access Token: ${ACCESS_TOKEN:0:20}...${NC}"
echo ""

# Step 4
echo -e "${YELLOW}Step 4: Verifying token...${NC}"
curl -s -X GET "${SERVICEAPI_URL}/mcp/tokeninfo" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" | jq '.'
echo ""

# Step 5
echo -e "${YELLOW}Step 5: Testing MCP API - List Tools...${NC}"
curl -s -X POST "${MCP_SERVER_URL}/mcp" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/list",
    "params": {}
  }' | jq '.result.tools[0:3]'
echo ""

# Step 6
echo -e "${YELLOW}Step 6: Testing MCP API - Get Teams...${NC}"
curl -s -X POST "${MCP_SERVER_URL}/mcp" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/call",
    "params": {
      "name": "getTeams",
      "arguments": {}
    }
  }' | jq '.'

echo ""
echo -e "${GREEN}✅ OAuth flow test complete!${NC}"
echo ""
echo "Your access token is valid for 90 days."
echo "Save it for future API requests:"
echo ""
echo "export MCP_OAUTH_TOKEN=\"${ACCESS_TOKEN}\""
```

Make it executable:

```bash
chmod +x test-oauth.sh
./test-oauth.sh
```

## Database Queries for Debugging

### Check your tokens

```sql
-- Active tokens for your email
SELECT
  access_token,
  client_id,
  user_email,
  created_at,
  last_used_at,
  expires_at,
  state_id
FROM oauth_access_tokens
WHERE user_email = 'your@email.com'
  AND state_id = 'ACTIVE'
ORDER BY created_at DESC;
```

### Check authorization codes

```sql
-- Recent auth codes
SELECT
  code,
  client_id,
  user_id,
  company_id,
  expires_at,
  used,
  created_at
FROM oauth_authorization_codes
ORDER BY created_at DESC
LIMIT 10;
```

### Revoke a token

```sql
-- Revoke specific token
UPDATE oauth_access_tokens
SET state_id = 'INACTIVE'
WHERE access_token = 'your-token-here';
```

### Check registered clients

```sql
-- See all OAuth clients
SELECT
  client_id,
  client_name,
  redirect_uris,
  state_id,
  created_at
FROM oauth_clients;
```
