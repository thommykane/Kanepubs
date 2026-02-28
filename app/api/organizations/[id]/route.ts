import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { organizations } from "@/lib/db/schema";
import { getTimezoneFromAddress } from "@/lib/timezone-from-address";
import { normalizeWebsiteUrl } from "@/lib/normalize-website-url";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const {
      organizationName,
      address,
      addressLine2,
      city,
      state,
      zipCode,
      county,
      phone,
      website,
      organizationType,
      tags,
      assignedTo,
    } = body;

    const update: Record<string, string | null> = {};
    if (organizationName !== undefined) update.organizationName = organizationName != null ? String(organizationName).trim() : null;
    if (address !== undefined) update.address = address != null ? String(address).trim() : null;
    if (addressLine2 !== undefined) update.addressLine2 = addressLine2 != null ? String(addressLine2).trim() : null;
    if (city !== undefined) update.city = city != null ? String(city).trim() : null;
    if (state !== undefined) update.state = state != null ? String(state).trim() : null;
    if (zipCode !== undefined) update.zipCode = zipCode != null ? String(zipCode).trim() : null;
    if (county !== undefined) update.county = county != null ? String(county).trim() : null;
    if (phone !== undefined) update.phone = phone != null ? String(phone).trim() : null;
    if (website !== undefined) update.website = normalizeWebsiteUrl(website);
    if (organizationType !== undefined) update.organizationType = organizationType != null ? String(organizationType).trim() : null;
    if (tags !== undefined) update.tags = tags != null ? String(tags).trim() : null;
    if (assignedTo !== undefined) update.assignedTo = assignedTo != null ? String(assignedTo).trim() : null;

    const addressKeys = ["state", "address", "addressLine2", "city", "zipCode"];
    const hasAddressChange = addressKeys.some((k) => update[k] !== undefined);
    if (hasAddressChange) {
      const [current] = await db.select({ state: organizations.state, zipCode: organizations.zipCode }).from(organizations).where(eq(organizations.id, id)).limit(1);
      const stateVal = update.state !== undefined ? update.state : (current?.state ?? null);
      const zipVal = update.zipCode !== undefined ? update.zipCode : (current?.zipCode ?? null);
      update.timeZone = getTimezoneFromAddress(stateVal, zipVal);
    }

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ success: true });
    }

    await db.update(organizations).set(update).where(eq(organizations.id, id));
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[api/organizations PATCH]", err);
    return NextResponse.json({ error: "Failed to update organization" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await db.delete(organizations).where(eq(organizations.id, id));
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[api/organizations DELETE]", err);
    return NextResponse.json({ error: "Failed to delete organization" }, { status: 500 });
  }
}
