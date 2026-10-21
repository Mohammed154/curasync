// app/api/cron/weekly-digest/route.ts
// Vercel Cron Job running every Monday at 09:00 UTC to send 7-day health summaries via Resend

import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { format } from "date-fns";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { render } from "@react-email/components";
import WeeklyDigestEmail from "@/emails/WeeklyDigestEmail";

export const maxDuration = 60; // 60 seconds max execution for Vercel Serverless
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  return handleWeeklyDigest(request);
}

export async function POST(request: NextRequest) {
  return handleWeeklyDigest(request);
}

async function handleWeeklyDigest(request: NextRequest) {
  try {
    // 1. Validate Cron Authorization header
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET || "curasync_cron_secret_key_2026";
    const forceUserId = request.nextUrl.searchParams.get("userId");
    const isForce = request.nextUrl.searchParams.get("force") === "true";

    const expectedHeader = `Bearer ${cronSecret}`;
    const isAuthorized = authHeader === expectedHeader || (isForce && process.env.NODE_ENV !== "production");

    if (!isAuthorized && !isForce) {
      return NextResponse.json(
        { success: false, error: "Unauthorized cron execution" },
        { status: 401 }
      );
    }

    const supabase = getSupabaseAdminClient();
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const sevenDaysAgoIso = sevenDaysAgo.toISOString();

    const startDateStr = format(sevenDaysAgo, "MMM d");
    const endDateStr = format(now, "MMM d, yyyy");

    // 2. Query qualifying profiles where weekly_digest_enabled = true
    let profilesQuery = supabase
      .from("profiles")
      .select("id, email, display_name, weekly_digest_enabled, created_at")
      .neq("weekly_digest_enabled", false); // null or true is treated as enabled

    if (forceUserId) {
      profilesQuery = profilesQuery.eq("id", forceUserId);
    }

    const { data: qualifyingUsers, error: queryError } = await profilesQuery;

    if (queryError) {
      console.error("[cron:weekly-digest] Profiles query error:", queryError.message);
      return NextResponse.json(
        { success: false, error: queryError.message },
        { status: 500 }
      );
    }

    if (!qualifyingUsers || qualifyingUsers.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No users qualified for weekly health digest at this time.",
        processedCount: 0,
      });
    }

    const resendApiKey = process.env.RESEND_API_KEY;
    const resendFrom = process.env.RESEND_FROM_EMAIL || "reports@curasync.care";
    const resend = resendApiKey ? new Resend(resendApiKey) : null;
    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      (process.env.VERCEL_PROJECT_PRODUCTION_URL
        ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
        : process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : "https://curasync.care");
    const dashboardUrl = `${appUrl}/dashboard`;

    const digestResults: Array<{
      userId: string;
      email: string;
      sent: boolean;
      readingsCount: number;
      error?: string;
    }> = [];

    // 3. Process each eligible patient
    for (const user of qualifyingUsers) {
      try {
        const userId = user.id;

        // Query vitals logged in past 7 days
        const { data: vitalsRows } = await supabase
          .from("vitals")
          .select("type, value, unit, recorded_at")
          .eq("user_id", userId)
          .gte("recorded_at", sevenDaysAgoIso);

        // Query glucose readings logged in past 7 days
        const { data: glucoseRows } = await supabase
          .from("glucose_readings")
          .select("value, recorded_at")
          .eq("user_id", userId)
          .gte("recorded_at", sevenDaysAgoIso);

        const vList = vitalsRows || [];
        const gList = glucoseRows || [];

        // Calculate averages
        const systolicList: number[] = [];
        const diastolicList: number[] = [];
        const glucoseList: number[] = [];
        let criticalAlertCount = 0;

        for (const row of vList) {
          const num = parseFloat(row.value);
          if (isNaN(num)) continue;

          if (row.type === "blood_pressure_systolic") {
            systolicList.push(num);
            if (num >= 180 || num <= 90) criticalAlertCount++;
          } else if (row.type === "blood_pressure_diastolic") {
            diastolicList.push(num);
            if (num >= 120 || num <= 60) criticalAlertCount++;
          } else if (row.type === "blood_glucose") {
            glucoseList.push(num);
            if (num < 54 || num > 300) criticalAlertCount++;
          }
        }

        for (const gRow of gList) {
          const num = parseFloat(gRow.value);
          if (!isNaN(num)) {
            glucoseList.push(num);
            if (num < 54 || num > 300) criticalAlertCount++;
          }
        }

        const avgSystolic = systolicList.length > 0
          ? Math.round(systolicList.reduce((a, b) => a + b, 0) / systolicList.length)
          : null;

        const avgDiastolic = diastolicList.length > 0
          ? Math.round(diastolicList.reduce((a, b) => a + b, 0) / diastolicList.length)
          : null;

        const avgGlucose = glucoseList.length > 0
          ? Math.round(glucoseList.reduce((a, b) => a + b, 0) / glucoseList.length)
          : null;

        const totalReadings = vList.length + gList.length;

        // 4. Render Email Template
        const emailHtml = await render(
          WeeklyDigestEmail({
            patientName: user.display_name || "Patient",
            startDate: startDateStr,
            endDate: endDateStr,
            avgSystolic,
            avgDiastolic,
            avgGlucose,
            totalReadings,
            criticalAlertCount,
            dashboardUrl,
          })
        );

        // 5. Send email via Resend
        if (resend) {
          await resend.emails.send({
            from: resendFrom,
            to: user.email,
            subject: `Your CuraSync Weekly Health Digest (${startDateStr} – ${endDateStr})`,
            html: emailHtml,
          });
          digestResults.push({ userId, email: user.email, sent: true, readingsCount: totalReadings });
        } else {
          // Dev / Preview mode without live API key
          console.log(`[cron:weekly-digest] (Preview mode) Digest ready for ${user.email}:`, {
            avgSystolic,
            avgDiastolic,
            avgGlucose,
            totalReadings,
            criticalAlertCount,
          });
          digestResults.push({
            userId,
            email: user.email,
            sent: false,
            readingsCount: totalReadings,
            error: "RESEND_API_KEY not configured (preview logged)",
          });
        }
      } catch (userErr: any) {
        console.error(`[cron:weekly-digest] Failed processing user ${user.id}:`, userErr);
        digestResults.push({
          userId: user.id,
          email: user.email,
          sent: false,
          readingsCount: 0,
          error: userErr?.message || "Unknown error",
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Processed weekly digests for ${qualifyingUsers.length} user(s).`,
      processedCount: qualifyingUsers.length,
      results: digestResults,
      timestamp: now.toISOString(),
    });
  } catch (err: any) {
    console.error("[cron:weekly-digest] Fatal error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}
