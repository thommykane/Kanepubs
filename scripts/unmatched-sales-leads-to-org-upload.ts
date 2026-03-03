/**
 * Reads Sales ALL TIME - Sheet1.csv and orgs.csv from Desktop.
 * Finds leads that cannot be matched to any organization (by Business or Organization ID / Display ID).
 * Outputs a CSV with the exact same column structure as the organization uploader (orgs.csv).
 *
 * Run: npx tsx scripts/unmatched-sales-leads-to-org-upload.ts
 */

import * as fs from "fs";
import * as path from "path";

const DESKTOP = path.join(process.env.USERPROFILE || "", "OneDrive", "Desktop");
const SALES_CSV = path.join(DESKTOP, "Sales ALL TIME - Sheet1.csv");
const ORGS_CSV = path.join(DESKTOP, "orgs.csv");
const OUTPUT_CSV = path.join(DESKTOP, "unmatched-leads-organizations-upload.csv");

const ORG_UPLOADER_HEADER =
  "Organization Name,Address,Address Line 2,City,State,Zip Code,County,Phone,Website,Organization Type,Tags,Assigned To,Display ID";

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

function parseCSV(filePath: string): { headers: string[]; rows: string[][] } {
  const text = fs.readFileSync(filePath, "utf-8");
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 1) return { headers: [], rows: [] };
  const headers = parseCSVLine(lines[0]);
  const rows: string[][] = [];
  for (let i = 1; i < lines.length; i++) {
    rows.push(parseCSVLine(lines[i]));
  }
  return { headers, rows };
}

function rowToObject(headers: string[], values: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  headers.forEach((h, i) => {
    out[h.trim()] = values[i]?.trim() ?? "";
  });
  return out;
}

function escapeCsv(value: string): string {
  const s = String(value ?? "").trim();
  if (s.includes(",") || s.includes('"') || s.includes("\n") || s.includes("\r")) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

function main() {
  if (!fs.existsSync(SALES_CSV)) {
    console.error("Sales CSV not found:", SALES_CSV);
    process.exit(1);
  }
  if (!fs.existsSync(ORGS_CSV)) {
    console.error("Orgs CSV not found:", ORGS_CSV);
    process.exit(1);
  }

  const sales = parseCSV(SALES_CSV);
  const orgs = parseCSV(ORGS_CSV);

  const displayIdIdx = orgs.headers.findIndex(
    (h) => h.trim().toLowerCase() === "display id"
  );
  if (displayIdIdx === -1) {
    console.error("orgs.csv must have a 'Display ID' column.");
    process.exit(1);
  }

  const orgDisplayIds = new Set<string>();
  for (const row of orgs.rows) {
    const id = row[displayIdIdx]?.trim();
    if (id) orgDisplayIds.add(id);
  }

  const salesIdKey = "Business or Organization ID";
  const salesHeadersLower = sales.headers.map((h) => h.trim().toLowerCase());
  const idColIdx = sales.headers.findIndex(
    (h) => h.trim().toLowerCase() === salesIdKey.toLowerCase()
  );
  const customerNameIdx = sales.headers.findIndex(
    (h) => h.trim().toLowerCase() === "customer name"
  );
  const agentIdx = sales.headers.findIndex(
    (h) => h.trim().toLowerCase() === "agent"
  );

  if (idColIdx === -1 || customerNameIdx === -1) {
    console.error("Sales CSV must have 'Business or Organization ID' and 'Customer Name' columns.");
    process.exit(1);
  }

  const unmatched: string[][] = [];
  for (const row of sales.rows) {
    const bizOrOrgId = row[idColIdx]?.trim() ?? "";
    const isMatched = bizOrOrgId !== "" && orgDisplayIds.has(bizOrOrgId);
    if (isMatched) continue;

    const customerName = row[customerNameIdx]?.trim() || "Unknown";
    const agent = agentIdx >= 0 ? row[agentIdx]?.trim() || "" : "";

    // Same column order as org uploader: Organization Name, Address, Address Line 2, City, State, Zip Code, County, Phone, Website, Organization Type, Tags, Assigned To, Display ID
    unmatched.push([
      customerName,
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      agent,
      "",
    ]);
  }

  const outLines = [ORG_UPLOADER_HEADER, ...unmatched.map((r) => r.map(escapeCsv).join(","))];
  fs.writeFileSync(OUTPUT_CSV, outLines.join("\r\n"), "utf-8");

  console.log("Output:", OUTPUT_CSV);
  console.log("Unmatched leads:", unmatched.length);
  console.log("Total sales rows:", sales.rows.length);
  console.log("Orgs in orgs.csv:", orgDisplayIds.size);
}

main();
