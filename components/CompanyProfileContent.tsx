"use client";

import { useState } from "react";
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

type Props = {
  contactList: Contact[];
  companyType: string;
  companyDisplayId: string;
  children: React.ReactNode; // company info card - renders above contacts in left column
};

export default function CompanyProfileContent({
  contactList,
  companyType,
  companyDisplayId,
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
        <CompanyContactsTable
          contactList={contactList}
          companyType={companyType}
          companyDisplayId={companyDisplayId}
          onActivityCreated={() => setActivityRefresh((t) => t + 1)}
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
          companyType={companyType}
          companyDisplayId={companyDisplayId}
          refreshTrigger={activityRefresh}
        />
      </div>
    </div>
  );
}
