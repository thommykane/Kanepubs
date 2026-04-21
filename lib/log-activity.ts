import { v4 as uuid } from "uuid";
import { db } from "@/lib/db";
import { activities } from "@/lib/db/schema";

export type CreationActionType =
  | "org_created"
  | "business_created"
  | "agency_created"
  | "contact_added";

/** Infer CRM company type from a display id (contacts.businessId). */
export function inferCompanyTypeFromDisplayId(displayId: string | null | undefined): "org" | "business" | "agency" {
  if (!displayId || typeof displayId !== "string") return "org";
  const d = displayId.trim().toUpperCase();
  if (d.startsWith("AG")) return "agency";
  if (d.startsWith("B")) return "business";
  return "org";
}

/** Records a creation event for All Activity and profile Recent Activity (timestamp + username). */
export async function logCreationActivity(params: {
  companyType: "org" | "business" | "agency";
  companyDisplayId: string;
  actionType: CreationActionType;
  username: string;
  contactId?: string | null;
}) {
  const id = uuid();
  await db.insert(activities).values({
    id,
    companyType: params.companyType,
    companyDisplayId: params.companyDisplayId.trim(),
    contactId: params.contactId ?? null,
    username: params.username,
    actionType: params.actionType,
    notes: null,
    meetingAt: null,
    proposalData: null,
  });
}
