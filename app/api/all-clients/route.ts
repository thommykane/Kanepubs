import { NextRequest, NextResponse } from "next/server";
import { eq, desc, and, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  proposals,
  businesses,
  organizations,
  activities,
  contacts,
  sessions,
  users,
} from "@/lib/db/schema";

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

async function getCurrentUser(req: NextRequest): Promise<{ username: string; isAdmin: boolean } | null> {
  const sessionId = req.headers.get("cookie")?.match(/session=([^;]+)/)?.[1];
  if (!sessionId) return null;
  const [session] = await db.select().from(sessions).where(eq(sessions.id, sessionId)).limit(1);
  if (!session || new Date(session.expiresAt) < new Date()) return null;
  const [user] = await db.select().from(users).where(eq(users.id, session.userId)).limit(1);
  if (!user) return null;
  return { username: user.username, isAdmin: user.isAdmin ?? false };
}

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: NextRequest) {
  try {
    const current = await getCurrentUser(req);
    if (!current) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!current.isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const soldProposals = await db
      .select({
        proposal: proposals,
        businessName: businesses.businessName,
        organizationName: organizations.organizationName,
        moneySpentBiz: businesses.moneySpent,
        moneySpentOrg: organizations.moneySpent,
        transactionsBiz: businesses.transactions,
        transactionsOrg: organizations.transactions,
      })
      .from(proposals)
      .leftJoin(
        businesses,
        and(eq(proposals.companyType, "business"), eq(proposals.companyDisplayId, businesses.displayId))
      )
      .leftJoin(
        organizations,
        and(eq(proposals.companyType, "org"), eq(proposals.companyDisplayId, organizations.displayId))
      )
      .where(eq(proposals.status, "sold"))
      .orderBy(desc(proposals.statusUpdatedAt));

    const allActivities = await db
      .select({
        companyType: activities.companyType,
        companyDisplayId: activities.companyDisplayId,
        contactId: activities.contactId,
        actionType: activities.actionType,
        createdAt: activities.createdAt,
      })
      .from(activities)
      .orderBy(desc(activities.createdAt));

    const lastActivityByCompany = new Map<
      string,
      { createdAt: string; actionType: string; contactId: string | null }
    >();
    for (const a of allActivities) {
      const key = `${a.companyType}:${a.companyDisplayId}`;
      if (!lastActivityByCompany.has(key)) {
        lastActivityByCompany.set(key, {
          createdAt: String(a.createdAt),
          actionType: a.actionType,
          contactId: a.contactId ?? null,
        });
      }
    }

    const contactIds = new Set<string>();
    for (const row of soldProposals) {
      const key = `${row.proposal.companyType}:${row.proposal.companyDisplayId}`;
      const last = lastActivityByCompany.get(key);
      if (last?.contactId) contactIds.add(last.contactId);
    }
    const contactList =
      contactIds.size > 0
        ? await db
            .select({ id: contacts.id, firstName: contacts.firstName, lastName: contacts.lastName })
            .from(contacts)
            .where(inArray(contacts.id, Array.from(contactIds)))
        : [];
    const contactMap = new Map(contactList.map((c) => [c.id, c]));

    const list = soldProposals
      .map((row) => {
        const key = `${row.proposal.companyType}:${row.proposal.companyDisplayId}`;
        const last = lastActivityByCompany.get(key);
        const contact = last?.contactId ? contactMap.get(last.contactId) : null;
        const companyName =
          row.proposal.companyType === "business"
            ? row.businessName ?? row.proposal.companyDisplayId
            : row.organizationName ?? row.proposal.companyDisplayId;
        const moneySpent =
          row.proposal.companyType === "business"
            ? row.moneySpentBiz != null
              ? Number(row.moneySpentBiz)
              : 0
            : row.moneySpentOrg != null
              ? Number(row.moneySpentOrg)
              : 0;
        const transactions =
          row.proposal.companyType === "business"
            ? row.transactionsBiz ?? 0
            : row.transactionsOrg ?? 0;
        const assignedTo = row.proposal.assignedTo ?? row.proposal.salesAgent;

        return {
          proposalId: row.proposal.id,
          companyType: row.proposal.companyType,
          companyDisplayId: row.proposal.companyDisplayId,
          companyName,
          moneySpent,
          transactions,
          dateLastSold: row.proposal.statusUpdatedAt ? String(row.proposal.statusUpdatedAt) : null,
          lastActivityAt: last?.createdAt ?? null,
          lastActivityType: last ? ACTION_LABELS[last.actionType] ?? last.actionType : null,
          lastContactFirstName: contact?.firstName ?? null,
          lastContactLastName: contact?.lastName ?? null,
          assignedTo: assignedTo ?? null,
        };
      })
      .filter((row) => row.companyType === "agency" || row.transactions >= 1);

    return NextResponse.json(list);
  } catch (err) {
    console.error("[api/all-clients GET]", err);
    return NextResponse.json([], { status: 200 });
  }
}
