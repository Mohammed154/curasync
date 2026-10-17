// app/api/auth/dev-login/route.ts
// Development authentication bypass & fast-track demo session generator

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  try {
    let email = "alex.rivera@curasync.care";
    let name = "Alex Rivera";
    let uid = "dev_patient_alex_rivera";

    try {
      const body = await request.json();
      if (body.email) email = body.email;
      if (body.name) name = body.name;
      if (body.uid) uid = body.uid;
    } catch {
      // Use defaults
    }

    const supabase = getSupabaseAdminClient();
    const nowIso = new Date().toISOString();

    // Upsert into public.profiles
    const { error: upsertErr } = await supabase.from("profiles").upsert(
      {
        id: uid,
        email,
        display_name: name,
        created_at: nowIso,
        updated_at: nowIso,
        onboarding_complete: false,
        conditions: [],
      },
      { onConflict: "id" }
    );

    if (upsertErr) {
      console.error("[dev-login] Supabase upsert error:", upsertErr);
    }

    const response = NextResponse.json({
      success: true,
      message: "Development session created",
      user: {
        id: uid,
        email,
        display_name: name,
      },
    });

    const isSecure = process.env.NODE_ENV === "production";

    response.cookies.set("curasync_session", `dev_token_${uid}`, {
      httpOnly: false,
      secure: isSecure,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    response.cookies.set("curasync_uid", uid, {
      httpOnly: false,
      secure: isSecure,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;
  } catch (error: any) {
    console.error("[dev-login] Internal error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to create dev session" },
      { status: 500 }
    );
  }
}
