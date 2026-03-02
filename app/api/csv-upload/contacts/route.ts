import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { contacts, sessions, users, organizations, businesses } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { v4 as uuid } from "uuid";

async function requireAdmin(req: NextRequest): Promise<boolean> {
  const sessionId = req.headers.get("cookie")?.match(/session=([^;]+)/)?.[1];
  if (!sessionId) return false;
  const [session] = await db.select().from(sessions).where(eq(sessions.id, sessionId)).limit(1);
  if (!session || new Date(session.expiresAt) < new Date()) return false;
  const [user] = await db.select({ isAdmin: users.isAdmin }).from(users).where(eq(users.id, session.userId)).limit(1);
  return user?.isAdmin ?? false;
}

/** Parse CSV line handling quoted fields. */
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

function parseCSV(csvText: string): Record<string, string>[] {
  const lines = csvText.split(/\r?\n/).filter((line) => line.trim());
  if (lines.length < 2) return [];
  const headers = parseCSVLine(lines[0]);
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

const COLUMN_MAP: Record<string, string> = {
  "first name": "firstName",
  "last name": "lastName",
  "title": "title",
  "office number": "officeNumber",
  "cell number": "cellNumber",
  "email": "email",
  "email address": "email",
  "business or organization id": "businessId",
  "business id": "businessId",
  "organization id": "businessId",
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

    const required = ["firstName", "lastName", "email", "businessId"];
    const created: { id: string; firstName: string; lastName: string; businessId: string }[] = [];
    const errors: { row: number; message: string }[] = [];
    const skipped: { row: number; reason: string }[] = [];

    for (let i = 0; i < rawRows.length; i++) {
      const row = mapRow(rawRows[i]);
      const rowNum = i + 2;

      for (const field of required) {
        if (!row[field] || !String(row[field]).trim()) {
          skipped.push({ row: rowNum, reason: field === "businessId" ? "No Business or Organization ID" : `Missing required: ${field}` });
          break;
        }
      }
      if (skipped.some((s) => s.row === rowNum)) continue;
      if (errors.some((e) => e.row === rowNum)) continue;

      const emailVal = String(row.email).trim();
      const [existingByEmail] = await db
        .select({ id: contacts.id })
        .from(contacts)
        .where(eq(contacts.email, emailVal))
        .limit(1);
      if (existingByEmail) {
        skipped.push({ row: rowNum, reason: "Email already in system" });
        continue;
      }

      const businessId = String(row.businessId).trim();
      const [orgRow] = await db
        .select({ displayId: organizations.displayId })
        .from(organizations)
        .where(eq(organizations.displayId, businessId))
        .limit(1);
      const [bizRow] = await db
        .select({ displayId: businesses.displayId })
        .from(businesses)
        .where(eq(businesses.displayId, businessId))
        .limit(1);
      if (!orgRow && !bizRow) {
        errors.push({ row: rowNum, message: `No organization or business found with ID: ${businessId}` });
        continue;
      }

      const id = uuid();
      await db.insert(contacts).values({
        id,
        firstName: String(row.firstName).trim() || null,
        lastName: String(row.lastName).trim() || null,
        title: row.title ? String(row.title).trim() : null,
        officeNumber: row.officeNumber ? String(row.officeNumber).trim() : null,
        cellNumber: row.cellNumber ? String(row.cellNumber).trim() : null,
        email: String(row.email).trim() || null,
        businessId,
        assignedTo: "Admin",
      });

      created.push({
        id,
        firstName: String(row.firstName).trim(),
        lastName: String(row.lastName).trim(),
        businessId,
      });
    }

    return NextResponse.json({
      success: true,
      created: created.length,
      createdContacts: created,
      errors: errors.length ? errors : undefined,
      skipped: skipped.length ? skipped : undefined,
    });
  } catch (err) {
    console.error("[api/csv-upload/contacts POST]", err);
    return NextResponse.json({ error: "Failed to process CSV" }, { status: 500 });
  }
}
