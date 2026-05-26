// app/api/v1/medications/route.ts — Clerk auth + Supabase DB

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { nanoid } from "nanoid";
import { eq, and, desc } from "drizzle-orm";
import { db, medicationLogs, medications } from "@/lib/db";
import { getPatientAuth, isNextResponse } from "@/lib/auth";
import { writeAuditLog, getRequestMeta } from "@/lib/audit";

const MedicationLogSchema = z.object({
  medicationId:  z.string().min(1),
  status:        z.enum(["taken", "skipped", "late"]),
  scheduledAt:   z.string().datetime(),
  skippedReason: z.string().max(200).optional(),
});

export async function POST(request: NextRequest) {
  const requestId = nanoid(12);
  const authCtx = await getPatientAuth(request);
  if (isNextResponse(authCtx)) return authCtx;

  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON", code: "INVALID_JSON", requestId }, { status: 400 });
  }

  const parsed = MedicationLogSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", code: "INVALID_PAYLOAD", details: parsed.error.flatten(), requestId }, { status: 400 });
  }

  const patId = authCtx.patientId as `${string}-${string}-${string}-${string}-${string}`;
  const medId = parsed.data.medicationId as `${string}-${string}-${string}-${string}-${string}`;

  const [inserted] = await db.insert(medicationLogs).values({
    medicationId:  medId,
    patientId:     patId,
    status:        parsed.data.status,
    scheduledAt:   new Date(parsed.data.scheduledAt),
    skippedReason: parsed.data.skippedReason,
  }).returning();

  void writeAuditLog({ actorId: authCtx.clerkUserId, action: "WRITE", resource: "medication_logs", resourceId: inserted?.id, patientId: authCtx.patientId, ...getRequestMeta(request) });

  return NextResponse.json({ data: inserted, requestId, timestamp: new Date().toISOString() }, { status: 201 });
}

export async function GET(request: NextRequest) {
  const requestId = nanoid(12);
  const authCtx = await getPatientAuth(request);
  if (isNextResponse(authCtx)) return authCtx;

  const patId = authCtx.patientId as `${string}-${string}-${string}-${string}-${string}`;
  const rows = await db.select().from(medications).where(and(eq(medications.patientId, patId), eq(medications.active, true))).orderBy(desc(medications.createdAt));

  void writeAuditLog({ actorId: authCtx.clerkUserId, action: "READ", resource: "medications", patientId: authCtx.patientId, ...getRequestMeta(request) });

  return NextResponse.json({ data: rows, meta: { total: rows.length }, requestId, timestamp: new Date().toISOString() }, { status: 200 });
}
