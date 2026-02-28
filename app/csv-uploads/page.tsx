"use client";

import Link from "next/link";
import { useState, useRef } from "react";

const ORGANIZATION_TYPES = [
  "CVB (City)",
  "CVB (County)",
  "CVB (State)",
  "DMO (City)",
  "DMO (County)",
  "DMO (State)",
  "Chamber (City)",
  "Chamber (County)",
  "Chamber (State)",
  "City (Government)",
  "County (Government)",
  "State (Government)",
];

const EXPECTED_HEADERS =
  "Organization Name*,Organization Address or PO Box*,Suite #,City*,State*,Zip Code*,County*,Phone*,Website*,Organization Type*,Tags";

export default function CSVUploadsPage() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<{
    created: number;
    createdIds: { displayId: string; organizationName: string }[];
    errors?: { row: number; message: string }[];
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {
      setError("Please select a CSV file.");
      return;
    }
    setError(null);
    setResult(null);
    setUploading(true);
    try {
      const text = await file.text();
      const res = await fetch("/api/csv-upload/organizations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csv: text }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Upload failed");
        return;
      }
      setResult({
        created: data.created ?? 0,
        createdIds: data.createdIds ?? [],
        errors: data.errors,
      });
      setFile(null);
      if (inputRef.current) inputRef.current.value = "";
    } catch (err) {
      setError("Failed to upload. Please try again.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div style={{ width: "100%", maxWidth: "720px" }}>
      <h1 style={{ color: "var(--gold-bright)", marginBottom: "1rem" }}>CSV Uploads</h1>

      <section
        style={{
          background: "var(--glass)",
          border: "1px solid var(--glass-border)",
          borderRadius: "8px",
          padding: "1.25rem",
          marginBottom: "1.5rem",
        }}
      >
        <h2 style={{ color: "var(--gold-bright)", fontSize: "1.1rem", marginBottom: "0.75rem" }}>
          Organization CSV Uploader
        </h2>
        <p style={{ color: "var(--gold-dim)", fontSize: "0.875rem", marginBottom: "1rem" }}>
          Upload a .csv file with organizations. Each row will get an ID (e.g. A00000001) and appear on{" "}
          <Link href="/all-organizations" style={{ color: "var(--gold-bright)" }}>All Organizations</Link>, assigned to Admin.
        </p>

        <p style={{ color: "var(--gold-dim)", fontSize: "0.8rem", marginBottom: "0.5rem" }}>
          <strong style={{ color: "var(--gold-bright)" }}>Required columns (*):</strong>
        </p>
        <ul style={{ color: "var(--gold-dim)", fontSize: "0.8rem", marginBottom: "0.5rem", paddingLeft: "1.25rem" }}>
          <li>Organization Name*</li>
          <li>Organization Address or PO Box*</li>
          <li>City*, State*, Zip Code*, County*</li>
          <li>Phone*, Website*</li>
          <li>Organization Type* (must match dropdown exactly)</li>
        </ul>
        <p style={{ color: "var(--gold-dim)", fontSize: "0.8rem", marginBottom: "0.75rem" }}>
          <strong style={{ color: "var(--gold-bright)" }}>Optional:</strong> Suite #, Tags
        </p>
        <p style={{ color: "var(--gold-dim)", fontSize: "0.75rem", marginBottom: "1rem" }}>
          Organization Type must be one of: {ORGANIZATION_TYPES.join(", ")}
        </p>

        <p style={{ color: "var(--gold-dim)", fontSize: "0.75rem", marginBottom: "0.5rem" }}>
          Example header row:
        </p>
        <code
          style={{
            display: "block",
            padding: "0.5rem",
            background: "var(--glass-dark)",
            borderRadius: "4px",
            fontSize: "0.7rem",
            color: "var(--gold-dim)",
            marginBottom: "1rem",
            overflow: "auto",
          }}
        >
          {EXPECTED_HEADERS}
        </code>

        <form onSubmit={handleSubmit}>
          <input
            ref={inputRef}
            type="file"
            accept=".csv"
            onChange={(e) => {
              setFile(e.target.files?.[0] ?? null);
              setError(null);
              setResult(null);
            }}
            style={{
              display: "block",
              marginBottom: "0.75rem",
              fontSize: "0.875rem",
              color: "var(--gold-bright)",
            }}
          />
          <button
            type="submit"
            disabled={!file || uploading}
            style={{
              padding: "0.5rem 1rem",
              background: file && !uploading ? "var(--gold)" : "var(--glass)",
              color: file && !uploading ? "var(--bg)" : "var(--gold-dim)",
              border: "1px solid var(--glass-border)",
              borderRadius: "6px",
              fontWeight: 600,
              cursor: file && !uploading ? "pointer" : "not-allowed",
              fontSize: "0.875rem",
            }}
          >
            {uploading ? "Uploading…" : "Upload CSV"}
          </button>
        </form>

        {error && (
          <p style={{ color: "#f87171", fontSize: "0.875rem", marginTop: "1rem" }}>{error}</p>
        )}

        {result && (
          <div style={{ marginTop: "1rem", fontSize: "0.875rem" }}>
            <p style={{ color: "var(--gold-bright)", fontWeight: 600 }}>
              Created {result.created} organization{result.created !== 1 ? "s" : ""}.
            </p>
            {result.createdIds.length > 0 && (
              <ul style={{ color: "var(--gold-dim)", paddingLeft: "1.25rem", marginTop: "0.25rem" }}>
                {result.createdIds.slice(0, 20).map((item, i) => (
                  <li key={i}>
                    <Link href={`/all-organizations/${item.displayId}`} style={{ color: "var(--gold-bright)" }}>
                      {item.displayId}
                    </Link>
                    {" — "}
                    {item.organizationName}
                  </li>
                ))}
                {result.createdIds.length > 20 && (
                  <li style={{ color: "var(--gold-dim)" }}>… and {result.createdIds.length - 20} more</li>
                )}
              </ul>
            )}
            {result.errors && result.errors.length > 0 && (
              <p style={{ color: "#fbbf24", marginTop: "0.75rem" }}>
                Row errors: {result.errors.map((e) => `Row ${e.row}: ${e.message}`).join("; ")}
              </p>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
