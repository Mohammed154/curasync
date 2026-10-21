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
  if (!loading && user && profile) {
    const isCompleted = Boolean(
      profile.onboarding_complete ||
      (Array.isArray(profile.conditions) && profile.conditions.length > 0)
    );

    if (isCompleted) {
      return <AlreadyOnboardedNotice />;
    }
  }

  // Unauthenticated users or users with incomplete onboarding continue to the questionnaire
  return <>{children}</>;
}
