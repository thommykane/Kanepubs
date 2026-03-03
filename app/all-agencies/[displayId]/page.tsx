import Link from "next/link";
import { eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { agencies, agencyClients, contacts, organizations, businesses } from "@/lib/db/schema";
import { normalizeWebsiteUrl } from "@/lib/normalize-website-url";
import AgencyProfileContent from "@/components/AgencyProfileContent";

type Props = { params: Promise<{ displayId: string }> };

export default async function AgencyDetailPage({ params }: Props) {
  const { displayId } = await params;

  let agency: (typeof agencies.$inferSelect) | null = null;
  try {
    const [row] = await db.select().from(agencies).where(eq(agencies.displayId, displayId)).limit(1);
    agency = row ?? null;
  } catch {
    const [agencyRow] = await db
      .select({
        id: agencies.id,
        displayId: agencies.displayId,
        agencyName: agencies.agencyName,
        address: agencies.address,
        addressLine2: agencies.addressLine2,
        city: agencies.city,
        state: agencies.state,
        zipCode: agencies.zipCode,
        phone: agencies.phone,
        website: agencies.website,
        createdBy: agencies.createdBy,
        assignedTo: agencies.assignedTo,
        createdAt: agencies.createdAt,
        updatedAt: agencies.updatedAt,
      })
      .from(agencies)
      .where(eq(agencies.displayId, displayId))
      .limit(1);
    agency = agencyRow
      ? { ...agencyRow, agencyType: null, tags: null, transactions: 0, moneySpent: "0" }
      : null;
  }

  if (!agency) {
    return (
      <div style={{ padding: "1.5rem" }}>
        <p style={{ color: "var(--gold-dim)" }}>Agency not found.</p>
        <Link href="/all-agencies" style={{ color: "var(--gold-bright)" }}>
          ← All Agencies
        </Link>
      </div>
    );
  }

  const clientRows = await db
    .select({ companyDisplayId: agencyClients.companyDisplayId, companyType: agencyClients.companyType })
    .from(agencyClients)
    .where(eq(agencyClients.agencyId, agency.id));

  const orgIds = clientRows.filter((c) => c.companyType === "org").map((c) => c.companyDisplayId);
  const bizIds = clientRows.filter((c) => c.companyType === "business").map((c) => c.companyDisplayId);

  const orgNames = new Map<string, string>();
  if (orgIds.length > 0) {
    const orgs = await db
      .select({ displayId: organizations.displayId, organizationName: organizations.organizationName })
      .from(organizations)
      .where(inArray(organizations.displayId, orgIds));
    for (const o of orgs) {
      if (o.displayId) orgNames.set(o.displayId, o.organizationName ?? o.displayId);
    }
  }
  const bizNames = new Map<string, string>();
  if (bizIds.length > 0) {
    const bizs = await db
      .select({ displayId: businesses.displayId, businessName: businesses.businessName })
      .from(businesses)
      .where(inArray(businesses.displayId, bizIds));
    for (const b of bizs) {
      if (b.displayId) bizNames.set(b.displayId, b.businessName ?? b.displayId);
    }
  }

  const clients = clientRows.map((c) => ({
    companyDisplayId: c.companyDisplayId,
    companyType: c.companyType,
    companyName:
      c.companyType === "org"
        ? orgNames.get(c.companyDisplayId) ?? c.companyDisplayId
        : bizNames.get(c.companyDisplayId) ?? c.companyDisplayId,
  }));

  const transactions = agency.transactions ?? 0;
  const moneySpentRaw = agency.moneySpent != null ? String(agency.moneySpent) : "0";

  const contactList = await db
    .select()
    .from(contacts)
    .where(eq(contacts.businessId, displayId));

  const infoStyle: React.CSSProperties = {
    marginBottom: "0.5rem",
    fontSize: "0.9375rem",
    color: "var(--gold-bright)",
  };
  const labelStyle: React.CSSProperties = {
    color: "var(--gold-dim)",
    marginRight: "0.5rem",
    fontSize: "0.875rem",
  };

  return (
    <AgencyProfileContent
      agencyDisplayId={displayId}
      clients={clients}
      contactList={contactList}
    >
      <div>
        <Link
          href="/all-agencies"
          style={{ color: "var(--gold-dim)", fontSize: "0.875rem", marginBottom: "0.5rem", display: "inline-block" }}
        >
          ← All Agencies
        </Link>
        <h1 style={{ color: "var(--gold-bright)", marginBottom: "1rem" }}>
          {agency.agencyName ?? "—"}
        </h1>
        <div
          style={{
            background: "var(--glass)",
            border: "1px solid var(--glass-border)",
            borderRadius: "8px",
            padding: "1rem 1.25rem",
          }}
        >
          <div style={infoStyle}>
            <span style={labelStyle}>ID</span>
            <span>{agency.displayId ?? "—"}</span>
          </div>
          <div style={infoStyle}>
            <span style={labelStyle}>Address</span>
            <span>{agency.address ?? "—"}</span>
          </div>
          {(agency.addressLine2 || agency.city || agency.state || agency.zipCode) && (
            <>
              {agency.addressLine2 && (
                <div style={infoStyle}>
                  <span style={labelStyle}>Suite</span>
                  <span>{agency.addressLine2}</span>
                </div>
              )}
              {agency.city && (
                <div style={infoStyle}>
                  <span style={labelStyle}>City</span>
                  <span>{agency.city}</span>
                </div>
              )}
              {agency.state && (
                <div style={infoStyle}>
                  <span style={labelStyle}>State</span>
                  <span>{agency.state}</span>
                </div>
              )}
              {agency.zipCode && (
                <div style={infoStyle}>
                  <span style={labelStyle}>Zip code</span>
                  <span>{agency.zipCode}</span>
                </div>
              )}
            </>
          )}
          <div style={infoStyle}>
            <span style={labelStyle}>Phone</span>
            <span>{agency.phone ?? "—"}</span>
          </div>
          <div style={infoStyle}>
            <span style={labelStyle}>Website</span>
            {agency.website ? (
              <a
                href={normalizeWebsiteUrl(agency.website) ?? agency.website ?? undefined}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: "#2563eb" }}
              >
                {normalizeWebsiteUrl(agency.website) ?? agency.website}
              </a>
            ) : (
              "—"
            )}
          </div>
          <div style={infoStyle}>
            <span style={labelStyle}>Type</span>
            <span>{agency.agencyType ?? "—"}</span>
          </div>
          <div style={infoStyle}>
            <span style={labelStyle}>Tags</span>
            <span>{agency.tags ?? "—"}</span>
          </div>
          <div style={infoStyle}>
            <span style={labelStyle}>Created by</span>
            <span>{agency.createdBy ?? "—"}</span>
          </div>
          <div style={infoStyle}>
            <span style={labelStyle}>Assigned to</span>
            <span>{agency.assignedTo ?? "—"}</span>
          </div>
          <div style={infoStyle}>
            <span style={labelStyle}>Transactions</span>
            <span>{transactions}</span>
          </div>
          <div style={infoStyle}>
            <span style={labelStyle}>Money Spent</span>
            <span style={{ color: "#39ff14", fontWeight: 700 }}>{formatMoney(moneySpentRaw)}</span>
          </div>
        </div>
      </div>
    </AgencyProfileContent>
  );
}

function formatMoney(val: string | null | undefined): string {
  if (val == null || val === "") return "0";
  const n = Number(val);
  if (Number.isNaN(n)) return "0";
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
