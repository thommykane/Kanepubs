import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { v4 as uuid } from "uuid";
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

/** POST: Create a new user (admin only). Body: username, email, phone?, accountType, temporaryPassword. */
export async function POST(req: NextRequest) {
  try {
    const isAdmin = await requireAdmin(req);
    if (!isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const body = await req.json();
    const { username: rawUsername, email: rawEmail, phone, accountType, temporaryPassword } = body;

    const username = typeof rawUsername === "string" ? rawUsername.trim() : "";
    const email = typeof rawEmail === "string" ? rawEmail.trim().toLowerCase() : "";

    if (!username || !email) {
      return NextResponse.json({ error: "Username and email are required" }, { status: 400 });
    }
    if (!temporaryPassword || String(temporaryPassword).length < 6) {
      return NextResponse.json({ error: "Temporary password must be at least 6 characters" }, { status: 400 });
    }

    const existingByEmail = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
    if (existingByEmail.length > 0) {
      return NextResponse.json({ error: "A user with this email already exists" }, { status: 400 });
    }
    const existingByUsername = await db.select({ id: users.id }).from(users).where(eq(users.username, username)).limit(1);
    if (existingByUsername.length > 0) {
      return NextResponse.json({ error: "Username already taken" }, { status: 400 });
    }

    const id = uuid();
    const passwordHash = await bcrypt.hash(String(temporaryPassword), 10);
    const isAdminUser = accountType === "admin";

    await db.insert(users).values({
      id,
      username,
      email,
      phone: typeof phone === "string" && phone.trim() ? phone.trim() : undefined,
      passwordHash,
      isAdmin: isAdminUser,
      accountType: accountType || "regional_agent",
      mustChangePassword: true,
    });

    return NextResponse.json({ success: true, id, username });
  } catch (err) {
    console.error("[api/admin/users POST]", err);
    return NextResponse.json({ error: "Failed to create user" }, { status: 500 });
  }
}
