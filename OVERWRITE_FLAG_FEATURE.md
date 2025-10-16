# Overwrite Flag Feature for createScorecardMeasurableEntry

## Overview

Added an `overwrite` flag to `createScorecardMeasurableEntry` that enables natural language "set" commands like:

**"Set Bugs reported by customers to 15"**

This allows the LLM to handle setting measurable values without needing to:

1. Check if an entry exists for the current period
2. Decide whether to call create or update
3. Handle duplicate entry errors

## Implementation

### New Parameter: `overwrite` (boolean, optional)

- **Default**: `false` (maintains backward compatibility)
- **When `true`**: If an entry already exists for the same period, it will update it instead of returning an error
- **When `false`**: Returns an error if a duplicate exists (original behavior)

### Behavior

#### Without `overwrite` (default, backward compatible):

```javascript
await createScorecardMeasurableEntry({
  dataFieldId: "xxx",
  value: "15",
});
// ❌ Error if entry exists for current period
```

#### With `overwrite=true`:

```javascript
await createScorecardMeasurableEntry({
  dataFieldId: "xxx",
  value: "15",
  overwrite: true,
});
// ✅ Creates if doesn't exist
// ✅ Updates if exists
```

## Natural Language Usage

### Example Commands

**User says:** "Set Bugs reported by customers to 15"

**LLM workflow:**

1. Use `getScorecardMeasurables` with keyword search for "Bugs reported by customers"
2. Call `createScorecardMeasurableEntry` with `overwrite: true`
3. Done! No need to check if entry exists first

**Other examples:**

- "Set Revenue to 5000"
- "Set Customer Satisfaction to 9.2"
- "Set Active Users to 1250"

## Response Format

### When Creating (new entry):

```json
{
  "success": true,
  "message": "Successfully created measurable entry for \"Bugs Reported\"",
  "entry": {
    "id": "...",
    "dataFieldId": "...",
    "dataFieldName": "Bugs Reported",
    "dataFieldType": "WEEKLY",
    "unitType": "number",
    "startDate": "2024-10-14",
    "value": "15",
    "note": "",
    "createdAt": "2024-10-16T00:00:00.000Z"
  },
  "wasUpdated": false
}
```

### When Updating (existing entry):

```json
{
  "success": true,
  "message": "Successfully updated measurable entry for \"Bugs Reported\" (entry already existed for this period)",
  "entry": {
    "id": "...",
    "dataFieldId": "...",
    "dataFieldName": "Bugs Reported",
    "dataFieldType": "WEEKLY",
    "unitType": "number",
    "startDate": "2024-10-14",
    "value": "15",
    "note": "",
    "updatedAt": "2024-10-16T00:05:00.000Z"
  },
  "wasUpdated": true,
  "previousValue": "12"
}
```

Note: The response includes `wasUpdated` boolean and `previousValue` when updating.

## Technical Details

### Implementation in tools.js

```javascript
// Check if entry exists
const existingEntry = await db`
  SELECT id, value, note
  FROM data_values
  WHERE data_field_id = ${dataFieldId}
    AND start_date = ${calculatedStartDate}
    AND state_id = 'ACTIVE'
  LIMIT 1
`;

if (existingEntry.length > 0) {
  if (overwrite) {
    // UPDATE existing entry
    const updateResult = await db`
      UPDATE data_values
      SET ${db({ value: String(value), note: note || "" })}
      WHERE id = ${existingEntry[0].id}
      RETURNING ...
    `;
    return updatedResponse;
  }

  // Return error (original behavior)
  return duplicateError;
}

// INSERT new entry (no existing entry found)
```

### Error Message Update

When `overwrite=false` and duplicate exists:

```
Error: A measurable entry already exists for data field "Bugs Reported" with start date 2024-10-14. Current value: 12. Use overwrite=true to update it, or use updateScorecardMeasurableEntry to modify existing values.
```

## Benefits

### For End Users

- ✅ **Natural commands**: "Set X to Y" just works
- ✅ **No error handling**: Don't worry about duplicates
- ✅ **Idempotent**: Running the same command twice is safe

### For LLMs

- ✅ **Simpler workflow**: One tool call instead of 2-3
- ✅ **Less context needed**: No need to remember previous state
- ✅ **Better UX**: More reliable, less error-prone

### For Developers

- ✅ **Backward compatible**: Existing code unchanged (default is `false`)
- ✅ **Clear intent**: `overwrite=true` explicitly states the intention
- ✅ **Good logging**: Debug logs show when overwriting

## Use Cases

### 1. Daily/Weekly Data Entry

```
"Set this week's customer calls to 47"
"Set today's revenue to 12500"
```

### 2. Correcting Values

```
"Actually, set bugs to 18" (after previously setting it to 15)
```

### 3. Batch Updates

```
"Set all Q4 metrics: Revenue to 50000, Customers to 250, Satisfaction to 8.5"
```

## Testing

To test the feature:

```javascript
// Test 1: Create new entry with overwrite=true
await createScorecardMeasurableEntry({
  dataFieldId: "xxx",
  value: "15",
  overwrite: true,
});
// Should create successfully

// Test 2: "Set" same value again
await createScorecardMeasurableEntry({
  dataFieldId: "xxx",
  value: "20",
  overwrite: true,
});
// Should update to 20, wasUpdated=true, previousValue="15"

// Test 3: Without overwrite flag (backward compatibility)
await createScorecardMeasurableEntry({
  dataFieldId: "xxx",
  value: "25",
});
// Should error (duplicate exists)
```

## Comparison with updateScorecardMeasurableEntry

| Feature                      | createScorecardMeasurableEntry (overwrite=true) | updateScorecardMeasurableEntry     |
| ---------------------------- | ----------------------------------------------- | ---------------------------------- |
| Requires entry ID            | ❌ No (uses dataFieldId + period)               | ✅ Yes (requires specific entryId) |
| Creates if missing           | ✅ Yes                                          | ❌ No                              |
| Updates if exists            | ✅ Yes                                          | ✅ Yes                             |
| Natural for "Set X"          | ✅ Yes                                          | ❌ No                              |
| Requires finding entry first | ❌ No                                           | ✅ Yes                             |

**Recommendation**: Use `createScorecardMeasurableEntry` with `overwrite=true` for natural language "set" commands. Use `updateScorecardMeasurableEntry` when you have a specific entry ID and want to modify it.

## Files Modified

1. **tools.js**

   - Added `overwrite` parameter to function
   - Added conditional UPDATE logic when entry exists and overwrite=true
   - Added `wasUpdated` and `previousValue` to response
   - Updated error message to mention overwrite option

2. **mcp-server.js**
   - Added `overwrite` to handler parameters
   - Added `overwrite` to schema with description
   - Updated tool description to emphasize natural language usage
   - Updated description to mention "Set X to Y" pattern

## Future Enhancements

Potential improvements:

1. **Bulk overwrite**: Accept array of {dataFieldId, value} pairs
2. **Conditional overwrite**: Only overwrite if new value is different
3. **Audit trail**: Log all overwrites for compliance
4. **Smart search**: Find dataFieldId by name automatically (requires fuzzy matching)

## Summary

✅ Added `overwrite` flag to `createScorecardMeasurableEntry`

✅ Enables natural "Set X to Y" commands

✅ Backward compatible (defaults to false)

✅ Clear response indicates create vs update

✅ Better error messages

✅ Ready for production use
