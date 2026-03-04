import Link from "next/link";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { businesses, contacts, proposals, agencyClients, agencies } from "@/lib/db/schema";
import { normalizeWebsiteUrl } from "@/lib/normalize-website-url";
import CompanyProfileContent from "@/components/CompanyProfileContent";

type Props = { params: Promise<{ displayId: string }> };

export default async function BusinessDetailPage({ params }: Props) {
  const { displayId } = await params;

  const [business] = await db
    .select()
    .from(businesses)
    .where(eq(businesses.displayId, displayId))
    .limit(1);

  if (!business) {
    return (
      <div style={{ padding: "1.5rem" }}>
        <p style={{ color: "var(--gold-dim)" }}>Business not found.</p>
        <Link href="/all-businesses" style={{ color: "var(--gold-bright)" }}>
          ← All Businesses
        </Link>
      </div>
    );
  }

  const [soldStats] = await db
    .select({
      transactions: sql<number>`count(*)::int`,
      moneySpent: sql<string>`coalesce(sum(${proposals.amount}), 0)::text`,
    })
    .from(proposals)
    .where(
      and(
        eq(proposals.status, "sold"),
        eq(proposals.companyType, "business"),
        eq(proposals.companyDisplayId, displayId)
      )
    );
  const transactions = soldStats?.transactions ?? 0;
  const moneySpentRaw = soldStats?.moneySpent ?? "0";

  const [agencyLink] = await db
    .select({ agencyDisplayId: agencies.displayId, agencyName: agencies.agencyName })
    .from(agencyClients)
    .innerJoin(agencies, eq(agencyClients.agencyId, agencies.id))
    .where(
      and(eq(agencyClients.companyType, "business"), eq(agencyClients.companyDisplayId, displayId))
    )
    .limit(1);

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
    <CompanyProfileContent
      contactList={contactList}
      companyType="business"
      companyDisplayId={displayId}
    >
      <div>
        <Link
          href="/all-businesses"
          style={{ color: "var(--gold-dim)", fontSize: "0.875rem", marginBottom: "0.5rem", display: "inline-block" }}
        >
          ← All Businesses
        </Link>
        <h1 style={{ color: "var(--gold-bright)", marginBottom: "1rem" }}>
          {business.businessName ?? "—"}
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
            <span>{business.displayId ?? "—"}</span>
          </div>
          <div style={infoStyle}>
            <span style={labelStyle}>Address</span>
            <span>{business.address ?? "—"}</span>
          </div>
          {(business.addressLine2 || business.city || business.state || business.zipCode || business.county) && (
            <>
              {business.addressLine2 && (
                <div style={infoStyle}>
                  <span style={labelStyle}>Apt / PO Box</span>
                  <span>{business.addressLine2}</span>
                </div>
              )}
              {business.city && (
                <div style={infoStyle}>
                  <span style={labelStyle}>City</span>
                  <span>{business.city}</span>
                </div>
              )}
              {business.state && (
                <div style={infoStyle}>
                  <span style={labelStyle}>State</span>
                  <span>{business.state}</span>
                </div>
              )}
              {business.zipCode && (
                <div style={infoStyle}>
                  <span style={labelStyle}>Zip code</span>
                  <span>{business.zipCode}</span>
                </div>
              )}
              {business.county && (
                <div style={infoStyle}>
                  <span style={labelStyle}>County</span>
                  <span>{business.county}</span>
                </div>
              )}
            </>
          )}
          <div style={infoStyle}>
            <span style={labelStyle}>Phone</span>
            <span>{business.phone ?? "—"}</span>
          </div>
          <div style={infoStyle}>
            <span style={labelStyle}>Website</span>
            {business.website ? (
              <a
                href={normalizeWebsiteUrl(business.website) ?? business.website ?? undefined}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: "#2563eb" }}
              >
                {normalizeWebsiteUrl(business.website) ?? business.website}
              </a>
            ) : (
              "—"
            )}
          </div>
          <div style={infoStyle}>
            <span style={labelStyle}>Type</span>
            <span>{business.businessType ?? "—"}</span>
          </div>
          <div style={infoStyle}>
            <span style={labelStyle}>Tags</span>
            <span>{business.tags ?? "—"}</span>
          </div>
          <div style={infoStyle}>
            <span style={labelStyle}>Created by</span>
            <span>{business.createdBy ?? "—"}</span>
          </div>
          <div style={infoStyle}>
            <span style={labelStyle}>Assigned to</span>
            <span>{business.assignedTo ?? "—"}</span>
          </div>
          <div style={infoStyle}>
            <span style={labelStyle}>Transactions</span>
            <span>{transactions}</span>
          </div>
          <div style={infoStyle}>
            <span style={labelStyle}>Money Spent</span>
            <span style={{ color: "#39ff14", fontWeight: 700 }}>{formatMoney(moneySpentRaw)}</span>
          </div>
          {agencyLink && (
            <div style={infoStyle}>
              <span style={labelStyle}>Agency</span>
              <Link
                href={`/all-agencies/${agencyLink.agencyDisplayId ?? ""}`}
                style={{ color: "var(--gold-bright)", textDecoration: "underline" }}
              >
                {agencyLink.agencyName ?? agencyLink.agencyDisplayId ?? "—"}
              </Link>
              {" "}
              <Link
                href={`/new-agency?linkCompany=${encodeURIComponent(displayId)}&linkType=business&fromAgency=${encodeURIComponent(agencyLink.agencyDisplayId ?? "")}`}
                style={{
                  fontSize: "0.8rem",
                  padding: "0.2rem 0.5rem",
                  background: "var(--glass)",
                  border: "1px solid var(--glass-border)",
                  borderRadius: "4px",
                  color: "var(--gold-dim)",
                  textDecoration: "none",
                }}
              >
                Update
              </Link>
            </div>
          )}
        </div>
      </div>
    </CompanyProfileContent>
  );
}

function formatMoney(val: string | null | undefined): string {
  if (val == null || val === "") return "0";
  const n = Number(val);
  if (Number.isNaN(n)) return "0";
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
