"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NewContactPage() {
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "submitting" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    title: "",
    officeNumber: "",
    cellNumber: "",
    email: "",
    businessId: "",
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("submitting");
    setErrorMessage("");
    try {
      const res = await fetch("/api/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        const isDuplicate = res.status === 400 && data.error?.toLowerCase().includes("already exists");
        if (isDuplicate) {
          window.alert("This contact already exists.");
          setErrorMessage("");
        } else {
          setErrorMessage(data.error || "Failed to create contact");
        }
        setStatus("error");
        return;
      }
      if (form.businessId.trim()) {
        const id = form.businessId.trim();
        const isOrg = id.toUpperCase().startsWith("A");
        router.push(isOrg ? `/all-organizations/${id}` : `/all-businesses/${id}`);
      } else {
        router.push("/all-contacts");
      }
    } catch {
      setErrorMessage("Network error");
      setStatus("error");
    }
  };

  const inputStyle: React.CSSProperties = {
    padding: "0.5rem 0.75rem",
    background: "var(--glass)",
    border: "1px solid var(--glass-border)",
    borderRadius: "6px",
    color: "var(--gold-bright)",
    fontSize: "1rem",
  };

  return (
    <main style={{ padding: "1.5rem", maxWidth: "560px" }}>
      <h1 style={{ color: "var(--gold-bright)", marginBottom: "1rem" }}>
        New Contact
      </h1>
      <form
        onSubmit={handleSubmit}
        style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
      >
        <label style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
          <span style={{ color: "var(--gold-dim)", fontSize: "0.875rem" }}>First Name *</span>
          <input
            type="text"
            name="firstName"
            value={form.firstName}
            onChange={handleChange}
            placeholder="First name"
            required
            style={inputStyle}
          />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
          <span style={{ color: "var(--gold-dim)", fontSize: "0.875rem" }}>Last Name *</span>
          <input
            type="text"
            name="lastName"
            value={form.lastName}
            onChange={handleChange}
            placeholder="Last name"
            required
            style={inputStyle}
          />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
          <span style={{ color: "var(--gold-dim)", fontSize: "0.875rem" }}>Title *</span>
          <input
            type="text"
            name="title"
            value={form.title}
            onChange={handleChange}
            placeholder="e.g. Sales Manager"
            required
            style={inputStyle}
          />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
          <span style={{ color: "var(--gold-dim)", fontSize: "0.875rem" }}>Office Number *</span>
          <input
            type="tel"
            name="officeNumber"
            value={form.officeNumber}
            onChange={handleChange}
            placeholder="(555) 123-4567"
            required
            style={inputStyle}
          />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
          <span style={{ color: "var(--gold-dim)", fontSize: "0.875rem" }}>Cell Number</span>
          <input
            type="tel"
            name="cellNumber"
            value={form.cellNumber}
            onChange={handleChange}
            placeholder="(555) 987-6543"
            style={inputStyle}
          />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
          <span style={{ color: "var(--gold-dim)", fontSize: "0.875rem" }}>Email *</span>
          <input
            type="email"
            name="email"
            value={form.email}
            onChange={handleChange}
            placeholder="email@example.com"
            required
            style={inputStyle}
          />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
          <span style={{ color: "var(--gold-dim)", fontSize: "0.875rem" }}>Business or Organization ID *</span>
          <input
            type="text"
            name="businessId"
            value={form.businessId}
            onChange={handleChange}
            placeholder="e.g. A00000001 or B00000002"
            required
            autoComplete="off"
            style={inputStyle}
          />
        </label>
        {status === "error" && errorMessage && (
          <p style={{ color: "#e57373", fontSize: "0.875rem" }}>{errorMessage}</p>
        )}
        <button
          type="submit"
          disabled={status === "submitting"}
          style={{
            padding: "0.6rem 1rem",
            background: "var(--gold)",
            color: "var(--bg)",
            border: "none",
            borderRadius: "6px",
            fontWeight: 600,
            cursor: status === "submitting" ? "not-allowed" : "pointer",
            opacity: status === "submitting" ? 0.8 : 1,
          }}
        >
          {status === "submitting" ? "Saving…" : "Create Contact"}
        </button>
      </form>
    </main>
  );
}
