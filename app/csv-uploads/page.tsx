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

const CONTACTS_HEADERS =
  "First Name*,Last Name*,Title,Office Number*,Cell Number*,Email*,Business or Organization ID*";

const SOLD_HISTORY_HEADERS =
  "Business or organization ID*,First Name*,Last Name*,Agent*,Sold Date*,Sold time*,Sold Amount*";

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

  const [contactsFile, setContactsFile] = useState<File | null>(null);
  const [contactsUploading, setContactsUploading] = useState(false);
  const [contactsResult, setContactsResult] = useState<{
    created: number;
    createdContacts?: { id: string; firstName: string; lastName: string; businessId: string }[];
    errors?: { row: number; message: string }[];
  } | null>(null);
  const [contactsError, setContactsError] = useState<string | null>(null);
  const contactsInputRef = useRef<HTMLInputElement>(null);

  const [soldHistoryFile, setSoldHistoryFile] = useState<File | null>(null);
  const [soldHistoryUploading, setSoldHistoryUploading] = useState(false);
  const [soldHistoryResult, setSoldHistoryResult] = useState<{
    created: number;
    createdSales?: { proposalId: string; companyDisplayId: string; soldAt: string }[];
    errors?: { row: number; message: string }[];
  } | null>(null);
  const [soldHistoryError, setSoldHistoryError] = useState<string | null>(null);
  const soldHistoryInputRef = useRef<HTMLInputElement>(null);

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

  async function handleContactsSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!contactsFile) {
      setContactsError("Please select a CSV file.");
      return;
    }
    setContactsError(null);
    setContactsResult(null);
    setContactsUploading(true);
    try {
      const text = await contactsFile.text();
      const res = await fetch("/api/csv-upload/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csv: text }),
      });
      const data = await res.json();
      if (!res.ok) {
        setContactsError(data.error ?? "Upload failed");
        return;
      }
      setContactsResult({
        created: data.created ?? 0,
        createdContacts: data.createdContacts ?? [],
        errors: data.errors,
      });
      setContactsFile(null);
      if (contactsInputRef.current) contactsInputRef.current.value = "";
    } catch (err) {
      setContactsError("Failed to upload. Please try again.");
    } finally {
      setContactsUploading(false);
    }
  }

  async function handleSoldHistorySubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!soldHistoryFile) {
      setSoldHistoryError("Please select a CSV file.");
      return;
    }
    setSoldHistoryError(null);
    setSoldHistoryResult(null);
    setSoldHistoryUploading(true);
    try {
      const text = await soldHistoryFile.text();
      const res = await fetch("/api/csv-upload/sold-history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csv: text }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSoldHistoryError(data.error ?? "Upload failed");
        return;
      }
      setSoldHistoryResult({
        created: data.created ?? 0,
        createdSales: data.createdSales ?? [],
        errors: data.errors,
      });
      setSoldHistoryFile(null);
      if (soldHistoryInputRef.current) soldHistoryInputRef.current.value = "";
    } catch (err) {
      setSoldHistoryError("Failed to upload. Please try again.");
    } finally {
      setSoldHistoryUploading(false);
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
          Contacts CSV Uploader
        </h2>
        <p style={{ color: "var(--gold-dim)", fontSize: "0.875rem", marginBottom: "1rem" }}>
          Upload a .csv file with contacts. Each row must include a Business or Organization ID (display ID, e.g. A00000028) that exists in All Organizations or All Businesses.
        </p>

        <p style={{ color: "var(--gold-dim)", fontSize: "0.8rem", marginBottom: "0.5rem" }}>
          <strong style={{ color: "var(--gold-bright)" }}>Required columns (*):</strong>
        </p>
        <ul style={{ color: "var(--gold-dim)", fontSize: "0.8rem", marginBottom: "0.5rem", paddingLeft: "1.25rem" }}>
          <li>First Name*, Last Name*, Title (optional), Office Number*, Cell Number*</li>
          <li>Email*, Business or Organization ID*</li>
        </ul>
        <p style={{ color: "var(--gold-dim)", fontSize: "0.75rem", marginBottom: "1rem" }}>
          Business or Organization ID must match an existing organization or business display ID.
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
          {CONTACTS_HEADERS}
        </code>

        <form onSubmit={handleContactsSubmit}>
          <input
            ref={contactsInputRef}
            type="file"
            accept=".csv"
            onChange={(e) => {
              setContactsFile(e.target.files?.[0] ?? null);
              setContactsError(null);
              setContactsResult(null);
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
            disabled={!contactsFile || contactsUploading}
            style={{
              padding: "0.5rem 1rem",
              background: contactsFile && !contactsUploading ? "var(--gold)" : "var(--glass)",
              color: contactsFile && !contactsUploading ? "var(--bg)" : "var(--gold-dim)",
              border: "1px solid var(--glass-border)",
              borderRadius: "6px",
              fontWeight: 600,
              cursor: contactsFile && !contactsUploading ? "pointer" : "not-allowed",
              fontSize: "0.875rem",
            }}
          >
            {contactsUploading ? "Uploading…" : "Upload CSV"}
          </button>
        </form>

        {contactsError && (
          <p style={{ color: "#f87171", fontSize: "0.875rem", marginTop: "1rem" }}>{contactsError}</p>
        )}

        {contactsResult && (
          <div style={{ marginTop: "1rem", fontSize: "0.875rem" }}>
            <p style={{ color: "var(--gold-bright)", fontWeight: 600 }}>
              Created {contactsResult.created} contact{contactsResult.created !== 1 ? "s" : ""}.
            </p>
            {contactsResult.createdContacts && contactsResult.createdContacts.length > 0 && (
              <ul style={{ color: "var(--gold-dim)", paddingLeft: "1.25rem", marginTop: "0.25rem" }}>
                {contactsResult.createdContacts.slice(0, 20).map((item) => (
                  <li key={item.id}>
                    {item.firstName} {item.lastName} — {item.businessId}
                  </li>
                ))}
                {contactsResult.createdContacts.length > 20 && (
                  <li style={{ color: "var(--gold-dim)" }}>… and {contactsResult.createdContacts.length - 20} more</li>
                )}
              </ul>
            )}
            {contactsResult.errors && contactsResult.errors.length > 0 && (
              <p style={{ color: "#fbbf24", marginTop: "0.75rem" }}>
                Row errors: {contactsResult.errors.map((e) => `Row ${e.row}: ${e.message}`).join("; ")}
              </p>
            )}
          </div>
        )}
      </section>

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
          SOLD History CSV Uploader
        </h2>
        <p style={{ color: "var(--gold-dim)", fontSize: "0.875rem", marginBottom: "1rem" }}>
          Upload past sales as a .csv file. Each row creates a SOLD record that appears on the{" "}
          <Link href="/sold" style={{ color: "var(--gold-bright)" }}>SOLD</Link> page (by date), in the
          organization or business profile&apos;s Recent Activity, and updates that profile&apos;s Transactions count and Money Spent total.
        </p>

        <p style={{ color: "var(--gold-dim)", fontSize: "0.8rem", marginBottom: "0.5rem" }}>
          <strong style={{ color: "var(--gold-bright)" }}>Required columns (*):</strong>
        </p>
        <ul style={{ color: "var(--gold-dim)", fontSize: "0.8rem", marginBottom: "0.5rem", paddingLeft: "1.25rem" }}>
          <li>Business or organization ID* (display ID, e.g. A00000028)</li>
          <li>First Name*, Last Name*, Agent*</li>
          <li>Sold Date*, Sold time*, Sold Amount*</li>
        </ul>
        <p style={{ color: "var(--gold-dim)", fontSize: "0.75rem", marginBottom: "1rem" }}>
          Date/time can be like 01/15/2024 and 2:30 PM, or ISO format. Amount can include $ and commas. If the contact does not exist, one will be created for that organization/business.
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
          {SOLD_HISTORY_HEADERS}
        </code>

        <form onSubmit={handleSoldHistorySubmit}>
          <input
            ref={soldHistoryInputRef}
            type="file"
            accept=".csv"
            onChange={(e) => {
              setSoldHistoryFile(e.target.files?.[0] ?? null);
              setSoldHistoryError(null);
              setSoldHistoryResult(null);
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
            disabled={!soldHistoryFile || soldHistoryUploading}
            style={{
              padding: "0.5rem 1rem",
              background: soldHistoryFile && !soldHistoryUploading ? "var(--gold)" : "var(--glass)",
              color: soldHistoryFile && !soldHistoryUploading ? "var(--bg)" : "var(--gold-dim)",
              border: "1px solid var(--glass-border)",
              borderRadius: "6px",
              fontWeight: 600,
              cursor: soldHistoryFile && !soldHistoryUploading ? "pointer" : "not-allowed",
              fontSize: "0.875rem",
            }}
          >
            {soldHistoryUploading ? "Uploading…" : "Upload CSV"}
          </button>
        </form>

        {soldHistoryError && (
          <p style={{ color: "#f87171", fontSize: "0.875rem", marginTop: "1rem" }}>{soldHistoryError}</p>
        )}

        {soldHistoryResult && (
          <div style={{ marginTop: "1rem", fontSize: "0.875rem" }}>
            <p style={{ color: "var(--gold-bright)", fontWeight: 600 }}>
              Created {soldHistoryResult.created} SOLD record{soldHistoryResult.created !== 1 ? "s" : ""}.
            </p>
            {soldHistoryResult.createdSales && soldHistoryResult.createdSales.length > 0 && (
              <ul style={{ color: "var(--gold-dim)", paddingLeft: "1.25rem", marginTop: "0.25rem" }}>
                {soldHistoryResult.createdSales.slice(0, 20).map((item) => (
                  <li key={item.proposalId}>
                    <Link
                      href={item.companyDisplayId.toUpperCase().startsWith("A") ? `/all-organizations/${item.companyDisplayId}` : `/all-businesses/${item.companyDisplayId}`}
                      style={{ color: "var(--gold-bright)" }}
                    >
                      {item.companyDisplayId}
                    </Link>
                    {" — "}
                    {new Date(item.soldAt).toLocaleString()}
                  </li>
                ))}
                {soldHistoryResult.createdSales.length > 20 && (
                  <li style={{ color: "var(--gold-dim)" }}>… and {soldHistoryResult.createdSales.length - 20} more</li>
                )}
              </ul>
            )}
            {soldHistoryResult.errors && soldHistoryResult.errors.length > 0 && (
              <p style={{ color: "#fbbf24", marginTop: "0.75rem" }}>
                Row errors: {soldHistoryResult.errors.map((e) => `Row ${e.row}: ${e.message}`).join("; ")}
              </p>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
