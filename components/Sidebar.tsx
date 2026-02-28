"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const MENU_LINKS = [
  { href: "/new-contact", label: "New Contact" },
  { href: "/new-organization", label: "New Organization" },
  { href: "/new-business", label: "New Business" },
];

const LEADS_LINKS = [
  { href: "/all-contacts", label: "All Contacts" },
  { href: "/all-organizations", label: "All Organizations" },
  { href: "/all-businesses", label: "All Businesses" },
];

const LIVE_ACTIVITY_LINKS_ADMIN = [
  { href: "/all-activity", label: "All Activity" },
  { href: "/active-proposals", label: "Active Proposals" },
  { href: "/active-ios", label: "Active I/O's" },
  { href: "/sold", label: "SOLD" },
];

const LIVE_ACTIVITY_LINKS_AGENT = [
  { href: "/all-activity", label: "All Activity" },
  { href: "/active-proposals", label: "Active Proposals" },
  { href: "/active-ios", label: "Active I/O's" },
];

const MY_ACCOUNT_LINKS = [
  { href: "/my-organizations", label: "My Organizations" },
  { href: "/my-businesses", label: "My Businesses" },
  { href: "/my-contacts", label: "My Contacts" },
  { href: "/my-clients", label: "My Clients" },
];

const ADMIN_LINKS = [{ href: "/all-clients", label: "All Clients" }];

const linkStyle = {
  display: "block" as const,
  padding: "0.75rem 1rem",
  borderBottom: "1px solid var(--glass-border)",
  color: "var(--gold-bright)",
  fontSize: "0.95rem",
  textAlign: "left" as const,
  transition: "background 0.2s, color 0.2s",
};

const sectionBarStyle = {
  background: "#000",
  color: "#fff",
  padding: "0.5rem 1rem",
  fontSize: "0.85rem",
  fontWeight: 600,
  textAlign: "left" as const,
  marginTop: "0.25rem",
  borderBottom: "1px solid var(--glass-border)",
};

export default function Sidebar() {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    fetch("/api/me")
      .then((r) => r.json())
      .then((data) => setIsAdmin(data?.user?.isAdmin ?? false))
      .catch(() => setIsAdmin(false));
  }, []);

  const liveLinks = isAdmin === true ? LIVE_ACTIVITY_LINKS_ADMIN : LIVE_ACTIVITY_LINKS_AGENT;

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
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/logo.png"
          alt="Kane Pubs"
          width={75}
          height={75}
          style={{ objectFit: "contain" }}
        />
      </Link>

      <nav style={{ flex: 1, display: "flex", flexDirection: "column", padding: "0.5rem 0" }}>
        {MENU_LINKS.map(({ href, label }) => (
          <Link key={href} href={href} style={linkStyle}>
            {label}
          </Link>
        ))}

        {isAdmin === true && (
          <>
            <div style={sectionBarStyle}>New Media</div>
            {LEADS_LINKS.map(({ href, label }) => (
              <Link key={href} href={href} style={linkStyle}>
                {label}
              </Link>
            ))}
          </>
        )}

        <div style={sectionBarStyle}>Live Activity</div>
        {liveLinks.map(({ href, label }) => (
          <Link key={href} href={href} style={linkStyle}>
            {label}
          </Link>
        ))}

        <div style={sectionBarStyle}>My Account</div>
        {MY_ACCOUNT_LINKS.map(({ href, label }) => (
          <Link key={href} href={href} style={linkStyle}>
            {label}
          </Link>
        ))}

        {isAdmin === true && (
          <>
            <div style={sectionBarStyle}>Administrative</div>
            {ADMIN_LINKS.map(({ href, label }) => (
              <Link key={href} href={href} style={linkStyle}>
                {label}
              </Link>
            ))}
          </>
        )}
      </nav>
    </aside>
  );
}
