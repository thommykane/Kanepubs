import { NextRequest, NextResponse } from "next/server";
import { eq, desc, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { contacts, businesses, organizations, sessions, users } from "@/lib/db/schema";

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

    const myOrgIds = await db
      .select({ displayId: organizations.displayId })
      .from(organizations)
      .where(eq(organizations.assignedTo, username));
    const myBizIds = await db
      .select({ displayId: businesses.displayId })
      .from(businesses)
      .where(eq(businesses.assignedTo, username));

    const displayIds = [
      ...myOrgIds.map((r) => r.displayId).filter(Boolean),
      ...myBizIds.map((r) => r.displayId).filter(Boolean),
    ] as string[];
    if (displayIds.length === 0) {
      return NextResponse.json([]);
    }

    const list = await db
      .select({
        id: contacts.id,
        firstName: contacts.firstName,
        lastName: contacts.lastName,
        title: contacts.title,
        officeNumber: contacts.officeNumber,
        cellNumber: contacts.cellNumber,
        email: contacts.email,
        businessId: contacts.businessId,
        assignedTo: contacts.assignedTo,
        createdAt: contacts.createdAt,
        businessName: businesses.businessName,
        businessWebsite: businesses.website,
        organizationName: organizations.organizationName,
        organizationWebsite: organizations.website,
      })
      .from(contacts)
      .leftJoin(businesses, eq(contacts.businessId, businesses.displayId))
      .leftJoin(organizations, eq(contacts.businessId, organizations.displayId))
      .where(inArray(contacts.businessId, displayIds))
      .orderBy(desc(contacts.createdAt));

    return NextResponse.json(list);
  } catch (err) {
    console.error("[api/my-contacts GET]", err);
    return NextResponse.json([], { status: 200 });
  }
}
