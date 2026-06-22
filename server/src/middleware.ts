/**
 * src/middleware.ts  (Next.js Edge Middleware)
 *
 * Protects all /admin/* routes. If the visitor does not have a `mugisk_token`
 * cookie, they are redirected to /admin/login. The actual role/validity check
 * happens on the client (and is enforced server-side by the API returning 401/403).
 *
 * The login page itself is excluded from protection to avoid redirect loops.
 */

import { NextRequest, NextResponse } from "next/server";

export function middleware(req: NextRequest): NextResponse {
  const { pathname } = req.nextUrl;

  // Only protect /admin/* routes (excluding /admin/login itself)
  if (pathname.startsWith("/admin") && !pathname.startsWith("/admin/login")) {
    const token = req.cookies.get("mugisk_token")?.value;

    if (!token) {
      const loginUrl = new URL("/admin/login", req.url);
      loginUrl.searchParams.set("from", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
