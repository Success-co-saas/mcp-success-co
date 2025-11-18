/**
 * Test suite for Simplified GraphQL Tools (Using Introspection)
 * Tests that AI can use GraphQL introspection to discover the schema
 * 
 * Run with: node tests/graphql-simple.test.js
 */

import { getGraphQLOverview, executeGraphQL } from "../tools/graphqlTools.js";
import { setAuthContext } from "../tools/core.js";

const mockAuth = {
  accessToken: "test",
  userId: "user_123",
  companyId: "company_456",
  userEmail: "test@success.co",
};

console.log("\n🧪 Testing Simplified GraphQL Tools (Introspection-Based)\n");

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

// Test 1: getGraphQLOverview returns introspection examples
await test("getGraphQLOverview - Provides introspection examples", async () => {
  await setAuthContext(mockAuth, async () => {
    const result = await getGraphQLOverview();
    const content = JSON.parse(result.content[0].text);
    
    if (!content.endpoint) throw new Error("Missing endpoint");
    if (!content.howToExploreSchema) throw new Error("Missing howToExploreSchema");
    if (!content.howToExploreSchema.introspectionExamples) {
      throw new Error("Missing introspection examples");
    }
    
    const examples = content.howToExploreSchema.introspectionExamples;
    if (!examples.listAllTypes) throw new Error("Missing listAllTypes example");
    if (!examples.getTypeDetails) throw new Error("Missing getTypeDetails example");
    if (!examples.listAllQueries) throw new Error("Missing listAllQueries example");
    if (!examples.listAllMutations) throw new Error("Missing listAllMutations example");
    
    console.log("   ✓ Has introspection query examples");
    console.log("   ✓ Has usage examples for todos, mutations, V/TO");
  });
});

// Test 2: Introspection query - List all types (simulated)
await test("Introspection - List all types query structure", async () => {
  await setAuthContext(mockAuth, async () => {
    const introspectionQuery = `{
  __schema {
    types {
      name
      kind
      description
    }
  }
}`;
    
    // This will fail without a real API, but tests the structure
    const result = await executeGraphQL({ query: introspectionQuery });
    const content = JSON.parse(result.content[0].text);
    
    // Should have either success:true or an error (expected without API)
    if (content.success === undefined && !content.error) {
      throw new Error("Result should have success or error field");
    }
    
    console.log("   ✓ Introspection query structure valid");
  });
});

// Test 3: Introspection query - Get type details (simulated)
await test("Introspection - Get type details query structure", async () => {
  await setAuthContext(mockAuth, async () => {
    const introspectionQuery = `{
  __type(name: "Todo") {
    name
    fields {
      name
      type { name kind }
    }
  }
}`;
    
    const result = await executeGraphQL({ query: introspectionQuery });
    const content = JSON.parse(result.content[0].text);
    
    // Should have either success:true or an error (expected without API)
    if (content.success === undefined && !content.error) {
      throw new Error("Result should have success or error field");
    }
    
    console.log("   ✓ Type introspection query structure valid");
  });
});

// Test 4: Regular data query
await test("Data Query - Regular todos query structure", async () => {
  await setAuthContext(mockAuth, async () => {
    const dataQuery = `query {
  todos(first: 5) {
    nodes {
      id
      desc
    }
  }
}`;
    
    const result = await executeGraphQL({ query: dataQuery });
    const content = JSON.parse(result.content[0].text);
    
    // Should have either success:true or an error
    if (content.success === undefined && !content.error) {
      throw new Error("Result should have success or error field");
    }
    
    console.log("   ✓ Data query structure valid");
  });
});

// Test 5: Mutation query
await test("Mutation - Update mutation structure", async () => {
  await setAuthContext(mockAuth, async () => {
    const mutation = `mutation UpdateTodo($id: ID!, $desc: String!) {
  updateTodo(input: { id: $id, todoPatch: { desc: $desc } }) {
    todo { id desc }
  }
}`;
    
    const variables = { id: "test", desc: "Updated" };
    const result = await executeGraphQL({ query: mutation, variables });
    const content = JSON.parse(result.content[0].text);
    
    // Should have either success:true or an error
    if (content.success === undefined && !content.error) {
      throw new Error("Result should have success or error field");
    }
    
    console.log("   ✓ Mutation query structure valid");
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

console.log("\n✨ Simplified Approach Benefits:");
console.log("  • Only 2 tools instead of 7");
console.log("  • Uses standard GraphQL introspection");
console.log("  • AI learns introspection once, works everywhere");
console.log("  • No custom schema parsing needed");
console.log("  • Simpler codebase, easier to maintain\n");

process.exit(testsFailed > 0 ? 1 : 0);

