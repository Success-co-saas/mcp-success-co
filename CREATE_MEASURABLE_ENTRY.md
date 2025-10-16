# Scorecard Measurable Entry Tools

## Overview

These tools manage data values (measurable entries) for scorecard metrics in Success.co:

- **`createScorecardMeasurableEntry`** - Creates new entries with automatic period alignment
- **`updateScorecardMeasurableEntry`** - Updates existing entries with validation and conflict detection

## Implementation Details

### Files Modified

1. **helpers.js** - Added helper functions:

   - `getMondayOfWeek(date)` - Gets Monday for any given date
   - `getFirstDayOfMonth(date)` - Gets first day of month
   - `getFirstDayOfYear(date)` - Gets first day of year
   - `getQuarterStartDate(date, quarterDates)` - Gets quarter start based on company quarter configuration
   - `calculateStartDateForDataField(dataFieldType, providedStartDate, companyId, db, isDevMode)` - Main logic for calculating aligned start dates
   - `validateMeasurableValue(value, unitType)` - Validates values based on unit type

2. **tools.js** - Added main functions:

   - `createScorecardMeasurableEntry(args)` - Creates new data_values records with proper validation and date alignment
   - `updateScorecardMeasurableEntry(args)` - Updates existing data_values records with validation and conflict detection

3. **mcp-server.js** - Added tool definitions:
   - Registered `createScorecardMeasurableEntry` tool with MCP server
   - Registered `updateScorecardMeasurableEntry` tool with MCP server
   - Added schemas and handlers for both tools

### Start Date Alignment Logic

The tool automatically aligns start dates based on the data field type:

- **WEEKLY**: Always aligns to Monday of the week

  - Example: If you provide 2024-10-15 (Tuesday), it becomes 2024-10-14 (Monday)

- **MONTHLY**: Always aligns to the 1st day of the month

  - Example: If you provide 2024-10-15, it becomes 2024-10-01

- **QUARTERLY**: Aligns to the company's quarter start dates

  - Looks up `quarter_one_date`, `quarter_two_date`, `quarter_three_date`, `quarter_four_date` from the `companies` table
  - Finds the most recent quarter start date that is <= the provided date
  - Example: If company quarters start Jan 1, Apr 1, Jul 1, Oct 1, and you provide 2024-10-15, it becomes 2024-10-01

- **ANNUALLY**: Always aligns to January 1st of the year
  - Example: If you provide 2024-10-15, it becomes 2024-01-01

### Value Validation

Light validation is performed based on the `unit_type` field:

- For numeric types (`number`, `currency`, `percentage`, `dollar`, `euro`, `pound`):
  - Validates that the value is a valid number (after removing currency symbols)
  - Allows decimals and negative numbers
- For other unit types:
  - Accepts any non-empty value

### Duplicate Detection

The tool checks if an entry already exists for the same data field and start date. If a duplicate is found, it returns an error message suggesting the use of `updateMeasurableEntry` instead.

## Usage

### createScorecardMeasurableEntry

#### Parameters

- **dataFieldId** (required): The UUID of the data field (measurable) to create an entry for
- **value** (required): The value to record (string, can be numeric)
- **startDate** (optional): The start date in YYYY-MM-DD format. If not provided, defaults to the current period.
- **note** (optional): A note to attach to the entry

#### Example 1: Create entry for current period

```javascript
await createScorecardMeasurableEntry({
  dataFieldId: "550e8400-e29b-41d4-a716-446655440000",
  value: "250",
});
```

This will automatically use:

- This Monday for weekly metrics
- 1st of this month for monthly metrics
- Current quarter start for quarterly metrics
- January 1st of this year for annual metrics

#### Example 2: Create entry with specific date

```javascript
await createScorecardMeasurableEntry({
  dataFieldId: "550e8400-e29b-41d4-a716-446655440000",
  value: "250",
  startDate: "2024-10-15",
  note: "Revenue spike due to major client onboarding",
});
```

The startDate will be automatically aligned based on the metric's frequency type.

#### Example 3: Create entry with currency value

```javascript
await createScorecardMeasurableEntry({
  dataFieldId: "550e8400-e29b-41d4-a716-446655440000",
  value: "$1,250.50",
  note: "Q4 revenue",
});
```

Currency symbols and commas are stripped during validation for numeric types.

### updateScorecardMeasurableEntry

#### Parameters

- **entryId** (required): The UUID of the data_values entry to update
- **value** (optional): The new value to record (string, can be numeric)
- **startDate** (optional): The new start date in YYYY-MM-DD format. Will be aligned based on the metric's frequency type.
- **note** (optional): The new note (can be empty string to clear)

At least one of `value`, `startDate`, or `note` must be provided.

#### Example 1: Update value only

```javascript
await updateScorecardMeasurableEntry({
  entryId: "750e8400-e29b-41d4-a716-446655440000",
  value: "300",
});
```

#### Example 2: Update note only

```javascript
await updateScorecardMeasurableEntry({
  entryId: "750e8400-e29b-41d4-a716-446655440000",
  note: "Corrected value after audit",
});
```

#### Example 3: Update both value and note

```javascript
await updateScorecardMeasurableEntry({
  entryId: "750e8400-e29b-41d4-a716-446655440000",
  value: "350",
  note: "Final corrected value",
});
```

#### Example 4: Move entry to different period

```javascript
await updateScorecardMeasurableEntry({
  entryId: "750e8400-e29b-41d4-a716-446655440000",
  startDate: "2024-10-21", // Will be aligned to Monday 2024-10-21 for weekly metrics
});
```

**Note:** When changing `startDate`, the system checks for conflicts with existing entries for the same metric.

## Response Format

### createScorecardMeasurableEntry Success Response

```json
{
  "success": true,
  "message": "Successfully created measurable entry for \"Revenue\"",
  "entry": {
    "id": "750e8400-e29b-41d4-a716-446655440000",
    "dataFieldId": "550e8400-e29b-41d4-a716-446655440000",
    "dataFieldName": "Revenue",
    "dataFieldType": "WEEKLY",
    "unitType": "currency",
    "startDate": "2024-10-14",
    "value": "250",
    "note": "",
    "createdAt": "2024-10-15T10:30:00.000Z"
  }
}
```

### updateScorecardMeasurableEntry Success Response

```json
{
  "success": true,
  "message": "Successfully updated measurable entry for \"Revenue\"",
  "entry": {
    "id": "750e8400-e29b-41d4-a716-446655440000",
    "dataFieldId": "550e8400-e29b-41d4-a716-446655440000",
    "dataFieldName": "Revenue",
    "dataFieldType": "WEEKLY",
    "unitType": "currency",
    "startDate": "2024-10-14",
    "value": "300",
    "note": "Corrected value",
    "updatedAt": "2024-10-15T11:30:00.000Z"
  },
  "changes": {
    "value": { "from": "250", "to": "300" },
    "note": { "from": "", "to": "Corrected value" }
  }
}
```

### Error Responses

#### Duplicate Entry Error (Create)

```json
{
  "error": "A measurable entry already exists for data field \"Revenue\" with start date 2024-10-14. Current value: 250. Use updateScorecardMeasurableEntry to modify existing values."
}
```

#### Conflict Error (Update)

```json
{
  "error": "Another measurable entry already exists for data field \"Revenue\" with start date 2024-10-21. Conflicting entry ID: 850e8400-e29b-41d4-a716-446655440000, value: 400"
}
```

#### Not Found Error (Update)

```json
{
  "error": "Measurable entry not found with ID: 00000000-0000-0000-0000-000000000000"
}
```

## Database Schema

The tool creates records in the `data_values` table:

```sql
CREATE TABLE "public"."data_values" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "data_field_id" uuid NOT NULL,
  "start_date" date NOT NULL,
  "value" varchar(255) NOT NULL,
  "company_id" uuid NOT NULL,
  "state_id" varchar(50) NOT NULL DEFAULT 'ACTIVE',
  "sync_id" int4 NOT NULL,
  "note" text DEFAULT '',
  "created_at" timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamptz(6) NOT NULL
);
```

**Note:** The `sync_id` and `updated_at` fields are automatically managed by the database trigger `update_lastsyncid_dateupdate_data_values` and should not be manually set during INSERT operations.

## Testing

A test script is provided at `test-create-measurable-entry.js`. To run it:

1. Ensure your `.env` file has a valid `SUCCESS_CO_API_KEY`
2. Run: `node test-create-measurable-entry.js`

The test script will:

1. Fetch available scorecard measurables
2. Create an entry for the current period (and capture the entry ID)
3. Create an entry with a specific date
4. Test updating the created entry:
   - Update value only
   - Update note only
   - Update both value and note
5. Test duplicate detection (create)
6. Test validation with invalid values
7. Test update with no fields provided (should error)
8. Test update with invalid entry ID

## Key Features

### createScorecardMeasurableEntry

✅ **Automatic date alignment** - Start dates are automatically adjusted to align with the metric's frequency

✅ **Smart defaults** - If no start date is provided, it defaults to the current period

✅ **Validation** - Light validation based on unit_type ensures numeric values are valid for numeric metrics

✅ **Duplicate prevention** - Checks if an entry already exists for the same period

✅ **Quarterly support** - Properly handles company-specific quarter dates from the database

### updateScorecardMeasurableEntry

✅ **Flexible updates** - Update value, startDate, note, or any combination

✅ **Conflict detection** - Prevents moving entries to periods that already have entries

✅ **Validation** - Same validation as create for values

✅ **Change tracking** - Response includes what changed (from → to)

✅ **Automatic date alignment** - Start dates are aligned when updated just like in create

## Notes

- Both tools require database access (they query `data_fields` and `companies` tables, and insert/update `data_values`)
- The API key must be set before using these tools
- The tools use the company ID from the API key context to ensure data isolation
- All date calculations respect the company's quarter configuration
- The `sync_id` and `updated_at` fields are automatically managed by database triggers
