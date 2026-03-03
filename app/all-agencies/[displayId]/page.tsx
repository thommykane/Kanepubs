import Link from "next/link";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { agencies, agencyClients, contacts } from "@/lib/db/schema";
import { normalizeWebsiteUrl } from "@/lib/normalize-website-url";
import AgencyProfileContent from "@/components/AgencyProfileContent";

type Props = { params: Promise<{ displayId: string }> };

export default async function AgencyDetailPage({ params }: Props) {
  const { displayId } = await params;

  const [agency] = await db.select().from(agencies).where(eq(agencies.displayId, displayId)).limit(1);

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

  const clients = await db
    .select({ companyDisplayId: agencyClients.companyDisplayId, companyType: agencyClients.companyType })
    .from(agencyClients)
    .where(eq(agencyClients.agencyId, agency.id));

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
            <span style={labelStyle}>Assigned to</span>
            <span>{agency.assignedTo ?? "—"}</span>
          </div>
        </div>
      </div>
    </AgencyProfileContent>
  );
}
