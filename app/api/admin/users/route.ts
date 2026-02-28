import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users, sessions } from "@/lib/db/schema";
import bcrypt from "bcryptjs";
import { v4 as uuid } from "uuid";

async function requireAdmin(req: NextRequest): Promise<NextResponse | null> {
  const sessionId = req.headers.get("cookie")?.match(/session=([^;]+)/)?.[1];
  if (!sessionId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const [session] = await db.select().from(sessions).where(eq(sessions.id, sessionId)).limit(1);
  if (!session || new Date(session.expiresAt) < new Date()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const [user] = await db.select().from(users).where(eq(users.id, session.userId)).limit(1);
  if (!user || !user.isAdmin) return NextResponse.json({ error: "Admin only" }, { status: 403 });
  return null;
}

const ACCOUNT_TYPES = [
  { value: "regional_agent", label: "Regional Sales Agent" },
  { value: "national_agent", label: "National Sales Agent" },
  { value: "admin", label: "Admin" },
] as const;

export async function POST(req: NextRequest) {
  try {
    const authErr = await requireAdmin(req);
    if (authErr) return authErr;

    const body = await req.json();
    const { username, email, phone, accountType, temporaryPassword } = body;

    if (!username || !email || !temporaryPassword) {
      return NextResponse.json(
        { error: "Username, email, and temporary password required" },
        { status: 400 }
      );
    }
    const validTypes = ACCOUNT_TYPES.map((t) => t.value);
    const type = accountType && validTypes.includes(accountType) ? accountType : "regional_agent";

    const emailTrim = String(email).trim().toLowerCase();
    const usernameTrim = String(username).trim();

    const [existingEmail] = await db.select().from(users).where(eq(users.email, emailTrim)).limit(1);
    if (existingEmail) {
      return NextResponse.json({ error: "Email already in use" }, { status: 400 });
    }
    const [existingUsername] = await db.select().from(users).where(eq(users.username, usernameTrim)).limit(1);
    if (existingUsername) {
      return NextResponse.json({ error: "Username already in use" }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(String(temporaryPassword), 10);
    const id = uuid();
    await db.insert(users).values({
      id,
      email: emailTrim,
      username: usernameTrim,
      passwordHash,
      phone: phone != null ? String(phone).trim() || null : null,
      accountType: type,
      isAdmin: type === "admin",
      mustChangePassword: true,
    });

    return NextResponse.json({ success: true, id, username: usernameTrim });
  } catch (err) {
    console.error("[api/admin/users POST]", err);
    return NextResponse.json({ error: "Failed to create user" }, { status: 500 });
  }
}
