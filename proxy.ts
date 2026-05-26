import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isPublicRoute = createRouteMatcher([
  "/",
  "/home(.*)",
  "/onboarding(.*)",
  "/pdf-preview(.*)",
  "/api/v1/sync(.*)",
  "/api/v1/onboarding(.*)",
  "/api/health",
]);

const proxy = clerkMiddleware(async (auth, request) => {
  if (isPublicRoute(request)) return;

  const key = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ?? "";
  const configured = (key.startsWith("pk_live_") || key.startsWith("pk_test_")) && key.length > 30;

  if (!configured) return;

  await auth.protect();
});

export default proxy;

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
