/**
 * Helper functions for Success.co MCP Server
 */

import fs from "fs";

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

/**
 * Map priority string values to numeric values for GraphQL
 * @param {string} priority - Priority level: 'High', 'Medium', 'Low', or 'No priority'
 * @returns {number} - Numeric priority value
 */
export function mapPriorityToNumber(priority) {
  if (!priority) return 2; // Default to Medium (2)

  const priorityMap = {
    "No priority": 999,
    Low: 3,
    Medium: 2,
    High: 1,
  };

  return priorityMap[priority] ?? 2; // Default to Medium if invalid value
}

/**
 * Map priority numeric values to string values from GraphQL
 * @param {number} priorityNo - Numeric priority value
 * @returns {string} - Priority level: 'High', 'Medium', 'Low', or 'No priority'
 */
export function mapPriorityToText(priorityNo) {
  const priorityMap = {
    1: "High",
    2: "Medium",
    3: "Low",
    999: "No priority",
  };

  return priorityMap[priorityNo] ?? "Medium"; // Default to Medium if invalid value
}

/**
 * Map issue type to lowercase for GraphQL
 * @param {string} type - Issue type: 'Short-term' or 'Long-term'
 * @returns {string} - Lowercase type value
 */
export function mapIssueTypeToLowercase(type) {
  if (!type) return "short-term"; // Default to short-term

  const typeMap = {
    "Short-term": "short-term",
    "Long-term": "long-term",
  };

  return typeMap[type] ?? "short-term"; // Default to short-term if invalid value
}

/**
 * Map rock type to lowercase for GraphQL
 * @param {string} type - Rock type: 'Personal' or 'Company'
 * @returns {string} - Lowercase type value
 */
export function mapRockTypeToLowercase(type) {
  if (!type) return "company"; // Default to company

  const typeMap = {
    Personal: "personal",
    Company: "company",
  };

  return typeMap[type] ?? "company"; // Default to company if invalid value
}

/**
 * Clear the GraphQL debug log file if it exists
 * @param {string} debugLogFile - Path to the debug log file
 * @param {boolean} devMode - Whether we're in development mode
 */
export function clearDebugLog(debugLogFile, devMode) {
  if (!devMode) return;

  try {
    if (fs.existsSync(debugLogFile)) {
      fs.writeFileSync(debugLogFile, "", "utf8");
      console.error(`[DEBUG] Cleared GraphQL debug log: ${debugLogFile}`);
    }
  } catch (error) {
    console.error(`[DEBUG] Failed to clear debug log: ${error.message}`);
  }
}

/**
 * Get the last date of the current quarter for a company
 * @param {string} companyId - The company ID
 * @param {Object} db - Database connection object
 * @param {boolean} isDevMode - Whether debug mode is enabled
 * @returns {Promise<string|null>} - Date in YYYY-MM-DD format or null
 */
export async function getLastDateOfCurrentQuarter(companyId, db, isDevMode) {
  if (!db) {
    if (isDevMode) {
      console.error(
        "[DEBUG] Database not configured - cannot lookup quarter dates"
      );
    }
    return null;
  }

  try {
    if (isDevMode) {
      console.error(
        `[DEBUG] Looking up quarter dates for company: ${companyId}`
      );
    }

    // Query the companies table to get quarter start dates
    const result = await db`
      SELECT quarter_one_date, quarter_two_date, quarter_three_date, quarter_four_date
      FROM companies
      WHERE id = ${companyId}
      LIMIT 1
    `;

    if (result.length === 0) {
      if (isDevMode) {
        console.error("[DEBUG] Company not found");
      }
      return null;
    }

    const company = result[0];
    const today = new Date();
    const currentYear = today.getFullYear();

    // Parse quarter dates - they might be stored as Date objects or strings
    const quarterDatesRaw = [
      company.quarter_one_date,
      company.quarter_two_date,
      company.quarter_three_date,
      company.quarter_four_date,
    ];

    if (isDevMode) {
      console.error(`[DEBUG] Quarter dates from DB (raw):`, quarterDatesRaw);
      console.error(
        `[DEBUG] Quarter date types:`,
        quarterDatesRaw.map((d) => typeof d)
      );
    }

    // Validate that all quarter dates exist
    if (quarterDatesRaw.some((d) => !d)) {
      console.error(
        "[ERROR] Company has missing quarter dates. All four quarters must be configured."
      );
      return null;
    }

    // Convert to MM-DD string format if needed
    const quarterDates = quarterDatesRaw.map((dateValue) => {
      if (dateValue instanceof Date) {
        // It's a Date object - extract MM-DD
        const month = String(dateValue.getMonth() + 1).padStart(2, "0");
        const day = String(dateValue.getDate()).padStart(2, "0");
        return `${month}-${day}`;
      } else if (typeof dateValue === "string") {
        // It's already a string - validate format
        if (dateValue.match(/^\d{2}-\d{2}$/)) {
          return dateValue;
        } else if (dateValue.match(/^\d{4}-\d{2}-\d{2}/)) {
          // YYYY-MM-DD format - extract MM-DD
          const parts = dateValue.split("-");
          return `${parts[1]}-${parts[2].substring(0, 2)}`;
        } else {
          throw new Error(`Invalid date format: ${dateValue}`);
        }
      } else {
        throw new Error(`Unexpected date type: ${typeof dateValue}`);
      }
    });

    if (isDevMode) {
      console.error(`[DEBUG] Quarter dates normalized to MM-DD:`, quarterDates);
    }

    // Convert quarter start dates to Date objects for the current year
    const quarterStartDates = quarterDates.map((dateStr) => {
      // Parse MM-DD format
      const [month, day] = dateStr.split("-").map(Number);
      return new Date(currentYear, month - 1, day);
    });

    // Find the next quarter start date
    let nextQuarterStartDate = null;
    let nextQuarterIndex = -1;
    for (let i = 0; i < quarterStartDates.length; i++) {
      if (quarterStartDates[i] > today) {
        nextQuarterStartDate = quarterStartDates[i];
        nextQuarterIndex = i;
        break;
      }
    }

    // If no future quarter found in current year, use Q1 of next year
    if (!nextQuarterStartDate) {
      const [month, day] = quarterDates[0].split("-").map(Number);
      nextQuarterStartDate = new Date(currentYear + 1, month - 1, day);
      nextQuarterIndex = 0;
    }

    if (isDevMode) {
      console.error(
        `[DEBUG] Next quarter start date: ${nextQuarterStartDate.toISOString()}`
      );
    }

    // Subtract one day to get the last day of the current quarter
    const lastDayOfCurrentQuarter = new Date(nextQuarterStartDate);
    lastDayOfCurrentQuarter.setDate(lastDayOfCurrentQuarter.getDate() - 1);

    // Format as YYYY-MM-DD
    const year = lastDayOfCurrentQuarter.getFullYear();
    const month = String(lastDayOfCurrentQuarter.getMonth() + 1).padStart(
      2,
      "0"
    );
    const day = String(lastDayOfCurrentQuarter.getDate()).padStart(2, "0");
    const formattedDate = `${year}-${month}-${day}`;

    if (isDevMode) {
      console.error(
        `[DEBUG] Calculated last day of current quarter: ${formattedDate}`
      );
    }

    return formattedDate;
  } catch (error) {
    console.error(`[ERROR] Failed to lookup quarter dates: ${error.message}`);
    return null;
  }
}
