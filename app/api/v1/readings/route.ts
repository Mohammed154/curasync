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
  source:     z.literal("manual").default("manual"),
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

  // Write to DB if configured
  let insertedId = nanoid();
  if (!isDatabaseConfigured()) {
    if (process.env.NODE_ENV === "production") {
      return NextResponse.json(
        { error: "Database not configured. Please ensure DATABASE_URL is set in environment variables.", code: "DATABASE_NOT_CONFIGURED", requestId },
        { status: 500 }
      );
    }
  } else {
    try {
      const { db, vitals, glucoseReadings, profiles } = await import("@/lib/db");
      const { eq } = await import("drizzle-orm");
      const recDate = new Date(recordedAt);

      // 0. Ensure user exists in profiles to satisfy vitals_user_id_fkey constraint
      await db
        .insert(profiles)
        .values({
          id: authCtx.userId,
          email: authCtx.email || `${authCtx.userId}@curasync.care`,
          displayName: authCtx.displayName || "Patient",
        })
        .onConflictDoNothing();

      // 1. Insert into public.vitals table (user_id is TEXT referencing public.profiles(id))
      const [insertedVital] = await db.insert(vitals).values({
        userId:     authCtx.userId,
        type,
        value:      String(value),
        unit,
        source,
        recordedAt: recDate,
        notes:      notes || undefined,
      }).returning();

      if (insertedVital?.id) {
        insertedId = insertedVital.id;
      }

      // 2. If blood_glucose, sync to public.glucose_readings as well
      if (type === "blood_glucose") {
        let mealContext = "fasting";
        if (notes) {
          const lowerNotes = notes.toLowerCase();
          if (lowerNotes.includes("post-meal") || lowerNotes.includes("post meal") || lowerNotes.includes("after meal")) {
            mealContext = "post_meal";
          } else if (lowerNotes.includes("evening") || lowerNotes.includes("bedtime")) {
            mealContext = "bedtime";
          } else if (lowerNotes.includes("random")) {
            mealContext = "random";
          }
        }

        await db.insert(glucoseReadings).values({
          userId:      authCtx.userId,
          value:       String(value),
          unit:        unit || "mg/dL",
          mealContext,
          source,
          notes:       notes || undefined,
          recordedAt:  recDate,
        }).catch((e) => console.warn("[readings] glucoseReadings insert warning:", e));
      }

      // 3. Backward compatibility: if patientId is a valid UUID, attempt inserting into legacy readings table
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(authCtx.patientId);
      if (isUuid) {
        try {
          const { readings, alertEvents } = await import("@/lib/db");
          const patId = authCtx.patientId as `${string}-${string}-${string}-${string}-${string}`;
          await db.insert(readings).values({
            patientId:  patId,
            type,
            value:      String(value),
            unit,
            source,
            recordedAt: recDate,
            notes,
          });

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
        } catch (legacyErr) {
          console.warn("[readings] legacy table insert skipped:", legacyErr);
        }
      }

      // Audit log (fire and forget)
      const { writeAuditLog, getRequestMeta } = await import("@/lib/audit");
      void writeAuditLog({
        actorId:    authCtx.clerkUserId,
        action:     "WRITE",
        resource:   "vitals",
        resourceId: insertedId,
        patientId:  authCtx.patientId,
        ...getRequestMeta(request),
      });
    } catch (err) {
      console.error("[readings] DB write error:", err);
      return NextResponse.json(
        {
          error: "Failed to save reading to database",
          detail: err instanceof Error ? err.message : String(err),
          code: "DB_WRITE_ERROR",
          requestId,
        },
        { status: 500 }
      );
    }
  }

  // Send SMS to relative on critical (red zone) alerts
  const criticalAlert = triggeredAlerts.find((a) => a.severity === "critical");
  if (criticalAlert) {
    if (isDatabaseConfigured()) {
      try {
        const { db, profiles } = await import("@/lib/db");
        const { eq } = await import("drizzle-orm");

        const [profile] = await db
          .select({
            name: profiles.displayName,
            emergencyContact: profiles.emergencyContact,
          })
          .from(profiles)
          .where(eq(profiles.id, authCtx.userId))
          .limit(1);

        if (profile && profile.emergencyContact) {
          const contact = profile.emergencyContact as { name: string; phone: string; relationship: string } | null;
          if (contact && contact.phone) {
            const { sendCriticalAlertSms } = await import("@/lib/sms");
            void sendCriticalAlertSms(
              profile.name || "Patient",
              contact.name,
              contact.phone,
              criticalAlert.message
            );
          }
        }
      } catch (smsErr) {
        console.error("[readings:sms] Error retrieving emergency contact:", smsErr);
      }
    } else {
      // No emergency contact registered yet
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

export const dynamic = "force-dynamic";

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

  const searchParams = request.nextUrl.searchParams;
  const type       = searchParams.get("type");
  const limit      = Math.min(parseInt(searchParams.get("limit") ?? "100"), 1000);
  const rangeStart = searchParams.get("rangeStart");
  const rangeEnd   = searchParams.get("rangeEnd");

  try {
    const { db, vitals, readings } = await import("@/lib/db");
    const { eq, and, desc, gte, lte } = await import("drizzle-orm");

    const vitalFilters = [
      eq(vitals.userId, authCtx.userId),
      ...(type ? [eq(vitals.type, type)] : []),
      ...(rangeStart ? [gte(vitals.recordedAt, new Date(rangeStart))] : []),
      ...(rangeEnd ? [lte(vitals.recordedAt, new Date(rangeEnd))] : []),
    ];

    const vitalsRows = await db
      .select()
      .from(vitals)
      .where(and(...vitalFilters))
      .orderBy(desc(vitals.recordedAt))
      .limit(limit);

    if (vitalsRows && vitalsRows.length > 0) {
      const mapped = vitalsRows.map((v) => ({
        id: v.id,
        patientId: v.userId,
        type: v.type,
        value: v.value,
        unit: v.unit,
        source: v.source,
        recordedAt: v.recordedAt ? v.recordedAt.toISOString() : new Date().toISOString(),
        notes: v.notes,
      }));
      return NextResponse.json(
        { data: mapped, meta: { total: mapped.length, limit }, requestId, timestamp: new Date().toISOString() },
        { status: 200 }
      );
    }

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(authCtx.patientId);
    if (!isUuid) {
      return NextResponse.json(
        { data: [], meta: { total: 0, limit }, requestId, timestamp: new Date().toISOString() },
        { status: 200 }
      );
    }

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

    const legacyMapped = rows.map((r) => ({
      id: r.id,
      patientId: r.patientId,
      type: r.type,
      value: r.value,
      unit: r.unit,
      source: r.source,
      recordedAt: r.recordedAt ? r.recordedAt.toISOString() : new Date().toISOString(),
      notes: r.notes,
    }));

    return NextResponse.json(
      { data: legacyMapped, meta: { total: legacyMapped.length, limit }, requestId, timestamp: new Date().toISOString() },
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
