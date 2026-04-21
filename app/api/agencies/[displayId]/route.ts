import { NextRequest, NextResponse } from "next/server";
import { eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { agencies, agencyClients, businesses, contacts, organizations, sessions, users } from "@/lib/db/schema";
import { normalizeWebsiteUrl } from "@/lib/normalize-website-url";

async function requireAdmin(req: NextRequest): Promise<boolean> {
  const sessionId = req.headers.get("cookie")?.match(/session=([^;]+)/)?.[1];
  if (!sessionId) return false;
  const [session] = await db.select().from(sessions).where(eq(sessions.id, sessionId)).limit(1);
  if (!session || new Date(session.expiresAt) < new Date()) return false;
  const [user] = await db.select({ isAdmin: users.isAdmin }).from(users).where(eq(users.id, session.userId)).limit(1);
  return user?.isAdmin ?? false;
}

async function propagateAssignedToLinkedClients(
  agencyId: string,
  agencyDisplayId: string,
  assignedTo: string | null
) {
  const links = await db
    .select({
      companyType: agencyClients.companyType,
      companyDisplayId: agencyClients.companyDisplayId,
    })
    .from(agencyClients)
    .where(eq(agencyClients.agencyId, agencyId));
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

  const contactScope = [agencyDisplayId, ...orgIds, ...bizIds];
  if (contactScope.length > 0) {
    await db
      .update(contacts)
      .set({ assignedTo })
      .where(inArray(contacts.businessId, contactScope));
  }
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

/** PATCH: Update agency (admin only). */
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
    const {
      agencyName,
      address,
      addressLine2,
      city,
      state,
      zipCode,
      phone,
      website,
      agencyType,
      tags,
      assignedTo,
    } = body;

    const update: Record<string, unknown> = { updatedAt: new Date() };
    if (agencyName !== undefined) {
      const v = agencyName != null ? String(agencyName).trim() : "";
      if (!v) return NextResponse.json({ error: "Agency name cannot be empty" }, { status: 400 });
      update.agencyName = v;
    }
    if (address !== undefined) update.address = address != null ? String(address).trim() : null;
    if (addressLine2 !== undefined) update.addressLine2 = addressLine2 != null ? String(addressLine2).trim() : null;
    if (city !== undefined) update.city = city != null ? String(city).trim() : null;
    if (state !== undefined) update.state = state != null ? String(state).trim() : null;
    if (zipCode !== undefined) update.zipCode = zipCode != null ? String(zipCode).trim() : null;
    if (phone !== undefined) update.phone = phone != null ? String(phone).trim() : null;
    if (website !== undefined) update.website = normalizeWebsiteUrl(website);
    if (agencyType !== undefined) update.agencyType = agencyType != null ? String(agencyType).trim() : null;
    if (tags !== undefined) update.tags = tags != null ? String(tags).trim() : null;

    const assignedToProvided = Object.prototype.hasOwnProperty.call(body, "assignedTo");
    let assignedToValue: string | null | undefined;
    if (assignedToProvided) {
      assignedToValue =
        assignedTo != null && String(assignedTo).trim() !== "" ? String(assignedTo).trim() : null;
      update.assignedTo = assignedToValue;
    }

    const keys = Object.keys(update).filter((k) => k !== "updatedAt");
    if (keys.length === 0 && !assignedToProvided) {
      return NextResponse.json({ success: true });
    }

    await db.update(agencies).set(update as Record<string, never>).where(eq(agencies.id, agency.id));

    if (assignedToProvided) {
      await propagateAssignedToLinkedClients(agency.id, displayId, assignedToValue ?? null);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[api/agencies displayId PATCH]", err);
    return NextResponse.json({ error: "Failed to update agency" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ displayId: string }> }
) {
  try {
    const isAdmin = await requireAdmin(_req);
    if (!isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const { displayId } = await params;
    const [row] = await db
      .select({ id: agencies.id })
      .from(agencies)
      .where(eq(agencies.displayId, displayId))
      .limit(1);
    if (!row) return NextResponse.json({ error: "Agency not found" }, { status: 404 });
    await db.delete(agencies).where(eq(agencies.id, row.id));
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[api/agencies displayId DELETE]", err);
    return NextResponse.json({ error: "Failed to delete agency" }, { status: 500 });
  }
}
