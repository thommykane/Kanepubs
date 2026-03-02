/**
 * Fill "Business or Organization ID *" in Customers - Sheet1.csv by matching
 * customer email domain to organization Website in orgs.csv (Display ID).
 *
 * Run: npx tsx scripts/fill-customer-org-ids.ts
 */

import * as fs from "fs";
import * as path from "path";

const DESKTOP = path.join(process.env.USERPROFILE || "", "OneDrive", "Desktop");
const CUSTOMERS_PATH = path.join(DESKTOP, "Customers - Sheet1.csv");
const ORGS_PATH = path.join(DESKTOP, "orgs.csv");

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

function domainFromEmail(email: string): string | null {
  const trimmed = (email || "").trim();
  const idx = trimmed.indexOf("@");
  if (idx === -1) return null;
  const domain = trimmed.slice(idx + 1).toLowerCase().trim();
  return domain || null;
}

function domainFromWebsite(website: string): string | null {
  const trimmed = (website || "").trim();
  if (!trimmed) return null;
  let url = trimmed;
  if (!/^https?:\/\//i.test(url)) url = "https://" + url;
  try {
    const host = new URL(url).hostname.toLowerCase().replace(/^www\./, "");
    return host || null;
  } catch {
    return null;
  }
}

function main() {
  const orgsText = fs.readFileSync(ORGS_PATH, "utf-8");
  const orgsLines = orgsText.split(/\r?\n/).filter((l) => l.trim());
  if (orgsLines.length < 2) {
    console.error("orgs.csv has no data.");
    process.exit(1);
  }

  const orgHeader = parseCSVLine(orgsLines[0]);
  const websiteIdx = orgHeader.findIndex((h) => h.replace(/\*+$/, "").trim().toLowerCase().includes("website"));
  const displayIdIdx = orgHeader.findIndex((h) => h.replace(/\*+$/, "").trim().toLowerCase().includes("display id"));
  if (websiteIdx === -1 || displayIdIdx === -1) {
    console.error("orgs.csv must have Website and Display ID columns.");
    process.exit(1);
  }

  const domainToDisplayId: Record<string, string> = {};
  for (let i = 1; i < orgsLines.length; i++) {
    const row = parseCSVLine(orgsLines[i]);
    const website = row[websiteIdx] ?? "";
    const displayId = (row[displayIdIdx] ?? "").trim();
    const domain = domainFromWebsite(website);
    if (domain && displayId) {
      domainToDisplayId[domain] = displayId;
    }
  }

  const customersText = fs.readFileSync(CUSTOMERS_PATH, "utf-8");
  const customerLines = customersText.split(/\r?\n/).filter((l) => l.trim());
  if (customerLines.length < 2) {
    console.error("Customers - Sheet1.csv has no data.");
    process.exit(1);
  }

  const custHeader = parseCSVLine(customerLines[0]);
  const emailIdx = custHeader.findIndex((h) => h.replace(/\*+$/, "").trim().toLowerCase().includes("email"));
  const idIdx = custHeader.findIndex((h) => {
    const k = h.replace(/\*+$/, "").trim().toLowerCase();
    return k.includes("organization id") || (k.includes("business") && k.includes("id"));
  });
  if (emailIdx === -1) {
    console.error("Customers CSV must have an Email column.");
    process.exit(1);
  }
  if (idIdx === -1) {
    console.error("Customers CSV must have Business or Organization ID column.");
    process.exit(1);
  }

  const outLines: string[] = [customerLines[0]];
  let matched = 0;
  let unmatched = 0;

  for (let i = 1; i < customerLines.length; i++) {
    const values = parseCSVLine(customerLines[i]);
    while (values.length <= idIdx) values.push("");
    const email = values[emailIdx] ?? "";
    const domain = domainFromEmail(email);
    const displayId = domain ? domainToDisplayId[domain] ?? "" : "";
    values[idIdx] = displayId;
    if (displayId) matched++;
    else if (email) unmatched++;
    outLines.push(values.map(escapeCsv).join(","));
  }

  fs.writeFileSync(CUSTOMERS_PATH, outLines.join("\r\n"), "utf-8");
  console.log("Updated", CUSTOMERS_PATH);
  console.log("Matched:", matched, "| Unmatched (no org for email domain):", unmatched);
}

main();
