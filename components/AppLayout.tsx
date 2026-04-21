"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import Sidebar from "./Sidebar";
import Header from "./Header";

/** Public magazine-style routes: no CRM sidebar or header. */
function isMagazineRoute(pathname: string) {
  return pathname === "/plan-your-trip";
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const magazine = isMagazineRoute(pathname);
  const showSidebar =
    !magazine &&
    !pathname.startsWith("/login") &&
    !pathname.startsWith("/change-password");
  const showHeader =
    !magazine &&
    !pathname.startsWith("/login") &&
    !pathname.startsWith("/change-password");

  useEffect(() => {
    if (pathname === "/login" || pathname === "/change-password") return;
    fetch("/api/me", { cache: "no-store" })
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
        <main
          style={{
            flex: 1,
            padding: magazine ? 0 : "1.5rem",
            minHeight: magazine ? "100vh" : undefined,
          }}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
