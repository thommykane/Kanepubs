/**
 * Migration: Add agency_type, tags, transactions, money_spent to agencies table.
 * Run from project root: npx tsx scripts/migrate-agencies-type-tags.ts
 * Run this on production so agency profile Type/Tags/Transactions/Money Spent work like business/org.
 */
import "dotenv/config";
import postgres from "postgres";

const connectionString =
  process.env.DATABASE_URL || "postgresql://localhost:5432/kanepubs";
const sql = postgres(connectionString, { max: 1 });

async function main() {
  console.log("Running agencies migration (agency_type, tags, transactions, money_spent)...");

  await sql.unsafe(`
    ALTER TABLE agencies
    ADD COLUMN IF NOT EXISTS agency_type TEXT
  `);
  await sql.unsafe(`
    ALTER TABLE agencies
    ADD COLUMN IF NOT EXISTS tags TEXT
  `);
  await sql.unsafe(`
    ALTER TABLE agencies
    ADD COLUMN IF NOT EXISTS transactions INTEGER DEFAULT 0
  `);
  await sql.unsafe(`
    ALTER TABLE agencies
    ADD COLUMN IF NOT EXISTS money_spent NUMERIC(12,2) DEFAULT 0
  `);
  console.log("  - agencies.agency_type, tags, transactions, money_spent OK");

  console.log("Done.");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
