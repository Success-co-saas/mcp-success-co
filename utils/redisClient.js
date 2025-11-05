import { createClient } from "redis";
import { REDIS_CONN_STRING, STATS_CONFIG } from "../config.js";
import { logger } from "../logger.js";

/**
 * Redis client for MCP stats tracking
 * Only initialized if Redis config is provided
 */
let statsRedis = null;
let connectionAttempted = false;

// Only create Redis client if config is available and stats are enabled
if (STATS_CONFIG.ENABLED && REDIS_CONN_STRING) {
  logger.info(`[REDIS] Attempting to connect to Redis: ${REDIS_CONN_STRING}`);
  connectionAttempted = true;

  try {
    statsRedis = createClient({
      url: REDIS_CONN_STRING,
    });

    statsRedis.on("error", (err) => {
      logger.error("[REDIS] ❌ Stats Redis error:", err.message);
    });

    statsRedis.on("connect", () => {
      logger.info("[REDIS] ✅ Stats Redis connected successfully!");
      logger.info("[REDIS] MCP stats tracking is ENABLED");
    });

    statsRedis.on("ready", () => {
      logger.info("[REDIS] ✅ Stats Redis ready to accept commands");
    });

    statsRedis.on("reconnecting", () => {
      logger.warn("[REDIS] ⚠️ Stats Redis reconnecting...");
    });

    statsRedis.on("end", () => {
      logger.warn("[REDIS] ⚠️ Stats Redis connection closed");
    });

    // Connect to Redis with explicit error handling
    statsRedis
      .connect()
      .then(() => {
        logger.info("[REDIS] ✅ Initial connection established");
      })
      .catch((err) => {
        logger.error("[REDIS] ❌ FATAL: Failed to connect to Redis!");
        logger.error(`[REDIS] Connection string: ${REDIS_CONN_STRING}`);
        logger.error(`[REDIS] Error: ${err.message}`);
        logger.error(
          "[REDIS] Stats tracking requires Redis. Please check your REDIS_CONN_STRING configuration."
        );
        logger.error(
          "[REDIS] To disable stats tracking, set MCP_STATS_ENABLED=false in .env"
        );
        process.exit(1);
      });
  } catch (err) {
    logger.error("[REDIS] ❌ FATAL: Failed to initialize Redis client!");
    logger.error(`[REDIS] Error: ${err.message}`);
    logger.error(`[REDIS] Connection string: ${REDIS_CONN_STRING}`);
    process.exit(1);
  }
} else {
  if (!STATS_CONFIG.ENABLED) {
    logger.info(
      "[REDIS] ℹ️ Stats tracking disabled via MCP_STATS_ENABLED=false"
    );
  } else {
    logger.info(
      "[REDIS] ℹ️ Stats tracking disabled - REDIS_CONN_STRING not configured"
    );
  }
}

/**
 * Check if stats tracking is available
 */
export function isStatsAvailable() {
  const available = statsRedis !== null && statsRedis.isReady;
  if (connectionAttempted && !available) {
    logger.debug("[REDIS] Stats not available - connection not ready");
  }
  return available;
}

/**
 * Get the stats Redis client
 * Returns null if not configured or not connected
 */
export function getStatsRedis() {
  return statsRedis;
}

export { statsRedis };

