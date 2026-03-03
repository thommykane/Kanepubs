import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import ProfileDashboard from "@/components/ProfileDashboard";

type Props = { params: Promise<{ username: string }> };

export default async function UserProfilePage({ params }: Props) {
  const { username } = await params;
  let user;
  try {
    const rows = await db
      .select()
      .from(users)
      .where(eq(users.username, username))
      .limit(1);
    user = rows[0];
  } catch (err) {
    console.error("[u/[username]]", err);
    notFound();
  }
  if (!user) notFound();

  return (
    <div style={{ maxWidth: "800px" }}>
      <h1 style={{ color: "var(--gold-bright)", marginBottom: "0.5rem" }}>
        {user.username}
      </h1>
      {user.isAdmin && (
        <>
          <p style={{ marginBottom: "0.25rem" }}>
            <Link href="/u/admin/dashboard" style={{ color: "var(--gold-bright)", fontWeight: 600 }}>
              Dashboard
            </Link>
          </p>
          <p style={{ marginBottom: "0.25rem" }}>
            <Link href="/u/admin/create-user" style={{ color: "var(--gold-bright)", fontWeight: 600 }}>
              Create User
            </Link>
          </p>
          <p style={{ marginBottom: "0.25rem" }}>
            <Link href="/account/change-password" style={{ color: "var(--gold-bright)", fontWeight: 600 }}>
              Change Password
            </Link>
          </p>
          <p style={{ marginBottom: "0.25rem" }}>
            <Link href="/u/admin/sales-agents" style={{ color: "var(--gold-bright)", fontWeight: 600 }}>
              Sales Agents
            </Link>
          </p>
          <p style={{ marginBottom: "0.5rem", marginLeft: "1rem", fontSize: "0.95rem" }}>
            <Link href="/all-activity" style={{ color: "var(--gold-bright)" }}>
              All Activity
            </Link>
          </p>
        </>
      )}
      <ProfileDashboard profileUsername={user.username} />
    </div>
  );
}
