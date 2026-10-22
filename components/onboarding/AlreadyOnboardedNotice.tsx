"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Heart, Activity, ArrowRight, LogOut, CheckCircle2, ShieldCheck, Loader2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { getSupabaseBrowserClient } from "@/lib/supabase";

const ONBOARDING_STORAGE_KEYS = [
  "curasync_onboarding_payload",
  "curasync_conditions",
  "curasync_onboarding_conditions",
  "curasync_onboarding_baselines",
  "curasync_onboarding_medications",
  "curasync_onboarding_location",
  "curasync_onboarding_demographics",
];

export default function AlreadyOnboardedNotice() {
  const router = useRouter();
  const { signOut } = useAuth();
  const [isSigningOut, setIsSigningOut] = useState(false);

  const handleSignOutAndSwitch = async () => {
    setIsSigningOut(true);
    try {
      // 1. Purge all onboarding sessionStorage keys
      if (typeof window !== "undefined") {
        for (const key of ONBOARDING_STORAGE_KEYS) {
          window.sessionStorage.removeItem(key);
        }
      }

      // 2. Terminate Supabase Auth session if active
      try {
        const supabase = getSupabaseBrowserClient();
        await supabase.auth.signOut();
      } catch (err) {
        console.warn("[onboarding-guard] Supabase sign out notice:", err);
      }

      // 3. Terminate main auth session
      try {
        await signOut();
      } catch (err) {
        console.warn("[onboarding-guard] Main sign out notice:", err);
      }

      // 4. Redirect to signup to set up another individual
      window.location.href = "/signup";
    } catch (err) {
      console.error("[onboarding-guard] Switch account error:", err);
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
              You are currently signed in with an active health profile. To view your vitals or log a new reading, proceed to your dashboard. If you need to set up a profile for another individual, please sign out first.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3 pt-2">
            {/* Primary Button: Go to Dashboard */}
            <Link
              href="/dashboard"
              className="w-full py-3.5 px-4 rounded-xl gradient-violet hover:opacity-95 text-white font-semibold text-sm shadow-card flex items-center justify-center gap-2 transition-all active:scale-[0.99] group cursor-pointer"
            >
              <span>Go to Dashboard</span>
              <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
            </Link>

            {/* Secondary Button: Sign Out & Create New Account */}
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
                  <span>Sign Out & Create New Account</span>
                </>
              )}
            </button>
          </div>

          {/* Footer note */}
          <div className="pt-4 border-t border-divider flex items-center justify-center gap-2 text-xs text-text-tertiary">
            <ShieldCheck size={14} className="text-[#00B894]" />
            <span>Health records safely synced and encrypted</span>
          </div>
        </div>
      </div>
    </div>
  );
}
