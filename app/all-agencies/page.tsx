"use client";

import Link from "next/link";
import { useEffect, useState, useCallback } from "react";

type Agency = {
  id: string;
  displayId: string | null;
  agencyName: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zipCode: string | null;
  phone: string | null;
  website: string | null;
  createdAt: string;
};

export default function AllAgenciesPage() {
  const [list, setList] = useState<Agency[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAgencies = useCallback(async () => {
    const res = await fetch("/api/agencies");
    const data = await res.json();
    setList(Array.isArray(data) ? data : []);
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchAgencies().finally(() => setLoading(false));
  }, [fetchAgencies]);

  const linkStyle = { color: "var(--gold-bright)", textDecoration: "none" };
  const tdStyle = { padding: "10px 12px", fontSize: "0.875rem", color: "var(--gold-bright)", borderBottom: "1px solid var(--glass-border)" };

  return (
    <div style={{ padding: "1rem", width: "100%" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", flexWrap: "wrap", gap: "0.5rem" }}>
        <h1 style={{ color: "var(--gold-bright)", margin: 0 }}>All Agencies</h1>
        <Link href="/new-agency" style={{ ...linkStyle, padding: "0.5rem 0.75rem", background: "var(--gold)", color: "var(--bg)", borderRadius: "6px", fontWeight: 600 }}>
          New Agency
        </Link>
      </div>
      {loading ? (
        <p style={{ color: "var(--gold-dim)" }}>Loading…</p>
      ) : list.length === 0 ? (
        <p style={{ color: "var(--gold-dim)" }}>No agencies yet.</p>
      ) : (
        <div style={{ background: "var(--glass)", border: "1px solid var(--glass-border)", borderRadius: "8px", overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--glass-border)", textAlign: "left" }}>
                <th style={{ padding: "10px 12px", fontSize: "0.75rem", fontWeight: 600, color: "var(--gold-dim)", textTransform: "uppercase" }}>Agency</th>
                <th style={{ padding: "10px 12px", fontSize: "0.75rem", fontWeight: 600, color: "var(--gold-dim)", textTransform: "uppercase" }}>ID</th>
                <th style={{ padding: "10px 12px", fontSize: "0.75rem", fontWeight: 600, color: "var(--gold-dim)", textTransform: "uppercase" }}>City / State</th>
                <th style={{ padding: "10px 12px", fontSize: "0.75rem", fontWeight: 600, color: "var(--gold-dim)", textTransform: "uppercase" }}>Phone</th>
              </tr>
            </thead>
            <tbody>
              {list.map((a) => (
                <tr key={a.id}>
                  <td style={tdStyle}>
                    <Link href={`/all-agencies/${a.displayId ?? a.id}`} style={linkStyle}>
                      {a.agencyName ?? "—"}
                    </Link>
                  </td>
                  <td style={tdStyle}>{a.displayId ?? "—"}</td>
                  <td style={tdStyle}>{[a.city, a.state].filter(Boolean).join(", ") || "—"}</td>
                  <td style={tdStyle}>{a.phone ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
