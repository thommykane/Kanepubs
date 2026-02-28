import { NextRequest, NextResponse } from "next/server";
import { eq, desc, and } from "drizzle-orm";
import { db } from "@/lib/db";
import { activities, sessions, users, proposals, contacts, businesses, organizations } from "@/lib/db/schema";
import { v4 as uuid } from "uuid";

async function getCurrentUsername(req: NextRequest): Promise<string> {
  const sessionId = req.headers.get("cookie")?.match(/session=([^;]+)/)?.[1];
  if (!sessionId) return "Admin";
  const [session] = await db.select().from(sessions).where(eq(sessions.id, sessionId)).limit(1);
  if (!session || new Date(session.expiresAt) < new Date()) return "Admin";
  const [user] = await db.select().from(users).where(eq(users.id, session.userId)).limit(1);
  return user?.username ?? "Admin";
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const companyType = searchParams.get("companyType")?.trim();
    const companyDisplayId = searchParams.get("companyDisplayId")?.trim();
    const all = searchParams.get("all") === "true" || searchParams.get("all") === "1";

    if (all) {
      // All Activity: paginated, 20 per page
      const limit = Math.min(Number(searchParams.get("limit")) || 20, 100);
      const offset = Math.min(Number(searchParams.get("offset")) || 0, 10000);
      const list = await db
        .select({
          id: activities.id,
          companyType: activities.companyType,
          companyDisplayId: activities.companyDisplayId,
          contactId: activities.contactId,
          username: activities.username,
          actionType: activities.actionType,
          notes: activities.notes,
          meetingAt: activities.meetingAt,
          proposalData: activities.proposalData,
          createdAt: activities.createdAt,
          contactFirstName: contacts.firstName,
          contactLastName: contacts.lastName,
          businessName: businesses.businessName,
          organizationName: organizations.organizationName,
        })
        .from(activities)
        .leftJoin(contacts, eq(activities.contactId, contacts.id))
        .leftJoin(
          businesses,
          and(
            eq(activities.companyType, "business"),
            eq(activities.companyDisplayId, businesses.displayId)
          )
        )
        .leftJoin(
          organizations,
          and(
            eq(activities.companyType, "org"),
            eq(activities.companyDisplayId, organizations.displayId)
          )
        )
        .orderBy(desc(activities.createdAt))
        .limit(limit)
        .offset(offset);
      return NextResponse.json(list);
    }

    if (!companyType || !companyDisplayId) {
      return NextResponse.json({ error: "companyType and companyDisplayId required" }, { status: 400 });
    }
    const list = await db
      .select({
        id: activities.id,
        companyType: activities.companyType,
        companyDisplayId: activities.companyDisplayId,
        contactId: activities.contactId,
        username: activities.username,
        actionType: activities.actionType,
        notes: activities.notes,
        meetingAt: activities.meetingAt,
        proposalData: activities.proposalData,
        createdAt: activities.createdAt,
        contactFirstName: contacts.firstName,
        contactLastName: contacts.lastName,
      })
      .from(activities)
      .leftJoin(contacts, eq(activities.contactId, contacts.id))
      .where(
        and(
          eq(activities.companyType, companyType),
          eq(activities.companyDisplayId, companyDisplayId)
        )
      )
      .orderBy(desc(activities.createdAt))
      .limit(15);
    return NextResponse.json(list);
  } catch (err) {
    console.error("[api/activities GET]", err);
    return NextResponse.json([], { status: 200 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      companyType,
      companyDisplayId,
      contactId,
      actionType,
      notes,
      meetingAt,
      proposalData,
    } = body;

    if (!companyType || !companyDisplayId || !contactId || !actionType) {
      return NextResponse.json(
        { error: "companyType, companyDisplayId, contactId, actionType required" },
        { status: 400 }
      );
    }

    const id = uuid();
    const username = await getCurrentUsername(req);
    const notesTrimmed =
      notes != null && String(notes).trim() !== ""
        ? String(notes).trim().slice(0, 50)
        : null;
    const meetingAtVal =
      meetingAt != null && String(meetingAt).trim() !== ""
        ? new Date(meetingAt)
        : null;
    if (meetingAtVal && isNaN(meetingAtVal.getTime())) {
      return NextResponse.json({ error: "Invalid meetingAt date" }, { status: 400 });
    }

    await db.insert(activities).values({
      id,
      companyType: String(companyType).trim(),
      companyDisplayId: String(companyDisplayId).trim(),
      contactId: String(contactId).trim(),
      username,
      actionType: String(actionType).trim(),
      notes: notesTrimmed,
      meetingAt: meetingAtVal,
      proposalData: proposalData ?? null,
    });

    if (String(actionType).trim() === "sent_proposal" && proposalData && typeof proposalData === "object") {
      const pd = proposalData as { amount?: string; issues?: unknown[]; geo?: string; impressions?: number };
      const proposalId = uuid();
      await db.insert(proposals).values({
        id: proposalId,
        companyType: String(companyType).trim(),
        companyDisplayId: String(companyDisplayId).trim(),
        contactId: String(contactId).trim(),
        salesAgent: username,
        amount: pd.amount != null ? String(pd.amount).trim() : null,
        issues: Array.isArray(pd.issues) ? pd.issues : null,
        geo: pd.geo != null ? String(pd.geo).trim() : null,
        impressions:
          pd.impressions != null && Number.isInteger(Number(pd.impressions))
            ? Number(pd.impressions)
            : null,
        status: "proposal",
      });
    }

    return NextResponse.json({ success: true, id });
  } catch (err) {
    console.error("[api/activities POST]", err);
    return NextResponse.json({ error: "Failed to create activity" }, { status: 500 });
  }
}
