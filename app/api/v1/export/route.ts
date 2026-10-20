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
  const formatParam = request.nextUrl.searchParams.get("format")?.toLowerCase() || "pdf";

  const authCtx = await getPatientAuth(request);
  if (isNextResponse(authCtx)) return authCtx;

  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(authCtx.patientId);
  const patId = isUuid ? (authCtx.patientId as `${string}-${string}-${string}-${string}-${string}`) : null;

  // ── CSV Data Export Handling (Full Clinical History) ───────────────────────
  if (formatParam === "csv") {
    const { journalEntries, glucoseReadings } = await import("@/lib/db");

    let patientName = "Patient";
    let patientConditions: string[] = [];

    if (patId) {
      const [patient] = await db.select().from(patientProfiles).where(eq(patientProfiles.id, patId)).limit(1);
      if (patient) {
        patientName = patient.name;
        patientConditions = patient.conditions || [];
      }
    } else {
      const [userProf] = await db.select().from(profiles).where(eq(profiles.id, authCtx.userId)).limit(1);
      if (userProf) {
        patientName = userProf.displayName || "Patient";
        patientConditions = userProf.conditions || [];
      }
    }

    // Query all records for this patient
    const [allVitals, allReadings, allGlucose, allMeds, allJournals] = await Promise.all([
      db.select().from(vitals).where(eq(vitals.userId, authCtx.userId)).orderBy(desc(vitals.recordedAt)).limit(1000).catch(() => []),
      patId ? db.select().from(readings).where(eq(readings.patientId, patId)).orderBy(desc(readings.recordedAt)).limit(1000).catch(() => []) : [],
      db.select().from(glucoseReadings).where(eq(glucoseReadings.userId, authCtx.userId)).orderBy(desc(glucoseReadings.recordedAt)).limit(1000).catch(() => []),
      patId ? db.select().from(medications).where(eq(medications.patientId, patId)).orderBy(desc(medications.createdAt)).catch(() => []) : [],
      patId ? db.select().from(journalEntries).where(eq(journalEntries.patientId, patId)).orderBy(desc(journalEntries.recordedAt)).limit(1000).catch(() => []) : [],
    ]);

    const escapeCsv = (val: unknown): string => {
      if (val === null || val === undefined) return "";
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const csvLines: string[] = [];
    csvLines.push("# CURASYNC COMPREHENSIVE CLINICAL HEALTH EXPORT");
    csvLines.push(`# Exported At: ${new Date().toISOString()}`);
    csvLines.push(`# Patient Name: ${patientName}`);
    csvLines.push(`# Patient User ID: ${authCtx.userId}`);
    csvLines.push(`# Conditions: ${(patientConditions || []).join("; ")}`);
    csvLines.push("");

    // Section 1: Biometric Readings & Vitals
    csvLines.push("=== SECTION: BIOMETRIC VITALS & TELEMETRY ===");
    csvLines.push("Timestamp,Metric Type,Value,Unit,Source,Notes");
    for (const v of allVitals) {
      csvLines.push([
        escapeCsv(v.recordedAt ? new Date(v.recordedAt).toISOString() : ""),
        escapeCsv(v.type),
        escapeCsv(v.value),
        escapeCsv(v.unit),
        escapeCsv(v.source),
        escapeCsv(v.notes || ""),
      ].join(","));
    }
    for (const r of allReadings) {
      csvLines.push([
        escapeCsv(r.recordedAt ? new Date(r.recordedAt).toISOString() : ""),
        escapeCsv(r.type),
        escapeCsv(r.value),
        escapeCsv(r.unit),
        escapeCsv(r.source),
        escapeCsv(r.notes || ""),
      ].join(","));
    }
    csvLines.push("");

    // Section 2: Blood Glucose Logs
    csvLines.push("=== SECTION: BLOOD GLUCOSE LOGS ===");
    csvLines.push("Timestamp,Value,Unit,Meal Context,Source,Notes");
    for (const g of allGlucose) {
      csvLines.push([
        escapeCsv(g.recordedAt ? new Date(g.recordedAt).toISOString() : ""),
        escapeCsv(g.value),
        escapeCsv(g.unit),
        escapeCsv(g.mealContext || ""),
        escapeCsv(g.source),
        escapeCsv(g.notes || ""),
      ].join(","));
    }
    csvLines.push("");

    // Section 3: Medications
    csvLines.push("=== SECTION: PRESCRIBED MEDICATIONS & REGIMENS ===");
    csvLines.push("Medication Name,Dosage,Frequency,Condition,Start Date,Active");
    for (const m of allMeds) {
      csvLines.push([
        escapeCsv(m.name),
        escapeCsv(m.dosage),
        escapeCsv(m.frequency),
        escapeCsv(m.conditionId),
        escapeCsv(m.startDate),
        escapeCsv(m.active ? "Yes" : "No"),
      ].join(","));
    }
    csvLines.push("");

    // Section 4: Journal & Symptom Entries
    csvLines.push("=== SECTION: SYMPTOM JOURNAL & NOTES ===");
    csvLines.push("Recorded At,Condition,Severity (1-10),Text / Symptoms,Body Location");
    for (const j of allJournals) {
      csvLines.push([
        escapeCsv(j.recordedAt ? new Date(j.recordedAt).toISOString() : ""),
        escapeCsv(j.conditionId),
        escapeCsv(j.severity),
        escapeCsv(j.text),
        escapeCsv(j.bodyLocation || ""),
      ].join(","));
    }

    void writeAuditLog({
      actorId: authCtx.clerkUserId,
      action: "EXPORT",
      resource: "patient_csv_export",
      patientId: authCtx.patientId,
      ...getRequestMeta(request),
    });

    const csvOutput = csvLines.join("\r\n");
    const filename = `curasync-health-data-${format(new Date(), "yyyy-MM-dd")}.csv`;

    return new NextResponse(csvOutput, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store, no-cache, must-revalidate",
        "X-Request-Id": requestId,
      },
    });
  }

  // ── PDF Export Handling (Rate Limited) ─────────────────────────────────────
  // Rate limit: 5 PDFs per patient per 24 hours
  const rl = await checkRateLimit(pdfLimiter, authCtx.patientId);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "PDF download limit reached (5 per 24 hours)", code: "RATE_LIMIT_EXCEEDED", requestId },
      { status: 429, headers: { "X-RateLimit-Remaining": "0" } }
    );
  }

  const now = new Date();
  const rangeStart = subDays(now, 30).toISOString();
  const rangeEnd = now.toISOString();

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
