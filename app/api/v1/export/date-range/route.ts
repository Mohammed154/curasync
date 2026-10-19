// app/api/v1/export/date-range/route.ts
// Compiles strictly filtered vitals, glucose readings, and medication logs into a downloadable PDF

import { NextRequest, NextResponse } from "next/server";
import { getPatientAuth, isNextResponse } from "@/lib/auth";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { generateReportPdfBuffer, MedicalReportData } from "@/lib/reports/medical-pdf";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    // 1. Authenticate patient
    const authCtx = await getPatientAuth(request);
    if (isNextResponse(authCtx)) {
      return authCtx;
    }

    const { searchParams } = new URL(request.url);
    const rangeStartParam = searchParams.get("rangeStart");
    const rangeEndParam = searchParams.get("rangeEnd");

    if (!rangeStartParam || !rangeEndParam) {
      return NextResponse.json(
        { success: false, error: "Missing required query parameters: rangeStart and rangeEnd" },
        { status: 400 }
      );
    }

    const startDate = new Date(rangeStartParam);
    const endDate = new Date(rangeEndParam);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return NextResponse.json(
        { success: false, error: "Invalid rangeStart or rangeEnd date format" },
        { status: 400 }
      );
    }

    // Set end date to end of that day (23:59:59.999) if only date provided
    if (rangeEndParam.length === 10) {
      endDate.setHours(23, 59, 59, 999);
    }

    const startIso = startDate.toISOString();
    const endIso = endDate.toISOString();

    const supabase = getSupabaseAdminClient();
    const userId = authCtx.userId;

    // 2. Fetch user profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("display_name, email")
      .eq("id", userId)
      .maybeSingle();

    const patientName = profile?.display_name || authCtx.displayName || "Patient";
    const patientEmail = profile?.email || authCtx.email || "Not Provided";

    // 3. Query vitals strictly within range
    const { data: vitalsRows } = await supabase
      .from("vitals")
      .select("type, value, unit, recorded_at, source")
      .eq("user_id", userId)
      .gte("recorded_at", startIso)
      .lte("recorded_at", endIso)
      .order("recorded_at", { ascending: false });

    // Also check legacy readings table if vitals is empty and userId is UUID
    let finalVitals = vitalsRows || [];
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId);
    if (finalVitals.length === 0 && isUuid) {
      const { data: legacyReadings } = await supabase
        .from("readings")
        .select("type, value, unit, recorded_at, source")
        .eq("patient_id", userId)
        .gte("recorded_at", startIso)
        .lte("recorded_at", endIso)
        .order("recorded_at", { ascending: false });
      if (legacyReadings?.length) {
        finalVitals = legacyReadings;
      }
    }

    // 4. Query glucose readings strictly within range
    const { data: glucoseRows } = await supabase
      .from("glucose_readings")
      .select("value, unit, meal_context, recorded_at")
      .eq("user_id", userId)
      .gte("recorded_at", startIso)
      .lte("recorded_at", endIso)
      .order("recorded_at", { ascending: false });

    // Also extract glucose from vitals if glucose_readings is empty
    let finalGlucose = glucoseRows || [];
    if (finalGlucose.length === 0) {
      finalGlucose = finalVitals
        .filter((v) => v.type === "blood_glucose")
        .map((v) => ({
          value: Number(v.value),
          unit: v.unit,
          meal_context: "general",
          recorded_at: v.recorded_at,
        }));
    }

    // Calculate glucose metrics
    const allGlucose = finalGlucose.map((g) => Number(g.value));
    const totalReadings = allGlucose.length;
    const avgGlucose = totalReadings > 0
      ? allGlucose.reduce((a, b) => a + b, 0) / totalReadings
      : 0;
    const spikesCount = allGlucose.filter((v) => v > 180).length;
    const lowsCount = allGlucose.filter((v) => v < 70).length;
    const inRangeCount = allGlucose.filter((v) => v >= 70 && v <= 180).length;
    const timeInRange = totalReadings > 0
      ? Math.round((inRangeCount / totalReadings) * 100)
      : 100;

    // 5. Query medication logs strictly within range
    const { data: medLogs } = await supabase
      .from("medication_logs")
      .select("medication_name, dosage, status, scheduled_at")
      .eq("user_id", userId)
      .gte("scheduled_at", startIso)
      .lte("scheduled_at", endIso)
      .order("scheduled_at", { ascending: false });

    const totalScheduled = medLogs?.length || 0;
    const totalTaken = medLogs?.filter((m) => m.status === "taken").length || 0;
    const adherence = totalScheduled > 0
      ? Math.round((totalTaken / totalScheduled) * 100)
      : 100;

    // 6. Query condition/journal notes within range
    const { data: journalRows } = await supabase
      .from("journal_entries")
      .select("symptoms, notes, logged_at")
      .gte("logged_at", startIso)
      .lte("logged_at", endIso);

    const conditionNotes = (journalRows || []).map(
      (j) => `[${new Date(j.logged_at).toLocaleDateString()}] ${j.notes || (j.symptoms || []).join(", ")}`
    );

    const startFormatted = startDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    const endFormatted = endDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

    // 7. Compile report payload
    const reportData: MedicalReportData = {
      patient: {
        displayName: patientName,
        email: patientEmail,
        userId: userId,
        reportingPeriod: `${startFormatted} – ${endFormatted}`,
        generatedAt: new Date().toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        }),
      },
      glucoseMetrics: {
        average: avgGlucose,
        totalReadings: totalReadings,
        spikesCount: spikesCount,
        lowsCount: lowsCount,
        timeInRangePercentage: timeInRange,
      },
      vitals: finalVitals.map((v) => ({
        type: v.type,
        value: v.value,
        unit: v.unit,
        recordedAt: v.recorded_at,
        source: v.source,
      })),
      glucoseLogs: finalGlucose.map((g) => ({
        value: Number(g.value),
        unit: g.unit || "mg/dL",
        mealContext: g.meal_context || "general",
        recordedAt: g.recorded_at,
      })),
      medicationAdherence: {
        totalScheduled: totalScheduled,
        totalTaken: totalTaken,
        adherencePercentage: adherence,
        items: (medLogs || []).map((m) => ({
          name: m.medication_name || "Prescription",
          dosage: m.dosage || "Standard dose",
          status: m.status || "taken",
          scheduledAt: m.scheduled_at,
        })),
      },
      physicianNotes: conditionNotes.length > 0
        ? `Logged Condition Notes during this interval:\n${conditionNotes.join("\n")}`
        : "Clinical summary compiled for patient-selected timeframe. All biometric readings, medication cycles, and glycemic analytics reflect entries within the selected interval.",
    };

    // 8. Generate PDF binary buffer
    const pdfBuffer = await generateReportPdfBuffer(reportData);

    // 9. Record report entry in public.reports
    await supabase.from("reports").insert({
      user_id: userId,
      report_type: "range_export",
      date_range_start: startIso,
      date_range_end: endIso,
      status: "completed",
      recipient_email: patientEmail === "Not Provided" ? null : patientEmail,
    });

    const startFilename = rangeStartParam.slice(0, 10);
    const endFilename = rangeEndParam.slice(0, 10);
    const filename = `CuraSync_Report_${startFilename}_to_${endFilename}.pdf`;

    return new Response(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": String(pdfBuffer.length),
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    });
  } catch (error: any) {
    console.error("[export:date-range] Error generating PDF:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to generate date-range PDF" },
      { status: 500 }
    );
  }
}
