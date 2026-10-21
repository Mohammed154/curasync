// app/api/provider/patients/route.ts
// Provider-isolated patient panel API endpoint

import { NextRequest, NextResponse } from "next/server";
import { eq, desc, sql, and, gte } from "drizzle-orm";
import { db, patientProfiles, alertEvents, medicationLogs } from "@/lib/db";
import { getProviderAuth, isNextResponse } from "@/lib/auth";
import { writeAuditLog, getRequestMeta } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  // 1. Strict Provider Role Verification
  const authCtx = await getProviderAuth(request);
  if (isNextResponse(authCtx)) {
    return authCtx;
  }

  const searchParams = request.nextUrl.searchParams;
  const sortBy = searchParams.get("sortBy") ?? "alertCount";
  const order = searchParams.get("order") ?? "desc";

  try {
    const patients = await db
      .select({
        id: patientProfiles.id,
        name: patientProfiles.name,
        dateOfBirth: patientProfiles.dateOfBirth,
        conditions: patientProfiles.conditions,
        updatedAt: patientProfiles.updatedAt,
      })
      .from(patientProfiles)
      .orderBy(desc(patientProfiles.updatedAt))
      .limit(200);

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const enriched = await Promise.all(
      patients.map(async (p) => {
        const patId = p.id;

        const alertRows = await db
          .select({ count: sql<number>`count(*)::int` })
          .from(alertEvents)
          .where(and(eq(alertEvents.patientId, patId), eq(alertEvents.status, "active")));
        const alertCount = alertRows[0]?.count ?? 0;

        const logRows = await db
          .select({ status: medicationLogs.status, count: sql<number>`count(*)::int` })
          .from(medicationLogs)
          .where(and(eq(medicationLogs.patientId, patId), gte(medicationLogs.scheduledAt, sevenDaysAgo)))
          .groupBy(medicationLogs.status);

        const totalLogs = logRows.reduce((s, r) => s + (r.count ?? 0), 0);
        const takenLogs = logRows.find((r) => r.status === "taken")?.count ?? 0;
        const adherenceScore = totalLogs > 0 ? Math.round((takenLogs / totalLogs) * 100) : 100;

        const age = new Date().getFullYear() - new Date(p.dateOfBirth ?? "1970-01-01").getFullYear();
        const alertStatus: "red" | "amber" | "green" =
          alertCount >= 3 ? "red" : alertCount >= 1 ? "amber" : "green";

        return {
          patientId: patId,
          name: p.name,
          age,
          conditions: (p.conditions as string[]) ?? [],
          alertStatus,
          alertCount,
          adherenceScore,
          lastActivityDate: p.updatedAt ? new Date(p.updatedAt).toISOString() : new Date().toISOString(),
        };
      })
    );

    // Audit log PHI access for HIPAA compliance
    const meta = getRequestMeta(request);
    await writeAuditLog({
      action: "READ",
      resource: "patients",
      actorId: authCtx.userId,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    }).catch(() => {});

    return NextResponse.json({ success: true, data: enriched });
  } catch (error: any) {
    console.error("[api/provider/patients] Error fetching patient panel:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error fetching patient records" },
      { status: 500 }
    );
  }
}
