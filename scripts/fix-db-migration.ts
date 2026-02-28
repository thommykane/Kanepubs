/**
 * One-time fix: add display_id to businesses and create contacts table.
 * Run from project root: npx tsx scripts/fix-db-migration.ts
 * Ensure .env has DATABASE_URL if not using default local postgres.
 */
import "dotenv/config";
import postgres from "postgres";

const connectionString =
  process.env.DATABASE_URL || "postgresql://localhost:5432/kanepubs";
const sql = postgres(connectionString, { max: 1 });

async function main() {
  console.log("Running fix migration...");

  // 1. Add display_id to businesses (PostgreSQL 9.5+ supports IF NOT EXISTS for ADD COLUMN)
  await sql.unsafe(`
    ALTER TABLE businesses
    ADD COLUMN IF NOT EXISTS display_id TEXT
  `);
  console.log("  - businesses.display_id column OK");

  // 2. Unique constraint on display_id (allows multiple NULLs)
  await sql.unsafe(`
    CREATE UNIQUE INDEX IF NOT EXISTS businesses_display_id_unique
    ON businesses (display_id)
    WHERE display_id IS NOT NULL
  `);
  console.log("  - businesses display_id unique index OK");

  // 3. Create contacts table if not exists
  await sql.unsafe(`
    CREATE TABLE IF NOT EXISTS contacts (
      id TEXT PRIMARY KEY,
      first_name TEXT,
      last_name TEXT,
      title TEXT,
      office_number TEXT,
      cell_number TEXT,
      email TEXT,
      business_id TEXT,
      created_at TIMESTAMP DEFAULT NOW() NOT NULL
    )
  `);
  console.log("  - contacts table OK");

  // 4. Add assigned_to to contacts if missing
  await sql.unsafe(`
    ALTER TABLE contacts
    ADD COLUMN IF NOT EXISTS assigned_to TEXT
  `);
  console.log("  - contacts.assigned_to column OK");

  // 5. Add address fields to businesses if missing
  for (const col of ["address_line2", "city", "state", "zip_code", "county"]) {
    await sql.unsafe(`
      ALTER TABLE businesses
      ADD COLUMN IF NOT EXISTS ${col} TEXT
    `);
  }
  console.log("  - businesses address fields (address_line2, city, state, zip_code, county) OK");

  // 6. Add time_zone to businesses if missing
  await sql.unsafe(`
    ALTER TABLE businesses
    ADD COLUMN IF NOT EXISTS time_zone TEXT
  `);
  console.log("  - businesses.time_zone column OK");

  // 7. Create organizations table if not exists
  await sql.unsafe(`
    CREATE TABLE IF NOT EXISTS organizations (
      id TEXT PRIMARY KEY,
      display_id TEXT UNIQUE,
      organization_name TEXT NOT NULL,
      address TEXT,
      address_line2 TEXT,
      city TEXT,
      state TEXT,
      zip_code TEXT,
      county TEXT,
      phone TEXT,
      website TEXT,
      organization_type TEXT,
      tags TEXT,
      time_zone TEXT,
      created_by TEXT,
      assigned_to TEXT,
      created_at TIMESTAMP DEFAULT NOW() NOT NULL
    )
  `);
  console.log("  - organizations table OK");

  console.log("Done. Restart or refresh the app.");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => sql.end());
