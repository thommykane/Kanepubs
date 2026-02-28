/**
 * Normalizes a website URL for storage and display.
 * Accepts: example.com, www.example.com, http://example.com, https://www.example.com, https://example.com
 * Returns: https://example.com (https, no www)
 */
export function normalizeWebsiteUrl(input: string | null | undefined): string | null {
  if (input == null || typeof input !== "string") return null;
  const s = input.trim();
  if (!s) return null;
  let url = s;
  if (!/^https?:\/\//i.test(url)) url = "https://" + url;
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./i, "");
    const path = u.pathname === "/" ? "" : u.pathname + u.search + u.hash;
    return "https://" + host + path;
  } catch {
    return s;
  }
}
