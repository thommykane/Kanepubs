import { pgTable, text, timestamp, boolean, integer, numeric, jsonb } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  username: text("username").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  avatarUrl: text("avatar_url"),
  phone: text("phone"),
  isAdmin: boolean("is_admin").default(false),
  accountType: text("account_type"), // 'regional_agent' | 'national_agent' | 'admin' (for permissions)
  mustChangePassword: boolean("must_change_password").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const sessions = pgTable("sessions", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  ipAddress: text("ip_address"),
});

export const businesses = pgTable("businesses", {
  id: text("id").primaryKey(),
  displayId: text("display_id").unique(),
  businessName: text("business_name").notNull(),
  address: text("address"),
  addressLine2: text("address_line2"),
  city: text("city"),
  state: text("state"),
  zipCode: text("zip_code"),
  county: text("county"),
  phone: text("phone"),
  website: text("website"),
  businessType: text("business_type"),
  tags: text("tags"),
  timeZone: text("time_zone"),
  createdBy: text("created_by"),
  assignedTo: text("assigned_to"),
  transactions: integer("transactions").default(0),
  moneySpent: numeric("money_spent", { precision: 12, scale: 2 }).default("0"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const contacts = pgTable("contacts", {
  id: text("id").primaryKey(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  title: text("title"),
  officeNumber: text("office_number"),
  cellNumber: text("cell_number"),
  email: text("email"),
  businessId: text("business_id"),
  assignedTo: text("assigned_to"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const organizations = pgTable("organizations", {
  id: text("id").primaryKey(),
  displayId: text("display_id").unique(),
  organizationName: text("organization_name").notNull(),
  address: text("address"),
  addressLine2: text("address_line2"),
  city: text("city"),
  state: text("state"),
  zipCode: text("zip_code"),
  county: text("county"),
  phone: text("phone"),
  website: text("website"),
  organizationType: text("organization_type"),
  tags: text("tags"),
  timeZone: text("time_zone"),
  createdBy: text("created_by"),
  assignedTo: text("assigned_to"),
  transactions: integer("transactions").default(0),
  moneySpent: numeric("money_spent", { precision: 12, scale: 2 }).default("0"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const agencies = pgTable("agencies", {
  id: text("id").primaryKey(),
  displayId: text("display_id").unique().notNull(),
  agencyName: text("agency_name").notNull(),
  address: text("address"),
  addressLine2: text("address_line2"),
  city: text("city"),
  state: text("state"),
  zipCode: text("zip_code"),
  phone: text("phone"),
  website: text("website"),
  createdBy: text("created_by"),
  assignedTo: text("assigned_to"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

/** Agency clients: businesses or organizations the agency represents (by display ID). */
export const agencyClients = pgTable("agency_clients", {
  id: text("id").primaryKey(),
  agencyId: text("agency_id").notNull().references(() => agencies.id, { onDelete: "cascade" }),
  companyDisplayId: text("company_display_id").notNull(),
  companyType: text("company_type").notNull(), // 'org' | 'business'
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/** Contact actions logged on company profile (No Answer, Left Voicemail, Sent Proposal, etc.) */
export const activities = pgTable("activities", {
  id: text("id").primaryKey(),
  companyType: text("company_type").notNull(), // 'org' | 'business' | 'agency'
  companyDisplayId: text("company_display_id").notNull(),
  contactId: text("contact_id").notNull(),
  username: text("username").notNull(),
  actionType: text("action_type").notNull(),
  notes: text("notes"), // max 50 chars enforced in app
  meetingAt: timestamp("meeting_at"),
  proposalData: jsonb("proposal_data"), // for sent_proposal: { amount, issues, geo, impressions }
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/** Pipeline: proposals (Active Proposals -> Active I/O's -> SOLD) */
export const proposals = pgTable("proposals", {
  id: text("id").primaryKey(),
  companyType: text("company_type").notNull(),
  companyDisplayId: text("company_display_id").notNull(),
  contactId: text("contact_id").notNull(),
  salesAgent: text("sales_agent").notNull(),
  amount: numeric("amount", { precision: 12, scale: 2 }),
  issues: jsonb("issues").$type<{ issue: string; year: string; specialFeatures: string }[]>(),
  geo: text("geo"), // 'Yes' | 'No'
  impressions: integer("impressions"),
  notes: text("notes"), // max 50 chars, from agent at sent_proposal
  status: text("status").notNull(), // 'proposal' | 'io' | 'passed' | 'rejected' | 'sold'
  matDue: timestamp("mat_due"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  statusUpdatedAt: timestamp("status_updated_at"), // when status last changed (e.g. to io or sold)
  assignedTo: text("assigned_to"), // for sold: which sales agent "owns" this client (default salesAgent, admin can reassign)
});
