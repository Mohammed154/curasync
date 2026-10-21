// proxy.ts
// Next.js Route protection & Role-based Access Control (RBAC) for CuraSync

import { NextRequest, NextResponse } from "next/server";

const PROVIDER_PREFIXES = [
  "/provider",
  "/doctor",
];

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
  "/pdf-preview",
  ...PROVIDER_PREFIXES,
];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Never intercept API routes — API routes perform granular auth checks
  if (pathname.startsWith("/api")) {
    return NextResponse.next();
  }

  const sessionToken = request.cookies.get("curasync_session")?.value;
  const uidToken = request.cookies.get("curasync_uid")?.value;
  const roleToken = request.cookies.get("curasync_role")?.value;
  const isAuthenticated = Boolean(sessionToken || uidToken);

  // If visiting /login or /signup while already authenticated, redirect to /dashboard
  if (pathname === "/login" || pathname === "/signup") {
    if (isAuthenticated) {
      const returnTo = request.nextUrl.searchParams.get("returnTo") || request.nextUrl.searchParams.get("redirect") || "/dashboard";
      return NextResponse.redirect(new URL(returnTo, request.url));
    }
    return NextResponse.next();
  }

  // 1. Strict Role-Based Access Control for /provider/* and /doctor/*
  const isProviderRoute = PROVIDER_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );

  if (isProviderRoute) {
    if (!isAuthenticated) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      loginUrl.searchParams.set("error", "provider_auth_required");
      return NextResponse.redirect(loginUrl);
    }

    const isProviderOrAdmin = roleToken === "provider" || roleToken === "doctor" || roleToken === "admin";
    if (!isProviderOrAdmin) {
      // Unauthorized patient trying to access provider dashboard
      const dashboardUrl = new URL("/dashboard", request.url);
      dashboardUrl.searchParams.set("error", "unauthorized_provider_access");
      return NextResponse.redirect(dashboardUrl);
    }
  }

  // 2. Check if current route requires general patient authentication
  const isProtected = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
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
