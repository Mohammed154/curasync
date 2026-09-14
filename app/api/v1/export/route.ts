// app/api/v1/export/route.ts — PDF export with Supabase Edge Function + Upstash rate limit + auth

import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { eq, and, gte, lte, desc } from "drizzle-orm";
import { db, patientProfiles, readings, medications, alertEvents } from "@/lib/db";
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

  // In development or test environments, invoke Supabase Edge Function with resilient fallback
  if (process.env.NEXT_PUBLIC_APP_ENV === "development") {
    const fallbackPreviewUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/pdf-preview?patientId=mock-patient-id&rangeStart=${rangeStart}&rangeEnd=${rangeEnd}`;
    let generatedPdfUrl: string | null = null;

    try {
      generatedPdfUrl = await invokeSupabasePdfExport({
        patientId: "mock-patient-id",
        rangeStart,
        rangeEnd,
        patientName: "Alex Rivera",
        conditions: ["Type 2 Diabetes", "Hypertension"],
        reportId: requestId,
        previewUrl: fallbackPreviewUrl,
      });
    } catch (err) {
      console.warn("[export] Supabase Edge Function invocation fallback to /pdf-preview:", err);
      generatedPdfUrl = fallbackPreviewUrl;
    }

    const mockPayload = {
      reportId: nanoid(),
      generatedAt: new Date().toISOString(),
      patientId: "mock-patient-id",
      patientName: "Alex Rivera",
      dateRange: { start: rangeStart, end: rangeEnd },
      conditions: ["Type 2 Diabetes", "Hypertension"],
      readingCount: 45,
      medicationCount: 3,
      activeAlertCount: 2,
      downloadsRemaining: 4,
      pdfUrl: generatedPdfUrl,
    };

    return NextResponse.json(
      { data: mockPayload, downloadsRemaining: 4, requestId, timestamp: new Date().toISOString() },
      { status: 200, headers: { "X-Request-Id": requestId, "X-RateLimit-Remaining": "4" } }
    );
  }

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

  const patId = authCtx.patientId as `${string}-${string}-${string}-${string}-${string}`;

  // Fetch all data for the report period
  const [patient] = await db.select().from(patientProfiles).where(eq(patientProfiles.id, patId)).limit(1);
  if (!patient) return NextResponse.json({ error: "Patient not found", code: "NOT_FOUND", requestId }, { status: 404 });

  const [recentReadings, activeMeds, activeAlerts] = await Promise.all([
    db.select().from(readings).where(and(eq(readings.patientId, patId), gte(readings.recordedAt, new Date(rangeStart)), lte(readings.recordedAt, new Date(rangeEnd)))).orderBy(desc(readings.recordedAt)).limit(500),
    db.select().from(medications).where(and(eq(medications.patientId, patId), eq(medications.active, true))),
    db.select().from(alertEvents).where(and(eq(alertEvents.patientId, patId), eq(alertEvents.status, "active"))),
  ]);

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
      patientName: patient.name,
      conditions: patient.conditions,
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
    patientName: patient.name,
    dateRange: { start: rangeStart, end: rangeEnd },
    conditions: patient.conditions,
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
