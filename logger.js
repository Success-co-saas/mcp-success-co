import fs from "fs";
import { IS_DEVELOPMENT } from "./config.js";

const LOG_FILE = IS_DEVELOPMENT ? "/tmp/mcp-server.log" : null;

// Store original console.error for fallback
const originalConsoleError = console.error;

// Log levels
const LOG_LEVELS = {
  ERROR: "ERROR",
  WARN: "WARN",
  INFO: "INFO",
  DEBUG: "DEBUG",
};

/**
 * Format log message with timestamp and level
 */
function formatMessage(level, ...args) {
  const timestamp = new Date().toISOString();
  const formattedArgs = args.map((arg) => {
    if (typeof arg === "object" && arg !== null) {
      try {
        return JSON.stringify(arg, null, 2);
      } catch (e) {
        return String(arg);
      }
    }
    return String(arg);
  });
  return `[${timestamp}] [${level}] ${formattedArgs.join(" ")}`;
}

/**
 * Write to log file (development only)
 */
function writeToFile(message) {
  if (!LOG_FILE) return;

  try {
    fs.appendFileSync(LOG_FILE, message + "\n");
  } catch (err) {
    // Silently fail if can't write to log file
  }
}

/**
 * Initialize logging
 */
export function initLogger() {
  if (LOG_FILE) {
    try {
      fs.writeFileSync(
        LOG_FILE,
        `=== MCP Server Started at ${new Date().toISOString()} ===\n`
      );
      originalConsoleError(`[LOGGING] Logging to ${LOG_FILE}`);
    } catch (err) {
      originalConsoleError(
        `[LOGGING] Could not initialize log file: ${err.message}`
      );
    }
  }
}

/**
 * Logger object with different log levels
 */
export const logger = {
  error(...args) {
    const message = formatMessage(LOG_LEVELS.ERROR, ...args);
    originalConsoleError(message);
    writeToFile(message);
  },

  warn(...args) {
    const message = formatMessage(LOG_LEVELS.WARN, ...args);
    originalConsoleError(message);
    writeToFile(message);
  },

  info(...args) {
    const message = formatMessage(LOG_LEVELS.INFO, ...args);
    originalConsoleError(message);
    writeToFile(message);
  },

  debug(...args) {
    if (!IS_DEVELOPMENT) return;
    const message = formatMessage(LOG_LEVELS.DEBUG, ...args);
    originalConsoleError(message);
    writeToFile(message);
  },

  // Compatibility method for existing code
  log(...args) {
    this.info(...args);
  },
};

// Override console.error to use our logger
if (IS_DEVELOPMENT) {
  console.error = (...args) => logger.error(...args);
}

export default logger;
