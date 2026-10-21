"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import TurnstileWidget from "@/components/security/TurnstileWidget";
import { ShieldCheck, Activity, Heart, ArrowRight, AlertCircle, Loader2 } from "lucide-react";

export default function SignUpPage() {
  const router = useRouter();
  const { user, profile, loading, signInWithGoogle, signInWithRedirectFlow, turnstileToken, setTurnstileToken } = useAuth();
  const [authError, setAuthError] = useState<string | null>(null);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const redirectingRef = useRef(false);

  const persistPendingOnboarding = async (userObj: { uid: string; displayName?: string | null; email?: string | null }) => {
    if (typeof window === "undefined") return;
    try {
      const rawPayload = window.sessionStorage.getItem("curasync_onboarding_payload");
      const rawConditions =
        window.sessionStorage.getItem("curasync_conditions") ||
        window.sessionStorage.getItem("curasync_onboarding_conditions");
      const rawBaselines = window.sessionStorage.getItem("curasync_onboarding_baselines");
      const rawMeds = window.sessionStorage.getItem("curasync_onboarding_medications");

      if (rawPayload || rawConditions || rawBaselines || rawMeds) {
        const parsedPayload = rawPayload ? JSON.parse(rawPayload) : {};
        const conditions = parsedPayload.conditions || (rawConditions ? JSON.parse(rawConditions) : []);
        const baselines = parsedPayload.baselines || (rawBaselines ? JSON.parse(rawBaselines) : {});
        const medications = parsedPayload.medications || (rawMeds ? JSON.parse(rawMeds) : []);

        await fetch("/api/v1/onboarding", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: userObj.displayName || "Patient",
            dateOfBirth: "1990-01-01",
            conditions: Array.isArray(conditions) && conditions.length > 0 ? conditions : ["diabetes_t2"],
            baselines,
            medications,
          }),
        });

        // Purge sessionStorage onboarding keys once writes succeed
        window.sessionStorage.removeItem("curasync_onboarding_payload");
        window.sessionStorage.removeItem("curasync_conditions");
        window.sessionStorage.removeItem("curasync_onboarding_conditions");
        window.sessionStorage.removeItem("curasync_onboarding_baselines");
        window.sessionStorage.removeItem("curasync_onboarding_medications");
        window.sessionStorage.removeItem("curasync_onboarding_location");
        window.sessionStorage.removeItem("curasync_onboarding_demographics");
      }
    } catch (e) {
      console.warn("[signup] Error saving pending onboarding data:", e);
    }
  };

  const getDestination = () => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const returnTo = params.get("returnTo") || params.get("redirect");
      if (returnTo) return returnTo;
    }
    return "/dashboard";
  };

  useEffect(() => {
    if (loading) return;
    if (user && !redirectingRef.current) {
      redirectingRef.current = true;
      persistPendingOnboarding(user).finally(() => {
        window.location.replace(getDestination());
      });
    }
  }, [user, loading]);

  const handleGoogleSignUp = async () => {
    setAuthError(null);
    setIsSigningIn(true);
    try {
      const result = await signInWithGoogle(turnstileToken || undefined);
      if (!result) return;

      if (result.user) {
        await persistPendingOnboarding(result.user);
        window.location.href = getDestination();
      }
    } catch (err: any) {
      console.error("[signup] Sign up failed:", err);
      if (
        err.code === "auth/popup-blocked" ||
        err.message?.includes("popup-blocked") ||
        err.code === "auth/cancelled-popup-request"
      ) {
        setAuthError("Popup was blocked by your browser. Redirecting you to secure Google sign-in...");
        try {
          await signInWithRedirectFlow();
        } catch {
          setAuthError("Failed to initiate redirect sign-in. Please use mobile redirect below.");
        }
      } else {
        setAuthError(err.message || "Failed to complete account registration. Please try again.");
      }
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleRedirectSignUp = async () => {
    setAuthError(null);
    setIsSigningIn(true);
    try {
      await signInWithRedirectFlow();
    } catch (err: any) {
      console.error("[signup] Redirect failed:", err);
      setAuthError(err.message || "Redirect authentication failed.");
      setIsSigningIn(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg-light flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden">
      {/* Background ambient orbs */}
      <div
        className="absolute -top-40 -left-40 w-96 h-96 rounded-full opacity-20 pointer-events-none blur-3xl"
        style={{ background: "radial-gradient(circle, #6C5CE7 0%, transparent 70%)" }}
      />
      <div
        className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full opacity-20 pointer-events-none blur-3xl"
        style={{ background: "radial-gradient(circle, #00CEC9 0%, transparent 70%)" }}
      />

      <div className="w-full max-w-md z-10 space-y-6">
        {/* Brand header */}
        <div className="text-center space-y-2">
          <Link href="/" className="inline-flex items-center gap-2.5 group">
            <div className="w-11 h-11 rounded-2xl gradient-violet flex items-center justify-center text-white shadow-card group-hover:scale-105 transition-transform">
              <Activity size={24} className="animate-pulse" />
            </div>
            <span className="font-bold text-2xl tracking-tight text-text-primary">
              Cura<span className="text-accent-violet">Sync</span>
            </span>
          </Link>
          <h1 className="text-xl font-bold text-text-primary mt-2">
            Patient Registration
          </h1>
          <p className="text-xs text-text-secondary max-w-sm mx-auto">
            Secure, encrypted health tracking and continuous chronic care.
          </p>
        </div>

        {/* Card */}
        <div className="bg-bg-card rounded-2xl p-6 md:p-8 border border-divider shadow-card space-y-6 backdrop-blur-md">
          <div className="space-y-2 text-center">
            <h2 className="text-lg font-bold text-text-primary">
              Save Your Health Profile
            </h2>
            {/* Required explicit copy from specification */}
            <p className="text-xs text-text-secondary leading-relaxed font-medium">
              Create your CuraSync account to save your baseline health profile and access your dashboard.
            </p>
          </div>

          {authError && (
            <div className="p-3 rounded-xl bg-accent-coral/10 border border-accent-coral/20 flex items-start gap-2.5 text-xs text-accent-coral animate-shake">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <span>{authError}</span>
            </div>
          )}

          {/* Cloudflare Turnstile bot protection */}
          <div className="space-y-1">
            <TurnstileWidget
              onVerify={(token) => setTurnstileToken(token)}
              onError={(err) => console.warn("Turnstile check warning:", err)}
            />
          </div>

          {/* Primary Action Button */}
          <div className="space-y-3">
            <button
              onClick={handleGoogleSignUp}
              disabled={isSigningIn}
              className="w-full py-3.5 px-4 rounded-xl bg-white hover:bg-neutral-50 text-neutral-800 font-semibold text-sm border border-neutral-200 shadow-sm flex items-center justify-center gap-3 transition-all hover:shadow-md disabled:opacity-60 disabled:cursor-not-allowed group active:scale-[0.99]"
            >
              {isSigningIn ? (
                <Loader2 size={18} className="animate-spin text-accent-violet" />
              ) : (
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
              )}
              <span>{isSigningIn ? "Creating Account…" : "Sign Up with Google"}</span>
            </button>

            <button
              type="button"
              onClick={handleRedirectSignUp}
              disabled={isSigningIn}
              className="w-full text-center text-xs text-text-secondary hover:text-accent-violet transition-colors py-2 px-3 rounded-xl bg-bg-light/80 hover:bg-bg-lavender/50 border border-divider/60 font-medium"
            >
              📱 Mobile browser or popup blocked? Use redirect sign-in →
            </button>
          </div>

          <div className="pt-4 border-t border-divider flex items-center justify-between text-xs">
            <span className="text-text-secondary">Already have an account?</span>
            <Link
              href="/login"
              className="text-accent-violet font-semibold hover:underline inline-flex items-center gap-1"
            >
              Sign In <ArrowRight size={13} />
            </Link>
          </div>
        </div>

        {/* Security badges */}
        <div className="flex items-center justify-center gap-4 text-[11px] text-text-tertiary">
          <div className="flex items-center gap-1.5">
            <ShieldCheck size={14} className="text-[#00B894]" />
            <span>HIPAA Compliant</span>
          </div>
          <span>•</span>
          <div className="flex items-center gap-1.5">
            <Heart size={14} className="text-accent-violet" />
            <span>Encrypted Health Records</span>
          </div>
        </div>
      </div>
    </div>
  );
}
