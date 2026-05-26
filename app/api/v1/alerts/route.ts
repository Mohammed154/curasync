// app/api/v1/alerts/route.ts — Clerk auth + Supabase DB

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { nanoid } from "nanoid";
import { eq, and, desc } from "drizzle-orm";
import { db, alertEvents } from "@/lib/db";
import { getPatientAuth, isNextResponse } from "@/lib/auth";
import { writeAuditLog, getRequestMeta } from "@/lib/audit";

export async function GET(request: NextRequest) {
  const requestId = nanoid(12);
  const authCtx = await getPatientAuth(request);
  if (isNextResponse(authCtx)) return authCtx;

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status"); // active | acknowledged | dismissed
  const patId = authCtx.patientId as `${string}-${string}-${string}-${string}-${string}`;

  const filters = [
    eq(alertEvents.patientId, patId),
    ...(status ? [eq(alertEvents.status, status)] : []),
  ];

  const rows = await db.select().from(alertEvents).where(and(...filters)).orderBy(desc(alertEvents.triggeredAt)).limit(100);

  void writeAuditLog({ actorId: authCtx.clerkUserId, action: "READ", resource: "alert_events", patientId: authCtx.patientId, ...getRequestMeta(request) });

  return NextResponse.json({ data: rows, meta: { count: rows.length }, requestId, timestamp: new Date().toISOString() }, { status: 200 });
}

const PatchSchema = z.object({
  alertId: z.string().min(1),
  action:  z.enum(["acknowledge", "dismiss"]),
});

export async function PATCH(request: NextRequest) {
  const requestId = nanoid(12);
  const authCtx = await getPatientAuth(request);
  if (isNextResponse(authCtx)) return authCtx;

  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON", code: "INVALID_JSON", requestId }, { status: 400 });
  }

  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", code: "INVALID_PAYLOAD", requestId }, { status: 400 });
  }

  const { alertId, action } = parsed.data;
  const newStatus = action === "acknowledge" ? "acknowledged" : "dismissed";
  const patId = authCtx.patientId as `${string}-${string}-${string}-${string}-${string}`;

  const [updated] = await db.update(alertEvents)
    .set({
      status:         newStatus,
      ...(action === "acknowledge" ? { acknowledgedAt: new Date() } : {}),
    })
    .where(and(
      eq(alertEvents.id, alertId as `${string}-${string}-${string}-${string}-${string}`),
      eq(alertEvents.patientId, patId)
    ))
    .returning();

  if (!updated) {
    return NextResponse.json({ error: "Alert not found", code: "NOT_FOUND", requestId }, { status: 404 });
  }

  void writeAuditLog({ actorId: authCtx.clerkUserId, action: "WRITE", resource: "alert_events", resourceId: alertId, patientId: authCtx.patientId, ...getRequestMeta(request) });

  return NextResponse.json({ data: updated, requestId, timestamp: new Date().toISOString() }, { status: 200 });
}
