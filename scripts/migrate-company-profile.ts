/**
 * Migration: Company profile – transactions, money_spent, activities, proposals.
 * Run from project root: npx tsx scripts/migrate-company-profile.ts
 */
import "dotenv/config";
import postgres from "postgres";

const connectionString =
  process.env.DATABASE_URL || "postgresql://localhost:5432/kanepubs";
const sql = postgres(connectionString, { max: 1 });

async function main() {
  console.log("Running company profile migration...");

  await sql.unsafe(`
    ALTER TABLE businesses
    ADD COLUMN IF NOT EXISTS transactions INTEGER DEFAULT 0
  `);
  await sql.unsafe(`
    ALTER TABLE businesses
    ADD COLUMN IF NOT EXISTS money_spent NUMERIC(12,2) DEFAULT 0
  `);
  console.log("  - businesses.transactions, money_spent OK");

  await sql.unsafe(`
    ALTER TABLE organizations
    ADD COLUMN IF NOT EXISTS transactions INTEGER DEFAULT 0
  `);
  await sql.unsafe(`
    ALTER TABLE organizations
    ADD COLUMN IF NOT EXISTS money_spent NUMERIC(12,2) DEFAULT 0
  `);
  console.log("  - organizations.transactions, money_spent OK");

  await sql.unsafe(`
    CREATE TABLE IF NOT EXISTS activities (
      id TEXT PRIMARY KEY,
      company_type TEXT NOT NULL,
      company_display_id TEXT NOT NULL,
      contact_id TEXT NOT NULL,
      username TEXT NOT NULL,
      action_type TEXT NOT NULL,
      notes TEXT,
      meeting_at TIMESTAMP,
      proposal_data JSONB,
      created_at TIMESTAMP DEFAULT NOW() NOT NULL
    )
  `);
  console.log("  - activities table OK");

  await sql.unsafe(`
    CREATE TABLE IF NOT EXISTS proposals (
      id TEXT PRIMARY KEY,
      company_type TEXT NOT NULL,
      company_display_id TEXT NOT NULL,
      contact_id TEXT NOT NULL,
      sales_agent TEXT NOT NULL,
      amount NUMERIC(12,2),
      issues JSONB,
      geo TEXT,
      impressions INTEGER,
      status TEXT NOT NULL,
      mat_due TIMESTAMP,
      created_at TIMESTAMP DEFAULT NOW() NOT NULL
    )
  `);
  console.log("  - proposals table OK");

  console.log("Done.");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
