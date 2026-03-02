/**
 * Convert perfect- Sheet1.csv to Organizations CSV uploader format.
 * - Exact header expected by the uploader
 * - Organization Type: "City" -> "City (Government)", "County" -> "County (Government)", "State" -> "State (Government)"
 * - Zip code: pad 4-digit zips with leading zero (e.g. 8210 -> 08210)
 * - Proper CSV escaping
 *
 * Run: npx tsx scripts/convert-perfect-to-org-upload.ts
 */

import * as fs from "fs";
import * as path from "path";

const DESKTOP = path.join(process.env.USERPROFILE || "", "OneDrive", "Desktop");
const INPUT = path.join(DESKTOP, "perfect- Sheet1.csv");
const OUTPUT = path.join(DESKTOP, "organizations-upload.csv");

const UPLOADER_HEADER =
  "Organization Name*,Organization Address or PO Box*,Suite #,City*,State*,Zip Code*,County*,Phone*,Website*,Organization Type*,Tags";

const VALID_ORG_TYPES = new Set([
  "CVB (City)", "CVB (County)", "CVB (State)",
  "DMO (City)", "DMO (County)", "DMO (State)",
  "Chamber (City)", "Chamber (County)", "Chamber (State)",
  "City (Government)", "County (Government)", "State (Government)",
]);

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

function normalizeOrgType(val: string): string {
  const t = val.trim();
  if (VALID_ORG_TYPES.has(t)) return t;
  if (t === "City") return "City (Government)";
  if (t === "County") return "County (Government)";
  if (t === "State") return "State (Government)";
  return t;
}

function normalizeZip(val: string): string {
  const z = String(val ?? "").trim();
  if (/^\d{4}$/.test(z)) return "0" + z;
  return z;
}

function main() {
  const text = fs.readFileSync(INPUT, "utf-8");
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) {
    console.error("No data in input file.");
    process.exit(1);
  }

  const header = parseCSVLine(lines[0]);
  const orgTypeIdx = header.findIndex((h) => h.replace(/\*+$/, "").trim().toLowerCase().includes("organization type"));
  const zipIdx = header.findIndex((h) => h.replace(/\*+$/, "").trim().toLowerCase().includes("zip"));

  const outRows: string[] = [UPLOADER_HEADER];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length < 11) {
      while (values.length < 11) values.push("");
    }
    if (orgTypeIdx >= 0 && values[orgTypeIdx] !== undefined) {
      values[orgTypeIdx] = normalizeOrgType(values[orgTypeIdx]);
    }
    if (zipIdx >= 0 && values[zipIdx] !== undefined) {
      values[zipIdx] = normalizeZip(values[zipIdx]);
    }
    outRows.push(values.map(escapeCsv).join(","));
  }

  fs.writeFileSync(OUTPUT, outRows.join("\r\n"), "utf-8");
  console.log("Wrote", OUTPUT);
  console.log("Rows:", outRows.length - 1);
}

main();
