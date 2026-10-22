"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import OnboardingGateNotice from "./OnboardingGateNotice";

interface OnboardingGuardProps {
  children: React.ReactNode;
  serverAlreadyOnboarded?: boolean;
}

export default function OnboardingGuard({
  children,
  serverAlreadyOnboarded = false,
}: OnboardingGuardProps) {
  const { user, profile } = useAuth();
  const [supabaseCompleted, setSupabaseCompleted] = useState<boolean | null>(null);

  // Check Supabase browser session if user is logged in via Supabase directly
  useEffect(() => {
    let isMounted = true;
    async function checkSupabaseSession() {
      try {
        const supabase = getSupabaseBrowserClient();
        const { data } = await supabase.auth.getSession();
        if (data?.session?.user) {
          const { data: prof } = await supabase
            .from("profiles")
            .select("onboarding_complete, onboarding_completed, conditions")
            .eq("id", data.session.user.id)
            .maybeSingle();

          const conditions = Array.isArray(prof?.conditions) ? prof.conditions : [];
          if (
            prof?.onboarding_completed === true ||
            prof?.onboarding_complete === true ||
            conditions.length > 0
          ) {
            if (isMounted) setSupabaseCompleted(true);
            return;
          }
        }
      } catch {
        // ignore
      }
      if (isMounted) setSupabaseCompleted(false);
    }

    checkSupabaseSession();
    return () => {
      isMounted = false;
    };
  }, []);

  // 1. If server check already verified completion, render gate notice
  if (serverAlreadyOnboarded || supabaseCompleted === true) {
    return <OnboardingGateNotice />;
  }

  // 2. Client-side verification for authenticated & completed patient
  if (user) {
    const isCompleted = Boolean(
      profile?.onboarding_completed === true ||
      profile?.onboarding_complete === true ||
      (Array.isArray(profile?.conditions) && profile.conditions.length > 0)
    );

    if (isCompleted) {
      return <OnboardingGateNotice />;
    }
  }

  // Guest or incomplete patient continues to the wizard
  return <>{children}</>;
}
