"use client";

import { useState } from "react";
import AgencyClientsTable from "./AgencyClientsTable";
import CompanyContactsTable from "./CompanyContactsTable";
import RecentActivity from "./RecentActivity";

type Contact = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  title: string | null;
  officeNumber: string | null;
  cellNumber: string | null;
  email: string | null;
};

type AgencyClient = { companyDisplayId: string; companyType: string; companyName?: string };

type Props = {
  agencyDisplayId: string;
  clients: AgencyClient[];
  contactList: Contact[];
  children: React.ReactNode;
};

export default function AgencyProfileContent({
  agencyDisplayId,
  clients,
  contactList,
  children,
}: Props) {
  const [activityRefresh, setActivityRefresh] = useState(0);

  return (
    <div
      style={{
        display: "flex",
        gap: "1.5rem",
        alignItems: "stretch",
        width: "100%",
        maxWidth: "1200px",
      }}
    >
      <div
        style={{
          flex: "1 1 0",
          minWidth: 0,
          display: "flex",
          flexDirection: "column",
          gap: "1.5rem",
        }}
      >
        {children}
        <AgencyClientsTable clients={clients} />
        <CompanyContactsTable
          contactList={contactList}
          companyType="agency"
          companyDisplayId={agencyDisplayId}
          onActivityCreated={() => setActivityRefresh((t) => t + 1)}
          agencyClients={clients}
        />
      </div>
      <div
        style={{
          width: "300px",
          flexShrink: 0,
          borderLeft: "1px solid var(--gold-dim)",
          paddingLeft: "1rem",
          minHeight: "200px",
        }}
      >
        <RecentActivity
          companyType="agency"
          companyDisplayId={agencyDisplayId}
          refreshTrigger={activityRefresh}
        />
      </div>
    </div>
  );
}
