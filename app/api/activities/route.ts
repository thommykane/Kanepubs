import { NextRequest, NextResponse } from "next/server";
import { eq, desc, and, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { activities, sessions, users, proposals, contacts, businesses, organizations, agencies } from "@/lib/db/schema";
import { v4 as uuid } from "uuid";

async function getCurrentUsername(req: NextRequest): Promise<string> {
  const sessionId = req.headers.get("cookie")?.match(/session=([^;]+)/)?.[1];
  if (!sessionId) return "Admin";
  const [session] = await db.select().from(sessions).where(eq(sessions.id, sessionId)).limit(1);
  if (!session || new Date(session.expiresAt) < new Date()) return "Admin";
  const [user] = await db.select().from(users).where(eq(users.id, session.userId)).limit(1);
  return user?.username ?? "Admin";
}

async function requireAdmin(req: NextRequest): Promise<boolean> {
  const sessionId = req.headers.get("cookie")?.match(/session=([^;]+)/)?.[1];
  if (!sessionId) return false;
  const [session] = await db.select().from(sessions).where(eq(sessions.id, sessionId)).limit(1);
  if (!session || new Date(session.expiresAt) < new Date()) return false;
  const [user] = await db.select({ isAdmin: users.isAdmin }).from(users).where(eq(users.id, session.userId)).limit(1);
  return user?.isAdmin ?? false;
}

async function incrementCompanyTotals(
  companyType: string,
  companyDisplayId: string,
  saleAmount: number
) {
  if (companyType === "business") {
    let b = (await db
      .select()
      .from(businesses)
      .where(eq(businesses.displayId, companyDisplayId))
      .limit(1))[0];
    if (!b) {
      b = (await db
        .select()
        .from(businesses)
        .where(eq(businesses.id, companyDisplayId))
        .limit(1))[0];
    }
    if (b) {
      const currentMoney = b.moneySpent != null ? Number(b.moneySpent) : 0;
      const currentTx = b.transactions ?? 0;
      await db
        .update(businesses)
        .set({
          moneySpent: (currentMoney + saleAmount).toFixed(2),
          transactions: currentTx + 1,
        })
        .where(eq(businesses.id, b.id));
    }
    return;
  }

  if (companyType === "org") {
    let o = (await db
      .select()
      .from(organizations)
      .where(eq(organizations.displayId, companyDisplayId))
      .limit(1))[0];
    if (!o) {
      o = (await db
        .select()
        .from(organizations)
        .where(eq(organizations.id, companyDisplayId))
        .limit(1))[0];
    }
    if (o) {
      const currentMoney = o.moneySpent != null ? Number(o.moneySpent) : 0;
      const currentTx = o.transactions ?? 0;
      await db
        .update(organizations)
        .set({
          moneySpent: (currentMoney + saleAmount).toFixed(2),
          transactions: currentTx + 1,
        })
        .where(eq(organizations.id, o.id));
    }
    return;
  }

  if (companyType === "agency") {
    const [a] = await db
      .select({ id: agencies.id, moneySpent: agencies.moneySpent, transactions: agencies.transactions })
      .from(agencies)
      .where(eq(agencies.displayId, companyDisplayId))
      .limit(1);
    if (a) {
      const currentMoney = a.moneySpent != null ? Number(a.moneySpent) : 0;
      const currentTx = a.transactions ?? 0;
      await db
        .update(agencies)
        .set({
          moneySpent: (currentMoney + saleAmount).toFixed(2),
          transactions: currentTx + 1,
        })
        .where(eq(agencies.id, a.id));
    }
  }
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
      salesAgent: bodySalesAgent,
      backdatedDate,
    } = body;

    if (!companyType || !companyDisplayId || !actionType) {
      return NextResponse.json(
        { error: "companyType, companyDisplayId, actionType required" },
        { status: 400 }
      );
    }
    const isAgency = String(companyType).trim() === "agency";
    if (!isAgency && (!contactId || String(contactId).trim() === "")) {
      return NextResponse.json(
        { error: "contactId required for non-agency activity" },
        { status: 400 }
      );
    }
    const contactIdVal = contactId != null && String(contactId).trim() !== "" ? String(contactId).trim() : null;

    const actionTypeTrimmed = String(actionType).trim();
    if (actionTypeTrimmed === "backdated_proposal") {
      const isAdmin = await requireAdmin(req);
      if (!isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      if (!bodySalesAgent || !backdatedDate) {
        return NextResponse.json(
          { error: "salesAgent and backdatedDate required for backdated proposal" },
          { status: 400 }
        );
      }
      const backdatedAt = new Date(String(backdatedDate).trim());
      if (isNaN(backdatedAt.getTime())) {
        return NextResponse.json({ error: "Invalid backdatedDate" }, { status: 400 });
      }
      const id = uuid();
      const notesTrimmed =
        notes != null && String(notes).trim() !== ""
          ? String(notes).trim().slice(0, 50)
          : null;
      await db.insert(activities).values({
        id,
        companyType: String(companyType).trim(),
        companyDisplayId: String(companyDisplayId).trim(),
        contactId: contactIdVal,
        username: String(bodySalesAgent).trim(),
        actionType: "sent_proposal",
        notes: notesTrimmed,
        meetingAt: null,
        proposalData: proposalData ?? null,
        createdAt: backdatedAt,
      });
      return NextResponse.json({ success: true, id });
    }

    if (actionTypeTrimmed === "backdated_sold") {
      const isAdmin = await requireAdmin(req);
      if (!isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      if (!contactIdVal) {
        return NextResponse.json(
          { error: "contactId required for backdated sold" },
          { status: 400 }
        );
      }
      if (!bodySalesAgent || !backdatedDate) {
        return NextResponse.json(
          { error: "salesAgent and backdatedDate required for backdated sold" },
          { status: 400 }
        );
      }
      const dateStr = String(backdatedDate).trim();
      const backdatedAt = new Date(dateStr.includes("T") ? dateStr : `${dateStr}T12:00:00.000Z`);
      if (isNaN(backdatedAt.getTime())) {
        return NextResponse.json({ error: "Invalid backdatedDate" }, { status: 400 });
      }
      const notesTrimmed =
        notes != null && String(notes).trim() !== ""
          ? String(notes).trim().slice(0, 50)
          : null;
      const activityId = uuid();
      const proposalId = uuid();
      const pd =
        proposalData && typeof proposalData === "object"
          ? (proposalData as {
              amount?: string;
              issues?: { issue: string; year: string; specialFeatures: string }[];
              geo?: string;
              impressions?: number;
            })
          : null;
      const issuesVal =
        pd && Array.isArray(pd.issues)
          ? (pd.issues as { issue: string; year: string; specialFeatures: string }[])
          : null;
      const amountVal = pd?.amount != null ? String(pd.amount).trim() : null;
      const geoVal = pd?.geo != null ? String(pd.geo).trim() : null;
      const impressionsVal =
        pd?.impressions != null && Number.isInteger(Number(pd.impressions))
          ? Number(pd.impressions)
          : null;
      const companyTypeNorm = String(companyType).trim().toLowerCase();
      const companyDisplayIdNorm = String(companyDisplayId).trim();

      await db.insert(activities).values({
        id: activityId,
        companyType: companyTypeNorm,
        companyDisplayId: companyDisplayIdNorm,
        contactId: contactIdVal,
        username: String(bodySalesAgent).trim(),
        actionType: "sold",
        notes: notesTrimmed,
        meetingAt: null,
        proposalData: proposalData ?? null,
        createdAt: backdatedAt,
      });

      await db.insert(proposals).values({
        id: proposalId,
        companyType: companyTypeNorm,
        companyDisplayId: companyDisplayIdNorm,
        contactId: contactIdVal,
        salesAgent: String(bodySalesAgent).trim(),
        amount: amountVal,
        issues: issuesVal,
        geo: geoVal,
        impressions: impressionsVal,
        notes: notesTrimmed,
        status: "sold",
        matDue: null,
        createdAt: backdatedAt,
        statusUpdatedAt: backdatedAt,
        assignedTo: String(bodySalesAgent).trim(),
      });

      const saleAmount = amountVal != null ? Number(amountVal) : 0;
      await incrementCompanyTotals(companyTypeNorm, companyDisplayIdNorm, saleAmount);

      return NextResponse.json({ success: true, id: activityId });
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
      contactId: contactIdVal,
      username,
      actionType: actionTypeTrimmed,
      notes: notesTrimmed,
      meetingAt: meetingAtVal,
      proposalData: proposalData ?? null,
    });

    if (String(actionType).trim() === "sent_proposal" && proposalData && typeof proposalData === "object" && contactIdVal) {
      const pd = proposalData as { amount?: string; issues?: { issue: string; year: string; specialFeatures: string }[]; geo?: string; impressions?: number };
      const proposalId = uuid();
      const issuesVal = Array.isArray(pd.issues) ? (pd.issues as { issue: string; year: string; specialFeatures: string }[]) : null;
      await db.insert(proposals).values({
        id: proposalId,
        companyType: String(companyType).trim(),
        companyDisplayId: String(companyDisplayId).trim(),
        contactId: contactIdVal,
        salesAgent: username,
        amount: pd.amount != null ? String(pd.amount).trim() : null,
        issues: issuesVal,
        geo: pd.geo != null ? String(pd.geo).trim() : null,
        impressions:
          pd.impressions != null && Number.isInteger(Number(pd.impressions))
            ? Number(pd.impressions)
            : null,
        notes: notesTrimmed,
        status: "proposal",
      });
    }

    return NextResponse.json({ success: true, id });
  } catch (err) {
    console.error("[api/activities POST]", err);
    return NextResponse.json({ error: "Failed to create activity" }, { status: 500 });
  }
}

/** DELETE: Remove activities by id. Body: { ids: string[] }. */
export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json();
    const ids = body?.ids;
    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: "ids array required" }, { status: 400 });
    }
    const idList = ids.filter((x: unknown) => typeof x === "string" && x.trim() !== "").slice(0, 100);
    if (idList.length === 0) {
      return NextResponse.json({ error: "No valid ids" }, { status: 400 });
    }
    await db.delete(activities).where(inArray(activities.id, idList));
    return NextResponse.json({ success: true, deleted: idList.length });
  } catch (err) {
    console.error("[api/activities DELETE]", err);
    return NextResponse.json({ error: "Failed to delete activities" }, { status: 500 });
  }
}
