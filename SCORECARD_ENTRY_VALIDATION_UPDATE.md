# Scorecard Entry Validation Updates

## Summary of Changes

Based on user feedback, two important changes were made to the scorecard measurable entry tools:

1. **Removed `startDate` parameter from `updateScorecardMeasurableEntry`** - Entries cannot be moved to different periods
2. **Added future date validation to `createScorecardMeasurableEntry`** - Cannot create entries with dates in the future

## Detailed Changes

### 1. Removed startDate from Update Tool

**Rationale:** Once a measurable entry is created for a specific period, it should not be movable to a different period. This maintains data integrity and prevents confusion about when metrics were actually recorded.

**Changes Made:**

- **tools.js**:

  - Removed `startDate` parameter from function signature
  - Removed all startDate calculation and validation logic (40+ lines)
  - Removed startDate conflict checking
  - Removed startDate from changes tracking in response
  - Updated error message to only mention "value or note"

- **mcp-server.js**:

  - Removed `startDate` from handler parameters
  - Removed `startDate` from schema definition
  - Updated tool description to clarify entries cannot be moved

- **test-create-measurable-entry.js**:

  - Removed no startDate update tests (tests remain for value and note updates)

- **CREATE_MEASURABLE_ENTRY.md**:
  - Updated parameters section to note startDate is fixed
  - Removed "move to different period" example
  - Removed conflict error example
  - Updated key features to note "Period locked"

### 2. Added Future Date Validation to Create Tool

**Rationale:** Scorecard entries should represent historical or current data, not future predictions. Preventing future dates ensures data accuracy and prevents accidental errors.

**Changes Made:**

- **tools.js**:
  - Added validation after `calculatedStartDate` is computed
  - Compares calculated date against current date (start of day)
  - Returns clear error message with both dates if future date detected

```javascript
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
```

- **test-create-measurable-entry.js**:

  - Added test for future date validation
  - Creates date 7 days in future and verifies error

- **CREATE_MEASURABLE_ENTRY.md**:
  - Updated parameters to note "Cannot be a future date"
  - Added future date error example
  - Updated test script documentation
  - Added to key features: "Future date prevention"

## Impact Analysis

### Breaking Changes

- **updateScorecardMeasurableEntry** no longer accepts `startDate` parameter
- Existing code attempting to update startDate will need to be modified

### Non-Breaking Changes

- **createScorecardMeasurableEntry** now validates against future dates
- This is a validation addition, not a parameter change
- Existing code will work unless it was trying to create future entries (which should be an error anyway)

## Error Messages

### New Error - Future Date (Create)

```
Error: Cannot create measurable entry with a future date. Calculated start date: 2024-10-21. Today: 2024-10-15
```

### Updated Error - No Updates (Update)

```
Error: No updates provided. Please provide at least one field to update (value or note).
```

(Previously mentioned "value, startDate, or note")

## Testing

All tests pass with the following coverage:

### createScorecardMeasurableEntry

- ✅ Create with current period (default)
- ✅ Create with specific past date
- ✅ Future date validation (new test)
- ✅ Duplicate detection
- ✅ Value validation
- ✅ Database integration

### updateScorecardMeasurableEntry

- ✅ Update value only
- ✅ Update note only
- ✅ Update both value and note
- ✅ No fields provided error
- ✅ Invalid entry ID error
- ✅ Database integration

## Files Modified

1. **tools.js** - Function implementations
2. **mcp-server.js** - Tool definitions and schemas
3. **test-create-measurable-entry.js** - Test coverage
4. **CREATE_MEASURABLE_ENTRY.md** - Documentation
5. **SCORECARD_ENTRY_VALIDATION_UPDATE.md** - This summary (new file)

## Migration Guide

### For Code Using updateScorecardMeasurableEntry

**Before:**

```javascript
await updateScorecardMeasurableEntry({
  entryId: "xxx",
  startDate: "2024-10-21", // ❌ No longer supported
  value: "100",
});
```

**After:**

```javascript
// Simply don't include startDate - it's fixed
await updateScorecardMeasurableEntry({
  entryId: "xxx",
  value: "100",
});
```

### For Code Using createScorecardMeasurableEntry

No changes required unless you were creating future entries (which is now blocked):

**Before (if you had future dates):**

```javascript
await createScorecardMeasurableEntry({
  dataFieldId: "xxx",
  value: "100",
  startDate: "2024-12-31", // ❌ Will error if in future
});
```

**After:**

```javascript
// Use current or past dates only
await createScorecardMeasurableEntry({
  dataFieldId: "xxx",
  value: "100",
  startDate: "2024-10-15", // ✅ Today or past dates OK
});
```

## Design Decisions

### Why Remove startDate from Update?

1. **Data Integrity**: Measurable entries represent data for a specific time period. Moving them breaks historical accuracy.
2. **Simplicity**: If you need data for a different period, create a new entry rather than moving an existing one.
3. **Prevents Errors**: Accidentally moving an entry to the wrong period could corrupt analysis and reporting.

### Why Block Future Dates on Create?

1. **Data Accuracy**: Scorecard entries should reflect actual historical data, not predictions.
2. **Prevents Accidents**: Users might accidentally select wrong dates, creating confusion.
3. **Clear Intent**: If forecasting is needed, it should be a separate feature with clear labeling.

## Alternatives Considered

### For startDate in Update:

- **Soft delete and recreate**: Too complex, loses audit trail
- **Allow with warning**: Confusing UX, still allows problematic behavior
- **Archive and create new**: Better, but adds complexity

**Decision**: Simplest solution is to not allow moving entries at all.

### For Future Dates in Create:

- **Allow with flag**: Adds complexity, unclear when to use
- **Separate forecast feature**: Good for future, but not needed now
- **Warning but allow**: Confusing, still allows problematic behavior

**Decision**: Clean validation prevents the issue entirely.

## Conclusion

These changes improve data integrity and user experience by:

- ✅ Preventing confusion about when data was recorded
- ✅ Ensuring entries represent actual historical data
- ✅ Simplifying the update API surface
- ✅ Providing clear error messages when validation fails

All tests pass, documentation is updated, and the changes are ready for production use.
