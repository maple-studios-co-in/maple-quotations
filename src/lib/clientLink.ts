import "server-only";
import { tenantDb } from "./tenant-db";

/** Match an existing client (within the tenant) by name or create one. */
export async function findOrCreateClient(c: { name?: string; phone?: string; address?: string; gstin?: string }): Promise<string | null> {
  const name = (c.name || "").trim();
  if (!name) return null;
  const db = await tenantDb();
  const existing = await db.client.findFirst({ where: { name: { equals: name, mode: "insensitive" } } });
  if (existing) {
    const data: Record<string, string> = {};
    if (!existing.phone && c.phone) data.phone = c.phone;
    if (!existing.address && c.address) data.address = c.address;
    if (!existing.gstin && c.gstin) data.gstin = c.gstin;
    if (Object.keys(data).length) await db.client.update({ where: { id: existing.id }, data });
    return existing.id;
  }
  const created = await db.client.create({ data: { name, phone: c.phone || null, address: c.address || null, gstin: c.gstin || null } });
  return created.id;
}
