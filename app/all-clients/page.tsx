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
  assignedTo: string | null;
};

type UserOption = { id: string; username: string };

export default function AllClientsPage() {
  const [list, setList] = useState<ClientRow[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [searchName, setSearchName] = useState("");
  const [searchDisplayId, setSearchDisplayId] = useState("");
  const [searchAssignedTo, setSearchAssignedTo] = useState("");
  const [searchCompanyType, setSearchCompanyType] = useState("");
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [selectionOpen, setSelectionOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [assignToUsername, setAssignToUsername] = useState("");
  const [assigning, setAssigning] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const PER_PAGE = 25;

  const fetchClients = useCallback(async () => {
    const res = await fetch("/api/all-clients", { cache: "no-store" });
    if (res.status === 403) {
      setAccessDenied(true);
      setList([]);
      return;
    }
    if (res.status === 401) {
      setList([]);
      return;
    }
    setAccessDenied(false);
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

  const totalPages = Math.max(1, Math.ceil(filteredList.length / PER_PAGE));
  const start = (currentPage - 1) * PER_PAGE;
  const paginatedList = filteredList.slice(start, start + PER_PAGE);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(1);
  }, [currentPage, totalPages, filteredList.length]);

  const selectAll = () => {
    const visibleIds = paginatedList.map((r) => r.proposalId);
    const visibleSelected = visibleIds.filter((id) => selectedIds.has(id)).length;
    if (visibleIds.length > 0 && visibleSelected === visibleIds.length) {
      setSelectedIds((prev) => { const next = new Set(prev); visibleIds.forEach((id) => next.delete(id)); return next; });
    } else {
      setSelectedIds((prev) => { const next = new Set(prev); visibleIds.forEach((id) => next.add(id)); return next; });
    }
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
      : row.companyType === "agency"
        ? `/all-agencies/${row.companyDisplayId}`
        : `/all-businesses/${row.companyDisplayId}`;

  const companyLabel = (companyType: string) =>
    companyType === "org" ? "Organization" : companyType === "agency" ? "Agency" : "Business";

  const filteredList = list.filter((row) => {
    const byName = searchName.trim()
      ? row.companyName.toLowerCase().includes(searchName.trim().toLowerCase())
      : true;
    const byId = searchDisplayId.trim()
      ? row.companyDisplayId.toLowerCase().includes(searchDisplayId.trim().toLowerCase())
      : true;
    const rowAssigned = row.assignedTo ?? "";
    const byAssigned =
      searchAssignedTo === "__UNASSIGNED__"
        ? rowAssigned.trim() === "" || rowAssigned.toLowerCase() === "admin"
        : searchAssignedTo
          ? rowAssigned === searchAssignedTo
          : true;
    const byCompany = searchCompanyType ? row.companyType === searchCompanyType : true;
    return byName && byId && byAssigned && byCompany;
  });

  const totalPages = Math.max(1, Math.ceil(filteredList.length / PER_PAGE));
  const start = (currentPage - 1) * PER_PAGE;
  const paginatedList = filteredList.slice(start, start + PER_PAGE);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(1);
  }, [currentPage, totalPages, filteredList.length]);

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

  if (accessDenied) {
    return (
      <div style={{ width: "100%" }}>
        <h1 style={{ color: "var(--gold-bright)", marginBottom: "1rem" }}>All Clients</h1>
        <p style={{ color: "var(--gold-dim)" }}>You do not have access to this page.</p>
      </div>
    );
  }

  return (
    <div style={{ width: "100%" }}>
      <h1 style={{ color: "var(--gold-bright)", marginBottom: "1rem" }}>All Clients</h1>

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

      <div
        style={{
          display: "flex",
          gap: "0.75rem",
          marginBottom: "1rem",
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <input
          type="text"
          placeholder="Search by name"
          value={searchName}
          onChange={(e) => setSearchName(e.target.value)}
          style={{ ...inputStyle, minWidth: "150px" }}
        />
        <input
          type="text"
          placeholder="Search by ID"
          value={searchDisplayId}
          onChange={(e) => setSearchDisplayId(e.target.value)}
          style={{ ...inputStyle, minWidth: "140px" }}
        />
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
        <select
          value={searchCompanyType}
          onChange={(e) => setSearchCompanyType(e.target.value)}
          style={{ ...inputStyle, minWidth: "160px" }}
        >
          <option value="">Company (all)</option>
          <option value="org">Organizations</option>
          <option value="business">Businesses</option>
          <option value="agency">Agencies</option>
        </select>
      </div>

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
        ) : filteredList.length === 0 ? (
          <div style={{ padding: "2rem", textAlign: "center", color: "var(--gold-dim)" }}>
            No clients match your filters.
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "900px" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--glass-border)", textAlign: "left" }}>
                {selectionOpen && (
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
                      {paginatedList.length > 0 && paginatedList.every((r) => selectedIds.has(r.proposalId)) ? "Deselect all" : "Select all"}
                    </button>
                  </th>
                )}
                <th style={thStyle}>Company</th>
                <th style={thStyle}>Organization / Business</th>
                <th style={thStyle}>Assigned to</th>
                <th style={thStyle}>Money spent</th>
                <th style={thStyle}>Transactions</th>
                <th style={thStyle}>Date last sold</th>
                <th style={thStyle}>Last activity</th>
                <th style={thStyle}>Contact (last activity)</th>
              </tr>
            </thead>
            <tbody>
              {paginatedList.map((row) => (
                <tr
                  key={row.proposalId}
                  style={{
                    borderBottom: "1px solid var(--glass-border)",
                    height: "44px",
                  }}
                >
                  {selectionOpen && (
                    <td style={tdStyle}>
                      <input
                        type="checkbox"
                        checked={selectedIds.has(row.proposalId)}
                        onChange={() => toggleSelect(row.proposalId)}
                      />
                    </td>
                  )}
                  <td style={tdStyle}>{companyLabel(row.companyType)}</td>
                  <td style={tdStyle}>
                    <Link href={companyHref(row)} style={{ color: "var(--gold-bright)", fontWeight: 700 }}>
                      {row.companyName}
                    </Link>
                  </td>
                  <td style={tdStyle}>
                    {row.assignedTo && row.assignedTo.toLowerCase() !== "admin" ? row.assignedTo : "Unassigned"}
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
      {!loading && filteredList.length > 0 && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.5rem", marginTop: "1rem", padding: "0.5rem 0" }}>
          <span style={{ color: "var(--gold-dim)", fontSize: "0.875rem" }}>
            Showing {start + 1}–{Math.min(start + PER_PAGE, filteredList.length)} of {filteredList.length}
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
