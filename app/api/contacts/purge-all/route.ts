import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { contacts, sessions, users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

async function requireAdmin(req: NextRequest): Promise<boolean> {
  const sessionId = req.headers.get("cookie")?.match(/session=([^;]+)/)?.[1];
  if (!sessionId) return false;
  const [session] = await db.select().from(sessions).where(eq(sessions.id, sessionId)).limit(1);
  if (!session || new Date(session.expiresAt) < new Date()) return false;
  const [user] = await db.select({ isAdmin: users.isAdmin }).from(users).where(eq(users.id, session.userId)).limit(1);
  return user?.isAdmin ?? false;
}

/** POST: Purge all contacts. Admin only. */
export async function POST(req: NextRequest) {
  try {
    const isAdmin = await requireAdmin(req);
    if (!isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const all = await db.select({ id: contacts.id }).from(contacts);
    const count = all.length;
    for (const row of all) {
      await db.delete(contacts).where(eq(contacts.id, row.id));
    }

    return NextResponse.json({ success: true, purged: count });
  } catch (err) {
    console.error("[api/contacts/purge-all POST]", err);
    return NextResponse.json({ error: "Failed to purge contacts" }, { status: 500 });
  }
}
