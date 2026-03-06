"use client";

import Link from "next/link";
import { useEffect, useState, useCallback } from "react";
import { normalizeWebsiteUrl } from "@/lib/normalize-website-url";

const ORGANIZATION_TYPES = [
  "CVB (City)",
  "CVB (County)",
  "CVB (State)",
  "DMO (City)",
  "DMO (County)",
  "DMO (State)",
  "Chamber (City)",
  "Chamber (County)",
  "Chamber (State)",
  "City (Government)",
  "County (Government)",
  "State (Government)",
];

type Organization = {
  id: string;
  displayId: string | null;
  organizationName: string | null;
  address: string | null;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  zipCode: string | null;
  county: string | null;
  phone: string | null;
  website: string | null;
  organizationType: string | null;
  tags: string | null;
  timeZone: string | null;
  createdBy: string | null;
  assignedTo: string | null;
  createdAt: string;
};

type UserOption = { id: string; username: string };

export default function AllOrganizationsPage() {
  const [list, setList] = useState<Organization[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [searchName, setSearchName] = useState("");
  const [searchType, setSearchType] = useState("");
  const [searchTags, setSearchTags] = useState("");
  const [selectionColumnOpen, setSelectionColumnOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [assignToUsername, setAssignToUsername] = useState("");
  const [assigning, setAssigning] = useState(false);
  const [editing, setEditing] = useState<Organization | null>(null);
  const [editForm, setEditForm] = useState<Record<string, string>>({});
  const [savingEdit, setSavingEdit] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  const fetchOrganizations = useCallback(async () => {
    const params = new URLSearchParams();
    if (searchName.trim()) params.set("name", searchName.trim());
    if (searchType.trim()) params.set("type", searchType.trim());
    if (searchTags.trim()) params.set("tags", searchTags.trim());
    const res = await fetch(`/api/organizations?${params}`, { cache: "no-store" });
    const data = await res.json();
    setList(Array.isArray(data) ? data : []);
  }, [searchName, searchType, searchTags]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchOrganizations().then(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, [fetchOrganizations]);

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
    if (selectedIds.size === list.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(list.map((o) => o.id)));
  };

  const handleBulkAssign = async () => {
    if (selectedIds.size === 0 || !assignToUsername) return;
    setAssigning(true);
    try {
      const ids = [...selectedIds];
      for (let i = 0; i < ids.length; i++) {
        const id = ids[i];
        await fetch(`/api/organizations/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ assignedTo: assignToUsername }),
        });
      }
      await fetchOrganizations();
      setSelectedIds(new Set());
    } finally {
      setAssigning(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!window.confirm(`Delete ${selectedIds.size} selected organization(s)? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      const ids = [...selectedIds];
      for (const id of ids) {
        await fetch(`/api/organizations/${id}`, { method: "DELETE" });
      }
      await fetchOrganizations();
      setSelectedIds(new Set());
    } finally {
      setDeleting(false);
    }
  };

  const openEdit = (o: Organization) => {
    setEditing(o);
    setEditForm({
      organizationName: o.organizationName ?? "",
      address: o.address ?? "",
      addressLine2: o.addressLine2 ?? "",
      city: o.city ?? "",
      state: o.state ?? "",
      zipCode: o.zipCode ?? "",
      county: o.county ?? "",
      phone: o.phone ?? "",
      website: o.website ?? "",
      organizationType: o.organizationType ?? "",
      tags: o.tags ?? "",
      assignedTo: o.assignedTo ?? "",
    });
  };

  const saveEdit = async () => {
    if (!editing) return;
    setSavingEdit(true);
    try {
      const res = await fetch(`/api/organizations/${editing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      if (res.ok) {
        await fetchOrganizations();
        setEditing(null);
      }
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeleting(true);
    try {
      await fetch(`/api/organizations/${id}`, { method: "DELETE" });
      await fetchOrganizations();
      setDeleteConfirmId(null);
    } finally {
      setDeleting(false);
    }
  };

  const formatCreated = (createdAt: string) => {
    try {
      const d = new Date(createdAt);
      return d.toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      });
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

  const downloadCSV = () => {
    const headers = [
      "Organization Name",
      "Address",
      "Address Line 2",
      "City",
      "State",
      "Zip Code",
      "County",
      "Phone",
      "Website",
      "Organization Type",
      "Tags",
      "Assigned To",
      "Display ID",
    ];
    const escape = (v: string | null | undefined) => {
      const s = v == null ? "" : String(v).trim();
      if (s.includes(",") || s.includes('"') || s.includes("\n")) return `"${s.replace(/"/g, '""')}"`;
      return s;
    };
    const rows = list.map((o) =>
      [
        o.organizationName,
        o.address,
        o.addressLine2,
        o.city,
        o.state,
        o.zipCode,
        o.county,
        o.phone,
        o.website,
        o.organizationType,
        o.tags,
        o.assignedTo,
        o.displayId,
      ].map(escape).join(",")
    );
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `all-organizations-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ width: "100%" }}>
      <div style={{ marginBottom: "0.75rem" }}>
        <button
          type="button"
          onClick={downloadCSV}
          style={{
            padding: "0.5rem 0.75rem",
            background: "var(--glass)",
            border: "1px solid var(--glass-border)",
            borderRadius: "6px",
            color: "var(--gold-bright)",
            cursor: "pointer",
            fontSize: "0.875rem",
          }}
        >
          Download CSV
        </button>
      </div>
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
        <h1 style={{ color: "var(--gold-bright)" }}>All Organizations</h1>
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
                <option value="">Assign to…</option>
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
                {assigning ? "Assigning…" : `Assign ${selectedIds.size}`}
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
                  {deleting ? "Deleting…" : `Delete ${selectedIds.size}`}
                </button>
              )}
            </>
          )}
          <Link
            href="/new-organization"
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
            New Organization
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
        <input
          type="text"
          placeholder="Search by name"
          value={searchName}
          onChange={(e) => setSearchName(e.target.value)}
          style={{ ...inputStyle, minWidth: "140px" }}
        />
        <input
          type="text"
          placeholder="Search by type"
          value={searchType}
          onChange={(e) => setSearchType(e.target.value)}
          style={{ ...inputStyle, minWidth: "140px" }}
        />
        <input
          type="text"
          placeholder="Search by tags"
          value={searchTags}
          onChange={(e) => setSearchTags(e.target.value)}
          style={{ ...inputStyle, minWidth: "140px" }}
        />
      </div>

      {editing && (
        <>
          <div
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.5)",
              zIndex: 60,
            }}
            onClick={() => setEditing(null)}
          />
          <div
            style={{
              position: "fixed",
              left: "50%",
              top: "50%",
              transform: "translate(-50%, -50%)",
              width: "90%",
              maxWidth: "480px",
              background: "var(--glass-dark)",
              border: "1px solid var(--glass-border)",
              borderRadius: "8px",
              zIndex: 70,
              padding: "1.25rem",
            }}
          >
            <h3 style={{ color: "var(--gold-bright)", marginBottom: "1rem" }}>Edit organization</h3>
            {["organizationName", "address", "addressLine2", "city", "state", "zipCode", "county", "phone", "website", "tags"].map((key) => (
              <label key={key} style={{ display: "block", marginBottom: "0.5rem" }}>
                <span style={{ color: "var(--gold-dim)", fontSize: "0.8rem" }}>
                  {key === "organizationName" ? "Name" : key === "addressLine2" ? "Apt / PO Box" : key === "zipCode" ? "Zip code" : key.charAt(0).toUpperCase() + key.slice(1)}
                </span>
                <input
                  type={key === "website" ? "url" : "text"}
                  value={editForm[key] ?? ""}
                  onChange={(e) => setEditForm((p) => ({ ...p, [key]: e.target.value }))}
                  style={{ ...inputStyle, width: "100%", display: "block", marginTop: "2px" }}
                />
              </label>
            ))}
            <label style={{ display: "block", marginBottom: "0.5rem" }}>
              <span style={{ color: "var(--gold-dim)", fontSize: "0.8rem" }}>Organization type</span>
              <select
                value={editForm.organizationType ?? ""}
                onChange={(e) => setEditForm((p) => ({ ...p, organizationType: e.target.value }))}
                style={{ ...inputStyle, width: "100%", display: "block", marginTop: "2px" }}
              >
                <option value="">Select type</option>
                {ORGANIZATION_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </label>
            <label style={{ display: "block", marginBottom: "1rem" }}>
              <span style={{ color: "var(--gold-dim)", fontSize: "0.8rem" }}>Assigned to</span>
              <select
                value={editForm.assignedTo ?? ""}
                onChange={(e) => setEditForm((p) => ({ ...p, assignedTo: e.target.value }))}
                style={{ ...inputStyle, width: "100%", display: "block", marginTop: "2px" }}
              >
                <option value="">Select user</option>
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
            No organizations match your filters.{" "}
            <Link href="/new-organization" style={{ color: "var(--gold-bright)" }}>Add one</Link>
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "900px" }}>
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
                      {selectedIds.size === list.length ? "Deselect all" : "Select all"}
                    </button>
                  </th>
                )}
                <th style={thStyle}>Created</th>
                <th style={thStyle}>Created by</th>
                <th style={thStyle}>Assigned to</th>
                <th style={thStyle}>Name</th>
                <th style={thStyle}>Time zone</th>
                <th style={thStyle}>Phone</th>
                <th style={thStyle}>Website</th>
                <th style={thStyle}>Type</th>
                <th style={thStyle}>Tags</th>
                <th style={thStyle}>ID</th>
                <th style={thStyle}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {list.map((o) => (
                <tr
                  key={o.id}
                  style={{
                    borderBottom: "1px solid var(--glass-border)",
                    height: "44px",
                  }}
                >
                  {selectionColumnOpen && (
                    <td style={tdStyle}>
                      <input
                        type="checkbox"
                        checked={selectedIds.has(o.id)}
                        onChange={() => toggleSelect(o.id)}
                      />
                    </td>
                  )}
                  <td style={tdStyleCreated}>{formatCreated(o.createdAt)}</td>
                  <td style={tdStyleUsername}>{o.createdBy ?? "Admin"}</td>
                  <td style={tdStyleUsername}>{o.assignedTo ?? "Admin"}</td>
                  <td style={tdStyleName}>
                    {o.displayId ? (
                      <Link href={`/all-organizations/${o.displayId}`} style={{ color: "var(--gold-bright)", fontWeight: 700, textDecoration: "none" }}>
                        {o.organizationName ?? "—"}
                      </Link>
                    ) : (
                      o.organizationName ?? "—"
                    )}
                  </td>
                  <td style={tdStyleTimezone}>{o.timeZone ?? "—"}</td>
                  <td style={tdStylePhone}>{o.phone ?? "—"}</td>
                  <td style={tdStyle}>
                    {o.website ? (
                      <a
                        href={normalizeWebsiteUrl(o.website) ?? o.website ?? undefined}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: "#2563eb" }}
                      >
                        {normalizeWebsiteUrl(o.website) ?? o.website}
                      </a>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td style={tdStyleType}>{o.organizationType ?? "—"}</td>
                  <td style={tdStyleTags}>{o.tags ?? "—"}</td>
                  <td style={tdStyle}>
                    {o.displayId ? (
                      <Link href={`/all-organizations/${o.displayId}`} style={{ color: "var(--gold-bright)" }}>
                        {o.displayId}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td style={tdStyle}>
                    <div style={{ display: "flex", gap: "0.35rem", alignItems: "center" }}>
                      <button type="button" onClick={() => openEdit(o)} style={btnSmall}>Edit</button>
                      {deleteConfirmId === o.id ? (
                        <>
                          <span style={{ fontSize: "0.75rem", color: "var(--gold-dim)" }}>Delete?</span>
                          <button type="button" onClick={() => handleDelete(o.id)} disabled={deleting} style={{ ...btnSmall, background: "#b71c1c", color: "#fff" }}>Yes</button>
                          <button type="button" onClick={() => setDeleteConfirmId(null)} style={btnSmall}>No</button>
                        </>
                      ) : (
                        <button type="button" onClick={() => setDeleteConfirmId(o.id)} style={btnSmall}>Delete</button>
                      )}
                    </div>
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

const thStyle: React.CSSProperties = {
  padding: "10px 12px",
  fontSize: "0.75rem",
  fontWeight: 600,
  color: "var(--gold-dim)",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
};

const tdBase = {
  padding: "10px 12px",
  fontSize: "0.875rem",
  maxWidth: "180px",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
} as const;

const tdStyleCreated: React.CSSProperties = { ...tdBase, color: "#89CFF0" };
const tdStyleUsername: React.CSSProperties = { ...tdBase, color: "#fff" };
const tdStyleName: React.CSSProperties = { ...tdBase, color: "var(--gold-bright)" };
const tdStyleTimezone: React.CSSProperties = { ...tdBase, color: "#fff" };
const tdStylePhone: React.CSSProperties = { ...tdBase, color: "#fff" };
const tdStyleType: React.CSSProperties = { ...tdBase, color: "#fff", fontWeight: 700 };
const tdStyleTags: React.CSSProperties = { ...tdBase, color: "#90EE90" };
const tdStyle: React.CSSProperties = { ...tdBase, color: "var(--gold-bright)" };

const btnSmall: React.CSSProperties = {
  padding: "0.25rem 0.5rem",
  fontSize: "0.75rem",
  background: "var(--glass)",
  border: "1px solid var(--glass-border)",
  borderRadius: "4px",
  color: "var(--gold-bright)",
  cursor: "pointer",
};
