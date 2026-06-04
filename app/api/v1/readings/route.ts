// app/api/v1/readings/route.ts
// POST — ingest a biometric reading
// GET  — retrieve readings for a patient

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { nanoid } from "nanoid";
import { evaluateReading } from "@/lib/alerts";
import { getPatientAuth, isNextResponse } from "@/lib/auth";
import { checkRateLimit, readingLimiter } from "@/lib/ratelimit";

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

function isDatabaseConfigured(): boolean {
  const url = process.env.DATABASE_URL ?? "";
  return url.length > 10 && !url.includes("placeholder");
}

export async function POST(request: NextRequest) {
  const requestId = nanoid(12);

  const authCtx = await getPatientAuth(request);
  if (isNextResponse(authCtx)) return authCtx;

  const rl = await checkRateLimit(readingLimiter, authCtx.patientId);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded", code: "RATE_LIMIT_EXCEEDED", requestId },
      { status: 429 }
    );
  }

  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json(
      { error: "Invalid JSON", code: "INVALID_JSON", requestId },
      { status: 400 }
    );
  }

  const parsed = ReadingSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", code: "INVALID_PAYLOAD", details: parsed.error.flatten(), requestId },
      { status: 400 }
    );
  }

  const { type, value, unit, source, recordedAt, notes } = parsed.data;
  const triggeredAlerts = evaluateReading(authCtx.patientId, type, value);

  // Write to DB if configured, otherwise return mock success for dev
  let insertedId = nanoid();
  if (isDatabaseConfigured()) {
    try {
      const { db, readings, alertEvents } = await import("@/lib/db");
      const patId = authCtx.patientId as `${string}-${string}-${string}-${string}-${string}`;

      const [inserted] = await db.insert(readings).values({
        patientId:  patId,
        type,
        value:      String(value),
        unit,
        source,
        recordedAt: new Date(recordedAt),
        notes,
      }).returning();

      insertedId = inserted?.id ?? insertedId;

      if (triggeredAlerts.length > 0) {
        await db.insert(alertEvents).values(
          triggeredAlerts.map((a) => ({
            patientId:   patId,
            severity:    a.severity,
            status:      "active" as const,
            type:        a.type,
            message:     a.message,
            value:       a.value !== undefined ? String(a.value) : undefined,
            threshold:   a.threshold !== undefined ? String(a.threshold) : undefined,
            triggeredAt: new Date(a.triggeredAt),
          }))
        );
      }

      // Audit log (fire and forget)
      const { writeAuditLog, getRequestMeta } = await import("@/lib/audit");
      void writeAuditLog({
        actorId:    authCtx.clerkUserId,
        action:     "WRITE",
        resource:   "readings",
        resourceId: insertedId,
        patientId:  authCtx.patientId,
        ...getRequestMeta(request),
      });
    } catch (err) {
      console.error("[readings] DB write error:", err);
      // Don't block the response — alert evaluation already happened
    }
  }

  return NextResponse.json(
    {
      data: {
        id:         insertedId,
        patientId:  authCtx.patientId,
        type, value, unit, source, recordedAt, notes,
        alerts:     triggeredAlerts,
        storedAt:   new Date().toISOString(),
      },
      requestId,
      timestamp: new Date().toISOString(),
    },
    {
      status: 201,
      headers: {
        "X-Request-Id":          requestId,
        "X-Alert-Count":         String(triggeredAlerts.length),
        "X-RateLimit-Remaining": String(rl.remaining),
      },
    }
  );
}

export async function GET(request: NextRequest) {
  const requestId = nanoid(12);

  const authCtx = await getPatientAuth(request);
  if (isNextResponse(authCtx)) return authCtx;

  if (!isDatabaseConfigured()) {
    return NextResponse.json(
      { data: [], meta: { total: 0 }, requestId, timestamp: new Date().toISOString() },
      { status: 200 }
    );
  }

  const { searchParams } = new URL(request.url);
  const type       = searchParams.get("type");
  const limit      = Math.min(parseInt(searchParams.get("limit") ?? "100"), 1000);
  const rangeStart = searchParams.get("rangeStart");
  const rangeEnd   = searchParams.get("rangeEnd");

  try {
    const { db, readings } = await import("@/lib/db");
    const { eq, and, desc, gte, lte } = await import("drizzle-orm");
    const patId = authCtx.patientId as `${string}-${string}-${string}-${string}-${string}`;

    const filters = [
      eq(readings.patientId, patId),
      ...(type       ? [eq(readings.type, type)] : []),
      ...(rangeStart ? [gte(readings.recordedAt, new Date(rangeStart))] : []),
      ...(rangeEnd   ? [lte(readings.recordedAt, new Date(rangeEnd))] : []),
    ];

    const rows = await db
      .select()
      .from(readings)
      .where(and(...filters))
      .orderBy(desc(readings.recordedAt))
      .limit(limit);

    return NextResponse.json(
      { data: rows, meta: { total: rows.length, limit }, requestId, timestamp: new Date().toISOString() },
      { status: 200 }
    );
  } catch (err) {
    console.error("[readings] GET error:", err);
    return NextResponse.json(
      { data: [], meta: { total: 0 }, requestId, timestamp: new Date().toISOString() },
      { status: 200 }
    );
  }
}
