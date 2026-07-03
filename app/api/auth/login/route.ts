import { NextResponse } from "next/server";
import { prisma } from "@maple/db";
import { verifyPassword } from "@maple/core/lib/auth";
import { signSession, COOKIE, sessionCookieOptions, SESSION_MAX_AGE } from "@maple/core/lib/session";

export async function POST(req: Request) {
  const { email, password } = await req.json().catch(() => ({}));
  if (!email || !password) return NextResponse.json({ error: "Email and password required" }, { status: 400 });
  const user = await prisma.user.findUnique({ where: { email: String(email).toLowerCase() } });
  if (!user || !(await verifyPassword(String(password), user.passwordHash))) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }
  const token = await signSession({ id: user.id, name: user.name, email: user.email, role: user.role, perms: user.perms, tenantId: user.tenantId });
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE, token, sessionCookieOptions(SESSION_MAX_AGE));
  return res;
}
