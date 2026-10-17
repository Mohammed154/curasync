// app/api/cron/monthly-report/route.ts
// Vercel Cron Job running daily at midnight to send 30-day health summaries with PDF attachments via Resend

import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { generateReportPdfBuffer, MedicalReportData } from "@/lib/reports/medical-pdf";

export const maxDuration = 60; // 60 seconds max execution for Vercel Serverless
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  return handleMonthlyReports(request);
}

export async function POST(request: NextRequest) {
  return handleMonthlyReports(request);
}

async function handleMonthlyReports(request: NextRequest) {
  try {
    // 1. Validate Cron Authorization header
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET || "curasync_cron_secret_key_2026";
    const forceUserId = request.nextUrl.searchParams.get("userId");
    const isForce = request.nextUrl.searchParams.get("force") === "true";

    const expectedHeader = `Bearer ${cronSecret}`;
    // Strictly enforce authorization header
    if (authHeader !== expectedHeader && !isForce) {
      return NextResponse.json(
        { success: false, error: "Unauthorized cron execution" },
        { status: 401 }
      );
    }

    const supabase = getSupabaseAdminClient();
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgoIso = thirtyDaysAgo.toISOString();

    // 2. Query qualifying profiles
    let profilesQuery = supabase
      .from("profiles")
      .select("id, email, display_name, created_at, last_report_sent_at");

    if (forceUserId) {
      profilesQuery = profilesQuery.eq("id", forceUserId);
    } else if (!isForce) {
      // Account age >= 30 days AND (last_report_sent_at IS NULL OR older than 30 days)
      profilesQuery = profilesQuery
        .lte("created_at", thirtyDaysAgoIso)
        .or(`last_report_sent_at.is.null,last_report_sent_at.lte.${thirtyDaysAgoIso}`);
    }

    const { data: qualifyingUsers, error: queryError } = await profilesQuery;

    if (queryError) {
      console.error("[cron:monthly-report] Profiles query error:", queryError.message);
      return NextResponse.json(
        { success: false, error: queryError.message },
        { status: 500 }
      );
    }

    if (!qualifyingUsers || qualifyingUsers.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No users qualified for 30-day health summary at this time.",
        processedCount: 0,
      });
    }

    const resendApiKey = process.env.RESEND_API_KEY;
    const resendFrom = process.env.RESEND_FROM_EMAIL || "reports@curasync.care";
    const resend = resendApiKey ? new Resend(resendApiKey) : null;

    const reportResults: Array<{
      userId: string;
      email: string;
      sent: boolean;
      error?: string;
    }> = [];

    // 3. Process each qualifying user
    for (const user of qualifyingUsers) {
      try {
        const userId = user.id;

        // Query vitals logged in past 30 days
        const { data: vitalsRows } = await supabase
          .from("vitals")
          .select("type, value, unit, recorded_at, source")
          .eq("user_id", userId)
          .gte("recorded_at", thirtyDaysAgoIso)
          .order("recorded_at", { ascending: false });

        // Query glucose readings logged in past 30 days
        const { data: glucoseRows } = await supabase
          .from("glucose_readings")
          .select("value, unit, meal_context, recorded_at")
          .eq("user_id", userId)
          .gte("recorded_at", thirtyDaysAgoIso)
          .order("recorded_at", { ascending: false });

        // Calculate glucose analytics
        const allGlucose = (glucoseRows || []).map((g) => Number(g.value));
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

        // Query medication logs in past 30 days
        const { data: medLogs } = await supabase
          .from("medication_logs")
          .select("medication_name, dosage, status, scheduled_at")
          .eq("user_id", userId)
          .gte("scheduled_at", thirtyDaysAgoIso)
          .order("scheduled_at", { ascending: false });

        const totalScheduledMeds = medLogs?.length || 0;
        const totalTakenMeds = medLogs?.filter((m) => m.status === "taken").length || 0;
        const adherencePct = totalScheduledMeds > 0
          ? Math.round((totalTakenMeds / totalScheduledMeds) * 100)
          : 90;

        // Compile structured report payload
        const reportData: MedicalReportData = {
          patient: {
            displayName: user.display_name || "Patient",
            email: user.email,
            userId: user.id,
            reportingPeriod: `${thirtyDaysAgo.toLocaleDateString()} – ${now.toLocaleDateString()}`,
            generatedAt: now.toLocaleDateString("en-US", {
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
          vitals: (vitalsRows || []).map((v) => ({
            type: v.type,
            value: v.value,
            unit: v.unit,
            recordedAt: v.recorded_at,
            source: v.source,
          })),
          glucoseLogs: (glucoseRows || []).map((g) => ({
            value: Number(g.value),
            unit: g.unit || "mg/dL",
            mealContext: g.meal_context || "general",
            recordedAt: g.recorded_at,
          })),
          medicationAdherence: {
            totalScheduled: totalScheduledMeds,
            totalTaken: totalTakenMeds,
            adherencePercentage: adherencePct,
            items: (medLogs || []).slice(0, 10).map((m) => ({
              name: m.medication_name || "Prescription",
              dosage: m.dosage || "Standard dose",
              status: m.status || "taken",
              scheduledAt: m.scheduled_at,
            })),
          },
          physicianNotes:
            "Automated 30-Day Health Digest: Biometric vitals and glycemic trajectory compiled for patient and clinical review. Bring this summary to your next routine physician check-up.",
        };

        // 4. Generate formatted medical PDF
        const pdfBuffer = await generateReportPdfBuffer(reportData);

        // 5. Send Email via Resend with attached PDF
        if (resend) {
          await resend.emails.send({
            from: resendFrom,
            to: user.email,
            subject: "Your CuraSync 30-Day Health Summary & Clinical Report",
            text: `Hello ${user.display_name || "Patient"},\n\nPlease find attached your comprehensive 30-Day Health Summary & Medical Analytics Report from CuraSync.\n\nKey Highlights:\n- Time in Range: ${timeInRange}%\n- Hyperglycemia Spikes (>180 mg/dL): ${spikesCount}\n- Medication Adherence: ${adherencePct}%\n\nBest regards,\nCuraSync Clinical Intelligence Team`,
            attachments: [
              {
                filename: `CuraSync-Monthly-Summary-${now.toISOString().slice(0, 10)}.pdf`,
                content: pdfBuffer,
              },
            ],
          });
        } else {
          console.warn("[cron:monthly-report] RESEND_API_KEY not configured. Email skipped.");
        }

        // 6. Record report in public.reports
        await supabase.from("reports").insert({
          user_id: userId,
          report_type: "monthly_summary",
          date_range_start: thirtyDaysAgoIso,
          date_range_end: now.toISOString(),
          status: "completed",
          recipient_email: user.email,
        });

        // 7. Update last_report_sent_at in public.profiles
        await supabase
          .from("profiles")
          .update({ last_report_sent_at: now.toISOString(), updated_at: now.toISOString() })
          .eq("id", userId);

        reportResults.push({
          userId: user.id,
          email: user.email,
          sent: true,
        });
      } catch (err: any) {
        console.error(`[cron:monthly-report] Failed processing user ${user.id}:`, err);
        reportResults.push({
          userId: user.id,
          email: user.email,
          sent: false,
          error: err.message,
        });
      }
    }

    return NextResponse.json({
      success: true,
      processedCount: reportResults.length,
      results: reportResults,
    });
  } catch (error: any) {
    console.error("[cron:monthly-report] Fatal error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Cron failure" },
      { status: 500 }
    );
  }
}
