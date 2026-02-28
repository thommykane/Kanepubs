import { db } from "@/lib/db";
import { businesses, organizations } from "@/lib/db/schema";

/**
 * Parses a display ID to its numeric part. Handles:
 * - Prefixed: A00000001, B00000002 → 1, 2
 * - Legacy numeric-only: 00000001 → 1
 */
function parseDisplayIdNumber(displayId: string | null): number | null {
  if (!displayId || typeof displayId !== "string") return null;
  const s = displayId.trim();
  if (/^[AB]\d{1,8}$/.test(s)) return parseInt(s.slice(1), 10);
  if (/^\d+$/.test(s)) return parseInt(s, 10);
  return null;
}

/**
 * Returns the current max numeric value across all business and organization display IDs.
 */
export async function getMaxDisplayNumber(): Promise<number> {
  const businessRows = await db.select({ displayId: businesses.displayId }).from(businesses);
  const orgRows = await db.select({ displayId: organizations.displayId }).from(organizations);
  let maxNum = 0;
  for (const r of [...businessRows, ...orgRows]) {
    const n = parseDisplayIdNumber(r.displayId);
    if (n != null && n > maxNum) maxNum = n;
  }
  return maxNum;
}

/**
 * Returns the next 8-digit display number (no prefix). Callers add "A" for organizations or "B" for businesses.
 */
export async function getNextDisplayId(): Promise<string> {
  const maxNum = await getMaxDisplayNumber();
  return String(maxNum + 1).padStart(8, "0");
}
