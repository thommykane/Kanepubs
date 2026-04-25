/** Expects YYYY-MM-DD from client (sales deadline on proposal). */
export function parseProposalDeadlineIso(raw: string | undefined | null): Date | null {
  if (raw == null || typeof raw !== "string") return null;
  const s = raw.trim();
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (y < 2021 || mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  const dt = new Date(Date.UTC(y, mo - 1, d, 12, 0, 0));
  return isNaN(dt.getTime()) ? null : dt;
}
