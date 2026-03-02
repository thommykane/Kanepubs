/**
 * 1) Read CSV with proper quoted-newline handling.
 * 2) Sanitize every cell: replace newlines/tabs with space, collapse spaces, trim.
 * 3) Fix organization names using readableOrgName (valid state abbrev only).
 * 4) Write back one line per row (no newlines in cells).
 *
 * Run: npx tsx scripts/sanitize-and-fix-org-csv.ts
 */

import * as fs from "fs";
import * as path from "path";

const DESKTOP = path.join(process.env.USERPROFILE || "", "OneDrive", "Desktop");
const CSV_PATH = path.join(DESKTOP, "organizations -All My Clients 03_02_26 - Sheet1.csv");

function parseCSVWithQuotedNewlines(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    const next = text[i + 1];
    if (inQuotes) {
      if (c === '"') {
        if (next === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else {
      if (c === '"') {
        inQuotes = true;
      } else if (c === ",") {
        row.push(field);
        field = "";
      } else if (c === "\n" || c === "\r") {
        if (c === "\r" && next === "\n") i++;
        row.push(field);
        field = "";
        rows.push(row);
        row = [];
      } else {
        field += c;
      }
    }
  }
  row.push(field);
  rows.push(row);
  return rows;
}

function sanitize(s: string): string {
  return String(s ?? "")
    .replace(/[\r\n\t]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Remove copyright, footer, and marketing junk from address/suite/city fields. */
function cleanAddressField(s: string): string {
  let t = sanitize(s);
  if (!t) return "";

  const stripPatterns: RegExp[] = [
    /\d{4}\s*,?\s*[\w\s.]+\s+[Aa]ll\s+rights\s+reserved[^.]*\.?/gi,
    /\d{4}\s+[\w\s&]+\s+(?:dba|\.)\s*[\w\s.]+\s+[Aa]ll\s+rights\s+reserved[^.]*\.?/gi,
    /\d{4}\s+[\w\s]+dba\s+[\w\s.]+\s*[Aa]ll\s+rights\s+reserved[^.]*\.?/gi,
    /We\s+value\s+your\s+privacy[^.]*\.?/gi,
    /This\s+website\s+uses\s+cookies[^.]*\.?/gi,
    /By\s+clicking\s+["']?accept\s+all["']?[^.]*\.?/gi,
    /enhance\s+your\s+browsing\s+experience[^.]*\.?/gi,
    /analyze\s+site\s+usage[^.]*\.?/gi,
    /assist\s+in\s+our\s+marketing[^.]*\.?/gi,
    /Request\s+Visitor\s+Guide[^.]*\.?/gi,
    /View\s+Digital\s+Guide[^.]*\.?/gi,
    /Request\s+Guide[^.]*\.?/gi,
    /Visitor\s+Guide\s+Request[^.]*\.?/gi,
    /Things\s+to\s+do\s+Events\s+Dining\s+Shopping\s+Accommodations[^.]*\.?/gi,
    /plan\s+your\s+visit\s+blog\s+business[^.]*\.?/gi,
    /downtown\s+cameras\s+contact[^.]*\.?/gi,
    /Privacy\s+Statement[^.]*\.?/gi,
    /Twitter\s+LinkedIn\s+Facebook\s+Instagram\s*\.?/gi,
    /Phone:\s*\d[\d\s\-\.\(\)]+(?:Fax:\s*\d[\d\s\-\.\(\)]+)?/gi,
    /Fax:\s*\d[\d\s\-\.\(\)]+/gi,
    /Request\s*["'}\]]*\s*['"]?\s*\}\}/g,
    /\d+\s+days\s+of\s+the\s+year[^.]*\.?/gi,
    /making\s+us\s+a\s+great\s+stop[^.]*\.?/gi,
    /every\s+season[^.]*\.?/gi,
    /VISIT\s+[\w\s]+\s+COUNTY\s+[\d\w\s.]*/g,
    /Office\s+Address:\s*/gi,
    /Chamber\s+Info\s+Travel\s+Professionals/gi,
    /Community\s+Outreach\s+Building/gi,
    /Located\s+in[^.]*\.?/gi,
    /next\s+to\s+the[^.]*\.?/gi,
  ];

  for (const re of stripPatterns) {
    t = t.replace(re, " ");
  }

  t = t.replace(/\s+/g, " ").trim();

  const garbageStarts = /^(\d{4}\s*,?\s*|Request\s*|20\s*Request|Board\s*\}\}'?|Division\s+St\.?,?\s*Ste\.?\d*)/i;
  if (garbageStarts.test(t) && t.length > 40) {
    const addrMatch = t.match(/(\d+[\w\s.,]+(?:Street|St|Avenue|Ave|Blvd|Road|Rd|Drive|Dr|Way|Ln|Parkway|Pkwy|Highway|Hwy|Main|State\s+Hwy)[^.]*?)(?:\s+\d{5}|$)/i)
      || t.match(/(\d+\s+[\w\s]+(?:Street|St|Avenue|Ave|Blvd|Road|Rd|Drive|Dr)[^.]*?)(?:\s+[A-Z]{2}\s+\d{5}|$)/i)
      || t.match(/(\d+\s+[\w\s.,]+)(?=,?\s*[A-Z]{2}\s+\d{5})/);
    if (addrMatch) t = addrMatch[1].replace(/\s+/g, " ").trim();
  }

  if (/^[\d\s,.\-]+$/.test(t) && t.length < 5) return "";
  if (/^(Request|Guide|View|Privacy|Twitter|Facebook|Instagram|LinkedIn)\b/i.test(t) && t.length < 80) return "";
  if (/^20\s*['"]?\s*$/.test(t) || /^20\s*Request\s*\}\}/.test(t)) return "";

  t = t.replace(/\s+/g, " ").trim();
  if (t.length > 200) t = t.slice(0, 200).replace(/\s+\S*$/, "");
  return t;
}

function escapeCsv(value: string): string {
  const s = sanitize(value);
  if (s.includes(",") || s.includes('"') || s.includes("\n") || s.includes("\r")) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

function titleCaseWord(w: string): string {
  const s = w.trim();
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

function readableOrgName(currentName: string, website: string): string {
  const cur = (currentName || "").trim();
  if (cur && /^[A-Z]/.test(cur) && cur.includes(" ") && cur.length > 3 && !/^[A-Z][a-z]+ [A-Z]{2}$/.test(cur)) return cur;
  const raw = cur || website || "";
  let domain = "";
  try {
    const url = website?.startsWith("http") ? website : "https://" + website;
    domain = new URL(url).hostname.replace(/^www\./i, "").replace(/\.(com|org|net|gov|us)$/i, "");
  } catch {
    domain = raw.replace(/^https?:\/\//i, "").replace(/^www\./i, "").replace(/\.(com|org|net|gov|us)$/i, "");
  }
  let lower = domain.toLowerCase();
  if (!lower.includes(".")) lower = lower.replace(/(com|org|net|gov|us)$/i, "");
  lower = lower.replace(/[._-]/g, " ");
  const rawNoSpaces = lower.replace(/\s/g, "");
  const prefixes: [RegExp, string][] = [
    [/^city\s*of\s+/i, "City of "],
    [/^town\s*of\s+/i, "Town of "],
    [/^cityof/i, "City of "],
    [/^townof/i, "Town of "],
    [/^visit\s+/i, "Visit "],
    [/^tour\s+/i, "Tour "],
    [/^experience\s+/i, "Experience "],
    [/^explore\s+/i, "Explore "],
    [/^destination\s+/i, "Destination "],
    [/^discover\s+/i, "Discover "],
    [/^go\s+/i, "Go "],
    [/^connect\s+/i, "Connect "],
    [/^travel\s+/i, "Travel "],
    [/^the\s+/i, "The "],
  ];
  const suffixes = [
    "chamber", "cvb", "travel", "tourism", "ranch", "country", "county", "city",
    "creative", "agency", "communications", "studio", "media", "colonies",
    "cowboy", "capital", "mountains", "valley", "lake", "river", "hills",
    "coast", "islands", "shores", "manitee", "noble", "carter", "hardin",
    "peachtree", "potter", "tioga", "gettysburg", "yellowstone", "elgin",
    "hocking", "lawrence", "livingston", "odessa", "galesburg", "bend",
    "galena", "grantspass", "costamesa", "juneau", "medford", "vancouver",
    "venture", "watertown", "yakima", "bangor", "fairfield", "frisco",
    "gilroy", "hendersonville", "lakeville", "lodi", "macon", "nacogdoches",
    "oxnard", "redwoods", "rochester", "sheboygan", "sitka", "stcloud",
    "trivalley", "daltonga", "dublinga", "eatonton", "billings", "boerne",
    "buckhannon", "canton", "carson", "casper", "greatfalls", "hagerstown",
    "huntington", "kenosha", "kinston", "midland", "natchez",
  ];
  let name = lower;
  let prefix = "";
  for (const [re, p] of prefixes) {
    if (re.test(name) || (rawNoSpaces && re.test(rawNoSpaces))) {
      name = name.replace(re, "").trim() || rawNoSpaces.replace(re, "").trim();
      prefix = p;
      break;
    }
  }
  const noSpaces = name.replace(/\s/g, "");
  for (const suf of suffixes) {
    const withSpacesRe = new RegExp("(.+)\\s+" + suf + "\\s*$", "i");
    const noSpacesRe = new RegExp("(.+)" + suf + "$", "i");
    const m = name.match(withSpacesRe) || noSpaces.match(noSpacesRe);
    if (m) {
      const before = m[1].replace(/([a-z])([A-Z])/g, "$1 $2").trim();
      const words = before.split(/\s+/).filter(Boolean).map(titleCaseWord);
      const suffixPart = titleCaseWord(suf);
      const mainPart = words.join(" ");
      return (prefix + (mainPart ? mainPart + " " : "") + suffixPart).trim() || (prefix + suffixPart);
    }
  }
  const US_STATE_ABBREVS = new Set("AL,AK,AZ,AR,CA,CO,CT,DE,FL,GA,HI,ID,IL,IN,IA,KS,KY,LA,ME,MD,MA,MI,MN,MS,MO,MT,NE,NV,NH,NJ,NM,NY,NC,ND,OH,OK,OR,PA,RI,SC,SD,TN,TX,UT,VT,VA,WA,WV,WI,WY,DC".split(","));
  const twoLetterSpace = name.match(/\s+([a-z]{2})\s*$/i);
  const twoLetterNoSpace = noSpaces.match(/^(.+)([a-z]{2})$/i);
  const stateCode = twoLetterSpace?.[1] ?? (twoLetterNoSpace && twoLetterNoSpace[2].length === 2 ? twoLetterNoSpace[2] : null);
  const beforeState = twoLetterSpace ? name.replace(/\s+[a-z]{2}\s*$/i, "").trim() : (twoLetterNoSpace ? twoLetterNoSpace[1] : "");
  const isState = stateCode && US_STATE_ABBREVS.has(stateCode.toUpperCase());
  if (isState && (beforeState || prefix)) {
    const state = stateCode!.toUpperCase();
    const words = beforeState.split(/\s+/).filter(Boolean).map(titleCaseWord);
    return (prefix + words.join(" ") + " " + state).trim();
  }
  const words = name.split(/\s+/).filter(Boolean).map((w) => titleCaseWord(w));
  return (prefix + words.join(" ")).trim() || currentName;
}

function main() {
  const text = fs.readFileSync(CSV_PATH, "utf-8");
  const rows = parseCSVWithQuotedNewlines(text);
  if (rows.length < 2) {
    console.error("CSV has no data rows.");
    process.exit(1);
  }
  const header = rows[0];
  const nameIdx = header.findIndex((h) => h.replace(/\*+$/, "").trim().toLowerCase().includes("organization name"));
  const websiteIdx = header.findIndex((h) => h.replace(/\*+$/, "").trim().toLowerCase().includes("website"));
  if (nameIdx === -1 || websiteIdx === -1) {
    console.error("Required columns not found.");
    process.exit(1);
  }

  const numCols = header.length;
  const addressIdx = header.findIndex((h) => h.replace(/\*+$/, "").trim().toLowerCase().includes("address"));
  const cityIdx = header.findIndex((h) => h.replace(/\*+$/, "").trim().toLowerCase().includes("city"));
  const stateIdx = header.findIndex((h) => h.replace(/\*+$/, "").trim().toLowerCase().includes("state"));
  const zipIdx = header.findIndex((h) => h.replace(/\*+$/, "").trim().toLowerCase().includes("zip"));
  const countyIdx = header.findIndex((h) => h.replace(/\*+$/, "").trim().toLowerCase().includes("county"));
  const phoneIdx = header.findIndex((h) => h.replace(/\*+$/, "").trim().toLowerCase().includes("phone"));
  const typeIdx = header.findIndex((h) => h.replace(/\*+$/, "").trim().toLowerCase().includes("organization type"));
  const suiteIdx = header.findIndex((h) => h.replace(/\*+$/, "").trim().toLowerCase().includes("suite"));

  const merged: string[][] = [header];
  let i = 1;
  while (i < rows.length) {
    let row = rows[i];
    let padded: string[] = row.length >= numCols ? row.slice(0, numCols) : [...row];
    while (padded.length < numCols) padded.push("");

    const nextRow = rows[i + 1];
    const firstCol = nextRow?.[0] ?? "";
    const looksLikeContinuation =
      nextRow &&
      firstCol.includes("https") &&
      /[A-Za-z\s]+,[A-Za-z]{2},\d{5}/.test(firstCol) &&
      !padded[websiteIdx]?.trim();

    if (looksLikeContinuation) {
      const parts = firstCol.split(",").map((p) => sanitize(p));
      if (parts.length >= 6) {
        if (!padded[cityIdx]?.trim()) padded[cityIdx] = parts[0] ?? "";
        if (!padded[stateIdx]?.trim()) padded[stateIdx] = (parts[1] ?? "").toUpperCase();
        if (!padded[zipIdx]?.trim()) padded[zipIdx] = parts[2] ?? "";
        if (!padded[countyIdx]?.trim()) padded[countyIdx] = (parts[3] ?? "").replace(/\b\w/g, (c) => c.toUpperCase());
        if (!padded[phoneIdx]?.trim()) padded[phoneIdx] = parts[4] ?? "";
        if (!padded[websiteIdx]?.trim()) {
          let w = (parts[5] ?? "").replace(/\s/g, "");
          try {
            const u = new URL(w.startsWith("http") ? w : "https://" + w);
            padded[websiteIdx] = u.origin.toLowerCase() + u.pathname + u.search;
          } catch {
            padded[websiteIdx] = w;
          }
        }
        if (!padded[typeIdx]?.trim() && parts[6]) padded[typeIdx] = "CVB (City)";
      }
      i += 2;
    } else {
      i += 1;
    }

    let website = sanitize(padded[websiteIdx] ?? "");
    try {
      let urlStr = website.startsWith("http") ? website : "https://" + website;
      const u = new URL(urlStr);
      let host = u.hostname.toLowerCase();
      if (!host.includes(".") && /^(.*)(com|org|net|gov|us)$/i.test(host)) {
        host = host.replace(/^(.*)(com|org|net|gov|us)$/i, "$1.$2");
        urlStr = u.protocol + "//" + host + (u.port ? ":" + u.port : "") + u.pathname + u.search;
      }
      website = new URL(urlStr).origin.toLowerCase() + new URL(urlStr).pathname + new URL(urlStr).search;
      padded[websiteIdx] = website;
    } catch {
      /* keep as-is */
    }
    const newName = readableOrgName(sanitize(padded[nameIdx] ?? ""), website);
    padded[nameIdx] = newName;
    const sanitized = padded.map((cell, colIdx) => {
      const base = sanitize(cell);
      if (colIdx === addressIdx || colIdx === suiteIdx || colIdx === cityIdx) return cleanAddressField(base);
      return base;
    });
    merged.push(sanitized);
  }
  const outRows = merged;

  const outText = outRows.map((row) => row.map(escapeCsv).join(",")).join("\r\n");
  const outPath = CSV_PATH.replace(/\.csv$/i, "-cleaned.csv");
  fs.writeFileSync(outPath, outText, "utf-8");
  console.log("Done. Sanitized and fixed", outRows.length - 1, "rows.");
  console.log("Saved to:", outPath);
  try {
    fs.writeFileSync(CSV_PATH, outText, "utf-8");
    console.log("Also updated original:", CSV_PATH);
  } catch (e) {
    console.warn("Original file is open or locked; use the -cleaned.csv file.");
  }
}

main();
