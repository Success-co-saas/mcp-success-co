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

/**
 * Get the Monday of the week containing the given date
 * @param {Date} date - The date to get Monday for
 * @returns {string} - Date in YYYY-MM-DD format
 */
export function getMondayOfWeek(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
  const monday = new Date(d.setDate(diff));

  const year = monday.getFullYear();
  const month = String(monday.getMonth() + 1).padStart(2, "0");
  const dayOfMonth = String(monday.getDate()).padStart(2, "0");
  return `${year}-${month}-${dayOfMonth}`;
}

/**
 * Get the first day of the month containing the given date
 * @param {Date} date - The date to get first day of month for
 * @returns {string} - Date in YYYY-MM-DD format
 */
export function getFirstDayOfMonth(date) {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}-01`;
}

/**
 * Get the first day of the year containing the given date
 * @param {Date} date - The date to get first day of year for
 * @returns {string} - Date in YYYY-MM-DD format
 */
export function getFirstDayOfYear(date) {
  const d = new Date(date);
  const year = d.getFullYear();
  return `${year}-01-01`;
}

/**
 * Get the quarter start date for a given date based on company quarter dates
 * @param {Date} date - The date to find quarter start for
 * @param {Array} quarterDates - Array of 4 Date objects representing quarter start dates
 * @returns {string} - Date in YYYY-MM-DD format
 */
export function getQuarterStartDate(date, quarterDates) {
  const d = new Date(date);
  const currentYear = d.getFullYear();

  // Convert quarter dates to current year
  const quartersThisYear = quarterDates.map((qDate) => {
    const qd = new Date(qDate);
    return new Date(currentYear, qd.getMonth(), qd.getDate());
  });

  // Find the most recent quarter start date that is <= the given date
  let quarterStartDate = null;
  for (let i = quartersThisYear.length - 1; i >= 0; i--) {
    if (quartersThisYear[i] <= d) {
      quarterStartDate = quartersThisYear[i];
      break;
    }
  }

  // If no quarter found (date is before Q1), use Q4 of previous year
  if (!quarterStartDate) {
    const q4Date = new Date(quarterDates[3]);
    quarterStartDate = new Date(
      currentYear - 1,
      q4Date.getMonth(),
      q4Date.getDate()
    );
  }

  const year = quarterStartDate.getFullYear();
  const month = String(quarterStartDate.getMonth() + 1).padStart(2, "0");
  const dayOfMonth = String(quarterStartDate.getDate()).padStart(2, "0");
  return `${year}-${month}-${dayOfMonth}`;
}

/**
 * Calculate the appropriate start_date for a data field based on its type
 * @param {string} dataFieldType - The type of data field (WEEKLY, MONTHLY, QUARTERLY, ANNUALLY)
 * @param {string|null} providedStartDate - Optional start date provided by user (YYYY-MM-DD)
 * @param {string} companyId - The company ID
 * @param {Object} db - Database connection object
 * @param {boolean} isDevMode - Whether debug mode is enabled
 * @returns {Promise<string>} - Calculated start date in YYYY-MM-DD format
 */
export async function calculateStartDateForDataField(
  dataFieldType,
  providedStartDate,
  companyId,
  db,
  isDevMode
) {
  // If start date is provided, validate and align it
  const dateToAlign = providedStartDate
    ? new Date(providedStartDate)
    : new Date();

  if (isDevMode) {
    console.error(
      `[DEBUG] Calculating start date for type: ${dataFieldType}, provided: ${providedStartDate}`
    );
  }

  switch (dataFieldType) {
    case "WEEKLY":
      // Must be a Monday
      return getMondayOfWeek(dateToAlign);

    case "MONTHLY":
      // Must be the first day of the month
      return getFirstDayOfMonth(dateToAlign);

    case "QUARTERLY":
      // Must align with company quarter dates
      if (!db) {
        throw new Error(
          "Database connection required for quarterly data fields"
        );
      }

      // Fetch company quarter dates
      const result = await db`
        SELECT quarter_one_date, quarter_two_date, quarter_three_date, quarter_four_date
        FROM companies
        WHERE id = ${companyId}
        LIMIT 1
      `;

      if (result.length === 0) {
        throw new Error(`Company not found: ${companyId}`);
      }

      const company = result[0];
      const quarterDates = [
        company.quarter_one_date,
        company.quarter_two_date,
        company.quarter_three_date,
        company.quarter_four_date,
      ];

      // Validate that all quarter dates exist
      if (quarterDates.some((d) => !d)) {
        throw new Error(
          "Company has missing quarter dates. All four quarters must be configured."
        );
      }

      return getQuarterStartDate(dateToAlign, quarterDates);

    case "ANNUALLY":
      // Must be the first day of the year
      return getFirstDayOfYear(dateToAlign);

    default:
      throw new Error(`Unknown data field type: ${dataFieldType}`);
  }
}

/**
 * Validate a measurable value based on unit type
 * @param {string} value - The value to validate
 * @param {string} unitType - The unit type (number, currency, percentage, etc.)
 * @returns {Object} - Validation result with isValid boolean and error message if invalid
 */
export function validateMeasurableValue(value, unitType) {
  if (value === null || value === undefined || value === "") {
    return {
      isValid: false,
      error: "Value is required and cannot be empty",
    };
  }

  const valueStr = String(value).trim();

  // For most unit types, we expect a numeric value
  // Common unit types: number, currency, percentage, dollar, euro, etc.
  if (
    unitType === "number" ||
    unitType === "currency" ||
    unitType === "percentage" ||
    unitType === "dollar" ||
    unitType === "euro" ||
    unitType === "pound"
  ) {
    // Check if it's a valid number (can include decimals, negative numbers)
    const numericValue = valueStr.replace(/[,$%€£]/g, ""); // Remove common currency/percentage symbols
    if (isNaN(parseFloat(numericValue))) {
      return {
        isValid: false,
        error: `Value must be numeric for unit type '${unitType}'. Got: '${value}'`,
      };
    }
  }

  // Additional validation could be added for other unit types here
  // For now, we'll accept any non-empty value for other unit types

  return { isValid: true };
}
