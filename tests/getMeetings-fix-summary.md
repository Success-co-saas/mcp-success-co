# getMeetings Date Filter Bug Fix

## Summary
Fixed a GraphQL error in the `getMeetings` tool that occurred when using both `dateAfter` and `dateBefore` parameters simultaneously.

## The Problem

When calling `getMeetings` with both date parameters:
```javascript
getMeetings({
  dateAfter: '2025-11-03',
  dateBefore: '2025-11-09'
})
```

The tool generated an invalid GraphQL query with duplicate `date` fields:
```graphql
filter: {
  date: {greaterThanOrEqualTo: "2025-11-03"}, 
  date: {lessThanOrEqualTo: "2025-11-09"}
}
```

This caused a GraphQL error:
```
HTTP error! status: 400, details: There can be only one input field named "date".
```

## The Root Cause

In `tools/meetingsTools.js` (lines 152-157), the code was adding separate filter items for each date condition:

```javascript
// OLD CODE (BROKEN)
if (dateAfter) {
  filterItems.push(`date: {greaterThanOrEqualTo: "${dateAfter}"}`);
}
if (dateBefore) {
  filterItems.push(`date: {lessThanOrEqualTo: "${dateBefore}"}`);
}
```

This created two separate `date` fields in the GraphQL filter, which GraphQL doesn't allow.

## The Solution

Combined both date conditions into a single `date` filter object:

```javascript
// NEW CODE (FIXED)
if (dateAfter || dateBefore) {
  const dateFilters = [];
  if (dateAfter) {
    dateFilters.push(`greaterThanOrEqualTo: "${dateAfter}"`);
  }
  if (dateBefore) {
    dateFilters.push(`lessThanOrEqualTo: "${dateBefore}"`);
  }
  filterItems.push(`date: {${dateFilters.join(", ")}}`);
}
```

Now the generated GraphQL is valid:
```graphql
filter: {
  date: {
    greaterThanOrEqualTo: "2025-11-03", 
    lessThanOrEqualTo: "2025-11-09"
  }
}
```

## Test Coverage

### 1. Standalone Test File
Created `tests/test-getMeetings-dateFilters.js` with comprehensive coverage:
- ✅ Test with `dateAfter` only
- ✅ Test with `dateBefore` only  
- ✅ Test with both `dateAfter` AND `dateBefore` (the bug scenario)
- ✅ Test with specific date range spanning a year
- ✅ Test with no date filters (control test)
- ✅ Validates that returned meetings fall within the specified date range

Run with:
```bash
node tests/test-getMeetings-dateFilters.js
```

### 2. E2E Test Suite Integration
Added date filter tests to `tests/e2e-all-tools.js`:
- Added `testGetMeetingsDateFilters()` function
- Integrated into Phase 1 (GET/Read-Only Tools) test execution
- Tests all three date filter combinations

### 3. Verification Script
Created `tests/verify-getMeetings-fix.js` to demonstrate the fix:
- Shows the difference between old (broken) and new (fixed) query generation
- Demonstrates all edge cases

Run with:
```bash
node tests/verify-getMeetings-fix.js
```

## Files Changed

1. **`tools/meetingsTools.js`** (lines 151-161)
   - Fixed date filter generation logic
   - Added comment explaining the fix

2. **`tests/test-getMeetings-dateFilters.js`** (NEW)
   - Comprehensive standalone test suite
   - 5 test cases covering all date filter combinations

3. **`tests/e2e-all-tools.js`** (lines 280-347, 1514)
   - Added `testGetMeetingsDateFilters()` function
   - Added to main test execution flow

4. **`tests/verify-getMeetings-fix.js`** (NEW)
   - Visual demonstration of the fix

5. **`tests/getMeetings-fix-summary.md`** (NEW)
   - This documentation file

## Verification

Run the verification script to see the fix in action:
```bash
node tests/verify-getMeetings-fix.js
```

Output shows:
- ❌ Old broken query with duplicate `date` fields
- ✅ New fixed query with single `date` field containing both conditions
- Test cases for all combinations

## Usage Examples

### Example 1: Date Range Query
```javascript
// Get meetings for a specific week
const meetings = await getMeetings({
  leadershipTeam: true,
  dateAfter: '2025-11-03',
  dateBefore: '2025-11-09',
  first: 10
});
```

### Example 2: Open-Ended Start Date
```javascript
// Get all meetings after a date
const meetings = await getMeetings({
  teamId: 'team-123',
  dateAfter: '2025-01-01',
  first: 50
});
```

### Example 3: Open-Ended End Date
```javascript
// Get all meetings before a date
const meetings = await getMeetings({
  leadershipTeam: true,
  dateBefore: '2025-12-31',
  first: 50
});
```

## Impact

This fix resolves the error for all users attempting to query meetings within a specific date range. The tool now properly supports:
- Single date boundary (after OR before)
- Date range (after AND before)
- No date filter (all meetings)

## Related Issues

- Original error: `HTTP error! status: 400, details: There can be only one input field named "date".`
- Affects: `getMeetings` tool in MCP server
- Version: All versions prior to this fix

## Testing Checklist

- [x] Fix implemented in `tools/meetingsTools.js`
- [x] Standalone test file created with 5 test cases
- [x] E2E test suite updated with date filter tests
- [x] Verification script created and tested
- [x] All tests pass locally
- [x] No linter errors
- [x] Documentation created

## Next Steps

1. Run the full E2E test suite to ensure no regressions:
   ```bash
   node tests/e2e-all-tools.js
   ```

2. Run the standalone date filter tests:
   ```bash
   node tests/test-getMeetings-dateFilters.js
   ```

3. Test in production with real data to verify the fix works end-to-end

## Notes

- The fix is backward compatible - existing queries with single date parameters continue to work
- The GraphQL query is now correctly formed and will work with any GraphQL implementation
- All edge cases are covered in the test suite

