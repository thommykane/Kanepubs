import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { proposals, activities, sessions, users, businesses, organizations } from "@/lib/db/schema";

async function requireAdmin(req: NextRequest): Promise<boolean> {
  const sessionId = req.headers.get("cookie")?.match(/session=([^;]+)/)?.[1];
  if (!sessionId) return false;
  const [session] = await db.select().from(sessions).where(eq(sessions.id, sessionId)).limit(1);
  if (!session || new Date(session.expiresAt) < new Date()) return false;
  const [user] = await db.select({ isAdmin: users.isAdmin }).from(users).where(eq(users.id, session.userId)).limit(1);
  return user?.isAdmin ?? false;
}

/** POST: Purge all SOLD proposals and revert Money Spent / Transactions on each org/business. */
export async function POST(req: NextRequest) {
  try {
    const isAdmin = await requireAdmin(req);
    if (!isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const soldList = await db
      .select({ id: proposals.id, companyType: proposals.companyType, companyDisplayId: proposals.companyDisplayId, amount: proposals.amount })
      .from(proposals)
      .where(eq(proposals.status, "sold"));

    for (const p of soldList) {
      const amount = p.amount != null ? Number(p.amount) : 0;
      if (p.companyType === "business") {
        const [b] = await db.select().from(businesses).where(eq(businesses.displayId, p.companyDisplayId)).limit(1);
        if (b) {
          const currentMoney = b.moneySpent != null ? Number(b.moneySpent) : 0;
          const currentTx = b.transactions ?? 0;
          await db
            .update(businesses)
            .set({
              moneySpent: Math.max(0, currentMoney - amount).toFixed(2),
              transactions: Math.max(0, currentTx - 1),
            })
            .where(eq(businesses.id, b.id));
        }
      } else {
        const [o] = await db.select().from(organizations).where(eq(organizations.displayId, p.companyDisplayId)).limit(1);
        if (o) {
          const currentMoney = o.moneySpent != null ? Number(o.moneySpent) : 0;
          const currentTx = o.transactions ?? 0;
          await db
            .update(organizations)
            .set({
              moneySpent: Math.max(0, currentMoney - amount).toFixed(2),
              transactions: Math.max(0, currentTx - 1),
            })
            .where(eq(organizations.id, o.id));
        }
      }
    }

    await db.delete(proposals).where(eq(proposals.status, "sold"));
    await db.delete(activities).where(eq(activities.actionType, "sold"));

    return NextResponse.json({ success: true, purged: soldList.length });
  } catch (err) {
    console.error("[api/proposals/purge-sold POST]", err);
    return NextResponse.json({ error: "Failed to purge sales" }, { status: 500 });
  }
}
