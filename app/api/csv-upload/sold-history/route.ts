import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  contacts,
  sessions,
  users,
  organizations,
  businesses,
  proposals,
  activities,
} from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { v4 as uuid } from "uuid";

async function requireAdmin(req: NextRequest): Promise<boolean> {
  const sessionId = req.headers.get("cookie")?.match(/session=([^;]+)/)?.[1];
  if (!sessionId) return false;
  const [session] = await db.select().from(sessions).where(eq(sessions.id, sessionId)).limit(1);
  if (!session || new Date(session.expiresAt) < new Date()) return false;
  const [user] = await db.select({ isAdmin: users.isAdmin }).from(users).where(eq(users.id, session.userId)).limit(1);
  return user?.isAdmin ?? false;
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

function parseCSV(csvText: string): Record<string, string>[] {
  const lines = csvText.split(/\r?\n/).filter((l) => l.trim());
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
  "business or organization id": "businessId",
  "business id": "businessId",
  "organization id": "businessId",
  "first name": "firstName",
  "last name": "lastName",
  "agent": "agent",
  "sold date": "soldDate",
  "sold time": "soldTime",
  "sold amount": "soldAmount",
  "amount": "soldAmount",
  "notes": "notes",
};

function mapRow(raw: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(raw)) {
    const k = key.toLowerCase().replace(/\*+$/, "").trim();
    out[COLUMN_MAP[k] ?? k] = value?.trim() ?? "";
  }
  return out;
}

/** Parse sold date + time into a Date. Time optional (defaults to noon). */
function parseSoldDateTime(dateStr: string, timeStr: string): Date | null {
  const d = (dateStr || "").trim();
  const t = (timeStr || "").trim();
  if (!d) return null;
  let combined = d;
  if (t) {
    combined = `${d} ${t}`;
  } else {
    combined = `${d} 12:00:00`;
  }
  const parsed = new Date(combined);
  if (Number.isNaN(parsed.getTime())) {
    const fallback = new Date(d);
    return Number.isNaN(fallback.getTime()) ? null : fallback;
  }
  return parsed;
}

/** Parse amount string to number (strip $ and commas). */
function parseAmount(s: string): number | null {
  const cleaned = String(s).replace(/[$,\s]/g, "");
  const n = parseFloat(cleaned);
  return Number.isNaN(n) ? null : n;
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

    const required = ["businessId", "firstName", "lastName", "agent", "soldDate", "soldAmount"];
    const created: { proposalId: string; companyDisplayId: string; soldAt: string }[] = [];
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

      const displayId = String(row.businessId).trim();
      const companyType = displayId.toUpperCase().startsWith("A") ? "org" : "business";

      const [orgRow] = await db
        .select({ id: organizations.id, displayId: organizations.displayId })
        .from(organizations)
        .where(eq(organizations.displayId, displayId))
        .limit(1);
      const [bizRow] = await db
        .select({ id: businesses.id, displayId: businesses.displayId })
        .from(businesses)
        .where(eq(businesses.displayId, displayId))
        .limit(1);

      if (companyType === "org" && !orgRow) {
        errors.push({ row: rowNum, message: `Organization not found: ${displayId}` });
        continue;
      }
      if (companyType === "business" && !bizRow) {
        errors.push({ row: rowNum, message: `Business not found: ${displayId}` });
        continue;
      }

      const soldAt = parseSoldDateTime(row.soldDate, row.soldTime ?? "");
      if (!soldAt) {
        errors.push({ row: rowNum, message: "Invalid Sold Date or Sold time" });
        continue;
      }

      const amountNum = parseAmount(row.soldAmount);
      if (amountNum == null || amountNum < 0) {
        errors.push({ row: rowNum, message: "Invalid Sold Amount" });
        continue;
      }

      const firstName = String(row.firstName).trim();
      const lastName = String(row.lastName).trim();
      const agent = String(row.agent).trim();
      const notesVal = row.notes != null && String(row.notes).trim() !== ""
        ? String(row.notes).trim().slice(0, 50)
        : null;

      let contactId: string;
      const [existingContact] = await db
        .select({ id: contacts.id })
        .from(contacts)
        .where(
          and(
            eq(contacts.businessId, displayId),
            eq(contacts.firstName, firstName),
            eq(contacts.lastName, lastName)
          )
        )
        .limit(1);

      if (existingContact) {
        contactId = existingContact.id;
      } else {
        contactId = uuid();
        await db.insert(contacts).values({
          id: contactId,
          firstName,
          lastName,
          title: null,
          officeNumber: null,
          cellNumber: null,
          email: null,
          businessId: displayId,
          assignedTo: agent,
        });
      }

      const proposalId = uuid();
      const amountStr = amountNum.toFixed(2);

      await db.insert(proposals).values({
        id: proposalId,
        companyType,
        companyDisplayId: displayId,
        contactId,
        salesAgent: agent,
        amount: amountStr,
        issues: null,
        geo: null,
        impressions: null,
        notes: notesVal,
        status: "sold",
        matDue: null,
        createdAt: soldAt,
        statusUpdatedAt: soldAt,
        assignedTo: agent,
      });

      await db.insert(activities).values({
        id: uuid(),
        companyType,
        companyDisplayId: displayId,
        contactId,
        username: agent,
        actionType: "sold",
        proposalData: { amount: amountStr },
        createdAt: soldAt,
      });

      if (companyType === "org" && orgRow) {
        const [o] = await db.select({ moneySpent: organizations.moneySpent, transactions: organizations.transactions }).from(organizations).where(eq(organizations.id, orgRow.id)).limit(1);
        if (o) {
          const currentMoney = o.moneySpent != null ? Number(o.moneySpent) : 0;
          const currentTx = o.transactions ?? 0;
          await db
            .update(organizations)
            .set({
              moneySpent: (currentMoney + amountNum).toFixed(2),
              transactions: currentTx + 1,
            })
            .where(eq(organizations.id, orgRow.id));
        }
      } else if (companyType === "business" && bizRow) {
        const [b] = await db.select({ moneySpent: businesses.moneySpent, transactions: businesses.transactions }).from(businesses).where(eq(businesses.id, bizRow.id)).limit(1);
        if (b) {
          const currentMoney = b.moneySpent != null ? Number(b.moneySpent) : 0;
          const currentTx = b.transactions ?? 0;
          await db
            .update(businesses)
            .set({
              moneySpent: (currentMoney + amountNum).toFixed(2),
              transactions: currentTx + 1,
            })
            .where(eq(businesses.id, bizRow.id));
        }
      }

      created.push({ proposalId, companyDisplayId: displayId, soldAt: soldAt.toISOString() });
    }

    return NextResponse.json({
      success: true,
      created: created.length,
      createdSales: created,
      errors: errors.length ? errors : undefined,
    });
  } catch (err) {
    console.error("[api/csv-upload/sold-history POST]", err);
    return NextResponse.json({ error: "Failed to process CSV" }, { status: 500 });
  }
}
