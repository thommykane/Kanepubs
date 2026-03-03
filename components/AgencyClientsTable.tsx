"use client";

import Link from "next/link";

type Client = { companyDisplayId: string; companyType: string };

type Props = {
  clients: Client[];
};

export default function AgencyClientsTable({ clients }: Props) {
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
      <h2 style={{ color: "var(--gold-bright)", fontSize: "1rem", marginBottom: "0.75rem" }}>
        Clients
      </h2>
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
                <th style={thStyle}>Client ID</th>
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
                      {c.companyDisplayId}
                    </Link>
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
