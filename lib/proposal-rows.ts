import { eq, desc, and } from "drizzle-orm";
import { db } from "@/lib/db";
import { proposals, contacts, businesses, organizations, agencies } from "@/lib/db/schema";

export type ProposalStatus = "proposal" | "io" | "sold";

/** Same rows as GET /api/proposals?status=… (joins contacts + company names). Used by /sold and admin dashboard so totals match. */
export async function getProposalRowsByStatus(status: ProposalStatus) {
  return db
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
}
