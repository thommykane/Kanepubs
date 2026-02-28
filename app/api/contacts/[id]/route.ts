import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { contacts } from "@/lib/db/schema";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const {
      firstName,
      lastName,
      title,
      officeNumber,
      cellNumber,
      email,
      businessId,
      assignedTo,
    } = body;

    const update: Record<string, string | null> = {};
    if (firstName !== undefined) update.firstName = firstName != null ? String(firstName).trim() : null;
    if (lastName !== undefined) update.lastName = lastName != null ? String(lastName).trim() : null;
    if (title !== undefined) update.title = title != null ? String(title).trim() : null;
    if (officeNumber !== undefined) update.officeNumber = officeNumber != null ? String(officeNumber).trim() : null;
    if (cellNumber !== undefined) update.cellNumber = cellNumber != null ? String(cellNumber).trim() : null;
    if (email !== undefined) update.email = email != null ? String(email).trim() : null;
    if (businessId !== undefined) update.businessId = businessId != null && String(businessId).trim() !== "" ? String(businessId).trim() : null;
    if (assignedTo !== undefined) update.assignedTo = assignedTo != null ? String(assignedTo).trim() : null;

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ success: true });
    }

    await db.update(contacts).set(update).where(eq(contacts.id, id));
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[api/contacts PATCH]", err);
    return NextResponse.json({ error: "Failed to update contact" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await db.delete(contacts).where(eq(contacts.id, id));
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[api/contacts DELETE]", err);
    return NextResponse.json({ error: "Failed to delete contact" }, { status: 500 });
  }
}
