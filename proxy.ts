// proxy.ts
// Next.js 16 Route protection & Role-Based Access Control (RBAC) for CuraSync

import { NextRequest, NextResponse } from "next/server";

const PROVIDER_PREFIXES = ["/provider", "/doctor"];

const PROTECTED_PATIENT_PREFIXES = [
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
];

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  // Never intercept API routes — API routes perform granular auth checks
  if (pathname.startsWith("/api")) {
    return NextResponse.next();
  }

  const sessionToken = request.cookies.get("curasync_session")?.value;
  const uidToken = request.cookies.get("curasync_uid")?.value;
  const roleToken = request.cookies.get("curasync_role")?.value;
  const isAuthenticated = Boolean(sessionToken || uidToken);

  // 1. Dedicated Provider Sign-In Route (/provider/login)
  if (pathname === "/provider/login") {
    if (isAuthenticated) {
      const isProvider = roleToken === "provider" || roleToken === "doctor" || roleToken === "admin";
      if (isProvider) {
        const returnTo = request.nextUrl.searchParams.get("returnTo") || "/provider/dashboard";
        return NextResponse.redirect(new URL(returnTo, request.url));
      } else {
        // Authenticated patient trying to visit provider login
        const dashboardUrl = new URL("/dashboard", request.url);
        dashboardUrl.searchParams.set("error", "unauthorized_provider_access");
        return NextResponse.redirect(dashboardUrl);
      }
    }
    return NextResponse.next();
  }

  // 2. Strict Role-Based Access Control for /provider/* and /doctor/*
  const isProviderRoute = PROVIDER_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );

  if (isProviderRoute) {
    // Unauthenticated visitors to /provider/* must be redirected strictly to /provider/login
    if (!isAuthenticated) {
      const providerLoginUrl = new URL("/provider/login", request.url);
      const fullPath = search ? `${pathname}${search}` : pathname;
      providerLoginUrl.searchParams.set("returnTo", fullPath);
      return NextResponse.redirect(providerLoginUrl);
    }

    // Authenticated Patients trying to access provider portal
    const isProviderOrAdmin = roleToken === "provider" || roleToken === "doctor" || roleToken === "admin";
    if (!isProviderOrAdmin) {
      const dashboardUrl = new URL("/dashboard", request.url);
      dashboardUrl.searchParams.set("error", "unauthorized_provider_access");
      return NextResponse.redirect(dashboardUrl);
    }

    return NextResponse.next();
  }

  // 3. Patient Authentication Pages (/login and /signup)
  if (pathname === "/login" || pathname === "/signup") {
    if (isAuthenticated) {
      const isProvider = roleToken === "provider" || roleToken === "doctor" || roleToken === "admin";
      if (isProvider) {
        return NextResponse.redirect(new URL("/provider/dashboard", request.url));
      }
      const returnTo = request.nextUrl.searchParams.get("returnTo") || request.nextUrl.searchParams.get("redirect");
      const target = returnTo && returnTo !== "/onboarding" ? returnTo : "/dashboard";
      return NextResponse.redirect(new URL(target, request.url));
    }
    return NextResponse.next();
  }

  // 4. Protected Patient Routes
  const isProtectedPatient = PROTECTED_PATIENT_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );

  if (isProtectedPatient && !isAuthenticated) {
    const loginUrl = new URL("/login", request.url);
    const fullPath = search ? `${pathname}${search}` : pathname;
    loginUrl.searchParams.set("returnTo", fullPath);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export { proxy as middleware };
export default proxy;

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
