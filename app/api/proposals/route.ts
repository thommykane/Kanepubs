import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { proposals } from "@/lib/db/schema";
import { getProposalRowsByStatus } from "@/lib/proposal-rows";
import { v4 as uuid } from "uuid";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status")?.trim(); // proposal | io | sold
    if (!status) {
      return NextResponse.json({ error: "status required (proposal, io, or sold)" }, { status: 400 });
    }
    const validStatuses = ["proposal", "io", "sold"] as const;
    if (!validStatuses.includes(status as (typeof validStatuses)[number])) {
      return NextResponse.json({ error: "status must be proposal, io, or sold" }, { status: 400 });
    }

    const rows = await getProposalRowsByStatus(status as "proposal" | "io" | "sold");

    return NextResponse.json(rows);
  } catch (err) {
    console.error("[api/proposals GET]", err);
    return NextResponse.json([], { status: 200 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      companyType,
      companyDisplayId,
      contactId,
      salesAgent,
      amount,
      issues,
      geo,
      impressions,
    } = body;

    if (!companyType || !companyDisplayId || !contactId || !salesAgent) {
      return NextResponse.json(
        { error: "companyType, companyDisplayId, contactId, salesAgent required" },
        { status: 400 }
      );
    }

    const id = uuid();
    const amountVal = amount != null && String(amount).trim() !== "" ? String(amount).trim() : null;
    const issuesVal = Array.isArray(issues) ? issues : null;
    const geoVal = geo != null ? String(geo).trim() : null;
    const impressionsVal =
      impressions != null && String(impressions).trim() !== ""
        ? parseInt(String(impressions).replace(/\D/g, "").slice(0, 7), 10)
        : null;

    await db.insert(proposals).values({
      id,
      companyType: String(companyType).trim(),
      companyDisplayId: String(companyDisplayId).trim(),
      contactId: String(contactId).trim(),
      salesAgent: String(salesAgent).trim(),
      amount: amountVal,
      issues: issuesVal,
      geo: geoVal,
      impressions: Number.isInteger(impressionsVal) ? impressionsVal : null,
      status: "proposal",
    });

    return NextResponse.json({ success: true, id });
  } catch (err) {
    console.error("[api/proposals POST]", err);
    return NextResponse.json({ error: "Failed to create proposal" }, { status: 500 });
  }
}
