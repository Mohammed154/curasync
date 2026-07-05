import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

const isPublicRoute = createRouteMatcher([
  "/",
  "/home(.*)",
  "/onboarding(.*)",
  "/pdf-preview(.*)",
  "/api/v1/sync(.*)",
  "/api/v1/onboarding(.*)",
  "/api/health",
  "/api/v1/health(.*)",
]);

// Initialize Clerk middleware handler
const clerk = clerkMiddleware(async (auth, request) => {
  if (isPublicRoute(request)) return;

  // Protect all non-public routes
  await auth.protect();
});

/**
 * Top-level Middleware Wrapper
 * Intercepts calls to Clerk and ensures it is fully configured before execution.
 * Gracefully handles unhandled exceptions to prevent hard 500 crashes.
 */
export default async function proxy(request: NextRequest, event: any) {
  try {
    const key = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ?? "";
    const configured = (key.startsWith("pk_live_") || key.startsWith("pk_test_")) && key.length > 30;

    // Gracefully bypass if Clerk is not configured (e.g. preview deployments or local offline dev)
    if (!configured) {
      return NextResponse.next();
    }

    return await clerk(request, event);
  } catch (error) {
    // Rethrow Next.js redirect errors so normal auth redirects work
    const err = error as any;
    if (
      err &&
      (err.digest?.startsWith("NEXT_REDIRECT") ||
        err.message?.includes("NEXT_REDIRECT") ||
        err.message?.includes("redirect"))
    ) {
      throw error;
    }

    console.error("[proxy] Edge middleware unhandled exception:", error);
    return NextResponse.next();
  }
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
