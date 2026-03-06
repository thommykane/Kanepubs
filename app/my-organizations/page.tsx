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
  lastActivityAt: string | null;
  lastActivityType: string | null;
};

type UserOption = { id: string; username: string };

export default function MyOrganizationsPage() {
  const [list, setList] = useState<Organization[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [editing, setEditing] = useState<Organization | null>(null);
  const [editForm, setEditForm] = useState<Record<string, string>>({});
  const [savingEdit, setSavingEdit] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchOrganizations = useCallback(async () => {
    const res = await fetch("/api/my-organizations", { cache: "no-store" });
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

  const formatDateTime = (s: string | null) => {
    if (!s) return "—";
    try {
      return new Date(s).toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" });
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
        <h1 style={{ color: "var(--gold-bright)" }}>My Organizations</h1>
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
            No organizations assigned to you.{" "}
            <Link href="/new-organization" style={{ color: "var(--gold-bright)" }}>Add one</Link>
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "900px" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--glass-border)", textAlign: "left" }}>
                <th style={thStyle}>Last activity</th>
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
                  <td style={tdStyleCreated}>
                    {o.lastActivityAt ? (
                      <>
                        <div>{formatDateTime(o.lastActivityAt)}</div>
                        {o.lastActivityType && <div style={{ fontSize: "0.75rem", color: "var(--gold-dim)" }}>{o.lastActivityType}</div>}
                      </>
                    ) : (
                      "—"
                    )}
                  </td>
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
                    <button type="button" onClick={() => openEdit(o)} style={btnSmall}>Edit</button>
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

// Same font/color styles as All Organizations
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
