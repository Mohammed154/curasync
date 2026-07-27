import { NextRequest, NextResponse } from "next/server";

/**
 * Top-level Middleware Wrapper
 * Pass-through middleware (Clerk authentication disabled).
 */
export default async function proxy(request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
