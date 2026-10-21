// app/api/provider/alerts/route.ts
// Provider-isolated alerts management API endpoint

import { NextRequest, NextResponse } from "next/server";
import { eq, desc } from "drizzle-orm";
import { db, alertEvents, patientProfiles } from "@/lib/db";
import { getProviderAuth, isNextResponse } from "@/lib/auth";
import { writeAuditLog, getRequestMeta } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const authCtx = await getProviderAuth(request);
  if (isNextResponse(authCtx)) {
    return authCtx;
  }

  try {
    const alerts = await db
      .select({
        id: alertEvents.id,
        patientId: alertEvents.patientId,
        patientName: patientProfiles.name,
        severity: alertEvents.severity,
        message: alertEvents.message,
        status: alertEvents.status,
        triggeredAt: alertEvents.triggeredAt,
        acknowledgedAt: alertEvents.acknowledgedAt,
      })
      .from(alertEvents)
      .leftJoin(patientProfiles, eq(alertEvents.patientId, patientProfiles.id))
      .orderBy(desc(alertEvents.triggeredAt))
      .limit(100);

    const meta = getRequestMeta(request);
    await writeAuditLog({
      action: "READ",
      resource: "alerts",
      actorId: authCtx.userId,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    }).catch(() => {});

    return NextResponse.json({ success: true, data: alerts });
  } catch (error: any) {
    console.error("[api/provider/alerts] Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch clinical alerts" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  const authCtx = await getProviderAuth(request);
  if (isNextResponse(authCtx)) {
    return authCtx;
  }

  try {
    const body = await request.json().catch(() => ({}));
    const { id, action } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: "Alert ID required" }, { status: 400 });
    }

    const newStatus = action === "dismiss" ? "dismissed" : "acknowledged";
    await db
      .update(alertEvents)
      .set({
        status: newStatus,
        acknowledgedAt: new Date(),
        acknowledgedBy: authCtx.userId,
      })
      .where(eq(alertEvents.id, id));

    return NextResponse.json({ success: true, status: newStatus });
  } catch (error: any) {
    console.error("[api/provider/alerts] PATCH error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update alert" },
      { status: 500 }
    );
  }
}
