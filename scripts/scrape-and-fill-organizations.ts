/**
 * Scrape organization websites for address/phone, look up county, and normalize names.
 * Updates the organizations CSV in place.
 *
 * Run: npx tsx scripts/scrape-and-fill-organizations.ts
 * Input/Output: Desktop/organizations -All My Clients 03_02_26 - Sheet1.csv
 */

import * as fs from "fs";
import * as path from "path";
import * as cheerio from "cheerio";

const DESKTOP = path.join(process.env.USERPROFILE || "", "OneDrive", "Desktop");
const CSV_PATH = path.join(DESKTOP, "organizations -All My Clients 03_02_26 - Sheet1.csv");
const DELAY_MS = 2000; // be polite to servers
const FETCH_TIMEOUT_MS = 15000;

interface ContactInfo {
  address: string;
  suite: string;
  city: string;
  state: string;
  zipCode: string;
  county: string;
  phone: string;
}

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

/** Make organization name readable: amanacolonies -> Amana Colonies, cityofaikensc -> City of Aiken SC */
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

function extractFromJsonLd(html: string): Partial<ContactInfo> {
  const out: Partial<ContactInfo> = {};
  const re = /<script[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    try {
      const json = m[1].trim();
      const data = JSON.parse(json);
      const items = Array.isArray(data) ? data : [data];
      for (const item of items) {
        const type = item["@type"];
        if (!type || (!String(type).includes("Organization") && !String(type).includes("LocalBusiness"))) continue;
        const addr = item.address;
        if (addr) {
          if (typeof addr === "string") {
            const match = addr.match(/([^,]+),\s*([^,]+),\s*([A-Z]{2})\s+(\d{5}(?:-\d{4})?)/);
            if (match) {
              out.address = out.address || match[1].trim();
              out.city = out.city || match[2].trim();
              out.state = out.state || match[3].trim();
              out.zipCode = out.zipCode || match[4].trim();
            } else out.address = out.address || addr.trim();
          } else {
            out.address = out.address || (addr.streetAddress || "").trim();
            out.suite = out.suite || (addr.addressLine2 || addr.streetAddress2 || "").trim();
            out.city = out.city || (addr.addressLocality || "").trim();
            out.state = out.state || (addr.addressRegion || "").trim();
            out.zipCode = out.zipCode || (addr.postalCode || "").trim();
          }
        }
        const tel = item.telephone;
        if (tel && typeof tel === "string") out.phone = out.phone || tel.replace(/\s+/g, " ").trim();
      }
    } catch {
      /* ignore parse errors */
    }
  }
  return out;
}

function extractFromHtml(html: string): Partial<ContactInfo> {
  const out = extractFromJsonLd(html);
  const $ = cheerio.load(html);

  const telLinks = $('a[href^="tel:"]');
  if (telLinks.length && !out.phone) {
    const first = telLinks.first().attr("href")?.replace(/^tel:/i, "").trim();
    if (first) out.phone = first.replace(/\s+/g, " ");
  }
  if (!out.phone) {
    const text = $("body").text();
    const telMatch = text.match(/(?:phone|tel|call)[:\s]*\(?(\d{3})\)?[\s\-.]?(\d{3})[\s\-.]?(\d{4})/i);
    if (telMatch) out.phone = `(${telMatch[1]}) ${telMatch[2]}-${telMatch[3]}`;
  }

  if (!out.address || !out.city) {
    const text = $("footer, .footer, .contact, #contact, address, .address").text();
    const addrMatch = text.match(/(\d+[\w\s.,]+(?:Street|St|Avenue|Ave|Blvd|Road|Rd|Drive|Dr|Way|Ln|P\.?O\.?\s*Box\s+\d+)[^,\n]*)/i);
    if (addrMatch) out.address = out.address || addrMatch[1].replace(/\s+/g, " ").trim();
    const cityStateZip = text.match(/([A-Za-z\s\.]+),\s*([A-Z]{2})\s+(\d{5}(?:-\d{4})?)/);
    if (cityStateZip) {
      out.city = out.city || cityStateZip[1].trim();
      out.state = out.state || cityStateZip[2].trim();
      out.zipCode = out.zipCode || cityStateZip[3].trim();
    }
  }
  return out;
}

async function fetchWithTimeout(url: string): Promise<string> {
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), FETCH_TIMEOUT_MS);
  const res = await fetch(url, {
    signal: c.signal,
    headers: { "User-Agent": "Mozilla/5.0 (compatible; KanePubs/1.0; +https://kanepubs.com)" },
    redirect: "follow",
  });
  clearTimeout(t);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

async function getCountyFromAddress(street: string, city: string, state: string, zip: string): Promise<string> {
  if (!city && !state && !zip) return "";
  const params = new URLSearchParams({
    street: (street || "").trim() || "1 Main St",
    city: (city || "").trim(),
    state: (state || "").trim(),
    zip: (zip || "").trim(),
    benchmark: "Public_AR_Current",
    vintage: "Current_Current",
    format: "json",
  });
  const url = "https://geocoding.geo.census.gov/geocoder/geographies/address?" + params.toString();
  try {
    const res = await fetch(url);
    const data = (await res.json()) as {
      result?: { addressMatches?: Array<{ geographies?: { Counties?: Array<{ NAME: string }> } }> };
    };
    const county = data?.result?.addressMatches?.[0]?.geographies?.Counties?.[0]?.NAME;
    return county || "";
  } catch {
    return "";
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  const csvText = fs.readFileSync(CSV_PATH, "utf-8");
  const lines = csvText.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) {
    console.error("CSV has no data rows.");
    process.exit(1);
  }

  const header = parseCSVLine(lines[0]);
  const col = (name: string) => {
    const n = name.toLowerCase();
    const i = header.findIndex((h) => h.replace(/\*+$/, "").trim().toLowerCase().includes(n));
    return i >= 0 ? i : -1;
  };
  const idx = {
    orgName: col("organization name"),
    address: col("organization address") >= 0 ? col("organization address") : col("address"),
    suite: col("suite"),
    city: col("city"),
    state: col("state"),
    zip: col("zip code") >= 0 ? col("zip code") : col("zip"),
    county: col("county"),
    phone: col("phone"),
    website: col("website"),
    type: col("organization type"),
    tags: col("tags"),
  };

  if (idx.orgName === -1 || idx.website === -1) {
    console.error("Required columns not found.");
    process.exit(1);
  }

  const outLines: string[] = [lines[0]];
  const total = lines.length - 1;

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    const row: string[] = [...values];
    while (row.length < header.length) row.push("");

    const currentName = (values[idx.orgName] ?? "").trim();
    const website = (values[idx.website] ?? "").trim();
    const newName = readableOrgName(currentName, website);
    row[idx.orgName] = newName;

    let contact: Partial<ContactInfo> = {};
    if (website) {
      try {
        const url = website.startsWith("http") ? website : "https://" + website;
        const html = await fetchWithTimeout(url);
        contact = extractFromHtml(html);
      } catch (e) {
        console.warn(`[${i}/${total}] ${website}: ${(e as Error).message}`);
      }
      await sleep(DELAY_MS);
    }

    const oneLine = (s: string) => String(s ?? "").replace(/[\r\n\t]+/g, " ").replace(/\s+/g, " ").trim();
    if (contact.address) row[idx.address] = oneLine(contact.address);
    if (contact.suite) row[idx.suite] = oneLine(contact.suite);
    if (contact.city) row[idx.city] = oneLine(contact.city);
    if (contact.state) row[idx.state] = oneLine(contact.state);
    if (contact.zipCode) row[idx.zip] = oneLine(contact.zipCode);
    if (contact.phone) row[idx.phone] = oneLine(contact.phone);

    if ((contact.city || contact.state || contact.zipCode) && !contact.county) {
      const county = await getCountyFromAddress(
        contact.address || "",
        contact.city || "",
        contact.state || "",
        contact.zipCode || ""
      );
      if (county) row[idx.county] = county;
      await sleep(300);
    } else if (contact.county) {
      row[idx.county] = contact.county;
    }

    if (idx.type >= 0 && !row[idx.type].trim()) row[idx.type] = "CVB (City)";
    outLines.push(row.map(escapeCsv).join(","));
    if (i % 10 === 0) console.log(`Processed ${i}/${total}...`);
  }

  fs.writeFileSync(CSV_PATH, outLines.join("\r\n"), "utf-8");
  console.log(`Done. Updated ${CSV_PATH}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
