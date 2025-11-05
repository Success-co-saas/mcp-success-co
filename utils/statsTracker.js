import { getStatsRedis, isStatsAvailable } from "./redisClient.js";
import { STATS_CONFIG } from "../config.js";
import { logger } from "../logger.js";

/**
 * Track a tool call in Redis
 * @param {Object} callData - The tool call data
 * @param {string} callData.toolName - Name of the tool that was called
 * @param {string} callData.userId - User ID who made the call
 * @param {string} callData.companyId - Company ID of the user
 * @param {Object} callData.parameters - Parameters passed to the tool
 * @param {number} callData.duration - Duration of the call in milliseconds
 * @param {boolean} callData.success - Whether the call succeeded
 * @param {string} [callData.error] - Error message if the call failed
 */
export async function trackToolCall({
  toolName,
  userId,
  companyId,
  parameters,
  duration,
  success,
  error = null,
}) {
  // Skip if stats tracking is not available
  if (!isStatsAvailable()) {
    return;
  }

  const redis = getStatsRedis();
  if (!redis) {
    return;
  }

  try {
    const timestamp = new Date().toISOString();

    // Prepare the call data
    const callData = {
      toolName,
      timestamp,
      userId,
      companyId,
      parameters,
      duration,
      success,
      error,
    };

    const callDataJson = JSON.stringify(callData);

    // Use multi for atomic operations (pipeline equivalent in redis client)
    const multi = redis.multi();

    // 1. Add to recent calls list (LPUSH and LTRIM to maintain size)
    multi.lPush("mcp:calls:recent", callDataJson);
    multi.lTrim("mcp:calls:recent", 0, STATS_CONFIG.MAX_RECENT_CALLS - 1);

    // 2. Increment company usage counters (30-day and all-time)
    if (companyId) {
      // 30-day stats with TTL
      const thirtyDayKey = `mcp:usage:30d:${companyId}`;
      multi.zIncrBy(thirtyDayKey, 1, companyId);
      multi.expire(thirtyDayKey, 35 * 24 * 60 * 60); // 35 days TTL

      // All-time stats (no TTL, but could add one like 90 days if needed)
      const allTimeKey = `mcp:usage:alltime:${companyId}`;
      multi.zIncrBy(allTimeKey, 1, companyId);
      // Optional: Add TTL for all-time stats to prevent unbounded growth
      // multi.expire(allTimeKey, 90 * 24 * 60 * 60); // 90 days TTL
    }

    // Execute the multi command
    await multi.exec();

    logger.debug("[STATS] Tracked tool call:", {
      toolName,
      companyId,
      success,
      duration,
    });
  } catch (err) {
    // Don't let stats tracking errors affect the main application
    logger.error("[STATS] Error tracking tool call:", err.message);
  }
}

/**
 * Get recent tool calls from Redis
 * @param {number} [limit] - Maximum number of calls to retrieve (default: all stored)
 * @returns {Promise<Array>} - Array of call data objects
 */
export async function getRecentCalls(limit = null) {
  if (!isStatsAvailable()) {
    return [];
  }

  const redis = getStatsRedis();
  if (!redis) {
    return [];
  }

  try {
    const maxLimit = limit || STATS_CONFIG.MAX_RECENT_CALLS;
    const calls = await redis.lRange("mcp:calls:recent", 0, maxLimit - 1);
    return calls.map((call) => JSON.parse(call));
  } catch (err) {
    logger.error("[STATS] Error getting recent calls:", err.message);
    return [];
  }
}

/**
 * Get top companies by usage (30-day period)
 * @param {number} [limit=20] - Maximum number of companies to retrieve
 * @returns {Promise<Array>} - Array of {companyId, calls} objects
 */
export async function getTopCompanies30d(limit = 20) {
  if (!isStatsAvailable()) {
    return [];
  }

  const redis = getStatsRedis();
  if (!redis) {
    return [];
  }

  try {
    // Get all companies with 30-day usage
    // We need to scan for all keys matching mcp:usage:30d:*
    const keys = await redis.keys("mcp:usage:30d:*");

    if (keys.length === 0) {
      return [];
    }

    // Get scores for all companies using multi
    const companyIds = keys.map((key) => key.replace("mcp:usage:30d:", ""));
    
    // Fetch scores in parallel
    const scorePromises = companyIds.map((companyId) =>
      redis.zScore(`mcp:usage:30d:${companyId}`, companyId)
    );
    
    const scores = await Promise.all(scorePromises);

    // Build array of {companyId, calls}
    const companies = companyIds
      .map((companyId, index) => {
        const score = scores[index];
        if (!score) return null;
        return {
          companyId,
          calls: parseInt(score),
        };
      })
      .filter((c) => c !== null)
      .sort((a, b) => b.calls - a.calls)
      .slice(0, limit);

    return companies;
  } catch (err) {
    logger.error("[STATS] Error getting top companies (30d):", err.message);
    return [];
  }
}

/**
 * Get top companies by usage (all-time)
 * @param {number} [limit=20] - Maximum number of companies to retrieve
 * @returns {Promise<Array>} - Array of {companyId, calls} objects
 */
export async function getTopCompaniesAllTime(limit = 20) {
  if (!isStatsAvailable()) {
    return [];
  }

  const redis = getStatsRedis();
  if (!redis) {
    return [];
  }

  try {
    // Get all companies with all-time usage
    const keys = await redis.keys("mcp:usage:alltime:*");

    if (keys.length === 0) {
      return [];
    }

    // Get scores for all companies
    const companyIds = keys.map((key) => key.replace("mcp:usage:alltime:", ""));
    
    // Fetch scores in parallel
    const scorePromises = companyIds.map((companyId) =>
      redis.zScore(`mcp:usage:alltime:${companyId}`, companyId)
    );
    
    const scores = await Promise.all(scorePromises);

    // Build array of {companyId, calls}
    const companies = companyIds
      .map((companyId, index) => {
        const score = scores[index];
        if (!score) return null;
        return {
          companyId,
          calls: parseInt(score),
        };
      })
      .filter((c) => c !== null)
      .sort((a, b) => b.calls - a.calls)
      .slice(0, limit);

    return companies;
  } catch (err) {
    logger.error(
      "[STATS] Error getting top companies (all-time):",
      err.message
    );
    return [];
  }
}

