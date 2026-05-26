// app/api/v1/patients/route.ts — provider-only, real DB + computed adherence

import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { eq, desc, sql, and, gte } from "drizzle-orm";
import { db, patientProfiles, alertEvents, medicationLogs } from "@/lib/db";
import { getProviderAuth, isNextResponse } from "@/lib/auth";
import { writeAuditLog, getRequestMeta } from "@/lib/audit";

export async function GET(request: NextRequest) {
  const requestId = nanoid(12);
  const authCtx = await getProviderAuth(request);
  if (isNextResponse(authCtx)) return authCtx;

  const { searchParams } = new URL(request.url);
  const sortBy       = searchParams.get("sortBy") ?? "alertCount";
  const order        = searchParams.get("order") ?? "desc";
  const filterStatus = searchParams.get("alertStatus");

  const patients = await db
    .select({
      id:          patientProfiles.id,
      name:        patientProfiles.name,
      dateOfBirth: patientProfiles.dateOfBirth,
      conditions:  patientProfiles.conditions,
      updatedAt:   patientProfiles.updatedAt,
    })
    .from(patientProfiles)
    .orderBy(desc(patientProfiles.updatedAt))
    .limit(200);

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const enriched = await Promise.all(
    patients.map(async (p) => {
      const patId = p.id;

      // Active alert count
      const alertRows = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(alertEvents)
        .where(and(eq(alertEvents.patientId, patId), eq(alertEvents.status, "active")));
      const alertCount = alertRows[0]?.count ?? 0;

      // 7-day medication adherence
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
        patientId:        patId,
        name:             p.name,
        age,
        conditions:       p.conditions,
        lastActivityDate: p.updatedAt?.toISOString() ?? new Date().toISOString(),
        alertCount,
        adherenceScore,
        alertStatus,
      };
    })
  );

  // Filter by alertStatus
  const filtered = filterStatus
    ? enriched.filter((p) => p.alertStatus === filterStatus)
    : enriched;

  // Sort
  filtered.sort((a, b) => {
    if (sortBy === "name")            return order === "asc" ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name);
    if (sortBy === "adherenceScore")  return order === "asc" ? a.adherenceScore - b.adherenceScore : b.adherenceScore - a.adherenceScore;
    return order === "asc" ? a.alertCount - b.alertCount : b.alertCount - a.alertCount;
  });

  void writeAuditLog({ actorId: authCtx.clerkUserId, action: "READ", resource: "patient_profiles", ...getRequestMeta(request) });

  return NextResponse.json(
    { data: filtered, meta: { total: filtered.length, sortBy, order, filterStatus }, requestId, timestamp: new Date().toISOString() },
    { status: 200 }
  );
}
