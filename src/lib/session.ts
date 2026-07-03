import { SignJWT, jwtVerify } from "jose";

const secret = new TextEncoder().encode(process.env.AUTH_SECRET || "dev-insecure-secret-change-me");

export const COOKIE = "mt_session";
/** In production set COOKIE_DOMAIN=".mf.com" so the session is shared by every
 *  tool subdomain (quotations.mf.com, leads.mf.com, …). Unset → host-only (dev). */
export const COOKIE_DOMAIN = process.env.COOKIE_DOMAIN || undefined;
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export type SessionUser = { id: string; name: string; email: string; role: string; perms: string[]; tenantId: string | null };

/** Cookie attributes shared by login (set) and logout (clear). Same AUTH_SECRET
 *  across all apps means any subdomain can verify the JWT — stateless SSO. */
export function sessionCookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    domain: COOKIE_DOMAIN,
    maxAge,
  };
}

export async function signSession(u: SessionUser): Promise<string> {
  return new SignJWT({ name: u.name, email: u.email, role: u.role, perms: u.perms, tid: u.tenantId })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(u.id)
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret);
}

export async function verifySession(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, secret);
    return { id: String(payload.sub), name: String(payload.name), email: String(payload.email), role: String(payload.role), perms: Array.isArray(payload.perms) ? (payload.perms as string[]) : [], tenantId: payload.tid ? String(payload.tid) : null };
  } catch {
    return null;
  }
}
