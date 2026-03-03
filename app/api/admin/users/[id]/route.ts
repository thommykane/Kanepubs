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

const VALID_ACCOUNT_TYPES = ["regional_agent", "national_agent", "admin"] as const;

/** PATCH: Update a user's isAdmin and accountType (admin only). */
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
    const { accountType } = body;

    const [target] = await db.select().from(users).where(eq(users.id, id)).limit(1);
    if (!target) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (accountType !== undefined) {
      const at = String(accountType).trim().toLowerCase();
      if (!VALID_ACCOUNT_TYPES.includes(at as (typeof VALID_ACCOUNT_TYPES)[number])) {
        return NextResponse.json(
          { error: "accountType must be regional_agent, national_agent, or admin" },
          { status: 400 }
        );
      }
      const isAdminRole = at === "admin";
      await db
        .update(users)
        .set({
          accountType: at,
          isAdmin: isAdminRole,
          updatedAt: new Date(),
        })
        .where(eq(users.id, id));
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[api/admin/users PATCH]", err);
    return NextResponse.json({ error: "Failed to update user" }, { status: 500 });
  }
}
