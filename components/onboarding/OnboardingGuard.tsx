"use client";

import React from "react";
import { useAuth } from "@/context/AuthContext";
import AlreadyOnboardedNotice from "./AlreadyOnboardedNotice";

interface OnboardingGuardProps {
  children: React.ReactNode;
  serverAlreadyOnboarded?: boolean;
}

export default function OnboardingGuard({
  children,
  serverAlreadyOnboarded = false,
}: OnboardingGuardProps) {
  const { user, profile, loading } = useAuth();

  // If server check already verified the user is onboarded, render notice card immediately
  if (serverAlreadyOnboarded) {
    return <AlreadyOnboardedNotice />;
  }

  // Client-side verification
  if (loading) {
    return (
      <div className="min-h-screen bg-bg-light flex flex-col items-center justify-center p-4">
        <div className="w-8 h-8 rounded-full border-2 border-accent-violet border-t-transparent animate-spin mb-3" />
        <p className="text-xs text-text-tertiary">Verifying health profile...</p>
      </div>
    );
  }

  if (user) {
    const isCompleted = Boolean(
      profile?.onboarding_complete ||
      (Array.isArray(profile?.conditions) && profile.conditions.length > 0)
    );

    if (isCompleted) {
      return <AlreadyOnboardedNotice />;
    }
  }

  // Unauthenticated users or users with incomplete onboarding continue to the questionnaire
  return <>{children}</>;
}
