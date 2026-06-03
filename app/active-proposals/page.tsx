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
  deadline: string | null;
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
  agencyName: string | null;
};

const ISSUE_OPTIONS = ["Spring", "Summer", "Fall", "Winter", "Holiday Edition", "Special Edition"];
const YEARS = Array.from({ length: 11 }, (_, i) => String(2020 + i));
const SPECIAL_FEATURES = ["None", "Inside Front Cover", "Inside Back Cover", "Back Cover", "Inside Front Spread", "Inside Back Spread", "Spread"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DAYS_1_31 = Array.from({ length: 31 }, (_, i) => String(i + 1));
const DEADLINE_YEARS = Array.from({ length: 12 }, (_, i) => String(new Date().getFullYear() + i));

export default function ActiveProposalsPage() {
  const [list, setList] = useState<Row[]>([]);
  const [listError, setListError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [actioningId, setActioningId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [users, setUsers] = useState<{ id: string; username: string }[]>([]);
  const [editModal, setEditModal] = useState<Row | null>(null);
  const [editContactId, setEditContactId] = useState("");
  const [companyContacts, setCompanyContacts] = useState<{ id: string; firstName: string | null; lastName: string | null }[]>([]);
  const [editSalesAgent, setEditSalesAgent] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [editIssues, setEditIssues] = useState<{ issue: string; year: string; specialFeatures: string }[]>([{ issue: "Spring", year: "2026", specialFeatures: "None" }]);
  const [editGeo, setEditGeo] = useState("");
  const [editImpressions, setEditImpressions] = useState("");
  const [editDeadlineMonth, setEditDeadlineMonth] = useState("");
  const [editDeadlineDay, setEditDeadlineDay] = useState("");
  const [editDeadlineYear, setEditDeadlineYear] = useState("");
  const [editNotes, setEditNotes] = useState("");

  useEffect(() => {
    fetch("/api/me", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => setIsAdmin(data?.user?.isAdmin ?? false));
    fetch("/api/users", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setUsers(Array.isArray(d) ? d : []));
  }, []);

  const fetchList = useCallback(async () => {
    const res = await fetch("/api/proposals?status=proposal", { cache: "no-store" });
    const data = await res.json();
    if (!res.ok) {
      const base = (data?.error as string) || res.statusText || "Could not load proposals.";
      const hint = typeof data?.hint === "string" ? ` ${data.hint}` : "";
      setListError(base + hint);
      setList([]);
      return;
    }
    setListError(null);
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

  const openEditModal = async (row: Row) => {
    setEditModal(row);
    setEditContactId(row.proposal.contactId);
    setEditSalesAgent(row.proposal.salesAgent);
    const res = await fetch(`/api/contacts?businessId=${encodeURIComponent(row.proposal.companyDisplayId)}`);
    const contactsList = await res.json();
    setCompanyContacts(Array.isArray(contactsList) ? contactsList.map((c: { id: string; firstName?: string | null; lastName?: string | null }) => ({ id: c.id, firstName: c.firstName ?? null, lastName: c.lastName ?? null })) : []);
    setEditAmount(row.proposal.amount ?? "");
    setEditIssues(row.proposal.issues && row.proposal.issues.length > 0 ? row.proposal.issues.map((i) => ({ ...i })) : [{ issue: "Spring", year: "2026", specialFeatures: "None" }]);
    setEditGeo(row.proposal.geo ?? "");
    setEditImpressions(row.proposal.impressions != null ? String(row.proposal.impressions) : "");
    setEditNotes(row.proposal.notes ?? "");
    if (row.proposal.deadline) {
      try {
        const d = new Date(row.proposal.deadline);
        setEditDeadlineMonth(MONTHS[d.getMonth()] ?? "");
        setEditDeadlineDay(String(d.getDate()));
        setEditDeadlineYear(String(d.getFullYear()));
      } catch {
        setEditDeadlineMonth("");
        setEditDeadlineDay("");
        setEditDeadlineYear("");
      }
    } else {
      setEditDeadlineMonth("");
      setEditDeadlineDay("");
      setEditDeadlineYear("");
    }
  };

  const updateEditIssue = (index: number, field: "issue" | "year" | "specialFeatures", value: string) => {
    setEditIssues((p) => {
      const next = [...p];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const addEditIssueRow = () => setEditIssues((p) => [...p, { issue: "Spring", year: "2026", specialFeatures: "None" }]);

  const handleSaveEdit = async () => {
    if (!editModal) return;
    setActioningId(editModal.proposal.id);
    try {
      const monthIdx = MONTHS.indexOf(editDeadlineMonth);
      const month = monthIdx >= 0 ? String(monthIdx + 1).padStart(2, "0") : "";
      const day = editDeadlineDay ? editDeadlineDay.padStart(2, "0") : "";
      const year = editDeadlineYear || "";
      const deadline = year && month && day ? `${year}-${month}-${day}` : null;
      const issuesVal = editIssues.filter((i) => i.issue).length > 0 ? editIssues.filter((i) => i.issue) : null;
      const res = await fetch(`/api/proposals/${editModal.proposal.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          adminEdit: true,
          contactId: editContactId || undefined,
          salesAgent: editSalesAgent,
          amount: editAmount || null,
          issues: issuesVal,
          geo: editGeo || null,
          impressions: editImpressions ? parseInt(editImpressions.replace(/\D/g, "").slice(0, 7), 10) : null,
          deadline,
          notes: editNotes.slice(0, 50) || null,
        }),
      });
      if (res.ok) {
        setEditModal(null);
        await fetchList();
      } else {
        const data = await res.json();
        alert(data?.error ?? "Failed to save");
      }
    } finally {
      setActioningId(null);
    }
  };

  const issuesLabel = (issues: Proposal["issues"]) => {
    if (!issues || issues.length === 0) return "—";
    return issues.map((i) => `${i.issue} ${i.year}${i.specialFeatures && i.specialFeatures !== "None" ? ` (${i.specialFeatures})` : ""}`).join(", ");
  };

  const companyName = (row: Row) =>
    row.businessName ?? row.organizationName ?? row.agencyName ?? row.proposal.companyDisplayId;
  const companyHref = (row: Row) =>
    row.proposal.companyType === "org"
      ? `/all-organizations/${row.proposal.companyDisplayId}`
      : row.proposal.companyType === "agency"
        ? `/all-agencies/${row.proposal.companyDisplayId}`
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

  const fmtDeadline = (raw: string | null | undefined) => {
    if (!raw) return "—";
    try {
      return new Date(raw).toLocaleDateString("en-US", { dateStyle: "medium" });
    } catch {
      return "—";
    }
  };

  return (
    <div style={{ width: "100%", padding: "1rem 0" }}>
      <h1 style={{ color: "var(--gold-bright)", marginBottom: "1rem" }}>Active Proposals</h1>
      {loading ? (
        <p style={{ color: "var(--gold-dim)" }}>Loading…</p>
      ) : listError ? (
        <div
          role="alert"
          style={{
            padding: "1rem 1.25rem",
            borderRadius: "8px",
            border: "1px solid #c44",
            background: "rgba(200,50,50,0.12)",
            color: "var(--gold-bright)",
            marginBottom: "1rem",
            lineHeight: 1.5,
          }}
        >
          <strong>Could not load proposals.</strong> Your data is usually still in the database; this is often a schema mismatch after an app update.
          <div style={{ marginTop: "0.75rem", fontSize: "0.9rem", color: "var(--gold-dim)" }}>{listError}</div>
        </div>
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
                <div>
                  <span style={{ color: "var(--gold-dim)", fontSize: "0.75rem" }}>Deadline</span>
                  <div style={{ color: "var(--gold-bright)" }}>{fmtDeadline(row.proposal.deadline)}</div>
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
                  onClick={() => openEditModal(row)}
                  disabled={actioningId !== null}
                  style={{
                    padding: "0.4rem 0.75rem",
                    background: "var(--gold)",
                    color: "var(--bg)",
                    border: "none",
                    borderRadius: "6px",
                    fontWeight: 600,
                    cursor: actioningId !== null ? "not-allowed" : "pointer",
                  }}
                >
                  Edit
                </button>
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

      {editModal && (
        <>
          <div
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 50 }}
            onClick={() => setEditModal(null)}
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
              minWidth: "360px",
              maxWidth: "90vw",
              maxHeight: "85vh",
              overflow: "auto",
            }}
          >
            <h3 style={{ color: "var(--gold-bright)", marginBottom: "1rem" }}>Edit Proposal</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginBottom: "1rem" }}>
              <label>
                <span style={{ color: "var(--gold-dim)", fontSize: "0.8rem" }}>Contact</span>
                <select
                  value={editContactId}
                  onChange={(e) => setEditContactId(e.target.value)}
                  style={{
                    display: "block",
                    width: "100%",
                    padding: "0.5rem",
                    background: "var(--glass)",
                    border: "1px solid var(--glass-border)",
                    borderRadius: "6px",
                    color: "var(--gold-bright)",
                    marginTop: "4px",
                  }}
                >
                  {companyContacts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {[c.firstName, c.lastName].filter(Boolean).join(" ") || c.id}
                    </option>
                  ))}
                  {editContactId && !companyContacts.some((c) => c.id === editContactId) && (
                    <option value={editContactId}>
                      {editModal?.contact ? [editModal.contact.firstName, editModal.contact.lastName].filter(Boolean).join(" ") || editContactId : editContactId}
                    </option>
                  )}
                  {companyContacts.length === 0 && !editContactId && <option value="">No contacts for this company</option>}
                </select>
              </label>
              <label>
                <span style={{ color: "var(--gold-dim)", fontSize: "0.8rem" }}>Sales Agent</span>
                <select
                  value={editSalesAgent}
                  onChange={(e) => setEditSalesAgent(e.target.value)}
                  style={{
                    display: "block",
                    width: "100%",
                    padding: "0.5rem",
                    background: "var(--glass)",
                    border: "1px solid var(--glass-border)",
                    borderRadius: "6px",
                    color: "var(--gold-bright)",
                    marginTop: "4px",
                  }}
                >
                  {users.map((u) => (
                    <option key={u.id} value={u.username}>{u.username}</option>
                  ))}
                  {editSalesAgent && !users.some((u) => u.username === editSalesAgent) && (
                    <option value={editSalesAgent}>{editSalesAgent}</option>
                  )}
                  {users.length === 0 && !editSalesAgent && <option value="">—</option>}
                </select>
              </label>
              <label>
                <span style={{ color: "var(--gold-dim)", fontSize: "0.8rem" }}>Amount ($)</span>
                <input
                  type="text"
                  value={editAmount}
                  onChange={(e) => setEditAmount(e.target.value)}
                  style={{
                    display: "block",
                    width: "100%",
                    padding: "0.5rem",
                    background: "var(--glass)",
                    border: "1px solid var(--glass-border)",
                    borderRadius: "6px",
                    color: "var(--gold-bright)",
                    marginTop: "4px",
                  }}
                />
              </label>
              <div>
                <span style={{ color: "var(--gold-dim)", fontSize: "0.8rem" }}>Issue(s)</span>
                {editIssues.map((issueRow, idx) => (
                  <div key={idx} style={{ display: "flex", gap: "6px", flexWrap: "wrap", alignItems: "center", marginTop: "4px" }}>
                    <select
                      value={issueRow.issue}
                      onChange={(e) => updateEditIssue(idx, "issue", e.target.value)}
                      style={{
                        padding: "0.35rem",
                        background: "var(--glass)",
                        border: "1px solid var(--glass-border)",
                        borderRadius: "4px",
                        color: "var(--gold-bright)",
                        minWidth: "100px",
                      }}
                    >
                      {ISSUE_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                    </select>
                    <select
                      value={issueRow.year}
                      onChange={(e) => updateEditIssue(idx, "year", e.target.value)}
                      style={{
                        padding: "0.35rem",
                        background: "var(--glass)",
                        border: "1px solid var(--glass-border)",
                        borderRadius: "4px",
                        color: "var(--gold-bright)",
                        minWidth: "70px",
                      }}
                    >
                      {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
                    </select>
                    <select
                      value={issueRow.specialFeatures}
                      onChange={(e) => updateEditIssue(idx, "specialFeatures", e.target.value)}
                      style={{
                        padding: "0.35rem",
                        background: "var(--glass)",
                        border: "1px solid var(--glass-border)",
                        borderRadius: "4px",
                        color: "var(--gold-bright)",
                        minWidth: "120px",
                      }}
                    >
                      {SPECIAL_FEATURES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                    {idx === editIssues.length - 1 && (
                      <button
                        type="button"
                        onClick={addEditIssueRow}
                        style={{
                          padding: "0.25rem 0.5rem",
                          background: "var(--glass)",
                          border: "1px solid var(--glass-border)",
                          borderRadius: "4px",
                          color: "var(--gold-bright)",
                          cursor: "pointer",
                        }}
                      >
                        +
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <label>
                <span style={{ color: "var(--gold-dim)", fontSize: "0.8rem" }}>Geo</span>
                <select
                  value={editGeo}
                  onChange={(e) => setEditGeo(e.target.value)}
                  style={{
                    display: "block",
                    width: "100%",
                    padding: "0.5rem",
                    background: "var(--glass)",
                    border: "1px solid var(--glass-border)",
                    borderRadius: "6px",
                    color: "var(--gold-bright)",
                    marginTop: "4px",
                  }}
                >
                  <option value="">—</option>
                  <option value="Yes">Yes</option>
                  <option value="No">No</option>
                </select>
              </label>
              <label>
                <span style={{ color: "var(--gold-dim)", fontSize: "0.8rem" }}>Impressions</span>
                <input
                  type="text"
                  value={editImpressions}
                  onChange={(e) => setEditImpressions(e.target.value.replace(/\D/g, "").slice(0, 7))}
                  style={{
                    display: "block",
                    width: "100%",
                    padding: "0.5rem",
                    background: "var(--glass)",
                    border: "1px solid var(--glass-border)",
                    borderRadius: "6px",
                    color: "var(--gold-bright)",
                    marginTop: "4px",
                  }}
                />
              </label>
              <div>
                <span style={{ color: "var(--gold-dim)", fontSize: "0.8rem" }}>Deadline</span>
                <div style={{ display: "flex", gap: "0.5rem", marginTop: "4px" }}>
                  <select
                    value={editDeadlineMonth}
                    onChange={(e) => setEditDeadlineMonth(e.target.value)}
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
                    {MONTHS.map((m) => <option key={m} value={m}>{m}</option>)}
                  </select>
                  <select
                    value={editDeadlineDay}
                    onChange={(e) => setEditDeadlineDay(e.target.value)}
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
                    {DAYS_1_31.map((d) => <option key={d} value={d}>{d}</option>)}
                  </select>
                  <select
                    value={editDeadlineYear}
                    onChange={(e) => setEditDeadlineYear(e.target.value)}
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
                    {DEADLINE_YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
              </div>
              <label>
                <span style={{ color: "var(--gold-dim)", fontSize: "0.8rem" }}>Notes (max 50)</span>
                <input
                  type="text"
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value.slice(0, 50))}
                  maxLength={50}
                  style={{
                    display: "block",
                    width: "100%",
                    padding: "0.5rem",
                    background: "var(--glass)",
                    border: "1px solid var(--glass-border)",
                    borderRadius: "6px",
                    color: "var(--gold-bright)",
                    marginTop: "4px",
                  }}
                />
              </label>
            </div>
            <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
              <button
                type="button"
                onClick={() => setEditModal(null)}
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
                onClick={handleSaveEdit}
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
                {actioningId !== null ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
