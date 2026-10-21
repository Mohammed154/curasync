import React from "react";
import { cookies } from "next/headers";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { verifyFirebaseIdToken } from "@/lib/firebase/admin";
import OnboardingGuard from "@/components/onboarding/OnboardingGuard";

export const dynamic = "force-dynamic";

export default async function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let serverAlreadyOnboarded = false;

  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get("curasync_session")?.value;
    const uidCookie = cookieStore.get("curasync_uid")?.value;

    let uid = uidCookie;
    if (sessionToken) {
      try {
        const decoded = await verifyFirebaseIdToken(sessionToken);
        if (decoded?.uid) {
          uid = decoded.uid;
        }
      } catch {
        // Fallback to uidCookie if token decode fails
      }
    }

    if (uid) {
      const supabase = getSupabaseAdminClient();
      const { data: profile } = await supabase
        .from("profiles")
        .select("id, onboarding_complete, conditions")
        .eq("id", uid)
        .maybeSingle();

      const { data: patientProfile } = await supabase
        .from("patient_profiles")
        .select("id, onboarding_complete, conditions")
        .eq("user_id", uid)
        .maybeSingle();

      const profileConditions = Array.isArray(profile?.conditions) ? profile.conditions : [];
      const patientConditions = Array.isArray(patientProfile?.conditions) ? patientProfile.conditions : [];

      if (
        profile?.onboarding_complete === true ||
        patientProfile?.onboarding_complete === true ||
        profileConditions.length > 0 ||
        patientConditions.length > 0
      ) {
        serverAlreadyOnboarded = true;
      }
    }
  } catch (err) {
    console.warn("[onboarding-layout] Server session inspection warning:", err);
  }

  return (
    <OnboardingGuard serverAlreadyOnboarded={serverAlreadyOnboarded}>
      {children}
    </OnboardingGuard>
  );
}
