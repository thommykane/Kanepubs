"use client";

import { useCallback, useEffect, useState } from "react";

type Props = {
  plainText: string;
};

export default function PlainTextCompanyExport({ plainText }: Props) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const close = useCallback(() => {
    setOpen(false);
    setCopied(false);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close]);

  const copyAll = async () => {
    try {
      await navigator.clipboard.writeText(plainText);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      window.alert('Could not copy automatically. Click in the box and press Ctrl+A, then Ctrl+C.');
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="Open plain text — copy into IOs without carrying page styles"
        style={{
          flexShrink: 0,
          fontSize: "0.7rem",
          padding: "0.2rem 0.45rem",
          lineHeight: 1.2,
          borderRadius: "4px",
          border: "1px solid var(--glass-border)",
          background: "var(--glass)",
          color: "var(--gold-dim)",
          cursor: "pointer",
        }}
      >
        Plain text
      </button>
      {open ? (
        <div
          role="presentation"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            background: "rgba(0,0,0,0.55)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1rem",
          }}
          onClick={close}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Plain text for copy"
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#ffffff",
              color: "#111111",
              maxWidth: "min(640px, 100%)",
              width: "100%",
              maxHeight: "85vh",
              display: "flex",
              flexDirection: "column",
              borderRadius: "8px",
              boxShadow: "0 8px 32px rgba(0,0,0,0.35)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                padding: "0.65rem 0.9rem",
                borderBottom: "1px solid #e5e5e5",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "0.5rem",
                flexWrap: "wrap",
              }}
            >
              <span style={{ fontSize: "0.875rem", fontWeight: 600, color: "#111" }}>
                Plain text (for contracts / IOs)
              </span>
              <button
                type="button"
                onClick={close}
                style={{
                  fontSize: "0.8rem",
                  padding: "0.35rem 0.65rem",
                  border: "1px solid #ccc",
                  borderRadius: "4px",
                  background: "#f5f5f5",
                  color: "#111",
                  cursor: "pointer",
                }}
              >
                Close
              </button>
            </div>
            <div
              style={{
                padding: "0.9rem",
                flex: 1,
                minHeight: 0,
                display: "flex",
                flexDirection: "column",
                gap: "0.65rem",
                overflow: "auto",
              }}
            >
              <p style={{ fontSize: "0.78rem", color: "#444", margin: 0, lineHeight: 1.45 }}>
                Paste into your IO and the destination document&apos;s styles will apply. Use{" "}
                <strong>Copy all</strong> or select the text below — both paste as unformatted text (no Kane Pubs
                colors or fonts).
              </p>
              <textarea
                readOnly
                value={plainText}
                onFocus={(e) => e.target.select()}
                style={{
                  width: "100%",
                  minHeight: "260px",
                  flex: 1,
                  padding: "0.65rem",
                  fontSize: "13px",
                  lineHeight: 1.45,
                  fontFamily: 'ui-monospace, Consolas, "Cascadia Mono", monospace',
                  color: "#111",
                  background: "#fff",
                  border: "1px solid #ccc",
                  borderRadius: "4px",
                  resize: "vertical",
                  boxSizing: "border-box",
                }}
              />
              <button
                type="button"
                onClick={copyAll}
                style={{
                  alignSelf: "flex-start",
                  padding: "0.5rem 1rem",
                  background: "#111",
                  color: "#fff",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontSize: "0.875rem",
                }}
              >
                {copied ? "Copied!" : "Copy all"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
