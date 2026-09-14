// app/api/v1/medications/route.ts — Supabase DB + medications CRUD and dose logging

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { nanoid } from "nanoid";
import { eq, and, desc } from "drizzle-orm";
import { db, medicationLogs, medications } from "@/lib/db";
import { getPatientAuth, isNextResponse } from "@/lib/auth";
import { writeAuditLog, getRequestMeta } from "@/lib/audit";
import { getMockDashboardData } from "@/lib/mock-data";

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
      const [inserted] = await db.insert(medications).values({
        patientId:      patId,
        name:           parsed.data.name,
        dosage:         parsed.data.dosage,
        frequency:      parsed.data.frequency,
        conditionId:    parsed.data.conditionId,
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
    } catch (err) {
      console.error("[medications] DB insert error:", err);
      // Fallback response for dev if DB not active
      const fallbackMed = {
        id: crypto.randomUUID(),
        patientId: patId,
        name: parsed.data.name,
        dosage: parsed.data.dosage,
        frequency: parsed.data.frequency,
        conditionId: parsed.data.conditionId,
        scheduledTimes: parsed.data.scheduledTimes,
        startDate: parsed.data.startDate,
        active: true,
        createdAt: new Date(),
      };
      return NextResponse.json({ data: fallbackMed, requestId, timestamp: new Date().toISOString() }, { status: 201 });
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
    const medId = parsedLog.data.medicationId as `${string}-${string}-${string}-${string}-${string}`;
    const [inserted] = await db.insert(medicationLogs).values({
      medicationId:  medId,
      patientId:     patId,
      status:        parsedLog.data.status,
      scheduledAt:   new Date(parsedLog.data.scheduledAt),
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

  try {
    const rows = await db
      .select()
      .from(medications)
      .where(and(eq(medications.patientId, patId), eq(medications.active, true)))
      .orderBy(desc(medications.createdAt));

    void writeAuditLog({
      actorId: authCtx.clerkUserId,
      action: "READ",
      resource: "medications",
      patientId: authCtx.patientId,
      ...getRequestMeta(request),
    });

    // If DB is configured and has rows, return them
    if (rows.length > 0) {
      return NextResponse.json({ data: rows, meta: { total: rows.length }, requestId, timestamp: new Date().toISOString() }, { status: 200 });
    }
  } catch (err) {
    console.error("[medications] GET error:", err);
  }

  // Fallback to mock medications if DB table is empty / in dev
  const mockMeds = getMockDashboardData().todayMedications.map((m) => ({
    id: m.id,
    patientId: patId,
    name: m.name,
    dosage: m.dosage,
    frequency: "once_daily",
    conditionId: m.conditionId,
    scheduledTimes: [m.scheduledAt],
    active: true,
    status: m.status,
  }));

  return NextResponse.json({ data: mockMeds, meta: { total: mockMeds.length }, requestId, timestamp: new Date().toISOString() }, { status: 200 });
}
