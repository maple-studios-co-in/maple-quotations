import "server-only";
import { headers } from "next/headers";
import { prisma } from "./prisma";

export type Brand = { name: string; logoUrl: string | null; primaryColor: string | null; domain: string | null };
const DEFAULT: Brand = { name: "MapleOne", logoUrl: null, primaryColor: null, domain: null };
const cache = new Map<string, { v: Brand; t: number }>();
const TTL = 60_000;

function registrable(host: string): string {
  const h = host.split(":")[0];
  const parts = h.split(".");
  return parts.length > 2 ? parts.slice(-2).join(".") : h;
}

/** Resolve the brand for the current request host (multi-tenant ready). Falls back
 *  to MapleOne when no tenant matches (or DB is unavailable). */
export async function getBrand(): Promise<Brand> {
  try {
    const host = (await headers()).get("host") || "";
    const domain = registrable(host);
    const hit = cache.get(domain);
    if (hit && Date.now() - hit.t < TTL) return hit.v;
    const t = await prisma.tenant.findFirst({ where: { domain } });
    const brand: Brand = t ? { name: t.brandName, logoUrl: t.logoUrl, primaryColor: t.primaryColor, domain: t.domain } : DEFAULT;
    cache.set(domain, { v: brand, t: Date.now() });
    return brand;
  } catch {
    return DEFAULT;
  }
}

/** The full tenant row for the current host (for admin writes). */
export async function currentTenant() {
  const host = (await headers()).get("host") || "";
  const domain = registrable(host);
  return (
    (await prisma.tenant.findFirst({ where: { domain } })) ||
    (await prisma.tenant.findFirst({ where: { slug: "maple" } })) ||
    (await prisma.tenant.findFirst())
  );
}
