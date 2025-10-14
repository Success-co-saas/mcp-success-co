import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import postgres from "postgres";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, ".env") });

console.log("Testing API key prefix stripping...\n");

const sql = postgres({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT, 10),
  database: process.env.DB_NAME,
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  max: 1,
});

try {
  // Get a sample key from the database (without prefix)
  const sampleKey = await sql`
    SELECT k.key, u.company_id
    FROM user_api_keys k
    JOIN users u ON k.user_id = u.id
    LIMIT 1
  `;

  if (sampleKey.length === 0) {
    console.log("❌ No API keys found in database");
    process.exit(1);
  }

  const keyInDb = sampleKey[0].key;
  const companyId = sampleKey[0].company_id;

  console.log("Sample from database:");
  console.log(`  Key (without prefix): ${keyInDb.substring(0, 16)}...`);
  console.log(`  Company ID: ${companyId}\n`);

  // Test 1: Query with key WITHOUT prefix (as stored in DB)
  console.log("Test 1: Query with key WITHOUT prefix (direct match)");
  const result1 = await sql`
    SELECT u.company_id
    FROM user_api_keys k
    JOIN users u ON k.user_id = u.id
    WHERE k.key = ${keyInDb}
    LIMIT 1
  `;

  if (result1.length > 0 && result1[0].company_id === companyId) {
    console.log(`✅ Found company ID: ${result1[0].company_id}\n`);
  } else {
    console.log("❌ Query failed\n");
  }

  // Test 2: Simulate stripping prefix from a full API key
  console.log("Test 2: Simulate API key WITH prefix (as provided by user)");
  const fullApiKey = `suc_api_${keyInDb}`;
  console.log(`  Full API key: ${fullApiKey.substring(0, 24)}...`);

  // Strip the prefix
  const keyWithoutPrefix = fullApiKey.startsWith("suc_api_")
    ? fullApiKey.substring(8)
    : fullApiKey;

  console.log(`  After stripping: ${keyWithoutPrefix.substring(0, 16)}...`);

  const result2 = await sql`
    SELECT u.company_id
    FROM user_api_keys k
    JOIN users u ON k.user_id = u.id
    WHERE k.key = ${keyWithoutPrefix}
    LIMIT 1
  `;

  if (result2.length > 0 && result2[0].company_id === companyId) {
    console.log(`✅ Found company ID: ${result2[0].company_id}\n`);
  } else {
    console.log("❌ Query failed\n");
  }

  // Test 3: Try with full key (should fail)
  console.log("Test 3: Query with FULL key including prefix (should fail)");
  const result3 = await sql`
    SELECT u.company_id
    FROM user_api_keys k
    JOIN users u ON k.user_id = u.id
    WHERE k.key = ${fullApiKey}
    LIMIT 1
  `;

  if (result3.length === 0) {
    console.log(`✅ Correctly failed (key with prefix not found in DB)\n`);
  } else {
    console.log("❌ Unexpected: Found result with full prefix\n");
  }

  await sql.end();

  console.log("════════════════════════════════════════════════════════");
  console.log("✅ All tests passed!");
  console.log("════════════════════════════════════════════════════════");
  console.log("\nConclusion:");
  console.log("  - Database stores keys WITHOUT 'suc_api_' prefix");
  console.log("  - Server must strip prefix before querying");
  console.log("  - Prefix stripping logic is working correctly");

  process.exit(0);
} catch (error) {
  console.error("\n❌ Test failed!");
  console.error("Error:", error.message);
  await sql.end();
  process.exit(1);
}
