"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

const BUSINESS_TYPES = [
  "Hotel",
  "Resort",
  "Vacation Rental",
  "Restaurant",
  "Restaurant Group",
  "Winery",
  "Brewery",
  "Distillery",
  "Food Brand",
  "Beverage Brand",
  "Cruise Line",
  "Airline",
  "Private Aviation",
  "Travel Agency",
  "Tour Operator",
  "Attraction",
  "Theme Park",
  "Museum",
  "Golf Course",
  "Ski Resort",
  "Spa / Wellness",
  "Luxury Retail",
  "Travel Gear Brand",
  "Transportation Service",
  "Event Venue",
  "Other",
];

const US_STATES = [
  { value: "AL", label: "Alabama" },
  { value: "AK", label: "Alaska" },
  { value: "AZ", label: "Arizona" },
  { value: "AR", label: "Arkansas" },
  { value: "CA", label: "California" },
  { value: "CO", label: "Colorado" },
  { value: "CT", label: "Connecticut" },
  { value: "DE", label: "Delaware" },
  { value: "FL", label: "Florida" },
  { value: "GA", label: "Georgia" },
  { value: "HI", label: "Hawaii" },
  { value: "ID", label: "Idaho" },
  { value: "IL", label: "Illinois" },
  { value: "IN", label: "Indiana" },
  { value: "IA", label: "Iowa" },
  { value: "KS", label: "Kansas" },
  { value: "KY", label: "Kentucky" },
  { value: "LA", label: "Louisiana" },
  { value: "ME", label: "Maine" },
  { value: "MD", label: "Maryland" },
  { value: "MA", label: "Massachusetts" },
  { value: "MI", label: "Michigan" },
  { value: "MN", label: "Minnesota" },
  { value: "MS", label: "Mississippi" },
  { value: "MO", label: "Missouri" },
  { value: "MT", label: "Montana" },
  { value: "NE", label: "Nebraska" },
  { value: "NV", label: "Nevada" },
  { value: "NH", label: "New Hampshire" },
  { value: "NJ", label: "New Jersey" },
  { value: "NM", label: "New Mexico" },
  { value: "NY", label: "New York" },
  { value: "NC", label: "North Carolina" },
  { value: "ND", label: "North Dakota" },
  { value: "OH", label: "Ohio" },
  { value: "OK", label: "Oklahoma" },
  { value: "OR", label: "Oregon" },
  { value: "PA", label: "Pennsylvania" },
  { value: "RI", label: "Rhode Island" },
  { value: "SC", label: "South Carolina" },
  { value: "SD", label: "South Dakota" },
  { value: "TN", label: "Tennessee" },
  { value: "TX", label: "Texas" },
  { value: "UT", label: "Utah" },
  { value: "VT", label: "Vermont" },
  { value: "VA", label: "Virginia" },
  { value: "WA", label: "Washington" },
  { value: "WV", label: "West Virginia" },
  { value: "WI", label: "Wisconsin" },
  { value: "WY", label: "Wyoming" },
];

export default function NewBusinessPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"idle" | "submitting" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [form, setForm] = useState({
    businessName: "",
    address: "",
    addressLine2: "",
    city: "",
    state: "",
    zipCode: "",
    county: "",
    phone: "",
    website: "",
    businessType: "",
    tags: "",
    agencyId: "",
  });

  useEffect(() => {
    const agencyId = searchParams.get("agencyId") ?? "";
    if (agencyId) setForm((prev) => ({ ...prev, agencyId }));
  }, [searchParams]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("submitting");
    setErrorMessage("");
    try {
      const { agencyId, ...submitPayload } = form;
      const res = await fetch("/api/businesses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(submitPayload),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.error || "Failed to create business");
        setStatus("error");
        return;
      }
      const agencyIdTrimmed = agencyId?.trim() ?? "";
      if (agencyIdTrimmed && data.displayId) {
        const linkRes = await fetch(`/api/agencies/${encodeURIComponent(agencyIdTrimmed)}/clients`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ companyDisplayId: data.displayId, companyType: "business" }),
        });
        if (linkRes.ok) {
          router.push(`/all-agencies/${encodeURIComponent(agencyIdTrimmed)}`);
          return;
        }
      }
      router.push("/all-businesses");
    } catch {
      setErrorMessage("Network error");
      setStatus("error");
    }
  };

  return (
    <main style={{ padding: "1.5rem", maxWidth: "560px" }}>
      <h1 style={{ color: "var(--gold-bright)", marginBottom: "1rem" }}>
        New Business
      </h1>
      <form
        onSubmit={handleSubmit}
        autoComplete="off"
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "1rem",
        }}
      >
        <label style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
          <span style={{ color: "var(--gold-dim)", fontSize: "0.875rem" }}>
            Business Name *
          </span>
          <input
            type="text"
            name="businessName"
            value={form.businessName}
            onChange={handleChange}
            required
            placeholder="e.g. Kane Pubs"
            style={inputStyle}
          />
        </label>
        {form.agencyId && (
          <label style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
            <span style={{ color: "var(--gold-dim)", fontSize: "0.875rem" }}>
              Add as client of Agency (ID)
            </span>
            <input
              type="text"
              name="agencyId"
              value={form.agencyId}
              onChange={handleChange}
              readOnly
              style={{ ...inputStyle, opacity: 0.9 }}
            />
          </label>
        )}
        <label style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
          <span style={{ color: "var(--gold-dim)", fontSize: "0.875rem" }}>
            Business Address or PO Box *
          </span>
          <input
            type="text"
            name="address"
            value={form.address}
            onChange={handleChange}
            placeholder="Street number and name"
            required
            autoComplete="off"
            style={inputStyle}
          />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
          <span style={{ color: "var(--gold-dim)", fontSize: "0.875rem" }}>
            Suite #
          </span>
          <input
            type="text"
            name="addressLine2"
            value={form.addressLine2}
            onChange={handleChange}
            placeholder="Optional"
            autoComplete="off"
            style={inputStyle}
          />
        </label>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.75rem" }}>
          <label style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
            <span style={{ color: "var(--gold-dim)", fontSize: "0.875rem" }}>City *</span>
            <input
              type="text"
              name="city"
              value={form.city}
              onChange={handleChange}
              placeholder="City"
              required
              autoComplete="off"
              style={inputStyle}
            />
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
            <span style={{ color: "var(--gold-dim)", fontSize: "0.875rem" }}>State *</span>
            <select
              name="state"
              value={form.state}
              onChange={handleChange}
              required
              style={inputStyle}
            >
              <option value="">Select state</option>
              {US_STATES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
            <span style={{ color: "var(--gold-dim)", fontSize: "0.875rem" }}>Zip code *</span>
            <input
              type="text"
              name="zipCode"
              value={form.zipCode}
              onChange={handleChange}
              placeholder="Zip"
              required
              autoComplete="off"
              style={inputStyle}
            />
          </label>
        </div>
        <label style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
          <span style={{ color: "var(--gold-dim)", fontSize: "0.875rem" }}>County *</span>
          <input
            type="text"
            name="county"
            value={form.county}
            onChange={handleChange}
            placeholder="County"
            required
            autoComplete="off"
            style={inputStyle}
          />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
          <span style={{ color: "var(--gold-dim)", fontSize: "0.875rem" }}>
            Business Phone *
          </span>
          <input
            type="tel"
            name="phone"
            value={form.phone}
            onChange={handleChange}
            placeholder="(555) 123-4567"
            required
            style={inputStyle}
          />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
          <span style={{ color: "var(--gold-dim)", fontSize: "0.875rem" }}>
            Website *
          </span>
          <input
            type="text"
            name="website"
            value={form.website}
            onChange={handleChange}
            placeholder="e.g. example.com or https://example.com"
            required
            style={inputStyle}
          />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
          <span style={{ color: "var(--gold-dim)", fontSize: "0.875rem" }}>
            Business Type *
          </span>
          <select
            name="businessType"
            value={form.businessType}
            onChange={handleChange}
            required
            style={inputStyle}
          >
            <option value="">Select type</option>
            {BUSINESS_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
          <span style={{ color: "var(--gold-dim)", fontSize: "0.875rem" }}>
            Tags
          </span>
          <input
            type="text"
            name="tags"
            value={form.tags}
            onChange={handleChange}
            placeholder="e.g. pub, downtown, live music"
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
          {status === "submitting" ? "Saving…" : "Create Business"}
        </button>
      </form>
    </main>
  );
}

const inputStyle: React.CSSProperties = {
  padding: "0.5rem 0.75rem",
  background: "var(--glass)",
  border: "1px solid var(--glass-border)",
  borderRadius: "6px",
  color: "var(--gold-bright)",
  fontSize: "1rem",
};
