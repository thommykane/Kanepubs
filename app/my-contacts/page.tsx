"use client";

import Link from "next/link";
import { useEffect, useState, useCallback } from "react";
import { normalizeWebsiteUrl } from "@/lib/normalize-website-url";

type Contact = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  title: string | null;
  officeNumber: string | null;
  cellNumber: string | null;
  email: string | null;
  businessId: string | null;
  assignedTo: string | null;
  createdAt: string;
  businessName: string | null;
  businessWebsite: string | null;
  organizationName: string | null;
  organizationWebsite: string | null;
};

type UserOption = { id: string; username: string };

export default function MyContactsPage() {
  const [list, setList] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [editing, setEditing] = useState<Contact | null>(null);
  const [editForm, setEditForm] = useState<Record<string, string>>({});
  const [savingEdit, setSavingEdit] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchContacts = useCallback(async () => {
    const res = await fetch("/api/my-contacts", { cache: "no-store" });
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
    fetchContacts().then(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, [fetchContacts]);

  useEffect(() => {
    fetch("/api/users")
      .then((r) => r.json())
      .then((data) => setUsers(Array.isArray(data) ? data : []));
  }, []);

  const openEdit = (c: Contact) => {
    setEditing(c);
    setEditForm({
      firstName: c.firstName ?? "",
      lastName: c.lastName ?? "",
      title: c.title ?? "",
      officeNumber: c.officeNumber ?? "",
      cellNumber: c.cellNumber ?? "",
      email: c.email ?? "",
      businessId: c.businessId ?? "",
      assignedTo: c.assignedTo ?? "",
    });
  };

  const saveEdit = async () => {
    if (!editing) return;
    setSavingEdit(true);
    try {
      const res = await fetch(`/api/contacts/${editing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      if (res.ok) {
        await fetchContacts();
        setEditing(null);
      }
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeleting(true);
    try {
      await fetch(`/api/contacts/${id}`, { method: "DELETE" });
      await fetchContacts();
      setDeleteConfirmId(null);
    } finally {
      setDeleting(false);
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

  const btnSmall: React.CSSProperties = {
    padding: "0.25rem 0.5rem",
    fontSize: "0.75rem",
    background: "var(--glass)",
    border: "1px solid var(--glass-border)",
    borderRadius: "4px",
    color: "var(--gold-bright)",
    cursor: "pointer",
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
  const tdStyleCreated: React.CSSProperties = { ...tdBase, color: "#89CFF0" };
  const tdStyleAssigned: React.CSSProperties = { ...tdBase, color: "#fff" };
  const tdStyleName: React.CSSProperties = { ...tdBase, color: "#a335ee", fontWeight: 700 };
  const tdStyleTitle: React.CSSProperties = { ...tdBase, color: "#fff" };
  const tdStylePhone: React.CSSProperties = { ...tdBase, color: "#89CFF0" };
  const tdStyleEmail: React.CSSProperties = { ...tdBase, color: "#39ff14" };
  const tdStyle: React.CSSProperties = { ...tdBase, color: "var(--gold-bright)" };

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
        <h1 style={{ color: "var(--gold-bright)" }}>My Contacts</h1>
        <Link
          href="/new-contact"
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
          New Contact
        </Link>
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
          <div style={{ padding: "2rem", textAlign: "center", color: "var(--gold-dim)" }}>
            Loading…
          </div>
        ) : list.length === 0 ? (
          <div style={{ padding: "2rem", textAlign: "center", color: "var(--gold-dim)" }}>
            No contacts from your assigned organizations or businesses.{" "}
            <Link href="/new-contact" style={{ color: "var(--gold-bright)" }}>
              Add one
            </Link>
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "800px" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--glass-border)", textAlign: "left" }}>
                <th style={thStyle}>Created</th>
                <th style={thStyle}>Assigned to</th>
                <th style={thStyle}>Business</th>
                <th style={thStyle}>First</th>
                <th style={thStyle}>Last</th>
                <th style={thStyle}>Title</th>
                <th style={thStyle}>Office number</th>
                <th style={thStyle}>Cell number</th>
                <th style={thStyle}>Email</th>
                <th style={thStyle}>Website</th>
                <th style={thStyle}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {list.map((c) => (
                <tr
                  key={c.id}
                  style={{
                    borderBottom: "1px solid var(--glass-border)",
                    height: "44px",
                  }}
                >
                  <td style={tdStyleCreated}>{formatCreated(c.createdAt)}</td>
                  <td style={tdStyleAssigned}>{c.assignedTo ?? "Admin"}</td>
                  <td style={tdStyle}>
                    {c.businessId && (c.businessName ?? c.organizationName ?? c.businessId) ? (
                      <Link
                        href={c.businessId.toUpperCase().startsWith("A") ? `/all-organizations/${c.businessId}` : `/all-businesses/${c.businessId}`}
                        style={{ color: "var(--gold-bright)", fontWeight: 700 }}
                      >
                        {c.businessName ?? c.organizationName ?? c.businessId}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td style={tdStyleName}>{c.firstName ?? "—"}</td>
                  <td style={tdStyleName}>{c.lastName ?? "—"}</td>
                  <td style={tdStyleTitle}>{c.title ?? "—"}</td>
                  <td style={tdStylePhone}>{c.officeNumber ?? "—"}</td>
                  <td style={tdStylePhone}>{c.cellNumber ?? "—"}</td>
                  <td style={tdStyleEmail}>{c.email ?? "—"}</td>
                  <td style={tdStyle}>
                    {(c.businessWebsite ?? c.organizationWebsite) ? (
                      <a
                        href={normalizeWebsiteUrl(c.businessWebsite ?? c.organizationWebsite) ?? (c.businessWebsite ?? c.organizationWebsite) ?? undefined}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: "#2563eb" }}
                      >
                        {normalizeWebsiteUrl(c.businessWebsite ?? c.organizationWebsite) ?? (c.businessWebsite ?? c.organizationWebsite)}
                      </a>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td style={tdStyle}>
                    <div style={{ display: "flex", gap: "0.35rem", alignItems: "center", flexWrap: "wrap" }}>
                      <button type="button" onClick={() => openEdit(c)} style={btnSmall}>Edit</button>
                      {deleteConfirmId === c.id ? (
                        <>
                          <span style={{ fontSize: "0.75rem", color: "var(--gold-dim)" }}>Delete?</span>
                          <button type="button" onClick={() => handleDelete(c.id)} disabled={deleting} style={{ ...btnSmall, background: "#b71c1c", color: "#fff" }}>Yes</button>
                          <button type="button" onClick={() => setDeleteConfirmId(null)} style={btnSmall}>No</button>
                        </>
                      ) : (
                        <button type="button" onClick={() => setDeleteConfirmId(c.id)} style={btnSmall}>Delete</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
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
            <h3 style={{ color: "var(--gold-bright)", marginBottom: "1rem" }}>Edit contact</h3>
            {(["firstName", "lastName", "title", "officeNumber", "cellNumber", "email", "businessId"] as const).map((key) => (
              <label key={key} style={{ display: "block", marginBottom: "0.5rem" }}>
                <span style={{ color: "var(--gold-dim)", fontSize: "0.8rem" }}>
                  {key === "firstName" ? "First name" : key === "lastName" ? "Last name" : key === "officeNumber" ? "Office number" : key === "cellNumber" ? "Cell number" : key === "businessId" ? "Business or Organization ID" : key.charAt(0).toUpperCase() + key.slice(1)}
                </span>
                <input
                  type={key === "email" ? "email" : key === "officeNumber" || key === "cellNumber" ? "tel" : "text"}
                  value={editForm[key] ?? ""}
                  onChange={(e) => setEditForm((p) => ({ ...p, [key]: e.target.value }))}
                  placeholder={key === "businessId" ? "e.g. A00000001 or B00000002" : undefined}
                  autoComplete={key === "businessId" ? "off" : undefined}
                  style={{ ...inputStyle, width: "100%", display: "block", marginTop: "2px" }}
                />
              </label>
            ))}
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
    </div>
  );
}
