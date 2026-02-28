"use client";

import Link from "next/link";
import { useEffect, useState, useCallback, useMemo } from "react";

type Proposal = {
  id: string;
  companyType: string;
  companyDisplayId: string;
  contactId: string;
  salesAgent: string;
  amount: string | null;
  issues: { issue: string; year: string; specialFeatures: string }[] | null;
  geo: string | null;
  impressions: number | null;
  status: string;
  matDue: string | null;
  createdAt: string;
  statusUpdatedAt?: string | null;
};

type Contact = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  officeNumber: string | null;
} | null;

type Row = {
  proposal: Proposal;
  contact: Contact;
  businessName: string | null;
  organizationName: string | null;
};

export default function SoldPage() {
  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchList = useCallback(async () => {
    const res = await fetch("/api/proposals?status=sold");
    const data = await res.json();
    setList(Array.isArray(data) ? data : []);
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchList().finally(() => setLoading(false));
  }, [fetchList]);

  const groupedByMonthYear = useMemo(() => {
    const map = new Map<string, Row[]>();
    for (const row of list) {
      const soldAt = row.proposal.statusUpdatedAt ?? row.proposal.createdAt;
      let key = "Unknown";
      if (soldAt) {
        try {
          const d = new Date(soldAt);
          key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        } catch {
          key = String(soldAt).slice(0, 7) ?? "Unknown";
        }
      }
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(row);
    }
    const keys = Array.from(map.keys()).sort((a, b) => (b > a ? 1 : -1));
    return keys.map((key) => ({ key, rows: map.get(key)! }));
  }, [list]);

  const formatMonthYear = (key: string) => {
    if (key === "Unknown") return key;
    const [y, m] = key.split("-");
    const date = new Date(Number(y), Number(m) - 1, 1);
    return date.toLocaleString("en-US", { month: "long", year: "numeric" });
  };

  const formatMatDue = (s: string | null) => {
    if (!s) return "—";
    try {
      return new Date(s).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    } catch {
      return s;
    }
  };

  const issuesLabel = (issues: Proposal["issues"]) => {
    if (!issues || issues.length === 0) return "—";
    return issues.map((i) => `${i.issue} ${i.year}${i.specialFeatures && i.specialFeatures !== "None" ? ` (${i.specialFeatures})` : ""}`).join(", ");
  };

  const companyName = (row: Row) => row.businessName ?? row.organizationName ?? row.proposal.companyDisplayId;
  const companyHref = (row: Row) =>
    row.proposal.companyType === "org"
      ? `/all-organizations/${row.proposal.companyDisplayId}`
      : `/all-businesses/${row.proposal.companyDisplayId}`;

  const addedAt = (row: Row) => {
    const raw = row.proposal.statusUpdatedAt ?? row.proposal.createdAt;
    if (!raw) return "—";
    try {
      return new Date(raw).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
    } catch {
      return raw;
    }
  };

  return (
    <div style={{ width: "100%", padding: "1rem 0" }}>
      <h1 style={{ color: "var(--gold-bright)", marginBottom: "1rem" }}>SOLD</h1>
      {loading ? (
        <p style={{ color: "var(--gold-dim)" }}>Loading…</p>
      ) : list.length === 0 ? (
        <p style={{ color: "var(--gold-dim)" }}>No sold deals yet.</p>
      ) : (
        groupedByMonthYear.map(({ key, rows }) => (
          <div key={key} style={{ marginBottom: "2rem" }}>
            <h2 style={{ color: "var(--gold-dim)", fontSize: "1rem", marginBottom: "0.75rem", borderBottom: "1px solid var(--glass-border)", paddingBottom: "0.5rem" }}>
              {formatMonthYear(key)}
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {rows.map((row) => (
                <div
                  key={row.proposal.id}
                  style={{
                    background: "var(--glass)",
                    border: "1px solid var(--glass-border)",
                    borderRadius: "8px",
                    padding: "1rem 1.25rem",
                    position: "relative",
                    minHeight: "120px",
                  }}
                >
                  <div style={{ position: "absolute", top: "1rem", left: "1.25rem", color: "var(--gold-dim)", fontSize: "0.75rem" }}>
                    Added {addedAt(row)}
                  </div>
                  <div style={{ position: "absolute", top: "1rem", right: "1.25rem", color: "#39ff14", fontWeight: 700, fontSize: "1.9rem" }}>
                    {row.proposal.amount != null ? `$${Number(row.proposal.amount).toLocaleString("en-US", { minimumFractionDigits: 2 })}` : "—"}
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: "0.5rem 1.5rem", marginBottom: "0.5rem", marginRight: "8rem", marginTop: "2rem" }}>
                    <div>
                      <span style={{ color: "var(--gold-dim)", fontSize: "0.75rem" }}>Sales Agent</span>
                      <div style={{ color: "var(--gold-bright)" }}>{row.proposal.salesAgent}</div>
                    </div>
                    <div>
                      <span style={{ color: "var(--gold-dim)", fontSize: "0.75rem" }}>Business/Organization</span>
                      <div>
                        <Link href={companyHref(row)} style={{ color: "var(--gold-bright)" }}>
                          {companyName(row)}
                        </Link>
                      </div>
                    </div>
                    <div>
                      <span style={{ color: "var(--gold-dim)", fontSize: "0.75rem" }}>First</span>
                      <div style={{ color: "var(--gold-bright)" }}>{row.contact?.firstName ?? "—"}</div>
                    </div>
                    <div>
                      <span style={{ color: "var(--gold-dim)", fontSize: "0.75rem" }}>Last</span>
                      <div style={{ color: "var(--gold-bright)" }}>{row.contact?.lastName ?? "—"}</div>
                    </div>
                    <div>
                      <span style={{ color: "var(--gold-dim)", fontSize: "0.75rem" }}>Email</span>
                      <div style={{ color: "var(--gold-bright)", wordBreak: "break-all" }}>{row.contact?.email ?? "—"}</div>
                    </div>
                    <div>
                      <span style={{ color: "var(--gold-dim)", fontSize: "0.75rem" }}>Phone</span>
                      <div style={{ color: "var(--gold-bright)" }}>{row.contact?.officeNumber ?? "—"}</div>
                    </div>
                    <div>
                      <span style={{ color: "var(--gold-dim)", fontSize: "0.75rem" }}>Issue(s)</span>
                      <div style={{ color: "var(--gold-bright)", fontSize: "0.85rem" }}>{issuesLabel(row.proposal.issues)}</div>
                    </div>
                    <div>
                      <span style={{ color: "var(--gold-dim)", fontSize: "0.75rem" }}>Geo</span>
                      <div style={{ color: "var(--gold-bright)" }}>{row.proposal.geo ?? "—"}</div>
                    </div>
                    <div>
                      <span style={{ color: "var(--gold-dim)", fontSize: "0.75rem" }}>Impressions</span>
                      <div style={{ color: "var(--gold-bright)" }}>{row.proposal.impressions ?? "—"}</div>
                    </div>
                    <div>
                      <span style={{ color: "var(--gold-dim)", fontSize: "0.75rem" }}>MAT DUE</span>
                      <div style={{ color: "var(--gold-bright)" }}>{formatMatDue(row.proposal.matDue)}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
