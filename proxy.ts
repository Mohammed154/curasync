// proxy.ts
// Next.js 16 Route protection for CuraSync using session token check

import { NextRequest, NextResponse } from "next/server";

const PROTECTED_PREFIXES = [
  "/dashboard",
  "/calendar",
  "/glucose",
  "/medications",
  "/conditions",
  "/alerts",
  "/journal",
  "/settings",
  "/ai-doctor",
  "/medicine-advisor",
  "/telehealth",
  "/provider",
  "/pdf-preview",
];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Never intercept API routes — API routes perform granular auth checks
  if (pathname.startsWith("/api")) {
    return NextResponse.next();
  }

  const sessionToken = request.cookies.get("curasync_session")?.value;
  const uidToken = request.cookies.get("curasync_uid")?.value;
  const isAuthenticated = Boolean(sessionToken || uidToken);

  // If visiting /login while already authenticated, redirect to /dashboard
  if (pathname === "/login") {
    if (isAuthenticated) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    return NextResponse.next();
  }

  // Check if current route requires authentication
  const isProtected = PROTECTED_PREFIXES.some((prefix) =>
    pathname === prefix || pathname.startsWith(`${prefix}/`)
  );

  if (isProtected && !isAuthenticated) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export default proxy;

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

