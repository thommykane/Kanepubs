import { NextRequest, NextResponse } from "next/server";
import { eq, desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { agencies, sessions, users } from "@/lib/db/schema";

async function getCurrentUsername(req: NextRequest): Promise<string | null> {
  const sessionId = req.headers.get("cookie")?.match(/session=([^;]+)/)?.[1];
  if (!sessionId) return null;
  const [session] = await db.select().from(sessions).where(eq(sessions.id, sessionId)).limit(1);
  if (!session || new Date(session.expiresAt) < new Date()) return null;
  const [user] = await db.select().from(users).where(eq(users.id, session.userId)).limit(1);
  return user?.username ?? null;
}

export async function GET(req: NextRequest) {
  try {
    const username = await getCurrentUsername(req);
    if (!username) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const list = await db
      .select({
        id: agencies.id,
        displayId: agencies.displayId,
        agencyName: agencies.agencyName,
        address: agencies.address,
        city: agencies.city,
        state: agencies.state,
        zipCode: agencies.zipCode,
        phone: agencies.phone,
        website: agencies.website,
        assignedTo: agencies.assignedTo,
        createdAt: agencies.createdAt,
      })
      .from(agencies)
      .where(eq(agencies.assignedTo, username))
      .orderBy(desc(agencies.createdAt));

    return NextResponse.json(list);
  } catch (err) {
    console.error("[api/my-agencies GET]", err);
    return NextResponse.json([], { status: 200 });
  }
}
