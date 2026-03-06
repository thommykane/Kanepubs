import { NextRequest, NextResponse } from "next/server";
import { eq, desc, and, or, inArray, gte, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  proposals,
  businesses,
  organizations,
  agencies,
  agencyClients,
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
        agencyName: agencies.agencyName,
        moneySpentBiz: businesses.moneySpent,
        moneySpentOrg: organizations.moneySpent,
        moneySpentAgency: agencies.moneySpent,
        transactionsBiz: businesses.transactions,
        transactionsOrg: organizations.transactions,
        transactionsAgency: agencies.transactions,
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
      .leftJoin(
        agencies,
        and(eq(proposals.companyType, "agency"), eq(proposals.companyDisplayId, agencies.displayId))
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

    // Source of truth for client totals: SOLD proposals
    const totalsByCompany = new Map<string, { transactions: number; moneySpent: number }>();
    for (const row of soldProposals) {
      const key = `${row.proposal.companyType}:${row.proposal.companyDisplayId}`;
      const current = totalsByCompany.get(key) ?? { transactions: 0, moneySpent: 0 };
      const amountNum = row.proposal.amount != null ? Number(row.proposal.amount) : 0;
      current.transactions += 1;
      current.moneySpent += Number.isFinite(amountNum) ? amountNum : 0;
      totalsByCompany.set(key, current);
    }

    const list = soldProposals
      .map((row) => {
        const key = `${row.proposal.companyType}:${row.proposal.companyDisplayId}`;
        const last = lastActivityByCompany.get(key);
        const contact = last?.contactId ? contactMap.get(last.contactId) : null;
        const companyName =
          row.proposal.companyType === "business"
            ? row.businessName ?? row.proposal.companyDisplayId
            : row.proposal.companyType === "org"
              ? row.organizationName ?? row.proposal.companyDisplayId
              : row.agencyName ?? row.proposal.companyDisplayId;
        const totals = totalsByCompany.get(key) ?? { transactions: 0, moneySpent: 0 };
        const moneySpent = totals.moneySpent;
        const transactions = totals.transactions;
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

    // Ensure agencies with 1+ transactions appear in All Clients,
    // even when legacy data is present outside normal proposal history.
    const agencyRows = await db
      .select({
        displayId: agencies.displayId,
        agencyName: agencies.agencyName,
        moneySpent: agencies.moneySpent,
        transactions: agencies.transactions,
        assignedTo: agencies.assignedTo,
      })
      .from(agencies)
      .where(gte(agencies.transactions, 1));
    const existingAgencyIds = new Set(
      list.filter((r) => r.companyType === "agency").map((r) => r.companyDisplayId)
    );
    for (const agency of agencyRows) {
      if (!agency.displayId || existingAgencyIds.has(agency.displayId)) continue;
      const key = `agency:${agency.displayId}`;
      const last = lastActivityByCompany.get(key);
      const contact = last?.contactId ? contactMap.get(last.contactId) : null;
      list.push({
        proposalId: `agency:${agency.displayId}`,
        companyType: "agency",
        companyDisplayId: agency.displayId,
        companyName: agency.agencyName ?? agency.displayId,
        moneySpent: agency.moneySpent != null ? Number(agency.moneySpent) : 0,
        transactions: agency.transactions ?? 0,
        dateLastSold: last?.createdAt ?? null,
        lastActivityAt: last?.createdAt ?? null,
        lastActivityType: last ? ACTION_LABELS[last.actionType] ?? last.actionType : null,
        lastContactFirstName: contact?.firstName ?? null,
        lastContactLastName: contact?.lastName ?? null,
        assignedTo: agency.assignedTo ?? "",
      });
    }

    // Normalize agency totals to match agency profile logic:
    // include agency direct SOLD + linked org/business SOLD,
    // with legacy sold activity fallback for older data.
    const agencyDisplayIds = new Set(
      list.filter((r) => r.companyType === "agency").map((r) => r.companyDisplayId).filter(Boolean)
    );
    const displayIdsToLoad = Array.from(agencyDisplayIds);
    if (displayIdsToLoad.length > 0) {
      const agencyMetaRows = await db
        .select({
          id: agencies.id,
          displayId: agencies.displayId,
          agencyName: agencies.agencyName,
          assignedTo: agencies.assignedTo,
        })
        .from(agencies)
        .where(inArray(agencies.displayId, displayIdsToLoad));

      const totalsByAgency = new Map<string, { transactions: number; moneySpent: number }>();
      for (const meta of agencyMetaRows) {
        if (!meta.displayId) continue;
        const clientRows = await db
          .select({
            companyDisplayId: agencyClients.companyDisplayId,
            companyType: agencyClients.companyType,
          })
          .from(agencyClients)
          .where(eq(agencyClients.agencyId, meta.id));

        const orgIds = clientRows.filter((c) => c.companyType === "org").map((c) => c.companyDisplayId);
        const bizIds = clientRows.filter((c) => c.companyType === "business").map((c) => c.companyDisplayId);
        const soldCompanyFilters = [
          and(eq(proposals.companyType, "agency"), eq(proposals.companyDisplayId, meta.displayId)),
        ];
        if (orgIds.length > 0) {
          soldCompanyFilters.push(
            and(eq(proposals.companyType, "org"), inArray(proposals.companyDisplayId, orgIds))
          );
        }
        if (bizIds.length > 0) {
          soldCompanyFilters.push(
            and(eq(proposals.companyType, "business"), inArray(proposals.companyDisplayId, bizIds))
          );
        }

        const [soldStats] = await db
          .select({
            transactions: sql<number>`count(*)::int`,
            moneySpent: sql<string>`coalesce(sum(${proposals.amount}), 0)::text`,
          })
          .from(proposals)
          .where(and(eq(proposals.status, "sold"), or(...soldCompanyFilters)));

        const soldAgencyActivities = await db
          .select({ proposalData: activities.proposalData })
          .from(activities)
          .where(
            and(
              eq(activities.companyType, "agency"),
              eq(activities.companyDisplayId, meta.displayId),
              eq(activities.actionType, "sold")
            )
          );
        const activityTransactions = soldAgencyActivities.length;
        const activityMoney = soldAgencyActivities.reduce((sum, row) => {
          const pd = row.proposalData as { amount?: string | number } | null;
          const amount = pd?.amount != null ? Number(pd.amount) : 0;
          return sum + (Number.isFinite(amount) ? amount : 0);
        }, 0);

        const proposalTransactions = soldStats?.transactions ?? 0;
        const proposalMoney = soldStats?.moneySpent != null ? Number(soldStats.moneySpent) : 0;
        totalsByAgency.set(meta.displayId, {
          transactions: Math.max(proposalTransactions, activityTransactions),
          moneySpent: Math.max(proposalMoney, activityMoney),
        });
      }

      for (const row of list) {
        if (row.companyType !== "agency") continue;
        const totals = totalsByAgency.get(row.companyDisplayId);
        if (!totals) continue;
        row.transactions = totals.transactions;
        row.moneySpent = totals.moneySpent;
      }
    }

    return NextResponse.json(
      list.filter((row) => row.companyType !== "agency" || row.transactions >= 1)
    );
  } catch (err) {
    console.error("[api/all-clients GET]", err);
    return NextResponse.json([], { status: 200 });
  }
}
