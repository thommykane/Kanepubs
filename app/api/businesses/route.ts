import { NextRequest, NextResponse } from "next/server";
import { desc, and, ilike, isNull, or, lt } from "drizzle-orm";
import { db } from "@/lib/db";
import { businesses, organizations, sessions, users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { v4 as uuid } from "uuid";
import { getTimezoneFromAddress } from "@/lib/timezone-from-address";
import { getNextDisplayId, getMaxDisplayNumber } from "@/lib/next-display-id";
import { normalizeWebsiteUrl } from "@/lib/normalize-website-url";

async function getCurrentUsername(req: NextRequest): Promise<string> {
  const sessionId = req.headers.get("cookie")?.match(/session=([^;]+)/)?.[1];
  if (!sessionId) return "Admin";
  const [session] = await db.select().from(sessions).where(eq(sessions.id, sessionId)).limit(1);
  if (!session || new Date(session.expiresAt) < new Date()) return "Admin";
  const [user] = await db.select().from(users).where(eq(users.id, session.userId)).limit(1);
  return user?.username ?? "Admin";
}

export async function GET(req: NextRequest) {
  try {
    const rowsWithNullDisplayId = await db
      .select({ id: businesses.id })
      .from(businesses)
      .where(isNull(businesses.displayId));
    if (rowsWithNullDisplayId.length > 0) {
      const maxNum = await getMaxDisplayNumber();
      for (let i = 0; i < rowsWithNullDisplayId.length; i++) {
        const nextId = "B" + String(maxNum + 1 + i).padStart(8, "0");
        await db
          .update(businesses)
          .set({ displayId: nextId })
          .where(eq(businesses.id, rowsWithNullDisplayId[i].id));
      }
    }

    const { searchParams } = new URL(req.url);
    const nameQ = searchParams.get("name")?.trim();
    const typeQ = searchParams.get("type")?.trim();
    const tagsQ = searchParams.get("tags")?.trim();

    // Only show leads: businesses with 0 transactions (never sold)
    const leadsOnly = or(lt(businesses.transactions, 1), isNull(businesses.transactions));
    const conditions = [leadsOnly];
    if (nameQ) conditions.push(ilike(businesses.businessName, `%${nameQ}%`));
    if (typeQ) conditions.push(ilike(businesses.businessType, `%${typeQ}%`));
    if (tagsQ) conditions.push(ilike(businesses.tags, `%${tagsQ}%`));
    const list = await db
      .select()
      .from(businesses)
      .where(and(...conditions))
      .orderBy(desc(businesses.createdAt));
    return NextResponse.json(list);
  } catch (err) {
    console.error("[api/businesses GET]", err);
    return NextResponse.json([], { status: 200 });
  }
}

export async function POST(req: NextRequest) {
  try {
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
    } = body;

    if (!businessName || typeof businessName !== "string" || !businessName.trim()) {
      return NextResponse.json(
        { error: "Business name is required" },
        { status: 400 }
      );
    }

    const username = await getCurrentUsername(req);
    const id = uuid();
    const displayId = "B" + (await getNextDisplayId());
    const stateVal = state != null ? String(state).trim() : null;
    const zipVal = zipCode != null ? String(zipCode).trim() : null;
    const timeZone = getTimezoneFromAddress(stateVal, zipVal);
    await db.insert(businesses).values({
      id,
      displayId,
      businessName: String(businessName).trim(),
      address: address != null ? String(address).trim() : null,
      addressLine2: addressLine2 != null ? String(addressLine2).trim() : null,
      city: city != null ? String(city).trim() : null,
      state: stateVal,
      zipCode: zipVal,
      county: county != null ? String(county).trim() : null,
      phone: phone != null ? String(phone).trim() : null,
      website: normalizeWebsiteUrl(website),
      businessType: businessType != null ? String(businessType).trim() : null,
      tags: tags != null ? String(tags).trim() : null,
      timeZone,
      createdBy: username,
      assignedTo: username,
    });

    return NextResponse.json({ success: true, id, displayId });
  } catch (err) {
    console.error("[api/businesses POST]", err);
    return NextResponse.json({ error: "Failed to create business" }, { status: 500 });
  }
}
