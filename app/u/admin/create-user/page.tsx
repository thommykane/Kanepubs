"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const ACCOUNT_TYPE_OPTIONS = [
  { value: "regional_agent", label: "Regional Sales Agent" },
  { value: "national_agent", label: "National Sales Agent" },
  { value: "admin", label: "Admin" },
];

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "0.75rem",
  marginBottom: "1rem",
  background: "rgba(0,0,0,0.3)",
  border: "1px solid var(--glass-border)",
  borderRadius: "6px",
  color: "var(--gold-bright)",
};

export default function CreateUserPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [accountType, setAccountType] = useState("regional_agent");
  const [temporaryPassword, setTemporaryPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    fetch("/api/me")
      .then(async (r) => {
        const text = await r.text();
        let data: { user?: { isAdmin?: boolean } } = {};
        try {
          if (text) data = JSON.parse(text);
        } catch {
          setChecking(false);
          return;
        }
        if (!data?.user?.isAdmin) router.replace("/");
        setChecking(false);
      })
      .catch(() => setChecking(false));
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: username.trim(),
          email: email.trim(),
          phone: phone.trim() || undefined,
          accountType,
          temporaryPassword,
        }),
      });
      const text = await res.text();
      let data: { error?: string } = {};
      try {
        if (text) data = JSON.parse(text);
      } catch {
        setError("Invalid response from server");
        setLoading(false);
        return;
      }
      if (!res.ok) throw new Error(data.error || "Failed to create user");
      router.push("/u/Admin");
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create user");
    } finally {
      setLoading(false);
    }
  };

  if (checking) return <div style={{ padding: "1rem", color: "var(--gold-dim)" }}>Loading…</div>;

  return (
    <div style={{ maxWidth: "500px" }}>
      <div style={{ marginBottom: "1rem" }}>
        <Link href="/u/Admin" style={{ color: "var(--gold-bright)", fontSize: "0.9rem" }}>← Profile</Link>
      </div>
      <h1 style={{ color: "var(--gold-bright)", marginBottom: "1rem" }}>Create User</h1>
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
          Username
        </label>
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
          style={inputStyle}
          placeholder="Username"
        />
        <label style={{ display: "block", color: "var(--gold-dim)", fontSize: "0.85rem", marginBottom: "0.25rem" }}>
          Email
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={inputStyle}
          placeholder="Email"
        />
        <label style={{ display: "block", color: "var(--gold-dim)", fontSize: "0.85rem", marginBottom: "0.25rem" }}>
          Phone Number
        </label>
        <input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          style={inputStyle}
          placeholder="Phone (optional)"
        />
        <label style={{ display: "block", color: "var(--gold-dim)", fontSize: "0.85rem", marginBottom: "0.25rem" }}>
          Account Type
        </label>
        <select
          value={accountType}
          onChange={(e) => setAccountType(e.target.value)}
          style={inputStyle}
        >
          {ACCOUNT_TYPE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        <label style={{ display: "block", color: "var(--gold-dim)", fontSize: "0.85rem", marginBottom: "0.25rem" }}>
          Temporary Password
        </label>
        <input
          type="password"
          value={temporaryPassword}
          onChange={(e) => setTemporaryPassword(e.target.value)}
          required
          minLength={6}
          style={inputStyle}
          placeholder="Choose a temporary password (min 6 characters)"
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
          {loading ? "Creating…" : "Create account"}
        </button>
      </form>
    </div>
  );
}
