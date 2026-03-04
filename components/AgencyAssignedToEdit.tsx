"use client";

import { useEffect, useState } from "react";

type Props = { agencyDisplayId: string; initialAssignedTo: string | null };

export default function AgencyAssignedToEdit({ agencyDisplayId, initialAssignedTo }: Props) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [users, setUsers] = useState<{ id: string; username: string }[]>([]);
  const [assignedTo, setAssignedTo] = useState(initialAssignedTo ?? "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/me", { credentials: "include" })
      .then((r) => r.json())
      .then((data) => setIsAdmin(data?.user?.isAdmin ?? false))
      .catch(() => setIsAdmin(false));
  }, []);

  useEffect(() => {
    fetch("/api/users")
      .then((r) => r.json())
      .then((data) => setUsers(Array.isArray(data) ? data : []))
      .catch(() => setUsers([]));
  }, []);

  const handleChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value.trim() || null;
    if (value === (assignedTo || null)) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/agencies/${agencyDisplayId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ assignedTo: value ?? "" }),
      });
      if (res.ok) {
        setAssignedTo(value ?? "");
        window.dispatchEvent(new Event("user-updated"));
      }
    } finally {
      setSaving(false);
    }
  };

  const labelStyle = { color: "var(--gold-dim)", marginRight: "0.5rem", fontSize: "0.875rem" };

  if (!isAdmin) {
    return <span>{assignedTo || "—"}</span>;
  }

  return (
    <select
      value={assignedTo}
      onChange={handleChange}
      disabled={saving}
      style={{
        background: "var(--glass)",
        border: "1px solid var(--glass-border)",
        borderRadius: "4px",
        color: "var(--gold-bright)",
        padding: "0.25rem 0.5rem",
        fontSize: "0.875rem",
      }}
    >
      <option value="">—</option>
      {users.map((u) => (
        <option key={u.id} value={u.username}>
          {u.username}
        </option>
      ))}
    </select>
  );
}
