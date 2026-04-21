import { eq, desc, and, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { proposals, contacts, businesses, organizations, agencies } from "@/lib/db/schema";

export type ProposalStatus = "proposal" | "io" | "sold";

type ProposalRowBase = {
  proposal: typeof proposals.$inferSelect;
  contact: typeof contacts.$inferSelect | null;
  businessName: string | null;
  organizationName: string | null;
  agencyName: string | null;
};

export type ProposalRowWithRegarding = ProposalRowBase & {
  regardingOrganizationName: string | null;
  regardingBusinessName: string | null;
};

/** Same rows as GET /api/proposals?status=… (joins contacts + company names). Used by /sold and admin dashboard so totals match. */
export async function getProposalRowsByStatus(status: ProposalStatus): Promise<ProposalRowWithRegarding[]> {
  const rows = await db
    .select({
      proposal: proposals,
      contact: contacts,
      businessName: businesses.businessName,
      organizationName: organizations.organizationName,
      agencyName: agencies.agencyName,
    })
    .from(proposals)
    .leftJoin(contacts, eq(proposals.contactId, contacts.id))
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
    .where(eq(proposals.status, status))
    .orderBy(desc(status === "sold" ? proposals.statusUpdatedAt : proposals.createdAt));

  const regardingIds = [
    ...new Set(
      rows
        .map((r) => r.proposal.regardingClientDisplayId)
        .filter((x): x is string => x != null && String(x).trim() !== "")
        .map((x) => String(x).trim())
    ),
  ];
  if (regardingIds.length === 0) {
    return rows.map((r) => ({
      ...r,
      regardingOrganizationName: null,
      regardingBusinessName: null,
    }));
  }

  const [orgRows, bizRows] = await Promise.all([
    db
      .select({ displayId: organizations.displayId, organizationName: organizations.organizationName })
      .from(organizations)
      .where(inArray(organizations.displayId, regardingIds)),
    db
      .select({ displayId: businesses.displayId, businessName: businesses.businessName })
      .from(businesses)
      .where(inArray(businesses.displayId, regardingIds)),
  ]);
  const orgNameById = new Map(orgRows.map((o) => [o.displayId, o.organizationName]));
  const bizNameById = new Map(bizRows.map((b) => [b.displayId, b.businessName]));

  return rows.map((r) => {
    const id = r.proposal.regardingClientDisplayId?.trim() ?? "";
    return {
      ...r,
      regardingOrganizationName: id ? orgNameById.get(id) ?? null : null,
      regardingBusinessName: id ? bizNameById.get(id) ?? null : null,
    };
  });
}
