import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { businesses } from "@/lib/db/schema";
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
      businessName,
      address,
      addressLine2,
      city,
      state,
      zipCode,
      county,
      phone,
      website,
      businessType,
      tags,
      assignedTo,
    } = body;

    const update: Record<string, string | null> = {};
    if (businessName !== undefined) update.businessName = businessName != null ? String(businessName).trim() : null;
    if (address !== undefined) update.address = address != null ? String(address).trim() : null;
    if (addressLine2 !== undefined) update.addressLine2 = addressLine2 != null ? String(addressLine2).trim() : null;
    if (city !== undefined) update.city = city != null ? String(city).trim() : null;
    if (state !== undefined) update.state = state != null ? String(state).trim() : null;
    if (zipCode !== undefined) update.zipCode = zipCode != null ? String(zipCode).trim() : null;
    if (county !== undefined) update.county = county != null ? String(county).trim() : null;
    if (phone !== undefined) update.phone = phone != null ? String(phone).trim() : null;
    if (website !== undefined) update.website = normalizeWebsiteUrl(website);
    if (businessType !== undefined) update.businessType = businessType != null ? String(businessType).trim() : null;
    if (tags !== undefined) update.tags = tags != null ? String(tags).trim() : null;
    if (assignedTo !== undefined) update.assignedTo = assignedTo != null ? String(assignedTo).trim() : null;

    const addressKeys = ["state", "address", "addressLine2", "city", "zipCode"];
    const hasAddressChange = addressKeys.some((k) => update[k] !== undefined);
    if (hasAddressChange) {
      const [current] = await db.select({ state: businesses.state, zipCode: businesses.zipCode }).from(businesses).where(eq(businesses.id, id)).limit(1);
      const stateVal = update.state !== undefined ? update.state : (current?.state ?? null);
      const zipVal = update.zipCode !== undefined ? update.zipCode : (current?.zipCode ?? null);
      update.timeZone = getTimezoneFromAddress(stateVal, zipVal);
    }

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ success: true });
    }

    await db.update(businesses).set(update).where(eq(businesses.id, id));
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[api/businesses PATCH]", err);
    return NextResponse.json({ error: "Failed to update business" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await db.delete(businesses).where(eq(businesses.id, id));
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[api/businesses DELETE]", err);
    return NextResponse.json({ error: "Failed to delete business" }, { status: 500 });
  }
}
