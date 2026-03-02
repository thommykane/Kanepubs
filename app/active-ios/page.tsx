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
  notes: string | null;
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

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const DAYS_1_31 = Array.from({ length: 31 }, (_, i) => String(i + 1));
const MAT_DUE_YEARS = Array.from({ length: 12 }, (_, i) => String(new Date().getFullYear() + i));

export default function ActiveIOsPage() {
  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [actioningId, setActioningId] = useState<string | null>(null);
  const [soldModal, setSoldModal] = useState<{ id: string } | null>(null);
  const [matDueMonth, setMatDueMonth] = useState("");
  const [matDueDay, setMatDueDay] = useState("");
  const [matDueYear, setMatDueYear] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    fetch("/api/me")
      .then((r) => r.json())
      .then((data) => setIsAdmin(data?.user?.isAdmin ?? false));
  }, []);

  const fetchList = useCallback(async () => {
    const res = await fetch("/api/proposals?status=io");
    const data = await res.json();
    setList(Array.isArray(data) ? data : []);
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchList().finally(() => setLoading(false));
  }, [fetchList]);

  const handleRejected = async (id: string) => {
    setActioningId(id);
    try {
      const res = await fetch(`/api/proposals/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "rejected" }),
      });
      if (res.ok) await fetchList();
    } finally {
      setActioningId(null);
    }
  };

  const openSoldModal = (id: string) => {
    setSoldModal({ id });
    setMatDueMonth("");
    setMatDueDay("");
    setMatDueYear("");
  };

  const handleSoldSubmit = async () => {
    if (!soldModal) return;
    const monthIdx = MONTHS.indexOf(matDueMonth);
    const month = monthIdx >= 0 ? String(monthIdx + 1).padStart(2, "0") : "";
    const day = matDueDay ? matDueDay.padStart(2, "0") : "";
    const year = matDueYear || "";
    const matDue = year && month && day ? `${year}-${month}-${day}` : undefined;
    setActioningId(soldModal.id);
    try {
      const res = await fetch(`/api/proposals/${soldModal.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "sold", matDue: matDue || undefined }),
      });
      if (res.ok) {
        setSoldModal(null);
        await fetchList();
      }
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
      <h1 style={{ color: "var(--gold-bright)", marginBottom: "1rem" }}>Active I/O&apos;s</h1>
      {loading ? (
        <p style={{ color: "var(--gold-dim)" }}>Loading…</p>
      ) : list.length === 0 ? (
        <p style={{ color: "var(--gold-dim)" }}>No active I/O&apos;s.</p>
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
                {row.proposal.notes && (
                  <div style={{ gridColumn: "1 / -1" }}>
                    <span style={{ color: "var(--gold-dim)", fontSize: "0.75rem" }}>Notes</span>
                    <div style={{ color: "var(--gold-bright)", fontSize: "0.85rem" }}>{row.proposal.notes}</div>
                  </div>
                )}
              </div>
              <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end", marginTop: "0.5rem" }}>
                <button
                  type="button"
                  onClick={() => handleRejected(row.proposal.id)}
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
                  Rejected
                </button>
                <button
                  type="button"
                  onClick={() => isAdmin && openSoldModal(row.proposal.id)}
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
                  Sold
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {soldModal && (
        <>
          <div
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.5)",
              zIndex: 50,
            }}
            onClick={() => setSoldModal(null)}
          />
          <div
            style={{
              position: "fixed",
              left: "50%",
              top: "50%",
              transform: "translate(-50%, -50%)",
              background: "var(--glass-dark)",
              border: "1px solid var(--glass-border)",
              borderRadius: "8px",
              padding: "1.5rem",
              zIndex: 51,
              minWidth: "280px",
            }}
          >
            <h3 style={{ color: "var(--gold-bright)", marginBottom: "1rem" }}>Materials Due Date</h3>
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "1rem" }}>
              <select
                value={matDueMonth}
                onChange={(e) => setMatDueMonth(e.target.value)}
                style={{
                  padding: "0.5rem",
                  background: "var(--glass)",
                  border: "1px solid var(--glass-border)",
                  borderRadius: "6px",
                  color: "var(--gold-bright)",
                  minWidth: "100px",
                }}
              >
                <option value="">Month</option>
                {MONTHS.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
              <select
                value={matDueDay}
                onChange={(e) => setMatDueDay(e.target.value)}
                style={{
                  padding: "0.5rem",
                  background: "var(--glass)",
                  border: "1px solid var(--glass-border)",
                  borderRadius: "6px",
                  color: "var(--gold-bright)",
                  minWidth: "70px",
                }}
              >
                <option value="">Day</option>
                {DAYS_1_31.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
              <select
                value={matDueYear}
                onChange={(e) => setMatDueYear(e.target.value)}
                style={{
                  padding: "0.5rem",
                  background: "var(--glass)",
                  border: "1px solid var(--glass-border)",
                  borderRadius: "6px",
                  color: "var(--gold-bright)",
                  minWidth: "80px",
                }}
              >
                <option value="">Year</option>
                {MAT_DUE_YEARS.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
            <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
              <button
                type="button"
                onClick={() => setSoldModal(null)}
                style={{
                  padding: "0.5rem 1rem",
                  background: "transparent",
                  border: "1px solid var(--glass-border)",
                  borderRadius: "6px",
                  color: "var(--gold-bright)",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSoldSubmit}
                disabled={actioningId !== null}
                style={{
                  padding: "0.5rem 1rem",
                  background: "var(--gold)",
                  color: "var(--bg)",
                  border: "none",
                  borderRadius: "6px",
                  fontWeight: 600,
                  cursor: actioningId !== null ? "not-allowed" : "pointer",
                }}
              >
                {actioningId !== null ? "Saving…" : "Confirm SOLD"}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
