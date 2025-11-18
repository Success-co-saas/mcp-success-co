// GraphQL Tools - Direct GraphQL API Access
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";
import {
  logToolCallStart,
  logToolCallEnd,
  callSuccessCoGraphQL,
  getGraphQLEndpoint,
} from "./core.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Get the GraphQL schema and information about the API
 * This provides the full schema to enable dynamic query construction
 * @returns {Promise<{content: Array<{type: string, text: string}>}>}
 */
export async function getGraphQLSchema() {
  logToolCallStart("getGraphQLSchema", {});

  try {
    // Read the schema file
    const schemaPath = path.join(__dirname, "..", "schema", "graphql_schema.json");
    const schemaContent = readFileSync(schemaPath, "utf-8");
    const schema = JSON.parse(schemaContent);

    // Get the GraphQL endpoint
    const endpoint = getGraphQLEndpoint();

    // Create a comprehensive guide for using the API
    const guide = {
      schema: schema,
      endpoint: endpoint,
      authentication: "Automatically handled - you don't need to worry about auth",
      usage: {
        description: "Use the 'execute_graphql' tool to run any GraphQL query or mutation",
        example: {
          query: `query GetMyTodos {
  todos(first: 10, condition: { stateId: "active" }) {
    nodes {
      id
      desc
      dueAt
      priority
      userId
    }
  }
}`,
          mutation: `mutation UpdateTodo($id: ID!, $desc: String!) {
  updateTodo(input: { id: $id, todoPatch: { desc: $desc } }) {
    todo {
      id
      desc
    }
  }
}`
        },
        tips: [
          "The schema follows PostGraphile conventions with node-based IDs",
          "All tables are available as pluralized queries (e.g., 'todos', 'rocks', 'meetings')",
          "Mutations follow the pattern: create[Type], update[Type], delete[Type]",
          "Use 'condition' for filtering and 'orderBy' for sorting",
          "Pagination is available with 'first', 'offset', 'before', 'after' arguments",
          "Updates use '[type]Patch' objects (e.g., 'todoPatch', 'rockPatch')",
          "All IDs are global node IDs - use the exact ID strings returned from queries",
          "You can query the current user's data by filtering on userId or companyId"
        ]
      },
      commonPatterns: {
        filtering: "Use 'condition' with field comparisons: condition: { userId: $userId, stateId: \"active\" }",
        sorting: "Use 'orderBy': orderBy: [CREATED_AT_DESC, PRIORITY_ASC]",
        pagination: "Use 'first' and 'offset': first: 50, offset: 0",
        relationships: "Follow foreign key relationships directly in the query",
        mutations: {
          create: "createTodo(input: { todo: { desc: \"...\", userId: \"...\" } })",
          update: "updateTodo(input: { id: $id, todoPatch: { desc: \"...\" } })",
          delete: "deleteTodo(input: { id: $id })"
        }
      },
      notes: [
        "This is the COMPLETE Success.co GraphQL schema",
        "You can construct ANY valid GraphQL query or mutation using this schema",
        "Use introspection to discover available types, fields, and relationships",
        "The schema includes all EOS/Success.co entities: Rocks, To-Dos, Issues, Meetings, V/TO, Scorecard, etc.",
        "Authentication and company scoping are automatically handled by the API",
        "The API enforces row-level security based on the authenticated user's company"
      ]
    };

    const result = {
      content: [
        {
          type: "text",
          text: JSON.stringify(guide, null, 2)
        }
      ]
    };

    logToolCallEnd("getGraphQLSchema", result);
    return result;
  } catch (error) {
    logToolCallEnd("getGraphQLSchema", null, error);
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
    hasVariables: !!variables 
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
            text: JSON.stringify({
              success: false,
              error: response.error,
              query: query,
              variables: variables
            }, null, 2)
          }
        ]
      };
      logToolCallEnd("executeGraphQL", errorResult);
      return errorResult;
    }

    // Return successful response
    const result = {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            success: true,
            data: response.data
          }, null, 2)
        }
      ]
    };

    logToolCallEnd("executeGraphQL", result);
    return result;
  } catch (error) {
    const errorResult = {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            success: false,
            error: error.message,
            query: query,
            variables: variables
          }, null, 2)
        }
      ]
    };
    logToolCallEnd("executeGraphQL", errorResult, error);
    return errorResult;
  }
}

