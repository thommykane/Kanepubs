"use client";

import Link from "next/link";
import Image from "next/image";

const MENU_LINKS = [
  { href: "/new-contact", label: "New Contact" },
  { href: "/new-organization", label: "New Organization" },
  { href: "/new-business", label: "New Business" },
];

export default function Sidebar() {
  return (
    <aside
      className="glass-panel scrollbar-thin"
      style={{
        width: "260px",
        minWidth: "260px",
        height: "100vh",
        position: "sticky",
        top: 0,
        display: "flex",
        flexDirection: "column",
        overflowY: "auto",
        borderRadius: 0,
        borderRight: "1px solid var(--glass-border)",
      }}
    >
      <Link
        href="/"
        style={{
          padding: "1rem",
          borderBottom: "1px solid var(--glass-border)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: "100%",
        }}
      >
        <Image
          src="/logo.png"
          alt="Kane Pubs"
          width={150}
          height={150}
          style={{ objectFit: "contain" }}
        />
      </Link>

      <nav style={{ flex: 1, display: "flex", flexDirection: "column", padding: "0.5rem 0" }}>
        {MENU_LINKS.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            style={{
              display: "block",
              padding: "0.75rem 1rem",
              borderBottom: "1px solid var(--glass-border)",
              color: "var(--gold-bright)",
              fontSize: "0.95rem",
              textAlign: "left",
              transition: "background 0.2s, color 0.2s",
            }}
          >
            {label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
