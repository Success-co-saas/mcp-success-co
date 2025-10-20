// Todos Tools
// Tools for creating, reading, and updating todos

import {
  callSuccessCoGraphQL,
  getLeadershipTeamId,
  getUserContext,
} from "./core.js";
import {
  validateStateId,
  mapPriorityToNumber,
  mapPriorityToText,
} from "../helpers.js";

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

  // Add date filters for creation
  if (createdAfter) {
    filterItems.push(`createdAt: {greaterThanOrEqualTo: "${createdAfter}"}`);
  }
  if (createdBefore) {
    filterItems.push(`createdAt: {lessThanOrEqualTo: "${createdBefore}"}`);
  }

  // Add date filters for completion (statusUpdatedAt when status is COMPLETE)
  if (completedAfter || completedBefore) {
    if (completedAfter) {
      filterItems.push(
        `statusUpdatedAt: {greaterThanOrEqualTo: "${completedAfter}"}`
      );
    }
    if (completedBefore) {
      filterItems.push(
        `statusUpdatedAt: {lessThanOrEqualTo: "${completedBefore}"}`
      );
    }
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
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify({
          totalCount: data.data.todos.totalCount,
          results: data.data.todos.nodes.map((todo) => ({
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
 * @param {string} [args.dueDate] - Due date in YYYY-MM-DD format
 * @returns {Promise<{content: Array<{type: string, text: string}>}>}
 */
export async function createTodo(args) {
  const {
    name,
    teamId: providedTeamId,
    leadershipTeam = false,
    desc = "",
    userId: providedUserId,
    dueDate,
    priority = "Medium",
  } = args;

  // Always set todoStatusId to TODO for new todos
  const todoStatusId = "TODO";

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
  };

  // Add optional dueDate if provided
  if (dueDate) {
    todoInput.dueDate = dueDate;
  }

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

  const todo = result.data?.data?.createTodo?.todo;

  if (!todo) {
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

  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(
          {
            success: true,
            message: "Todo created successfully",
            todo: todo,
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
 * @returns {Promise<{content: Array<{type: string, text: string}>}>}
 */
export async function updateTodo(args) {
  const { todoId, todoStatusId, name, desc, dueDate } = args;

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

  if (Object.keys(updates).length === 0) {
    return {
      content: [
        {
          type: "text",
          text: "Error: No updates specified. Provide at least one field to update (todoStatusId, name, desc, or dueDate)",
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

  const todo = result.data?.data?.updateTodo?.todo;

  if (!todo) {
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

  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(
          {
            success: true,
            message: "Todo updated successfully",
            todo: todo,
          },
          null,
          2
        ),
      },
    ],
  };
}
