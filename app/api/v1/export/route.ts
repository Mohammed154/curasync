// app/api/v1/export/route.ts — PDF export with Supabase Edge Function + Upstash rate limit + auth

import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { eq, and, gte, lte, desc } from "drizzle-orm";
import { db, profiles, vitals, patientProfiles, readings, medications, alertEvents } from "@/lib/db";
import { getPatientAuth, isNextResponse } from "@/lib/auth";
import { checkRateLimit, pdfLimiter } from "@/lib/ratelimit";
import { writeAuditLog, getRequestMeta } from "@/lib/audit";
import { invokeSupabasePdfExport } from "@/lib/supabase";
import { subDays, format } from "date-fns";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const requestId = nanoid(12);
  const searchParams = request.nextUrl.searchParams;
  const rangeStart = searchParams.get("rangeStart") ?? format(subDays(new Date(), 30), "yyyy-MM-dd");
  const rangeEnd   = searchParams.get("rangeEnd")   ?? format(new Date(), "yyyy-MM-dd");



  const authCtx = await getPatientAuth(request);
  if (isNextResponse(authCtx)) return authCtx;

  // Rate limit: 5 PDFs per patient per 24 hours
  const rl = await checkRateLimit(pdfLimiter, authCtx.patientId);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "PDF download limit reached (5 per 24 hours)", code: "RATE_LIMIT_EXCEEDED", requestId },
      { status: 429, headers: { "X-RateLimit-Remaining": "0" } }
    );
  }

  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(authCtx.patientId);

  let patientName = "Patient";
  let patientConditions: string[] = [];
  let recentReadings: any[] = [];
  let activeMeds: any[] = [];
  let activeAlerts: any[] = [];

  if (isUuid) {
    const patId = authCtx.patientId as `${string}-${string}-${string}-${string}-${string}`;
    const [patient] = await db.select().from(patientProfiles).where(eq(patientProfiles.id, patId)).limit(1);
    if (!patient) return NextResponse.json({ error: "Patient not found", code: "NOT_FOUND", requestId }, { status: 404 });
    patientName = patient.name;
    patientConditions = patient.conditions;

    const [rReadings, aMeds, aAlerts] = await Promise.all([
      db.select().from(readings).where(and(eq(readings.patientId, patId), gte(readings.recordedAt, new Date(rangeStart)), lte(readings.recordedAt, new Date(rangeEnd)))).orderBy(desc(readings.recordedAt)).limit(500),
      db.select().from(medications).where(and(eq(medications.patientId, patId), eq(medications.active, true))),
      db.select().from(alertEvents).where(and(eq(alertEvents.patientId, patId), eq(alertEvents.status, "active"))),
    ]);
    recentReadings = rReadings;
    activeMeds = aMeds;
    activeAlerts = aAlerts;
  } else {
    const [userProf] = await db.select().from(profiles).where(eq(profiles.id, authCtx.userId)).limit(1);
    if (!userProf) return NextResponse.json({ error: "Profile not found", code: "NOT_FOUND", requestId }, { status: 404 });
    patientName = userProf.displayName || "Patient";
    patientConditions = userProf.conditions || [];

    const vReadings = await db
      .select()
      .from(vitals)
      .where(and(eq(vitals.userId, authCtx.userId), gte(vitals.recordedAt, new Date(rangeStart)), lte(vitals.recordedAt, new Date(rangeEnd))))
      .orderBy(desc(vitals.recordedAt))
      .limit(500);
    recentReadings = vReadings;
  }

  // Audit log — PDF exports are high-sensitivity events
  void writeAuditLog({ actorId: authCtx.clerkUserId, action: "EXPORT", resource: "patient_report", patientId: authCtx.patientId, ...getRequestMeta(request) });

  // Generate PDF using Supabase Edge Function with resilient fallback
  const fallbackPreviewUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/pdf-preview?patientId=${authCtx.patientId}&rangeStart=${rangeStart}&rangeEnd=${rangeEnd}`;
  let pdfUrl: string | null = null;

  try {
    pdfUrl = await invokeSupabasePdfExport({
      patientId: authCtx.patientId,
      rangeStart,
      rangeEnd,
      patientName,
      conditions: patientConditions,
      reportId: requestId,
      previewUrl: fallbackPreviewUrl,
    });
  } catch (err) {
    console.warn("[export] Supabase Edge Function PDF generation fallback to /pdf-preview:", err);
    pdfUrl = fallbackPreviewUrl;
  }

  const pdfPayload = {
    reportId: nanoid(),
    generatedAt: new Date().toISOString(),
    patientId: authCtx.patientId,
    patientName,
    dateRange: { start: rangeStart, end: rangeEnd },
    conditions: patientConditions,
    readingCount: recentReadings.length,
    medicationCount: activeMeds.length,
    activeAlertCount: activeAlerts.length,
    downloadsRemaining: rl.remaining,
    pdfUrl,
  };

  return NextResponse.json(
    { data: pdfPayload, downloadsRemaining: rl.remaining, requestId, timestamp: new Date().toISOString() },
    { status: 200, headers: { "X-Request-Id": requestId, "X-RateLimit-Remaining": String(rl.remaining) } }
  );
}
