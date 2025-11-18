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

// Cache the schema to avoid reading file multiple times
let schemaCache = null;

/**
 * Load and cache the GraphQL schema
 */
function loadSchema() {
  if (!schemaCache) {
    const schemaPath = path.join(__dirname, "..", "schema", "graphql_schema.json");
    const schemaContent = readFileSync(schemaPath, "utf-8");
    schemaCache = JSON.parse(schemaContent);
  }
  return schemaCache;
}

/**
 * Get overview of the GraphQL API with common patterns and examples
 * @returns {Promise<{content: Array<{type: string, text: string}>}>}
 */
export async function getGraphQLOverview() {
  logToolCallStart("getGraphQLOverview", {});

  try {
    const schema = loadSchema();
    const endpoint = getGraphQLEndpoint();
    
    // Count types
    const types = schema.data.__schema.types;
    const queryType = types.find(t => t.name === "Query");
    const mutationType = types.find(t => t.name === "Mutation");
    
    const overview = {
      endpoint: endpoint,
      authentication: "Automatically handled - you don't need to worry about auth",
      summary: {
        totalTypes: types.length,
        queryFields: queryType?.fields?.length || 0,
        mutationFields: mutationType?.fields?.length || 0,
      },
      commonEntities: [
        "Todo", "Rock", "Issue", "Meeting", "Headline", "Milestone",
        "CoreValue", "CoreFocus", "ThreeYearGoal", "MarketStrategy",
        "Measurable", "MeasurableEntry", "Team", "User"
      ],
      usage: {
        description: "Use the 'executeGraphQL' tool to run any GraphQL query or mutation",
        nextSteps: [
          "Use 'listGraphQLTypes' to see all available types",
          "Use 'getGraphQLType' to explore a specific type's fields",
          "Use 'listGraphQLQueries' to see available query operations",
          "Use 'listGraphQLMutations' to see available mutation operations",
          "Use 'searchGraphQLSchema' to find types/fields by keyword"
        ],
        example: {
          query: `query GetMyTodos {
  todos(first: 10, condition: { stateId: "active" }) {
    nodes {
      id
      desc
      dueAt
    }
  }
}`,
          mutation: `mutation UpdateTodo($id: ID!, $desc: String!) {
  updateTodo(input: { id: $id, todoPatch: { desc: $desc } }) {
    todo { id desc }
  }
}`
        }
      },
      commonPatterns: {
        filtering: "condition: { userId: $userId, stateId: \"active\" }",
        sorting: "orderBy: [CREATED_AT_DESC, PRIORITY_ASC]",
        pagination: "first: 50, offset: 0",
        relationships: "Nest related data: user { name email }",
        mutations: {
          create: "createTodo(input: { todo: { desc: \"...\", userId: \"...\" } })",
          update: "updateTodo(input: { id: $id, todoPatch: { desc: \"...\" } })",
          delete: "deleteTodo(input: { id: $id })"
        }
      },
      tips: [
        "All tables are pluralized: todos, rocks, meetings",
        "IDs are global node IDs (base64 strings)",
        "Updates use Patch objects: todoPatch, rockPatch",
        "PostGraphile conventions apply throughout",
        "Row-level security enforced by company"
      ]
    };

    const result = {
      content: [{ type: "text", text: JSON.stringify(overview, null, 2) }]
    };

    logToolCallEnd("getGraphQLOverview", result);
    return result;
  } catch (error) {
    logToolCallEnd("getGraphQLOverview", null, error);
    throw error;
  }
}

/**
 * List all GraphQL types (filtered to show most relevant ones)
 * @param {Object} args - Arguments
 * @param {string} [args.category] - Filter by category: "entities", "inputs", "enums", "all"
 * @returns {Promise<{content: Array<{type: string, text: string}>}>}
 */
export async function listGraphQLTypes(args = {}) {
  const { category = "entities" } = args;
  logToolCallStart("listGraphQLTypes", { category });

  try {
    const schema = loadSchema();
    let types = schema.data.__schema.types;

    // Filter based on category
    if (category === "entities") {
      // Show main business entities (exclude built-in GraphQL types and internals)
      types = types.filter(t => 
        t.kind === "OBJECT" && 
        !t.name.startsWith("__") &&
        !t.name.endsWith("Connection") &&
        !t.name.endsWith("Edge") &&
        !t.name.endsWith("Payload") &&
        !t.name.includes("PageInfo") &&
        !["Query", "Mutation", "Subscription", "Node"].includes(t.name)
      );
    } else if (category === "inputs") {
      types = types.filter(t => t.kind === "INPUT_OBJECT");
    } else if (category === "enums") {
      types = types.filter(t => t.kind === "ENUM");
    }
    // "all" shows everything

    const typeList = types.map(t => ({
      name: t.name,
      kind: t.kind,
      description: t.description || ""
    }));

    const result = {
      content: [{
        type: "text",
        text: JSON.stringify({
          category: category,
          count: typeList.length,
          types: typeList
        }, null, 2)
      }]
    };

    logToolCallEnd("listGraphQLTypes", result);
    return result;
  } catch (error) {
    logToolCallEnd("listGraphQLTypes", null, error);
    throw error;
  }
}

/**
 * Get detailed information about a specific GraphQL type
 * @param {Object} args - Arguments
 * @param {string} args.typeName - Name of the type to inspect
 * @returns {Promise<{content: Array<{type: string, text: string}>}>}
 */
export async function getGraphQLType(args) {
  const { typeName } = args;
  logToolCallStart("getGraphQLType", { typeName });

  try {
    const schema = loadSchema();
    const type = schema.data.__schema.types.find(t => t.name === typeName);

    if (!type) {
      throw new Error(`Type "${typeName}" not found in schema`);
    }

    const result = {
      content: [{
        type: "text",
        text: JSON.stringify(type, null, 2)
      }]
    };

    logToolCallEnd("getGraphQLType", result);
    return result;
  } catch (error) {
    logToolCallEnd("getGraphQLType", null, error);
    throw error;
  }
}

/**
 * List available GraphQL queries
 * @param {Object} args - Arguments
 * @param {string} [args.search] - Optional search term to filter queries
 * @returns {Promise<{content: Array<{type: string, text: string}>}>}
 */
export async function listGraphQLQueries(args = {}) {
  const { search } = args;
  logToolCallStart("listGraphQLQueries", { search });

  try {
    const schema = loadSchema();
    const queryType = schema.data.__schema.types.find(t => t.name === "Query");
    
    if (!queryType || !queryType.fields) {
      throw new Error("Query type not found");
    }

    let queries = queryType.fields.map(f => ({
      name: f.name,
      description: f.description || "",
      args: f.args.map(a => ({
        name: a.name,
        type: a.type,
        description: a.description || ""
      })),
      returnType: f.type
    }));

    // Filter by search term if provided
    if (search) {
      const searchLower = search.toLowerCase();
      queries = queries.filter(q => 
        q.name.toLowerCase().includes(searchLower) ||
        q.description.toLowerCase().includes(searchLower)
      );
    }

    const result = {
      content: [{
        type: "text",
        text: JSON.stringify({
          count: queries.length,
          queries: queries
        }, null, 2)
      }]
    };

    logToolCallEnd("listGraphQLQueries", result);
    return result;
  } catch (error) {
    logToolCallEnd("listGraphQLQueries", null, error);
    throw error;
  }
}

/**
 * List available GraphQL mutations
 * @param {Object} args - Arguments
 * @param {string} [args.search] - Optional search term to filter mutations
 * @returns {Promise<{content: Array<{type: string, text: string}>}>}
 */
export async function listGraphQLMutations(args = {}) {
  const { search } = args;
  logToolCallStart("listGraphQLMutations", { search });

  try {
    const schema = loadSchema();
    const mutationType = schema.data.__schema.types.find(t => t.name === "Mutation");
    
    if (!mutationType || !mutationType.fields) {
      throw new Error("Mutation type not found");
    }

    let mutations = mutationType.fields.map(f => ({
      name: f.name,
      description: f.description || "",
      args: f.args.map(a => ({
        name: a.name,
        type: a.type,
        description: a.description || ""
      })),
      returnType: f.type
    }));

    // Filter by search term if provided
    if (search) {
      const searchLower = search.toLowerCase();
      mutations = mutations.filter(m => 
        m.name.toLowerCase().includes(searchLower) ||
        m.description.toLowerCase().includes(searchLower)
      );
    }

    const result = {
      content: [{
        type: "text",
        text: JSON.stringify({
          count: mutations.length,
          mutations: mutations
        }, null, 2)
      }]
    };

    logToolCallEnd("listGraphQLMutations", result);
    return result;
  } catch (error) {
    logToolCallEnd("listGraphQLMutations", null, error);
    throw error;
  }
}

/**
 * Search the GraphQL schema for types, fields, or descriptions matching a keyword
 * @param {Object} args - Arguments
 * @param {string} args.keyword - Keyword to search for
 * @returns {Promise<{content: Array<{type: string, text: string}>}>}
 */
export async function searchGraphQLSchema(args) {
  const { keyword } = args;
  logToolCallStart("searchGraphQLSchema", { keyword });

  try {
    const schema = loadSchema();
    const searchLower = keyword.toLowerCase();
    const results = {
      types: [],
      queries: [],
      mutations: [],
      fields: []
    };

    // Search types
    schema.data.__schema.types.forEach(type => {
      if (type.name.toLowerCase().includes(searchLower) ||
          (type.description || "").toLowerCase().includes(searchLower)) {
        results.types.push({
          name: type.name,
          kind: type.kind,
          description: type.description || ""
        });
      }

      // Search fields within types
      if (type.fields) {
        type.fields.forEach(field => {
          if (field.name.toLowerCase().includes(searchLower) ||
              (field.description || "").toLowerCase().includes(searchLower)) {
            results.fields.push({
              typeName: type.name,
              fieldName: field.name,
              description: field.description || ""
            });
          }
        });
      }
    });

    // Search queries
    const queryType = schema.data.__schema.types.find(t => t.name === "Query");
    if (queryType && queryType.fields) {
      queryType.fields.forEach(field => {
        if (field.name.toLowerCase().includes(searchLower) ||
            (field.description || "").toLowerCase().includes(searchLower)) {
          results.queries.push({
            name: field.name,
            description: field.description || ""
          });
        }
      });
    }

    // Search mutations
    const mutationType = schema.data.__schema.types.find(t => t.name === "Mutation");
    if (mutationType && mutationType.fields) {
      mutationType.fields.forEach(field => {
        if (field.name.toLowerCase().includes(searchLower) ||
            (field.description || "").toLowerCase().includes(searchLower)) {
          results.mutations.push({
            name: field.name,
            description: field.description || ""
          });
        }
      });
    }

    const result = {
      content: [{
        type: "text",
        text: JSON.stringify({
          keyword: keyword,
          results: results,
          summary: {
            types: results.types.length,
            queries: results.queries.length,
            mutations: results.mutations.length,
            fields: results.fields.length
          }
        }, null, 2)
      }]
    };

    logToolCallEnd("searchGraphQLSchema", result);
    return result;
  } catch (error) {
    logToolCallEnd("searchGraphQLSchema", null, error);
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

