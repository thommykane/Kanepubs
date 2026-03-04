"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const STATE_LABELS: Record<string, string> = {
  AL: "Alabama", AK: "Alaska", AZ: "Arizona", AR: "Arkansas", CA: "California", CO: "Colorado",
  CT: "Connecticut", DE: "Delaware", FL: "Florida", GA: "Georgia", HI: "Hawaii", ID: "Idaho",
  IL: "Illinois", IN: "Indiana", IA: "Iowa", KS: "Kansas", KY: "Kentucky", LA: "Louisiana",
  ME: "Maine", MD: "Maryland", MA: "Massachusetts", MI: "Michigan", MN: "Minnesota", MS: "Mississippi",
  MO: "Missouri", MT: "Montana", NE: "Nebraska", NV: "Nevada", NH: "New Hampshire", NJ: "New Jersey",
  NM: "New Mexico", NY: "New York", NC: "North Carolina", ND: "North Dakota", OH: "Ohio", OK: "Oklahoma",
  OR: "Oregon", PA: "Pennsylvania", RI: "Rhode Island", SC: "South Carolina", SD: "South Dakota",
  TN: "Tennessee", TX: "Texas", UT: "Utah", VT: "Vermont", VA: "Virginia", WA: "Washington",
  WV: "West Virginia", WI: "Wisconsin", WY: "Wyoming",
};

type AgentRow = {
  username: string;
  totalActivity: number;
  avgDailyActivity: number;
  salesCount: number;
  salesDollars: number;
  totalProposals: number;
  totalIos: number;
  pctProposalsToIo: number;
  pctIoToSold: number;
  totalCommissions: number;
};

type DashboardData = {
  totalSalesCount: number;
  totalSalesDollars: number;
  dealsByYear: Record<number, { count: number; dollars: number }>;
  pctProposalsToIo2026: number;
  pctIoToSold2026: number;
  totalProposals: number;
  pctProposalsToIo: number;
  pctIoToSold: number;
  agentsData: AgentRow[];
  orgSalesCount: number;
  orgSalesDollars: number;
  bizSalesCount: number;
  bizSalesDollars: number;
  agencySalesCount: number;
  agencySalesDollars: number;
  salesByOrgType: Record<string, { count: number; dollars: number }>;
  salesByBizType: Record<string, { count: number; dollars: number }>;
  organizationTypes: string[];
  businessTypes: string[];
  stateList: string[];
  salesByState: Record<string, { count: number; dollars: number }>;
  totalSalesForPct: number;
  dealsByMonth: { month: string; count: number; pctOfAll: number }[];
};

const sectionStyle: React.CSSProperties = {
  marginBottom: "2rem",
  background: "var(--glass)",
  border: "1px solid var(--glass-border)",
  borderRadius: "8px",
  padding: "1rem 1.25rem",
};
const tableStyle: React.CSSProperties = { width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" };
const thStyle: React.CSSProperties = { textAlign: "left", padding: "0.5rem", borderBottom: "1px solid var(--glass-border)", color: "var(--gold-dim)" };
const tdStyle: React.CSSProperties = { padding: "0.5rem", borderBottom: "1px solid rgba(255,255,255,0.06)", color: "var(--gold-bright)" };

function fmtNum(n: number) {
  return n.toLocaleString("en-US", { maximumFractionDigits: 0 });
}
function fmtDollars(n: number) {
  return "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmtPct(n: number) {
  return n.toFixed(1) + "%";
}
function fmtAvg(n: number) {
  return n.toFixed(1);
}

export default function AdminDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      try {
        const meRes = await fetch("/api/me");
        const meJson = await meRes.json();
        if (!meJson?.user?.isAdmin) {
          if (!cancelled) setForbidden(true);
          return;
        }
        const res = await fetch("/api/admin/dashboard");
        if (res.status === 403) {
          if (!cancelled) setForbidden(true);
          return;
        }
        const json = await res.json();
        if (!cancelled) setData(json);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    run();
    return () => { cancelled = true; };
  }, []);

  if (loading) return <div style={{ padding: "1rem", color: "var(--gold-dim)" }}>Loading…</div>;
  if (forbidden || !data) {
    return (
      <div style={{ padding: "1rem" }}>
        <p style={{ color: "var(--gold-dim)" }}>You must be an admin to view this page.</p>
        <Link href="/" style={{ color: "var(--gold-bright)" }}>Go home</Link>
      </div>
    );
  }

  const totalSales = data.totalSalesForPct || 1;

  return (
    <div style={{ width: "100%", padding: "1rem 0" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1rem" }}>
        <Link href="/u/Admin" style={{ color: "var(--gold-bright)", fontSize: "0.9rem" }}>← Profile</Link>
        <h1 style={{ color: "var(--gold-bright)", margin: 0 }}>Admin Dashboard</h1>
      </div>

      <div style={sectionStyle}>
        <h2 style={{ color: "var(--gold-bright)", fontSize: "1rem", marginBottom: "0.75rem" }}>Totals</h2>
        <p style={{ color: "var(--gold-bright)", marginBottom: "0.25rem" }}><strong>Total Deals of All Time:</strong> {fmtNum(data.totalSalesCount)}</p>
        <p style={{ color: "var(--gold-bright)", marginBottom: "0.5rem" }}><strong>Total Sales Revenue:</strong> {fmtDollars(data.totalSalesDollars)}</p>
        {([2025, 2024, 2023, 2022, 2021] as const).map((y) => {
          const row = data.dealsByYear?.[y] ?? { count: 0, dollars: 0 };
          return (
            <p key={y} style={{ color: "var(--gold-bright)", marginBottom: "0.25rem" }}>
              <strong>Total Deals {y}:</strong> {fmtNum(row.count)} &nbsp; <strong>Total Revenue {y}:</strong> {fmtDollars(row.dollars)}
            </p>
          );
        })}
        <p style={{ color: "var(--gold-dim)", fontSize: "0.9rem", marginTop: "0.75rem" }}><strong>Conversions (2026 only)</strong></p>
        <p style={{ color: "var(--gold-bright)" }}>Total % of proposals converted to sent I/O&apos;s: {fmtPct(data.pctProposalsToIo2026 ?? 0)}</p>
        <p style={{ color: "var(--gold-bright)" }}>Total % of I/O&apos;s converted to SOLD: {fmtPct(data.pctIoToSold2026 ?? 0)}</p>
      </div>

      <div style={sectionStyle}>
        <h2 style={{ color: "var(--gold-bright)", fontSize: "1rem", marginBottom: "0.75rem" }}>Totals by Agent</h2>
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thStyle}>Agent</th>
              <th style={thStyle}>Total Activity</th>
              <th style={thStyle}>AVG Daily Activity</th>
              <th style={thStyle}>Sales #</th>
              <th style={thStyle}>Sales ($)</th>
              <th style={thStyle}>Total Proposals</th>
              <th style={thStyle}>Total I/O&apos;s</th>
              <th style={thStyle}>% Proposals → I/O</th>
              <th style={thStyle}>% I/O → SOLD</th>
              <th style={thStyle}>Total Commissions</th>
            </tr>
          </thead>
          <tbody>
            {data.agentsData.map((a) => (
              <tr key={a.username}>
                <td style={tdStyle}>{a.username}</td>
                <td style={tdStyle}>{fmtNum(a.totalActivity)}</td>
                <td style={tdStyle}>{fmtAvg(a.avgDailyActivity)}</td>
                <td style={tdStyle}>{fmtNum(a.salesCount)}</td>
                <td style={tdStyle}>{fmtDollars(a.salesDollars)}</td>
                <td style={tdStyle}>{fmtNum(a.totalProposals)}</td>
                <td style={tdStyle}>{fmtNum(a.totalIos)}</td>
                <td style={tdStyle}>{fmtPct(a.pctProposalsToIo)}</td>
                <td style={tdStyle}>{fmtPct(a.pctIoToSold)}</td>
                <td style={tdStyle}>{fmtDollars(a.totalCommissions)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={sectionStyle}>
        <h2 style={{ color: "var(--gold-bright)", fontSize: "1rem", marginBottom: "0.75rem" }}>Sales from Organizations</h2>
        <p style={{ color: "var(--gold-bright)" }}>#: {fmtNum(data.orgSalesCount)} &nbsp; $: {fmtDollars(data.orgSalesDollars)}</p>
      </div>

      <div style={sectionStyle}>
        <h2 style={{ color: "var(--gold-bright)", fontSize: "1rem", marginBottom: "0.75rem" }}>Sales from Businesses</h2>
        <p style={{ color: "var(--gold-bright)" }}>#: {fmtNum(data.bizSalesCount)} &nbsp; $: {fmtDollars(data.bizSalesDollars)}</p>
      </div>

      <div style={sectionStyle}>
        <h2 style={{ color: "var(--gold-bright)", fontSize: "1rem", marginBottom: "0.75rem" }}>Sales from Agencies</h2>
        <p style={{ color: "var(--gold-bright)" }}>#: {fmtNum(data.agencySalesCount ?? 0)} &nbsp; $: {fmtDollars(data.agencySalesDollars ?? 0)}</p>
      </div>

      <div style={sectionStyle}>
        <h2 style={{ color: "var(--gold-bright)", fontSize: "1rem", marginBottom: "0.75rem" }}>Deals by Month (all time)</h2>
        <p style={{ color: "var(--gold-dim)", fontSize: "0.875rem", marginBottom: "0.5rem" }}>Total deals closed in each month across all years, and % of all deals.</p>
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thStyle}>Month</th>
              <th style={thStyle}>Total Deals</th>
              <th style={thStyle}>% of All Deals</th>
            </tr>
          </thead>
          <tbody>
            {(data.dealsByMonth ?? []).map((row) => (
              <tr key={row.month}>
                <td style={tdStyle}>{row.month}</td>
                <td style={tdStyle}>{fmtNum(row.count)}</td>
                <td style={tdStyle}>{fmtPct(row.pctOfAll)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={sectionStyle}>
        <h2 style={{ color: "var(--gold-bright)", fontSize: "1rem", marginBottom: "0.75rem" }}>Sales by Type of Organization</h2>
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thStyle}>Type</th>
              <th style={thStyle}>#</th>
              <th style={thStyle}>$</th>
            </tr>
          </thead>
          <tbody>
            {data.organizationTypes.map((t) => {
              const row = data.salesByOrgType[t] ?? { count: 0, dollars: 0 };
              return (
                <tr key={t}>
                  <td style={tdStyle}>{t}</td>
                  <td style={tdStyle}>{fmtNum(row.count)}</td>
                  <td style={tdStyle}>{fmtDollars(row.dollars)}</td>
                </tr>
              );
            })}
            {(data.salesByOrgType["—"]?.count ?? 0) > 0 && (
              <tr>
                <td style={tdStyle}>—</td>
                <td style={tdStyle}>{fmtNum(data.salesByOrgType["—"].count)}</td>
                <td style={tdStyle}>{fmtDollars(data.salesByOrgType["—"].dollars)}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div style={sectionStyle}>
        <h2 style={{ color: "var(--gold-bright)", fontSize: "1rem", marginBottom: "0.75rem" }}>Sales by Type of Business</h2>
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thStyle}>Type</th>
              <th style={thStyle}>#</th>
              <th style={thStyle}>$</th>
            </tr>
          </thead>
          <tbody>
            {data.businessTypes.map((t) => {
              const row = data.salesByBizType[t] ?? { count: 0, dollars: 0 };
              return (
                <tr key={t}>
                  <td style={tdStyle}>{t}</td>
                  <td style={tdStyle}>{fmtNum(row.count)}</td>
                  <td style={tdStyle}>{fmtDollars(row.dollars)}</td>
                </tr>
              );
            })}
            {(data.salesByBizType["—"]?.count ?? 0) > 0 && (
              <tr>
                <td style={tdStyle}>—</td>
                <td style={tdStyle}>{fmtNum(data.salesByBizType["—"].count)}</td>
                <td style={tdStyle}>{fmtDollars(data.salesByBizType["—"].dollars)}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div style={sectionStyle}>
        <h2 style={{ color: "var(--gold-bright)", fontSize: "1rem", marginBottom: "0.75rem" }}>Sales by State</h2>
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thStyle}>State</th>
              <th style={thStyle}>% Sales from State</th>
              <th style={thStyle}>#</th>
              <th style={thStyle}>$</th>
            </tr>
          </thead>
          <tbody>
            {[...data.stateList]
              .sort((a, b) => (STATE_LABELS[a] ?? a).localeCompare(STATE_LABELS[b] ?? b))
              .map((code) => {
              const row = data.salesByState[code] ?? { count: 0, dollars: 0 };
              const pct = totalSales ? (row.dollars / totalSales) * 100 : 0;
              const label = STATE_LABELS[code] ?? code;
              return (
                <tr key={code}>
                  <td style={tdStyle}>{label}</td>
                  <td style={tdStyle}>{fmtPct(pct)}</td>
                  <td style={tdStyle}>{fmtNum(row.count)}</td>
                  <td style={tdStyle}>{fmtDollars(row.dollars)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
