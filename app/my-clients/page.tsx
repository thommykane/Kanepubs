"use client";

import Link from "next/link";
import { useEffect, useState, useCallback } from "react";

type ClientRow = {
  proposalId: string;
  companyType: string;
  companyDisplayId: string;
  companyName: string;
  moneySpent: number;
  transactions: number;
  dateLastSold: string | null;
  lastActivityAt: string | null;
  lastActivityType: string | null;
  lastContactFirstName: string | null;
  lastContactLastName: string | null;
};

type UserOption = { id: string; username: string };

export default function MyClientsPage() {
  const [list, setList] = useState<ClientRow[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [selectionOpen, setSelectionOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [assignToUsername, setAssignToUsername] = useState("");
  const [assigning, setAssigning] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const fetchClients = useCallback(async () => {
    const res = await fetch("/api/my-clients");
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
    fetchClients().then(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, [fetchClients]);

  useEffect(() => {
    fetch("/api/users")
      .then((r) => r.json())
      .then((data) => setUsers(Array.isArray(data) ? data : []));
  }, []);

  useEffect(() => {
    fetch("/api/me")
      .then((r) => r.json())
      .then((data) => setIsAdmin(data?.user?.isAdmin ?? false));
  }, []);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selectedIds.size === list.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(list.map((r) => r.proposalId)));
  };

  const handleBulkAssign = async () => {
    if (selectedIds.size === 0 || !assignToUsername.trim()) return;
    setAssigning(true);
    try {
      const res = await fetch("/api/my-clients", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ proposalIds: Array.from(selectedIds), assignedTo: assignToUsername.trim() }),
      });
      if (res.ok) {
        await fetchClients();
        setSelectedIds(new Set());
      }
    } finally {
      setAssigning(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!window.confirm(`Delete ${selectedIds.size} selected client(s)? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      const ids = [...selectedIds];
      for (const id of ids) {
        await fetch(`/api/proposals/${id}`, { method: "DELETE" });
      }
      await fetchClients();
      setSelectedIds(new Set());
    } finally {
      setDeleting(false);
    }
  };

  const formatDateTime = (s: string | null) => {
    if (!s) return "—";
    try {
      return new Date(s).toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" });
    } catch {
      return "—";
    }
  };

  const companyHref = (row: ClientRow) =>
    row.companyType === "org"
      ? `/all-organizations/${row.companyDisplayId}`
      : `/all-businesses/${row.companyDisplayId}`;

  const inputStyle: React.CSSProperties = {
    padding: "0.4rem 0.6rem",
    background: "var(--glass)",
    border: "1px solid var(--glass-border)",
    borderRadius: "6px",
    color: "var(--gold-bright)",
    fontSize: "0.875rem",
  };

  const thStyle: React.CSSProperties = {
    padding: "10px 12px",
    fontSize: "0.75rem",
    fontWeight: 600,
    color: "var(--gold-dim)",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  };

  const tdBase: React.CSSProperties = {
    padding: "10px 12px",
    fontSize: "0.875rem",
    maxWidth: "180px",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  };
  const tdStyle: React.CSSProperties = { ...tdBase, color: "var(--gold-bright)" };

  return (
    <div style={{ width: "100%" }}>
      <h1 style={{ color: "var(--gold-bright)", marginBottom: "1rem" }}>My Clients</h1>

      {isAdmin && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            marginBottom: "1rem",
            flexWrap: "wrap",
          }}
        >
          <button
            type="button"
            onClick={() => setSelectionOpen((v) => !v)}
            style={{
              padding: "0.5rem 0.75rem",
              background: selectionOpen ? "var(--gold)" : "var(--glass)",
              border: "1px solid var(--glass-border)",
              borderRadius: "6px",
              color: selectionOpen ? "var(--bg)" : "var(--gold-bright)",
              cursor: "pointer",
              fontSize: "0.875rem",
            }}
          >
            Select client / Assign
          </button>
          {selectionOpen && (
            <>
              <select
                value={assignToUsername}
                onChange={(e) => setAssignToUsername(e.target.value)}
                style={{ ...inputStyle, minWidth: "120px" }}
              >
                <option value="">Assign to…</option>
                {users.map((u) => (
                  <option key={u.id} value={u.username}>{u.username}</option>
                ))}
              </select>
              <button
                type="button"
                onClick={handleBulkAssign}
                disabled={selectedIds.size === 0 || !assignToUsername.trim() || assigning}
                style={{
                  padding: "0.5rem 0.75rem",
                  background: "var(--gold)",
                  color: "var(--bg)",
                  border: "none",
                  borderRadius: "6px",
                  fontWeight: 600,
                  cursor: selectedIds.size === 0 || !assignToUsername.trim() || assigning ? "not-allowed" : "pointer",
                  fontSize: "0.875rem",
                }}
              >
                {assigning ? "Assigning…" : `Assign ${selectedIds.size}`}
              </button>
              <button
                type="button"
                onClick={handleBulkDelete}
                disabled={selectedIds.size === 0 || deleting}
                style={{
                  padding: "0.5rem 0.75rem",
                  background: "#b91c1c",
                  color: "#fff",
                  border: "none",
                  borderRadius: "6px",
                  fontWeight: 600,
                  cursor: selectedIds.size === 0 || deleting ? "not-allowed" : "pointer",
                  fontSize: "0.875rem",
                }}
              >
                {deleting ? "Deleting…" : `Delete ${selectedIds.size}`}
              </button>
            </>
          )}
        </div>
      )}

      <div
        style={{
          background: "var(--glass)",
          border: "1px solid var(--glass-border)",
          borderRadius: "8px",
          overflow: "auto",
        }}
      >
        {loading ? (
          <div style={{ padding: "2rem", textAlign: "center", color: "var(--gold-dim)" }}>Loading…</div>
        ) : list.length === 0 ? (
          <div style={{ padding: "2rem", textAlign: "center", color: "var(--gold-dim)" }}>
            No clients assigned to you yet.
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "900px" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--glass-border)", textAlign: "left" }}>
                {isAdmin && selectionOpen && (
                  <th style={thStyle}>
                    <button
                      type="button"
                      onClick={selectAll}
                      style={{
                        padding: "0.25rem 0.5rem",
                        fontSize: "0.7rem",
                        background: "var(--glass)",
                        border: "1px solid var(--glass-border)",
                        borderRadius: "4px",
                        color: "var(--gold-bright)",
                        cursor: "pointer",
                      }}
                    >
                      {selectedIds.size === list.length ? "Deselect all" : "Select all"}
                    </button>
                  </th>
                )}
                <th style={thStyle}>Organization / Business</th>
                <th style={thStyle}>Money spent</th>
                <th style={thStyle}>Transactions</th>
                <th style={thStyle}>Date last sold</th>
                <th style={thStyle}>Last activity</th>
                <th style={thStyle}>Contact (last activity)</th>
              </tr>
            </thead>
            <tbody>
              {list.map((row) => (
                <tr
                  key={row.proposalId}
                  style={{
                    borderBottom: "1px solid var(--glass-border)",
                    height: "44px",
                  }}
                >
                  {isAdmin && selectionOpen && (
                    <td style={tdStyle}>
                      <input
                        type="checkbox"
                        checked={selectedIds.has(row.proposalId)}
                        onChange={() => toggleSelect(row.proposalId)}
                      />
                    </td>
                  )}
                  <td style={tdStyle}>
                    <Link href={companyHref(row)} style={{ color: "var(--gold-bright)", fontWeight: 700 }}>
                      {row.companyName}
                    </Link>
                  </td>
                  <td style={tdStyle}>
                    ${row.moneySpent.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </td>
                  <td style={tdStyle}>{row.transactions}</td>
                  <td style={tdStyle}>{formatDateTime(row.dateLastSold)}</td>
                  <td style={tdStyle}>
                    {row.lastActivityAt ? (
                      <>
                        <div>{formatDateTime(row.lastActivityAt)}</div>
                        {row.lastActivityType && (
                          <div style={{ fontSize: "0.75rem", color: "var(--gold-dim)" }}>{row.lastActivityType}</div>
                        )}
                      </>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td style={tdStyle}>
                    {row.lastContactFirstName ?? row.lastContactLastName
                      ? [row.lastContactFirstName, row.lastContactLastName].filter(Boolean).join(" ")
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
