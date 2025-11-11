// Scorecard Tools
// Tools for managing scorecard measurables (KPIs) and their data values

import {
  callSuccessCoGraphQL,
  getLeadershipTeamId,
  getUserContext,
  getDatabase,
  getIsDevMode,
} from "./core.js";
import {
  validateStateId,
  validateMeasurableValue,
  calculateStartDateForDataField,
} from "../utils/helpers.js";
import { logger } from "../utils/logger.js";

/**
 * Get scorecard measurables (KPIs) with their data values
 * @param {Object} args - Arguments object
 * @param {number} [args.first] - Number of records to return (default: 50)
 * @param {number} [args.offset] - Number of records to skip (default: 0)
 * @param {string} [args.stateId] - State filter (defaults to 'ACTIVE')
 * @param {string} [args.teamId] - Filter by team ID
 * @param {boolean} [args.leadershipTeam] - If true, automatically use the leadership team ID
 * @param {string} [args.userId] - Filter by user ID (measurable owner)
 * @param {string} [args.type] - Filter by type: 'weekly', 'monthly', 'quarterly', 'annually'
 * @param {string} [args.dataFieldId] - Filter by specific data field ID
 * @param {string} [args.keyword] - Search for measurables containing this keyword (case-insensitive)
 * @param {string} [args.startDate] - Start date for data values (ISO format)
 * @param {string} [args.endDate] - End date for data values (ISO format)
 * @param {number} [args.periods] - Number of periods to fetch (default: 13)
 * @param {string} [args.status] - Filter by status: 'ACTIVE', 'INACTIVE', or 'ALL' (default: 'ACTIVE')
 * @returns {Promise<{content: Array<{type: string, text: string}>}>}
 */
export async function getScorecardMeasurables(args) {
  const {
    first = 50,
    offset = 0,
    stateId = "ACTIVE",
    teamId: providedTeamId,
    leadershipTeam = false,
    userId,
    type = "weekly",
    dataFieldId,
    keyword,
    startDate,
    endDate,
    periods = 13,
    status = "ACTIVE",
  } = args;

  // Resolve teamId if leadershipTeam is true
  let teamId = providedTeamId;
  if (leadershipTeam && !providedTeamId) {
    teamId = await getLeadershipTeamId();
    if (!teamId) {
      return {
        content: [
          {
            type: "text",
            text: "Error: Could not find leadership team. Please ensure a team is marked as the leadership team.",
          },
        ],
      };
    }
  }

  if (!validateStateId(stateId)) {
    return {
      content: [
        {
          type: "text",
          text: "Error: Invalid stateId. Must be 'ACTIVE' or 'INACTIVE'",
        },
      ],
    };
  }

  try {
    const isDevMode = getIsDevMode();

    // If teamId is provided, first get the dataFieldIds for that team
    let teamDataFieldIds = null;
    if (teamId) {
      const teamsOnDataFieldsQuery = `
        query {
          teamsOnDataFields(filter: {teamId: {equalTo: "${teamId}"}, stateId: {equalTo: "${stateId}"}}) {
            nodes {
              dataFieldId
            }
          }
        }
      `;

      const teamsOnDataFieldsResult = await callSuccessCoGraphQL(
        teamsOnDataFieldsQuery
      );

      if (!teamsOnDataFieldsResult.ok) {
        logger.error(`[SCORECARD] Error fetching teams on data fields`, { 
          error: teamsOnDataFieldsResult.error 
        });
        return {
          content: [
            {
              type: "text",
              text: `Error fetching teams on data fields: ${teamsOnDataFieldsResult.error}`,
            },
          ],
        };
      }

      teamDataFieldIds =
        teamsOnDataFieldsResult.data?.data?.teamsOnDataFields?.nodes?.map(
          (rel) => rel.dataFieldId
        ) || [];

      // If teamId was provided but no dataFields found for that team, 
      // log a warning but continue with query (will return all data fields for the company)
      // This handles cases where data fields exist but aren't explicitly linked to teams
      if (teamDataFieldIds.length === 0) {
        logger.warn(
          `[SCORECARD] No data fields linked to team ${teamId}. Continuing without team filter.`
        );
        // Set teamDataFieldIds to null so the filter is not applied
        teamDataFieldIds = null;
      }
    }

    // Get data fields (KPIs) directly with GraphQL query
    const filterParts = [`stateId: {equalTo: "${stateId}"}`];

    // If status is provided and not "ALL", filter by dataFieldStatusId
    if (status && status !== "ALL") {
      filterParts.push(`dataFieldStatusId: {equalTo: "${status}"}`);
    }

    // If specific dataFieldId is provided, filter by it
    if (dataFieldId) {
      filterParts.push(`id: {equalTo: "${dataFieldId}"}`);
    }
    // If we have team-specific dataFieldIds, filter by them
    else if (teamDataFieldIds && teamDataFieldIds.length > 0) {
      const dataFieldIdFilters = teamDataFieldIds
        .map((id) => `"${id}"`)
        .join(", ");
      filterParts.push(`id: {in: [${dataFieldIdFilters}]}`);
    }

    // If userId is provided, filter by it at the GraphQL level
    if (userId) {
      filterParts.push(`userId: {equalTo: "${userId}"}`);
    }

    // If keyword is provided, filter by it at the GraphQL level
    if (keyword) {
      filterParts.push(`name: {includesInsensitive: "${keyword}"}`);
    }

    const filterStr = filterParts.join(", ");

    const dataFieldsQuery = `
      query {
        dataFields(${first !== undefined ? `first: ${first}` : ""}${
      offset !== undefined ? `, offset: ${offset}` : ""
    }${filterStr ? `, filter: {${filterStr}}` : ""}) {
          nodes {
            id
            name
            desc
            userId
            type
            unitType
            unitComparison
            goalTarget
            goalTargetEnd
            goalCurrency
            showAverage
            showTotal
            autoFormat
            autoRoundDecimals
            dataFieldStatusId
            statusUpdatedAt
            createdAt
            stateId
            formula
            order
          }
          totalCount
        }
      }
    `;

    const dataFieldsResult = await callSuccessCoGraphQL(dataFieldsQuery);

    if (!dataFieldsResult.ok) {
      return {
        content: [
          {
            type: "text",
            text: `Error fetching data fields: ${dataFieldsResult.error}`,
          },
        ],
      };
    }

    const dataFields = dataFieldsResult.data?.data?.dataFields?.nodes || [];

    // Apply additional filters if provided
    let filteredDataFields = dataFields;
    if (type) {
      // Map the type parameter to the corresponding data field type
      const typeMapping = {
        weekly: "WEEKLY",
        monthly: "MONTHLY",
        quarterly: "QUARTERLY",
        annually: "ANNUALLY",
      };
      const dataFieldType = typeMapping[type];
      
      if (dataFieldType) {
        filteredDataFields = filteredDataFields.filter(
          (field) => field.type === dataFieldType
        );
      }
    }

    // If no data fields found, return empty result
    if (filteredDataFields.length === 0) {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                scorecardMeasurables: [],
                totalCount: 0,
              },
              null,
              2
            ),
          },
        ],
      };
    }

    // Calculate date range for data values
    let calculatedStartDate = startDate;
    let calculatedEndDate = endDate;

    // Map type parameter to timeframe for the entire function
    const timeframeMapping = {
      weekly: "weeks",
      monthly: "months",
      quarterly: "quarters",
      annually: "years",
    };
    const timeframe = timeframeMapping[type] || "weeks";

    if (!startDate && !endDate) {
      const endDateObj = new Date();
      const startDateObj = new Date();

      switch (timeframe) {
        case "days":
          startDateObj.setDate(endDateObj.getDate() - periods * 7);
          break;
        case "weeks":
          startDateObj.setDate(endDateObj.getDate() - periods * 7);
          break;
        case "months":
          startDateObj.setMonth(endDateObj.getMonth() - periods);
          break;
        case "quarters":
          startDateObj.setMonth(endDateObj.getMonth() - periods * 3);
          break;
        case "years":
          startDateObj.setFullYear(endDateObj.getFullYear() - periods);
          break;
        default:
          startDateObj.setDate(endDateObj.getDate() - periods * 7);
      }

      calculatedStartDate = startDateObj.toISOString().split("T")[0];
      calculatedEndDate = endDateObj.toISOString().split("T")[0];
    }

    // Get data values for all data fields directly with GraphQL query
    const filters = [`stateId: {equalTo: "${stateId}"}`];

    // Build startDate filter with range if both dates provided
    if (calculatedStartDate || calculatedEndDate) {
      const startDateFilters = [];
      if (calculatedStartDate) {
        startDateFilters.push(`greaterThanOrEqualTo: "${calculatedStartDate}"`);
      }
      if (calculatedEndDate) {
        startDateFilters.push(`lessThanOrEqualTo: "${calculatedEndDate}"`);
      }
      filters.push(`startDate: {${startDateFilters.join(", ")}}`);
    }

    if (dataFieldId) {
      filters.push(`dataFieldId: {equalTo: "${dataFieldId}"}`);
    }

    const dataValuesFilterStr = filters.join(", ");

    const dataValuesQuery = `
      query {
        dataValues(first: 1000, offset: 0${
          dataValuesFilterStr ? `, filter: {${dataValuesFilterStr}}` : ""
        }) {
          nodes {
            id
            dataFieldId
            startDate
            value
            createdAt
            stateId
            customGoalTarget
            customGoalTargetEnd
            note
          }
          totalCount
        }
      }
    `;

    const dataValuesResult = await callSuccessCoGraphQL(dataValuesQuery);

    if (!dataValuesResult.ok) {
      logger.error(`[SCORECARD] Error fetching data values`, {
        error: dataValuesResult.error,
      });
      return {
        content: [
          {
            type: "text",
            text: `Error fetching data values: ${dataValuesResult.error}`,
          },
        ],
      };
    }

    const dataValues = dataValuesResult.data?.data?.dataValues?.nodes || [];

    // Group data values by data field ID
    const valuesByField = {};
    dataValues.forEach((value) => {
      if (!valuesByField[value.dataFieldId]) {
        valuesByField[value.dataFieldId] = [];
      }
      valuesByField[value.dataFieldId].push(value);
    });

    // Helper function to sort values by date (most recent first)
    function sortValuesByDate(values) {
      return values.sort(
        (a, b) => new Date(b.startDate) - new Date(a.startDate)
      );
    }

    // Create combined scorecard measurables
    const scorecardMeasurables = filteredDataFields.map((field) => {
      const fieldValues = valuesByField[field.id] || [];

      // Sort values by date (most recent first)
      const sortedValues = sortValuesByDate(fieldValues);

      // Rename dataFieldStatusId to status
      const { dataFieldStatusId, ...fieldWithoutStatusId } = field;

      // Calculate timeframe based on the field's actual type
      const fieldTypeMapping = {
        WEEKLY: "weeks",
        MONTHLY: "months",
        QUARTERLY: "quarters",
        ANNUALLY: "years",
      };
      const fieldTimeframe = fieldTypeMapping[field.type] || "weeks";

      return {
        ...fieldWithoutStatusId,
        status: dataFieldStatusId,
        values: sortedValues,
        timeframe: fieldTimeframe,
      };
    });

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              scorecardMeasurables,
            },
            null,
            2
          ),
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `Error fetching scorecard measurables: ${error.message}`,
        },
      ],
    };
  }
}

/**
 * Create a new scorecard measurable entry (data value)
 * @param {Object} args - Arguments object
 * @param {string} args.dataFieldId - Data field ID (KPI) (required)
 * @param {string|number} args.value - The value to record (required)
 * @param {string} [args.startDate] - Start date (ISO format). If not provided, will be calculated based on data field type
 * @param {string} [args.note] - Optional note for this entry
 * @param {boolean} [args.overwrite] - If true, overwrite existing entry for the same period (default: false)
 * @returns {Promise<{content: Array<{type: string, text: string}>}>}
 */
export async function createScorecardMeasurableEntry(args) {
  const { dataFieldId, value, startDate, note, overwrite } = args;

  const isDevMode = getIsDevMode();

  try {
    // Validate required parameters
    if (!dataFieldId) {
      return {
        content: [
          {
            type: "text",
            text: "Error: dataFieldId is required",
          },
        ],
      };
    }

    if (value === null || value === undefined || value === "") {
      return {
        content: [
          {
            type: "text",
            text: "Error: value is required",
          },
        ],
      };
    }

    // Get user context (works with OAuth or API key)
    const context = await getUserContext();
    if (!context) {
      // Get more details about why context lookup failed
      const db = getDatabase();
      let errorDetails =
        "Authentication required. No valid OAuth token or API key found.";

      if (!db) {
        errorDetails += " Database is not configured.";
      } else if (isDevMode) {
        errorDetails += " Context lookup failed.";
      }

      return {
        content: [
          {
            type: "text",
            text: `Error: ${errorDetails}`,
          },
        ],
      };
    }

    const { companyId } = context;

    // Get the data field to determine its type and unit_type
    const db = getDatabase();
    if (!db) {
      return {
        content: [
          {
            type: "text",
            text: "Error: Database connection is required for creating measurable entries",
          },
        ],
      };
    }

    const dataFieldResult = await db`
      SELECT id, type, unit_type, name, company_id
      FROM data_fields
      WHERE id = ${dataFieldId}
        AND company_id = ${companyId}
        AND state_id = 'ACTIVE'
      LIMIT 1
    `;

    if (dataFieldResult.length === 0) {
      return {
        content: [
          {
            type: "text",
            text: `Error: Data field not found with ID: ${dataFieldId}`,
          },
        ],
      };
    }

    const dataField = dataFieldResult[0];

    // Validate the value based on unit_type
    const validation = validateMeasurableValue(value, dataField.unit_type);
    if (!validation.isValid) {
      return {
        content: [
          {
            type: "text",
            text: `Error: ${validation.error}`,
          },
        ],
      };
    }

    // Calculate the appropriate start_date based on data field type
    let calculatedStartDate;
    try {
      calculatedStartDate = await calculateStartDateForDataField(
        dataField.type,
        startDate,
        companyId,
        db,
        isDevMode
      );
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error calculating start date: ${error.message}`,
          },
        ],
      };
    }

    // Validate that the start date is not in the future
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Set to start of day for comparison
    const startDateObj = new Date(calculatedStartDate);

    if (startDateObj > today) {
      return {
        content: [
          {
            type: "text",
            text: `Error: Cannot create measurable entry with a future date. Calculated start date: ${calculatedStartDate}. Today: ${
              today.toISOString().split("T")[0]
            }`,
          },
        ],
      };
    }

    if (isDevMode) {
      console.error(
        `[DEBUG] Creating measurable entry for data field: ${dataField.name} (${dataFieldId})`
      );
      console.error(
        `[DEBUG] Value: ${value}, Start date: ${calculatedStartDate}`
      );
      console.error(
        `[DEBUG] Data field type: ${dataField.type}, Unit type: ${dataField.unit_type}`
      );
    }

    // Check if an entry already exists for this data field and start date
    const existingEntry = await db`
      SELECT id, value, note
      FROM data_values
      WHERE data_field_id = ${dataFieldId}
        AND start_date = ${calculatedStartDate}
        AND state_id = 'ACTIVE'
      LIMIT 1
    `;

    if (existingEntry.length > 0) {
      // If overwrite is true, update the existing entry
      if (overwrite) {
        if (isDevMode) {
          console.error(
            `[DEBUG] Existing entry found, overwriting with new value (overwrite flag is true)`
          );
        }

        const updateResult = await db`
          UPDATE data_values
          SET ${db({ value: String(value), note: note || "" })}
          WHERE id = ${existingEntry[0].id}
            AND company_id = ${companyId}
            AND state_id = 'ACTIVE'
          RETURNING id, data_field_id, start_date, value, note, updated_at
        `;

        const updatedEntry = updateResult[0];

        if (isDevMode) {
          console.error(
            `[DEBUG] Updated existing measurable entry with ID: ${updatedEntry.id}`
          );
        }

        // Format the response for update
        const response = {
          success: true,
          message: `Successfully updated measurable entry for "${dataField.name}" (entry already existed for this period)`,
          entry: {
            id: updatedEntry.id,
            dataFieldId: updatedEntry.data_field_id,
            dataFieldName: dataField.name,
            dataFieldType: dataField.type,
            unitType: dataField.unit_type,
            startDate: updatedEntry.start_date,
            value: updatedEntry.value,
            note: updatedEntry.note || "",
            updatedAt: updatedEntry.updated_at,
          },
          wasUpdated: true,
          previousValue: existingEntry[0].value,
        };

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(response, null, 2),
            },
          ],
        };
      }

      // If overwrite is false, return error
      return {
        content: [
          {
            type: "text",
            text: `Error: A measurable entry already exists for data field "${dataField.name}" with start date ${calculatedStartDate}. Current value: ${existingEntry[0].value}. Use overwrite=true to update it, or use updateScorecardMeasurableEntry to modify existing values.`,
          },
        ],
      };
    }

    // Insert the new data value
    // Note: sync_id and updated_at are automatically set by the database trigger
    const insertResult = await db`
      INSERT INTO data_values (
        data_field_id,
        start_date,
        value,
        company_id,
        state_id,
        note
      ) VALUES (
        ${dataFieldId},
        ${calculatedStartDate},
        ${String(value)},
        ${companyId},
        'ACTIVE',
        ${note || ""}
      )
      RETURNING id, data_field_id, start_date, value, note, created_at
    `;

    const createdEntry = insertResult[0];

    if (isDevMode) {
      console.error(
        `[DEBUG] Created measurable entry with ID: ${createdEntry.id}`
      );
    }

    // Format the response
    const response = {
      success: true,
      message: `Successfully created measurable entry for "${dataField.name}"`,
      entry: {
        id: createdEntry.id,
        dataFieldId: createdEntry.data_field_id,
        dataFieldName: dataField.name,
        dataFieldType: dataField.type,
        unitType: dataField.unit_type,
        startDate: createdEntry.start_date,
        value: createdEntry.value,
        note: createdEntry.note || "",
        createdAt: createdEntry.created_at,
      },
      wasUpdated: false,
    };

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(response, null, 2),
        },
      ],
    };
  } catch (error) {
    console.error("Error creating measurable entry:", error);
    return {
      content: [
        {
          type: "text",
          text: `Error creating measurable entry: ${error.message}`,
        },
      ],
    };
  }
}

/**
 * Update an existing scorecard measurable entry (data value)
 * @param {Object} args - Arguments object
 * @param {string} args.entryId - The data value entry ID (required)
 * @param {string|number} [args.value] - The new value to record
 * @param {string} [args.note] - Update the note
 * @returns {Promise<{content: Array<{type: string, text: string}>}>}
 */
export async function updateScorecardMeasurableEntry(args) {
  const { entryId, value, note } = args;

  const isDevMode = getIsDevMode();

  try {
    // Validate required parameters
    if (!entryId) {
      return {
        content: [
          {
            type: "text",
            text: "Error: entryId is required",
          },
        ],
      };
    }

    // Get user context (works with OAuth or API key)
    const context = await getUserContext();
    if (!context) {
      // Get more details about why context lookup failed
      const db = getDatabase();
      let errorDetails =
        "Authentication required. No valid OAuth token or API key found.";

      if (!db) {
        errorDetails += " Database is not configured.";
      } else if (isDevMode) {
        errorDetails += " Context lookup failed.";
      }

      return {
        content: [
          {
            type: "text",
            text: `Error: ${errorDetails}`,
          },
        ],
      };
    }

    const { companyId } = context;

    // Get the database connection
    const db = getDatabase();
    if (!db) {
      return {
        content: [
          {
            type: "text",
            text: "Error: Database connection is required for updating measurable entries",
          },
        ],
      };
    }

    // Get the existing entry and its data field info
    const existingEntryResult = await db`
      SELECT dv.id, dv.data_field_id, dv.start_date, dv.value, dv.note, dv.company_id,
             df.name as data_field_name, df.type as data_field_type, df.unit_type
      FROM data_values dv
      INNER JOIN data_fields df ON df.id = dv.data_field_id
      WHERE dv.id = ${entryId}
        AND dv.company_id = ${companyId}
        AND dv.state_id = 'ACTIVE'
      LIMIT 1
    `;

    if (existingEntryResult.length === 0) {
      return {
        content: [
          {
            type: "text",
            text: `Error: Measurable entry not found with ID: ${entryId}`,
          },
        ],
      };
    }

    const existingEntry = existingEntryResult[0];

    if (isDevMode) {
      console.error(
        `[DEBUG] Updating measurable entry: ${existingEntry.data_field_name} (${existingEntry.data_field_id})`
      );
      console.error(
        `[DEBUG] Current value: ${existingEntry.value}, Current start date: ${existingEntry.start_date}`
      );
    }

    // Prepare update fields
    const updates = {};

    // Update value if provided
    if (value !== undefined && value !== null && value !== "") {
      // Validate the value based on unit_type
      const validation = validateMeasurableValue(
        value,
        existingEntry.unit_type
      );
      if (!validation.isValid) {
        return {
          content: [
            {
              type: "text",
              text: `Error: ${validation.error}`,
            },
          ],
        };
      }
      updates.value = String(value);
    }

    // Update note if provided (allow empty string to clear note)
    if (note !== undefined) {
      updates.note = note;
    }

    // Check if there are any updates to make
    if (Object.keys(updates).length === 0) {
      return {
        content: [
          {
            type: "text",
            text: "Error: No updates provided. Please provide at least one field to update (value or note).",
          },
        ],
      };
    }

    if (isDevMode) {
      console.error(`[DEBUG] Updates to apply:`, updates);
    }

    // Build the update query dynamically
    // Use raw SQL with postgres library for dynamic updates
    const updateResult = await db`
      UPDATE data_values
      SET ${db(updates)}
      WHERE id = ${entryId}
        AND company_id = ${companyId}
        AND state_id = 'ACTIVE'
      RETURNING id, data_field_id, start_date, value, note, updated_at
    `;

    if (updateResult.length === 0) {
      return {
        content: [
          {
            type: "text",
            text: `Error: Failed to update measurable entry with ID: ${entryId}`,
          },
        ],
      };
    }

    const updatedEntry = updateResult[0];

    if (isDevMode) {
      console.error(`[DEBUG] Updated measurable entry successfully`);
    }

    // Format the response
    const response = {
      success: true,
      message: `Successfully updated measurable entry for "${existingEntry.data_field_name}"`,
      entry: {
        id: updatedEntry.id,
        dataFieldId: updatedEntry.data_field_id,
        dataFieldName: existingEntry.data_field_name,
        dataFieldType: existingEntry.data_field_type,
        unitType: existingEntry.unit_type,
        startDate: updatedEntry.start_date,
        value: updatedEntry.value,
        note: updatedEntry.note || "",
        updatedAt: updatedEntry.updated_at,
      },
      changes: {
        value: updates.value
          ? { from: existingEntry.value, to: updates.value }
          : undefined,
        note:
          updates.note !== undefined
            ? { from: existingEntry.note || "", to: updates.note }
            : undefined,
      },
    };

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(response, null, 2),
        },
      ],
    };
  } catch (error) {
    console.error("Error updating measurable entry:", error);
    return {
      content: [
        {
          type: "text",
          text: `Error updating measurable entry: ${error.message}`,
        },
      ],
    };
  }
}

/**
 * Create a new scorecard measurable (data field)
 * @param {Object} args - Arguments object
 * @param {string} args.name - Measurable name (required)
 * @param {string} [args.desc] - Description
 * @param {string} [args.type] - Type: 'weekly', 'monthly', 'quarterly', 'annually' (default: 'weekly')
 * @param {string} [args.unitType] - Unit type: 'number', 'currency', 'percentage' (default: 'number')
 * @param {string} [args.unitComparison] - Comparison operator: '>=', '<=', '=', '>', '<' (default: '>=')
 * @param {string|number} [args.goalTarget] - Goal target value (default: 100)
 * @param {string|number} [args.goalTargetEnd] - Goal target end value (for ranges, default: 100)
 * @param {string} [args.goalCurrency] - Currency symbol (default: '$')
 * @param {boolean} [args.showAverage] - Show average in reports (default: true)
 * @param {boolean} [args.showTotal] - Show total in reports (default: true)
 * @param {boolean} [args.autoFormat] - Auto format values (default: false)
 * @param {boolean} [args.autoRoundDecimals] - Auto round decimals (default: false)
 * @param {string} [args.userId] - User ID (owner) (defaults to authenticated user)
 * @param {string} [args.teamId] - Team ID to associate with (comma-separated for multiple teams)
 * @param {boolean} [args.leadershipTeam] - If true, associate with leadership team
 * @returns {Promise<{content: Array<{type: string, text: string}>}>}
 */
export async function createScorecardMeasurable(args) {
  const {
    name,
    desc = "",
    type = "weekly",
    unitType = "number",
    unitComparison = ">=",
    goalTarget = "100",
    goalTargetEnd = "100",
    goalCurrency = "$",
    showAverage = true,
    showTotal = true,
    autoFormat = false,
    autoRoundDecimals = false,
    userId: providedUserId,
    teamId: providedTeamId,
    leadershipTeam = false,
  } = args;

  const isDevMode = getIsDevMode();

  try {
    // Validate required parameters
    if (!name || name.trim() === "") {
      return {
        content: [
          {
            type: "text",
            text: "Error: name is required",
          },
        ],
      };
    }

    // Get user context
    const context = await getUserContext();
    if (!context) {
      return {
        content: [
          {
            type: "text",
            text: "Error: Authentication required. No valid OAuth token or API key found.",
          },
        ],
      };
    }

    const { companyId, userId: contextUserId } = context;
    const userId = providedUserId || contextUserId;

    // Get database connection
    const db = getDatabase();
    if (!db) {
      return {
        content: [
          {
            type: "text",
            text: "Error: Database connection is required for creating measurables",
          },
        ],
      };
    }

    // Validate type
    const typeMapping = {
      weekly: "WEEKLY",
      monthly: "MONTHLY",
      quarterly: "QUARTERLY",
      annually: "ANNUALLY",
    };
    const dataFieldType = typeMapping[type.toLowerCase()];
    if (!dataFieldType) {
      return {
        content: [
          {
            type: "text",
            text: `Error: Invalid type. Must be one of: weekly, monthly, quarterly, annually`,
          },
        ],
      };
    }

    // Validate unitType
    const validUnitTypes = ["number", "currency", "percentage"];
    if (!validUnitTypes.includes(unitType)) {
      return {
        content: [
          {
            type: "text",
            text: `Error: Invalid unitType. Must be one of: ${validUnitTypes.join(", ")}`,
          },
        ],
      };
    }

    // Validate unitComparison
    const validComparisons = [">=", "<=", "=", ">", "<"];
    if (!validComparisons.includes(unitComparison)) {
      return {
        content: [
          {
            type: "text",
            text: `Error: Invalid unitComparison. Must be one of: ${validComparisons.join(", ")}`,
          },
        ],
      };
    }

    // Resolve teamId if leadershipTeam is true
    let teamId = providedTeamId;
    if (leadershipTeam && !providedTeamId) {
      teamId = await getLeadershipTeamId();
      if (!teamId) {
        return {
          content: [
            {
              type: "text",
              text: "Error: Could not find leadership team. Please ensure a team is marked as the leadership team.",
            },
          ],
        };
      }
    }

    if (isDevMode) {
      console.error(`[DEBUG] Creating scorecard measurable: ${name}`);
      console.error(`[DEBUG] Type: ${dataFieldType}, Unit: ${unitType}`);
    }

    // Insert the new data field
    const insertResult = await db`
      INSERT INTO data_fields (
        name,
        "desc",
        type,
        unit_type,
        unit_comparison,
        goal_target,
        goal_target_end,
        goal_currency,
        show_average,
        show_total,
        auto_format,
        auto_round_decimals,
        user_id,
        company_id,
        state_id,
        data_field_status_id
      ) VALUES (
        ${name},
        ${desc},
        ${dataFieldType},
        ${unitType},
        ${unitComparison},
        ${String(goalTarget)},
        ${String(goalTargetEnd)},
        ${goalCurrency},
        ${showAverage},
        ${showTotal},
        ${autoFormat},
        ${autoRoundDecimals},
        ${userId},
        ${companyId},
        'ACTIVE',
        'ACTIVE'
      )
      RETURNING id, name, "desc", type, unit_type, unit_comparison, goal_target, 
                goal_target_end, goal_currency, show_average, show_total, 
                auto_format, auto_round_decimals, user_id, created_at
    `;

    const createdMeasurable = insertResult[0];

    if (isDevMode) {
      console.error(
        `[DEBUG] Created measurable with ID: ${createdMeasurable.id}`
      );
    }

    // Associate with team(s) if provided
    const teamIds = teamId ? teamId.split(",").map((id) => id.trim()) : [];
    const teamAssociations = [];

    for (const tid of teamIds) {
      if (tid) {
        try {
          await db`
            INSERT INTO teams_on_data_fields (
              team_id,
              data_field_id,
              company_id,
              state_id
            ) VALUES (
              ${tid},
              ${createdMeasurable.id},
              ${companyId},
              'ACTIVE'
            )
          `;
          teamAssociations.push(tid);

          if (isDevMode) {
            console.error(
              `[DEBUG] Associated measurable with team: ${tid}`
            );
          }
        } catch (error) {
          console.error(`Error associating with team ${tid}:`, error.message);
        }
      }
    }

    // Format the response
    const response = {
      success: true,
      message: `Successfully created scorecard measurable "${name}"`,
      measurable: {
        id: createdMeasurable.id,
        name: createdMeasurable.name,
        desc: createdMeasurable.desc,
        type: createdMeasurable.type,
        unitType: createdMeasurable.unit_type,
        unitComparison: createdMeasurable.unit_comparison,
        goalTarget: createdMeasurable.goal_target,
        goalTargetEnd: createdMeasurable.goal_target_end,
        goalCurrency: createdMeasurable.goal_currency,
        showAverage: createdMeasurable.show_average,
        showTotal: createdMeasurable.show_total,
        autoFormat: createdMeasurable.auto_format,
        autoRoundDecimals: createdMeasurable.auto_round_decimals,
        userId: createdMeasurable.user_id,
        createdAt: createdMeasurable.created_at,
        teamIds: teamAssociations,
      },
    };

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(response, null, 2),
        },
      ],
    };
  } catch (error) {
    console.error("Error creating scorecard measurable:", error);
    return {
      content: [
        {
          type: "text",
          text: `Error creating scorecard measurable: ${error.message}`,
        },
      ],
    };
  }
}

/**
 * Update an existing scorecard measurable (data field)
 * @param {Object} args - Arguments object
 * @param {string} args.measurableId - Data field ID (required)
 * @param {string} [args.name] - Measurable name
 * @param {string} [args.desc] - Description
 * @param {string} [args.type] - Type: 'weekly', 'monthly', 'quarterly', 'annually'
 * @param {string} [args.unitType] - Unit type: 'number', 'currency', 'percentage'
 * @param {string} [args.unitComparison] - Comparison operator: '>=', '<=', '=', '>', '<'
 * @param {string|number} [args.goalTarget] - Goal target value
 * @param {string|number} [args.goalTargetEnd] - Goal target end value (for ranges)
 * @param {string} [args.goalCurrency] - Currency symbol
 * @param {boolean} [args.showAverage] - Show average in reports
 * @param {boolean} [args.showTotal] - Show total in reports
 * @param {boolean} [args.autoFormat] - Auto format values
 * @param {boolean} [args.autoRoundDecimals] - Auto round decimals
 * @param {string} [args.status] - Status: 'ACTIVE' or 'ARCHIVED'
 * @returns {Promise<{content: Array<{type: string, text: string}>}>}
 */
export async function updateScorecardMeasurable(args) {
  const {
    measurableId,
    name,
    desc,
    type,
    unitType,
    unitComparison,
    goalTarget,
    goalTargetEnd,
    goalCurrency,
    showAverage,
    showTotal,
    autoFormat,
    autoRoundDecimals,
    status,
  } = args;

  const isDevMode = getIsDevMode();

  try {
    // Validate required parameters
    if (!measurableId) {
      return {
        content: [
          {
            type: "text",
            text: "Error: measurableId is required",
          },
        ],
      };
    }

    // Get user context
    const context = await getUserContext();
    if (!context) {
      return {
        content: [
          {
            type: "text",
            text: "Error: Authentication required. No valid OAuth token or API key found.",
          },
        ],
      };
    }

    const { companyId } = context;

    // Get database connection
    const db = getDatabase();
    if (!db) {
      return {
        content: [
          {
            type: "text",
            text: "Error: Database connection is required for updating measurables",
          },
        ],
      };
    }

    // Get the existing measurable
    const existingResult = await db`
      SELECT id, name, "desc", type, unit_type, unit_comparison, goal_target,
             goal_target_end, goal_currency, show_average, show_total,
             auto_format, auto_round_decimals, data_field_status_id
      FROM data_fields
      WHERE id = ${measurableId}
        AND company_id = ${companyId}
        AND state_id = 'ACTIVE'
      LIMIT 1
    `;

    if (existingResult.length === 0) {
      return {
        content: [
          {
            type: "text",
            text: `Error: Scorecard measurable not found with ID: ${measurableId}`,
          },
        ],
      };
    }

    const existing = existingResult[0];

    if (isDevMode) {
      console.error(`[DEBUG] Updating scorecard measurable: ${existing.name}`);
    }

    // Prepare update fields
    const updates = {};

    if (name !== undefined) updates.name = name;
    if (desc !== undefined) updates.desc = desc;
    
    if (type !== undefined) {
      const typeMapping = {
        weekly: "WEEKLY",
        monthly: "MONTHLY",
        quarterly: "QUARTERLY",
        annually: "ANNUALLY",
      };
      const dataFieldType = typeMapping[type.toLowerCase()];
      if (!dataFieldType) {
        return {
          content: [
            {
              type: "text",
              text: `Error: Invalid type. Must be one of: weekly, monthly, quarterly, annually`,
            },
          ],
        };
      }
      updates.type = dataFieldType;
    }

    if (unitType !== undefined) {
      const validUnitTypes = ["number", "currency", "percentage"];
      if (!validUnitTypes.includes(unitType)) {
        return {
          content: [
            {
              type: "text",
              text: `Error: Invalid unitType. Must be one of: ${validUnitTypes.join(", ")}`,
            },
          ],
        };
      }
      updates.unit_type = unitType;
    }

    if (unitComparison !== undefined) {
      const validComparisons = [">=", "<=", "=", ">", "<"];
      if (!validComparisons.includes(unitComparison)) {
        return {
          content: [
            {
              type: "text",
              text: `Error: Invalid unitComparison. Must be one of: ${validComparisons.join(", ")}`,
            },
          ],
        };
      }
      updates.unit_comparison = unitComparison;
    }

    if (goalTarget !== undefined) updates.goal_target = String(goalTarget);
    if (goalTargetEnd !== undefined) updates.goal_target_end = String(goalTargetEnd);
    if (goalCurrency !== undefined) updates.goal_currency = goalCurrency;
    if (showAverage !== undefined) updates.show_average = showAverage;
    if (showTotal !== undefined) updates.show_total = showTotal;
    if (autoFormat !== undefined) updates.auto_format = autoFormat;
    if (autoRoundDecimals !== undefined) updates.auto_round_decimals = autoRoundDecimals;
    
    if (status !== undefined) {
      const validStatuses = ["ACTIVE", "ARCHIVED"];
      if (!validStatuses.includes(status)) {
        return {
          content: [
            {
              type: "text",
              text: `Error: Invalid status. Must be one of: ${validStatuses.join(", ")}`,
            },
          ],
        };
      }
      updates.data_field_status_id = status;
      updates.status_updated_at = new Date();
    }

    // Check if there are any updates to make
    if (Object.keys(updates).length === 0) {
      return {
        content: [
          {
            type: "text",
            text: "Error: No updates provided. Please provide at least one field to update.",
          },
        ],
      };
    }

    if (isDevMode) {
      console.error(`[DEBUG] Updates to apply:`, updates);
    }

    // Update the measurable
    const updateResult = await db`
      UPDATE data_fields
      SET ${db(updates)}
      WHERE id = ${measurableId}
        AND company_id = ${companyId}
        AND state_id = 'ACTIVE'
      RETURNING id, name, "desc", type, unit_type, unit_comparison, goal_target,
                goal_target_end, goal_currency, show_average, show_total,
                auto_format, auto_round_decimals, data_field_status_id, updated_at
    `;

    if (updateResult.length === 0) {
      return {
        content: [
          {
            type: "text",
            text: `Error: Failed to update scorecard measurable with ID: ${measurableId}`,
          },
        ],
      };
    }

    const updated = updateResult[0];

    if (isDevMode) {
      console.error(`[DEBUG] Updated scorecard measurable successfully`);
    }

    // Format the response
    const response = {
      success: true,
      message: `Successfully updated scorecard measurable "${updated.name}"`,
      measurable: {
        id: updated.id,
        name: updated.name,
        desc: updated.desc,
        type: updated.type,
        unitType: updated.unit_type,
        unitComparison: updated.unit_comparison,
        goalTarget: updated.goal_target,
        goalTargetEnd: updated.goal_target_end,
        goalCurrency: updated.goal_currency,
        showAverage: updated.show_average,
        showTotal: updated.show_total,
        autoFormat: updated.auto_format,
        autoRoundDecimals: updated.auto_round_decimals,
        status: updated.data_field_status_id,
        updatedAt: updated.updated_at,
      },
      changes: Object.keys(updates).reduce((acc, key) => {
        const displayKey = key === "data_field_status_id" ? "status" : key;
        acc[displayKey] = {
          from: existing[key],
          to: updates[key],
        };
        return acc;
      }, {}),
    };

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(response, null, 2),
        },
      ],
    };
  } catch (error) {
    console.error("Error updating scorecard measurable:", error);
    return {
      content: [
        {
          type: "text",
          text: `Error updating scorecard measurable: ${error.message}`,
        },
      ],
    };
  }
}

/**
 * Delete (soft delete) a scorecard measurable (data field)
 * @param {Object} args - Arguments object
 * @param {string} args.measurableId - Data field ID (required)
 * @returns {Promise<{content: Array<{type: string, text: string}>}>}
 */
export async function deleteScorecardMeasurable(args) {
  const { measurableId } = args;

  const isDevMode = getIsDevMode();

  try {
    // Validate required parameters
    if (!measurableId) {
      return {
        content: [
          {
            type: "text",
            text: "Error: measurableId is required",
          },
        ],
      };
    }

    // Get user context
    const context = await getUserContext();
    if (!context) {
      return {
        content: [
          {
            type: "text",
            text: "Error: Authentication required. No valid OAuth token or API key found.",
          },
        ],
      };
    }

    const { companyId } = context;

    // Get database connection
    const db = getDatabase();
    if (!db) {
      return {
        content: [
          {
            type: "text",
            text: "Error: Database connection is required for deleting measurables",
          },
        ],
      };
    }

    // Get the existing measurable to verify it exists and get its name
    const existingResult = await db`
      SELECT id, name
      FROM data_fields
      WHERE id = ${measurableId}
        AND company_id = ${companyId}
        AND state_id = 'ACTIVE'
      LIMIT 1
    `;

    if (existingResult.length === 0) {
      return {
        content: [
          {
            type: "text",
            text: `Error: Scorecard measurable not found with ID: ${measurableId}`,
          },
        ],
      };
    }

    const existing = existingResult[0];

    if (isDevMode) {
      console.error(`[DEBUG] Deleting scorecard measurable: ${existing.name}`);
    }

    // Soft delete the measurable
    const deleteResult = await db`
      UPDATE data_fields
      SET state_id = 'DELETED'
      WHERE id = ${measurableId}
        AND company_id = ${companyId}
        AND state_id = 'ACTIVE'
      RETURNING id, name
    `;

    if (deleteResult.length === 0) {
      return {
        content: [
          {
            type: "text",
            text: `Error: Failed to delete scorecard measurable with ID: ${measurableId}`,
          },
        ],
      };
    }

    // Also soft delete associated data values
    await db`
      UPDATE data_values
      SET state_id = 'DELETED'
      WHERE data_field_id = ${measurableId}
        AND company_id = ${companyId}
        AND state_id = 'ACTIVE'
    `;

    // Also soft delete team associations
    await db`
      UPDATE teams_on_data_fields
      SET state_id = 'DELETED'
      WHERE data_field_id = ${measurableId}
        AND company_id = ${companyId}
        AND state_id = 'ACTIVE'
    `;

    if (isDevMode) {
      console.error(`[DEBUG] Deleted scorecard measurable and its associations`);
    }

    // Format the response
    const response = {
      success: true,
      message: `Successfully deleted scorecard measurable "${existing.name}" and all associated data`,
      measurableId: measurableId,
      measurableName: existing.name,
    };

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(response, null, 2),
        },
      ],
    };
  } catch (error) {
    console.error("Error deleting scorecard measurable:", error);
    return {
      content: [
        {
          type: "text",
          text: `Error deleting scorecard measurable: ${error.message}`,
        },
      ],
    };
  }
}
