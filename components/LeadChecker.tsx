"use client";

import { useState } from "react";
import Link from "next/link";

type Match = {
  type: "organization" | "business" | "agency";
  displayId: string;
  name: string;
};

const inputStyle: React.CSSProperties = {
  padding: "0.5rem 0.75rem",
  background: "var(--glass)",
  border: "1px solid var(--glass-border)",
  borderRadius: "6px",
  color: "var(--gold-bright)",
  fontSize: "1rem",
  width: "100%",
};

function profileHref(m: Match): string {
  if (m.type === "organization") return `/all-organizations/${m.displayId}`;
  if (m.type === "business") return `/all-businesses/${m.displayId}`;
  return `/all-agencies/${m.displayId}`;
}

function typeLabel(m: Match): string {
  if (m.type === "organization") return "Organization";
  if (m.type === "business") return "Business";
  return "Agency";
}

export default function LeadChecker() {
  const [website, setWebsite] = useState("");
  const [loading, setLoading] = useState(false);
  const [matches, setMatches] = useState<Match[] | null>(null);
  const [error, setError] = useState("");

  const handleCheck = async (e: React.FormEvent) => {
    e.preventDefault();
    const raw = website.trim();
    if (!raw) {
      setError("Enter a website to check.");
      setMatches(null);
      return;
    }
    setError("");
    setMatches(null);
    setLoading(true);
    try {
      const res = await fetch(
        `/api/lead-check?website=${encodeURIComponent(raw)}`,
        { cache: "no-store" }
      );
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Check failed");
        setMatches([]);
        return;
      }
      setMatches(Array.isArray(data.matches) ? data.matches : []);
    } catch {
      setError("Network error");
      setMatches([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        marginBottom: "1.5rem",
        padding: "1rem 1.25rem",
        background: "var(--glass)",
        border: "1px solid var(--glass-border)",
        borderRadius: "8px",
      }}
    >
      <h2
        style={{
          color: "var(--gold-bright)",
          fontSize: "0.9rem",
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          marginBottom: "0.75rem",
        }}
      >
        Lead Checker
      </h2>
      <form
        onSubmit={handleCheck}
        style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}
      >
        <input
          type="text"
          value={website}
          onChange={(e) => {
            setWebsite(e.target.value);
            setMatches(null);
            setError("");
          }}
          placeholder="Paste website (e.g. www.example.com, https://example.com, or example.com)"
          style={inputStyle}
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading}
          style={{
            padding: "0.5rem 0.75rem",
            background: "var(--gold)",
            color: "var(--bg)",
            border: "none",
            borderRadius: "6px",
            fontWeight: 600,
            fontSize: "0.9rem",
            cursor: loading ? "not-allowed" : "pointer",
            opacity: loading ? 0.8 : 1,
            alignSelf: "flex-start",
          }}
        >
          {loading ? "Checking…" : "Check"}
        </button>
      </form>
      {error && (
        <p style={{ color: "#e57373", fontSize: "0.875rem", marginTop: "0.5rem" }}>
          {error}
        </p>
      )}
      {matches && !error && (
        <div style={{ marginTop: "0.75rem", fontSize: "0.875rem" }}>
          {matches.length === 0 ? (
            <p style={{ color: "var(--gold-dim)" }}>
              No match — this lead is not in the database.
            </p>
          ) : (
            <>
              <p
                style={{
                  color: "var(--gold-bright)",
                  fontWeight: 600,
                  marginBottom: "0.35rem",
                }}
              >
                Already in database:
              </p>
              <ul style={{ margin: 0, paddingLeft: "1.25rem", color: "var(--gold-dim)" }}>
                {matches.map((m) => (
                  <li key={`${m.type}-${m.displayId}`} style={{ marginBottom: "0.25rem" }}>
                    <Link
                      href={profileHref(m)}
                      style={{ color: "var(--gold-bright)" }}
                    >
                      {typeLabel(m)}: {m.name} ({m.displayId})
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
    </div>
  );
}
