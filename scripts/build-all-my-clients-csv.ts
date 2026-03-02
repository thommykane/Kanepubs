/**
 * Build All-My-Clients.csv for Organizations uploader from unique email domains
 * in the Square invoices export.
 *
 * Run: npx tsx scripts/build-all-my-clients-csv.ts
 * Input: Downloads/invoices-export-20260302T1734.csv
 * Output: Desktop/All-My-Clients.csv
 */

import * as fs from "fs";
import * as path from "path";

const DOWNLOADS = path.join(process.env.USERPROFILE || "", "Downloads");
const INVOICES_PATH = path.join(DOWNLOADS, "invoices-export-20260302T1734.csv");
const DESKTOP = path.join(process.env.USERPROFILE || "", "OneDrive", "Desktop");
const OUT_PATH = path.join(DESKTOP, "All-My-Clients.csv");

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

function titleCaseWord(w: string): string {
  const s = w.trim();
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

/** Turn domain (e.g. cherokeechamber.com) into friendly name (e.g. Cherokee Chamber) */
function domainToFriendlyName(domain: string): string {
  const cleaned = domain
    .toLowerCase()
    .replace(/^www\./, "")
    .replace(/\.(com|org|net|gov|us|travel|tourism)$/i, "")
    .trim();
  if (!cleaned) return domain;
  const parts = cleaned.split(/[._-]/).filter(Boolean);
  if (parts.length >= 2) {
    const last = parts[parts.length - 1].toUpperCase();
    if (/^[A-Z]{2}$/.test(last)) {
      const name = parts.slice(0, -1).map(titleCaseWord).join(" ");
      return `${name} ${last}`.trim();
    }
  }
  const withSpaces = cleaned.replace(/([a-z])([A-Z])/g, "$1 $2");
  const suffixes = [
    "chamber", "cvb", "travel", "tourism", "ranch", "country", "county", "city",
    "creative", "agency", "communications", "relations", "studio", "media",
    "org", "gov", "com", "net",
  ];
  for (const suf of suffixes) {
    const re = new RegExp("(.+)" + suf + "$", "i");
    const m = withSpaces.match(re) || cleaned.match(re);
    if (m) {
      return (titleCaseWord(m[1].replace(/([a-z])([A-Z])/g, "$1 $2").trim()) + " " + titleCaseWord(suf)).trim();
    }
  }
  return titleCaseWord(withSpaces) || titleCaseWord(cleaned) || cleaned;
}

function escapeCsv(value: string): string {
  const s = String(value ?? "").trim();
  if (s.includes(",") || s.includes('"') || s.includes("\n") || s.includes("\r")) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

function main() {
  const text = fs.readFileSync(INVOICES_PATH, "utf-8");
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) {
    console.error("No data in invoices file.");
    process.exit(1);
  }

  const header = parseCSVLine(lines[0]);
  const emailIdx = header.findIndex((h) => h.toLowerCase().includes("customer email"));
  if (emailIdx === -1) {
    console.error("Customer Email column not found.");
    process.exit(1);
  }

  const domains = new Set<string>();
  for (let i = 1; i < lines.length; i++) {
    const row = parseCSVLine(lines[i]);
    const email = (row[emailIdx] ?? "").trim();
    if (email && email.includes("@")) {
      const domain = email.split("@")[1]?.toLowerCase().trim();
      if (domain) domains.add(domain);
    }
  }

  const sortedDomains = Array.from(domains).sort();
  const defaultOrgType = "CVB (City)";

  const csvHeader =
    "Organization Name*,Organization Address or PO Box*,Suite #,City*,State*,Zip Code*,County*,Phone*,Website*,Organization Type*,Tags";
  const rows: string[] = [csvHeader];

  for (const domain of sortedDomains) {
    const orgName = domainToFriendlyName(domain);
    const website = "https://" + domain;
    rows.push(
      [
        escapeCsv(orgName),
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        escapeCsv(website),
        escapeCsv(defaultOrgType),
        "",
      ].join(",")
    );
  }

  fs.writeFileSync(OUT_PATH, rows.join("\r\n"), "utf-8");
  console.log(`Wrote ${OUT_PATH}`);
  console.log(`Total rows: ${sortedDomains.length} unique clients`);
}

main();
