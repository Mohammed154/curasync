"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Heart, ArrowRight, LogOut, CheckCircle2, ShieldCheck, Loader2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { getSupabaseBrowserClient } from "@/lib/supabase";

export default function OnboardingGateNotice() {
  const router = useRouter();
  const { signOut } = useAuth();
  const [isSigningOut, setIsSigningOut] = useState(false);

  const handleGoToDashboard = () => {
    router.push("/dashboard");
  };

  const handleSignOutAndSwitch = async () => {
    setIsSigningOut(true);
    try {
      // 1. Purge all sessionStorage items
      if (typeof window !== "undefined") {
        window.sessionStorage.clear();
      }

      // 2. Terminate Supabase Auth session if active
      try {
        const supabase = getSupabaseBrowserClient();
        await supabase.auth.signOut();
      } catch (err) {
        console.warn("[onboarding-gate] Supabase sign out notice:", err);
      }

      // 3. Terminate main Firebase auth session
      try {
        await signOut();
      } catch (err) {
        console.warn("[onboarding-gate] Main sign out notice:", err);
      }

      // 4. Navigate to signup
      window.location.href = "/signup";
    } catch (err) {
      console.error("[onboarding-gate] Sign out & switch error:", err);
      window.location.href = "/signup";
    } finally {
      setIsSigningOut(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg-light flex flex-col items-center justify-center px-4 py-12 relative overflow-hidden">
      {/* Background ambient decorative blurs */}
      <div
        className="absolute -top-32 -left-32 w-80 h-80 rounded-full opacity-20 pointer-events-none blur-3xl"
        style={{ background: "radial-gradient(circle, #6C5CE7 0%, transparent 70%)" }}
      />
      <div
        className="absolute -bottom-32 -right-32 w-80 h-80 rounded-full opacity-20 pointer-events-none blur-3xl"
        style={{ background: "radial-gradient(circle, #00CEC9 0%, transparent 70%)" }}
      />

      <div className="w-full max-w-md z-10 space-y-6">
        {/* Brand header */}
        <div className="flex items-center justify-center gap-2.5">
          <div className="w-10 h-10 rounded-xl gradient-violet flex items-center justify-center text-white shadow-sm">
            <Heart size={20} strokeWidth={2.5} />
          </div>
          <span className="font-bold text-2xl tracking-tight text-text-primary">
            Cura<span className="text-accent-violet">Sync</span>
          </span>
        </div>

        {/* Notice Card */}
        <div className="bg-bg-card rounded-2xl p-6 md:p-8 border border-divider shadow-card space-y-6 text-center animate-fade-in backdrop-blur-md">
          {/* Status Badge */}
          <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-sm">
            <CheckCircle2 size={28} />
          </div>

          <div className="space-y-2.5">
            <h1 className="text-xl md:text-2xl font-bold text-text-primary tracking-tight">
              Account Already Set Up
            </h1>
            <p className="text-sm text-text-secondary leading-relaxed max-w-sm mx-auto">
              You already have an active health profile associated with this account. To view your vitals or log a new reading, proceed to your dashboard. If you need to set up a profile for another individual, please sign out first.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3 pt-2">
            {/* Primary Action: Go to Dashboard */}
            <button
              type="button"
              onClick={handleGoToDashboard}
              className="w-full py-3.5 px-4 rounded-xl gradient-violet hover:opacity-95 text-white font-semibold text-sm shadow-card flex items-center justify-center gap-2 transition-all active:scale-[0.99] group cursor-pointer"
            >
              <span>Go to Dashboard</span>
              <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
            </button>

            {/* Secondary Action: Sign Out & Switch Account */}
            <button
              type="button"
              onClick={handleSignOutAndSwitch}
              disabled={isSigningOut}
              className="w-full py-3 px-4 rounded-xl bg-bg-light hover:bg-bg-lavender/60 text-text-secondary hover:text-text-primary font-medium text-sm border border-divider transition-all flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer active:scale-[0.99]"
            >
              {isSigningOut ? (
                <>
                  <Loader2 size={16} className="animate-spin text-accent-violet" />
                  <span>Signing out…</span>
                </>
              ) : (
                <>
                  <LogOut size={16} className="text-text-tertiary" />
                  <span>Sign Out & Switch Account</span>
                </>
              )}
            </button>
          </div>

          {/* Compliance & Security Footer */}
          <div className="pt-4 border-t border-divider flex items-center justify-center gap-2 text-xs text-text-tertiary">
            <ShieldCheck size={14} className="text-[#00B894]" />
            <span>Health records safely synced and encrypted</span>
          </div>
        </div>
      </div>
    </div>
  );
}
