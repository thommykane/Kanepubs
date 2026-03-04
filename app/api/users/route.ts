import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const list = await db
      .select({ id: users.id, username: users.username })
      .from(users)
      .orderBy(users.username);
    return NextResponse.json(list);
  } catch (err) {
    console.error("[api/users GET]", err);
    return NextResponse.json([], { status: 200 });
  }
}
