import { NextResponse, type NextRequest } from "next/server";
import { verifySession, COOKIE } from "@maple/core/lib/session";
import { canAccessTool } from "@maple/core/lib/rbac";

const TOOL = "quotations";

export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const token = req.cookies.get(COOKIE)?.value;
  const user = token ? await verifySession(token) : null;
  if (!user) {
    if (pathname.startsWith("/api/")) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    const base = process.env.LOGIN_URL || "https://admin.maplefurnishers.com/login";
    const url = new URL(base); url.searchParams.set("next", (req.headers.get("x-forwarded-host") ? `https://${req.headers.get("x-forwarded-host")}` : req.nextUrl.origin) + pathname + search);
    return NextResponse.redirect(url);
  }
  if (!canAccessTool(user.perms, TOOL, user.role)) {
    if (pathname.startsWith("/api/")) return NextResponse.json({ error: "forbidden" }, { status: 403 });
    return NextResponse.redirect(new URL(process.env.LOGIN_URL || "https://admin.maplefurnishers.com", req.url));
  }
  return NextResponse.next();
}
export const config = { matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|ico|webp|mp4)).*)"] };
