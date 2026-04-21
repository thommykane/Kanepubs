import { eq, and } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  organizations,
  businesses,
  contacts,
  agencies,
  agencyClients,
} from "@/lib/db/schema";

export async function assignOrgBusinessAndContactsToAgent(
  companyDisplayId: string,
  companyType: "org" | "business",
  agentUsername: string
): Promise<void> {
  if (companyType === "org") {
    await db
      .update(organizations)
      .set({ assignedTo: agentUsername })
      .where(eq(organizations.displayId, companyDisplayId));
  } else {
    await db
      .update(businesses)
      .set({ assignedTo: agentUsername })
      .where(eq(businesses.displayId, companyDisplayId));
  }
  await db.update(contacts).set({ assignedTo: agentUsername }).where(eq(contacts.businessId, companyDisplayId));
}

/** Returns companyType for a client linked to this agency, or null if not linked. */
export async function getAgencyClientLinkType(
  agencyDisplayId: string,
  clientDisplayId: string
): Promise<"org" | "business" | null> {
  const [row] = await db
    .select({ companyType: agencyClients.companyType })
    .from(agencyClients)
    .innerJoin(agencies, eq(agencyClients.agencyId, agencies.id))
    .where(
      and(
        eq(agencies.displayId, agencyDisplayId),
        eq(agencyClients.companyDisplayId, clientDisplayId)
      )
    )
    .limit(1);
  if (!row) return null;
  const t = String(row.companyType).toLowerCase();
  if (t === "org") return "org";
  if (t === "business") return "business";
  return null;
}

/** Sets agency.assignedTo and every org/business (+ contacts) listed in agency_clients. */
export async function firstContactIdForCompany(businessId: string): Promise<string | null> {
  const [c] = await db
    .select({ id: contacts.id })
    .from(contacts)
    .where(eq(contacts.businessId, businessId))
    .limit(1);
  return c?.id ?? null;
}

export async function assignAgencyAndAllLinkedClientsToAgent(
  agencyDisplayId: string,
  agentUsername: string
): Promise<void> {
  const [a] = await db
    .select({ id: agencies.id })
    .from(agencies)
    .where(eq(agencies.displayId, agencyDisplayId))
    .limit(1);
  if (!a) return;

  await db.update(agencies).set({ assignedTo: agentUsername }).where(eq(agencies.id, a.id));

  const links = await db
    .select({
      companyDisplayId: agencyClients.companyDisplayId,
      companyType: agencyClients.companyType,
    })
    .from(agencyClients)
    .where(eq(agencyClients.agencyId, a.id));

  for (const link of links) {
    const t = String(link.companyType).toLowerCase();
    if (t !== "org" && t !== "business") continue;
    await assignOrgBusinessAndContactsToAgent(
      link.companyDisplayId,
      t as "org" | "business",
      agentUsername
    );
  }
}
