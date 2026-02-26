import type { Metadata } from "next";
import "./globals.css";
import AppLayout from "@/components/AppLayout";

export const metadata: Metadata = {
  title: "Kane Pubs",
  description: "Contacts · Organizations · Business",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <div className="bg-layer" />
        <div className="overlay" />
        <div style={{ position: "relative", zIndex: 2, minHeight: "100vh" }}>
          <AppLayout>{children}</AppLayout>
        </div>
      </body>
    </html>
  );
}
