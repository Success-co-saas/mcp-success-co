// Todos Tools
// Tools for creating, reading, and updating todos

import {
  callSuccessCoGraphQL,
  getLeadershipTeamId,
  getUserContext,
  getAuthContext,
} from "./core.js";
import {
  validateStateId,
  mapPriorityToNumber,
  mapPriorityToText,
} from "../utils/helpers.js";
import { getCompanyCode, generateObjectUrl } from "./commonHelpers.js";

/**
 * List Success.co todos
 * @param {Object} args - Arguments object
 * @param {number} [args.first] - Optional page size
 * @param {number} [args.offset] - Optional offset
 * @param {string} [args.stateId] - Todo state filter (defaults to 'ACTIVE')
 * @param {boolean} [args.fromMeetings] - If true, only return todos linked to meetings (Level 10 meetings)
 * @param {string} [args.teamId] - Filter by team ID
 * @param {boolean} [args.leadershipTeam] - If true, automatically use the leadership team ID
 * @param {string} [args.userId] - Filter by user ID
 * @param {string} [args.status] - Filter by status: "TODO" (default), "COMPLETE", "OVERDUE", or "ALL"
 * @param {string} [args.type] - Filter by type: "ALL" (default), "TEAM" (team todos), or "PRIVATE"
 * @param {string} [args.keyword] - Search for todos with names containing this keyword (case-insensitive)
 * @param {string} [args.createdAfter] - Filter todos created after this date (ISO 8601 format)
 * @param {string} [args.createdBefore] - Filter todos created before this date (ISO 8601 format)
 * @param {string} [args.completedAfter] - Filter todos completed after this date (ISO 8601 format)
 * @param {string} [args.completedBefore] - Filter todos completed before this date (ISO 8601 format)
 * @returns {Promise<{content: Array<{type: string, text: string}>}>}
 */
export async function getTodos(args) {
  const {
    first,
    offset,
    stateId = "ACTIVE",
    fromMeetings = false,
    teamId: providedTeamId,
    leadershipTeam = false,
    userId,
    status = "TODO",
    type = "ALL",
    keyword,
    createdAfter,
    createdBefore,
    completedAfter,
    completedBefore,
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
  // Validate stateId
  const validation = validateStateId(stateId);
  if (!validation.isValid) {
    return {
      content: [{ type: "text", text: validation.error }],
    };
  }

  // Validate status if provided
  if (status && !["TODO", "COMPLETE", "OVERDUE", "ALL"].includes(status)) {
    return {
      content: [
        {
          type: "text",
          text: 'Invalid status - must be "TODO", "COMPLETE", "OVERDUE", or "ALL"',
        },
      ],
    };
  }

  // Validate type if provided
  if (type && !["ALL", "TEAM", "PRIVATE"].includes(type)) {
    return {
      content: [
        {
          type: "text",
          text: 'Invalid type - must be "ALL", "TEAM", or "PRIVATE"',
        },
      ],
    };
  }

  const filterItems = [`stateId: {equalTo: "${stateId}"}`];

  // Add meetingId filter if fromMeetings is true
  if (fromMeetings) {
    filterItems.push(`meetingId: {isNull: false}`);
  }

  // Add teamId filter if provided
  if (teamId) {
    filterItems.push(`teamId: {equalTo: "${teamId}"}`);
  }

  // Add userId filter if provided
  if (userId) {
    filterItems.push(`userId: {equalTo: "${userId}"}`);
  }

  // Add type filter if provided (skip if "ALL")
  if (type === "TEAM") {
    filterItems.push(`type: {equalTo: "team"}`);
  } else if (type === "PRIVATE") {
    filterItems.push(`type: {equalTo: "private"}`);
  }
  // If type is "ALL", don't add any type filter

  // Add keyword filter if provided
  if (keyword) {
    filterItems.push(`name: {includesInsensitive: "${keyword}"}`);
  }

  // Add status filter if provided (skip if "ALL")
  if (status === "TODO") {
    filterItems.push(`todoStatusId: {equalTo: "TODO"}`);
  } else if (status === "COMPLETE") {
    filterItems.push(`todoStatusId: {equalTo: "COMPLETE"}`);
  } else if (status === "OVERDUE") {
    // OVERDUE = status is TODO and due date is in the past
    const now = new Date().toISOString();
    filterItems.push(`todoStatusId: {equalTo: "TODO"}`);
    filterItems.push(`dueDate: {lessThan: "${now}"}`);
  }
  // If status is "ALL", don't add any status filter

  // Add date filters for creation (combine into single createdAt filter)
  if (createdAfter || createdBefore) {
    const createdAtFilters = [];
    if (createdAfter) {
      createdAtFilters.push(`greaterThanOrEqualTo: "${createdAfter}"`);
    }
    if (createdBefore) {
      createdAtFilters.push(`lessThanOrEqualTo: "${createdBefore}"`);
    }
    filterItems.push(`createdAt: {${createdAtFilters.join(", ")}}`);
  }

  // Add date filters for completion (combine into single statusUpdatedAt filter)
  if (completedAfter || completedBefore) {
    const statusUpdatedAtFilters = [];
    if (completedAfter) {
      statusUpdatedAtFilters.push(`greaterThanOrEqualTo: "${completedAfter}"`);
    }
    if (completedBefore) {
      statusUpdatedAtFilters.push(`lessThanOrEqualTo: "${completedBefore}"`);
    }
    filterItems.push(`statusUpdatedAt: {${statusUpdatedAtFilters.join(", ")}}`);
    
    // Only include completed todos when using completion date filters
    if (!status || status === "ALL") {
      filterItems.push(`todoStatusId: {equalTo: "COMPLETE"}`);
    }
  }

  const filterStr = [
    filterItems.length > 0 ? `filter: {${filterItems.join(", ")}}` : "",
    first !== undefined ? `first: ${first}` : "",
    offset !== undefined ? `offset: ${offset}` : "",
  ]
    .filter(Boolean)
    .join(", ");

  const query = `
    query {
      todos(${filterStr}) {
        nodes {
          id
          todoStatusId
          name
          desc
          teamId
          userId
          statusUpdatedAt
          type
          dueDate
          priorityNo
          createdAt
          stateId
          companyId
          meetingId
        }
        totalCount
      }
    }
  `;

  const result = await callSuccessCoGraphQL(query);
  if (!result.ok) {
    return { content: [{ type: "text", text: result.error }] };
  }

  const data = result.data;
  const todos = data.data.todos.nodes;

  // Get company code for URL generation
  const context = await getUserContext();
  const companyCode = context ? await getCompanyCode(context.companyId) : null;

  // Calculate summary statistics
  const now = new Date();
  const summary = {
    totalCount: data.data.todos.totalCount,
    todoCount: todos.filter(t => t.todoStatusId === 'TODO').length,
    completeCount: todos.filter(t => t.todoStatusId === 'COMPLETE').length,
  };

  // Calculate overdue count
  summary.overdueCount = todos.filter(t => 
    t.todoStatusId === 'TODO' && 
    t.dueDate && 
    new Date(t.dueDate) < now
  ).length;

  // Calculate due soon count (due within 7 days)
  const sevenDaysFromNow = new Date();
  sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
  summary.dueSoonCount = todos.filter(t => 
    t.todoStatusId === 'TODO' && 
    t.dueDate && 
    new Date(t.dueDate) >= now &&
    new Date(t.dueDate) <= sevenDaysFromNow
  ).length;

  // Get current user context
  const auth = getAuthContext();
  const currentUserId = auth && !auth.isApiKeyMode ? auth.userId : null;

  return {
    content: [
      {
        type: "text",
        text: JSON.stringify({
          summary,
          currentUserId,
          results: todos.map((todo) => ({
            id: todo.id,
            name: todo.name,
            description: todo.desc || "",
            status: todo.todoStatusId,
            type: todo.type,
            priority: todo.priorityNo,
            dueDate: todo.dueDate,
            teamId: todo.teamId,
            userId: todo.userId,
            meetingId: todo.meetingId,
            createdAt: todo.createdAt,
            statusUpdatedAt: todo.statusUpdatedAt,
            url: companyCode ? generateObjectUrl('todos', todo.id, companyCode) : null,
          })),
        }),
      },
    ],
  };
}

/**
 * Create a new todo
 * @param {Object} args - Arguments object
 * @param {string} args.name - Todo name/title (required)
 * @param {string} [args.desc] - Todo description
 * @param {string} [args.teamId] - Team ID to assign the todo to (REQUIRED unless leadershipTeam is true)
 * @param {boolean} [args.leadershipTeam] - If true, automatically use the leadership team ID (REQUIRED unless teamId is provided)
 * @param {string} [args.userId] - User ID to assign the todo to (defaults to current user from API key)
 * @param {string} [args.dueDate] - Due date in YYYY-MM-DD format (defaults to 7 days from now if not provided)
 * @param {string} [args.priority] - Priority level: 'High', 'Medium', 'Low', or 'No priority' (defaults to 'No priority')
 * @param {string} [args.type] - Todo type: "team" or "private" (defaults to "team")
 * @returns {Promise<{content: Array<{type: string, text: string}>}>}
 */
export async function createTodo(args) {
  const {
    name,
    teamId: providedTeamId,
    leadershipTeam = false,
    desc = "",
    userId: providedUserId,
    dueDate: providedDueDate,
    priority = "No priority",
    type = "team",
  } = args;

  // Always set todoStatusId to TODO for new todos
  const todoStatusId = "TODO";

  // Set default due date to 7 days from now if not provided
  let dueDate = providedDueDate;
  if (!dueDate) {
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
    dueDate = sevenDaysFromNow.toISOString().split('T')[0]; // Format as YYYY-MM-DD
  }

  if (!name || name.trim() === "") {
    return {
      content: [
        {
          type: "text",
          text: "Error: Todo name is required",
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

  if (!teamId) {
    return {
      content: [
        {
          type: "text",
          text: "Error: Team ID is required. Either provide teamId or set leadershipTeam to true.",
        },
      ],
    };
  }

  // Get user context (works with OAuth or API key)
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

  const companyId = context.companyId;
  const userId = providedUserId || context.userId; // Use provided userId or default to current user

  const mutation = `
    mutation CreateTodo($input: CreateTodoInput!) {
      createTodo(input: $input) {
        todo {
          id
          name
          desc
          todoStatusId
          teamId
          userId
          dueDate
          createdAt
          stateId
          companyId
          type
        }
      }
    }
  `;

  const todoInput = {
    name,
    desc,
    todoStatusId,
    priorityNo: mapPriorityToNumber(priority),
    teamId,
    userId,
    companyId,
    stateId: "ACTIVE",
    type,
    dueDate, // Always include dueDate (defaults to 7 days from now)
  };

  const variables = {
    input: {
      todo: todoInput,
    },
  };

  const result = await callSuccessCoGraphQL(mutation, variables);

  if (!result.ok) {
    return {
      content: [
        {
          type: "text",
          text: `Error creating todo: ${result.error}`,
        },
      ],
    };
  }

  const createdTodo = result.data?.data?.createTodo?.todo;

  if (!createdTodo) {
    return {
      content: [
        {
          type: "text",
          text: `Error: Todo creation failed. ${JSON.stringify(
            result.data,
            null,
            2
          )}`,
        },
      ],
    };
  }

  // Re-fetch the todo to return it in the same format as getTodos
  const fetchQuery = `
    query {
      todos(filter: {id: {equalTo: "${createdTodo.id}"}}) {
        nodes {
          id
          todoStatusId
          name
          desc
          teamId
          userId
          statusUpdatedAt
          type
          dueDate
          priorityNo
          createdAt
          stateId
          companyId
          meetingId
        }
      }
    }
  `;

  const fetchResult = await callSuccessCoGraphQL(fetchQuery);
  if (!fetchResult.ok || !fetchResult.data?.data?.todos?.nodes?.[0]) {
    // Fallback to created data if re-fetch fails
    const companyCode = await getCompanyCode(companyId);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              success: true,
              message: "Todo created successfully",
              todo: {
                id: createdTodo.id,
                name: createdTodo.name,
                description: createdTodo.desc || "",
                status: createdTodo.todoStatusId,
                type: createdTodo.type,
                priority: createdTodo.priorityNo,
                dueDate: createdTodo.dueDate,
                teamId: createdTodo.teamId,
                userId: createdTodo.userId,
                meetingId: createdTodo.meetingId || null,
                createdAt: createdTodo.createdAt,
                statusUpdatedAt: createdTodo.statusUpdatedAt,
                url: companyCode ? generateObjectUrl('todos', createdTodo.id, companyCode) : null,
              },
            },
            null,
            2
          ),
        },
      ],
    };
  }

  const todo = fetchResult.data.data.todos.nodes[0];
  const companyCode = await getCompanyCode(companyId);

  // Return in same format as getTodos
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(
          {
            success: true,
            message: "Todo created successfully",
            todo: {
              id: todo.id,
              name: todo.name,
              description: todo.desc || "",
              status: todo.todoStatusId,
              type: todo.type,
              priority: todo.priorityNo,
              dueDate: todo.dueDate,
              teamId: todo.teamId,
              userId: todo.userId,
              meetingId: todo.meetingId,
              createdAt: todo.createdAt,
              statusUpdatedAt: todo.statusUpdatedAt,
              url: companyCode ? generateObjectUrl('todos', todo.id, companyCode) : null,
            },
          },
          null,
          2
        ),
      },
    ],
  };
}

/**
 * Update a todo (e.g., mark as complete)
 * @param {Object} args - Arguments object
 * @param {string} args.todoId - Todo ID (required)
 * @param {string} [args.todoStatusId] - New status ('TODO', 'COMPLETE')
 * @param {string} [args.name] - Update todo name
 * @param {string} [args.desc] - Update todo description
 * @param {string} [args.dueDate] - Update due date
 * @param {string} [args.priority] - Priority level: 'High', 'Medium', 'Low', or 'No priority'
 * @returns {Promise<{content: Array<{type: string, text: string}>}>}
 */
export async function updateTodo(args) {
  const { todoId, todoStatusId, name, desc, dueDate, priority } = args;

  if (!todoId) {
    return {
      content: [
        {
          type: "text",
          text: "Error: Todo ID is required",
        },
      ],
    };
  }

  // Get user context (works with OAuth or API key)
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

  const mutation = `
    mutation UpdateTodo($input: UpdateTodoInput!) {
      updateTodo(input: $input) {
        todo {
          id
          name
          desc
          todoStatusId
          dueDate
          statusUpdatedAt
          stateId
        }
      }
    }
  `;

  const updates = {};
  if (todoStatusId) updates.todoStatusId = todoStatusId;
  if (name) updates.name = name;
  if (desc !== undefined) updates.desc = desc;
  if (dueDate) updates.dueDate = dueDate;
  if (priority) updates.priorityNo = mapPriorityToNumber(priority);

  if (Object.keys(updates).length === 0) {
    return {
      content: [
        {
          type: "text",
          text: "Error: No updates specified. Provide at least one field to update (todoStatusId, name, desc, dueDate, or priority)",
        },
      ],
    };
  }

  const variables = {
    input: {
      id: todoId,
      patch: updates,
    },
  };

  const result = await callSuccessCoGraphQL(mutation, variables);

  if (!result.ok) {
    return {
      content: [
        {
          type: "text",
          text: `Error updating todo: ${result.error}`,
        },
      ],
    };
  }

  const updatedTodo = result.data?.data?.updateTodo?.todo;

  if (!updatedTodo) {
    return {
      content: [
        {
          type: "text",
          text: `Error: Todo update failed. ${JSON.stringify(
            result.data,
            null,
            2
          )}`,
        },
      ],
    };
  }

  // Re-fetch the todo to return it in the same format as getTodos
  const fetchQuery = `
    query {
      todos(filter: {id: {equalTo: "${updatedTodo.id}"}}) {
        nodes {
          id
          todoStatusId
          name
          desc
          teamId
          userId
          statusUpdatedAt
          type
          dueDate
          priorityNo
          createdAt
          stateId
          companyId
          meetingId
        }
      }
    }
  `;

  const fetchResult = await callSuccessCoGraphQL(fetchQuery);
  const companyCode = context ? await getCompanyCode(context.companyId) : null;

  if (!fetchResult.ok || !fetchResult.data?.data?.todos?.nodes?.[0]) {
    // Fallback to updated data if re-fetch fails
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              success: true,
              message: "Todo updated successfully",
              todo: {
                id: updatedTodo.id,
                name: updatedTodo.name,
                description: updatedTodo.desc || "",
                status: updatedTodo.todoStatusId,
                dueDate: updatedTodo.dueDate,
                statusUpdatedAt: updatedTodo.statusUpdatedAt,
                url: companyCode ? generateObjectUrl('todos', updatedTodo.id, companyCode) : null,
              },
            },
            null,
            2
          ),
        },
      ],
    };
  }

  const todo = fetchResult.data.data.todos.nodes[0];

  // Return in same format as getTodos
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(
          {
            success: true,
            message: "Todo updated successfully",
            todo: {
              id: todo.id,
              name: todo.name,
              description: todo.desc || "",
              status: todo.todoStatusId,
              type: todo.type,
              priority: todo.priorityNo,
              dueDate: todo.dueDate,
              teamId: todo.teamId,
              userId: todo.userId,
              meetingId: todo.meetingId,
              createdAt: todo.createdAt,
              statusUpdatedAt: todo.statusUpdatedAt,
              url: companyCode ? generateObjectUrl('todos', todo.id, companyCode) : null,
            },
          },
          null,
          2
        ),
      },
    ],
  };
}

/**
 * Delete a todo in Success.co
 * @param {Object} args - Arguments object
 * @param {string} args.todoId - Todo ID (required)
 * @returns {Promise<{content: Array<{type: string, text: string}>}>}
 */
export async function deleteTodo(args) {
  const { todoId } = args;

  if (!todoId) {
    return {
      content: [
        {
          type: "text",
          text: "Error: todoId is required",
        },
      ],
    };
  }

  const mutation = `
    mutation {
      updateTodo(input: {
        id: "${todoId}",
        patch: {
          stateId: "DELETED"
        }
      }) {
        todo {
          id
          name
          stateId
        }
      }
    }
  `;

  const result = await callSuccessCoGraphQL(mutation);
  if (!result.ok) {
    return { content: [{ type: "text", text: result.error }] };
  }

  const todo = result.data?.data?.updateTodo?.todo;

  if (!todo) {
    return {
      content: [
        {
          type: "text",
          text: `Error: Todo deletion failed. ${JSON.stringify(result.data, null, 2)}`,
        },
      ],
    };
  }

  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(
          {
            success: true,
            message: `Todo deleted successfully`,
            todo: {
              id: todo.id,
              name: todo.name,
              status: todo.stateId,
            },
          },
          null,
          2
        ),
      },
    ],
  };
}
