/**
 * Fix only Organization Name column in the CSV using readableOrgName (with valid state abbrev check).
 * Run after scrape-and-fill-organizations.ts to correct names like "Alamo SA" -> "Alamosa".
 * Run: npx tsx scripts/fix-org-names-only.ts
 */

import * as fs from "fs";
import * as path from "path";

const DESKTOP = path.join(process.env.USERPROFILE || "", "OneDrive", "Desktop");
const CSV_PATH = path.join(DESKTOP, "organizations -All My Clients 03_02_26 - Sheet1.csv");

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') inQuotes = !inQuotes;
    else if (c === "," && !inQuotes) {
      result.push(field.trim());
      field = "";
    } else field += c;
  }
  result.push(field.trim());
  return result;
}

function escapeCsv(value: string): string {
  const s = String(value ?? "").trim();
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
  const raw = (currentName || "").trim() || website || "";
  let domain = "";
  try {
    const url = website?.startsWith("http") ? website : "https://" + website;
    domain = new URL(url).hostname.replace(/^www\./i, "").replace(/\.(com|org|net|gov|us)$/i, "");
  } catch {
    domain = raw.replace(/^https?:\/\//i, "").replace(/^www\./i, "").replace(/\.(com|org|net|gov|us)$/i, "");
  }
  let lower = domain.toLowerCase();
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
  const csvText = fs.readFileSync(CSV_PATH, "utf-8");
  const lines = csvText.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) {
    console.error("CSV has no data rows.");
    process.exit(1);
  }
  const header = parseCSVLine(lines[0]);
  const nameIdx = header.findIndex((h) => h.replace(/\*+$/, "").trim().toLowerCase().includes("organization name"));
  const websiteIdx = header.findIndex((h) => h.replace(/\*+$/, "").trim().toLowerCase().includes("website"));
  if (nameIdx === -1 || websiteIdx === -1) {
    console.error("Required columns not found.");
    process.exit(1);
  }
  const outLines: string[] = [lines[0]];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    const website = (values[websiteIdx] ?? "").trim();
    const newName = readableOrgName(values[nameIdx] ?? "", website);
    values[nameIdx] = newName;
    outLines.push(values.map(escapeCsv).join(","));
  }
  fs.writeFileSync(CSV_PATH, outLines.join("\r\n"), "utf-8");
  console.log("Done. Fixed organization names in", CSV_PATH);
}

main();
