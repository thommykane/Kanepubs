"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem",
        color: "var(--gold-bright)",
        textAlign: "center",
      }}
    >
      <h1 style={{ marginBottom: "1rem" }}>Something went wrong</h1>
      <pre
        style={{
          padding: "1rem",
          background: "rgba(0,0,0,0.5)",
          borderRadius: "8px",
          fontSize: "0.85rem",
          color: "#e5534b",
          maxWidth: "600px",
          overflow: "auto",
          marginBottom: "1.5rem",
        }}
      >
        {error.message}
      </pre>
      <button
        type="button"
        onClick={reset}
        style={{
          padding: "0.5rem 1rem",
          background: "var(--gold)",
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
  );
}
