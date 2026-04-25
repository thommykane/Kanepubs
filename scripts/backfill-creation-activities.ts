/**
 * One-time backfill: insert org_created, business_created, agency_created, contact_added
 * rows into `activities` for records that existed before those events were logged in app code.
 *
 * Uses each row's createdAt and createdBy ?? assignedTo for username.
 *
 * Usage:
 *   npx tsx scripts/backfill-creation-activities.ts
 *   npx tsx scripts/backfill-creation-activities.ts --since=2026-04-16
 *   npx tsx scripts/backfill-creation-activities.ts --today
 *   npx tsx scripts/backfill-creation-activities.ts --dry-run
 *
 * Requires DATABASE_URL (same as app).
 */
import "dotenv/config";
import { and, eq, gte } from "drizzle-orm";
import { db } from "../lib/db";
import {
  activities,
  organizations,
  businesses,
  agencies,
  contacts,
} from "../lib/db/schema";
import { inferCompanyTypeFromDisplayId } from "../lib/log-activity";
import { v4 as uuid } from "uuid";

function parseArgs() {
  const args = process.argv.slice(2);
  let since: Date | null = null;
  let dryRun = false;
  let todayOnly = false;
  for (const a of args) {
    if (a === "--dry-run") dryRun = true;
    else if (a === "--today") todayOnly = true;
    else if (a.startsWith("--since=")) {
      const s = a.slice("--since=".length);
      const d = new Date(s.includes("T") ? s : `${s}T00:00:00.000Z`);
      if (!isNaN(d.getTime())) since = d;
    }
  }
  if (todayOnly) {
    const n = new Date();
    since = new Date(n.getFullYear(), n.getMonth(), n.getDate(), 0, 0, 0, 0);
  }
  return { since, dryRun };
}

async function hasEntityActivity(
  companyType: "org" | "business" | "agency",
  companyDisplayId: string,
  actionType: string
): Promise<boolean> {
  const [row] = await db
    .select({ id: activities.id })
    .from(activities)
    .where(
      and(
        eq(activities.companyType, companyType),
        eq(activities.companyDisplayId, companyDisplayId),
        eq(activities.actionType, actionType)
      )
    )
    .limit(1);
  return Boolean(row);
}

async function hasContactActivity(contactId: string): Promise<boolean> {
  const [row] = await db
    .select({ id: activities.id })
    .from(activities)
    .where(and(eq(activities.actionType, "contact_added"), eq(activities.contactId, contactId)))
    .limit(1);
  return Boolean(row);
}

function usernameFor(row: { createdBy: string | null; assignedTo: string | null }): string {
  const u = row.createdBy?.trim() || row.assignedTo?.trim();
  return u || "Unknown";
}

async function main() {
  const { since, dryRun } = parseArgs();
  console.log(
    since
      ? `Including rows with createdAt >= ${since.toISOString()}`
      : "Including all rows (no --since / --today filter)"
  );
  if (dryRun) console.log("DRY RUN — no inserts");

  let inserted = 0;
  let skippedDup = 0;

  const orgs = since
    ? await db.select().from(organizations).where(gte(organizations.createdAt, since))
    : await db.select().from(organizations);
  for (const o of orgs) {
    if (!o.displayId) continue;
    if (await hasEntityActivity("org", o.displayId, "org_created")) {
      skippedDup++;
      continue;
    }
    if (dryRun) {
      inserted++;
      continue;
    }
    await db.insert(activities).values({
      id: uuid(),
      companyType: "org",
      companyDisplayId: o.displayId,
      contactId: null,
      username: usernameFor(o),
      actionType: "org_created",
      notes: null,
      meetingAt: null,
      proposalData: null,
      createdAt: o.createdAt ?? new Date(),
    });
    inserted++;
  }

  const bizs = since
    ? await db.select().from(businesses).where(gte(businesses.createdAt, since))
    : await db.select().from(businesses);
  for (const b of bizs) {
    if (!b.displayId) continue;
    if (await hasEntityActivity("business", b.displayId, "business_created")) {
      skippedDup++;
      continue;
    }
    if (dryRun) {
      inserted++;
      continue;
    }
    await db.insert(activities).values({
      id: uuid(),
      companyType: "business",
      companyDisplayId: b.displayId,
      contactId: null,
      username: usernameFor(b),
      actionType: "business_created",
      notes: null,
      meetingAt: null,
      proposalData: null,
      createdAt: b.createdAt ?? new Date(),
    });
    inserted++;
  }

  const ags = since
    ? await db.select().from(agencies).where(gte(agencies.createdAt, since))
    : await db.select().from(agencies);
  for (const a of ags) {
    if (!a.displayId) continue;
    if (await hasEntityActivity("agency", a.displayId, "agency_created")) {
      skippedDup++;
      continue;
    }
    if (dryRun) {
      inserted++;
      continue;
    }
    await db.insert(activities).values({
      id: uuid(),
      companyType: "agency",
      companyDisplayId: a.displayId,
      contactId: null,
      username: usernameFor(a),
      actionType: "agency_created",
      notes: null,
      meetingAt: null,
      proposalData: null,
      createdAt: a.createdAt ?? new Date(),
    });
    inserted++;
  }

  const conts = since
    ? await db.select().from(contacts).where(gte(contacts.createdAt, since))
    : await db.select().from(contacts);
  for (const c of conts) {
    if (!c.businessId?.trim()) continue;
    if (await hasContactActivity(c.id)) {
      skippedDup++;
      continue;
    }
    const companyType = inferCompanyTypeFromDisplayId(c.businessId);
    if (dryRun) {
      inserted++;
      continue;
    }
    await db.insert(activities).values({
      id: uuid(),
      companyType,
      companyDisplayId: c.businessId.trim(),
      contactId: c.id,
      username: usernameFor({ createdBy: null, assignedTo: c.assignedTo }),
      actionType: "contact_added",
      notes: null,
      meetingAt: null,
      proposalData: null,
      createdAt: c.createdAt ?? new Date(),
    });
    inserted++;
  }

  console.log(
    dryRun
      ? `[dry-run] Would insert ~${inserted} rows (skipped ${skippedDup} already present)`
      : `Done. Inserted ${inserted} rows. Skipped ${skippedDup} duplicates.`
  );
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
