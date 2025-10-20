// Scorecard Tools
// Tools for managing scorecard measurables (KPIs) and their data values

import {
  callSuccessCoGraphQL,
  getLeadershipTeamId,
  getSuccessCoApiKey,
  getContextForApiKey,
  getDatabase,
  getIsDevMode,
} from "./core.js";
import {
  validateStateId,
  validateMeasurableValue,
  calculateStartDateForDataField,
} from "../helpers.js";

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

      // If teamId was provided but no dataFields found for that team, return empty result
      if (teamDataFieldIds.length === 0) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  scorecardMeasurables: [],
                  totalCount: 0,
                  message: `No data fields found for team ${teamId}`,
                },
                null,
                2
              ),
            },
          ],
        };
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

    // Get API key context to determine company ID
    const apiKey = getSuccessCoApiKey();
    if (!apiKey) {
      return {
        content: [
          {
            type: "text",
            text: "Error: No API key configured. Please set SUCCESS_CO_API_KEY in your .env file.",
          },
        ],
      };
    }

    const context = await getContextForApiKey(apiKey);
    if (!context) {
      // Get more details about why context lookup failed
      const db = getDatabase();
      let errorDetails = "Could not determine user context from API key.";

      if (!db) {
        errorDetails += " Database is not configured.";
      } else {
        errorDetails +=
          " API key may not exist in database or database query failed.";
        if (isDevMode) {
          errorDetails += ` (API key starts with: ${apiKey.substring(
            0,
            12
          )}...)`;
        }
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

    // Get API key context to determine company ID
    const apiKey = getSuccessCoApiKey();
    if (!apiKey) {
      return {
        content: [
          {
            type: "text",
            text: "Error: No API key configured. Please set SUCCESS_CO_API_KEY in your .env file.",
          },
        ],
      };
    }

    const context = await getContextForApiKey(apiKey);
    if (!context) {
      // Get more details about why context lookup failed
      const db = getDatabase();
      let errorDetails = "Could not determine user context from API key.";

      if (!db) {
        errorDetails += " Database is not configured.";
      } else {
        errorDetails +=
          " API key may not exist in database or database query failed.";
        if (isDevMode) {
          errorDetails += ` (API key starts with: ${apiKey.substring(
            0,
            12
          )}...)`;
        }
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
