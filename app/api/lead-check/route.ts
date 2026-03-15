import { NextRequest, NextResponse } from "next/server";
import { eq, or } from "drizzle-orm";
import { db } from "@/lib/db";
import { organizations, businesses, agencies } from "@/lib/db/schema";
import { normalizeWebsiteUrl } from "@/lib/normalize-website-url";

export const dynamic = "force-dynamic";

type Match = {
  type: "organization" | "business" | "agency";
  displayId: string;
  name: string;
};

function websiteCondition(
  column: typeof organizations.website,
  normalized: string | null,
  raw: string
) {
  const searchValue = normalized ?? raw;
  if (normalized && normalized !== raw) {
    return or(eq(column, searchValue), eq(column, raw));
  }
  return eq(column, searchValue);
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const raw = searchParams.get("website")?.trim();
    if (!raw) {
      return NextResponse.json(
        { error: "website query parameter required" },
        { status: 400 }
      );
    }

    const normalized = normalizeWebsiteUrl(raw);
    const matches: Match[] = [];

    const orgs = await db
      .select({ displayId: organizations.displayId, organizationName: organizations.organizationName })
      .from(organizations)
      .where(websiteCondition(organizations.website, normalized, raw));
    for (const row of orgs) {
      if (row.displayId) {
        matches.push({
          type: "organization",
          displayId: row.displayId,
          name: row.organizationName ?? row.displayId,
        });
      }
    }

    const bizs = await db
      .select({ displayId: businesses.displayId, businessName: businesses.businessName })
      .from(businesses)
      .where(websiteCondition(businesses.website, normalized, raw));
    for (const row of bizs) {
      if (row.displayId) {
        matches.push({
          type: "business",
          displayId: row.displayId,
          name: row.businessName ?? row.displayId,
        });
      }
    }

    const agys = await db
      .select({ displayId: agencies.displayId, agencyName: agencies.agencyName })
      .from(agencies)
      .where(websiteCondition(agencies.website, normalized, raw));
    for (const row of agys) {
      if (row.displayId) {
        matches.push({
          type: "agency",
          displayId: row.displayId,
          name: row.agencyName ?? row.displayId,
        });
      }
    }

    return NextResponse.json({ matches });
  } catch (err) {
    console.error("[api/lead-check]", err);
    return NextResponse.json(
      { error: "Failed to check lead" },
      { status: 500 }
    );
  }
}
