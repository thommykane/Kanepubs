/**
 * Backfill: Set each agency's transactions and money_spent from existing SOLD proposals.
 * Run once after adding the columns and deploy. From project root: npx tsx scripts/backfill-agency-transactions.ts
 */
import "dotenv/config";
import { db } from "../lib/db";
import { agencies, proposals } from "../lib/db/schema";
import { and, eq } from "drizzle-orm";

async function main() {
  console.log("Backfilling agency transactions and money_spent from SOLD proposals...");

  const soldAgencyProposals = await db
    .select({
      companyDisplayId: proposals.companyDisplayId,
      amount: proposals.amount,
    })
    .from(proposals)
    .where(and(eq(proposals.status, "sold"), eq(proposals.companyType, "agency")));

  const byAgency = new Map<
    string,
    { transactions: number; moneySpent: number }
  >();
  for (const row of soldAgencyProposals) {
    const displayId = row.companyDisplayId;
    const amount = row.amount != null ? Number(row.amount) : 0;
    const cur = byAgency.get(displayId) ?? { transactions: 0, moneySpent: 0 };
    cur.transactions += 1;
    cur.moneySpent += amount;
    byAgency.set(displayId, cur);
  }

  let updated = 0;
  for (const [displayId, { transactions, moneySpent }] of byAgency) {
    const [agency] = await db
      .select({ id: agencies.id })
      .from(agencies)
      .where(eq(agencies.displayId, displayId))
      .limit(1);
    if (agency) {
      await db
        .update(agencies)
        .set({
          transactions,
          moneySpent: moneySpent.toFixed(2),
        })
        .where(eq(agencies.id, agency.id));
      updated++;
      console.log(`  - ${displayId}: transactions=${transactions}, moneySpent=${moneySpent.toFixed(2)}`);
    }
  }

  console.log(`Done. Updated ${updated} agencies.`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
