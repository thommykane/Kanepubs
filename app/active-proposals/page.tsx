"use client";

import Link from "next/link";
import { useEffect, useState, useCallback } from "react";

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

export default function ActiveProposalsPage() {
  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [actioningId, setActioningId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    fetch("/api/me")
      .then((r) => r.json())
      .then((data) => setIsAdmin(data?.user?.isAdmin ?? false));
  }, []);

  const fetchList = useCallback(async () => {
    const res = await fetch("/api/proposals?status=proposal");
    const data = await res.json();
    setList(Array.isArray(data) ? data : []);
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchList().finally(() => setLoading(false));
  }, [fetchList]);

  const handlePassed = async (id: string) => {
    setActioningId(id);
    try {
      const res = await fetch(`/api/proposals/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "passed" }),
      });
      if (res.ok) await fetchList();
    } finally {
      setActioningId(null);
    }
  };

  const handleIoSent = async (id: string) => {
    setActioningId(id);
    try {
      const res = await fetch(`/api/proposals/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "io" }),
      });
      if (res.ok) await fetchList();
    } finally {
      setActioningId(null);
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
    const raw = row.proposal.createdAt;
    if (!raw) return "—";
    try {
      return new Date(raw).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
    } catch {
      return raw;
    }
  };

  return (
    <div style={{ width: "100%", padding: "1rem 0" }}>
      <h1 style={{ color: "var(--gold-bright)", marginBottom: "1rem" }}>Active Proposals</h1>
      {loading ? (
        <p style={{ color: "var(--gold-dim)" }}>Loading…</p>
      ) : list.length === 0 ? (
        <p style={{ color: "var(--gold-dim)" }}>No active proposals.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {list.map((row) => (
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
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: "0.5rem 1.5rem", marginBottom: "0.75rem", marginRight: "8rem", marginTop: "2rem" }}>
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
              </div>
              <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end", marginTop: "0.5rem" }}>
                <button
                  type="button"
                  onClick={() => handlePassed(row.proposal.id)}
                  disabled={actioningId !== null || !isAdmin}
                  style={{
                    padding: "0.4rem 0.75rem",
                    background: "#b71c1c",
                    color: "#fff",
                    border: "none",
                    borderRadius: "6px",
                    fontWeight: 600,
                    cursor: actioningId !== null || !isAdmin ? "not-allowed" : "pointer",
                    opacity: isAdmin ? 1 : 0.6,
                  }}
                >
                  Passed
                </button>
                <button
                  type="button"
                  onClick={() => handleIoSent(row.proposal.id)}
                  disabled={actioningId !== null || !isAdmin}
                  style={{
                    padding: "0.4rem 0.75rem",
                    background: "#39ff14",
                    color: "#000",
                    border: "none",
                    borderRadius: "6px",
                    fontWeight: 600,
                    cursor: actioningId !== null || !isAdmin ? "not-allowed" : "pointer",
                    opacity: isAdmin ? 1 : 0.6,
                  }}
                >
                  I/O Sent
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
