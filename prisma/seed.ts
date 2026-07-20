import { hash } from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const branches = [
  ["BB", "Ban Bung HQ", "TH", "THB", "Asia/Bangkok"],
  ["RJ", "Rojana", "TH", "THB", "Asia/Bangkok"],
  ["WN", "Wang Noi", "TH", "THB", "Asia/Bangkok"],
  ["LP", "Lamphun", "TH", "THB", "Asia/Bangkok"],
  ["VN", "Vietnam", "VN", "VND", "Asia/Ho_Chi_Minh"],
  ["MY", "Malaysia", "MY", "MYR", "Asia/Kuala_Lumpur"],
] as const;

async function main() {
  for (const [code, name, country, currency, timezone] of branches) {
    await prisma.branch.upsert({ where: { code }, update: {}, create: { code, name, country, currency, timezone } });
  }
  for (const item of [{ code: "1", name: "Pickup" }, { code: "2", name: "6-Wheel Truck" }, { code: "3", name: "10-Wheel Truck" }]) {
    await prisma.vehicleClass.upsert({ where: { code: item.code }, update: {}, create: item });
  }
  const email = process.env.SEED_ADMIN_EMAIL;
  const password = process.env.SEED_ADMIN_PASSWORD;
  if (!email || !password || password === "change-before-running-seed") {
    console.warn("Skipped super-admin seed: set non-default SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD.");
    return;
  }
  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: { name: "Super Admin", email, passwordHash: await hash(password, 12) },
  });
  await prisma.userRoleEntry.upsert({
    where: { userId_role: { userId: user.id, role: "SUPER_ADMIN" } },
    update: {},
    create: { userId: user.id, role: "SUPER_ADMIN" },
  });
}

main().finally(() => prisma.$disconnect());
