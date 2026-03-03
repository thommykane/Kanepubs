import { NextRequest, NextResponse } from "next/server";
import { eq, and, ne } from "drizzle-orm";
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

const VALID_ACCOUNT_TYPES = ["regional_agent", "national_agent", "admin"] as const;

/** PATCH: Update a user's username, isAdmin and accountType (admin only). */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const isAdmin = await requireAdmin(req);
    if (!isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const { id } = await params;
    const body = await req.json();
    const { accountType, username: bodyUsername } = body;

    const [target] = await db.select().from(users).where(eq(users.id, id)).limit(1);
    if (!target) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const updates: { accountType?: string; isAdmin?: boolean; username?: string; updatedAt: Date } = {
      updatedAt: new Date(),
    };

    if (bodyUsername !== undefined) {
      const usernameTrimmed = String(bodyUsername).trim();
      if (!usernameTrimmed) {
        return NextResponse.json({ error: "Username cannot be empty" }, { status: 400 });
      }
      const [existing] = await db
        .select({ id: users.id })
        .from(users)
        .where(and(eq(users.username, usernameTrimmed), ne(users.id, id)))
        .limit(1);
      if (existing) {
        return NextResponse.json({ error: "Username already in use" }, { status: 400 });
      }
      updates.username = usernameTrimmed;
    }

    if (accountType !== undefined) {
      const at = String(accountType).trim().toLowerCase();
      if (!VALID_ACCOUNT_TYPES.includes(at as (typeof VALID_ACCOUNT_TYPES)[number])) {
        return NextResponse.json(
          { error: "accountType must be regional_agent, national_agent, or admin" },
          { status: 400 }
        );
      }
      updates.accountType = at;
      updates.isAdmin = at === "admin";
    }

    if (Object.keys(updates).length > 1) {
      await db.update(users).set(updates).where(eq(users.id, id));
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[api/admin/users PATCH]", err);
    return NextResponse.json({ error: "Failed to update user" }, { status: 500 });
  }
}
