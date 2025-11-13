import { logger } from "../utils/logger.js";
import { getStatsRedis, isStatsAvailable } from "../utils/redisClient.js";

/**
 * Debug endpoint to check Redis client tracking data
 * GET /debug/clients
 */
export async function debugClientsHandler(req, res) {
  try {
    if (!isStatsAvailable()) {
      return res.json({
        error: "Redis stats not available",
        isStatsAvailable: false,
      });
    }

    const redis = getStatsRedis();
    if (!redis) {
      return res.json({
        error: "Redis client not available",
        isStatsAvailable: true,
        redisClient: null,
      });
    }

    // Get all client data
    const clients30dRaw = await redis.zRangeWithScores(
      "mcp:clients:30d",
      0,
      -1,
      { REV: true }
    );
    const clientsAllTimeRaw = await redis.zRangeWithScores(
      "mcp:clients:alltime",
      0,
      -1,
      { REV: true }
    );

    const clients30d = clients30dRaw.map((item) => ({
      client: item.value,
      connections: parseInt(item.score),
    }));

    const clientsAllTime = clientsAllTimeRaw.map((item) => ({
      client: item.value,
      connections: parseInt(item.score),
    }));

    // Get recent connections
    const connectionsRaw = await redis.lRange("mcp:connections:recent", 0, 19);
    const recentConnections = connectionsRaw.map((conn) => JSON.parse(conn));

    // Get recent calls with client info
    const callsRaw = await redis.lRange("mcp:calls:recent", 0, 9);
    const recentCalls = callsRaw.map((call) => JSON.parse(call));

    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      data: {
        clients30d,
        clientsAllTime,
        recentConnections,
        recentCallsWithClient: recentCalls.map((call) => ({
          toolName: call.toolName,
          client: call.client || "MISSING",
          timestamp: call.timestamp,
        })),
      },
      redisKeys: {
        "mcp:clients:30d": clients30dRaw.length > 0 ? "EXISTS" : "EMPTY",
        "mcp:clients:alltime":
          clientsAllTimeRaw.length > 0 ? "EXISTS" : "EMPTY",
        "mcp:connections:recent":
          connectionsRaw.length > 0 ? "EXISTS" : "EMPTY",
      },
    });
  } catch (error) {
    logger.error("[DEBUG] Error fetching client debug data:", error.message);
    res.status(500).json({
      error: "Internal server error",
      message: error.message,
      stack: error.stack,
    });
  }
}

