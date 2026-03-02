"use client";

import Link from "next/link";
import { useEffect, useState, useCallback, useRef } from "react";

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
  businessName?: string | null;
  organizationName?: string | null;
};

const POLL_INTERVAL_MS = 4000;
const PAGE_SIZE = 20;

export default function AllActivityPage() {
  const [list, setList] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [purgeConfirm, setPurgeConfirm] = useState(false);
  const [purging, setPurging] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchFirstPage = useCallback(async () => {
    try {
      const res = await fetch("/api/activities?all=true&limit=20&offset=0");
      const data = await res.json();
      setList(Array.isArray(data) ? data : []);
      setHasMore(Array.isArray(data) && data.length >= PAGE_SIZE);
    } catch {
      setList([]);
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchActivities = useCallback(async () => {
    // Polling: refresh only the first page so new activity appears; keep older loaded items
    try {
      const res = await fetch("/api/activities?all=true&limit=20&offset=0");
      const data = await res.json();
      const fresh = Array.isArray(data) ? data : [];
      setList((prev) => (prev.length <= PAGE_SIZE ? fresh : [...fresh, ...prev.slice(PAGE_SIZE)]));
    } catch {
      // keep current list on poll error
    } finally {
      setLoading(false);
    }
  }, []);

  const loadOlder = useCallback(async () => {
    setLoadingOlder(true);
    try {
      const offset = list.length;
      const res = await fetch(`/api/activities?all=true&limit=20&offset=${offset}`);
      const data = await res.json();
      const next = Array.isArray(data) ? data : [];
      setList((prev) => [...prev, ...next]);
      setHasMore(next.length >= PAGE_SIZE);
    } catch {
      setHasMore(false);
    } finally {
      setLoadingOlder(false);
    }
  }, [list.length]);

  useEffect(() => {
    setLoading(true);
    fetchFirstPage();
  }, [fetchFirstPage]);

  useEffect(() => {
    intervalRef.current = setInterval(fetchActivities, POLL_INTERVAL_MS);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchActivities]);

  const formatDate = (s: string) => {
    try {
      const d = new Date(s);
      return d.toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" });
    } catch {
      return s;
    }
  };

  const companyName = (a: Activity) =>
    a.businessName ?? a.organizationName ?? a.companyDisplayId;
  const companyHref = (a: Activity) =>
    a.companyType === "org"
      ? `/all-organizations/${a.companyDisplayId}`
      : `/all-businesses/${a.companyDisplayId}`;

  const handlePurgeActivity = async () => {
    setPurging(true);
    try {
      const res = await fetch("/api/activities/purge-all", { method: "POST" });
      const data = await res.json();
      if (res.ok && data.success) {
        setPurgeConfirm(false);
        setList([]);
        setHasMore(false);
        await fetchFirstPage();
      }
    } finally {
      setPurging(false);
    }
  };

  return (
    <div style={{ width: "100%", padding: "1rem 0" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.75rem", marginBottom: "1rem" }}>
        <h1 style={{ color: "var(--gold-bright)", margin: 0 }}>All Activity</h1>
        {!loading && list.length > 0 && (
          <button
            type="button"
            onClick={() => setPurgeConfirm(true)}
            style={{
              padding: "0.5rem 0.75rem",
              background: "transparent",
              color: "#e57373",
              border: "1px solid #e57373",
              borderRadius: "6px",
              fontWeight: 600,
              cursor: "pointer",
              fontSize: "0.875rem",
            }}
          >
            Purge all activity
          </button>
        )}
      </div>
      {purgeConfirm && (
        <div
          style={{
            marginBottom: "1rem",
            padding: "1rem",
            background: "var(--glass)",
            border: "1px solid var(--glass-border)",
            borderRadius: "8px",
          }}
        >
          <p style={{ color: "var(--gold-bright)", marginBottom: "0.75rem" }}>
            Remove all activity records? This will clear Recent Activity on every organization and business profile. This cannot be undone.
          </p>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button
              type="button"
              onClick={() => setPurgeConfirm(false)}
              disabled={purging}
              style={{
                padding: "0.5rem 1rem",
                background: "var(--glass)",
                color: "var(--gold-bright)",
                border: "1px solid var(--glass-border)",
                borderRadius: "6px",
                cursor: purging ? "not-allowed" : "pointer",
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handlePurgeActivity}
              disabled={purging}
              style={{
                padding: "0.5rem 1rem",
                background: "#b71c1c",
                color: "#fff",
                border: "none",
                borderRadius: "6px",
                fontWeight: 600,
                cursor: purging ? "not-allowed" : "pointer",
              }}
            >
              {purging ? "Purging…" : "Purge all activity"}
            </button>
          </div>
        </div>
      )}
      <div
        style={{
          width: "100%",
          background: "var(--glass)",
          border: "1px solid var(--glass-border)",
          borderRadius: "8px",
          padding: "1rem 1.25rem",
        }}
      >
        <h3
          style={{
            color: "var(--gold-bright)",
            fontSize: "0.9rem",
            fontWeight: 600,
            marginBottom: "0.75rem",
            borderBottom: "1px solid var(--gold-dim)",
            paddingBottom: "0.5rem",
          }}
        >
          Recent Activity
        </h3>
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
                  }}
                >
                  <span style={config.style}>{config.label}{amountLabel}</span>
                  <div style={{ color: "var(--gold-dim)", marginTop: "2px" }}>
                    <Link
                      href={companyHref(a)}
                      style={{ color: "var(--gold-bright)", textDecoration: "none" }}
                    >
                      {companyName(a)}
                    </Link>
                  </div>
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
                    {[a.contactFirstName, a.contactLastName].filter(Boolean).join(" ") || "Contact"} · {a.username} · {formatDate(a.createdAt)}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        {!loading && list.length > 0 && hasMore && (
          <div style={{ marginTop: "1rem", textAlign: "center" }}>
            <button
              type="button"
              onClick={loadOlder}
              disabled={loadingOlder}
              style={{
                padding: "0.5rem 1rem",
                background: "var(--gold)",
                color: "var(--bg)",
                border: "none",
                borderRadius: "6px",
                fontWeight: 600,
                cursor: loadingOlder ? "not-allowed" : "pointer",
              }}
            >
              {loadingOlder ? "Loading…" : "Load older Activity"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
