import { NextRequest, NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { db } from "@/lib/db";
import { agencies, agencyClients } from "@/lib/db/schema";
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
