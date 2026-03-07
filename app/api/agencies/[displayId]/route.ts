import { NextRequest, NextResponse } from "next/server";
import { eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { agencies, agencyClients, businesses, contacts, organizations, sessions, users } from "@/lib/db/schema";

async function requireAdmin(req: NextRequest): Promise<boolean> {
  const sessionId = req.headers.get("cookie")?.match(/session=([^;]+)/)?.[1];
  if (!sessionId) return false;
  const [session] = await db.select().from(sessions).where(eq(sessions.id, sessionId)).limit(1);
  if (!session || new Date(session.expiresAt) < new Date()) return false;
  const [user] = await db.select({ isAdmin: users.isAdmin }).from(users).where(eq(users.id, session.userId)).limit(1);
  return user?.isAdmin ?? false;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ displayId: string }> }
) {
  try {
    const { displayId } = await params;
    const [agency] = await db
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
      .where(eq(agencies.displayId, displayId))
      .limit(1);
    if (!agency) return NextResponse.json({ error: "Agency not found" }, { status: 404 });
    const clients = await db.select().from(agencyClients).where(eq(agencyClients.agencyId, agency.id));
    return NextResponse.json({ agency, clients });
  } catch (err) {
    console.error("[api/agencies displayId GET]", err);
    return NextResponse.json({ error: "Failed to load agency" }, { status: 500 });
  }
}

/** PATCH: Update agency (admin only). Body: { assignedTo?: string }. */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ displayId: string }> }
) {
  try {
    const isAdmin = await requireAdmin(req);
    if (!isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const { displayId } = await params;
    const [agency] = await db
      .select({ id: agencies.id })
      .from(agencies)
      .where(eq(agencies.displayId, displayId))
      .limit(1);
    if (!agency) return NextResponse.json({ error: "Agency not found" }, { status: 404 });
    const body = await req.json();
    const assignedTo = body?.assignedTo !== undefined
      ? (body.assignedTo != null && String(body.assignedTo).trim() !== "" ? String(body.assignedTo).trim() : null)
      : undefined;
    if (assignedTo === undefined) return NextResponse.json({ success: true });
    await db.update(agencies).set({ assignedTo }).where(eq(agencies.id, agency.id));

    // Parent -> children -> grandchild assignment propagation:
    // agency -> linked businesses/orgs -> all related contacts.
    const links = await db
      .select({
        companyType: agencyClients.companyType,
        companyDisplayId: agencyClients.companyDisplayId,
      })
      .from(agencyClients)
      .where(eq(agencyClients.agencyId, agency.id));
    const orgIds = links.filter((l) => l.companyType === "org").map((l) => l.companyDisplayId);
    const bizIds = links.filter((l) => l.companyType === "business").map((l) => l.companyDisplayId);

    if (orgIds.length > 0) {
      await db
        .update(organizations)
        .set({ assignedTo })
        .where(inArray(organizations.displayId, orgIds));
    }
    if (bizIds.length > 0) {
      await db
        .update(businesses)
        .set({ assignedTo })
        .where(inArray(businesses.displayId, bizIds));
    }

    const contactScope = [displayId, ...orgIds, ...bizIds];
    if (contactScope.length > 0) {
      await db
        .update(contacts)
        .set({ assignedTo })
        .where(inArray(contacts.businessId, contactScope));
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[api/agencies displayId PATCH]", err);
    return NextResponse.json({ error: "Failed to update agency" }, { status: 500 });
  }
}
