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
  assignedTo: string | null;
  createdAt: string;
};

const sectionStyle: React.CSSProperties = {
  marginBottom: "1.5rem",
  background: "var(--glass)",
  border: "1px solid var(--glass-border)",
  borderRadius: "8px",
  padding: "1rem 1.25rem",
};
const tableStyle: React.CSSProperties = { width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" };
const thStyle: React.CSSProperties = {
  textAlign: "left",
  padding: "0.5rem",
  borderBottom: "1px solid var(--glass-border)",
  color: "var(--gold-dim)",
};
const tdStyle: React.CSSProperties = {
  padding: "0.5rem",
  borderBottom: "1px solid rgba(255,255,255,0.06)",
  color: "var(--gold-bright)",
};

export default function MyAgenciesPage() {
  const [list, setList] = useState<Agency[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAgencies = useCallback(async () => {
    const res = await fetch("/api/my-agencies", { credentials: "include" });
    if (res.status === 401) {
      setList([]);
      return;
    }
    const data = await res.json();
    setList(Array.isArray(data) ? data : []);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchAgencies().then(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, [fetchAgencies]);

  return (
    <div style={{ width: "100%", padding: "1rem 0" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "1rem",
          flexWrap: "wrap",
          gap: "0.75rem",
        }}
      >
        <h1 style={{ color: "var(--gold-bright)" }}>My Agencies</h1>
        <Link
          href="/new-agency"
          style={{
            padding: "0.5rem 0.75rem",
            background: "var(--gold)",
            color: "var(--bg)",
            borderRadius: "6px",
            fontWeight: 600,
            textDecoration: "none",
            fontSize: "0.875rem",
          }}
        >
          New Agency
        </Link>
      </div>

      {loading ? (
        <p style={{ color: "var(--gold-dim)" }}>Loading…</p>
      ) : list.length === 0 ? (
        <p style={{ color: "var(--gold-dim)" }}>No agencies assigned to you.</p>
      ) : (
        <div style={sectionStyle}>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Agency</th>
                <th style={thStyle}>ID</th>
                <th style={thStyle}>City / State</th>
                <th style={thStyle}>Phone</th>
                <th style={thStyle}>Assigned to</th>
              </tr>
            </thead>
            <tbody>
              {list.map((a) => (
                <tr key={a.id}>
                  <td style={tdStyle}>
                    <Link
                      href={`/all-agencies/${a.displayId ?? a.id}`}
                      style={{ color: "var(--gold-bright)", textDecoration: "none" }}
                    >
                      {a.agencyName ?? "—"}
                    </Link>
                  </td>
                  <td style={tdStyle}>{a.displayId ?? "—"}</td>
                  <td style={tdStyle}>{[a.city, a.state].filter(Boolean).join(", ") || "—"}</td>
                  <td style={tdStyle}>{a.phone ?? "—"}</td>
                  <td style={tdStyle}>{a.assignedTo ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
