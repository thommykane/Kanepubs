"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Client = { companyDisplayId: string; companyType: string; companyName?: string };

type Props = {
  clients: Client[];
  agencyDisplayId: string;
};

export default function AgencyClientsTable({ clients, agencyDisplayId }: Props) {
  const router = useRouter();
  const [linkId, setLinkId] = useState("");
  const [linking, setLinking] = useState(false);
  const [linkError, setLinkError] = useState("");

  const handleLinkExisting = async () => {
    const id = linkId.trim();
    if (!id) {
      setLinkError("Enter an organization or business ID");
      return;
    }
    const first = id.toUpperCase().charAt(0);
    let companyType: "org" | "business";
    if (first === "A") companyType = "org";
    else if (first === "B") companyType = "business";
    else {
      setLinkError("ID must start with A (organization) or B (business)");
      return;
    }
    setLinkError("");
    setLinking(true);
    try {
      const res = await fetch(`/api/agencies/${encodeURIComponent(agencyDisplayId)}/clients`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyDisplayId: id, companyType }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setLinkError(data?.error ?? "Failed to link client");
        return;
      }
      setLinkId("");
      router.refresh();
    } finally {
      setLinking(false);
    }
  };

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
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center" }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem" }}>
            <input
              type="text"
              placeholder="e.g. A00000228 or B00000001"
              value={linkId}
              onChange={(e) => { setLinkId(e.target.value); setLinkError(""); }}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleLinkExisting())}
              disabled={linking}
              style={{
                padding: "0.35rem 0.5rem",
                width: "180px",
                background: "var(--glass)",
                border: "1px solid var(--glass-border)",
                borderRadius: "6px",
                color: "var(--gold-bright)",
                fontSize: "0.875rem",
              }}
              title="Enter an existing organization (A...) or business (B...) ID to link as a client"
            />
            <button
              type="button"
              onClick={handleLinkExisting}
              disabled={linking || !linkId.trim()}
              style={{
                padding: "0.4rem 0.75rem",
                background: "var(--gold)",
                color: "var(--bg)",
                border: "none",
                borderRadius: "6px",
                fontWeight: 600,
                fontSize: "0.875rem",
                cursor: linking || !linkId.trim() ? "not-allowed" : "pointer",
                opacity: linking || !linkId.trim() ? 0.8 : 1,
              }}
            >
              {linking ? "Linking…" : "Link existing"}
            </button>
          </span>
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
      {linkError && (
        <p style={{ marginTop: "0.25rem", marginBottom: "0.5rem", color: "#e57373", fontSize: "0.875rem" }}>
          {linkError}
        </p>
      )}
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
