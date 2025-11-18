// GraphQL Tools - Direct GraphQL API Access
import {
  logToolCallStart,
  logToolCallEnd,
  callSuccessCoGraphQL,
  getGraphQLEndpoint,
} from "./core.js";

/**
 * Get overview of the GraphQL API with introspection examples
 * This teaches the AI how to use GraphQL's built-in schema introspection
 * @returns {Promise<{content: Array<{type: string, text: string}>}>}
 */
export async function getGraphQLOverview() {
  logToolCallStart("getGraphQLOverview", {});

  try {
    const endpoint = getGraphQLEndpoint();

    const overview = {
      endpoint: endpoint,
      authentication:
        "Automatically handled - you don't need to worry about auth",

      overview:
        "This tool gives you, the AI Assistant, full access to the Success.co GraphQL API. You can use this to make any API call, including advanced queries and mutations, even if you can't find a specialized tool for your current task. The API follows PostGraphile conventions and supports full schema introspection, so you can freely explore and interact with all available data and operations using GraphQL queries.",

      commonEntities: [
        "Todo",
        "Rock",
        "Issue",
        "Meeting",
        "Headline",
        "Milestone",
        "CoreValue",
        "CoreFocus",
        "ThreeYearGoal",
        "MarketStrategy",
        "Measurable",
        "MeasurableEntry",
        "Team",
        "User",
        "Leadership",
      ],

      howToExploreSchema: {
        description:
          "Use GraphQL introspection queries with executeGraphQL to discover the schema",

        introspectionExamples: {
          listAllTypes: {
            description: "Get all available types in the schema",
            query: `{
  __schema {
    types {
      name
      kind
      description
    }
  }
}`,
          },

          getTypeDetails: {
            description: "Get detailed information about a specific type",
            query: `{
  __type(name: "Todo") {
    name
    description
    fields {
      name
      description
      type {
        name
        kind
        ofType { name kind }
      }
    }
  }
}`,
          },

          listAllQueries: {
            description: "Get all available query operations",
            query: `{
  __schema {
    queryType {
      fields {
        name
        description
        args {
          name
          type { name kind }
        }
      }
    }
  }
}`,
          },

          listAllMutations: {
            description: "Get all available mutation operations",
            query: `{
  __schema {
    mutationType {
      fields {
        name
        description
        args {
          name
          type { name kind }
        }
      }
    }
  }
}`,
          },
        },
      },

      usageExamples: {
        simpleQuery: {
          description: "Fetch todos with filtering and sorting",
          query: `query GetMyTodos {
  todos(
    first: 10
    condition: { stateId: "active" }
    orderBy: DUE_AT_ASC
  ) {
    nodes {
      id
      desc
      dueAt
      priority
      user { name email }
    }
  }
}`,
        },

        mutation: {
          description: "Update a todo using a mutation",
          query: `mutation UpdateTodo($id: ID!, $desc: String!) {
  updateTodo(input: { 
    id: $id 
    todoPatch: { desc: $desc } 
  }) {
    todo {
      id
      desc
      updatedAt
    }
  }
}`,
          variables: {
            id: "WyJ0b2RvcyIsIjEyMyJd",
            desc: "Updated description",
          },
        },

        vtoQuery: {
          description: "Query V/TO data with nested relationships",
          query: `query GetVTO {
  leaderships(first: 1) {
    nodes {
      id
      coreValues(orderBy: SORT_ORDER_ASC) {
        nodes {
          id
          value
          detail
          sortOrder
        }
      }
      coreFocuses {
        nodes { id focus }
      }
      threeYearGoals {
        nodes { id goal }
      }
    }
  }
}`,
        },

        vtoMutation: {
          description: "Update V/TO core value",
          query: `mutation UpdateCoreValue($id: ID!, $value: String!) {
  updateCoreValue(input: { 
    id: $id 
    coreValuePatch: { value: $value } 
  }) {
    coreValue {
      id
      value
      detail
      updatedAt
    }
  }
}`,
        },
      },

      commonPatterns: {
        filtering: 'condition: { userId: $userId, stateId: "active" }',
        sorting: "orderBy: [CREATED_AT_DESC, PRIORITY_ASC]",
        pagination: "first: 50, offset: 0",
        nestedRelationships: "user { name email team { name } }",
        mutations: {
          create: 'createTodo(input: { todo: { desc: "...", userId: "..." } })',
          update: 'updateTodo(input: { id: $id, todoPatch: { desc: "..." } })',
          delete: "deleteTodo(input: { id: $id })",
        },
      },

      tips: [
        "Use introspection queries to discover available types and operations",
        "All table names are pluralized: todos, rocks, meetings, coreValues",
        "IDs are global node IDs (base64-encoded strings)",
        "Mutations use Patch objects for updates: todoPatch, rockPatch, coreValuePatch",
        "PostGraphile conventions: condition for filtering, orderBy for sorting",
        "Authentication and company scoping handled automatically",
        "Row-level security enforced - you can only access your company's data",
      ],

      nextSteps: [
        "Use introspection queries above to explore the schema",
        "Start with simple queries on familiar entities (todos, rocks, issues)",
        "Use executeGraphQL to run both introspection and data queries",
        "For V/TO operations, introspect coreValues, coreFocuses, threeYearGoals types",
      ],
    };

    const result = {
      content: [{ type: "text", text: JSON.stringify(overview, null, 2) }],
    };

    logToolCallEnd("getGraphQLOverview", result);
    return result;
  } catch (error) {
    logToolCallEnd("getGraphQLOverview", null, error);
    throw error;
  }
}

/**
 * Execute a GraphQL query or mutation
 * This allows direct access to the Success.co GraphQL API with any valid query
 * @param {Object} args - The arguments object
 * @param {string} args.query - The GraphQL query or mutation string
 * @param {Object} [args.variables] - Optional variables for the query
 * @returns {Promise<{content: Array<{type: string, text: string}>}>}
 */
export async function executeGraphQL(args) {
  const { query, variables } = args;

  logToolCallStart("executeGraphQL", {
    query: query.substring(0, 200) + (query.length > 200 ? "..." : ""),
    hasVariables: !!variables,
  });

  try {
    // Validate query is provided
    if (!query || typeof query !== "string") {
      throw new Error("Query parameter is required and must be a string");
    }

    // Call the GraphQL API using the existing helper (handles auth automatically)
    const response = await callSuccessCoGraphQL(query, variables);

    if (!response.ok) {
      // Return error in a structured way
      const errorResult = {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                success: false,
                error: response.error,
                query: query,
                variables: variables,
              },
              null,
              2
            ),
          },
        ],
      };
      logToolCallEnd("executeGraphQL", errorResult);
      return errorResult;
    }

    // Return successful response
    const result = {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              success: true,
              data: response.data,
            },
            null,
            2
          ),
        },
      ],
    };

    logToolCallEnd("executeGraphQL", result);
    return result;
  } catch (error) {
    const errorResult = {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              success: false,
              error: error.message,
              query: query,
              variables: variables,
            },
            null,
            2
          ),
        },
      ],
    };
    logToolCallEnd("executeGraphQL", errorResult, error);
    return errorResult;
  }
}
