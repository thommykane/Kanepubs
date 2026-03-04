import Link from "next/link";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { organizations, contacts, proposals } from "@/lib/db/schema";
import { normalizeWebsiteUrl } from "@/lib/normalize-website-url";
import CompanyProfileContent from "@/components/CompanyProfileContent";

type Props = { params: Promise<{ displayId: string }> };

export default async function OrganizationDetailPage({ params }: Props) {
  const { displayId } = await params;

  const [org] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.displayId, displayId))
    .limit(1);

  if (!org) {
    return (
      <div style={{ padding: "1.5rem" }}>
        <p style={{ color: "var(--gold-dim)" }}>Organization not found.</p>
        <Link href="/all-organizations" style={{ color: "var(--gold-bright)" }}>
          ← All Organizations
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
        eq(proposals.companyType, "org"),
        eq(proposals.companyDisplayId, displayId)
      )
    );
  const transactions = soldStats?.transactions ?? 0;
  const moneySpentRaw = soldStats?.moneySpent ?? "0";

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
      companyType="org"
      companyDisplayId={displayId}
    >
      <div>
        <Link
          href="/all-organizations"
          style={{ color: "var(--gold-dim)", fontSize: "0.875rem", marginBottom: "0.5rem", display: "inline-block" }}
        >
          ← All Organizations
        </Link>
        <h1 style={{ color: "var(--gold-bright)", marginBottom: "1rem" }}>
          {org.organizationName ?? "—"}
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
            <span>{org.displayId ?? "—"}</span>
          </div>
          <div style={infoStyle}>
            <span style={labelStyle}>Address</span>
            <span>{org.address ?? "—"}</span>
          </div>
          {(org.addressLine2 || org.city || org.state || org.zipCode || org.county) && (
            <>
              {org.addressLine2 && (
                <div style={infoStyle}>
                  <span style={labelStyle}>Apt / PO Box</span>
                  <span>{org.addressLine2}</span>
                </div>
              )}
              {org.city && (
                <div style={infoStyle}>
                  <span style={labelStyle}>City</span>
                  <span>{org.city}</span>
                </div>
              )}
              {org.state && (
                <div style={infoStyle}>
                  <span style={labelStyle}>State</span>
                  <span>{org.state}</span>
                </div>
              )}
              {org.zipCode && (
                <div style={infoStyle}>
                  <span style={labelStyle}>Zip code</span>
                  <span>{org.zipCode}</span>
                </div>
              )}
              {org.county && (
                <div style={infoStyle}>
                  <span style={labelStyle}>County</span>
                  <span>{org.county}</span>
                </div>
              )}
            </>
          )}
          <div style={infoStyle}>
            <span style={labelStyle}>Time zone</span>
            <span>{org.timeZone ?? "—"}</span>
          </div>
          <div style={infoStyle}>
            <span style={labelStyle}>Phone</span>
            <span>{org.phone ?? "—"}</span>
          </div>
          <div style={infoStyle}>
            <span style={labelStyle}>Website</span>
            {org.website ? (
              <a
                href={normalizeWebsiteUrl(org.website) ?? org.website ?? undefined}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: "#2563eb" }}
              >
                {normalizeWebsiteUrl(org.website) ?? org.website}
              </a>
            ) : (
              "—"
            )}
          </div>
          <div style={infoStyle}>
            <span style={labelStyle}>Type</span>
            <span>{org.organizationType ?? "—"}</span>
          </div>
          <div style={infoStyle}>
            <span style={labelStyle}>Tags</span>
            <span>{org.tags ?? "—"}</span>
          </div>
          <div style={infoStyle}>
            <span style={labelStyle}>Created by</span>
            <span>{org.createdBy ?? "—"}</span>
          </div>
          <div style={infoStyle}>
            <span style={labelStyle}>Assigned to</span>
            <span>{org.assignedTo ?? "—"}</span>
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
    </CompanyProfileContent>
  );
}

function formatMoney(val: string | null | undefined): string {
  if (val == null || val === "") return "0";
  const n = Number(val);
  if (Number.isNaN(n)) return "0";
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
