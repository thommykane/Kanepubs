import { NextRequest, NextResponse } from "next/server";
import { eq, desc, or, and, inArray, sql } from "drizzle-orm";
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
    const normalizeCompanyType = (value: string | null | undefined): "org" | "business" | "agency" | null => {
      const t = String(value ?? "").trim().toLowerCase();
      if (t === "org" || t === "organization") return "org";
      if (t === "business" || t === "biz") return "business";
      if (t === "agency") return "agency";
      return null;
    };

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
      .where(
        and(
          eq(proposals.status, "sold"),
          or(
            and(eq(proposals.companyType, "business"), eq(businesses.assignedTo, current.username)),
            and(eq(proposals.companyType, "org"), eq(organizations.assignedTo, current.username)),
            and(eq(proposals.companyType, "agency"), eq(agencies.assignedTo, current.username))
          )
        )
      )
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
      const displayId = row.proposal.companyDisplayId ?? "";
      const normalizedType = normalizeCompanyType(row.proposal.companyType);
      if (!displayId || !normalizedType) continue;
      const key = `${normalizedType}:${displayId}`;
      const current = totalsByCompany.get(key) ?? { transactions: 0, moneySpent: 0 };
      const amountNum = row.proposal.amount != null ? Number(row.proposal.amount) : 0;
      current.transactions += 1;
      current.moneySpent += Number.isFinite(amountNum) ? amountNum : 0;
      totalsByCompany.set(key, current);
    }

    const list = soldProposals.map((row) => {
      const normalizedType = normalizeCompanyType(row.proposal.companyType) ?? row.proposal.companyType;
      const key = `${normalizedType}:${row.proposal.companyDisplayId}`;
      const last = lastActivityByCompany.get(key);
      const contact = last?.contactId ? contactMap.get(last.contactId) : null;
      const companyName =
        normalizedType === "business"
          ? row.businessName ?? row.proposal.companyDisplayId
          : normalizedType === "org"
            ? row.organizationName ?? row.proposal.companyDisplayId
            : row.agencyName ?? row.proposal.companyDisplayId;
      const totals = totalsByCompany.get(key) ?? { transactions: 0, moneySpent: 0 };
      const moneySpent = totals.moneySpent;
      const transactions = totals.transactions;

      return {
        proposalId: row.proposal.id,
        companyType: normalizedType,
        companyDisplayId: row.proposal.companyDisplayId,
        companyName,
        moneySpent,
        transactions,
        dateLastSold: row.proposal.statusUpdatedAt ? String(row.proposal.statusUpdatedAt) : null,
        lastActivityAt: last?.createdAt ?? null,
        lastActivityType: last ? ACTION_LABELS[last.actionType] ?? last.actionType : null,
        lastContactFirstName: contact?.firstName ?? null,
        lastContactLastName: contact?.lastName ?? null,
      };
    });

    // Fallback for legacy data: include assigned entities that have tx/money
    // even if sold proposals table is incomplete.
    const existingKeys = new Set(list.map((r) => `${r.companyType}:${r.companyDisplayId}`));
    const assignedOrgs = await db
      .select({
        displayId: organizations.displayId,
        organizationName: organizations.organizationName,
        transactions: organizations.transactions,
        moneySpent: organizations.moneySpent,
      })
      .from(organizations)
      .where(eq(organizations.assignedTo, current.username));
    for (const org of assignedOrgs) {
      if (!org.displayId) continue;
      const tx = org.transactions ?? 0;
      const money = org.moneySpent != null ? Number(org.moneySpent) : 0;
      if (tx < 1 && money <= 0) continue;
      const key = `org:${org.displayId}`;
      if (existingKeys.has(key)) continue;
      const last = lastActivityByCompany.get(key);
      const contact = last?.contactId ? contactMap.get(last.contactId) : null;
      list.push({
        proposalId: `org:${org.displayId}`,
        companyType: "org",
        companyDisplayId: org.displayId,
        companyName: org.organizationName ?? org.displayId,
        moneySpent: money,
        transactions: tx,
        dateLastSold: last?.createdAt ?? null,
        lastActivityAt: last?.createdAt ?? null,
        lastActivityType: last ? ACTION_LABELS[last.actionType] ?? last.actionType : null,
        lastContactFirstName: contact?.firstName ?? null,
        lastContactLastName: contact?.lastName ?? null,
      });
      existingKeys.add(key);
    }

    const assignedBiz = await db
      .select({
        displayId: businesses.displayId,
        businessName: businesses.businessName,
        transactions: businesses.transactions,
        moneySpent: businesses.moneySpent,
      })
      .from(businesses)
      .where(eq(businesses.assignedTo, current.username));
    for (const biz of assignedBiz) {
      if (!biz.displayId) continue;
      const tx = biz.transactions ?? 0;
      const money = biz.moneySpent != null ? Number(biz.moneySpent) : 0;
      if (tx < 1 && money <= 0) continue;
      const key = `business:${biz.displayId}`;
      if (existingKeys.has(key)) continue;
      const last = lastActivityByCompany.get(key);
      const contact = last?.contactId ? contactMap.get(last.contactId) : null;
      list.push({
        proposalId: `business:${biz.displayId}`,
        companyType: "business",
        companyDisplayId: biz.displayId,
        companyName: biz.businessName ?? biz.displayId,
        moneySpent: money,
        transactions: tx,
        dateLastSold: last?.createdAt ?? null,
        lastActivityAt: last?.createdAt ?? null,
        lastActivityType: last ? ACTION_LABELS[last.actionType] ?? last.actionType : null,
        lastContactFirstName: contact?.firstName ?? null,
        lastContactLastName: contact?.lastName ?? null,
      });
      existingKeys.add(key);
    }

    const assignedAgency = await db
      .select({
        displayId: agencies.displayId,
        agencyName: agencies.agencyName,
        transactions: agencies.transactions,
        moneySpent: agencies.moneySpent,
      })
      .from(agencies)
      .where(eq(agencies.assignedTo, current.username));
    for (const agency of assignedAgency) {
      if (!agency.displayId) continue;
      const tx = agency.transactions ?? 0;
      const money = agency.moneySpent != null ? Number(agency.moneySpent) : 0;
      if (tx < 1 && money <= 0) continue;
      const key = `agency:${agency.displayId}`;
      if (existingKeys.has(key)) continue;
      const last = lastActivityByCompany.get(key);
      const contact = last?.contactId ? contactMap.get(last.contactId) : null;
      list.push({
        proposalId: `agency:${agency.displayId}`,
        companyType: "agency",
        companyDisplayId: agency.displayId,
        companyName: agency.agencyName ?? agency.displayId,
        moneySpent: money,
        transactions: tx,
        dateLastSold: last?.createdAt ?? null,
        lastActivityAt: last?.createdAt ?? null,
        lastActivityType: last ? ACTION_LABELS[last.actionType] ?? last.actionType : null,
        lastContactFirstName: contact?.firstName ?? null,
        lastContactLastName: contact?.lastName ?? null,
      });
      existingKeys.add(key);
    }

    // Ensure assigned agencies move into My Clients when agency or any linked
    // org/business has transacted business.
    const assignedAgencyMeta = await db
      .select({
        id: agencies.id,
        displayId: agencies.displayId,
        agencyName: agencies.agencyName,
      })
      .from(agencies)
      .where(eq(agencies.assignedTo, current.username));
    for (const agency of assignedAgencyMeta) {
      if (!agency.displayId) continue;
      const linked = await db
        .select({
          companyDisplayId: agencyClients.companyDisplayId,
          companyType: agencyClients.companyType,
        })
        .from(agencyClients)
        .where(eq(agencyClients.agencyId, agency.id));
      const orgIds = linked.filter((c) => c.companyType === "org").map((c) => c.companyDisplayId);
      const bizIds = linked.filter((c) => c.companyType === "business").map((c) => c.companyDisplayId);
      const soldCompanyFilters = [
        and(eq(proposals.companyType, "agency"), eq(proposals.companyDisplayId, agency.displayId)),
      ];
      if (orgIds.length > 0) {
        soldCompanyFilters.push(and(eq(proposals.companyType, "org"), inArray(proposals.companyDisplayId, orgIds)));
      }
      if (bizIds.length > 0) {
        soldCompanyFilters.push(and(eq(proposals.companyType, "business"), inArray(proposals.companyDisplayId, bizIds)));
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
            eq(activities.companyDisplayId, agency.displayId),
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
      const transactions = Math.max(proposalTransactions, activityTransactions);
      const moneySpent = Math.max(proposalMoney, activityMoney);
      if (transactions < 1 && moneySpent <= 0) continue;

      const key = `agency:${agency.displayId}`;
      const existingIdx = list.findIndex((row) => row.companyType === "agency" && row.companyDisplayId === agency.displayId);
      if (existingIdx >= 0) {
        list[existingIdx].transactions = transactions;
        list[existingIdx].moneySpent = moneySpent;
      } else {
        const last = lastActivityByCompany.get(key);
        const contact = last?.contactId ? contactMap.get(last.contactId) : null;
        list.push({
          proposalId: `agency:${agency.displayId}`,
          companyType: "agency",
          companyDisplayId: agency.displayId,
          companyName: agency.agencyName ?? agency.displayId,
          moneySpent,
          transactions,
          dateLastSold: last?.createdAt ?? null,
          lastActivityAt: last?.createdAt ?? null,
          lastActivityType: last ? ACTION_LABELS[last.actionType] ?? last.actionType : null,
          lastContactFirstName: contact?.firstName ?? null,
          lastContactLastName: contact?.lastName ?? null,
        });
      }
      existingKeys.add(key);
    }

    return NextResponse.json(list.filter((row) => row.transactions >= 1 || row.moneySpent > 0));
  } catch (err) {
    console.error("[api/my-clients GET]", err);
    return NextResponse.json([], { status: 200 });
  }
}

/** Parse All Clients row id: either a proposal UUID or synthetic "org:X" | "business:X" | "agency:X" */
function parseClientId(id: string): { type: "proposal"; id: string } | { type: "company"; companyType: "org" | "business" | "agency"; displayId: string } | null {
  const s = String(id).trim();
  if (!s) return null;
  if (s.includes(":")) {
    const [prefix, ...rest] = s.split(":");
    const displayId = rest.join(":").trim();
    if (prefix === "org" && displayId) return { type: "company", companyType: "org", displayId };
    if (prefix === "business" && displayId) return { type: "company", companyType: "business", displayId };
    if (prefix === "agency" && displayId) return { type: "company", companyType: "agency", displayId };
    return null;
  }
  return { type: "proposal", id: s };
}

export async function PATCH(req: NextRequest) {
  try {
    const current = await getCurrentUser(req);
    if (!current) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!current.isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await req.json();
    const { proposalIds, assignedTo } = body;
    if (!Array.isArray(proposalIds) || proposalIds.length === 0 || typeof assignedTo !== "string" || !assignedTo.trim()) {
      return NextResponse.json(
        { error: "proposalIds (array) and assignedTo (string) required" },
        { status: 400 }
      );
    }

    const assignTo = assignedTo.trim();
    const proposalIdsOnly: string[] = [];
    const companyKeys: { companyType: "org" | "business" | "agency"; displayId: string }[] = [];
    const seenCompanyKey = new Set<string>();

    for (const id of proposalIds) {
      const parsed = parseClientId(id);
      if (!parsed) continue;
      if (parsed.type === "proposal") {
        proposalIdsOnly.push(parsed.id);
      } else {
        const key = `${parsed.companyType}:${parsed.displayId}`;
        if (!seenCompanyKey.has(key)) {
          seenCompanyKey.add(key);
          companyKeys.push({ companyType: parsed.companyType, displayId: parsed.displayId });
        }
      }
    }

    // 1) Update by real proposal IDs (batch)
    if (proposalIdsOnly.length > 0) {
      await db
        .update(proposals)
        .set({ assignedTo: assignTo })
        .where(and(eq(proposals.status, "sold"), inArray(proposals.id, proposalIdsOnly)));
    }

    // 2) Update by company (synthetic ids): proposals + org/biz/agency + contacts
    for (const { companyType, displayId } of companyKeys) {
      await db
        .update(proposals)
        .set({ assignedTo: assignTo })
        .where(
          and(
            eq(proposals.status, "sold"),
            eq(proposals.companyType, companyType),
            eq(proposals.companyDisplayId, displayId)
          )
        );

      if (companyType === "org") {
        await db.update(organizations).set({ assignedTo: assignTo }).where(eq(organizations.displayId, displayId));
      } else if (companyType === "business") {
        await db.update(businesses).set({ assignedTo: assignTo }).where(eq(businesses.displayId, displayId));
      } else {
        await db.update(agencies).set({ assignedTo: assignTo }).where(eq(agencies.displayId, displayId));
      }

      await db.update(contacts).set({ assignedTo: assignTo }).where(eq(contacts.businessId, displayId));
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[api/my-clients PATCH]", err);
    return NextResponse.json({ error: "Failed to assign" }, { status: 500 });
  }
}
