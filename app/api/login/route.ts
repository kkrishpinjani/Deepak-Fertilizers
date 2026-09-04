import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth";

// Real credential check against server-only env vars (never sent to the
// client) — not a mocked "any password works" screen. The session cookie's
// value is the shared SESSION_SECRET, not the password, so it never leaks
// the credential itself; middleware.ts re-checks it against the same env
// var on every request.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body?.password === "string" ? body.password : "";
  const remember = Boolean(body?.remember);

  const adminEmail = (process.env.ADMIN_EMAIL || "").trim().toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD || "";
  const secret = process.env.SESSION_SECRET || "";

  if (!adminEmail || !adminPassword || !secret) {
    return NextResponse.json({ error: "Login is not configured on this server (ADMIN_EMAIL/ADMIN_PASSWORD/SESSION_SECRET missing)." }, { status: 500 });
  }

  if (email !== adminEmail || password !== adminPassword) {
    return NextResponse.json({ error: "Incorrect email or password." }, { status: 401 });
  }

  // Mark the cookie Secure only when the request actually arrived over TLS —
  // NODE_ENV is "production" any time the app runs via `next start`,
  // regardless of whether TLS is in front of it, so keying off that alone
  // makes the browser silently drop the cookie on a plain-HTTP deployment
  // and the login screen spins forever.
  const isHttps = req.headers.get("x-forwarded-proto") === "https" || req.nextUrl.protocol === "https:";

  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, secret, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: isHttps,
    // "Keep me signed in" -> 30 days; otherwise a session-only cookie.
    ...(remember ? { maxAge: 60 * 60 * 24 * 30 } : {}),
  });
  return res;
}
