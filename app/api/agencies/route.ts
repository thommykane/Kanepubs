import { NextRequest, NextResponse } from "next/server";
import { desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { agencies, agencyClients, sessions, users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { v4 as uuid } from "uuid";
import { getNextAgencyDisplayId } from "@/lib/next-display-id";

async function getCurrentUsername(req: NextRequest): Promise<string> {
  const sessionId = req.headers.get("cookie")?.match(/session=([^;]+)/)?.[1];
  if (!sessionId) return "Admin";
  const [session] = await db.select().from(sessions).where(eq(sessions.id, sessionId)).limit(1);
  if (!session || new Date(session.expiresAt) < new Date()) return "Admin";
  const [user] = await db.select().from(users).where(eq(users.id, session.userId)).limit(1);
  return user?.username ?? "Admin";
}

export async function GET() {
  try {
    const list = await db.select().from(agencies).orderBy(desc(agencies.createdAt));
    return NextResponse.json(list);
  } catch (err) {
    console.error("[api/agencies GET]", err);
    return NextResponse.json([], { status: 200 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      agencyName,
      address,
      addressLine2,
      city,
      state,
      zipCode,
      phone,
      website,
      clients,
    } = body;

    if (!agencyName || typeof agencyName !== "string" || !agencyName.trim()) {
      return NextResponse.json({ error: "Agency name is required" }, { status: 400 });
    }
    if (!address || !city || !state || !zipCode || !phone || !website) {
      return NextResponse.json(
        { error: "Address, City, State, Zip code, Phone, and Website are required" },
        { status: 400 }
      );
    }
    if (!Array.isArray(clients) || clients.length === 0) {
      return NextResponse.json({ error: "At least one client (business or organization ID) is required" }, { status: 400 });
    }

    const clientIds = clients
      .map((c: unknown) => (typeof c === "string" ? c.trim() : ""))
      .filter((c: string) => c.length > 0);
    if (clientIds.length === 0) {
      return NextResponse.json({ error: "At least one valid client ID is required" }, { status: 400 });
    }

    const username = await getCurrentUsername(req);
    const agencyId = uuid();
    const displayId = await getNextAgencyDisplayId();

    await db.insert(agencies).values({
      id: agencyId,
      displayId,
      agencyName: String(agencyName).trim(),
      address: String(address).trim() || null,
      addressLine2: addressLine2 ? String(addressLine2).trim() : null,
      city: String(city).trim() || null,
      state: String(state).trim() || null,
      zipCode: String(zipCode).trim() || null,
      phone: String(phone).trim() || null,
      website: String(website).trim() || null,
      createdBy: username,
      assignedTo: username,
    });

    for (const companyDisplayId of clientIds) {
      const companyType = companyDisplayId.toUpperCase().startsWith("A") ? "org" : "business";
      await db.insert(agencyClients).values({
        id: uuid(),
        agencyId,
        companyDisplayId,
        companyType,
      });
    }

    return NextResponse.json({ success: true, id: agencyId, displayId });
  } catch (err) {
    console.error("[api/agencies POST]", err);
    return NextResponse.json({ error: "Failed to create agency" }, { status: 500 });
  }
}
