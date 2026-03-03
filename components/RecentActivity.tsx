"use client";

import { useEffect, useState, useCallback } from "react";

const ACTION_STYLES: Record<string, { label: string; style: React.CSSProperties }> = {
  no_answer: { label: "No Answer", style: { color: "#fff", fontWeight: 700 } },
  left_voicemail: { label: "Left Voicemail", style: { color: "#ff9800", fontWeight: 700 } },
  not_interested: { label: "Rejected: Not Interested", style: { color: "#e57373", fontWeight: 700 } },
  no_budget: { label: "Rejected: No Budget", style: { color: "#e57373", fontWeight: 700 } },
  blind_email: { label: "Sent Blind Email", style: { color: "#c4a35a", fontWeight: 700 } },
  scheduled_meeting: { label: "Scheduled Meeting", style: { color: "#00bcd4", fontWeight: 700 } },
  sent_proposal: { label: "Sent Proposal", style: { color: "#39ff14", fontWeight: 700 } },
  passed_on_proposal: { label: "Passed on Proposal", style: { color: "#e57373", fontWeight: 700 } },
  sent_io: { label: "Sent I/O", style: { color: "#00bcd4", fontWeight: 700 } },
  rejected_io: { label: "Rejected I/O", style: { color: "#e57373", fontWeight: 700 } },
  sold: { label: "SOLD", style: { color: "#39ff14", fontWeight: 700, fontSize: "1.1em" } },
};

type Activity = {
  id: string;
  companyType: string;
  companyDisplayId: string;
  contactId: string;
  username: string;
  actionType: string;
  notes: string | null;
  meetingAt: string | null;
  proposalData: Record<string, unknown> | null;
  createdAt: string;
  contactFirstName?: string | null;
  contactLastName?: string | null;
};

type Props = {
  companyType: string;
  companyDisplayId: string;
  refreshTrigger?: number;
};

export default function RecentActivity({ companyType, companyDisplayId, refreshTrigger = 0 }: Props) {
  const [list, setList] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);

  const fetchActivities = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/activities?companyType=${encodeURIComponent(companyType)}&companyDisplayId=${encodeURIComponent(companyDisplayId)}`
      );
      const data = await res.json();
      setList(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  }, [companyType, companyDisplayId]);

  useEffect(() => {
    setLoading(true);
    fetchActivities();
  }, [fetchActivities, refreshTrigger]);

  const formatDate = (s: string) => {
    try {
      const d = new Date(s);
      return d.toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" });
    } catch {
      return s;
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.size === 0) return;
    setDeleting(true);
    try {
      const res = await fetch("/api/activities", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selectedIds) }),
      });
      if (res.ok) {
        setSelectMode(false);
        setSelectedIds(new Set());
        await fetchActivities();
      } else {
        const data = await res.json();
        alert(data?.error ?? "Failed to delete");
      }
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div
      style={{
        width: "100%",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "0.5rem",
          marginBottom: "0.75rem",
          borderBottom: "1px solid var(--gold-dim)",
          paddingBottom: "0.5rem",
        }}
      >
        <h3
          style={{
            color: "var(--gold-bright)",
            fontSize: "0.9rem",
            fontWeight: 600,
            margin: 0,
          }}
        >
          Recent Activity
        </h3>
        <button
          type="button"
          onClick={() => {
            setSelectMode((m) => !m);
            if (selectMode) setSelectedIds(new Set());
          }}
          style={{
            padding: "0.35rem 0.6rem",
            fontSize: "0.8rem",
            background: selectMode ? "var(--glass)" : "transparent",
            border: "1px solid var(--glass-border)",
            borderRadius: "6px",
            color: "var(--gold-bright)",
            cursor: "pointer",
            fontWeight: 600,
          }}
        >
          {selectMode ? "Cancel" : "Select Activity"}
        </button>
      </div>
      {selectMode && list.length > 0 && selectedIds.size > 0 && (
        <div style={{ marginBottom: "0.5rem" }}>
          <button
            type="button"
            onClick={handleDeleteSelected}
            disabled={deleting}
            style={{
              padding: "0.35rem 0.6rem",
              fontSize: "0.8rem",
              background: "#b71c1c",
              border: "none",
              borderRadius: "6px",
              color: "#fff",
              cursor: deleting ? "not-allowed" : "pointer",
              fontWeight: 600,
            }}
          >
            {deleting ? "Deleting…" : `Delete selected (${selectedIds.size})`}
          </button>
        </div>
      )}
      {loading ? (
        <p style={{ color: "var(--gold-dim)", fontSize: "0.875rem" }}>Loading…</p>
      ) : list.length === 0 ? (
        <p style={{ color: "var(--gold-dim)", fontSize: "0.875rem" }}>No activity yet.</p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {list.map((a) => {
            const config = ACTION_STYLES[a.actionType] ?? {
              label: a.actionType,
              style: { color: "var(--gold-bright)" },
            };
            const amountVal = a.actionType === "sold" && a.proposalData != null && typeof a.proposalData === "object" && a.proposalData.amount != null
              ? Number(a.proposalData.amount)
              : null;
            const amountLabel = amountVal != null && !Number.isNaN(amountVal)
              ? ` $${amountVal.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
              : "";
            return (
              <li
                key={a.id}
                style={{
                  marginBottom: "0.75rem",
                  paddingBottom: "0.75rem",
                  borderBottom: "1px solid rgba(255,255,255,0.06)",
                  fontSize: "0.8rem",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "0.5rem",
                }}
              >
                {selectMode && (
                  <label style={{ flexShrink: 0, cursor: "pointer", marginTop: "2px" }}>
                    <input
                      type="checkbox"
                      checked={selectedIds.has(a.id)}
                      onChange={() => toggleSelect(a.id)}
                      style={{ width: "16px", height: "16px", cursor: "pointer" }}
                    />
                  </label>
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                <span style={config.style}>{config.label}{amountLabel}</span>
                {a.actionType === "scheduled_meeting" && a.meetingAt && (
                  <div style={{ color: "#fff", marginTop: "2px" }}>
                    {formatDate(a.meetingAt)}
                  </div>
                )}
                {a.actionType === "sent_proposal" && a.proposalData != null && typeof a.proposalData === "object"
                  ? (
                      <div style={{ color: "var(--gold-dim)", marginTop: "4px", fontSize: "0.75rem" }}>
                        {String(JSON.stringify(a.proposalData))}
                      </div>
                    )
                  : null}
                {a.actionType !== "scheduled_meeting" && a.actionType !== "sent_proposal" && a.notes && (
                  <div style={{ color: "var(--gold-dim)", marginTop: "2px" }}>{a.notes}</div>
                )}
                <div style={{ color: "var(--gold-dim)", marginTop: "4px" }}>
                  {[a.contactFirstName, a.contactLastName].filter(Boolean).join(" ") || "Contact"} · {a.username}
                  {a.proposalData != null && typeof a.proposalData === "object" && (a.proposalData as { clientDisplayId?: string }).clientDisplayId && (
                    <> · re: {(a.proposalData as { clientDisplayId: string }).clientDisplayId}</>
                  )}
                  {" · "}{formatDate(a.createdAt)}
                </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
