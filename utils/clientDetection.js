import { logger } from "./logger.js";

/**
 * Parse User-Agent string to identify AI assistant/client
 * @param {string} userAgent - The User-Agent header value
 * @returns {Object} - {client, version, raw}
 */
export function parseAIClient(userAgent) {
  if (!userAgent) {
    return {
      client: "Unknown",
      version: null,
      raw: null,
    };
  }

  const ua = userAgent.toLowerCase();

  // Claude / Anthropic
  if (ua.includes("claude") || ua.includes("anthropic")) {
    const versionMatch = userAgent.match(/claude[/\s]?([\d.]+)/i);
    return {
      client: "Claude",
      version: versionMatch ? versionMatch[1] : null,
      raw: userAgent,
    };
  }

  // ChatGPT Desktop / OpenAI
  if (ua.includes("chatgpt") || ua.includes("openai")) {
    const versionMatch = userAgent.match(/chatgpt[/\s]?([\d.]+)/i);
    return {
      client: "ChatGPT",
      version: versionMatch ? versionMatch[1] : null,
      raw: userAgent,
    };
  }

  // Continue.dev
  if (ua.includes("continue")) {
    const versionMatch = userAgent.match(/continue[/\s]?([\d.]+)/i);
    return {
      client: "Continue.dev",
      version: versionMatch ? versionMatch[1] : null,
      raw: userAgent,
    };
  }

  // Cursor Editor
  if (ua.includes("cursor")) {
    const versionMatch = userAgent.match(/cursor[/\s]?([\d.]+)/i);
    return {
      client: "Cursor",
      version: versionMatch ? versionMatch[1] : null,
      raw: userAgent,
    };
  }

  // Cline (formerly Claude Dev)
  if (ua.includes("cline")) {
    const versionMatch = userAgent.match(/cline[/\s]?([\d.]+)/i);
    return {
      client: "Cline",
      version: versionMatch ? versionMatch[1] : null,
      raw: userAgent,
    };
  }

  // Zed Editor
  if (ua.includes("zed")) {
    const versionMatch = userAgent.match(/zed[/\s]?([\d.]+)/i);
    return {
      client: "Zed",
      version: versionMatch ? versionMatch[1] : null,
      raw: userAgent,
    };
  }

  // Windsurf
  if (ua.includes("windsurf")) {
    const versionMatch = userAgent.match(/windsurf[/\s]?([\d.]+)/i);
    return {
      client: "Windsurf",
      version: versionMatch ? versionMatch[1] : null,
      raw: userAgent,
    };
  }

  // Generic MCP client
  if (ua.includes("mcp")) {
    const versionMatch = userAgent.match(/mcp[/\s]?([\d.]+)/i);
    return {
      client: "MCP Client",
      version: versionMatch ? versionMatch[1] : null,
      raw: userAgent,
    };
  }

  // Python-based clients
  if (ua.includes("python")) {
    return {
      client: "Python Client",
      version: null,
      raw: userAgent,
    };
  }

  // Node.js-based clients
  if (ua.includes("node")) {
    return {
      client: "Node.js Client",
      version: null,
      raw: userAgent,
    };
  }

  // Default to Unknown with raw UA for debugging
  logger.debug(`[CLIENT-DETECT] Unknown User-Agent: ${userAgent}`);
  return {
    client: "Other",
    version: null,
    raw: userAgent,
  };
}

/**
 * Track AI client connection in Redis
 * @param {Object} redis - Redis client
 * @param {string} clientName - Name of the AI client
 * @param {string} userId - User ID
 * @param {string} companyId - Company ID
 */
export async function trackClientConnection(
  redis,
  clientName,
  userId,
  companyId
) {
  if (!redis || !clientName) {
    return;
  }

  try {
    const multi = redis.multi();

    // Track overall client usage (30-day and all-time)
    multi.zIncrBy("mcp:clients:30d", 1, clientName);
    multi.expire("mcp:clients:30d", 35 * 24 * 60 * 60); // 35 days TTL

    multi.zIncrBy("mcp:clients:alltime", 1, clientName);

    // Track client connection timestamp for recent connections view
    if (userId && companyId) {
      const connectionData = JSON.stringify({
        userId,
        companyId,
        client: clientName,
        timestamp: new Date().toISOString(),
      });
      multi.lPush("mcp:connections:recent", connectionData);
      multi.lTrim("mcp:connections:recent", 0, 99); // Keep last 100 connections
    }

    await multi.exec();
  } catch (err) {
    logger.error(
      "[CLIENT-DETECT] Error tracking client connection:",
      err.message
    );
  }
}
