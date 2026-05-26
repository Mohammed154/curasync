// app/api/v1/readings/route.ts — Clerk auth + Supabase DB + Upstash rate limit + audit

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { nanoid } from "nanoid";
import { eq, and, desc, gte, lte } from "drizzle-orm";
import { db, readings, alertEvents } from "@/lib/db";
import { evaluateReading } from "@/lib/alerts";
import { getPatientAuth, isNextResponse } from "@/lib/auth";
import { checkRateLimit, readingLimiter } from "@/lib/ratelimit";
import { writeAuditLog, getRequestMeta } from "@/lib/audit";

const BiometricTypeEnum = z.enum([
  "blood_glucose","blood_pressure_systolic","blood_pressure_diastolic",
  "heart_rate","hrv","spo2","weight","hba1c","egfr",
  "cholesterol_ldl","cholesterol_hdl","steps","sleep_hours","body_temp","peak_flow",
]);

const ReadingSchema = z.object({
  type:       BiometricTypeEnum,
  value:      z.number().finite(),
  unit:       z.string().min(1).max(20),
  source:     z.enum(["manual","apple_health","fitbit","garmin","ble"]),
  recordedAt: z.string().datetime(),
  notes:      z.string().max(500).optional(),
});

export async function POST(request: NextRequest) {
  const requestId = nanoid(12);

  try {
    const authCtx = await getPatientAuth(request);
    if (isNextResponse(authCtx)) return authCtx;

    const rl = await checkRateLimit(readingLimiter, authCtx.patientId);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Rate limit exceeded", code: "RATE_LIMIT_EXCEEDED", requestId }, { status: 429 });
    }

    let body: unknown;
    try { body = await request.json(); } catch {
      return NextResponse.json({ error: "Invalid JSON", code: "INVALID_JSON", requestId }, { status: 400 });
    }

    const parsed = ReadingSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", code: "INVALID_PAYLOAD", details: parsed.error.flatten(), requestId }, { status: 400 });
    }

    const { type, value, unit, source, recordedAt, notes } = parsed.data;
    const patId = authCtx.patientId as `${string}-${string}-${string}-${string}-${string}`;

    const [inserted] = await db.insert(readings).values({
      patientId: patId, type, value: String(value), unit, source, recordedAt: new Date(recordedAt), notes,
    }).returning();

    const triggeredAlerts = evaluateReading(authCtx.patientId, type, value);
    if (triggeredAlerts.length > 0) {
      await db.insert(alertEvents).values(triggeredAlerts.map((a) => ({
        patientId: patId, severity: a.severity, status: "active", type: a.type, message: a.message,
        value: a.value !== undefined ? String(a.value) : undefined,
        threshold: a.threshold !== undefined ? String(a.threshold) : undefined,
        triggeredAt: new Date(a.triggeredAt),
      })));
    }

    void writeAuditLog({ actorId: authCtx.clerkUserId, action: "WRITE", resource: "readings", resourceId: inserted?.id ?? undefined, patientId: authCtx.patientId, ...getRequestMeta(request) });

    return NextResponse.json(
      { data: { ...inserted, alerts: triggeredAlerts }, requestId, timestamp: new Date().toISOString() },
      { status: 201, headers: { "X-Request-Id": requestId, "X-Alert-Count": String(triggeredAlerts.length), "X-RateLimit-Remaining": String(rl.remaining) } }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    const stack = err instanceof Error ? err.stack : undefined;
    console.error(`[readings:POST] Unhandled error (requestId=${requestId}):`, err);
    return NextResponse.json(
      { error: message, code: "INTERNAL_ERROR", detail: process.env.NODE_ENV === "development" ? stack : undefined, requestId },
      { status: 500, headers: { "X-Request-Id": requestId } }
    );
  }
}

export async function GET(request: NextRequest) {
  const requestId = nanoid(12);
  const authCtx = await getPatientAuth(request);
  if (isNextResponse(authCtx)) return authCtx;

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "100"), 1000);
  const rangeStart = searchParams.get("rangeStart");
  const rangeEnd   = searchParams.get("rangeEnd");
  const patId = authCtx.patientId as `${string}-${string}-${string}-${string}-${string}`;

  const filters = [
    eq(readings.patientId, patId),
    ...(type       ? [eq(readings.type, type)] : []),
    ...(rangeStart ? [gte(readings.recordedAt, new Date(rangeStart))] : []),
    ...(rangeEnd   ? [lte(readings.recordedAt, new Date(rangeEnd))] : []),
  ];

  const rows = await db.select().from(readings).where(and(...filters)).orderBy(desc(readings.recordedAt)).limit(limit);
  void writeAuditLog({ actorId: authCtx.clerkUserId, action: "READ", resource: "readings", patientId: authCtx.patientId, ...getRequestMeta(request) });

  return NextResponse.json({ data: rows, meta: { total: rows.length, limit, type }, requestId, timestamp: new Date().toISOString() }, { status: 200 });
}
