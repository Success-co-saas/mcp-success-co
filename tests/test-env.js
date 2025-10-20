#!/usr/bin/env node

import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, ".env");

console.log("Testing environment variable loading...");
console.log("Env file path:", envPath);

const result = dotenv.config({
  path: envPath,
  silent: false,
  quiet: false,
  override: false,
});

console.log("Dotenv result:", result);

console.log(
  "DEVMODE_SUCCESS_API_KEY from process.env:",
  process.env.DEVMODE_SUCCESS_API_KEY
);
console.log(
  "GRAPHQL_ENDPOINT_MODE from process.env:",
  process.env.GRAPHQL_ENDPOINT_MODE
);
console.log("NODE_ENV from process.env:", process.env.NODE_ENV);
