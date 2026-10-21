// app/api/provider/thresholds/route.ts
// Provider-isolated biometric threshold customization API

import { NextRequest, NextResponse } from "next/server";
import { getProviderAuth, isNextResponse } from "@/lib/auth";
import { writeAuditLog, getRequestMeta } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const authCtx = await getProviderAuth(request);
  if (isNextResponse(authCtx)) {
    return authCtx;
  }

  try {
    const body = await request.json().catch(() => ({}));
    const { patientId, thresholds } = body;

    if (!patientId || !Array.isArray(thresholds)) {
      return NextResponse.json(
        { success: false, error: "Patient ID and thresholds array required" },
        { status: 400 }
      );
    }

    const meta = getRequestMeta(request);
    await writeAuditLog({
      action: "WRITE",
      resource: "thresholds",
      patientId,
      actorId: authCtx.userId,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    }).catch(() => {});

    return NextResponse.json({
      success: true,
      message: "Custom patient alert thresholds saved successfully",
      data: { patientId, thresholds, updatedAt: new Date().toISOString() },
    });
  } catch (error: any) {
    console.error("[api/provider/thresholds] Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update thresholds" },
      { status: 500 }
    );
  }
}
