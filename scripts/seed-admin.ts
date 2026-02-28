import "dotenv/config";
import { db } from "../lib/db";
import { users } from "../lib/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { v4 as uuid } from "uuid";

const ADMIN_EMAIL = "tjabate@gmail.com";
const ADMIN_USERNAME = "Admin";
const ADMIN_PASSWORD = "12345678";

async function seed() {
  const existing = await db
    .select()
    .from(users)
    .where(eq(users.email, ADMIN_EMAIL))
    .limit(1);

  if (existing.length > 0) {
    console.log("Admin user already exists:", ADMIN_EMAIL);
    process.exit(0);
    return;
  }

  const id = uuid();
  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);
  await db.insert(users).values({
    id,
    email: ADMIN_EMAIL,
    username: ADMIN_USERNAME,
    passwordHash,
    isAdmin: true,
  });

  console.log("Created Admin user:", ADMIN_USERNAME, "(", ADMIN_EMAIL, ")");
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
