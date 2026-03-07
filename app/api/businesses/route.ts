import { NextRequest, NextResponse } from "next/server";
import { desc, and, ilike, isNull, or, lt, notInArray } from "drizzle-orm";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { businesses, organizations, sessions, users, proposals } from "@/lib/db/schema";
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

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function requireAdmin(req: NextRequest): Promise<boolean> {
  const sessionId = req.headers.get("cookie")?.match(/session=([^;]+)/)?.[1];
  if (!sessionId) return false;
  const [session] = await db.select().from(sessions).where(eq(sessions.id, sessionId)).limit(1);
  if (!session || new Date(session.expiresAt) < new Date()) return false;
  const [user] = await db.select({ isAdmin: users.isAdmin }).from(users).where(eq(users.id, session.userId)).limit(1);
  return user?.isAdmin ?? false;
}

export async function GET(req: NextRequest) {
  try {
    const isAdmin = await requireAdmin(req);
    if (!isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

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
    const assignedToQ = searchParams.get("assignedTo")?.trim();

    const normalizeCompanyType = (value: string | null | undefined): "org" | "business" | "agency" | null => {
      const t = String(value ?? "").trim().toLowerCase();
      if (t === "org" || t === "organization") return "org";
      if (t === "business" || t === "biz") return "business";
      if (t === "agency") return "agency";
      return null;
    };

    // Exclude businesses that have any SOLD proposal, including legacy companyType variants.
    const soldRows = await db
      .select({ companyType: proposals.companyType, companyDisplayId: proposals.companyDisplayId })
      .from(proposals)
      .where(eq(proposals.status, "sold"));
    const soldBizDisplayIds = new Set<string>();
    for (const row of soldRows) {
      const displayId = row.companyDisplayId ?? "";
      const normalizedType = normalizeCompanyType(row.companyType);
      const inferredType = normalizedType ?? (displayId.toUpperCase().startsWith("B") ? "business" : null);
      if (inferredType === "business" && displayId) soldBizDisplayIds.add(displayId);
    }
    const soldDisplayIds = Array.from(soldBizDisplayIds);
    const notSoldFilter = soldDisplayIds.length > 0 ? notInArray(businesses.displayId, soldDisplayIds) : undefined;

    const conditions = [];
    if (notSoldFilter) conditions.push(notSoldFilter);
    if (nameQ) conditions.push(ilike(businesses.businessName, `%${nameQ}%`));
    if (typeQ) conditions.push(ilike(businesses.businessType, `%${typeQ}%`));
    if (tagsQ) conditions.push(ilike(businesses.tags, `%${tagsQ}%`));
    if (assignedToQ === "__UNASSIGNED__") conditions.push(isNull(businesses.assignedTo));
    else if (assignedToQ) conditions.push(eq(businesses.assignedTo, assignedToQ));
    const filtered = await db
      .select()
      .from(businesses)
      .where(and(...conditions))
      .orderBy(desc(businesses.createdAt));
    const leadList = filtered.filter((b) => {
      const tx = b.transactions ?? 0;
      const money = b.moneySpent != null ? Number(b.moneySpent) : 0;
      return tx < 1 && money <= 0;
    });
    return NextResponse.json(leadList);
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
