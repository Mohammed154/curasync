// app/api/auth/session/route.ts
// Handles session inspection and logout

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyFirebaseIdToken } from "@/lib/firebase/admin";
import { getSupabaseAdminClient } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get("curasync_session")?.value;
  const uidCookie = cookieStore.get("curasync_uid")?.value;

  if (!sessionToken && !uidCookie) {
    return NextResponse.json({ authenticated: false, user: null }, { status: 401 });
  }

  let uid = uidCookie;
  let decodedEmail: string | undefined;
  let decodedName: string | undefined;

  if (sessionToken) {
    try {
      const decoded = await verifyFirebaseIdToken(sessionToken);
      if (decoded?.uid) {
        uid = decoded.uid;
        decodedEmail = decoded.email;
        decodedName = decoded.displayName;
      }
    } catch {
      // Fallback to uidCookie if token decode fails
    }
  }

  if (!uid) {
    return NextResponse.json({ authenticated: false, user: null }, { status: 401 });
  }

  const supabase = getSupabaseAdminClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", uid)
    .maybeSingle();

  // Also query patient_profiles for legacy or cross-table conditions & onboarding status
  const { data: patientProfile } = await supabase
    .from("patient_profiles")
    .select("*")
    .eq("user_id", uid)
    .maybeSingle();

  let finalProfile = profile;
  const patientConditions = Array.isArray(patientProfile?.conditions) ? patientProfile.conditions : [];
  const profileConditions = Array.isArray(profile?.conditions) ? profile.conditions : [];
  const mergedConditions = profileConditions.length > 0 ? profileConditions : patientConditions;
  const isComplete = Boolean(
    profile?.onboarding_complete ||
    patientProfile?.onboarding_complete ||
    mergedConditions.length > 0
  );

  if (!finalProfile) {
    // Self-heal: ensure profiles record exists in Supabase
    const nowIso = new Date().toISOString();
    const newProfile = {
      id: uid,
      email: decodedEmail || `${uid}@curasync.care`,
      display_name: decodedName || patientProfile?.name || "Patient",
      conditions: mergedConditions,
      onboarding_complete: isComplete,
      created_at: nowIso,
      updated_at: nowIso,
    };
    await supabase.from("profiles").upsert(newProfile, { onConflict: "id" });
    finalProfile = newProfile;
  } else if (
    (profileConditions.length === 0 && patientConditions.length > 0) ||
    (!profile.onboarding_complete && isComplete)
  ) {
    // Self-heal: update profiles with conditions from patient_profiles
    const patch = {
      conditions: mergedConditions,
      onboarding_complete: isComplete,
      updated_at: new Date().toISOString(),
    };
    await supabase.from("profiles").update(patch).eq("id", uid);
    finalProfile = { ...finalProfile, ...patch };
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
