"use client";

import Link from "next/link";
import { useEffect, useState, useCallback } from "react";
import { normalizeWebsiteUrl } from "@/lib/normalize-website-url";

const BUSINESS_TYPES = [
  "Hotel",
  "Resort",
  "Vacation Rental",
  "Restaurant",
  "Restaurant Group",
  "Winery",
  "Brewery",
  "Distillery",
  "Food Brand",
  "Beverage Brand",
  "Cruise Line",
  "Airline",
  "Private Aviation",
  "Travel Agency",
  "Tour Operator",
  "Attraction",
  "Theme Park",
  "Museum",
  "Golf Course",
  "Ski Resort",
  "Spa / Wellness",
  "Luxury Retail",
  "Travel Gear Brand",
  "Transportation Service",
  "Event Venue",
  "Other",
];

type Business = {
  id: string;
  displayId: string | null;
  businessName: string | null;
  address: string | null;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  zipCode: string | null;
  county: string | null;
  phone: string | null;
  website: string | null;
  businessType: string | null;
  tags: string | null;
  timeZone: string | null;
  createdBy: string | null;
  assignedTo: string | null;
  createdAt: string;
};

type UserOption = { id: string; username: string };

export default function AllBusinessesPage() {
  const [list, setList] = useState<Business[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [searchName, setSearchName] = useState("");
  const [searchType, setSearchType] = useState("");
  const [searchTags, setSearchTags] = useState("");
  const [searchAssignedTo, setSearchAssignedTo] = useState("");
  const [selectionColumnOpen, setSelectionColumnOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [assignToUsername, setAssignToUsername] = useState("");
  const [assigning, setAssigning] = useState(false);
  const [editing, setEditing] = useState<Business | null>(null);
  const [editForm, setEditForm] = useState<Record<string, string>>({});
  const [savingEdit, setSavingEdit] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  const fetchBusinesses = useCallback(async () => {
    const params = new URLSearchParams();
    if (searchName.trim()) params.set("name", searchName.trim());
    if (searchType.trim()) params.set("type", searchType.trim());
    if (searchTags.trim()) params.set("tags", searchTags.trim());
    if (searchAssignedTo.trim()) params.set("assignedTo", searchAssignedTo.trim());
    const res = await fetch(`/api/businesses?${params}`, { cache: "no-store" });
    const data = await res.json();
    setList(Array.isArray(data) ? data : []);
  }, [searchName, searchType, searchTags, searchAssignedTo]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchBusinesses().then(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, [fetchBusinesses]);

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
    else setSelectedIds(new Set(list.map((b) => b.id)));
  };

  const handleBulkAssign = async () => {
    if (selectedIds.size === 0 || !assignToUsername) return;
    setAssigning(true);
    try {
      const ids = [...selectedIds];
      for (let i = 0; i < ids.length; i++) {
        const id = ids[i];
        await fetch(`/api/businesses/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ assignedTo: assignToUsername }),
        });
      }
      await fetchBusinesses();
      setSelectedIds(new Set());
    } finally {
      setAssigning(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!window.confirm(`Delete ${selectedIds.size} selected business(es)? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      const ids = [...selectedIds];
      for (const id of ids) {
        await fetch(`/api/businesses/${id}`, { method: "DELETE" });
      }
      await fetchBusinesses();
      setSelectedIds(new Set());
    } finally {
      setDeleting(false);
    }
  };

  const openEdit = (b: Business) => {
    setEditing(b);
    setEditForm({
      businessName: b.businessName ?? "",
      address: b.address ?? "",
      addressLine2: b.addressLine2 ?? "",
      city: b.city ?? "",
      state: b.state ?? "",
      zipCode: b.zipCode ?? "",
      county: b.county ?? "",
      phone: b.phone ?? "",
      website: b.website ?? "",
      businessType: b.businessType ?? "",
      tags: b.tags ?? "",
      assignedTo: b.assignedTo ?? "",
    });
  };

  const saveEdit = async () => {
    if (!editing) return;
    setSavingEdit(true);
    try {
      const res = await fetch(`/api/businesses/${editing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      if (res.ok) {
        await fetchBusinesses();
        setEditing(null);
      }
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeleting(true);
    try {
      await fetch(`/api/businesses/${id}`, { method: "DELETE" });
      await fetchBusinesses();
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

  return (
    <div style={{ width: "100%" }}>
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
        <h1 style={{ color: "var(--gold-bright)" }}>All Businesses</h1>
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
            href="/new-business"
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
            New Business
          </Link>
        </div>
      </div>

      {/* Search */}
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
        <select
          value={searchAssignedTo}
          onChange={(e) => setSearchAssignedTo(e.target.value)}
          style={{ ...inputStyle, minWidth: "170px" }}
        >
          <option value="">Assigned to (all)</option>
          <option value="__UNASSIGNED__">Admin / Unassigned</option>
          {users.map((u) => (
            <option key={u.id} value={u.username}>{u.username}</option>
          ))}
        </select>
      </div>

      {/* Edit modal */}
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
            <h3 style={{ color: "var(--gold-bright)", marginBottom: "1rem" }}>Edit business</h3>
            {["businessName", "address", "addressLine2", "city", "state", "zipCode", "county", "phone", "website", "tags"].map((key) => (
              <label key={key} style={{ display: "block", marginBottom: "0.5rem" }}>
                <span style={{ color: "var(--gold-dim)", fontSize: "0.8rem" }}>
                  {key === "businessName" ? "Name" : key === "addressLine2" ? "Apt / PO Box" : key === "zipCode" ? "Zip code" : key.charAt(0).toUpperCase() + key.slice(1)}
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
              <span style={{ color: "var(--gold-dim)", fontSize: "0.8rem" }}>Business type</span>
              <select
                value={editForm.businessType ?? ""}
                onChange={(e) => setEditForm((p) => ({ ...p, businessType: e.target.value }))}
                style={{ ...inputStyle, width: "100%", display: "block", marginTop: "2px" }}
              >
                <option value="">Select type</option>
                {BUSINESS_TYPES.map((t) => (
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

      {/* Table */}
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
            No businesses match your filters.{" "}
            <Link href="/new-business" style={{ color: "var(--gold-bright)" }}>Add one</Link>
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
              {list.map((b) => (
                <tr
                  key={b.id}
                  style={{
                    borderBottom: "1px solid var(--glass-border)",
                    height: "44px",
                  }}
                >
                  {selectionColumnOpen && (
                    <td style={tdStyle}>
                      <input
                        type="checkbox"
                        checked={selectedIds.has(b.id)}
                        onChange={() => toggleSelect(b.id)}
                      />
                    </td>
                  )}
                  <td style={tdStyleCreated}>{formatCreated(b.createdAt)}</td>
                  <td style={tdStyleUsername}>{b.createdBy ?? "Admin"}</td>
                  <td style={tdStyleUsername}>{b.assignedTo ?? "Admin"}</td>
                  <td style={tdStyleName}>
                    {b.displayId ? (
                      <Link href={`/all-businesses/${b.displayId}`} style={{ color: "var(--gold-bright)", fontWeight: 700, textDecoration: "none" }}>
                        {b.businessName ?? "—"}
                      </Link>
                    ) : (
                      b.businessName ?? "—"
                    )}
                  </td>
                  <td style={tdStyleTimezone}>{b.timeZone ?? "—"}</td>
                  <td style={tdStylePhone}>{b.phone ?? "—"}</td>
                  <td style={tdStyle}>
                    {b.website ? (
                      <a
                        href={normalizeWebsiteUrl(b.website) ?? b.website ?? undefined}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: "#2563eb" }}
                      >
                        {normalizeWebsiteUrl(b.website) ?? b.website}
                      </a>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td style={tdStyleType}>{b.businessType ?? "—"}</td>
                  <td style={tdStyleTags}>{b.tags ?? "—"}</td>
                  <td style={tdStyle}>
                    {b.displayId ? (
                      <Link href={`/all-businesses/${b.displayId}`} style={{ color: "var(--gold-bright)" }}>
                        {b.displayId}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td style={tdStyle}>
                    <div style={{ display: "flex", gap: "0.35rem", alignItems: "center" }}>
                      <button
                        type="button"
                        onClick={() => openEdit(b)}
                        style={btnSmall}
                      >
                        Edit
                      </button>
                      {deleteConfirmId === b.id ? (
                        <>
                          <span style={{ fontSize: "0.75rem", color: "var(--gold-dim)" }}>Delete?</span>
                          <button
                            type="button"
                            onClick={() => handleDelete(b.id)}
                            disabled={deleting}
                            style={{ ...btnSmall, background: "#b71c1c", color: "#fff" }}
                          >
                            Yes
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteConfirmId(null)}
                            style={btnSmall}
                          >
                            No
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setDeleteConfirmId(b.id)}
                          style={btnSmall}
                        >
                          Delete
                        </button>
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
