/**
 * Helper functions for Success.co MCP Server
 */

/**
 * Validates stateId parameter
 * @param {string} stateId - The state ID to validate
 * @param {string[]} [allowedStates] - Array of allowed state values (defaults to ["ACTIVE", "DELETED"])
 * @returns {Object} - Validation result with isValid boolean and error message if invalid
 */
export function validateStateId(
  stateId,
  allowedStates = ["ACTIVE", "DELETED"]
) {
  if (!allowedStates.includes(stateId)) {
    return {
      isValid: false,
      error: `stateId must be one of: ${allowedStates.join(", ")}`,
    };
  }
  return { isValid: true };
}
