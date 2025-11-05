import path from "path";
import { fileURLToPath } from "url";
import { readFileSync } from "fs";
import dotenv from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load package.json for version
const packageJson = JSON.parse(
  readFileSync(path.join(__dirname, "package.json"), "utf-8")
);

// Load environment variables from .env file
const envPath = path.join(__dirname, ".env");
dotenv.config({
  path: envPath,
  silent: true,
  quiet: true,
  override: false,
});

// Application metadata
export const VERSION = packageJson.version;
export const APP_NAME = packageJson.name;

// Environment detection
export const NODE_ENV = process.env.NODE_ENV || "development";
export const IS_PRODUCTION = NODE_ENV === "production";
export const IS_DEVELOPMENT = !IS_PRODUCTION;

// Server configuration
export const PORT = process.env.PORT || 3001;
export const CORS_ORIGIN = process.env.CORS_ORIGIN || "*";
export const OAUTH_SERVER_URL =
  process.env.OAUTH_SERVER_URL ||
  (IS_PRODUCTION ? "https://www.success.co" : "http://localhost:3000");

// OAuth JWT validation configuration
export const OAUTH_CONFIG = {
  issuer: OAUTH_SERVER_URL,
  jwksUri: `${OAUTH_SERVER_URL}/oauth/jwks`,
};

// GraphQL configuration
export const GRAPHQL_ENDPOINT =
  process.env.GRAPHQL_ENDPOINT || "http://localhost:5174/graphql";

// Database configuration
export const DB_CONFIG = {
  DATABASE_URL: process.env.DATABASE_URL,
  DB_HOST: process.env.DB_HOST,
  DB_PORT: process.env.DB_PORT,
  DB_DATABASE: process.env.DB_DATABASE,
  DB_USER: process.env.DB_USER,
  DB_PASS: process.env.DB_PASS,
};

// Development mode configuration
export const DEV_CONFIG = {
  API_KEY: process.env.DEVMODE_SUCCESS_API_KEY,
  USE_API_KEY: process.env.DEVMODE_SUCCESS_USE_API_KEY === "true",
};

// Debug configuration
export const DEBUG = process.env.DEBUG === "true";

// Redis configuration for stats tracking
export const REDIS_CONN_STRING = process.env.REDIS_CONN_STRING;

// Stats tracking configuration
export const STATS_CONFIG = {
  MAX_RECENT_CALLS: process.env.MCP_STATS_MAX_CALLS
    ? parseInt(process.env.MCP_STATS_MAX_CALLS)
    : 200,
  ENABLED: process.env.MCP_STATS_ENABLED !== "false", // Enabled by default
};

// Validation
export function validateConfig() {
  const errors = [];

  if (!GRAPHQL_ENDPOINT) {
    errors.push("GRAPHQL_ENDPOINT is required");
  }

  // Validate that it's a valid URL
  try {
    new URL(GRAPHQL_ENDPOINT);
  } catch (e) {
    errors.push(
      `GRAPHQL_ENDPOINT must be a valid URL, got: ${GRAPHQL_ENDPOINT}`
    );
  }

  // Redis is required when stats tracking is enabled
  if (STATS_CONFIG.ENABLED && !REDIS_CONN_STRING) {
    errors.push(
      "REDIS_CONN_STRING is required when MCP_STATS_ENABLED=true. Either set REDIS_CONN_STRING in .env or set MCP_STATS_ENABLED=false to disable stats tracking."
    );
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export default {
  VERSION,
  APP_NAME,
  NODE_ENV,
  IS_PRODUCTION,
  IS_DEVELOPMENT,
  PORT,
  CORS_ORIGIN,
  OAUTH_SERVER_URL,
  OAUTH_CONFIG,
  GRAPHQL_ENDPOINT,
  DB_CONFIG,
  DEV_CONFIG,
  DEBUG,
  REDIS_CONN_STRING,
  STATS_CONFIG,
  validateConfig,
};
