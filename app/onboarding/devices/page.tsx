"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function OnboardingDevicesRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/onboarding/location");
  }, [router]);

  return (
    <div className="min-h-screen bg-bg-light flex flex-col items-center justify-center px-4">
      <div className="flex items-center gap-3 text-text-secondary">
        <Loader2 className="w-5 h-5 animate-spin text-accent-violet" />
        <span className="text-sm font-medium">Continuing onboarding setup…</span>
      </div>
    </div>
  );
}
