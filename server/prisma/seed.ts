/**
 * prisma/seed.ts
 *
 * Seeds the database with a single ADMIN user.
 * Credentials are read from environment variables with sane defaults:
 *
 *   ADMIN_EMAIL    (default: admin@mugisk.local)
 *   ADMIN_PASSWORD (default: changeme123)
 *
 * Run via:  pnpm db:seed   (calls `tsx prisma/seed.ts`)
 */

import { PrismaClient, UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "admin@mugisk.local";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "changeme123";
const ADMIN_USERNAME = "admin";

async function main(): Promise<void> {
  console.log("🌱  Seeding database…");

  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);

  const admin = await prisma.user.upsert({
    where: { email: ADMIN_EMAIL },
    update: {
      // Keep existing hash in sync if the env var was rotated
      passwordHash,
      role: UserRole.ADMIN,
      isDisabled: false,
    },
    create: {
      email: ADMIN_EMAIL,
      username: ADMIN_USERNAME,
      passwordHash,
      role: UserRole.ADMIN,
    },
  });

  console.log(`✅  Admin user ready: ${admin.email} (id: ${admin.id})`);
  console.log(
    "⚠️   Remember to change ADMIN_PASSWORD in production via your .env file.",
  );
}

main()
  .catch((err) => {
    console.error("❌  Seed failed:", err);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });
