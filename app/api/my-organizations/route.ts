import { NextRequest, NextResponse } from "next/server";
import { eq, desc, and } from "drizzle-orm";
import { db } from "@/lib/db";
import { organizations, sessions, users, activities, proposals } from "@/lib/db/schema";

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

export async function GET(req: NextRequest) {
  try {
    const username = await getCurrentUsername(req);
    if (!username) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const soldOrgDisplayIds = await db
      .select({ companyDisplayId: proposals.companyDisplayId })
      .from(proposals)
      .where(and(eq(proposals.status, "sold"), eq(proposals.companyType, "org")));
    const soldIds = [...new Set(soldOrgDisplayIds.map((r) => r.companyDisplayId).filter(Boolean))] as string[];

    const orgs = await db
      .select()
      .from(organizations)
      .where(eq(organizations.assignedTo, username))
      .orderBy(desc(organizations.createdAt));

    const orgsFiltered =
      soldIds.length > 0
        ? orgs.filter((o) => o.displayId && !soldIds.includes(o.displayId))
        : orgs;

    const allActivities = await db
      .select({ companyDisplayId: activities.companyDisplayId, companyType: activities.companyType, actionType: activities.actionType, createdAt: activities.createdAt })
      .from(activities)
      .where(eq(activities.companyType, "org"))
      .orderBy(desc(activities.createdAt));

    const lastByDisplayId = new Map<string, { actionType: string; createdAt: string }>();
    for (const a of allActivities) {
      if (!a.companyDisplayId) continue;
      if (!lastByDisplayId.has(a.companyDisplayId)) {
        lastByDisplayId.set(a.companyDisplayId, { actionType: a.actionType, createdAt: String(a.createdAt) });
      }
    }

    const list = orgsFiltered.map((o) => {
      const last = o.displayId ? lastByDisplayId.get(o.displayId) : null;
      return {
        ...o,
        lastActivityAt: last?.createdAt ?? null,
        lastActivityType: last ? (ACTION_LABELS[last.actionType] ?? last.actionType) : null,
      };
    });

    return NextResponse.json(list);
  } catch (err) {
    console.error("[api/my-organizations GET]", err);
    return NextResponse.json([], { status: 200 });
  }
}
