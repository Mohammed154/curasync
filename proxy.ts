import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

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

const proxy = clerkMiddleware(async (auth, request) => {
  try {
    if (isPublicRoute(request)) return;

    const key = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ?? "";
    const configured = (key.startsWith("pk_live_") || key.startsWith("pk_test_")) && key.length > 30;

    if (!configured) return;

    await auth.protect();
  } catch (error) {
    // Retain standard Clerk/Next.js redirect errors so authorization flows work correctly
    const err = error as any;
    if (
      err &&
      (err.digest?.startsWith("NEXT_REDIRECT") ||
        err.message?.includes("NEXT_REDIRECT") ||
        err.message?.includes("redirect"))
    ) {
      throw error;
    }

    console.error("[proxy] Unhandled error during proxy execution:", error);
    return NextResponse.next();
  }
});

export default proxy;

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
