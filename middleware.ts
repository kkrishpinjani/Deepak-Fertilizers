import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth";

// Gates every page behind a real session cookie set by app/api/login. API
// routes are excluded (see `matcher`) so server-to-server/API consumers
// (e.g. the MCP endpoint at /api/mcp, meant for external AI clients) aren't
// blocked by a browser-session gate that doesn't apply to them.
export function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const secret = process.env.SESSION_SECRET || "";
  const hasSession = secret.length > 0 && req.cookies.get(SESSION_COOKIE)?.value === secret;

  if (pathname === "/login") {
    if (hasSession) {
      return NextResponse.redirect(new URL("/", req.url));
    }
    return NextResponse.next();
  }

  if (!hasSession) {
    const loginUrl = new URL("/login", req.url);
    if (pathname !== "/") loginUrl.searchParams.set("next", pathname + search);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
