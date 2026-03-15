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
    const searchValue = normalized ?? raw;
    const matchBoth = normalized && normalized !== raw;
    const matches: Match[] = [];

    const orgs = await db
      .select({ displayId: organizations.displayId, organizationName: organizations.organizationName })
      .from(organizations)
      .where(
        matchBoth
          ? or(eq(organizations.website, searchValue), eq(organizations.website, raw))
          : eq(organizations.website, searchValue)
      );
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
      .where(
        matchBoth
          ? or(eq(businesses.website, searchValue), eq(businesses.website, raw))
          : eq(businesses.website, searchValue)
      );
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
      .where(
        matchBoth
          ? or(eq(agencies.website, searchValue), eq(agencies.website, raw))
          : eq(agencies.website, searchValue)
      );
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
