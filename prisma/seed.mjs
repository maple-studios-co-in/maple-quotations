import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const tenant = await prisma.tenant.upsert({
  where: { slug: "maple" },
  update: {},
  create: { name: "Maple Furnishers", slug: "maple", brandName: "Maple Furnishers", domain: "quotations.maplefurnishers.com" },
});

const email = "admin@maplefurnishers.com";
const passwordHash = await bcrypt.hash("maple@123", 10);
await prisma.user.upsert({
  where: { email },
  update: {},
  create: { name: "Admin", email, passwordHash, role: "admin", perms: ["*"], tenantId: tenant.id },
});

console.log(`Seeded tenant "${tenant.slug}" + admin ${email} / maple@123`);
await prisma.$disconnect();
