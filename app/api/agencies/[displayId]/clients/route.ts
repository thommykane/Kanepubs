import { NextRequest, NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { db } from "@/lib/db";
import { agencies, agencyClients, organizations, businesses } from "@/lib/db/schema";
import { v4 as uuid } from "uuid";

/** POST: Add a client (organization or business) to an agency. Body: { companyDisplayId: string, companyType: "org" | "business" }. */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ displayId: string }> }
) {
  try {
    const { displayId } = await params;
    const [agency] = await db
      .select({ id: agencies.id })
      .from(agencies)
      .where(eq(agencies.displayId, displayId))
      .limit(1);
    if (!agency) return NextResponse.json({ error: "Agency not found" }, { status: 404 });

    const body = await req.json();
    const companyDisplayId = body?.companyDisplayId != null ? String(body.companyDisplayId).trim() : "";
    const companyType = body?.companyType != null ? String(body.companyType).trim().toLowerCase() : "";
    if (!companyDisplayId || !companyType) {
      return NextResponse.json(
        { error: "companyDisplayId and companyType required" },
        { status: 400 }
      );
    }
    if (companyType !== "org" && companyType !== "business") {
      return NextResponse.json(
        { error: "companyType must be org or business" },
        { status: 400 }
      );
    }

    const [existing] = await db
      .select({ id: agencyClients.id })
      .from(agencyClients)
      .where(and(eq(agencyClients.agencyId, agency.id), eq(agencyClients.companyDisplayId, companyDisplayId)))
      .limit(1);
    if (existing) {
      return NextResponse.json({ error: "This client is already linked to this agency" }, { status: 400 });
    }

    // Ensure the organization or business exists in the database
    if (companyType === "org") {
      const [org] = await db
        .select({ id: organizations.id })
        .from(organizations)
        .where(eq(organizations.displayId, companyDisplayId))
        .limit(1);
      if (!org) {
        return NextResponse.json({ error: "Organization not found with that ID" }, { status: 404 });
      }
    } else {
      const [biz] = await db
        .select({ id: businesses.id })
        .from(businesses)
        .where(eq(businesses.displayId, companyDisplayId))
        .limit(1);
      if (!biz) {
        return NextResponse.json({ error: "Business not found with that ID" }, { status: 404 });
      }
    }

    await db.insert(agencyClients).values({
      id: uuid(),
      agencyId: agency.id,
      companyDisplayId,
      companyType,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[api/agencies displayId/clients POST]", err);
    return NextResponse.json({ error: "Failed to add client" }, { status: 500 });
  }
}

/** DELETE: Remove a client from an agency. Body: { companyDisplayId: string, companyType: "org" | "business" }. */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ displayId: string }> }
) {
  try {
    const { displayId } = await params;
    const [agency] = await db
      .select({ id: agencies.id })
      .from(agencies)
      .where(eq(agencies.displayId, displayId))
      .limit(1);
    if (!agency) return NextResponse.json({ error: "Agency not found" }, { status: 404 });

    const body = await req.json();
    const companyDisplayId = body?.companyDisplayId != null ? String(body.companyDisplayId).trim() : "";
    const companyType = body?.companyType != null ? String(body.companyType).trim().toLowerCase() : "";
    if (!companyDisplayId || !companyType) {
      return NextResponse.json(
        { error: "companyDisplayId and companyType required" },
        { status: 400 }
      );
    }
    if (companyType !== "org" && companyType !== "business") {
      return NextResponse.json(
        { error: "companyType must be org or business" },
        { status: 400 }
      );
    }

    await db
      .delete(agencyClients)
      .where(
        and(
          eq(agencyClients.agencyId, agency.id),
          eq(agencyClients.companyDisplayId, companyDisplayId),
          eq(agencyClients.companyType, companyType)
        )
      );

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[api/agencies displayId/clients DELETE]", err);
    return NextResponse.json({ error: "Failed to remove client" }, { status: 500 });
  }
}
