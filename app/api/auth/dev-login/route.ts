// app/api/auth/dev-login/route.ts
// Development authentication bypass — Disabled for security hardening

import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    {
      error: "Live demo bypass has been permanently removed for security hardening. Please use standard authentication.",
      code: "DEMO_BYPASS_DISABLED",
    },
    { status: 403 }
  );
}

export async function GET() {
  return NextResponse.json(
    {
      error: "Live demo bypass has been permanently removed for security hardening. Please use standard authentication.",
      code: "DEMO_BYPASS_DISABLED",
    },
    { status: 403 }
  );
}
