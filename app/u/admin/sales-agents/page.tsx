"use client";

import Link from "next/link";
import { useEffect, useState, useCallback } from "react";

type UserRow = {
  id: string;
  username: string;
  email: string | null;
  isAdmin: boolean | null;
  accountType: string | null;
};

const RANK_OPTIONS = [
  { value: "regional_agent", label: "Regional sales agent" },
  { value: "national_agent", label: "National sales agent" },
  { value: "admin", label: "Admin" },
] as const;

function rankLabel(user: UserRow): string {
  if (user.isAdmin) return "Admin";
  const at = (user.accountType ?? "").toLowerCase();
  if (at === "regional_agent") return "Regional sales agent";
  if (at === "national_agent") return "National sales agent";
  if (at === "admin") return "Admin";
  return "—";
}

function rankValue(user: UserRow): string {
  if (user.isAdmin) return "admin";
  const at = (user.accountType ?? "").toLowerCase();
  if (at === "regional_agent" || at === "national_agent" || at === "admin") return at;
  return "regional_agent";
}

export default function SalesAgentsPage() {
  const [list, setList] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [selectedRank, setSelectedRank] = useState<Record<string, string>>({});

  const fetchUsers = useCallback(async () => {
    const res = await fetch("/api/admin/users");
    if (res.status === 403) {
      setForbidden(true);
      setList([]);
      return;
    }
    const data = await res.json();
    setList(Array.isArray(data) ? data : []);
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      const meRes = await fetch("/api/me");
      const meJson = await meRes.json();
      if (!meJson?.user?.isAdmin) {
        if (!cancelled) setForbidden(true);
        setLoading(false);
        return;
      }
      await fetchUsers();
      if (!cancelled) setLoading(false);
    }
    run();
    return () => { cancelled = true; };
  }, [fetchUsers]);

  useEffect(() => {
    const next: Record<string, string> = {};
    list.forEach((u) => {
      next[u.id] = rankValue(u);
    });
    setSelectedRank(next);
  }, [list]);

  const handleUpdate = async (id: string) => {
    const accountType = selectedRank[id];
    if (!accountType) return;
    setUpdatingId(id);
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountType }),
      });
      if (res.ok) {
        await fetchUsers();
      } else {
        const data = await res.json();
        alert(data?.error ?? "Failed to update");
      }
    } finally {
      setUpdatingId(null);
    }
  };

  const sectionStyle: React.CSSProperties = {
    marginBottom: "2rem",
    background: "var(--glass)",
    border: "1px solid var(--glass-border)",
    borderRadius: "8px",
    padding: "1rem 1.25rem",
  };
  const tableStyle: React.CSSProperties = { width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" };
  const thStyle: React.CSSProperties = {
    textAlign: "left",
    padding: "0.5rem 0.75rem",
    borderBottom: "1px solid var(--glass-border)",
    color: "var(--gold-dim)",
  };
  const tdStyle: React.CSSProperties = {
    padding: "0.5rem 0.75rem",
    borderBottom: "1px solid rgba(255,255,255,0.06)",
    color: "var(--gold-bright)",
  };

  if (loading) return <div style={{ padding: "1rem", color: "var(--gold-dim)" }}>Loading…</div>;
  if (forbidden) {
    return (
      <div style={{ padding: "1rem" }}>
        <p style={{ color: "var(--gold-dim)" }}>You must be an admin to view this page.</p>
        <Link href="/" style={{ color: "var(--gold-bright)" }}>Go home</Link>
      </div>
    );
  }

  return (
    <div style={{ width: "100%", padding: "1rem 0" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1rem" }}>
        <Link href="/u/Admin" style={{ color: "var(--gold-bright)", fontSize: "0.9rem" }}>← Profile</Link>
        <h1 style={{ color: "var(--gold-bright)", margin: 0 }}>Sales Agents</h1>
      </div>

      <div style={sectionStyle}>
        <p style={{ color: "var(--gold-dim)", fontSize: "0.9rem", marginBottom: "1rem" }}>
          Users and their rank. Change the dropdown and click Update to save; the list refreshes immediately.
        </p>
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thStyle}>Username</th>
              <th style={thStyle}>Email</th>
              <th style={thStyle}>Current rank</th>
              <th style={thStyle}>Change to</th>
              <th style={thStyle}></th>
            </tr>
          </thead>
          <tbody>
            {list.map((user) => (
              <tr key={user.id}>
                <td style={tdStyle}>
                  <Link href={`/u/${encodeURIComponent(user.username)}`} style={{ color: "var(--gold-bright)", fontWeight: 600 }}>
                    {user.username}
                  </Link>
                </td>
                <td style={tdStyle}>{user.email ?? "—"}</td>
                <td style={tdStyle}>{rankLabel(user)}</td>
                <td style={tdStyle}>
                  <select
                    value={selectedRank[user.id] ?? rankValue(user)}
                    onChange={(e) => setSelectedRank((prev) => ({ ...prev, [user.id]: e.target.value }))}
                    style={{
                      padding: "0.35rem 0.5rem",
                      background: "var(--glass)",
                      border: "1px solid var(--glass-border)",
                      borderRadius: "6px",
                      color: "var(--gold-bright)",
                      minWidth: "180px",
                    }}
                  >
                    {RANK_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </td>
                <td style={tdStyle}>
                  <button
                    type="button"
                    onClick={() => handleUpdate(user.id)}
                    disabled={updatingId !== null}
                    style={{
                      padding: "0.35rem 0.75rem",
                      background: "var(--gold)",
                      color: "var(--bg)",
                      border: "none",
                      borderRadius: "6px",
                      fontWeight: 600,
                      cursor: updatingId !== null ? "not-allowed" : "pointer",
                      fontSize: "0.8rem",
                    }}
                  >
                    {updatingId === user.id ? "Updating…" : "Update"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {list.length === 0 && (
          <p style={{ color: "var(--gold-dim)", padding: "0.5rem 0" }}>No users found.</p>
        )}
      </div>
    </div>
  );
}
