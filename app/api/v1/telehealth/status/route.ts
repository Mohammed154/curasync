// app/api/v1/telehealth/status/route.ts
// Validates whether the authenticated patient has an active doctor connection and checks doctor presence.

import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { getPatientAuth, isNextResponse } from "@/lib/auth";
import { verifyDoctorPatientConnection, getDoctorPresence } from "@/lib/telehealth-auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const requestId = nanoid(12);
  const authCtx = await getPatientAuth(request);
  if (isNextResponse(authCtx)) return authCtx;

  const url = new URL(request.url);
  const providerId = url.searchParams.get("providerId") || "dev_provider_001";

  try {
    const connectionResult = await verifyDoctorPatientConnection(authCtx.patientId, providerId);
    const doctorPresence = await getDoctorPresence(providerId);

    return NextResponse.json({
      connected: connectionResult.connected,
      status: connectionResult.status,
      provider: connectionResult.provider,
      linkId: connectionResult.linkId,
      message: connectionResult.message,
      doctorPresence,
      requestId,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error("[telehealth/status] Error:", err);
    return NextResponse.json(
      {
        connected: false,
        status: "not_connected",
        error: "Unable to verify telehealth connection status",
        code: "STATUS_VERIFICATION_FAILED",
        requestId,
      },
      { status: 500 }
    );
  }
}
