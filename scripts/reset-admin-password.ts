/**
 * One-time script to reset the Admin user's password so you can log in again.
 * Run: npx tsx scripts/reset-admin-password.ts
 */
import "dotenv/config";
import { db } from "../lib/db";
import { users } from "../lib/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

const ADMIN_EMAIL = "tjabate@gmail.com";
const NEW_PASSWORD = "12345678";

async function main() {
  const [user] = await db.select().from(users).where(eq(users.email, ADMIN_EMAIL)).limit(1);
  if (!user) {
    console.log("No user found with email:", ADMIN_EMAIL);
    process.exit(1);
  }
  const passwordHash = await bcrypt.hash(NEW_PASSWORD, 10);
  await db.update(users).set({ passwordHash, mustChangePassword: false }).where(eq(users.id, user.id));
  console.log("Password reset for:", user.username, "(", ADMIN_EMAIL, ")");
  console.log("You can now log in with password:", NEW_PASSWORD);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
