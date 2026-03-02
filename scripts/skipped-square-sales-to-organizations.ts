/**
 * From square-sales that did NOT match Matched-Contacts, extract unique organizations
 * and write a CSV for the All Organizations uploader (with TBD placeholders for missing fields).
 *
 * Run: npx tsx scripts/skipped-square-sales-to-organizations.ts
 * Inputs (Desktop): square-sales.csv, Matched-Contacts.csv
 * Output (Desktop): skipped-organizations-for-upload.csv
 */

import * as fs from "fs";
import * as path from "path";

const DESKTOP = path.join(process.env.USERPROFILE || "", "OneDrive", "Desktop");
const SQUARE_PATH = path.join(DESKTOP, "square-sales.csv");
const CONTACTS_PATH = path.join(DESKTOP, "Matched-Contacts.csv");
const OUT_PATH = path.join(DESKTOP, "skipped-organizations-for-upload.csv");

const ORG_TYPES = [
  "CVB (City)",
  "CVB (County)",
  "CVB (State)",
  "DMO (City)",
  "DMO (County)",
  "DMO (State)",
  "Chamber (City)",
  "Chamber (County)",
  "Chamber (State)",
  "City (Government)",
  "County (Government)",
  "State (Government)",
];

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

function escapeCsv(value: string): string {
  const s = String(value ?? "").trim();
  if (s.includes(",") || s.includes('"') || s.includes("\n") || s.includes("\r")) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

/** Derive organization name from invoice title (e.g. "Visit Beaufort, Port Royal & Sea - Food & Travel" -> "Visit Beaufort, Port Royal & Sea") */
function orgNameFromInvoiceTitle(title: string): string | null {
  const t = title.trim();
  if (!t) return null;
  const segments = t.split(/\s*[-–—]\s*/).map((s) => s.trim()).filter(Boolean);
  const skipPatterns = [
    /^Food\s*&\s*Travel/i,
    /^Holiday\s*Edition/i,
    /^\d+\s*Copies/i,
    /^\(\d+\s*Case\)/i,
    /^Spring\s*\d{4}$/i,
    /^Winter\s*\d{4}$/i,
    /^Fall\s*\d{4}$/i,
    /^Summer\s*\d{4}$/i,
    /^Spring\s*$/i,
    /^Winter\s*$/i,
    /^Fall\s*$/i,
    /^Summer\s*$/i,
    /^Pre-Order$/i,
    /^Food\s*&\s*Travel\s*Magazine/i,
  ];
  const good: string[] = [];
  for (const seg of segments) {
    if (skipPatterns.some((p) => p.test(seg))) continue;
    if (seg.length < 3) continue;
    good.push(seg);
  }
  if (good.length === 0) return null;
  const prefer = good.find(
    (s) =>
      /Visit\s+/i.test(s) ||
      /City\s+of/i.test(s) ||
      /CVB/i.test(s) ||
      /Chamber/i.test(s) ||
      /County/i.test(s) ||
      /Parish/i.test(s) ||
      /DMO/i.test(s) ||
      /,\s*(TX|CA|OR|FL|GA|NC|SC|VA|MO|KY|TN|LA|AZ|NM|MT|WA|IL|OH|WV|MD|NJ|NY|MA|MI|CO|NV|AR|MS|AL|OK|KS|NE|SD|ND|WY|ID|UT|AK|HI|IN|MN|WI|RI|CT|NH|VT|ME|DE|DC)/i.test(s)
  );
  return prefer ?? good[0];
}

/** Fallback org name from email domain (e.g. beaufortsc.org -> Beaufort SC, chincoteaguechamber.org -> Chincoteague Chamber) */
function orgNameFromEmail(email: string): string {
  const match = String(email).match(/@([^@]+)\.(org|gov|com|net|us|travel|tourism)/i);
  if (!match) return "TBD";
  let cleaned = match[1].replace(/^www\./, "").replace(/\.(org|gov|com|net|us)$/i, "");
  const parts = cleaned.split(/[._-]/).filter(Boolean);
  if (parts.length >= 2) {
    const last = parts[parts.length - 1].toUpperCase();
    if (/^[A-Z]{2}$/.test(last)) {
      const name = parts.slice(0, -1).map((p) => titleCaseWord(p)).join(" ");
      return `${name} ${last}`;
    }
  }
  cleaned = cleaned.replace(/([a-z])([A-Z])/g, "$1 $2");
  const suffixes = ["chamber", "cvb", "travel", "tourism", "org", "gov", "com", "ranch", "country", "county", "city"];
  for (const suf of suffixes) {
    const re = new RegExp("(.+)" + suf + "$", "i");
    const m = cleaned.match(re);
    if (m) {
      return (titleCaseWord(m[1]) + " " + titleCaseWord(suf)).trim();
    }
  }
  return cleaned.split(/\s+/).map(titleCaseWord).join(" ").trim() || cleaned;
}
function titleCaseWord(w: string): string {
  const s = w.trim();
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

function main() {
  const contactsRaw = fs.readFileSync(CONTACTS_PATH, "utf-8");
  const squareRaw = fs.readFileSync(SQUARE_PATH, "utf-8");

  const contactLines = contactsRaw.split(/\r?\n/).filter((l) => l.trim());
  const squareLines = squareRaw.split(/\r?\n/).filter((l) => l.trim());

  if (contactLines.length < 2 || squareLines.length < 2) {
    console.error("Missing header or data in one of the CSVs.");
    process.exit(1);
  }

  const contactHeaders = parseCSVLine(contactLines[0]).map((h) => h.replace(/\*+$/, "").trim().toLowerCase());
  const squareHeaders = parseCSVLine(squareLines[0]).map((h) => h.trim().toLowerCase());

  const firstIdx = contactHeaders.indexOf("first name");
  const lastIdx = contactHeaders.indexOf("last name");
  const emailIdx = contactHeaders.indexOf("email");
  const businessIdIdx = contactHeaders.indexOf("business or organization id");
  if (firstIdx === -1 || lastIdx === -1 || businessIdIdx === -1) {
    console.error("Matched-Contacts must have First Name, Last Name, Business or Organization ID.");
    process.exit(1);
  }

  const byEmail = new Map<string, boolean>();
  const byName = new Map<string, boolean>();
  for (let i = 1; i < contactLines.length; i++) {
    const cells = parseCSVLine(contactLines[i]);
    const firstName = (cells[firstIdx] ?? "").trim();
    const lastName = (cells[lastIdx] ?? "").trim();
    const email = (cells[emailIdx] ?? "").trim().toLowerCase();
    if (email) byEmail.set(email, true);
    const nameKey = `${firstName} ${lastName}`.toLowerCase().replace(/\s+/g, " ").trim();
    if (nameKey) byName.set(nameKey, true);
  }

  const saleDateIdx = squareHeaders.findIndex((h) => h.includes("sale date") || h === "date");
  const customerNameIdx = squareHeaders.findIndex((h) => h.includes("customer name") || h === "customer name");
  const customerEmailIdx = squareHeaders.findIndex((h) => h.includes("customer email") || h === "email");
  const customerPhoneIdx = squareHeaders.findIndex((h) => h.includes("customer phone") || h === "phone");
  const invoiceTitleIdx = squareHeaders.findIndex((h) => h.includes("invoice title") || h.includes("title"));
  const amountIdx = squareHeaders.findIndex((h) => h.includes("amount") || h === " amount");

  if (customerNameIdx === -1 || amountIdx === -1) {
    console.error("Square CSV must have Customer Name and Amount.");
    process.exit(1);
  }

  const skippedRows: { customerName: string; customerEmail: string; customerPhone: string; invoiceTitle: string }[] = [];
  for (let i = 1; i < squareLines.length; i++) {
    const cells = parseCSVLine(squareLines[i]);
    const customerName = (cells[customerNameIdx] ?? "").trim();
    const customerEmail = (cells[customerEmailIdx] ?? "").trim().toLowerCase();
    const amountRaw = (cells[amountIdx] ?? "").trim();
    if (!amountRaw) continue;

    let matched = customerEmail ? byEmail.has(customerEmail) : false;
    if (!matched && customerName) {
      const parts = customerName.split(/\s+/);
      const first = parts[0] ?? "";
      const last = parts.slice(1).join(" ").trim();
      const nameKey = `${first} ${last}`.toLowerCase().replace(/\s+/g, " ").trim();
      matched = nameKey ? byName.has(nameKey) : false;
      if (!matched && parts.length >= 2) {
        const lastPart = parts[parts.length - 1];
        const firstPart = parts.slice(0, -1).join(" ");
        const altKey = `${firstPart} ${lastPart}`.toLowerCase().replace(/\s+/g, " ").trim();
        matched = byName.has(altKey);
      }
    }
    if (matched) continue;

    const customerPhone = (cells[customerPhoneIdx] ?? "").trim();
    const invoiceTitle = (cells[invoiceTitleIdx] ?? "").trim();
    skippedRows.push({ customerName, customerEmail, customerPhone, invoiceTitle });
  }

  const orgMap = new Map<
    string,
    { orgName: string; phone: string }
  >();
  for (const row of skippedRows) {
    let orgName = orgNameFromInvoiceTitle(row.invoiceTitle);
    if (!orgName) orgName = orgNameFromEmail(row.customerEmail);
    if (!orgName || orgName === "TBD") orgName = row.customerName || row.customerEmail || "Unknown";
    const key = orgName.toLowerCase().replace(/\s+/g, " ").trim();
    if (!key) continue;
    const existing = orgMap.get(key);
    if (!existing) {
      orgMap.set(key, { orgName, phone: row.customerPhone || "" });
    } else if (row.customerPhone && !existing.phone) {
      existing.phone = row.customerPhone;
    }
  }

  const header =
    "Organization Name*,Organization Address or PO Box*,Suite #,City*,State*,Zip Code*,County*,Phone*,Website*,Organization Type*,Tags";
  const outRows: string[] = [header];
  const placeholderAddress = "TBD";
  const placeholderGeo = "TBD";
  const placeholderZip = "00000";
  const placeholderWebsite = "TBD";
  const defaultOrgType = "CVB (City)";

  const sortedKeys = Array.from(orgMap.keys()).sort();
  for (const key of sortedKeys) {
    const { orgName, phone } = orgMap.get(key)!;
    outRows.push(
      [
        escapeCsv(orgName),
        escapeCsv(placeholderAddress),
        "",
        escapeCsv(placeholderGeo),
        escapeCsv(placeholderGeo),
        escapeCsv(placeholderZip),
        escapeCsv(placeholderGeo),
        escapeCsv(phone || "TBD"),
        escapeCsv(placeholderWebsite),
        escapeCsv(defaultOrgType),
        escapeCsv("From Square"),
      ].join(",")
    );
  }

  fs.writeFileSync(OUT_PATH, outRows.join("\r\n"), "utf-8");
  console.log(`Wrote ${OUT_PATH}`);
  console.log(`Unique skipped organizations: ${orgMap.size} (from ${skippedRows.length} skipped sales)`);
}

main();
