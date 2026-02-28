"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("GlobalError:", error);
  }, [error]);

  return (
    <html lang="en">
      <body style={{ background: "#0a0a0a", color: "#f0d878", margin: 0, padding: "2rem", fontFamily: "system-ui, sans-serif" }}>
        <div style={{ maxWidth: "600px", margin: "0 auto" }}>
          <h1 style={{ marginBottom: "1rem" }}>Something went wrong</h1>
          <pre
            style={{
              padding: "1rem",
              background: "rgba(0,0,0,0.5)",
              borderRadius: "8px",
              fontSize: "0.85rem",
              color: "#e5534b",
              overflow: "auto",
              marginBottom: "1.5rem",
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
            }}
          >
            {error.message}
          </pre>
          <button
            type="button"
            onClick={() => reset()}
            style={{
              padding: "0.5rem 1rem",
              background: "#c9a227",
              border: "none",
              borderRadius: "6px",
              color: "#000",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
