import { NextRequest, NextResponse } from "next/server";
import { eq, desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { businesses, sessions, users, activities, proposals } from "@/lib/db/schema";

async function getCurrentUsername(req: NextRequest): Promise<string | null> {
  const sessionId = req.headers.get("cookie")?.match(/session=([^;]+)/)?.[1];
  if (!sessionId) return null;
  const [session] = await db.select().from(sessions).where(eq(sessions.id, sessionId)).limit(1);
  if (!session || new Date(session.expiresAt) < new Date()) return null;
  const [user] = await db.select().from(users).where(eq(users.id, session.userId)).limit(1);
  return user?.username ?? null;
}

const ACTION_LABELS: Record<string, string> = {
  no_answer: "No Answer",
  left_voicemail: "Left Voicemail",
  not_interested: "Not Interested",
  no_budget: "No Budget",
  blind_email: "Sent Blind Email",
  scheduled_meeting: "Scheduled Meeting",
  sent_proposal: "Sent Proposal",
  passed_on_proposal: "Passed on Proposal",
  sent_io: "Sent I/O",
  rejected_io: "Rejected I/O",
  sold: "SOLD",
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: NextRequest) {
  try {
    const username = await getCurrentUsername(req);
    if (!username) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const normalizeCompanyType = (value: string | null | undefined): "org" | "business" | "agency" | null => {
      const t = String(value ?? "").trim().toLowerCase();
      if (t === "org" || t === "organization") return "org";
      if (t === "business" || t === "biz") return "business";
      if (t === "agency") return "agency";
      return null;
    };

    const soldRows = await db
      .select({ companyType: proposals.companyType, companyDisplayId: proposals.companyDisplayId })
      .from(proposals)
      .where(eq(proposals.status, "sold"));
    const soldIdsSet = new Set<string>();
    for (const row of soldRows) {
      const displayId = row.companyDisplayId ?? "";
      if (!displayId) continue;
      const normalizedType = normalizeCompanyType(row.companyType);
      const inferredType = normalizedType ?? (displayId.toUpperCase().startsWith("B") ? "business" : null);
      if (inferredType === "business") soldIdsSet.add(displayId);
    }
    const soldIds = Array.from(soldIdsSet);

    const bizList = await db
      .select()
      .from(businesses)
      .where(eq(businesses.assignedTo, username))
      .orderBy(desc(businesses.createdAt));

    const bizListFiltered = bizList.filter((b) => {
      const tx = b.transactions ?? 0;
      const money = b.moneySpent != null ? Number(b.moneySpent) : 0;
      if (tx >= 1 || money > 0) return false;
      if (b.displayId && soldIds.includes(b.displayId)) return false;
      return true;
    });

    const allActivities = await db
      .select({ companyDisplayId: activities.companyDisplayId, companyType: activities.companyType, actionType: activities.actionType, createdAt: activities.createdAt })
      .from(activities)
      .where(eq(activities.companyType, "business"))
      .orderBy(desc(activities.createdAt));

    const lastByDisplayId = new Map<string, { actionType: string; createdAt: string }>();
    for (const a of allActivities) {
      if (!a.companyDisplayId) continue;
      if (!lastByDisplayId.has(a.companyDisplayId)) {
        lastByDisplayId.set(a.companyDisplayId, { actionType: a.actionType, createdAt: String(a.createdAt) });
      }
    }

    const list = bizListFiltered.map((b) => {
      const last = b.displayId ? lastByDisplayId.get(b.displayId) : null;
      return {
        ...b,
        lastActivityAt: last?.createdAt ?? null,
        lastActivityType: last ? (ACTION_LABELS[last.actionType] ?? last.actionType) : null,
      };
    });

    return NextResponse.json(list);
  } catch (err) {
    console.error("[api/my-businesses GET]", err);
    return NextResponse.json([], { status: 200 });
  }
}
