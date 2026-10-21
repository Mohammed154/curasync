// app/api/provider/auth/route.ts
// Provider authentication and session initialization helper

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));

    if (body.action === "dev_clinician_session") {
      const providerUid = "00000000-0000-0000-0000-000000000001";
      const nowIso = new Date().toISOString();

      // Ensure profile exists in Supabase with provider role
      try {
        const supabase = getSupabaseAdminClient();
        await supabase
          .from("profiles")
          .upsert(
            {
              id: providerUid,
              email: "doctor@curasync.care",
              display_name: "Dr. Sarah Chen, MD",
              role: "provider",
              onboarding_complete: true,
              created_at: nowIso,
              updated_at: nowIso,
            },
            { onConflict: "id" }
          );
      } catch (err) {
        console.warn("[provider/auth] DB upsert warning:", err);
      }

      const response = NextResponse.json({
        success: true,
        user: {
          uid: providerUid,
          email: "doctor@curasync.care",
          displayName: "Dr. Sarah Chen, MD",
          role: "provider",
        },
      });

      response.cookies.set("curasync_role", "provider", {
        path: "/",
        httpOnly: false,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 7,
      });

      response.cookies.set("curasync_uid", providerUid, {
        path: "/",
        httpOnly: false,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 7,
      });

      return response;
    }

    return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
