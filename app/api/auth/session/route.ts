import { NextRequest, NextResponse } from "next/server";
import { checkServerAuth } from "@/lib/auth-server";
import { getSupabaseAdminClient } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  const auth = await checkServerAuth();

  if (!auth.isAuthenticated || !auth.uid) {
    return NextResponse.json({ authenticated: false, user: null }, { status: 401 });
  }

  const uid = auth.uid;
  const supabase = getSupabaseAdminClient();
  let finalProfile = auth.profile;
  const isComplete = auth.onboardingCompleted;

  if (!finalProfile) {
    const nowIso = new Date().toISOString();
    const newProfile = {
      id: uid,
      email: auth.email || `${uid}@curasync.care`,
      display_name: auth.patientProfile?.name || "Patient",
      conditions: auth.patientProfile?.conditions || [],
      onboarding_complete: isComplete,
      onboarding_completed: isComplete,
      created_at: nowIso,
      updated_at: nowIso,
      role: auth.role || "patient",
    };
    await supabase.from("profiles").upsert(newProfile, { onConflict: "id" });
    finalProfile = newProfile;
  } else {
    // Ensure both boolean flags reflect the calculated completion status
    finalProfile = {
      ...finalProfile,
      onboarding_complete: isComplete,
      onboarding_completed: isComplete,
    };
  }

  return NextResponse.json({
    authenticated: true,
    user: finalProfile,
  });
}

export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.delete("curasync_session");
  response.cookies.delete("curasync_uid");
  response.cookies.delete("curasync_role");
  return response;
}
