import { logger } from "../logger.js";

/**
 * Session manager for MCP transports
 */
class SessionManager {
  constructor() {
    this.sessions = {
      streamable: {},
      sse: {},
    };
  }

  /**
   * Add a session
   */
  add(type, sessionId, transport) {
    if (!["streamable", "sse"].includes(type)) {
      throw new Error(`Invalid session type: ${type}`);
    }

    this.sessions[type][sessionId] = transport;
    logger.info(`[SESSION] Added ${type} session: ${sessionId}`);

    // Set up cleanup on transport close
    if (transport.onclose) {
      const originalOnClose = transport.onclose;
      transport.onclose = () => {
        this.remove(type, sessionId);
        if (originalOnClose) originalOnClose();
      };
    } else {
      transport.onclose = () => this.remove(type, sessionId);
    }
  }

  /**
   * Get a session
   */
  get(type, sessionId) {
    return this.sessions[type]?.[sessionId];
  }

  /**
   * Remove a session
   */
  remove(type, sessionId) {
    if (this.sessions[type]?.[sessionId]) {
      delete this.sessions[type][sessionId];
      logger.info(`[SESSION] Removed ${type} session: ${sessionId}`);
    }
  }

  /**
   * Get session count
   */
  count(type) {
    return Object.keys(this.sessions[type] || {}).length;
  }

  /**
   * Get all session counts
   */
  getCounts() {
    return {
      streamable: this.count("streamable"),
      sse: this.count("sse"),
      total: this.count("streamable") + this.count("sse"),
    };
  }

  /**
   * Clean up all sessions
   */
  cleanup() {
    logger.info("[SESSION] Cleaning up all sessions");
    const counts = this.getCounts();

    Object.keys(this.sessions.streamable).forEach((sessionId) => {
      this.remove("streamable", sessionId);
    });

    Object.keys(this.sessions.sse).forEach((sessionId) => {
      this.remove("sse", sessionId);
    });

    logger.info(`[SESSION] Cleaned up ${counts.total} sessions`);
  }
}

export const sessionManager = new SessionManager();
export default sessionManager;
