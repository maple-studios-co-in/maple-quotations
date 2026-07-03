import "server-only";
import { cookies } from "next/headers";
import { verifySession, COOKIE } from "./session";
import { currentTenant } from "./brand";

/** Tenant id for the current request: from the session if signed in, else resolved
 *  from the host (for public routes). Every tenant-scoped query should filter by this. */
export async function getTenantId(): Promise<string | null> {
  try {
    const token = (await cookies()).get(COOKIE)?.value;
    if (token) {
      const u = await verifySession(token);
      if (u?.tenantId) return u.tenantId;
    }
  } catch {}
  const t = await currentTenant();
  return t?.id ?? null;
}
