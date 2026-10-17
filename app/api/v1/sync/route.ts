// app/api/v1/sync/route.ts
// DEPRECATED: Wearable and hardware device integration features have been deprecated across CuraSync.

import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(_request: NextRequest) {
  return NextResponse.json(
    {
      error: "Wearable and hardware device sync features have been deprecated in CuraSync.",
      message: "Biometrics and vitals are managed exclusively via user-logged records.",
      code: "DEVICE_INTEGRATION_DEPRECATED",
    },
    { status: 410 } // 410 Gone
  );
}

export async function GET(_request: NextRequest) {
  return NextResponse.json(
    {
      status: "deprecated",
      message: "Wearable and hardware device sync APIs have been deprecated.",
      code: "DEVICE_INTEGRATION_DEPRECATED",
    },
    { status: 410 }
  );
}
