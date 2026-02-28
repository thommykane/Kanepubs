"use client";

import React from "react";
import Link from "next/link";
import { useState, useCallback } from "react";

const ACTIONS = [
  "No Answer",
  "Left Voicemail",
  "Not Interested",
  "No Budget",
  "Blind Email",
  "Scheduled Meeting",
  "Sent Proposal",
] as const;

const ISSUE_OPTIONS = ["Spring", "Summer", "Fall", "Winter", "Holiday Edition", "Special Edition"];
const YEARS = Array.from({ length: 11 }, (_, i) => String(2020 + i));
const SPECIAL_FEATURES = [
  "None",
  "Inside Front Cover",
  "Inside Back Cover",
  "Back Cover",
  "Inside Front Spread",
  "Inside Back Spread",
  "Spread",
];

const ACTION_VALUES: Record<string, string> = {
  "No Answer": "no_answer",
  "Left Voicemail": "left_voicemail",
  "Not Interested": "not_interested",
  "No Budget": "no_budget",
  "Blind Email": "blind_email",
  "Scheduled Meeting": "scheduled_meeting",
  "Sent Proposal": "sent_proposal",
};

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const DAYS_1_31 = Array.from({ length: 31 }, (_, i) => String(i + 1));
const MEETING_YEARS = Array.from({ length: 12 }, (_, i) => String(new Date().getFullYear() + i));
const TIME_OPTIONS = Array.from({ length: 48 }, (_, i) => {
  const h = Math.floor(i / 2);
  const m = (i % 2) * 30;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
});

type Contact = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  title: string | null;
  officeNumber: string | null;
  cellNumber: string | null;
  email: string | null;
};

type Props = {
  contactList: Contact[];
  companyType: string;
  companyDisplayId: string;
  onActivityCreated?: () => void;
};

export default function CompanyContactsTable({
  contactList,
  companyType,
  companyDisplayId,
  onActivityCreated,
}: Props) {
  const [expandedContactId, setExpandedContactId] = useState<string | null>(null);
  const [action, setAction] = useState("");
  const [notes, setNotes] = useState("");
  const [meetingMonth, setMeetingMonth] = useState("");
  const [meetingDay, setMeetingDay] = useState("");
  const [meetingYear, setMeetingYear] = useState("");
  const [meetingTime, setMeetingTime] = useState("");
  const [proposalAmount, setProposalAmount] = useState("");
  const [proposalIssues, setProposalIssues] = useState<
    { issue: string; year: string; specialFeatures: string }[]
  >([{ issue: "", year: "2024", specialFeatures: "None" }]);
  const [proposalGeo, setProposalGeo] = useState("");
  const [proposalImpressions, setProposalImpressions] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const addIssueRow = () => {
    setProposalIssues((p) => [...p, { issue: "", year: "2024", specialFeatures: "None" }]);
  };

  const updateIssue = (index: number, field: "issue" | "year" | "specialFeatures", value: string) => {
    setProposalIssues((p) => {
      const next = [...p];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const submitActivity = useCallback(
    async (contactId: string) => {
      if (!action) return;
      setSubmitting(true);
      try {
        const actionValue = ACTION_VALUES[action] ?? action;
        const body: Record<string, unknown> = {
          companyType,
          companyDisplayId,
          contactId,
          actionType: actionValue,
          notes: notes.slice(0, 50) || undefined,
        };
        if (actionValue === "scheduled_meeting" && (meetingMonth || meetingDay || meetingYear || meetingTime)) {
          const monthIdx = MONTHS.indexOf(meetingMonth);
          const month = monthIdx >= 0 ? String(monthIdx + 1).padStart(2, "0") : "01";
          const day = (meetingDay && meetingDay.length <= 2) ? meetingDay.padStart(2, "0") : "01";
          const year = meetingYear || String(new Date().getFullYear());
          const time = meetingTime || "12:00";
          body.meetingAt = `${year}-${month}-${day}T${time}:00`;
        }
        if (actionValue === "sent_proposal") {
          body.proposalData = {
            amount: proposalAmount || undefined,
            issues: proposalIssues.filter((i) => i.issue),
            geo: proposalGeo || undefined,
            impressions: proposalImpressions ? parseInt(proposalImpressions.replace(/\D/g, "").slice(0, 7), 10) : undefined,
          };
        }
        const res = await fetch("/api/activities", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (res.ok) {
          setExpandedContactId(null);
          setAction("");
          setNotes("");
          setMeetingMonth("");
          setMeetingDay("");
          setMeetingYear("");
          setMeetingTime("");
          setProposalAmount("");
          setProposalIssues([{ issue: "", year: "2024", specialFeatures: "None" }]);
          setProposalGeo("");
          setProposalImpressions("");
          onActivityCreated?.();
        }
      } finally {
        setSubmitting(false);
      }
    },
    [
      action,
      notes,
      meetingMonth,
      meetingDay,
      meetingYear,
      meetingTime,
      proposalAmount,
      proposalIssues,
      proposalGeo,
      proposalImpressions,
      companyType,
      companyDisplayId,
      onActivityCreated,
    ]
  );

  const toggleExpand = (contactId: string) => {
    setExpandedContactId((p) => (p === contactId ? null : contactId));
    if (expandedContactId !== contactId) {
      setAction("");
      setNotes("");
      setMeetingMonth("");
      setMeetingDay("");
      setMeetingYear("");
      setMeetingTime("");
      setProposalAmount("");
      setProposalIssues([{ issue: "", year: "2024", specialFeatures: "None" }]);
      setProposalGeo("");
      setProposalImpressions("");
    }
  };

  const thStyle: React.CSSProperties = {
    padding: "10px 12px",
    fontSize: "0.75rem",
    fontWeight: 600,
    color: "var(--gold-dim)",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  };
  const tdStyle: React.CSSProperties = {
    padding: "10px 12px",
    fontSize: "0.875rem",
    color: "var(--gold-bright)",
  };
  const inputStyle: React.CSSProperties = {
    padding: "0.35rem 0.5rem",
    background: "var(--glass)",
    border: "1px solid var(--glass-border)",
    borderRadius: "4px",
    color: "var(--gold-bright)",
    fontSize: "0.875rem",
    width: "100%",
    maxWidth: "240px",
  };

  return (
    <>
      <h2 style={{ color: "var(--gold-bright)", fontSize: "1rem", marginBottom: "0.75rem" }}>
        Contacts
      </h2>
      <div
        style={{
          background: "var(--glass)",
          border: "1px solid var(--glass-border)",
          borderRadius: "8px",
          overflow: "hidden",
        }}
      >
        {contactList.length === 0 ? (
          <div style={{ padding: "1.5rem", color: "var(--gold-dim)", fontSize: "0.875rem" }}>
            No contacts associated yet. Add one from{" "}
            <Link href="/new-contact" style={{ color: "var(--gold-bright)" }}>
              New Contact
            </Link>{" "}
            and enter {companyType === "org" ? "Organization" : "Business"} ID {companyDisplayId}.
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--glass-border)", textAlign: "left" }}>
                <th style={thStyle}></th>
                <th style={thStyle}>First</th>
                <th style={thStyle}>Last</th>
                <th style={thStyle}>Title</th>
                <th style={thStyle}>Office</th>
                <th style={thStyle}>Cell</th>
                <th style={thStyle}>Email</th>
              </tr>
            </thead>
            <tbody>
              {contactList.map((c) => (
                <React.Fragment key={c.id}>
                  <tr
                    style={{ borderBottom: "1px solid var(--glass-border)", height: "44px" }}
                  >
                    <td style={tdStyle}>
                      <button
                        type="button"
                        onClick={() => toggleExpand(c.id)}
                        style={{
                          padding: "0.25rem 0.5rem",
                          fontSize: "0.75rem",
                          background: "var(--gold)",
                          color: "var(--bg)",
                          border: "none",
                          borderRadius: "4px",
                          cursor: "pointer",
                          fontWeight: 600,
                        }}
                      >
                        Contact
                      </button>
                    </td>
                    <td style={tdStyle}>{c.firstName ?? "—"}</td>
                    <td style={tdStyle}>{c.lastName ?? "—"}</td>
                    <td style={tdStyle}>{c.title ?? "—"}</td>
                    <td style={tdStyle}>{c.officeNumber ?? "—"}</td>
                    <td style={tdStyle}>{c.cellNumber ?? "—"}</td>
                    <td style={tdStyle}>{c.email ?? "—"}</td>
                  </tr>
                  {expandedContactId === c.id && (
                    <tr key={`${c.id}-form`} style={{ borderBottom: "1px solid var(--glass-border)" }}>
                      <td colSpan={7} style={{ padding: "1rem", background: "rgba(0,0,0,0.2)" }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", maxWidth: "560px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                            <button
                              type="button"
                              onClick={() => setExpandedContactId(null)}
                              style={{
                                padding: "0.2rem 0.4rem",
                                fontSize: "0.8rem",
                                background: "var(--glass)",
                                border: "1px solid var(--glass-border)",
                                borderRadius: "4px",
                                color: "var(--gold-bright)",
                                cursor: "pointer",
                              }}
                              title="Collapse"
                            >
                              −
                            </button>
                            <span style={{ color: "var(--gold-dim)", fontSize: "0.8rem" }}>Collapse form</span>
                          </div>
                          <label style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                            <span style={{ color: "var(--gold-dim)", fontSize: "0.8rem" }}>Action</span>
                            <select
                              value={action}
                              onChange={(e) => setAction(e.target.value)}
                              style={inputStyle}
                            >
                              <option value="">Select action</option>
                              {ACTIONS.map((a) => (
                                <option key={a} value={a}>
                                  {a}
                                </option>
                              ))}
                            </select>
                          </label>
                          <label style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                            <span style={{ color: "var(--gold-dim)", fontSize: "0.8rem" }}>Notes (max 50)</span>
                            <input
                              type="text"
                              value={notes}
                              onChange={(e) => setNotes(e.target.value.slice(0, 50))}
                              maxLength={50}
                              style={inputStyle}
                              placeholder="Optional"
                            />
                          </label>
                          {action === "Scheduled Meeting" && (
                            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center" }}>
                              <select
                                value={meetingMonth}
                                onChange={(e) => setMeetingMonth(e.target.value)}
                                style={{ ...inputStyle, minWidth: "100px" }}
                              >
                                <option value="">Month</option>
                                {MONTHS.map((m) => (
                                  <option key={m} value={m}>{m}</option>
                                ))}
                              </select>
                              <select
                                value={meetingDay}
                                onChange={(e) => setMeetingDay(e.target.value)}
                                style={{ ...inputStyle, minWidth: "70px" }}
                              >
                                <option value="">Day</option>
                                {DAYS_1_31.map((d) => (
                                  <option key={d} value={d}>{d}</option>
                                ))}
                              </select>
                              <select
                                value={meetingYear}
                                onChange={(e) => setMeetingYear(e.target.value)}
                                style={{ ...inputStyle, minWidth: "80px" }}
                              >
                                <option value="">Year</option>
                                {MEETING_YEARS.map((y) => (
                                  <option key={y} value={y}>{y}</option>
                                ))}
                              </select>
                              <select
                                value={meetingTime}
                                onChange={(e) => setMeetingTime(e.target.value)}
                                style={{ ...inputStyle, minWidth: "80px" }}
                              >
                                <option value="">Time</option>
                                {TIME_OPTIONS.map((t) => (
                                  <option key={t} value={t}>{t}</option>
                                ))}
                              </select>
                            </div>
                          )}
                          {action === "Sent Proposal" && (
                            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                              <label>
                                <span style={{ color: "var(--gold-dim)", fontSize: "0.8rem" }}>Amount ($)</span>
                                <input
                                  type="text"
                                  value={proposalAmount}
                                  onChange={(e) => setProposalAmount(e.target.value)}
                                  placeholder="0.00"
                                  style={{ ...inputStyle, marginLeft: "8px" }}
                                />
                              </label>
                              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                                <span style={{ color: "var(--gold-dim)", fontSize: "0.8rem" }}>Issue(s)</span>
                                {proposalIssues.map((row, idx) => (
                                  <div key={idx} style={{ display: "flex", gap: "6px", flexWrap: "wrap", alignItems: "center" }}>
                                    <select
                                      value={row.issue}
                                      onChange={(e) => updateIssue(idx, "issue", e.target.value)}
                                      style={{ ...inputStyle, maxWidth: "140px" }}
                                    >
                                      <option value="">Issue</option>
                                      {ISSUE_OPTIONS.map((o) => (
                                        <option key={o} value={o}>{o}</option>
                                      ))}
                                    </select>
                                    <select
                                      value={row.year}
                                      onChange={(e) => updateIssue(idx, "year", e.target.value)}
                                      style={{ ...inputStyle, maxWidth: "80px" }}
                                    >
                                      {YEARS.map((y) => (
                                        <option key={y} value={y}>{y}</option>
                                      ))}
                                    </select>
                                    <select
                                      value={row.specialFeatures}
                                      onChange={(e) => updateIssue(idx, "specialFeatures", e.target.value)}
                                      style={{ ...inputStyle, maxWidth: "160px" }}
                                    >
                                      {SPECIAL_FEATURES.map((s) => (
                                        <option key={s} value={s}>{s}</option>
                                      ))}
                                    </select>
                                    {idx === proposalIssues.length - 1 && (
                                      <button
                                        type="button"
                                        onClick={addIssueRow}
                                        style={{
                                          padding: "0.25rem 0.5rem",
                                          background: "var(--glass)",
                                          border: "1px solid var(--glass-border)",
                                          borderRadius: "4px",
                                          color: "var(--gold-bright)",
                                          cursor: "pointer",
                                          fontSize: "1rem",
                                        }}
                                      >
                                        +
                                      </button>
                                    )}
                                  </div>
                                ))}
                              </div>
                              <label>
                                <span style={{ color: "var(--gold-dim)", fontSize: "0.8rem" }}>Geo?</span>
                                <select
                                  value={proposalGeo}
                                  onChange={(e) => setProposalGeo(e.target.value)}
                                  style={{ ...inputStyle, marginLeft: "8px", maxWidth: "80px" }}
                                >
                                  <option value="">—</option>
                                  <option value="Yes">Yes</option>
                                  <option value="No">No</option>
                                </select>
                              </label>
                              {proposalGeo === "Yes" && (
                                <label>
                                  <span style={{ color: "var(--gold-dim)", fontSize: "0.8rem" }}>Impressions</span>
                                  <input
                                    type="text"
                                    value={proposalImpressions}
                                    onChange={(e) => setProposalImpressions(e.target.value.replace(/\D/g, "").slice(0, 7))}
                                    placeholder="Up to 7 digits"
                                    style={{ ...inputStyle, marginLeft: "8px", maxWidth: "120px" }}
                                  />
                                </label>
                              )}
                            </div>
                          )}
                          <button
                            type="button"
                            onClick={() => submitActivity(c.id)}
                            disabled={submitting || !action}
                            style={{
                              padding: "0.5rem 1rem",
                              background: "var(--gold)",
                              color: "var(--bg)",
                              border: "none",
                              borderRadius: "6px",
                              fontWeight: 600,
                              cursor: submitting || !action ? "not-allowed" : "pointer",
                              alignSelf: "flex-start",
                            }}
                          >
                            {submitting ? "Saving…" : "Save activity"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
