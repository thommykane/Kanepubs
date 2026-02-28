"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function AccountChangePasswordPage() {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (newPassword !== confirmPassword) {
      setError("New passwords do not match");
      return;
    }
    if (newPassword.length < 6) {
      setError("New password must be at least 6 characters");
      return;
    }
    if (!currentPassword) {
      setError("Enter your current password");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update password");
      router.push("/u/Admin");
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to update password");
    } finally {
      setLoading(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "0.75rem",
    marginBottom: "1rem",
    background: "rgba(0,0,0,0.3)",
    border: "1px solid var(--glass-border)",
    borderRadius: "6px",
    color: "var(--gold-bright)",
  };

  return (
    <div style={{ maxWidth: "500px" }}>
      <div style={{ marginBottom: "1rem" }}>
        <Link href="/u/Admin" style={{ color: "var(--gold-bright)", fontSize: "0.9rem" }}>← Profile</Link>
      </div>
      <h1 style={{ color: "var(--gold-bright)", marginBottom: "1rem" }}>Change Password</h1>
      <form
        onSubmit={handleSubmit}
        style={{
          background: "var(--glass)",
          border: "1px solid var(--glass-border)",
          borderRadius: "8px",
          padding: "1.5rem",
        }}
      >
        <label style={{ display: "block", color: "var(--gold-dim)", fontSize: "0.85rem", marginBottom: "0.25rem" }}>
          Current password
        </label>
        <input
          type="password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          required
          style={inputStyle}
          placeholder="Current password"
        />
        <label style={{ display: "block", color: "var(--gold-dim)", fontSize: "0.85rem", marginBottom: "0.25rem" }}>
          New password
        </label>
        <input
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          required
          minLength={6}
          style={inputStyle}
          placeholder="New password (min 6 characters)"
        />
        <label style={{ display: "block", color: "var(--gold-dim)", fontSize: "0.85rem", marginBottom: "0.25rem" }}>
          Confirm new password
        </label>
        <input
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          minLength={6}
          style={inputStyle}
          placeholder="Confirm new password"
        />
        {error && (
          <div style={{ color: "#e5534b", fontSize: "0.85rem", marginBottom: "1rem" }}>{error}</div>
        )}
        <button
          type="submit"
          disabled={loading}
          style={{
            padding: "0.75rem 1.25rem",
            background: "var(--gold)",
            color: "var(--bg)",
            border: "none",
            borderRadius: "6px",
            fontWeight: 600,
            cursor: loading ? "not-allowed" : "pointer",
          }}
        >
          {loading ? "Saving…" : "Save"}
        </button>
      </form>
    </div>
  );
}
