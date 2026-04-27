import { normalizeWebsiteUrl } from "@/lib/normalize-website-url";

export function dash(v: string | number | null | undefined): string {
  if (v === null || v === undefined) return "—";
  const s = String(v).trim();
  return s === "" ? "—" : s;
}

export type ContactPlain = {
  firstName?: string | null;
  lastName?: string | null;
  title?: string | null;
  officeNumber?: string | null;
  cellNumber?: string | null;
  email?: string | null;
};

export function formatMoneyPlain(val: string | null | undefined): string {
  if (val == null || val === "") return "0.00";
  const n = Number(val);
  if (Number.isNaN(n)) return "0.00";
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function websitePlain(raw: string | null | undefined): string {
  if (raw == null || String(raw).trim() === "") return "—";
  return normalizeWebsiteUrl(raw) ?? String(raw).trim();
}

function appendContacts(lines: string[], contacts: ContactPlain[]) {
  if (!contacts.length) return;
  lines.push("");
  lines.push("Contacts:");
  for (const c of contacts) {
    const name = [c.firstName, c.lastName].filter(Boolean).join(" ").trim() || "—";
    const bits: string[] = [name];
    if (c.title && String(c.title).trim()) bits.push(String(c.title).trim());
    if (c.officeNumber && String(c.officeNumber).trim()) bits.push(`Office: ${String(c.officeNumber).trim()}`);
    if (c.cellNumber && String(c.cellNumber).trim()) bits.push(`Cell: ${String(c.cellNumber).trim()}`);
    if (c.email && String(c.email).trim()) bits.push(`Email: ${String(c.email).trim()}`);
    lines.push(`- ${bits.join(" | ")}`);
  }
}

/** Fields align with organization detail page + contacts. */
export function buildOrganizationPlainText(params: {
  org: {
    organizationName?: string | null;
    displayId?: string | null;
    address?: string | null;
    addressLine2?: string | null;
    city?: string | null;
    state?: string | null;
    zipCode?: string | null;
    county?: string | null;
    timeZone?: string | null;
    phone?: string | null;
    website?: string | null;
    organizationType?: string | null;
    tags?: string | null;
    createdBy?: string | null;
    assignedTo?: string | null;
  };
  transactions: number;
  moneySpentRaw: string | null | undefined;
  agency?: { agencyName: string | null | undefined; agencyDisplayId: string | null | undefined } | null;
  contacts: ContactPlain[];
}): string {
  const { org, transactions, moneySpentRaw, agency, contacts } = params;
  const lines: string[] = [];
  lines.push(`Organization: ${dash(org.organizationName)}`);
  lines.push("");
  lines.push(`ID: ${dash(org.displayId)}`);
  lines.push(`Address: ${dash(org.address)}`);
  if (org.addressLine2 && String(org.addressLine2).trim()) lines.push(`Apt / PO Box: ${String(org.addressLine2).trim()}`);
  if (org.city && String(org.city).trim()) lines.push(`City: ${String(org.city).trim()}`);
  if (org.state && String(org.state).trim()) lines.push(`State: ${String(org.state).trim()}`);
  if (org.zipCode && String(org.zipCode).trim()) lines.push(`Zip code: ${String(org.zipCode).trim()}`);
  if (org.county && String(org.county).trim()) lines.push(`County: ${String(org.county).trim()}`);
  lines.push(`Time zone: ${dash(org.timeZone)}`);
  lines.push(`Phone: ${dash(org.phone)}`);
  lines.push(`Website: ${websitePlain(org.website ?? null)}`);
  lines.push(`Type: ${dash(org.organizationType)}`);
  lines.push(`Tags: ${dash(org.tags)}`);
  lines.push(`Created by: ${dash(org.createdBy)}`);
  lines.push(`Assigned to: ${dash(org.assignedTo)}`);
  lines.push(`Transactions: ${transactions}`);
  lines.push(`Money spent: ${formatMoneyPlain(moneySpentRaw)}`);
  if (agency?.agencyDisplayId) {
    lines.push(
      `Agency: ${dash(agency.agencyName)} (ID ${String(agency.agencyDisplayId).trim()})`
    );
  }
  appendContacts(lines, contacts);
  return lines.join("\n");
}

export function buildBusinessPlainText(params: {
  business: {
    businessName?: string | null;
    displayId?: string | null;
    address?: string | null;
    addressLine2?: string | null;
    city?: string | null;
    state?: string | null;
    zipCode?: string | null;
    county?: string | null;
    phone?: string | null;
    website?: string | null;
    businessType?: string | null;
    tags?: string | null;
    createdBy?: string | null;
    assignedTo?: string | null;
  };
  transactions: number;
  moneySpentRaw: string | null | undefined;
  agency?: { agencyName: string | null | undefined; agencyDisplayId: string | null | undefined } | null;
  contacts: ContactPlain[];
}): string {
  const { business, transactions, moneySpentRaw, agency, contacts } = params;
  const lines: string[] = [];
  lines.push(`Business: ${dash(business.businessName)}`);
  lines.push("");
  lines.push(`ID: ${dash(business.displayId)}`);
  lines.push(`Address: ${dash(business.address)}`);
  if (business.addressLine2 && String(business.addressLine2).trim())
    lines.push(`Apt / PO Box: ${String(business.addressLine2).trim()}`);
  if (business.city && String(business.city).trim()) lines.push(`City: ${String(business.city).trim()}`);
  if (business.state && String(business.state).trim()) lines.push(`State: ${String(business.state).trim()}`);
  if (business.zipCode && String(business.zipCode).trim()) lines.push(`Zip code: ${String(business.zipCode).trim()}`);
  if (business.county && String(business.county).trim()) lines.push(`County: ${String(business.county).trim()}`);
  lines.push(`Phone: ${dash(business.phone)}`);
  lines.push(`Website: ${websitePlain(business.website ?? null)}`);
  lines.push(`Type: ${dash(business.businessType)}`);
  lines.push(`Tags: ${dash(business.tags)}`);
  lines.push(`Created by: ${dash(business.createdBy)}`);
  lines.push(`Assigned to: ${dash(business.assignedTo)}`);
  lines.push(`Transactions: ${transactions}`);
  lines.push(`Money spent: ${formatMoneyPlain(moneySpentRaw)}`);
  if (agency?.agencyDisplayId) {
    lines.push(
      `Agency: ${dash(agency.agencyName)} (ID ${String(agency.agencyDisplayId).trim()})`
    );
  }
  appendContacts(lines, contacts);
  return lines.join("\n");
}

export type AgencyClientPlain = {
  companyDisplayId: string;
  companyType: string;
  companyName?: string | null;
};

export function buildAgencyPlainText(params: {
  agency: {
    agencyName?: string | null;
    displayId?: string | null;
    address?: string | null;
    addressLine2?: string | null;
    city?: string | null;
    state?: string | null;
    zipCode?: string | null;
    phone?: string | null;
    website?: string | null;
    agencyType?: string | null;
    tags?: string | null;
    createdBy?: string | null;
    assignedTo?: string | null;
  };
  transactions: number;
  moneySpentRaw: string | null | undefined;
  clients: AgencyClientPlain[];
  contacts: ContactPlain[];
}): string {
  const { agency, transactions, moneySpentRaw, clients, contacts } = params;
  const lines: string[] = [];
  lines.push(`Agency: ${dash(agency.agencyName)}`);
  lines.push("");
  lines.push(`ID: ${dash(agency.displayId)}`);
  lines.push(`Address: ${dash(agency.address)}`);
  if (agency.addressLine2 && String(agency.addressLine2).trim())
    lines.push(`Suite: ${String(agency.addressLine2).trim()}`);
  if (agency.city && String(agency.city).trim()) lines.push(`City: ${String(agency.city).trim()}`);
  if (agency.state && String(agency.state).trim()) lines.push(`State: ${String(agency.state).trim()}`);
  if (agency.zipCode && String(agency.zipCode).trim()) lines.push(`Zip code: ${String(agency.zipCode).trim()}`);
  lines.push(`Phone: ${dash(agency.phone)}`);
  lines.push(`Website: ${websitePlain(agency.website ?? null)}`);
  lines.push(`Type: ${dash(agency.agencyType)}`);
  lines.push(`Tags: ${dash(agency.tags)}`);
  lines.push(`Created by: ${dash(agency.createdBy)}`);
  lines.push(`Assigned to: ${dash(agency.assignedTo)}`);
  lines.push(`Transactions: ${transactions}`);
  lines.push(`Money spent: ${formatMoneyPlain(moneySpentRaw)}`);

  if (clients.length > 0) {
    lines.push("");
    lines.push("Linked clients:");
    for (const cl of clients) {
      const kind = cl.companyType === "org" ? "organization" : "business";
      lines.push(`- ${dash(cl.companyName ?? cl.companyDisplayId)} (${cl.companyDisplayId}) — ${kind}`);
    }
  }

  appendContacts(lines, contacts);
  return lines.join("\n");
}
