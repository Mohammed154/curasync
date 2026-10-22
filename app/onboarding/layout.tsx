// app/onboarding/layout.tsx
// Server-level and layout route protection for all /onboarding routes

import React from "react";
import { checkServerAuth } from "@/lib/auth-server";
import OnboardingGateNotice from "@/components/onboarding/OnboardingGateNotice";
import OnboardingGuard from "@/components/onboarding/OnboardingGuard";

export const dynamic = "force-dynamic";

export default async function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let serverAlreadyOnboarded = false;

  try {
    const auth = await checkServerAuth();
    if (auth.isAuthenticated && auth.onboardingCompleted) {
      serverAlreadyOnboarded = true;
    }
  } catch (err) {
    console.warn("[onboarding-layout] Server session inspection warning:", err);
  }

  // If server check already verified that patient is onboarded:
  // Render OnboardingGateNotice immediately (preventing middleware loops and form access)
  if (serverAlreadyOnboarded) {
    return <OnboardingGateNotice />;
  }

  return (
    <OnboardingGuard serverAlreadyOnboarded={serverAlreadyOnboarded}>
      {children}
    </OnboardingGuard>
  );
}
