/**
 * Matches ZY Organizations - Sheet4.csv contacts to all-organizations by Company Name -> Organization Name,
 * then writes Matched-Contacts.csv for the Contacts CSV uploader.
 *
 * Run: npx tsx scripts/match-contacts-csv.ts
 * Inputs (Desktop): ZY Organizations - Sheet4.csv, all-organizations-2026-03-01.csv
 * Output (Desktop): Matched-Contacts.csv
 */

import * as fs from "fs";
import * as path from "path";

const DESKTOP = path.join(process.env.USERPROFILE || "", "OneDrive", "Desktop");
const ZY_PATH = path.join(DESKTOP, "ZY Organizations - Sheet4.csv");
const ORGS_PATH = path.join(DESKTOP, "all-organizations-2026-03-01.csv");
const OUT_PATH = path.join(DESKTOP, "Matched-Contacts.csv");

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      inQuotes = !inQuotes;
    } else if (c === "," && !inQuotes) {
      result.push(field.trim());
      field = "";
    } else if ((c === "\n" || c === "\r") && !inQuotes) {
      break;
    } else {
      field += c;
    }
  }
  result.push(field.trim());
  return result;
}

function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[,.'"'']/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Best-effort match: exact normalized, then org name contains company, then company contains org. */
function findDisplayId(
  companyName: string,
  orgMap: Map<string, string>,
  orgList: { name: string; displayId: string }[]
): string | null {
  if (!companyName || !companyName.trim()) return null;
  const norm = normalizeName(companyName);
  if (orgMap.has(norm)) return orgMap.get(norm)!;

  for (const { name, displayId } of orgList) {
    const n = normalizeName(name);
    if (n === norm) return displayId;
    if (n.includes(norm) || norm.includes(n)) return displayId;
  }
  return null;
}

function escapeCsv(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n") || value.includes("\r")) {
    return '"' + value.replace(/"/g, '""') + '"';
  }
  return value;
}

function main() {
  const zyRaw = fs.readFileSync(ZY_PATH, "utf-8");
  const orgsRaw = fs.readFileSync(ORGS_PATH, "utf-8");

  const zyLines = zyRaw.split(/\r?\n/).filter((l) => l.trim());
  const orgLines = orgsRaw.split(/\r?\n/).filter((l) => l.trim());

  if (zyLines.length < 2 || orgLines.length < 2) {
    console.error("Missing header or data in one of the CSVs.");
    process.exit(1);
  }

  const zyHeaders = parseCSVLine(zyLines[0]).map((h) => h.trim().toLowerCase());
  const orgHeaders = parseCSVLine(orgLines[0]).map((h) => h.trim().toLowerCase());

  const orgNameIdx = orgHeaders.indexOf("organization name");
  const displayIdIdx = orgHeaders.indexOf("display id");
  if (orgNameIdx === -1 || displayIdIdx === -1) {
    console.error("all-organizations CSV must have 'Organization Name' and 'Display ID' columns.");
    process.exit(1);
  }

  const orgMap = new Map<string, string>();
  const orgList: { name: string; displayId: string }[] = [];
  for (let i = 1; i < orgLines.length; i++) {
    const cells = parseCSVLine(orgLines[i]);
    const name = (cells[orgNameIdx] ?? "").trim();
    const displayId = (cells[displayIdIdx] ?? "").trim();
    if (!name || !displayId) continue;
    const norm = normalizeName(name);
    if (!orgMap.has(norm)) orgMap.set(norm, displayId);
    orgList.push({ name, displayId });
  }

  const firstIdx = zyHeaders.indexOf("first name");
  const lastIdx = zyHeaders.indexOf("last name");
  const emailIdx = zyHeaders.indexOf("email address");
  const phoneIdx = zyHeaders.indexOf("phone number");
  const companyIdx = zyHeaders.indexOf("company name");
  if (
    firstIdx === -1 ||
    lastIdx === -1 ||
    emailIdx === -1 ||
    companyIdx === -1
  ) {
    console.error("ZY CSV must have First Name, Last Name, Email Address, Company Name.");
    process.exit(1);
  }

  const outHeader =
    "First Name*,Last Name*,Title*,Office Number*,Cell Number*,Email*,Business or Organization ID*";
  const outRows: string[] = [outHeader];

  let matched = 0;
  let skipped = 0;
  for (let i = 1; i < zyLines.length; i++) {
    const cells = parseCSVLine(zyLines[i]);
    const firstName = (cells[firstIdx] ?? "").trim();
    const lastName = (cells[lastIdx] ?? "").trim();
    const email = (cells[emailIdx] ?? "").trim();
    const phone = (cells[phoneIdx] ?? "").trim();
    const companyName = (cells[companyIdx] ?? "").trim();

    if (!companyName) {
      skipped++;
      continue;
    }

    const displayId = findDisplayId(companyName, orgMap, orgList);
    if (!displayId) {
      skipped++;
      continue;
    }

    matched++;
    const title = "";
    const officeNumber = phone || "";
    const cellNumber = "";
    outRows.push(
      [
        escapeCsv(firstName),
        escapeCsv(lastName),
        escapeCsv(title),
        escapeCsv(officeNumber),
        escapeCsv(cellNumber),
        escapeCsv(email),
        escapeCsv(displayId),
      ].join(",")
    );
  }

  fs.writeFileSync(OUT_PATH, outRows.join("\r\n"), "utf-8");
  console.log(`Wrote ${OUT_PATH}`);
  console.log(`Matched: ${matched}, Skipped (no org match or no company): ${skipped}`);
}

main();
