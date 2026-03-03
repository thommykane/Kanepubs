import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users, sessions } from "@/lib/db/schema";

async function requireAdmin(req: NextRequest): Promise<boolean> {
  const sessionId = req.headers.get("cookie")?.match(/session=([^;]+)/)?.[1];
  if (!sessionId) return false;
  const [session] = await db.select().from(sessions).where(eq(sessions.id, sessionId)).limit(1);
  if (!session || new Date(session.expiresAt) < new Date()) return false;
  const [user] = await db.select({ isAdmin: users.isAdmin }).from(users).where(eq(users.id, session.userId)).limit(1);
  return user?.isAdmin ?? false;
}

/** GET: List all users with id, username, email, isAdmin, accountType (admin only). */
export async function GET(req: NextRequest) {
  try {
    const isAdmin = await requireAdmin(req);
    if (!isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const list = await db
      .select({
        id: users.id,
        username: users.username,
        email: users.email,
        isAdmin: users.isAdmin,
        accountType: users.accountType,
      })
      .from(users)
      .orderBy(users.username);
    return NextResponse.json(list);
  } catch (err) {
    console.error("[api/admin/users GET]", err);
    return NextResponse.json({ error: "Failed to list users" }, { status: 500 });
  }
}
