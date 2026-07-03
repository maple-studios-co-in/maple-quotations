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
    // Standalone: local login. Set LOGIN_URL to a shared SSO login when this app is
    // deployed alongside the suite on *.maplefurnishers.com.
    const base = process.env.LOGIN_URL || new URL("/login", req.url).toString();
    const url = new URL(base);
    url.searchParams.set("next", pathname + search);
    return NextResponse.redirect(url);
  }
  if (!canAccessTool(user.perms, TOOL, user.role)) {
    if (pathname.startsWith("/api/")) return NextResponse.json({ error: "forbidden" }, { status: 403 });
    return NextResponse.redirect(new URL("/login", req.url));
  }
  return NextResponse.next();
}

// Exclude /login and /api/auth so the sign-in flow is reachable without a session.
export const config = {
  matcher: ["/((?!login|api/auth|_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|ico|webp|mp4)).*)"],
};
