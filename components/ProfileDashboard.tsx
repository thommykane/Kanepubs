"use client";

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
  totalProposals: number;
  pctProposalsToIo: number;
  pctIoToSold: number;
  agentsData: AgentRow[];
  orgSalesCount: number;
  orgSalesDollars: number;
  bizSalesCount: number;
  bizSalesDollars: number;
  salesByOrgType: Record<string, { count: number; dollars: number }>;
  salesByBizType: Record<string, { count: number; dollars: number }>;
  organizationTypes: string[];
  businessTypes: string[];
  stateList: string[];
  salesByState: Record<string, { count: number; dollars: number }>;
  totalSalesForPct: number;
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

type Props = { profileUsername: string };

export default function ProfileDashboard({ profileUsername }: Props) {
  const [currentUsername, setCurrentUsername] = useState<string | null>(null);
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      try {
        const meRes = await fetch("/api/me");
        const meJson = await meRes.json();
        const username = meJson?.user?.username ?? null;
        if (!cancelled) setCurrentUsername(username);
        if (!username || username !== profileUsername) {
          if (!cancelled) setLoading(false);
          return;
        }
        const res = await fetch("/api/user-dashboard");
        if (res.ok) {
          const json = await res.json();
          if (!cancelled) setData(json);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    run();
    return () => { cancelled = true; };
  }, [profileUsername]);

  if (loading) return <div style={{ padding: "0.5rem 0", color: "var(--gold-dim)", fontSize: "0.9rem" }}>Loading your dashboard…</div>;
  if (currentUsername !== profileUsername || !data) return null;

  const totalSales = data.totalSalesForPct || 1;

  return (
    <div style={{ marginTop: "1.5rem" }}>
      <h2 style={{ color: "var(--gold-bright)", fontSize: "1.1rem", marginBottom: "1rem" }}>My sales</h2>

      <div style={sectionStyle}>
        <h3 style={{ color: "var(--gold-bright)", fontSize: "1rem", marginBottom: "0.75rem" }}>Totals</h3>
        <p style={{ color: "var(--gold-bright)", marginBottom: "0.25rem" }}><strong>Total Sales (#):</strong> {fmtNum(data.totalSalesCount)}</p>
        <p style={{ color: "var(--gold-bright)", marginBottom: "0.5rem" }}><strong>Total Sales ($):</strong> {fmtDollars(data.totalSalesDollars)}</p>
        <p style={{ color: "var(--gold-dim)", fontSize: "0.9rem" }}><strong>Conversions</strong></p>
        <p style={{ color: "var(--gold-bright)" }}>% of proposals converted to sent I/O&apos;s: {fmtPct(data.pctProposalsToIo)}</p>
        <p style={{ color: "var(--gold-bright)" }}>% of I/O&apos;s converted to SOLD: {fmtPct(data.pctIoToSold)}</p>
      </div>

      <div style={sectionStyle}>
        <h3 style={{ color: "var(--gold-bright)", fontSize: "1rem", marginBottom: "0.75rem" }}>Your activity</h3>
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
        <h3 style={{ color: "var(--gold-bright)", fontSize: "1rem", marginBottom: "0.75rem" }}>Sales from Organizations</h3>
        <p style={{ color: "var(--gold-bright)" }}>#: {fmtNum(data.orgSalesCount)} &nbsp; $: {fmtDollars(data.orgSalesDollars)}</p>
      </div>

      <div style={sectionStyle}>
        <h3 style={{ color: "var(--gold-bright)", fontSize: "1rem", marginBottom: "0.75rem" }}>Sales from Businesses</h3>
        <p style={{ color: "var(--gold-bright)" }}>#: {fmtNum(data.bizSalesCount)} &nbsp; $: {fmtDollars(data.bizSalesDollars)}</p>
      </div>

      <div style={sectionStyle}>
        <h3 style={{ color: "var(--gold-bright)", fontSize: "1rem", marginBottom: "0.75rem" }}>Sales by Type of Organization</h3>
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
              if (row.count === 0) return null;
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
        <h3 style={{ color: "var(--gold-bright)", fontSize: "1rem", marginBottom: "0.75rem" }}>Sales by Type of Business</h3>
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
              if (row.count === 0) return null;
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
        <h3 style={{ color: "var(--gold-bright)", fontSize: "1rem", marginBottom: "0.75rem" }}>Sales by State</h3>
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
              .filter((code) => (data.salesByState[code]?.count ?? 0) > 0)
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
