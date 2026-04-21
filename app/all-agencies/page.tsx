"use client";

import Link from "next/link";
import { useEffect, useState, useCallback } from "react";
import { normalizeWebsiteUrl } from "@/lib/normalize-website-url";

type Agency = {
  id: string;
  displayId: string | null;
  agencyName: string | null;
  address: string | null;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  zipCode: string | null;
  phone: string | null;
  website: string | null;
  agencyType: string | null;
  tags: string | null;
  createdBy: string | null;
  assignedTo: string | null;
  createdAt: string;
};

type UserOption = { id: string; username: string };

export default function AllAgenciesPage() {
  const [list, setList] = useState<Agency[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [searchAssignedTo, setSearchAssignedTo] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectionColumnOpen, setSelectionColumnOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [assignToUsername, setAssignToUsername] = useState("");
  const [assigning, setAssigning] = useState(false);
  const [editing, setEditing] = useState<Agency | null>(null);
  const [editForm, setEditForm] = useState<Record<string, string>>({});
  const [savingEdit, setSavingEdit] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
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

  useEffect(() => {
    fetch("/api/me", { cache: "no-store" })
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
    const visibleIds = paginatedList.map((a) => a.id);
    const visibleSelected = visibleIds.filter((id) => selectedIds.has(id)).length;
    if (visibleIds.length > 0 && visibleSelected === visibleIds.length) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        visibleIds.forEach((id) => next.delete(id));
        return next;
      });
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        visibleIds.forEach((id) => next.add(id));
        return next;
      });
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

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!window.confirm(`Delete ${selectedIds.size} selected agency/agencies? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      const selected = list.filter((a) => selectedIds.has(a.id) && a.displayId);
      for (const agency of selected) {
        await fetch(`/api/agencies/${encodeURIComponent(agency.displayId as string)}`, {
          method: "DELETE",
          credentials: "include",
        });
      }
      await fetchAgencies();
      setSelectedIds(new Set());
    } finally {
      setDeleting(false);
    }
  };

  const openEdit = (a: Agency) => {
    setEditing(a);
    setEditForm({
      agencyName: a.agencyName ?? "",
      address: a.address ?? "",
      addressLine2: a.addressLine2 ?? "",
      city: a.city ?? "",
      state: a.state ?? "",
      zipCode: a.zipCode ?? "",
      phone: a.phone ?? "",
      website: a.website ?? "",
      agencyType: a.agencyType ?? "",
      tags: a.tags ?? "",
      assignedTo: a.assignedTo ?? "",
    });
  };

  const saveEdit = async () => {
    if (!editing?.displayId) return;
    setSavingEdit(true);
    try {
      const res = await fetch(`/api/agencies/${encodeURIComponent(editing.displayId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
        credentials: "include",
      });
      if (res.ok) {
        await fetchAgencies();
        setEditing(null);
      }
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDelete = async (displayId: string) => {
    setDeleting(true);
    try {
      await fetch(`/api/agencies/${encodeURIComponent(displayId)}`, {
        method: "DELETE",
        credentials: "include",
      });
      await fetchAgencies();
      setDeleteConfirmId(null);
    } finally {
      setDeleting(false);
    }
  };

  const formatCreated = (createdAt: string) => {
    try {
      return new Date(createdAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
    } catch {
      return "—";
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
  const tdStyle: React.CSSProperties = {
    padding: "10px 12px",
    fontSize: "0.875rem",
    color: "var(--gold-bright)",
    borderBottom: "1px solid var(--glass-border)",
  };

  return (
    <div style={{ width: "100%" }}>
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
              {isAdmin && (
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
                  {deleting ? "Deleting…" : `Delete (${selectedIds.size})`}
                </button>
              )}
            </>
          )}
          <Link href="/new-agency" style={{ ...linkStyle, padding: "0.5rem 0.75rem", background: "var(--gold)", color: "var(--bg)", borderRadius: "6px", fontWeight: 600 }}>
            New Agency
          </Link>
        </div>
      </div>

      <div style={{ display: "flex", gap: "0.75rem", marginBottom: "1rem", flexWrap: "wrap", alignItems: "center" }}>
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

      {editing && (
        <>
          <div
            role="presentation"
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.5)",
              zIndex: 1000,
            }}
            onClick={() => setEditing(null)}
          />
          <div
            style={{
              position: "fixed",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              zIndex: 1001,
              background: "var(--glass)",
              border: "1px solid var(--glass-border)",
              borderRadius: "8px",
              padding: "1.25rem",
              minWidth: "min(420px, 92vw)",
              maxHeight: "90vh",
              overflow: "auto",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ color: "var(--gold-bright)", marginTop: 0 }}>Edit agency</h2>
            <label style={{ display: "block", marginBottom: "0.75rem" }}>
              <span style={{ color: "var(--gold-dim)", fontSize: "0.8rem" }}>Agency name</span>
              <input
                value={editForm.agencyName ?? ""}
                onChange={(e) => setEditForm((p) => ({ ...p, agencyName: e.target.value }))}
                style={{ ...inputStyle, width: "100%", display: "block", marginTop: "4px" }}
              />
            </label>
            <label style={{ display: "block", marginBottom: "0.75rem" }}>
              <span style={{ color: "var(--gold-dim)", fontSize: "0.8rem" }}>Address</span>
              <input
                value={editForm.address ?? ""}
                onChange={(e) => setEditForm((p) => ({ ...p, address: e.target.value }))}
                style={{ ...inputStyle, width: "100%", display: "block", marginTop: "4px" }}
              />
            </label>
            <label style={{ display: "block", marginBottom: "0.75rem" }}>
              <span style={{ color: "var(--gold-dim)", fontSize: "0.8rem" }}>Address line 2</span>
              <input
                value={editForm.addressLine2 ?? ""}
                onChange={(e) => setEditForm((p) => ({ ...p, addressLine2: e.target.value }))}
                style={{ ...inputStyle, width: "100%", display: "block", marginTop: "4px" }}
              />
            </label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem", marginBottom: "0.75rem" }}>
              <label>
                <span style={{ color: "var(--gold-dim)", fontSize: "0.8rem" }}>City</span>
                <input
                  value={editForm.city ?? ""}
                  onChange={(e) => setEditForm((p) => ({ ...p, city: e.target.value }))}
                  style={{ ...inputStyle, width: "100%", display: "block", marginTop: "4px" }}
                />
              </label>
              <label>
                <span style={{ color: "var(--gold-dim)", fontSize: "0.8rem" }}>State</span>
                <input
                  value={editForm.state ?? ""}
                  onChange={(e) => setEditForm((p) => ({ ...p, state: e.target.value }))}
                  style={{ ...inputStyle, width: "100%", display: "block", marginTop: "4px" }}
                />
              </label>
            </div>
            <label style={{ display: "block", marginBottom: "0.75rem" }}>
              <span style={{ color: "var(--gold-dim)", fontSize: "0.8rem" }}>ZIP</span>
              <input
                value={editForm.zipCode ?? ""}
                onChange={(e) => setEditForm((p) => ({ ...p, zipCode: e.target.value }))}
                style={{ ...inputStyle, width: "100%", display: "block", marginTop: "4px" }}
              />
            </label>
            <label style={{ display: "block", marginBottom: "0.75rem" }}>
              <span style={{ color: "var(--gold-dim)", fontSize: "0.8rem" }}>Phone</span>
              <input
                value={editForm.phone ?? ""}
                onChange={(e) => setEditForm((p) => ({ ...p, phone: e.target.value }))}
                style={{ ...inputStyle, width: "100%", display: "block", marginTop: "4px" }}
              />
            </label>
            <label style={{ display: "block", marginBottom: "0.75rem" }}>
              <span style={{ color: "var(--gold-dim)", fontSize: "0.8rem" }}>Website</span>
              <input
                value={editForm.website ?? ""}
                onChange={(e) => setEditForm((p) => ({ ...p, website: e.target.value }))}
                style={{ ...inputStyle, width: "100%", display: "block", marginTop: "4px" }}
              />
            </label>
            <label style={{ display: "block", marginBottom: "0.75rem" }}>
              <span style={{ color: "var(--gold-dim)", fontSize: "0.8rem" }}>Agency type</span>
              <input
                value={editForm.agencyType ?? ""}
                onChange={(e) => setEditForm((p) => ({ ...p, agencyType: e.target.value }))}
                style={{ ...inputStyle, width: "100%", display: "block", marginTop: "4px" }}
              />
            </label>
            <label style={{ display: "block", marginBottom: "0.75rem" }}>
              <span style={{ color: "var(--gold-dim)", fontSize: "0.8rem" }}>Tags</span>
              <input
                value={editForm.tags ?? ""}
                onChange={(e) => setEditForm((p) => ({ ...p, tags: e.target.value }))}
                style={{ ...inputStyle, width: "100%", display: "block", marginTop: "4px" }}
              />
            </label>
            <label style={{ display: "block", marginBottom: "1rem" }}>
              <span style={{ color: "var(--gold-dim)", fontSize: "0.8rem" }}>Assigned to</span>
              <select
                value={editForm.assignedTo ?? ""}
                onChange={(e) => setEditForm((p) => ({ ...p, assignedTo: e.target.value }))}
                style={{ ...inputStyle, width: "100%", display: "block", marginTop: "4px" }}
              >
                <option value="">Unassigned</option>
                {users.map((u) => (
                  <option key={u.id} value={u.username}>{u.username}</option>
                ))}
              </select>
            </label>
            <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
              <button
                type="button"
                onClick={() => setEditing(null)}
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
                onClick={saveEdit}
                disabled={savingEdit}
                style={{
                  padding: "0.5rem 1rem",
                  background: "var(--gold)",
                  color: "var(--bg)",
                  border: "none",
                  borderRadius: "6px",
                  fontWeight: 600,
                  cursor: savingEdit ? "not-allowed" : "pointer",
                }}
              >
                {savingEdit ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </>
      )}

      <div style={{ background: "var(--glass)", border: "1px solid var(--glass-border)", borderRadius: "8px", overflow: "auto" }}>
        {loading ? (
          <div style={{ padding: "2rem", color: "var(--gold-dim)" }}>Loading…</div>
        ) : list.length === 0 ? (
          <div style={{ padding: "2rem", color: "var(--gold-dim)" }}>No agencies yet.</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "960px" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--glass-border)", textAlign: "left" }}>
                {selectionColumnOpen && (
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
                      {paginatedList.length > 0 && paginatedList.every((a) => selectedIds.has(a.id)) ? "Deselect all" : "Select all"}
                    </button>
                  </th>
                )}
                <th style={thStyle}>Created</th>
                <th style={thStyle}>Created by</th>
                <th style={thStyle}>Agency</th>
                <th style={thStyle}>ID</th>
                <th style={thStyle}>City / State</th>
                <th style={thStyle}>Phone</th>
                <th style={thStyle}>Website</th>
                <th style={thStyle}>Assigned To</th>
                <th style={thStyle}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedList.map((a) => (
                <tr key={a.id} style={{ borderBottom: "1px solid var(--glass-border)" }}>
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
                  <td style={{ ...tdStyle, color: "#89CFF0" }}>{formatCreated(a.createdAt)}</td>
                  <td style={tdStyle}>{a.createdBy ?? "Admin"}</td>
                  <td style={tdStyle}>
                    <Link href={`/all-agencies/${a.displayId ?? a.id}`} style={linkStyle}>
                      {a.agencyName ?? "—"}
                    </Link>
                  </td>
                  <td style={tdStyle}>{a.displayId ?? "—"}</td>
                  <td style={tdStyle}>{[a.city, a.state].filter(Boolean).join(", ") || "—"}</td>
                  <td style={tdStyle}>{a.phone ?? "—"}</td>
                  <td style={tdStyle}>
                    {a.website ? (
                      <a
                        href={normalizeWebsiteUrl(a.website) ?? a.website ?? undefined}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: "#2563eb" }}
                      >
                        {normalizeWebsiteUrl(a.website) ?? a.website}
                      </a>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td style={tdStyle}>
                    {a.assignedTo && a.assignedTo.toLowerCase() !== "admin" ? a.assignedTo : "Unassigned"}
                  </td>
                  <td style={tdStyle}>
                    {isAdmin && a.displayId ? (
                      <div style={{ display: "flex", gap: "0.35rem", alignItems: "center", flexWrap: "wrap" }}>
                        <button type="button" onClick={() => openEdit(a)} style={btnSmall}>
                          Edit
                        </button>
                        {deleteConfirmId === a.id ? (
                          <>
                            <span style={{ fontSize: "0.75rem", color: "var(--gold-dim)" }}>Delete?</span>
                            <button
                              type="button"
                              onClick={() => handleDelete(a.displayId!)}
                              disabled={deleting}
                              style={{ ...btnSmall, background: "#b71c1c", color: "#fff" }}
                            >
                              Yes
                            </button>
                            <button type="button" onClick={() => setDeleteConfirmId(null)} style={btnSmall}>
                              No
                            </button>
                          </>
                        ) : (
                          <button type="button" onClick={() => setDeleteConfirmId(a.id)} style={btnSmall}>
                            Delete
                          </button>
                        )}
                      </div>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

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

const thStyle: React.CSSProperties = {
  padding: "10px 12px",
  fontSize: "0.75rem",
  fontWeight: 600,
  color: "var(--gold-dim)",
  textTransform: "uppercase",
};

const btnSmall: React.CSSProperties = {
  padding: "0.25rem 0.5rem",
  fontSize: "0.75rem",
  background: "var(--glass)",
  border: "1px solid var(--glass-border)",
  borderRadius: "4px",
  color: "var(--gold-bright)",
  cursor: "pointer",
};
