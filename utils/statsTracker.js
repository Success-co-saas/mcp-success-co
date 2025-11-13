import { getStatsRedis, isStatsAvailable } from "./redisClient.js";
import { STATS_CONFIG } from "../config.js";
import { logger } from "./logger.js";

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
 * @param {string} [callData.client] - AI client/assistant name
 */
export async function trackToolCall({
  toolName,
  userId,
  companyId,
  parameters,
  duration,
  success,
  error = null,
  client = null,
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
      client,
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

    // 3. Track tool popularity (30-day and all-time)
    if (toolName) {
      // 30-day tool stats
      multi.zIncrBy("mcp:tools:30d", 1, toolName);
      multi.expire("mcp:tools:30d", 35 * 24 * 60 * 60); // 35 days TTL

      // All-time tool stats
      multi.zIncrBy("mcp:tools:alltime", 1, toolName);
    }

    // 4. Track AI client usage (30-day and all-time)
    if (client) {
      // 30-day client stats
      multi.zIncrBy("mcp:clients:30d", 1, client);
      multi.expire("mcp:clients:30d", 35 * 24 * 60 * 60); // 35 days TTL

      // All-time client stats
      multi.zIncrBy("mcp:clients:alltime", 1, client);
    }

    // Execute the multi command
    await multi.exec();

    logger.debug("[STATS] Tracked tool call:", {
      toolName,
      companyId,
      client: client || "none",
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

/**
 * Get top tools by usage (30-day period)
 * @param {number} [limit=20] - Maximum number of tools to retrieve
 * @returns {Promise<Array>} - Array of {toolName, calls} objects
 */
export async function getTopTools30d(limit = 20) {
  if (!isStatsAvailable()) {
    return [];
  }

  const redis = getStatsRedis();
  if (!redis) {
    return [];
  }

  try {
    // Get top tools from sorted set (highest scores first)
    const results = await redis.zRangeWithScores(
      "mcp:tools:30d",
      0,
      limit - 1,
      { REV: true }
    );

    return results.map((item) => ({
      toolName: item.value,
      calls: parseInt(item.score),
    }));
  } catch (err) {
    logger.error("[STATS] Error getting top tools (30d):", err.message);
    return [];
  }
}

/**
 * Get top tools by usage (all-time)
 * @param {number} [limit=20] - Maximum number of tools to retrieve
 * @returns {Promise<Array>} - Array of {toolName, calls} objects
 */
export async function getTopToolsAllTime(limit = 20) {
  if (!isStatsAvailable()) {
    return [];
  }

  const redis = getStatsRedis();
  if (!redis) {
    return [];
  }

  try {
    // Get top tools from sorted set (highest scores first)
    const results = await redis.zRangeWithScores(
      "mcp:tools:alltime",
      0,
      limit - 1,
      { REV: true }
    );

    return results.map((item) => ({
      toolName: item.value,
      calls: parseInt(item.score),
    }));
  } catch (err) {
    logger.error("[STATS] Error getting top tools (all-time):", err.message);
    return [];
  }
}

/**
 * Get top AI clients by usage (30-day period)
 * @param {number} [limit=20] - Maximum number of clients to retrieve
 * @returns {Promise<Array>} - Array of {client, connections} objects
 */
export async function getTopClients30d(limit = 20) {
  if (!isStatsAvailable()) {
    return [];
  }

  const redis = getStatsRedis();
  if (!redis) {
    return [];
  }

  try {
    // Get top clients from sorted set (highest scores first)
    const results = await redis.zRangeWithScores(
      "mcp:clients:30d",
      0,
      limit - 1,
      { REV: true }
    );

    return results.map((item) => ({
      client: item.value,
      connections: parseInt(item.score),
    }));
  } catch (err) {
    logger.error("[STATS] Error getting top clients (30d):", err.message);
    return [];
  }
}

/**
 * Get top AI clients by usage (all-time)
 * @param {number} [limit=20] - Maximum number of clients to retrieve
 * @returns {Promise<Array>} - Array of {client, connections} objects
 */
export async function getTopClientsAllTime(limit = 20) {
  if (!isStatsAvailable()) {
    return [];
  }

  const redis = getStatsRedis();
  if (!redis) {
    return [];
  }

  try {
    // Get top clients from sorted set (highest scores first)
    const results = await redis.zRangeWithScores(
      "mcp:clients:alltime",
      0,
      limit - 1,
      { REV: true }
    );

    return results.map((item) => ({
      client: item.value,
      connections: parseInt(item.score),
    }));
  } catch (err) {
    logger.error("[STATS] Error getting top clients (all-time):", err.message);
    return [];
  }
}

/**
 * Get recent client connections
 * @param {number} [limit=100] - Maximum number of connections to retrieve
 * @returns {Promise<Array>} - Array of connection objects
 */
export async function getRecentConnections(limit = 100) {
  if (!isStatsAvailable()) {
    return [];
  }

  const redis = getStatsRedis();
  if (!redis) {
    return [];
  }

  try {
    const connections = await redis.lRange("mcp:connections:recent", 0, limit - 1);
    return connections.map((conn) => JSON.parse(conn));
  } catch (err) {
    logger.error("[STATS] Error getting recent connections:", err.message);
    return [];
  }
}

