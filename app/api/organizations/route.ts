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

export async function GET(req: NextRequest) {
  try {
    const rowsWithNullDisplayId = await db
      .select({ id: organizations.id })
      .from(organizations)
      .where(isNull(organizations.displayId));
    if (rowsWithNullDisplayId.length > 0) {
      const maxNum = await getMaxDisplayNumber();
      for (let i = 0; i < rowsWithNullDisplayId.length; i++) {
        const nextId = "A" + String(maxNum + 1 + i).padStart(8, "0");
        await db
          .update(organizations)
          .set({ displayId: nextId })
          .where(eq(organizations.id, rowsWithNullDisplayId[i].id));
      }
    }

    const { searchParams } = new URL(req.url);
    const nameQ = searchParams.get("name")?.trim();
    const typeQ = searchParams.get("type")?.trim();
    const tagsQ = searchParams.get("tags")?.trim();

    // Exclude orgs that have any sold proposal (source of truth), and those with transactions >= 1
    const soldOrgIds = await db
      .select({ companyDisplayId: proposals.companyDisplayId })
      .from(proposals)
      .where(and(eq(proposals.status, "sold"), eq(proposals.companyType, "org")));
    const soldDisplayIds = soldOrgIds.map((r) => r.companyDisplayId).filter(Boolean);
    const leadsOnly =
      soldDisplayIds.length > 0
        ? notInArray(organizations.displayId, soldDisplayIds)
        : undefined;

    const conditions = [];
    if (leadsOnly) conditions.push(leadsOnly);
    conditions.push(or(lt(organizations.transactions, 1), isNull(organizations.transactions)));
    if (nameQ) conditions.push(ilike(organizations.organizationName, `%${nameQ}%`));
    if (typeQ) conditions.push(ilike(organizations.organizationType, `%${typeQ}%`));
    if (tagsQ) conditions.push(ilike(organizations.tags, `%${tagsQ}%`));
    const list = await db
      .select()
      .from(organizations)
      .where(and(...conditions))
      .orderBy(desc(organizations.createdAt));
    return NextResponse.json(list);
  } catch (err) {
    console.error("[api/organizations GET]", err);
    return NextResponse.json([], { status: 200 });
  }
}

export async function POST(req: NextRequest) {
  try {
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
    } = body;

    if (!organizationName || typeof organizationName !== "string" || !organizationName.trim()) {
      return NextResponse.json(
        { error: "Organization name is required" },
        { status: 400 }
      );
    }

    const websiteNorm = normalizeWebsiteUrl(website);
    if (websiteNorm) {
      const [existing] = await db
        .select({ id: organizations.id })
        .from(organizations)
        .where(eq(organizations.website, websiteNorm))
        .limit(1);
      if (existing) {
        return NextResponse.json(
          { error: "An organization with this website already exists." },
          { status: 400 }
        );
      }
    }

    const username = await getCurrentUsername(req);
    const id = uuid();
    const displayId = "A" + (await getNextDisplayId());
    const stateVal = state != null ? String(state).trim() : null;
    const zipVal = zipCode != null ? String(zipCode).trim() : null;
    const timeZone = getTimezoneFromAddress(stateVal, zipVal);
    await db.insert(organizations).values({
      id,
      displayId,
      organizationName: String(organizationName).trim(),
      address: address != null ? String(address).trim() : null,
      addressLine2: addressLine2 != null ? String(addressLine2).trim() : null,
      city: city != null ? String(city).trim() : null,
      state: stateVal,
      zipCode: zipVal,
      county: county != null ? String(county).trim() : null,
      phone: phone != null ? String(phone).trim() : null,
      website: normalizeWebsiteUrl(website),
      organizationType: organizationType != null ? String(organizationType).trim() : null,
      tags: tags != null ? String(tags).trim() : null,
      timeZone,
      createdBy: username,
      assignedTo: username,
    });

    return NextResponse.json({ success: true, id, displayId });
  } catch (err) {
    console.error("[api/organizations POST]", err);
    return NextResponse.json({ error: "Failed to create organization" }, { status: 500 });
  }
}
