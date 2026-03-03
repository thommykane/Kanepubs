import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  proposals,
  activities,
  users,
  sessions,
  businesses,
  organizations,
} from "@/lib/db/schema";

const ORGANIZATION_TYPES = [
  "CVB (City)", "CVB (County)", "CVB (State)", "DMO (City)", "DMO (County)", "DMO (State)",
  "Chamber (City)", "Chamber (County)", "Chamber (State)",
  "City (Government)", "County (Government)", "State (Government)",
];

const BUSINESS_TYPES = [
  "Hotel", "Resort", "Vacation Rental", "Restaurant", "Restaurant Group", "Winery", "Brewery",
  "Distillery", "Food Brand", "Beverage Brand", "Cruise Line", "Airline", "Private Aviation",
  "Travel Agency", "Tour Operator", "Attraction", "Theme Park", "Museum", "Golf Course",
  "Ski Resort", "Spa / Wellness", "Luxury Retail", "Travel Gear Brand", "Transportation Service",
  "Event Venue", "Other",
];

const US_STATES = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA", "HI", "ID", "IL", "IN", "IA",
  "KS", "KY", "LA", "ME", "MD", "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
  "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC", "SD", "TN", "TX", "UT", "VT",
  "VA", "WA", "WV", "WI", "WY",
].sort();

async function getCurrentUser(req: NextRequest): Promise<{ username: string; isAdmin: boolean } | null> {
  const sessionId = req.headers.get("cookie")?.match(/session=([^;]+)/)?.[1];
  if (!sessionId) return null;
  const [session] = await db.select().from(sessions).where(eq(sessions.id, sessionId)).limit(1);
  if (!session || new Date(session.expiresAt) < new Date()) return null;
  const [user] = await db.select().from(users).where(eq(users.id, session.userId)).limit(1);
  if (!user) return null;
  return { username: user.username, isAdmin: user.isAdmin ?? false };
}

/** GET: Dashboard data. Current user's data by default; admins can pass ?for=username to see another user's dashboard. */
export async function GET(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser(req);
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const forUsername = searchParams.get("for")?.trim();
    let username: string;
    if (forUsername && currentUser.isAdmin) {
      const [target] = await db.select({ username: users.username }).from(users).where(eq(users.username, forUsername)).limit(1);
      if (!target) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }
      username = target.username;
    } else {
      username = currentUser.username;
    }
    const allProposals = await db.select().from(proposals);
    const allActivities = await db.select().from(activities);

    const agentProposals = allProposals.filter((p) => p.salesAgent === username);
    const sold = agentProposals.filter((p) => p.status === "sold");
    const totalSalesCount = sold.length;
    const totalSalesDollars = sold.reduce((sum, p) => sum + (p.amount != null ? Number(p.amount) : 0), 0);

    const totalProposals = agentProposals.length;
    const ioOrSold = agentProposals.filter((p) => p.status === "io" || p.status === "sold");
    const pctProposalsToIo = totalProposals > 0 ? (ioOrSold.length / totalProposals) * 100 : 0;
    const pctIoToSold = ioOrSold.length > 0 ? (sold.length / ioOrSold.length) * 100 : 0;

    const agentActivities = allActivities.filter((a) => a.username === username);
    const agentActivityCount = agentActivities.length;
    const daysWithActivity = new Set<string>();
    for (const a of agentActivities) {
      const d = new Date(a.createdAt);
      const dayKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      daysWithActivity.add(dayKey);
    }
    const distinctDays = daysWithActivity.size;
    const avgDailyActivity = distinctDays > 0 ? agentActivityCount / distinctDays : 0;
    const totalIos = ioOrSold.length;
    const pctPropToIo = totalProposals > 0 ? (totalIos / totalProposals) * 100 : 0;
    const pctIoToSoldAgent = totalIos > 0 ? (totalSalesCount / totalIos) * 100 : 0;
    let commissions = 0;
    for (const p of sold) {
      const amt = p.amount != null ? Number(p.amount) : 0;
      commissions += p.geo === "Yes" ? Math.max(0, amt - 1000) * 0.25 : amt * 0.25;
    }

    const agentsData = [{
      username,
      totalActivity: agentActivityCount,
      avgDailyActivity,
      salesCount: totalSalesCount,
      salesDollars: totalSalesDollars,
      totalProposals,
      totalIos,
      pctProposalsToIo: pctPropToIo,
      pctIoToSold: pctIoToSoldAgent,
      totalCommissions: commissions,
    }];

    const salesFromOrgs = sold.filter((p) => p.companyType === "org");
    const salesFromBiz = sold.filter((p) => p.companyType === "business");
    const orgSalesCount = salesFromOrgs.length;
    const orgSalesDollars = salesFromOrgs.reduce((s, p) => s + (p.amount != null ? Number(p.amount) : 0), 0);
    const bizSalesCount = salesFromBiz.length;
    const bizSalesDollars = salesFromBiz.reduce((s, p) => s + (p.amount != null ? Number(p.amount) : 0), 0);

    const orgRows = await db.select({ displayId: organizations.displayId, organizationType: organizations.organizationType }).from(organizations);
    const bizRows = await db.select({ displayId: businesses.displayId, businessType: businesses.businessType }).from(businesses);
    const orgByDisplay = new Map(orgRows.map((r) => [r.displayId, r.organizationType]));
    const bizByDisplay = new Map(bizRows.map((r) => [r.displayId, r.businessType]));

    const salesByOrgType: Record<string, { count: number; dollars: number }> = {};
    for (const p of salesFromOrgs) {
      const t = orgByDisplay.get(p.companyDisplayId) ?? "—";
      if (!salesByOrgType[t]) salesByOrgType[t] = { count: 0, dollars: 0 };
      salesByOrgType[t].count += 1;
      salesByOrgType[t].dollars += p.amount != null ? Number(p.amount) : 0;
    }
    const salesByBizType: Record<string, { count: number; dollars: number }> = {};
    for (const p of salesFromBiz) {
      const t = bizByDisplay.get(p.companyDisplayId) ?? "—";
      if (!salesByBizType[t]) salesByBizType[t] = { count: 0, dollars: 0 };
      salesByBizType[t].count += 1;
      salesByBizType[t].dollars += p.amount != null ? Number(p.amount) : 0;
    }

    const orgStateRows = await db.select({ displayId: organizations.displayId, state: organizations.state }).from(organizations);
    const bizStateRows = await db.select({ displayId: businesses.displayId, state: businesses.state }).from(businesses);
    const stateByOrg = new Map(orgStateRows.map((r) => [r.displayId, r.state]));
    const stateByBiz = new Map(bizStateRows.map((r) => [r.displayId, r.state]));

    const salesByState: Record<string, { count: number; dollars: number }> = {};
    for (const p of sold) {
      const state = p.companyType === "org"
        ? stateByOrg.get(p.companyDisplayId) ?? "—"
        : stateByBiz.get(p.companyDisplayId) ?? "—";
      if (!salesByState[state]) salesByState[state] = { count: 0, dollars: 0 };
      salesByState[state].count += 1;
      salesByState[state].dollars += p.amount != null ? Number(p.amount) : 0;
    }

    const stateList = [...new Set([...Object.keys(salesByState).filter((s) => s && s !== "—"), ...US_STATES])].sort();

    return NextResponse.json({
      totalSalesCount,
      totalSalesDollars,
      totalProposals,
      pctProposalsToIo,
      pctIoToSold,
      agentsData,
      orgSalesCount,
      orgSalesDollars,
      bizSalesCount,
      bizSalesDollars,
      salesByOrgType,
      salesByBizType,
      organizationTypes: ORGANIZATION_TYPES,
      businessTypes: BUSINESS_TYPES,
      stateList,
      salesByState,
      totalSalesForPct: totalSalesDollars,
    });
  } catch (err) {
    console.error("[api/user-dashboard]", err);
    return NextResponse.json({ error: "Failed to load dashboard" }, { status: 500 });
  }
}
