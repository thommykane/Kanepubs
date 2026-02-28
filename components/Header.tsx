"use client";

import Link from "next/link";
import { useState, useEffect } from "react";

type UserInfo = {
  username: string;
  avatarUrl: string | null;
  isAdmin: boolean;
} | null;

export default function Header() {
  const [user, setUser] = useState<UserInfo>(null);

  useEffect(() => {
    fetch("/api/me", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setUser(d.user))
      .catch(() => setUser(null));
  }, []);

  useEffect(() => {
    const handler = () => {
      fetch("/api/me", { credentials: "include" })
        .then((r) => r.json())
        .then((d) => setUser(d.user))
        .catch(() => setUser(null));
    };
    window.addEventListener("user-updated", handler);
    return () => window.removeEventListener("user-updated", handler);
  }, []);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    setUser(null);
    window.dispatchEvent(new Event("user-updated"));
    window.location.href = "/";
  }

  if (user) {
    return (
      <header
        className="glass-panel"
        style={{
          position: "sticky",
          top: 0,
          zIndex: 10,
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-end",
          padding: "0.5rem 1.5rem",
          borderBottom: "1px solid var(--glass-border)",
          borderRadius: 0,
        }}
      >
        <Link
          href={`/u/${user.username}`}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            marginRight: "1rem",
          }}
        >
          {user.avatarUrl ? (
            <img
              src={user.avatarUrl}
              alt=""
              style={{
                width: 32,
                height: 32,
                borderRadius: "50%",
                objectFit: "cover",
              }}
            />
          ) : (
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: "50%",
                background: "var(--glass)",
                border: "1px solid var(--glass-border)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "0.75rem",
                color: "var(--gold-dim)",
              }}
            >
              {user.username.charAt(0).toUpperCase()}
            </div>
          )}
          <span style={{ fontSize: "0.85rem", color: "var(--gold-bright)" }}>
            {user.username}
          </span>
        </Link>
        <button
          onClick={handleLogout}
          type="button"
          style={{
            padding: "0.4rem 0.75rem",
            fontSize: "0.85rem",
            background: "transparent",
            border: "1px solid var(--glass-border)",
            borderRadius: "6px",
            color: "var(--gold-dim)",
            cursor: "pointer",
          }}
        >
          Log out
        </button>
      </header>
    );
  }

  return (
    <header
      className="glass-panel"
      style={{
        position: "sticky",
        top: 0,
        zIndex: 10,
        display: "flex",
        alignItems: "center",
        justifyContent: "flex-end",
        padding: "0.75rem 1.5rem",
        borderBottom: "1px solid var(--glass-border)",
        borderRadius: 0,
      }}
    >
      <Link
        href="/login"
        style={{
          padding: "0.5rem 1rem",
          fontSize: "0.9rem",
        }}
      >
        Login
      </Link>
    </header>
  );
}
