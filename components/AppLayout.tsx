"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import Sidebar from "./Sidebar";
import Header from "./Header";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const showSidebar = !pathname.startsWith("/login") && !pathname.startsWith("/change-password");
  const showHeader = !pathname.startsWith("/login") && !pathname.startsWith("/change-password");

  useEffect(() => {
    if (pathname === "/login" || pathname === "/change-password") return;
    fetch("/api/me")
      .then((r) => r.json())
      .then((data) => {
        if (data?.user?.mustChangePassword) router.replace("/change-password");
      })
      .catch(() => {});
  }, [pathname, router]);

  return (
    <div
      style={{
        display: "flex",
        minHeight: "100vh",
      }}
    >
      {showSidebar && <Sidebar />}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        {showHeader && <Header />}
        <main style={{ flex: 1, padding: "1.5rem" }}>{children}</main>
      </div>
    </div>
  );
}
