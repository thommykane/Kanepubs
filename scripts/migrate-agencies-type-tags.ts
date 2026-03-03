/**
 * Migration: Add agency_type and tags to agencies table.
 * Run from project root: npx tsx scripts/migrate-agencies-type-tags.ts
 * Run this on production so agency profile Type/Tags can be stored and displayed.
 */
import "dotenv/config";
import postgres from "postgres";

const connectionString =
  process.env.DATABASE_URL || "postgresql://localhost:5432/kanepubs";
const sql = postgres(connectionString, { max: 1 });

async function main() {
  console.log("Running agencies agency_type + tags migration...");

  await sql.unsafe(`
    ALTER TABLE agencies
    ADD COLUMN IF NOT EXISTS agency_type TEXT
  `);
  await sql.unsafe(`
    ALTER TABLE agencies
    ADD COLUMN IF NOT EXISTS tags TEXT
  `);
  console.log("  - agencies.agency_type, tags OK");

  console.log("Done.");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
