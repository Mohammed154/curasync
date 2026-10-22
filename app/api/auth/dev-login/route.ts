// app/api/auth/dev-login/route.ts
// Development authentication helper — Only enabled in local non-production environments for automated testing

import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: "Demo bypass disabled in production.", code: "DEMO_BYPASS_DISABLED" },
      { status: 403 }
    );
  }

  const { searchParams, origin } = request.nextUrl;
  const uid = searchParams.get("uid") || "0oxPGWt1xjNN1ZDmD87xBZ1dYoK2";
  const role = searchParams.get("role") || "patient";
  const redirectPath = searchParams.get("redirect") || "/onboarding";

  const redirectUrl = new URL(redirectPath, origin);
  const response = NextResponse.redirect(redirectUrl);

  response.cookies.set("curasync_uid", uid, {
    httpOnly: false,
    secure: false,
    path: "/",
    sameSite: "lax",
    maxAge: 60 * 60 * 24,
  });

  response.cookies.set("curasync_role", role, {
    httpOnly: false,
    secure: false,
    path: "/",
    sameSite: "lax",
    maxAge: 60 * 60 * 24,
  });

  return response;
}
