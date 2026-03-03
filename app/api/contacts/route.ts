import { NextRequest, NextResponse } from "next/server";
import { eq, desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { contacts, businesses, organizations, agencies, sessions, users } from "@/lib/db/schema";
import { v4 as uuid } from "uuid";

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
    const { searchParams } = new URL(req.url);
    const businessId = searchParams.get("businessId")?.trim();
    if (businessId) {
      const list = await db
        .select()
        .from(contacts)
        .where(eq(contacts.businessId, businessId))
        .orderBy(desc(contacts.createdAt));
      return NextResponse.json(list);
    }
    const list = await db
      .select({
        id: contacts.id,
        firstName: contacts.firstName,
        lastName: contacts.lastName,
        title: contacts.title,
        officeNumber: contacts.officeNumber,
        cellNumber: contacts.cellNumber,
        email: contacts.email,
        businessId: contacts.businessId,
        assignedTo: contacts.assignedTo,
        createdAt: contacts.createdAt,
        businessName: businesses.businessName,
        businessWebsite: businesses.website,
        organizationName: organizations.organizationName,
        organizationWebsite: organizations.website,
        agencyName: agencies.agencyName,
      })
      .from(contacts)
      .leftJoin(businesses, eq(contacts.businessId, businesses.displayId))
      .leftJoin(organizations, eq(contacts.businessId, organizations.displayId))
      .leftJoin(agencies, eq(contacts.businessId, agencies.displayId))
      .orderBy(desc(contacts.createdAt));
    return NextResponse.json(list);
  } catch (err) {
    console.error("[api/contacts GET]", err);
    return NextResponse.json([], { status: 200 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      firstName,
      lastName,
      title,
      officeNumber,
      cellNumber,
      email,
      businessId,
    } = body;

    const emailVal = email != null ? String(email).trim() : "";
    if (emailVal) {
      const [existing] = await db
        .select({ id: contacts.id })
        .from(contacts)
        .where(eq(contacts.email, emailVal))
        .limit(1);
      if (existing) {
        return NextResponse.json(
          { error: "This contact already exists" },
          { status: 400 }
        );
      }
    }

    const id = uuid();
    const username = await getCurrentUsername(req);
    await db.insert(contacts).values({
      id,
      firstName: firstName != null ? String(firstName).trim() : null,
      lastName: lastName != null ? String(lastName).trim() : null,
      title: title != null ? String(title).trim() : null,
      officeNumber: officeNumber != null ? String(officeNumber).trim() : null,
      cellNumber: cellNumber != null ? String(cellNumber).trim() : null,
      email: email != null ? String(email).trim() : null,
      businessId: businessId != null && String(businessId).trim() !== "" ? String(businessId).trim() : null,
      assignedTo: username,
    });

    return NextResponse.json({ success: true, id });
  } catch (err) {
    console.error("[api/contacts POST]", err);
    return NextResponse.json({ error: "Failed to create contact" }, { status: 500 });
  }
}
