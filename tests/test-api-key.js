#!/usr/bin/env node

import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { init, getSuccessCoApiKey } from "./tools/core.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, ".env");

console.log("Testing API key loading...");

// Load environment variables
const result = dotenv.config({
  path: envPath,
  silent: true,
  quiet: true,
  override: false,
});

console.log("Dotenv loaded:", result.parsed ? "Yes" : "No");

// Initialize the tools
init({
  NODE_ENV: process.env.NODE_ENV,
  DEBUG: process.env.DEBUG,
  GRAPHQL_ENDPOINT: process.env.GRAPHQL_ENDPOINT,
  GRAPHQL_ENDPOINT: process.env.GRAPHQL_ENDPOINT,
  GRAPHQL_ENDPOINT: process.env.GRAPHQL_ENDPOINT,
  DEVMODE_SUCCESS_API_KEY: process.env.DEVMODE_SUCCESS_API_KEY,
  DATABASE_URL: process.env.DATABASE_URL,
  DB_HOST: process.env.DB_HOST,
  DB_PORT: process.env.DB_PORT,
  DB_DATABASE: process.env.DB_DATABASE,
  DB_USER: process.env.DB_USER,
  DB_PASS: process.env.DB_PASS,
});

// Test the API key function
const apiKey = getSuccessCoApiKey();
console.log(
  "API key from getSuccessCoApiKey():",
  apiKey ? "Found" : "Not found"
);
console.log(
  "API key value:",
  apiKey ? apiKey.substring(0, 20) + "..." : "null"
);
