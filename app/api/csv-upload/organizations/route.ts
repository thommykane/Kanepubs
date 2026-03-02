import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { organizations, sessions, users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { v4 as uuid } from "uuid";
import { getNextDisplayId } from "@/lib/next-display-id";
import { getTimezoneFromAddress } from "@/lib/timezone-from-address";
import { normalizeWebsiteUrl } from "@/lib/normalize-website-url";

async function requireAdmin(req: NextRequest): Promise<boolean> {
  const sessionId = req.headers.get("cookie")?.match(/session=([^;]+)/)?.[1];
  if (!sessionId) return false;
  const [session] = await db.select().from(sessions).where(eq(sessions.id, sessionId)).limit(1);
  if (!session || new Date(session.expiresAt) < new Date()) return false;
  const [user] = await db.select({ isAdmin: users.isAdmin }).from(users).where(eq(users.id, session.userId)).limit(1);
  return user?.isAdmin ?? false;
}

const ORGANIZATION_TYPES = [
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

/** Parse CSV text into rows of string arrays, then into objects by header. Handles quoted fields. */
function parseCSV(csvText: string): Record<string, string>[] {
  const lines = csvText.split(/\r?\n/).filter((line) => line.trim());
  if (lines.length < 2) return [];
  const headerLine = lines[0];
  const headers = parseCSVLine(headerLine);
  const normalized = headers.map((h) => h.replace(/\*+$/, "").trim().toLowerCase());
  const rows: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    const row: Record<string, string> = {};
    for (let j = 0; j < headers.length; j++) {
      const key = normalized[j] ?? `col${j}`;
      row[key] = values[j]?.trim() ?? "";
    }
    rows.push(row);
  }
  return rows;
}

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

/** Map CSV row keys (normalized) to our field names. */
const COLUMN_MAP: Record<string, string> = {
  "organization name": "organizationName",
  "organization address or po box": "address",
  "organization address": "address",
  "address": "address",
  "suite #": "addressLine2",
  "suite": "addressLine2",
  "city": "city",
  "state": "state",
  "zip code": "zipCode",
  "zip": "zipCode",
  "county": "county",
  "phone": "phone",
  "website": "website",
  "organization type": "organizationType",
  "type": "organizationType",
  "tags": "tags",
};

function mapRow(raw: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(raw)) {
    const k = key.toLowerCase().replace(/\*+$/, "").trim();
    const field = COLUMN_MAP[k] ?? k;
    out[field] = value?.trim() ?? "";
  }
  return out;
}

export async function POST(req: NextRequest) {
  try {
    const isAdmin = await requireAdmin(req);
    if (!isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await req.json();
    const { csv: csvText } = body;
    if (typeof csvText !== "string" || !csvText.trim()) {
      return NextResponse.json({ error: "CSV content is required" }, { status: 400 });
    }

    const rawRows = parseCSV(csvText);
    if (rawRows.length === 0) {
      return NextResponse.json({ error: "No data rows in CSV" }, { status: 400 });
    }

    const required = ["organizationName", "address", "city", "state", "zipCode", "county", "phone", "website", "organizationType"];
    const created: { displayId: string; organizationName: string }[] = [];
    const errors: { row: number; message: string }[] = [];

    for (let i = 0; i < rawRows.length; i++) {
      const row = mapRow(rawRows[i]);
      const rowNum = i + 2;

      for (const field of required) {
        if (!row[field] || !String(row[field]).trim()) {
          errors.push({ row: rowNum, message: `Missing required: ${field}` });
          break;
        }
      }
      if (errors.some((e) => e.row === rowNum)) continue;

      const orgType = String(row.organizationType ?? "").trim();
      if (!ORGANIZATION_TYPES.includes(orgType)) {
        errors.push({
          row: rowNum,
          message: `Organization Type must be one of: ${ORGANIZATION_TYPES.join(", ")}`,
        });
        continue;
      }

      const websiteNorm = normalizeWebsiteUrl(row.website || null);
      if (websiteNorm) {
        const [existing] = await db
          .select({ id: organizations.id })
          .from(organizations)
          .where(eq(organizations.website, websiteNorm))
          .limit(1);
        if (existing) {
          errors.push({ row: rowNum, message: "An organization with this website already exists." });
          continue;
        }
      }

      const id = uuid();
      const displayId = "A" + (await getNextDisplayId());
      const stateVal = String(row.state ?? "").trim() || null;
      const zipVal = String(row.zipCode ?? "").trim() || null;
      const timeZone = getTimezoneFromAddress(stateVal, zipVal);

      await db.insert(organizations).values({
        id,
        displayId,
        organizationName: String(row.organizationName).trim(),
        address: String(row.address).trim() || null,
        addressLine2: row.addressLine2 ? String(row.addressLine2).trim() : null,
        city: String(row.city).trim() || null,
        state: stateVal,
        zipCode: zipVal,
        county: String(row.county ?? "").trim() || null,
        phone: String(row.phone ?? "").trim() || null,
        website: normalizeWebsiteUrl(row.website || null),
        organizationType: orgType,
        tags: row.tags ? String(row.tags).trim() : null,
        timeZone,
        createdBy: "Admin",
        assignedTo: "Admin",
      });

      created.push({ displayId, organizationName: String(row.organizationName).trim() });
    }

    return NextResponse.json({
      success: true,
      created: created.length,
      createdIds: created,
      errors: errors.length ? errors : undefined,
    });
  } catch (err) {
    console.error("[api/csv-upload/organizations POST]", err);
    return NextResponse.json({ error: "Failed to process CSV" }, { status: 500 });
  }
}
