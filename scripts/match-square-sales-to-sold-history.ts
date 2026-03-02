/**
 * Matches square-sales.csv to Matched-Contacts.csv by email or customer name,
 * then writes sold-history.csv for the SOLD History CSV uploader.
 *
 * Run: npx tsx scripts/match-square-sales-to-sold-history.ts
 * Inputs (Desktop): square-sales.csv, Matched-Contacts.csv
 * Output (Desktop): sold-history.csv
 */

import * as fs from "fs";
import * as path from "path";

const DESKTOP = path.join(process.env.USERPROFILE || "", "OneDrive", "Desktop");
const SQUARE_PATH = path.join(DESKTOP, "square-sales.csv");
const CONTACTS_PATH = path.join(DESKTOP, "Matched-Contacts.csv");
const OUT_PATH = path.join(DESKTOP, "sold-history.csv");

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

/** Parse amount like "$6,995.00 " to number string "6995.00" */
function parseAmount(raw: string): string {
  const cleaned = String(raw).replace(/[$,\s]/g, "");
  const n = parseFloat(cleaned);
  if (Number.isNaN(n) || n < 0) return "0.00";
  return n.toFixed(2);
}

/** Normalize date from Square (e.g. 2/27/2026, 12/17/2025) to YYYY-MM-DD for consistency, or keep as-is for uploader */
function formatSaleDate(s: string): string {
  const raw = String(s).trim();
  if (!raw) return "";
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return raw;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${m}/${day}/${y}`;
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

  const byEmail = new Map<string, { firstName: string; lastName: string; businessId: string }>();
  const byName = new Map<string, { firstName: string; lastName: string; businessId: string }>();
  for (let i = 1; i < contactLines.length; i++) {
    const cells = parseCSVLine(contactLines[i]);
    const firstName = (cells[firstIdx] ?? "").trim();
    const lastName = (cells[lastIdx] ?? "").trim();
    const email = (cells[emailIdx] ?? "").trim().toLowerCase();
    const businessId = (cells[businessIdIdx] ?? "").trim();
    if (!businessId) continue;
    const rec = { firstName, lastName, businessId };
    if (email) byEmail.set(email, rec);
    const nameKey = `${firstName} ${lastName}`.toLowerCase().replace(/\s+/g, " ").trim();
    if (nameKey) byName.set(nameKey, rec);
  }

  const saleDateIdx = squareHeaders.findIndex((h) => h.includes("sale date") || h === "date");
  const customerNameIdx = squareHeaders.findIndex((h) => h.includes("customer name") || h === "customer name");
  const customerEmailIdx = squareHeaders.findIndex((h) => h.includes("customer email") || h === "email");
  const amountIdx = squareHeaders.findIndex((h) => h.includes("amount") || h === " amount");
  if (saleDateIdx === -1 || customerNameIdx === -1 || amountIdx === -1) {
    console.error("Square CSV must have Sale Date, Customer Name, Amount columns.");
    process.exit(1);
  }

  const outHeader =
    "Business or organization ID*,First Name*,Last Name*,Agent*,Sold Date*,Sold time*,Sold Amount*";
  const outRows: string[] = [outHeader];
  const AGENT = "Admin";
  const SOLD_TIME = "12:00:00";

  let matched = 0;
  let skipped = 0;
  for (let i = 1; i < squareLines.length; i++) {
    const cells = parseCSVLine(squareLines[i]);
    const saleDate = (cells[saleDateIdx] ?? "").trim();
    const customerName = (cells[customerNameIdx] ?? "").trim();
    const customerEmail = (cells[customerEmailIdx] ?? "").trim().toLowerCase();
    const amountRaw = (cells[amountIdx] ?? "").trim();
    if (!saleDate || !amountRaw) {
      skipped++;
      continue;
    }

    let rec = customerEmail ? byEmail.get(customerEmail) : null;
    if (!rec && customerName) {
      const parts = customerName.split(/\s+/);
      const first = parts[0] ?? "";
      const last = parts.slice(1).join(" ").trim();
      const nameKey = `${first} ${last}`.toLowerCase().replace(/\s+/g, " ").trim();
      rec = nameKey ? byName.get(nameKey) ?? null : null;
      if (!rec && parts.length >= 2) {
        const lastPart = parts[parts.length - 1];
        const firstPart = parts.slice(0, -1).join(" ");
        const altKey = `${firstPart} ${lastPart}`.toLowerCase().replace(/\s+/g, " ").trim();
        rec = byName.get(altKey) ?? null;
      }
    }
    if (!rec) {
      skipped++;
      continue;
    }

    matched++;
    const soldDate = formatSaleDate(saleDate);
    const soldAmount = parseAmount(amountRaw);
    outRows.push(
      [
        escapeCsv(rec.businessId),
        escapeCsv(rec.firstName),
        escapeCsv(rec.lastName),
        escapeCsv(AGENT),
        escapeCsv(soldDate),
        escapeCsv(SOLD_TIME),
        escapeCsv(soldAmount),
      ].join(",")
    );
  }

  fs.writeFileSync(OUT_PATH, outRows.join("\r\n"), "utf-8");
  console.log(`Wrote ${OUT_PATH}`);
  console.log(`Matched: ${matched}, Skipped: ${skipped}`);
}

main();
