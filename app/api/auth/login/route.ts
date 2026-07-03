import { NextResponse } from "next/server";
import { prisma } from "@maple/db";
import { verifyPassword } from "@maple/core/lib/auth";
import { signSession, COOKIE, sessionCookieOptions, SESSION_MAX_AGE } from "@maple/core/lib/session";

// Brute-force guard: sliding window of failed attempts per client IP and per
// email. In-memory — resets on restart, fine for a single-instance deploy.
const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILURES = 8;
const failures = new Map<string, number[]>();

function tooManyFailures(key: string): boolean {
  const now = Date.now();
  const recent = (failures.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  failures.set(key, recent);
  return recent.length >= MAX_FAILURES;
}

function recordFailure(key: string) {
  failures.get(key)?.push(Date.now()) ?? failures.set(key, [Date.now()]);
}

export async function POST(req: Request) {
  const { email, password } = await req.json().catch(() => ({}));
  if (!email || !password) return NextResponse.json({ error: "Email and password required" }, { status: 400 });

  const ip = (req.headers.get("x-forwarded-for") ?? "local").split(",")[0].trim();
  const emailKey = `email:${String(email).toLowerCase()}`;
  const ipKey = `ip:${ip}`;
  if (tooManyFailures(emailKey) || tooManyFailures(ipKey)) {
    return NextResponse.json({ error: "Too many failed attempts. Try again in a few minutes." }, { status: 429 });
  }

  const user = await prisma.user.findUnique({ where: { email: String(email).toLowerCase() } });
  if (!user || !(await verifyPassword(String(password), user.passwordHash))) {
    recordFailure(emailKey);
    recordFailure(ipKey);
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  failures.delete(emailKey);
  const token = await signSession({ id: user.id, name: user.name, email: user.email, role: user.role, perms: user.perms, tenantId: user.tenantId });
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE, token, sessionCookieOptions(SESSION_MAX_AGE));
  return res;
}
