// app/api/v1/export/route.ts — PDF export with Upstash rate limit + auth

import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { eq, and, gte, lte, desc } from "drizzle-orm";
import { db, patientProfiles, readings, medications, alertEvents, medicationLogs } from "@/lib/db";
import { getPatientAuth, isNextResponse } from "@/lib/auth";
import { checkRateLimit, pdfLimiter } from "@/lib/ratelimit";
import { writeAuditLog, getRequestMeta } from "@/lib/audit";
import { subDays, format } from "date-fns";

async function generatePdfWithApi({ patientId, rangeStart, rangeEnd, patientName }: {
  patientId: string;
  rangeStart: string;
  rangeEnd: string;
  patientName: string;
}): Promise<string> {
  // In development, return a mock PDF URL since external APIs can't access localhost
  if (process.env.NEXT_PUBLIC_APP_ENV === 'development') {
    return `https://example.com/mock-pdf-${patientId}-${rangeStart}-to-${rangeEnd}.pdf`;
  }

  const baseUrl = process.env.PDF_API_BASE_URL;
  const apiKey = process.env.PDF_API_KEY;

  if (!baseUrl || !apiKey) {
    throw new Error("PDF API configuration missing");
  }

  // Construct the pdf-preview URL
  const previewUrl = `${process.env.NEXT_PUBLIC_APP_URL}/pdf-preview?patientId=${patientId}&rangeStart=${rangeStart}&rangeEnd=${rangeEnd}`;

  // Use api2pdf Chrome endpoint to render the page and generate PDF
  const response = await fetch(`${baseUrl}/chrome/pdf/url`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': apiKey,
    },
    body: JSON.stringify({
      url: previewUrl,
      options: {
        landscape: false,
        width: '8.27in',
        height: '11.69in',
        printBackground: true,
        marginTop: '0.4in',
        marginRight: '0.4in',
        marginBottom: '0.4in',
        marginLeft: '0.4in'
      }
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`PDF API error: ${response.status} ${response.statusText} - ${errorText}`);
  }

  const data = await response.json();
  return data.FileUrl; // api2pdf returns the PDF URL
}

export async function GET(request: NextRequest) {
  const requestId = nanoid(12);

  // In development, return mock data instead of hitting the database
  if (process.env.NEXT_PUBLIC_APP_ENV === 'development') {
    const { searchParams } = new URL(request.url);
    const rangeStart = searchParams.get("rangeStart") ?? format(subDays(new Date(), 30), "yyyy-MM-dd");
    const rangeEnd   = searchParams.get("rangeEnd")   ?? format(new Date(), "yyyy-MM-dd");

    const mockPayload = {
      reportId: nanoid(),
      generatedAt: new Date().toISOString(),
      patientId: "mock-patient-id",
      patientName: "Mock Patient",
      dateRange: { start: rangeStart, end: rangeEnd },
      conditions: ["Type 2 Diabetes", "Hypertension"],
      readingCount: 45,
      medicationCount: 3,
      activeAlertCount: 2,
      downloadsRemaining: 4,
      pdfUrl: `https://example.com/mock-pdf-mock-patient-id-${rangeStart}-to-${rangeEnd}.pdf`,
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

  const { searchParams } = new URL(request.url);
  const rangeStart = searchParams.get("rangeStart") ?? format(subDays(new Date(), 30), "yyyy-MM-dd");
  const rangeEnd   = searchParams.get("rangeEnd")   ?? format(new Date(), "yyyy-MM-dd");
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

  // Generate PDF using API
  const pdfUrl = await generatePdfWithApi({
    patientId: authCtx.patientId,
    rangeStart,
    rangeEnd,
    patientName: patient.name
  });

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
