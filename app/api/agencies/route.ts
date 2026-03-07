import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { agencies, agencyClients, businesses, contacts, organizations, sessions, users, proposals } from "@/lib/db/schema";
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

async function requireAdmin(req: NextRequest): Promise<boolean> {
  const sessionId = req.headers.get("cookie")?.match(/session=([^;]+)/)?.[1];
  if (!sessionId) return false;
  const [session] = await db.select().from(sessions).where(eq(sessions.id, sessionId)).limit(1);
  if (!session || new Date(session.expiresAt) < new Date()) return false;
  const [user] = await db.select({ isAdmin: users.isAdmin }).from(users).where(eq(users.id, session.userId)).limit(1);
  return user?.isAdmin ?? false;
}

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: NextRequest) {
  try {
    const isAdmin = await requireAdmin(req);
    if (!isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const { searchParams } = new URL(req.url);
    const assignedToQ = searchParams.get("assignedTo")?.trim();

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
        transactions: agencies.transactions,
        moneySpent: agencies.moneySpent,
        createdAt: agencies.createdAt,
      })
      .from(agencies)
      .orderBy(desc(agencies.createdAt));

    const links = await db
      .select({
        agencyId: agencyClients.agencyId,
        companyType: agencyClients.companyType,
        companyDisplayId: agencyClients.companyDisplayId,
      })
      .from(agencyClients);
    const linksByAgency = new Map<string, { companyType: string; companyDisplayId: string }[]>();
    for (const link of links) {
      if (!linksByAgency.has(link.agencyId)) linksByAgency.set(link.agencyId, []);
      linksByAgency.get(link.agencyId)!.push({
        companyType: link.companyType,
        companyDisplayId: link.companyDisplayId,
      });
    }

    const soldRows = await db
      .select({ companyType: proposals.companyType, companyDisplayId: proposals.companyDisplayId })
      .from(proposals)
      .where(eq(proposals.status, "sold"));
    const soldSet = new Set(soldRows.map((r) => `${r.companyType}:${r.companyDisplayId}`));

    const leadAgencies = list.filter((a) => {
      const tx = a.transactions ?? 0;
      const money = a.moneySpent != null ? Number(a.moneySpent) : 0;
      if (tx >= 1 || money > 0) return false;
      if (a.displayId && soldSet.has(`agency:${a.displayId}`)) return false;
      const linked = linksByAgency.get(a.id) ?? [];
      for (const c of linked) {
        if (soldSet.has(`${c.companyType}:${c.companyDisplayId}`)) return false;
      }
      return true;
    });

    const filtered = assignedToQ === "__UNASSIGNED__"
      ? leadAgencies.filter((a) => !a.assignedTo)
      : assignedToQ
        ? leadAgencies.filter((a) => a.assignedTo === assignedToQ)
        : leadAgencies;

    return NextResponse.json(filtered);
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

      // Initial parent assignment propagation on creation.
      if (companyType === "org") {
        await db
          .update(organizations)
          .set({ assignedTo: username })
          .where(eq(organizations.displayId, companyDisplayId));
      } else {
        await db
          .update(businesses)
          .set({ assignedTo: username })
          .where(eq(businesses.displayId, companyDisplayId));
      }
      await db
        .update(contacts)
        .set({ assignedTo: username })
        .where(eq(contacts.businessId, companyDisplayId));
    }

    return NextResponse.json({ success: true, id: agencyId, displayId });
  } catch (err) {
    console.error("[api/agencies POST]", err);
    return NextResponse.json({ error: "Failed to create agency" }, { status: 500 });
  }
}
