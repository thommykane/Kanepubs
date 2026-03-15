"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import LeadChecker from "@/components/LeadChecker";

const US_STATES = [
  { value: "AL", label: "Alabama" }, { value: "AK", label: "Alaska" }, { value: "AZ", label: "Arizona" },
  { value: "AR", label: "Arkansas" }, { value: "CA", label: "California" }, { value: "CO", label: "Colorado" },
  { value: "CT", label: "Connecticut" }, { value: "DE", label: "Delaware" }, { value: "FL", label: "Florida" },
  { value: "GA", label: "Georgia" }, { value: "HI", label: "Hawaii" }, { value: "ID", label: "Idaho" },
  { value: "IL", label: "Illinois" }, { value: "IN", label: "Indiana" }, { value: "IA", label: "Iowa" },
  { value: "KS", label: "Kansas" }, { value: "KY", label: "Kentucky" }, { value: "LA", label: "Louisiana" },
  { value: "ME", label: "Maine" }, { value: "MD", label: "Maryland" }, { value: "MA", label: "Massachusetts" },
  { value: "MI", label: "Michigan" }, { value: "MN", label: "Minnesota" }, { value: "MS", label: "Mississippi" },
  { value: "MO", label: "Missouri" }, { value: "MT", label: "Montana" }, { value: "NE", label: "Nebraska" },
  { value: "NV", label: "Nevada" }, { value: "NH", label: "New Hampshire" }, { value: "NJ", label: "New Jersey" },
  { value: "NM", label: "New Mexico" }, { value: "NY", label: "New York" }, { value: "NC", label: "North Carolina" },
  { value: "ND", label: "North Dakota" }, { value: "OH", label: "Ohio" }, { value: "OK", label: "Oklahoma" },
  { value: "OR", label: "Oregon" }, { value: "PA", label: "Pennsylvania" }, { value: "RI", label: "Rhode Island" },
  { value: "SC", label: "South Carolina" }, { value: "SD", label: "South Dakota" }, { value: "TN", label: "Tennessee" },
  { value: "TX", label: "Texas" }, { value: "UT", label: "Utah" }, { value: "VT", label: "Vermont" },
  { value: "VA", label: "Virginia" }, { value: "WA", label: "Washington" }, { value: "WV", label: "West Virginia" },
  { value: "WI", label: "Wisconsin" }, { value: "WY", label: "Wyoming" },
];

const inputStyle: React.CSSProperties = {
  padding: "0.5rem 0.75rem",
  background: "var(--glass)",
  border: "1px solid var(--glass-border)",
  borderRadius: "6px",
  color: "var(--gold-bright)",
  fontSize: "1rem",
};

export default function NewAgencyPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const linkCompany = searchParams.get("linkCompany") ?? "";
  const linkType = (searchParams.get("linkType") ?? "").toLowerCase();
  const fromAgency = searchParams.get("fromAgency") ?? "";
  const isUpdateFlow = Boolean(linkCompany && (linkType === "org" || linkType === "business"));

  const [status, setStatus] = useState<"idle" | "submitting" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [form, setForm] = useState({
    agencyName: "",
    address: "",
    addressLine2: "",
    city: "",
    state: "",
    zipCode: "",
    phone: "",
    website: "",
  });
  const [clients, setClients] = useState<string[]>([""]);
  const hasInitializedFromParams = useRef(false);
  useEffect(() => {
    if (hasInitializedFromParams.current || !linkCompany || (linkType !== "org" && linkType !== "business")) return;
    hasInitializedFromParams.current = true;
    setClients([linkCompany]);
  }, [linkCompany, linkType]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const setClient = (index: number, value: string) => {
    setClients((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  };

  const addClient = () => setClients((prev) => [...prev, ""]);
  const removeClient = (index: number) => {
    if (clients.length <= 1) return;
    setClients((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const clientIds = clients.map((c) => c.trim()).filter(Boolean);
    if (clientIds.length === 0) {
      setErrorMessage("At least one client (business or organization ID) is required.");
      setStatus("error");
      return;
    }
    setStatus("submitting");
    setErrorMessage("");
    try {
      const res = await fetch("/api/agencies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, clients: clientIds }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.error || "Failed to create agency");
        setStatus("error");
        return;
      }
      if (isUpdateFlow && fromAgency) {
        try {
          await fetch(`/api/agencies/${encodeURIComponent(fromAgency)}/clients`, {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({
              companyDisplayId: linkCompany,
              companyType: linkType,
            }),
          });
        } catch {
          // Continue to redirect; unlink from old agency is best-effort
        }
      }
      router.push(`/all-agencies/${data.displayId}`);
    } catch {
      setErrorMessage("Network error");
      setStatus("error");
    }
  };

  return (
    <main style={{ padding: "1.5rem", maxWidth: "560px" }}>
      <LeadChecker />
      <h1 style={{ color: "var(--gold-bright)", marginBottom: "1rem" }}>New Agency</h1>
      {isUpdateFlow && (
        <p style={{ color: "var(--gold-dim)", fontSize: "0.875rem", marginBottom: "1rem", padding: "0.75rem", background: "var(--glass)", borderRadius: "6px", border: "1px solid var(--glass-border)" }}>
          Linking <strong>{linkCompany}</strong> to this agency. After you create it, they will be removed from the previous agency and appear under this one.
        </p>
      )}
      <form onSubmit={handleSubmit} autoComplete="off" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        <label style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
          <span style={{ color: "var(--gold-dim)", fontSize: "0.875rem" }}>Agency Name *</span>
          <input type="text" name="agencyName" value={form.agencyName} onChange={handleChange} required placeholder="e.g. Smith Marketing" style={inputStyle} />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
          <span style={{ color: "var(--gold-dim)", fontSize: "0.875rem" }}>Agency Address or PO Box *</span>
          <input type="text" name="address" value={form.address} onChange={handleChange} required placeholder="Street number and name" style={inputStyle} />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
          <span style={{ color: "var(--gold-dim)", fontSize: "0.875rem" }}>Suite #</span>
          <input type="text" name="addressLine2" value={form.addressLine2} onChange={handleChange} placeholder="Optional" style={inputStyle} />
        </label>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.75rem" }}>
          <label style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
            <span style={{ color: "var(--gold-dim)", fontSize: "0.875rem" }}>City *</span>
            <input type="text" name="city" value={form.city} onChange={handleChange} required placeholder="City" style={inputStyle} />
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
            <span style={{ color: "var(--gold-dim)", fontSize: "0.875rem" }}>State *</span>
            <select name="state" value={form.state} onChange={handleChange} required style={inputStyle}>
              <option value="">Select state</option>
              {US_STATES.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
            <span style={{ color: "var(--gold-dim)", fontSize: "0.875rem" }}>Zip code *</span>
            <input type="text" name="zipCode" value={form.zipCode} onChange={handleChange} required placeholder="Zip" style={inputStyle} />
          </label>
        </div>
        <label style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
          <span style={{ color: "var(--gold-dim)", fontSize: "0.875rem" }}>Phone *</span>
          <input type="tel" name="phone" value={form.phone} onChange={handleChange} required placeholder="(555) 123-4567" style={inputStyle} />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
          <span style={{ color: "var(--gold-dim)", fontSize: "0.875rem" }}>Website *</span>
          <input type="text" name="website" value={form.website} onChange={handleChange} required placeholder="https://example.com" style={inputStyle} />
        </label>
        <div>
          <span style={{ color: "var(--gold-dim)", fontSize: "0.875rem" }}>Clients *</span>
          <p style={{ color: "var(--gold-dim)", fontSize: "0.8rem", marginTop: "2px", marginBottom: "0.5rem" }}>Business or organization IDs this agency represents</p>
          {clients.map((val, index) => (
            <div key={index} style={{ display: "flex", gap: "0.5rem", alignItems: "center", marginBottom: "0.5rem" }}>
              <input
                type="text"
                value={val}
                onChange={(e) => setClient(index, e.target.value)}
                placeholder="e.g. A00000001 or B00000002"
                style={{ ...inputStyle, flex: 1 }}
              />
              {clients.length > 1 && (
                <button type="button" onClick={() => removeClient(index)} style={{ padding: "0.5rem", background: "var(--glass)", border: "1px solid var(--glass-border)", borderRadius: "6px", color: "var(--gold-bright)", cursor: "pointer" }} title="Remove">−</button>
              )}
              {index === clients.length - 1 && (
                <button type="button" onClick={addClient} style={{ padding: "0.5rem 0.75rem", background: "var(--gold)", color: "var(--bg)", border: "none", borderRadius: "6px", fontWeight: 600, cursor: "pointer" }}>+</button>
              )}
            </div>
          ))}
        </div>
        {status === "error" && errorMessage && <p style={{ color: "#e57373", fontSize: "0.875rem" }}>{errorMessage}</p>}
        <button type="submit" disabled={status === "submitting"} style={{ padding: "0.6rem 1rem", background: "var(--gold)", color: "var(--bg)", border: "none", borderRadius: "6px", fontWeight: 600, cursor: status === "submitting" ? "not-allowed" : "pointer", opacity: status === "submitting" ? 0.8 : 1 }}>
          {status === "submitting" ? "Creating…" : "Create Agency"}
        </button>
      </form>
    </main>
  );
}
