# Tools Module Organization

This directory contains the modularized Success.co MCP Server tools, organized by functional area for better maintainability and organization.

## Module Structure

### Core Infrastructure

- **core.js** - Database connections, GraphQL client, API key management, logging, and caching

### Entity Management Tools

#### Teams & Users

- **teamsTools.js** - Team listing and management
- **usersTools.js** - User listing and management

#### Task & Goal Management

- **todosTools.js** - Todo CRUD operations (create, read, update)
- **rocksTools.js** - Rock (90-day priorities) CRUD operations
- **issuesTools.js** - Issue CRUD operations
- **milestonesTools.js** - Milestone listing

#### Communication

- **headlinesTools.js** - Headline CRUD operations

#### Meetings

- **meetingsTools.js** - Meeting management (get, create, update, details, infos, agendas)

#### Performance & Analysis

- **scorecardTools.js** - Scorecard measurables and data values (KPI tracking)
- **peopleAnalyzerTools.js** - People Analyzer sessions
- **orgCheckupsTools.js** - Organization checkup tools

#### Vision & Structure

- **vtoTools.js** - Vision/Traction Organizer (V/TO) tools
- **accountabilityChartTools.js** - Organizational structure and accountability

#### Search & Discovery

- **searchAndFetchTools.js** - Cross-entity search and fetch operations

## Module Exports

Each module exports its tool functions which are then aggregated in `index.js` for easy importing.

## Usage

```javascript
// Import specific tools
import { getTodos, createTodo } from "./tools/todosTools.js";

// Or import all tools
import * as tools from "./tools/index.js";
```

## Dependencies

All tool modules depend on:

- `core.js` for database, GraphQL, and API operations
- `../helpers.js` for validation and utility functions

## File Size Comparison

Original `tools.js`: ~7,854 lines
Modularized total: ~7,854 lines (distributed across ~16 files)
Average file size: ~490 lines per module

This modular structure provides:

- Better code organization
- Easier testing and maintenance
- Clear separation of concerns
- Improved discoverability
- Reduced cognitive load per file
