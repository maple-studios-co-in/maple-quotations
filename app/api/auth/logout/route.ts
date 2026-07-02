import { NextResponse } from "next/server";
import { COOKIE, sessionCookieOptions } from "@maple/core/lib/session";
export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE, "", sessionCookieOptions(0));
  return res;
}
