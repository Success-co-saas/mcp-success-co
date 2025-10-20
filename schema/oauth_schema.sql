-- OAuth Schema for MCP Server Authorization
-- Run this SQL against your database to add OAuth support

-- Table to store registered OAuth clients (MCP clients like Claude Desktop)
CREATE TABLE IF NOT EXISTS "public"."oauth_clients" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "client_id" varchar(255) NOT NULL,
  "client_secret" varchar(255) NOT NULL,
  "client_name" varchar(255) NOT NULL,
  "redirect_uris" text[] NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT NOW(),
  "updated_at" timestamptz NOT NULL DEFAULT NOW(),
  "state_id" varchar(50) NOT NULL DEFAULT 'ACTIVE',
  PRIMARY KEY ("id"),
  UNIQUE ("client_id")
);

-- Table to store temporary authorization codes during OAuth flow
CREATE TABLE IF NOT EXISTS "public"."oauth_authorization_codes" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "code" varchar(255) NOT NULL,
  "client_id" varchar(255) NOT NULL,
  "user_id" uuid NOT NULL,
  "company_id" uuid NOT NULL,
  "redirect_uri" text NOT NULL,
  "scope" varchar(255),
  "expires_at" timestamptz NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT NOW(),
  "used" boolean NOT NULL DEFAULT false,
  PRIMARY KEY ("id"),
  UNIQUE ("code")
);

-- Table to store OAuth access tokens
CREATE TABLE IF NOT EXISTS "public"."oauth_access_tokens" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "access_token" varchar(255) NOT NULL,
  "client_id" varchar(255) NOT NULL,
  "user_id" uuid NOT NULL,
  "company_id" uuid NOT NULL,
  "user_email" varchar(255) NOT NULL,
  "scope" varchar(255),
  "expires_at" timestamptz NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT NOW(),
  "last_used_at" timestamptz,
  "state_id" varchar(50) NOT NULL DEFAULT 'ACTIVE',
  PRIMARY KEY ("id"),
  UNIQUE ("access_token")
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS "idx_oauth_authorization_codes_code" ON "public"."oauth_authorization_codes" ("code");
CREATE INDEX IF NOT EXISTS "idx_oauth_authorization_codes_client_id" ON "public"."oauth_authorization_codes" ("client_id");
CREATE INDEX IF NOT EXISTS "idx_oauth_authorization_codes_user_id" ON "public"."oauth_authorization_codes" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_oauth_authorization_codes_expires_at" ON "public"."oauth_authorization_codes" ("expires_at");

CREATE INDEX IF NOT EXISTS "idx_oauth_access_tokens_access_token" ON "public"."oauth_access_tokens" ("access_token");
CREATE INDEX IF NOT EXISTS "idx_oauth_access_tokens_client_id" ON "public"."oauth_access_tokens" ("client_id");
CREATE INDEX IF NOT EXISTS "idx_oauth_access_tokens_user_id" ON "public"."oauth_access_tokens" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_oauth_access_tokens_company_id" ON "public"."oauth_access_tokens" ("company_id");
CREATE INDEX IF NOT EXISTS "idx_oauth_access_tokens_expires_at" ON "public"."oauth_access_tokens" ("expires_at");

-- Insert a default MCP client for development/testing
-- You should change these values in production!
INSERT INTO "public"."oauth_clients" (
  "client_id",
  "client_secret",
  "client_name",
  "redirect_uris"
) VALUES (
  'mcp-client-default',
  'mcp-secret-change-this-in-production',
  'MCP Client (Default)',
  ARRAY['http://localhost:3000/callback', 'https://localhost:3000/callback']
) ON CONFLICT (client_id) DO NOTHING;

-- Add comments for documentation
COMMENT ON TABLE "public"."oauth_clients" IS 'Registered OAuth clients that can request authorization';
COMMENT ON TABLE "public"."oauth_authorization_codes" IS 'Temporary authorization codes issued during OAuth flow';
COMMENT ON TABLE "public"."oauth_access_tokens" IS 'Access tokens for authenticated API requests';

COMMENT ON COLUMN "public"."oauth_clients"."redirect_uris" IS 'Array of allowed redirect URIs for this client';
COMMENT ON COLUMN "public"."oauth_authorization_codes"."code" IS 'One-time authorization code, expires in 10 minutes';
COMMENT ON COLUMN "public"."oauth_authorization_codes"."used" IS 'Whether this code has been exchanged for a token';
COMMENT ON COLUMN "public"."oauth_access_tokens"."access_token" IS 'Bearer token for API authentication';
COMMENT ON COLUMN "public"."oauth_access_tokens"."expires_at" IS 'Token expiration time (default 90 days from creation)';

