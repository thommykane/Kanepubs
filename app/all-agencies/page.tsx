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

export default function AllAgenciesPage() {
  const [list, setList] = useState<Agency[]>([]);
  const [users, setUsers] = useState<{ id: string; username: string }[]>([]);
  const [searchAssignedTo, setSearchAssignedTo] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectionColumnOpen, setSelectionColumnOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [assignToUsername, setAssignToUsername] = useState("");
  const [assigning, setAssigning] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const PER_PAGE = 25;
  const totalPages = Math.max(1, Math.ceil(list.length / PER_PAGE));
  const start = (currentPage - 1) * PER_PAGE;
  const paginatedList = list.slice(start, start + PER_PAGE);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(1);
  }, [currentPage, totalPages]);

  const fetchAgencies = useCallback(async () => {
    const params = new URLSearchParams();
    if (searchAssignedTo.trim()) params.set("assignedTo", searchAssignedTo.trim());
    const res = await fetch(`/api/agencies?${params}`, { cache: "no-store" });
    const data = await res.json();
    setList(Array.isArray(data) ? data : []);
  }, [searchAssignedTo]);

  useEffect(() => {
    setLoading(true);
    fetchAgencies().finally(() => setLoading(false));
  }, [fetchAgencies]);

  useEffect(() => {
    fetch("/api/users", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => setUsers(Array.isArray(data) ? data : []));
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
    const visibleIds = paginatedList.map((a) => a.id);
    const visibleSelected = visibleIds.filter((id) => selectedIds.has(id)).length;
    if (visibleIds.length > 0 && visibleSelected === visibleIds.length) {
      setSelectedIds((prev) => { const next = new Set(prev); visibleIds.forEach((id) => next.delete(id)); return next; });
    } else {
      setSelectedIds((prev) => { const next = new Set(prev); visibleIds.forEach((id) => next.add(id)); return next; });
    }
  };

  const handleBulkAssign = async () => {
    if (selectedIds.size === 0 || !assignToUsername) return;
    setAssigning(true);
    try {
      const selected = list.filter((a) => selectedIds.has(a.id) && a.displayId);
      for (const agency of selected) {
        await fetch(`/api/agencies/${encodeURIComponent(agency.displayId as string)}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ assignedTo: assignToUsername }),
          credentials: "include",
        });
      }
      await fetchAgencies();
      setSelectedIds(new Set());
    } finally {
      setAssigning(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    padding: "0.4rem 0.6rem",
    background: "var(--glass)",
    border: "1px solid var(--glass-border)",
    borderRadius: "6px",
    color: "var(--gold-bright)",
    fontSize: "0.875rem",
  };

  const linkStyle = { color: "var(--gold-bright)", textDecoration: "none" };
  const tdStyle = { padding: "10px 12px", fontSize: "0.875rem", color: "var(--gold-bright)", borderBottom: "1px solid var(--glass-border)" };

  return (
    <div style={{ padding: "1rem", width: "100%" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", flexWrap: "wrap", gap: "0.5rem" }}>
        <h1 style={{ color: "var(--gold-bright)", margin: 0 }}>All Agencies</h1>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={() => setSelectionColumnOpen((v) => !v)}
            style={{
              padding: "0.5rem 0.75rem",
              background: selectionColumnOpen ? "var(--gold)" : "var(--glass)",
              border: "1px solid var(--glass-border)",
              borderRadius: "6px",
              color: selectionColumnOpen ? "var(--bg)" : "var(--gold-bright)",
              cursor: "pointer",
              fontSize: "0.875rem",
            }}
          >
            Select leads / Assign
          </button>
          {selectionColumnOpen && (
            <>
              <select
                value={assignToUsername}
                onChange={(e) => setAssignToUsername(e.target.value)}
                style={{ ...inputStyle, minWidth: "120px" }}
              >
                <option value="">Assign to...</option>
                {users.map((u) => (
                  <option key={u.id} value={u.username}>{u.username}</option>
                ))}
              </select>
              <button
                type="button"
                onClick={handleBulkAssign}
                disabled={selectedIds.size === 0 || !assignToUsername || assigning}
                style={{
                  padding: "0.5rem 0.75rem",
                  background: "var(--gold)",
                  color: "var(--bg)",
                  border: "none",
                  borderRadius: "6px",
                  fontWeight: 600,
                  cursor: selectedIds.size === 0 || !assignToUsername || assigning ? "not-allowed" : "pointer",
                  fontSize: "0.875rem",
                }}
              >
                {assigning ? "Assigning..." : `Assign (${selectedIds.size})`}
              </button>
            </>
          )}
          <Link href="/new-agency" style={{ ...linkStyle, padding: "0.5rem 0.75rem", background: "var(--gold)", color: "var(--bg)", borderRadius: "6px", fontWeight: 600 }}>
            New Agency
          </Link>
        </div>
      </div>
      <div
        style={{
          display: "flex",
          gap: "0.75rem",
          marginBottom: "1rem",
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <select
          value={searchAssignedTo}
          onChange={(e) => setSearchAssignedTo(e.target.value)}
          style={{ ...inputStyle, minWidth: "170px" }}
        >
          <option value="">Assigned to (all)</option>
          <option value="__UNASSIGNED__">Unassigned</option>
          {users.map((u) => (
            <option key={u.id} value={u.username}>{u.username}</option>
          ))}
        </select>
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
                {selectionColumnOpen && (
                  <th style={{ padding: "10px 12px", fontSize: "0.75rem", fontWeight: 600, color: "var(--gold-dim)", textTransform: "uppercase" }}>
                    <input
                      type="checkbox"
                      checked={selectedIds.size > 0 && selectedIds.size === list.length}
                      onChange={selectAll}
                      title="Select all"
                    />
                  </th>
                )}
                <th style={{ padding: "10px 12px", fontSize: "0.75rem", fontWeight: 600, color: "var(--gold-dim)", textTransform: "uppercase" }}>Agency</th>
                <th style={{ padding: "10px 12px", fontSize: "0.75rem", fontWeight: 600, color: "var(--gold-dim)", textTransform: "uppercase" }}>ID</th>
                <th style={{ padding: "10px 12px", fontSize: "0.75rem", fontWeight: 600, color: "var(--gold-dim)", textTransform: "uppercase" }}>City / State</th>
                <th style={{ padding: "10px 12px", fontSize: "0.75rem", fontWeight: 600, color: "var(--gold-dim)", textTransform: "uppercase" }}>Phone</th>
                <th style={{ padding: "10px 12px", fontSize: "0.75rem", fontWeight: 600, color: "var(--gold-dim)", textTransform: "uppercase" }}>Assigned To</th>
              </tr>
            </thead>
            <tbody>
              {paginatedList.map((a) => (
                <tr key={a.id}>
                  {selectionColumnOpen && (
                    <td style={tdStyle}>
                      <input
                        type="checkbox"
                        checked={selectedIds.has(a.id)}
                        onChange={() => toggleSelect(a.id)}
                        title="Select agency"
                      />
                    </td>
                  )}
                  <td style={tdStyle}>
                    <Link href={`/all-agencies/${a.displayId ?? a.id}`} style={linkStyle}>
                      {a.agencyName ?? "—"}
                    </Link>
                  </td>
                  <td style={tdStyle}>{a.displayId ?? "—"}</td>
                  <td style={tdStyle}>{[a.city, a.state].filter(Boolean).join(", ") || "—"}</td>
                  <td style={tdStyle}>{a.phone ?? "—"}</td>
                  <td style={tdStyle}>
                    {a.assignedTo && a.assignedTo.toLowerCase() !== "admin" ? a.assignedTo : "Unassigned"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {!loading && list.length > 0 && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.5rem", marginTop: "1rem", padding: "0.5rem 0" }}>
          <span style={{ color: "var(--gold-dim)", fontSize: "0.875rem" }}>
            Showing {start + 1}–{Math.min(start + PER_PAGE, list.length)} of {list.length}
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: "0.25rem", flexWrap: "wrap" }}>
            <button type="button" disabled={currentPage <= 1} onClick={() => setCurrentPage((p) => p - 1)} style={{ padding: "0.35rem 0.6rem", fontSize: "0.8rem", background: "var(--glass)", border: "1px solid var(--glass-border)", borderRadius: "6px", color: "var(--gold-bright)", cursor: currentPage <= 1 ? "not-allowed" : "pointer", opacity: currentPage <= 1 ? 0.5 : 1 }}>Prev</button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button key={p} type="button" onClick={() => setCurrentPage(p)} style={{ padding: "0.35rem 0.6rem", minWidth: "2rem", fontSize: "0.8rem", background: p === currentPage ? "var(--gold)" : "var(--glass)", border: "1px solid var(--glass-border)", borderRadius: "6px", color: p === currentPage ? "var(--bg)" : "var(--gold-bright)", cursor: "pointer" }}>{p}</button>
            ))}
            <button type="button" disabled={currentPage >= totalPages} onClick={() => setCurrentPage((p) => p + 1)} style={{ padding: "0.35rem 0.6rem", fontSize: "0.8rem", background: "var(--glass)", border: "1px solid var(--glass-border)", borderRadius: "6px", color: "var(--gold-bright)", cursor: currentPage >= totalPages ? "not-allowed" : "pointer", opacity: currentPage >= totalPages ? 0.5 : 1 }}>Next</button>
          </div>
        </div>
      )}
    </div>
  );
}
