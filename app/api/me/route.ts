import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users, sessions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET(req: Request) {
  try {
    const sessionId = req.headers.get("cookie")?.match(/session=([^;]+)/)?.[1];
    if (!sessionId) {
      return NextResponse.json({ user: null });
    }

    const [session] = await db
      .select()
      .from(sessions)
      .where(eq(sessions.id, sessionId))
      .limit(1);
    if (!session || new Date(session.expiresAt) < new Date()) {
      return NextResponse.json({ user: null });
    }

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, session.userId))
      .limit(1);
    if (!user) {
      return NextResponse.json({ user: null });
    }

    return NextResponse.json({
      user: {
        id: user.id,
        username: user.username,
        avatarUrl: user.avatarUrl,
        isAdmin: user.isAdmin,
        accountType: user.accountType ?? null,
        mustChangePassword: user.mustChangePassword ?? false,
      },
    });
  } catch (err) {
    console.error("[api/me]", err);
    return NextResponse.json({ user: null });
  }
}
