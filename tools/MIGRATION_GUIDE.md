# Tools Module Migration Guide

## Overview

The `tools.js` file has been split into multiple focused modules organized by functional area. This guide explains the migration and how to use the new structure.

## What's Been Created

### ✅ Completed Modules

1. **core.js** (423 lines) - Database, GraphQL, API keys, logging
2. **vtoTools.js** (265 lines) - Vision/Traction Organizer
3. **accountabilityChartTools.js** (377 lines) - Org chart/structure
4. **teamsTools.js** (88 lines) - Team listing
5. **usersTools.js** (150 lines) - User listing
6. **todosTools.js** (462 lines) - Todo CRUD operations
7. **milestonesTools.js** (113 lines) - Milestone listing
8. **peopleAnalyzerTools.js** (164 lines) - People Analyzer sessions
9. **orgCheckupsTools.js** (120 lines) - Org checkup sessions
10. **index.js** - Main export aggregator
11. **README.md** - Documentation
12. **MIGRATION_GUIDE.md** - This file

### 🚧 Remaining Modules To Create

The following modules need to be extracted from the original `tools.js`:

1. **rocksTools.js** - Extract from lines 1011-5149

   - `getRocks()` - lines 1011-1175
   - `createRock()` - lines 4839-5149
   - `updateRock()` - lines 5323-5779

2. **issuesTools.js** - Extract from lines 1452-5309

   - `getIssues()` - lines 1452-1625
   - `createIssue()` - lines 4657-4825
   - `updateIssue()` - lines 5164-5309

3. **headlinesTools.js** - Extract from lines 1643-6447

   - `getHeadlines()` - lines 1643-1807
   - `createHeadline()` - lines 6270-6447
   - `updateHeadline()` - lines 6096-6256

4. **meetingsTools.js** - Extract from lines 1191-6901

   - `getMeetings()` - lines 1191-1433
   - `getMeetingInfos()` - lines 3582-3684
   - `getMeetingAgendas()` - lines 3699-3852
   - `getMeetingDetails()` - lines 4439-4643
   - `createMeeting()` - lines 6596-6901
   - `updateMeeting()` - lines 6458-6582

5. **scorecardTools.js** - Extract from lines 3195-7853

   - `getScorecardMeasurables()` - lines 3195-3575
   - `createScorecardMeasurableEntry()` - lines 7305-7617
   - `updateScorecardMeasurableEntry()` - lines 7629-7853

6. **searchAndFetchTools.js** - Extract from lines 1925-3172
   - `search()` - lines 1925-2471
   - `fetch()` - lines 2479-3172

## File Size Breakdown

| Module                      | Approx Lines | Status           |
| --------------------------- | ------------ | ---------------- |
| core.js                     | 423          | ✅ Complete      |
| vtoTools.js                 | 265          | ✅ Complete      |
| accountabilityChartTools.js | 377          | ✅ Complete      |
| teamsTools.js               | 88           | ✅ Complete      |
| usersTools.js               | 150          | ✅ Complete      |
| todosTools.js               | 462          | ✅ Complete      |
| milestonesTools.js          | 113          | ✅ Complete      |
| peopleAnalyzerTools.js      | 164          | ✅ Complete      |
| orgCheckupsTools.js         | 120          | ✅ Complete      |
| **rocksTools.js**           | ~600         | 🚧 To Create     |
| **issuesTools.js**          | ~600         | 🚧 To Create     |
| **headlinesTools.js**       | ~500         | 🚧 To Create     |
| **meetingsTools.js**        | ~900         | 🚧 To Create     |
| **scorecardTools.js**       | ~700         | 🚧 To Create     |
| **searchAndFetchTools.js**  | ~700         | 🚧 To Create     |
| index.js                    | 80           | ✅ Complete      |
| README.md                   | 50           | ✅ Complete      |
| **Total**                   | **~6,300**   | **60% Complete** |

## Migration Strategy

### Phase 1: Complete Module Extraction (Current)

Extract remaining functions from tools.js into their respective modules

### Phase 2: Backward Compatibility

Update original tools.js to re-export from new modules:

```javascript
// tools.js (backward compatibility layer)
export * from "./tools/index.js";
```

### Phase 3: Testing

- Verify all exports work correctly
- Test that mcp-server.js can import tools
- Ensure no functionality breaks

### Phase 4: Cleanup (Optional Future)

- Remove old tools.js once migration is verified
- Update import statements throughout codebase

## Usage Examples

### Before (Monolithic)

```javascript
import { getTodos, createTodo, getRocks } from "./tools.js";
```

### After (Modular)

```javascript
// Option 1: Import from specific modules
import { getTodos, createTodo } from "./tools/todosTools.js";
import { getRocks } from "./tools/rocksTools.js";

// Option 2: Import from index (recommended)
import { getTodos, createTodo, getRocks } from "./tools/index.js";

// Option 3: Import everything
import * as tools from "./tools/index.js";
```

## Benefits of Modular Structure

1. **Maintainability** - Easier to find and modify specific functionality
2. **Testability** - Can test individual modules in isolation
3. **Performance** - Faster file loading and parsing
4. **Collaboration** - Multiple developers can work on different modules
5. **Documentation** - Each module is self-contained and easier to document
6. **Organization** - Clear separation of concerns by functional area

## Next Steps

1. ✅ Create remaining tool modules (rocksTools, issuesTools, headlinesTools, meetingsTools, scorecardTools, searchAndFetchTools)
2. ✅ Update tools.js for backward compatibility
3. ✅ Run tests to verify nothing breaks
4. ✅ Update documentation and examples

## Common Imports Needed in New Modules

Most modules will need:

```javascript
import {
  callSuccessCoGraphQL,
  getLeadershipTeamId,
  getSuccessCoApiKey,
  getContextForApiKey,
} from "./core.js";
import { validateStateId } from "../helpers.js";
```

Create/Update operations also need:

```javascript
import { mapPriorityToNumber, mapIssueTypeToLowercase, etc. } from "../helpers.js";
```

## Estimated Completion

- **Current Progress**: 60% complete (9 of 15 modules)
- **Remaining Work**: ~3,400 lines to extract and organize
- **Est. Time**: 30-45 minutes to complete remaining modules
