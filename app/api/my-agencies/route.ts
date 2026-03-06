import { NextRequest, NextResponse } from "next/server";
import { eq, desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { agencies, sessions, users, agencyClients, proposals } from "@/lib/db/schema";

async function getCurrentUsername(req: NextRequest): Promise<string | null> {
  const sessionId = req.headers.get("cookie")?.match(/session=([^;]+)/)?.[1];
  if (!sessionId) return null;
  const [session] = await db.select().from(sessions).where(eq(sessions.id, sessionId)).limit(1);
  if (!session || new Date(session.expiresAt) < new Date()) return null;
  const [user] = await db.select().from(users).where(eq(users.id, session.userId)).limit(1);
  return user?.username ?? null;
}

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: NextRequest) {
  try {
    const username = await getCurrentUsername(req);
    if (!username) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const list = await db
      .select({
        id: agencies.id,
        displayId: agencies.displayId,
        agencyName: agencies.agencyName,
        address: agencies.address,
        city: agencies.city,
        state: agencies.state,
        zipCode: agencies.zipCode,
        phone: agencies.phone,
        website: agencies.website,
        transactions: agencies.transactions,
        moneySpent: agencies.moneySpent,
        assignedTo: agencies.assignedTo,
        createdAt: agencies.createdAt,
      })
      .from(agencies)
      .where(eq(agencies.assignedTo, username))
      .orderBy(desc(agencies.createdAt));

    const links = await db
      .select({
        agencyId: agencyClients.agencyId,
        companyType: agencyClients.companyType,
        companyDisplayId: agencyClients.companyDisplayId,
      })
      .from(agencyClients);
    const linksByAgency = new Map<string, { companyType: string; companyDisplayId: string }[]>();
    for (const link of links) {
      if (!linksByAgency.has(link.agencyId)) linksByAgency.set(link.agencyId, []);
      linksByAgency.get(link.agencyId)!.push({
        companyType: link.companyType,
        companyDisplayId: link.companyDisplayId,
      });
    }

    const soldRows = await db
      .select({ companyType: proposals.companyType, companyDisplayId: proposals.companyDisplayId })
      .from(proposals)
      .where(eq(proposals.status, "sold"));
    const soldSet = new Set(soldRows.map((r) => `${r.companyType}:${r.companyDisplayId}`));

    const leadList = list.filter((a) => {
      const tx = a.transactions ?? 0;
      const money = a.moneySpent != null ? Number(a.moneySpent) : 0;
      if (tx >= 1 || money > 0) return false;
      if (a.displayId && soldSet.has(`agency:${a.displayId}`)) return false;
      const linked = linksByAgency.get(a.id) ?? [];
      for (const c of linked) {
        if (soldSet.has(`${c.companyType}:${c.companyDisplayId}`)) return false;
      }
      return true;
    });

    return NextResponse.json(leadList);
  } catch (err) {
    console.error("[api/my-agencies GET]", err);
    return NextResponse.json([], { status: 200 });
  }
}
