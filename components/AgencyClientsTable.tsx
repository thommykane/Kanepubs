"use client";

import Link from "next/link";

type Client = { companyDisplayId: string; companyType: string; companyName?: string };

type Props = {
  clients: Client[];
  agencyDisplayId: string;
};

export default function AgencyClientsTable({ clients, agencyDisplayId }: Props) {
  const thStyle: React.CSSProperties = {
    padding: "10px 12px",
    fontSize: "0.75rem",
    fontWeight: 600,
    color: "var(--gold-dim)",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  };
  const tdStyle: React.CSSProperties = {
    padding: "10px 12px",
    fontSize: "0.875rem",
    color: "var(--gold-bright)",
  };

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem", marginBottom: "0.75rem" }}>
        <h2 style={{ color: "var(--gold-bright)", fontSize: "1rem", margin: 0 }}>
          Clients
        </h2>
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          <Link
            href={`/new-organization?agencyId=${encodeURIComponent(agencyDisplayId)}`}
            style={{
              padding: "0.4rem 0.75rem",
              background: "var(--gold)",
              color: "var(--bg)",
              borderRadius: "6px",
              fontWeight: 600,
              fontSize: "0.875rem",
              textDecoration: "none",
            }}
          >
            Add Organization
          </Link>
          <Link
            href={`/new-business?agencyId=${encodeURIComponent(agencyDisplayId)}`}
            style={{
              padding: "0.4rem 0.75rem",
              background: "var(--gold)",
              color: "var(--bg)",
              borderRadius: "6px",
              fontWeight: 600,
              fontSize: "0.875rem",
              textDecoration: "none",
            }}
          >
            Add Business
          </Link>
        </div>
      </div>
      <div
        style={{
          background: "var(--glass)",
          border: "1px solid var(--glass-border)",
          borderRadius: "8px",
          overflow: "hidden",
        }}
      >
        {clients.length === 0 ? (
          <div style={{ padding: "1.5rem", color: "var(--gold-dim)", fontSize: "0.875rem" }}>
            No clients associated yet.
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--glass-border)", textAlign: "left" }}>
                <th style={thStyle}>Client</th>
                <th style={thStyle}>Type</th>
              </tr>
            </thead>
            <tbody>
              {clients.map((c) => (
                <tr key={`${c.companyDisplayId}-${c.companyType}`} style={{ borderBottom: "1px solid var(--glass-border)" }}>
                  <td style={tdStyle}>
                    <Link
                      href={c.companyType === "org" ? `/all-organizations/${c.companyDisplayId}` : `/all-businesses/${c.companyDisplayId}`}
                      style={{ color: "var(--gold-bright)" }}
                    >
                      {c.companyName ?? c.companyDisplayId}
                    </Link>
                    <div style={{ fontSize: "0.75rem", color: "var(--gold-dim)", marginTop: "2px" }}>{c.companyDisplayId}</div>
                  </td>
                  <td style={tdStyle}>{c.companyType === "org" ? "Organization" : "Business"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
