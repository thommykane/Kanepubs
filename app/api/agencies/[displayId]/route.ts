import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { agencies, agencyClients } from "@/lib/db/schema";

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
