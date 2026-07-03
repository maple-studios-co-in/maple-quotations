import "server-only";
import { headers } from "next/headers";
import { prisma } from "./prisma";

export type Brand = {
  name: string;
  logoUrl: string | null;
  bannerUrl: string | null;
  primaryColor: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  phone: string | null;
  email: string | null;
  gstin: string | null;
  website: string | null;
  tagline: string | null;
  domain: string | null;
};
const DEFAULT: Brand = {
  name: "Maple Furnishers",
  logoUrl: null,
  bannerUrl: null,
  primaryColor: null,
  addressLine1: null,
  addressLine2: null,
  phone: null,
  email: null,
  gstin: null,
  website: null,
  tagline: null,
  domain: null,
};
const cache = new Map<string, { v: Brand; t: number }>();
const TTL = 60_000;

function registrable(host: string): string {
  const h = host.split(":")[0];
  const parts = h.split(".");
  return parts.length > 2 ? parts.slice(-2).join(".") : h;
}

type TenantRow = NonNullable<Awaited<ReturnType<typeof currentTenant>>>;

function toBrand(t: TenantRow): Brand {
  return {
    name: t.brandName,
    logoUrl: t.logoUrl,
    bannerUrl: t.bannerUrl,
    primaryColor: t.primaryColor,
    addressLine1: t.addressLine1,
    addressLine2: t.addressLine2,
    phone: t.phone,
    email: t.email,
    gstin: t.gstin,
    website: t.website,
    tagline: t.tagline,
    domain: t.domain,
  };
}

/** Resolve the brand for the current request host (multi-tenant ready). When no
 *  tenant matches the host, falls back to the default tenant (so localhost and
 *  standalone deployments show real branding), then to MapleOne if the DB is
 *  empty or unavailable. */
export async function getBrand(): Promise<Brand> {
  try {
    const host = (await headers()).get("host") || "";
    const domain = registrable(host);
    const hit = cache.get(domain);
    if (hit && Date.now() - hit.t < TTL) return hit.v;
    const t = (await prisma.tenant.findFirst({ where: { domain } })) || (await currentTenant());
    const brand: Brand = t ? toBrand(t) : DEFAULT;
    cache.set(domain, { v: brand, t: Date.now() });
    return brand;
  } catch {
    return DEFAULT;
  }
}

/** Drop cached brands (call after admin edits so changes show immediately). */
export function invalidateBrandCache() {
  cache.clear();
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
