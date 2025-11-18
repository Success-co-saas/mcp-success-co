/**
 * Test suite for Chunked GraphQL Schema Tools
 * Tests the new schema exploration tools that break down the schema into manageable chunks
 * 
 * Run with: node tests/graphql-chunked.test.js
 */

import {
  getGraphQLOverview,
  listGraphQLTypes,
  getGraphQLType,
  listGraphQLQueries,
  listGraphQLMutations,
  searchGraphQLSchema,
} from "../tools/graphqlTools.js";
import { setAuthContext } from "../tools/core.js";

const mockAuth = {
  accessToken: "test",
  userId: "user_123",
  companyId: "company_456",
  userEmail: "test@success.co",
};

console.log("\n🧪 Testing Chunked GraphQL Schema Tools\n");

let testsPassed = 0;
let testsFailed = 0;

async function test(name, fn) {
  try {
    await fn();
    console.log(`✅ ${name}`);
    testsPassed++;
  } catch (error) {
    console.error(`❌ ${name}`);
    console.error(`   Error: ${error.message}`);
    testsFailed++;
  }
}

// Test 1: getGraphQLOverview
await test("getGraphQLOverview - Returns overview without timeout", async () => {
  await setAuthContext(mockAuth, async () => {
    const result = await getGraphQLOverview();
    const content = JSON.parse(result.content[0].text);
    
    if (!content.endpoint) throw new Error("Missing endpoint");
    if (!content.summary) throw new Error("Missing summary");
    if (!content.commonEntities) throw new Error("Missing commonEntities");
    if (!content.usage) throw new Error("Missing usage");
    if (!content.commonPatterns) throw new Error("Missing commonPatterns");
    
    console.log(`   Total types: ${content.summary.totalTypes}`);
    console.log(`   Query fields: ${content.summary.queryFields}`);
    console.log(`   Mutation fields: ${content.summary.mutationFields}`);
  });
});

// Test 2: listGraphQLTypes (entities)
await test("listGraphQLTypes - Lists entity types", async () => {
  await setAuthContext(mockAuth, async () => {
    const result = await listGraphQLTypes({ category: "entities" });
    const content = JSON.parse(result.content[0].text);
    
    if (!content.types || !Array.isArray(content.types)) {
      throw new Error("Types should be an array");
    }
    
    // Check for known entities
    const typeNames = content.types.map(t => t.name);
    const expectedTypes = ["Todo", "Rock", "Issue", "Meeting"];
    const found = expectedTypes.filter(t => typeNames.includes(t));
    
    if (found.length === 0) {
      throw new Error("No expected entities found");
    }
    
    console.log(`   Found ${content.count} entity types`);
    console.log(`   Includes: ${found.join(", ")}`);
  });
});

// Test 3: getGraphQLType
await test("getGraphQLType - Gets specific type details", async () => {
  await setAuthContext(mockAuth, async () => {
    const result = await getGraphQLType({ typeName: "Todo" });
    const type = JSON.parse(result.content[0].text);
    
    if (type.name !== "Todo") throw new Error("Wrong type returned");
    if (!type.fields || type.fields.length === 0) {
      throw new Error("Type should have fields");
    }
    
    console.log(`   Todo type has ${type.fields.length} fields`);
  });
});

// Test 4: listGraphQLQueries
await test("listGraphQLQueries - Lists all queries", async () => {
  await setAuthContext(mockAuth, async () => {
    const result = await listGraphQLQueries();
    const content = JSON.parse(result.content[0].text);
    
    if (!content.queries || !Array.isArray(content.queries)) {
      throw new Error("Queries should be an array");
    }
    
    // Check for known queries
    const queryNames = content.queries.map(q => q.name);
    const expectedQueries = ["todos", "rocks", "issues"];
    const found = expectedQueries.filter(q => queryNames.includes(q));
    
    if (found.length === 0) {
      throw new Error("No expected queries found");
    }
    
    console.log(`   Found ${content.count} queries`);
    console.log(`   Includes: ${found.join(", ")}`);
  });
});

// Test 5: listGraphQLQueries with search
await test("listGraphQLQueries - Filters by search term", async () => {
  await setAuthContext(mockAuth, async () => {
    const result = await listGraphQLQueries({ search: "todo" });
    const content = JSON.parse(result.content[0].text);
    
    const queryNames = content.queries.map(q => q.name);
    const hasTodoQuery = queryNames.some(n => n.toLowerCase().includes("todo"));
    
    if (!hasTodoQuery) {
      throw new Error("Search should find todo-related queries");
    }
    
    console.log(`   Found ${content.count} queries matching 'todo'`);
  });
});

// Test 6: listGraphQLMutations
await test("listGraphQLMutations - Lists all mutations", async () => {
  await setAuthContext(mockAuth, async () => {
    const result = await listGraphQLMutations();
    const content = JSON.parse(result.content[0].text);
    
    if (!content.mutations || !Array.isArray(content.mutations)) {
      throw new Error("Mutations should be an array");
    }
    
    // Check for known mutations
    const mutationNames = content.mutations.map(m => m.name);
    const expectedMutations = ["createTodo", "updateTodo", "deleteTodo"];
    const found = expectedMutations.filter(m => mutationNames.includes(m));
    
    if (found.length === 0) {
      throw new Error("No expected mutations found");
    }
    
    console.log(`   Found ${content.count} mutations`);
    console.log(`   Includes: ${found.join(", ")}`);
  });
});

// Test 7: searchGraphQLSchema
await test("searchGraphQLSchema - Searches schema by keyword", async () => {
  await setAuthContext(mockAuth, async () => {
    const result = await searchGraphQLSchema({ keyword: "todo" });
    const content = JSON.parse(result.content[0].text);
    
    if (!content.results) throw new Error("Should have results");
    if (!content.summary) throw new Error("Should have summary");
    
    const total = 
      content.summary.types + 
      content.summary.queries + 
      content.summary.mutations + 
      content.summary.fields;
    
    if (total === 0) {
      throw new Error("Search should find results for 'todo'");
    }
    
    console.log(`   Found ${total} total matches for 'todo'`);
    console.log(`   Types: ${content.summary.types}, Queries: ${content.summary.queries}, Mutations: ${content.summary.mutations}, Fields: ${content.summary.fields}`);
  });
});

// Test 8: searchGraphQLSchema for V/TO
await test("searchGraphQLSchema - Finds V/TO entities", async () => {
  await setAuthContext(mockAuth, async () => {
    const result = await searchGraphQLSchema({ keyword: "core value" });
    const content = JSON.parse(result.content[0].text);
    
    const total = 
      content.summary.types + 
      content.summary.queries + 
      content.summary.mutations + 
      content.summary.fields;
    
    if (total === 0) {
      throw new Error("Search should find V/TO core value entities");
    }
    
    console.log(`   Found ${total} matches for 'core value'`);
  });
});

// Summary
console.log("\n" + "=".repeat(70));
if (testsFailed === 0) {
  console.log(`✅ All ${testsPassed} tests passed!`);
} else {
  console.log(`Tests passed: ${testsPassed}/${testsPassed + testsFailed}`);
  console.log(`Tests failed: ${testsFailed}`);
}
console.log("=".repeat(70));

console.log("\n✨ Key Benefits:");
console.log("  • No timeouts - schema broken into manageable chunks");
console.log("  • Discoverable - AI can explore schema incrementally");
console.log("  • Searchable - Find types/fields by keyword");
console.log("  • Efficient - Only load what you need\n");

process.exit(testsFailed > 0 ? 1 : 0);

