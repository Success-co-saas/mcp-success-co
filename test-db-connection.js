import postgres from "postgres";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, ".env") });

console.log("Testing database connection...");
console.log("DB_HOST:", process.env.DB_HOST);
console.log("DB_PORT:", process.env.DB_PORT);
console.log("DB_NAME:", process.env.DB_NAME);
console.log("DB_USER:", process.env.DB_USER);
console.log("DB_PASSWORD:", process.env.DB_PASSWORD ? "***" : "not set");

try {
  const sql = postgres({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT, 10),
    database: process.env.DB_NAME,
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    max: 1,
    idle_timeout: 5,
    connect_timeout: 5,
  });

  console.log("\nConnecting to database...");

  // Test query
  const result = await sql`SELECT version()`;
  console.log("✅ Database connection successful!");
  console.log("PostgreSQL version:", result[0].version);

  // Test the user_api_keys table
  console.log("\nTesting user_api_keys table...");
  const apiKeysCount = await sql`SELECT COUNT(*) as count FROM user_api_keys`;
  console.log("✅ Found", apiKeysCount[0].count, "API keys in database");

  // Test with a sample API key lookup (if any exists)
  const sampleKey = await sql`
    SELECT u.company_id, k.key
    FROM user_api_keys k
    JOIN users u ON k.user_id = u.id
    LIMIT 1
  `;
  if (sampleKey.length > 0) {
    console.log("✅ Sample API key lookup works");
    console.log("   Company ID:", sampleKey[0].company_id);
    console.log("   API Key (DB):", sampleKey[0].key.substring(0, 8) + "...");
    console.log("   Note: Database stores keys WITHOUT 'suc_api_' prefix");
    console.log(
      "   Full key would be: suc_api_" +
        sampleKey[0].key.substring(0, 8) +
        "..."
    );
  }

  await sql.end();
  console.log("\n✅ All database tests passed!");
  process.exit(0);
} catch (error) {
  console.error("\n❌ Database connection failed!");
  console.error("Error:", error.message);
  process.exit(1);
}
