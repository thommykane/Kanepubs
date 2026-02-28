import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { proposals, activities, sessions, users, businesses, organizations } from "@/lib/db/schema";
import { v4 as uuid } from "uuid";

async function getCurrentUsername(req: NextRequest): Promise<string> {
  const sessionId = req.headers.get("cookie")?.match(/session=([^;]+)/)?.[1];
  if (!sessionId) return "Admin";
  const [session] = await db.select().from(sessions).where(eq(sessions.id, sessionId)).limit(1);
  if (!session || new Date(session.expiresAt) < new Date()) return "Admin";
  const [user] = await db.select().from(users).where(eq(users.id, session.userId)).limit(1);
  return user?.username ?? "Admin";
}

async function requireAdmin(req: NextRequest): Promise<boolean> {
  const sessionId = req.headers.get("cookie")?.match(/session=([^;]+)/)?.[1];
  if (!sessionId) return false;
  const [session] = await db.select().from(sessions).where(eq(sessions.id, sessionId)).limit(1);
  if (!session || new Date(session.expiresAt) < new Date()) return false;
  const [user] = await db.select({ isAdmin: users.isAdmin }).from(users).where(eq(users.id, session.userId)).limit(1);
  return user?.isAdmin ?? false;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { status, matDue } = body;

    const [proposal] = await db.select().from(proposals).where(eq(proposals.id, id)).limit(1);
    if (!proposal) {
      return NextResponse.json({ error: "Proposal not found" }, { status: 404 });
    }

    const username = await getCurrentUsername(req);

    if (status === "passed") {
      await db.update(proposals).set({ status: "passed", statusUpdatedAt: new Date() }).where(eq(proposals.id, id));
      await db.insert(activities).values({
        id: uuid(),
        companyType: proposal.companyType,
        companyDisplayId: proposal.companyDisplayId,
        contactId: proposal.contactId,
        username,
        actionType: "passed_on_proposal",
      });
      return NextResponse.json({ success: true });
    }

    if (status === "io") {
      await db.update(proposals).set({ status: "io", statusUpdatedAt: new Date() }).where(eq(proposals.id, id));
      await db.insert(activities).values({
        id: uuid(),
        companyType: proposal.companyType,
        companyDisplayId: proposal.companyDisplayId,
        contactId: proposal.contactId,
        username,
        actionType: "sent_io",
      });
      return NextResponse.json({ success: true });
    }

    if (status === "rejected") {
      await db.update(proposals).set({ status: "rejected", statusUpdatedAt: new Date() }).where(eq(proposals.id, id));
      await db.insert(activities).values({
        id: uuid(),
        companyType: proposal.companyType,
        companyDisplayId: proposal.companyDisplayId,
        contactId: proposal.contactId,
        username,
        actionType: "rejected_io",
      });
      return NextResponse.json({ success: true });
    }

    if (status === "sold") {
      const matDueVal =
        matDue != null && String(matDue).trim() !== "" ? new Date(matDue) : null;
      if (matDueVal && isNaN(matDueVal.getTime())) {
        return NextResponse.json({ error: "Invalid matDue date" }, { status: 400 });
      }
      await db
        .update(proposals)
        .set({ status: "sold", matDue: matDueVal, statusUpdatedAt: new Date(), assignedTo: proposal.salesAgent })
        .where(eq(proposals.id, id));
      await db.insert(activities).values({
        id: uuid(),
        companyType: proposal.companyType,
        companyDisplayId: proposal.companyDisplayId,
        contactId: proposal.contactId,
        username,
        actionType: "sold",
      });

      // Add sale amount to Money Spent and increment Transactions on the business or organization
      const saleAmount = proposal.amount != null ? Number(proposal.amount) : 0;
      if (proposal.companyType === "business") {
        const [b] = await db
          .select()
          .from(businesses)
          .where(eq(businesses.displayId, proposal.companyDisplayId))
          .limit(1);
        if (b) {
          const currentMoney = b.moneySpent != null ? Number(b.moneySpent) : 0;
          const currentTx = b.transactions ?? 0;
          await db
            .update(businesses)
            .set({
              moneySpent: (currentMoney + saleAmount).toFixed(2),
              transactions: currentTx + 1,
            })
            .where(eq(businesses.id, b.id));
        }
      } else if (proposal.companyType === "org") {
        const [o] = await db
          .select()
          .from(organizations)
          .where(eq(organizations.displayId, proposal.companyDisplayId))
          .limit(1);
        if (o) {
          const currentMoney = o.moneySpent != null ? Number(o.moneySpent) : 0;
          const currentTx = o.transactions ?? 0;
          await db
            .update(organizations)
            .set({
              moneySpent: (currentMoney + saleAmount).toFixed(2),
              transactions: currentTx + 1,
            })
            .where(eq(organizations.id, o.id));
        }
      }

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  } catch (err) {
    console.error("[api/proposals PATCH]", err);
    return NextResponse.json({ error: "Failed to update proposal" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const isAdmin = await requireAdmin(req);
    if (!isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const { id } = await params;
    await db.delete(proposals).where(eq(proposals.id, id));
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[api/proposals DELETE]", err);
    return NextResponse.json({ error: "Failed to delete proposal" }, { status: 500 });
  }
}
