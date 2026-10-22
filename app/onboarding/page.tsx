// app/onboarding/page.tsx
// Server / Layout Guard for Onboarding
// Case A: Guest / Incomplete ──► <OnboardingWizard />
// Case B: Completed Patient  ──► <OnboardingGateNotice />

import React from "react";
import { checkServerAuth } from "@/lib/auth-server";
import OnboardingWizard from "@/components/onboarding/OnboardingWizard";
import OnboardingGateNotice from "@/components/onboarding/OnboardingGateNotice";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const auth = await checkServerAuth();

  // Case B: Completed Patient
  // DO NOT ISSUE AUTOMATIC REDIRECT (Prevents Middleware Loop)
  if (auth.isAuthenticated && auth.onboardingCompleted) {
    return <OnboardingGateNotice />;
  }

  // Case A: Guest or Incomplete Patient
  return <OnboardingWizard />;
}
