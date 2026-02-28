/**
 * US state (2-letter) to time zone for display.
 * Returns one of: Central, Mountain, Pacific, Alaska, Hawaii-Aleutian.
 * Eastern and other regions return null (not in sales panel list).
 */
const STATE_TO_TIMEZONE: Record<string, string> = {
  // Hawaii-Aleutian
  HI: "Hawaii-Aleutian Standard Time",
  // Alaska
  AK: "Alaska Standard Time",
  // Pacific
  CA: "Pacific Standard Time",
  NV: "Pacific Standard Time",
  OR: "Pacific Standard Time",
  WA: "Pacific Standard Time",
  // Mountain
  AZ: "Mountain Standard Time",
  CO: "Mountain Standard Time",
  ID: "Mountain Standard Time",
  MT: "Mountain Standard Time",
  NM: "Mountain Standard Time",
  UT: "Mountain Standard Time",
  WY: "Mountain Standard Time",
  // Central
  AL: "Central Standard Time",
  AR: "Central Standard Time",
  IL: "Central Standard Time",
  IA: "Central Standard Time",
  KS: "Central Standard Time",
  LA: "Central Standard Time",
  MN: "Central Standard Time",
  MS: "Central Standard Time",
  MO: "Central Standard Time",
  NE: "Central Standard Time",
  ND: "Central Standard Time",
  OK: "Central Standard Time",
  SD: "Central Standard Time",
  TN: "Central Standard Time",
  TX: "Central Standard Time",
  WI: "Central Standard Time",
  IN: "Central Standard Time",
  KY: "Central Standard Time",
  FL: "Central Standard Time",
  // Eastern and others not in list → return null
};

export function getTimezoneFromAddress(state?: string | null, _zipCode?: string | null): string | null {
  if (!state || typeof state !== "string") return null;
  const abbr = state.trim().toUpperCase();
  if (abbr.length === 2) {
    return STATE_TO_TIMEZONE[abbr] ?? null;
  }
  return null;
}
