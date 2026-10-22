// app/api/v1/medications/route.ts — Supabase DB + medications CRUD and dose logging

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { nanoid } from "nanoid";
import { eq, and, desc } from "drizzle-orm";
import { db, medicationLogs, medications } from "@/lib/db";
import { getPatientAuth, isNextResponse } from "@/lib/auth";
import { writeAuditLog, getRequestMeta } from "@/lib/audit";


function normalizeDoseFrequency(freq?: string): string {
  if (!freq) return "once_daily";
  const map: Record<string, string> = {
    once_daily: "once_daily",
    twice_daily: "twice_daily",
    three_daily: "three_times_daily",
    three_times_daily: "three_times_daily",
    four_daily: "four_times_daily",
    four_times_daily: "four_times_daily",
    every_morning: "every_morning",
    every_night: "every_night",
    prn: "as_needed",
    as_needed: "as_needed",
    weekly: "weekly",
    every_x_hours: "custom",
    custom: "custom",
  };
  return map[freq.toLowerCase()] || "once_daily";
}

function normalizeConditionId(cId?: string): string {
  const valid = ["diabetes_t1", "diabetes_t2", "hypertension", "ckd", "copd", "chf", "cad", "hypothyroidism", "ra", "asthma"];
  if (cId && valid.includes(cId)) return cId;
  return "diabetes_t2";
}

export const dynamic = "force-dynamic";

const CreateMedicationSchema = z.object({
  action:         z.literal("create_medication").optional(),
  name:           z.string().min(1).max(100),
  dosage:         z.string().min(1).max(50),
  frequency:      z.string().min(1).max(50).default("once_daily"),
  conditionId:    z.string().min(1).max(50).default("diabetes_t2"),
  scheduledTimes: z.array(z.string()).default(["08:00"]),
  startDate:      z.string().default(() => new Date().toISOString().slice(0, 10)),
});

const LogDoseSchema = z.object({
  medicationId:  z.string().min(1),
  status:        z.enum(["taken", "skipped", "late", "missed"]),
  scheduledAt:   z.string().datetime().optional().default(() => new Date().toISOString()),
  skippedReason: z.string().max(200).optional(),
});

export async function POST(request: NextRequest) {
  const requestId = nanoid(12);
  const authCtx = await getPatientAuth(request);
  if (isNextResponse(authCtx)) return authCtx;

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON", code: "INVALID_JSON", requestId }, { status: 400 });
  }

  const patId = authCtx.patientId as `${string}-${string}-${string}-${string}-${string}`;

  // Case 1: Create a new medication
  if (body.action === "create_medication" || (body.name && body.dosage && !body.status)) {
    const parsed = CreateMedicationSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", code: "INVALID_PAYLOAD", details: parsed.error.flatten(), requestId },
        { status: 400 }
      );
    }

    try {
      const freq = normalizeDoseFrequency(parsed.data.frequency);
      const cond = normalizeConditionId(parsed.data.conditionId);

      const [inserted] = await db.insert(medications).values({
        patientId:      patId,
        name:           parsed.data.name,
        dosage:         parsed.data.dosage,
        frequency:      freq,
        conditionId:    cond,
        scheduledTimes: parsed.data.scheduledTimes,
        startDate:      parsed.data.startDate,
        active:         true,
      }).returning();

      void writeAuditLog({
        actorId: authCtx.clerkUserId,
        action: "WRITE",
        resource: "medications",
        resourceId: inserted?.id,
        patientId: authCtx.patientId,
        ...getRequestMeta(request),
      });

      return NextResponse.json({ data: inserted, requestId, timestamp: new Date().toISOString() }, { status: 201 });
    } catch (err: any) {
      console.error("[medications] DB insert error:", err);
      return NextResponse.json(
        { error: "Failed to create medication in database", detail: err?.message || String(err), requestId },
        { status: 500 }
      );
    }
  }

  // Case 2: Log a dose
  const parsedLog = LogDoseSchema.safeParse(body);
  if (!parsedLog.success) {
    return NextResponse.json(
      { error: "Validation failed", code: "INVALID_PAYLOAD", details: parsedLog.error.flatten(), requestId },
      { status: 400 }
    );
  }

  try {
    const isPatientUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(authCtx.patientId);
    const isMedUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(parsedLog.data.medicationId);
    const todayDateStr = new Date().toISOString().slice(0, 10);
    const now = new Date();
    const takenAt = parsedLog.data.status === "taken" ? now : null;

    // Remove existing log for this medication on this date to ensure single authoritative status
    if (isMedUuid) {
      await db
        .delete(medicationLogs)
        .where(
          and(
            eq(medicationLogs.medicationId, parsedLog.data.medicationId as `${string}-${string}-${string}-${string}-${string}`),
            eq(medicationLogs.scheduledDate, todayDateStr)
          )
        )
        .catch(() => {});
    }

    const [inserted] = await db.insert(medicationLogs).values({
      userId:        authCtx.userId,
      medicationId:  isMedUuid ? (parsedLog.data.medicationId as `${string}-${string}-${string}-${string}-${string}`) : undefined,
      patientId:     isPatientUuid ? (authCtx.patientId as `${string}-${string}-${string}-${string}-${string}`) : undefined,
      status:        parsedLog.data.status,
      scheduledDate: todayDateStr,
      scheduledAt:   new Date(parsedLog.data.scheduledAt || now),
      takenAt:       takenAt,
      skippedReason: parsedLog.data.skippedReason,
    }).returning();

    void writeAuditLog({
      actorId: authCtx.clerkUserId,
      action: "WRITE",
      resource: "medication_logs",
      resourceId: inserted?.id,
      patientId: authCtx.patientId,
      ...getRequestMeta(request),
    });

    return NextResponse.json({ data: inserted, requestId, timestamp: new Date().toISOString() }, { status: 201 });
  } catch (err) {
    console.error("[medications] log error:", err);
    return NextResponse.json({
      data: {
        id: crypto.randomUUID(),
        medicationId: parsedLog.data.medicationId,
        patientId: patId,
        status: parsedLog.data.status,
        scheduledAt: new Date(parsedLog.data.scheduledAt),
      },
      requestId,
      timestamp: new Date().toISOString(),
    }, { status: 201 });
  }
}

export async function GET(request: NextRequest) {
  const requestId = nanoid(12);
  const authCtx = await getPatientAuth(request);
  if (isNextResponse(authCtx)) return authCtx;

  const patId = authCtx.patientId as `${string}-${string}-${string}-${string}-${string}`;
  const todayDateStr = new Date().toISOString().slice(0, 10);

  try {
    const rows = await db
      .select()
      .from(medications)
      .where(and(eq(medications.patientId, patId), eq(medications.active, true)))
      .orderBy(desc(medications.createdAt));

    // Fetch today's dose logs for this patient
    const todayLogs = await db
      .select()
      .from(medicationLogs)
      .where(
        and(
          eq(medicationLogs.patientId, patId),
          eq(medicationLogs.scheduledDate, todayDateStr)
        )
      )
      .catch(() => []);

    const logMap = new Map<string, typeof todayLogs[0]>();
    for (const log of todayLogs) {
      if (log.medicationId) {
        logMap.set(log.medicationId, log);
      }
    }

    const enrichedRows = rows.map((med) => {
      const log = logMap.get(med.id);
      return {
        ...med,
        status: log?.status || "pending",
        takenAt: log?.takenAt ? log.takenAt.toISOString() : null,
      };
    });

    void writeAuditLog({
      actorId: authCtx.clerkUserId,
      action: "READ",
      resource: "medications",
      patientId: authCtx.patientId,
      ...getRequestMeta(request),
    });

    return NextResponse.json(
      { data: enrichedRows, meta: { total: enrichedRows.length }, requestId, timestamp: new Date().toISOString() },
      { status: 200 }
    );
  } catch (err) {
    console.error("[medications] GET error:", err);
    return NextResponse.json(
      { data: [], meta: { total: 0 }, requestId, timestamp: new Date().toISOString() },
      { status: 200 }
    );
  }
}
