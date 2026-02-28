import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users, sessions } from "@/lib/db/schema";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  try {
    const sessionId = req.headers.get("cookie")?.match(/session=([^;]+)/)?.[1];
    if (!sessionId) {
      return NextResponse.json({ error: "Not logged in" }, { status: 401 });
    }
    const [session] = await db.select().from(sessions).where(eq(sessions.id, sessionId)).limit(1);
    if (!session || new Date(session.expiresAt) < new Date()) {
      return NextResponse.json({ error: "Not logged in" }, { status: 401 });
    }

    const body = await req.json();
    const { currentPassword, newPassword } = body;
    if (!newPassword || String(newPassword).length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
    }

    const [user] = await db.select({ passwordHash: users.passwordHash }).from(users).where(eq(users.id, session.userId)).limit(1);
    if (!user) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

    if (currentPassword != null && String(currentPassword).length > 0) {
      const ok = await bcrypt.compare(String(currentPassword), user.passwordHash);
      if (!ok) {
        return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 });
      }
    }

    const passwordHash = await bcrypt.hash(String(newPassword), 10);
    await db
      .update(users)
      .set({ passwordHash, mustChangePassword: false })
      .where(eq(users.id, session.userId));

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[api/auth/change-password]", err);
    return NextResponse.json({ error: "Failed to update password" }, { status: 500 });
  }
}
