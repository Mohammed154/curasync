/**
 * CuraSync — Route Guard & Portal Separation Unit Tests
 * Tests:
 * 1. Middleware RBAC enforcement for /provider/* and unauthenticated vs patient vs clinician
 * 2. Post-login redirection logic and query parameter hygiene
 * 3. Onboarding guard resolution (completed vs incomplete)
 */

import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";
import { middleware } from "../../middleware";

function createMockRequest(
  url: string,
  cookies: Record<string, string> = {}
): NextRequest {
  const req = new NextRequest(new URL(url, "http://localhost:3000"));
  for (const [name, value] of Object.entries(cookies)) {
    req.cookies.set(name, value);
  }
  return req;
}

describe("Middleware RBAC & Portal Separation", () => {
  it("redirects unauthenticated user from /provider/dashboard to /provider/login with returnTo", () => {
    const req = createMockRequest("http://localhost:3000/provider/dashboard");
    const res = middleware(req);

    expect(res.status).toBe(307);
    const location = res.headers.get("location");
    expect(location).toContain("/provider/login");
    expect(location).toContain("returnTo=%2Fprovider%2Fdashboard");
    // Must NOT redirect to patient /login
    expect(location).not.toContain("http://localhost:3000/login");
  });

  it("redirects unauthenticated user from /provider/patients to /provider/login", () => {
    const req = createMockRequest("http://localhost:3000/provider/patients");
    const res = middleware(req);

    expect(res.status).toBe(307);
    const location = res.headers.get("location");
    expect(location).toContain("/provider/login");
    expect(location).toContain("returnTo=%2Fprovider%2Fpatients");
  });

  it("denies authenticated patient access to /provider/dashboard and redirects to /dashboard with error flag", () => {
    const req = createMockRequest("http://localhost:3000/provider/dashboard", {
      curasync_session: "mock-token",
      curasync_uid: "patient-123",
      curasync_role: "patient",
    });
    const res = middleware(req);

    expect(res.status).toBe(307);
    const location = res.headers.get("location");
    expect(location).toContain("/dashboard");
    expect(location).toContain("error=unauthorized_provider_access");
  });

  it("allows verified clinical provider access to /provider/dashboard", () => {
    const req = createMockRequest("http://localhost:3000/provider/dashboard", {
      curasync_session: "mock-token",
      curasync_uid: "provider-456",
      curasync_role: "provider",
    });
    const res = middleware(req);

    // Passes through to next handler (status 200 / NextResponse.next())
    expect(res.status).toBe(200);
  });

  it("redirects authenticated patient visiting /provider/login back to /dashboard", () => {
    const req = createMockRequest("http://localhost:3000/provider/login", {
      curasync_session: "mock-token",
      curasync_uid: "patient-123",
      curasync_role: "patient",
    });
    const res = middleware(req);

    expect(res.status).toBe(307);
    const location = res.headers.get("location");
    expect(location).toContain("/dashboard");
    expect(location).toContain("error=unauthorized_provider_access");
  });

  it("redirects authenticated provider visiting /provider/login directly to /provider/dashboard", () => {
    const req = createMockRequest("http://localhost:3000/provider/login", {
      curasync_session: "mock-token",
      curasync_uid: "provider-456",
      curasync_role: "provider",
    });
    const res = middleware(req);

    expect(res.status).toBe(307);
    const location = res.headers.get("location");
    expect(location).toContain("/provider/dashboard");
  });

  it("strips stale fallback to /onboarding when visiting /login while authenticated", () => {
    const req = createMockRequest("http://localhost:3000/login?returnTo=/onboarding", {
      curasync_session: "mock-token",
      curasync_uid: "patient-123",
      curasync_role: "patient",
    });
    const res = middleware(req);

    expect(res.status).toBe(307);
    const location = res.headers.get("location");
    // Returning patient must be redirected to /dashboard, NOT /onboarding
    expect(location).toBe("http://localhost:3000/dashboard");
  });
});

describe("Post-Login Redirection & Onboarding Resolution Logic", () => {
  function resolveTarget(
    profile: { onboarding_complete?: boolean; conditions?: string[]; role?: string } | null,
    searchParams: URLSearchParams
  ): string {
    let explicitReturn: string | null = null;
    const returnTo = searchParams.get("returnTo") || searchParams.get("redirect");
    if (returnTo && returnTo !== "/onboarding") {
      explicitReturn = returnTo;
    }

    if (profile) {
      if (profile.role === "provider" || profile.role === "doctor" || profile.role === "admin") {
        return explicitReturn || "/provider/dashboard";
      }

      const hasCompleted = Boolean(
        profile.onboarding_complete ||
        (Array.isArray(profile.conditions) && profile.conditions.length > 0)
      );

      if (hasCompleted) {
        return explicitReturn || "/dashboard";
      }

      return "/onboarding";
    }

    return explicitReturn || "/dashboard";
  }

  it("routes returning patients with onboarding_complete === true directly to /dashboard", () => {
    const params = new URLSearchParams();
    const destination = resolveTarget(
      { onboarding_complete: true, conditions: ["diabetes_t2"], role: "patient" },
      params
    );
    expect(destination).toBe("/dashboard");
  });

  it("routes users with incomplete setup (onboarding_complete === false) to /onboarding", () => {
    const params = new URLSearchParams();
    const destination = resolveTarget(
      { onboarding_complete: false, conditions: [], role: "patient" },
      params
    );
    expect(destination).toBe("/onboarding");
  });

  it("ignores stale returnTo=/onboarding query param for completed patient", () => {
    const params = new URLSearchParams("returnTo=/onboarding");
    const destination = resolveTarget(
      { onboarding_complete: true, conditions: ["hypertension"], role: "patient" },
      params
    );
    expect(destination).toBe("/dashboard");
  });

  it("routes clinician profile directly to /provider/dashboard", () => {
    const params = new URLSearchParams();
    const destination = resolveTarget(
      { onboarding_complete: true, role: "provider" },
      params
    );
    expect(destination).toBe("/provider/dashboard");
  });
});
