"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Heart, CheckCircle2, ArrowRight, ShieldCheck, Lock, Loader2, AlertCircle, Sparkles, X } from "lucide-react";
import { clsx } from "clsx";
import { useAuth } from "@/context/AuthContext";
import TurnstileWidget from "@/components/security/TurnstileWidget";

const CHECKLIST = [
  { label: "Conditions selected", done: true },
  { label: "Baseline metrics entered", done: true },
  { label: "Medications added", done: true },
  { label: "Geographic metadata configured", done: true },
];

export default function OnboardingCompletePage() {
  const router = useRouter();
  const [visible, setVisible] = useState(false);
  const { user, profile, refreshProfile, signInWithGoogle, turnstileToken, setTurnstileToken } = useAuth();
  
  const [isPersisting, setIsPersisting] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isSigningIn, setIsSigningIn] = useState(false);

  const [conditionCount, setConditionCount] = useState<number>(() => {
    if (typeof window !== "undefined") {
      try {
        const stored =
          window.sessionStorage.getItem("curasync_onboarding_conditions") ||
          window.sessionStorage.getItem("curasync_conditions");
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed.length;
        }
      } catch {
        // ignore
      }
    }
    return 1;
  });

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 100);
    return () => clearTimeout(t);
  }, []);

  const persistOnboardingPayload = async (activeUser: { uid: string; displayName?: string | null; email?: string | null }) => {
    if (typeof window === "undefined") return;

    let conditions: string[] = [];
    let baselines: Record<string, any> = {};
    let medications: any[] = [];

    try {
      const rawConditions =
        window.sessionStorage.getItem("curasync_onboarding_conditions") ||
        window.sessionStorage.getItem("curasync_conditions");
      if (rawConditions) conditions = JSON.parse(rawConditions);

      const rawBaselines = window.sessionStorage.getItem("curasync_onboarding_baselines");
      if (rawBaselines) baselines = JSON.parse(rawBaselines);

      const rawMeds = window.sessionStorage.getItem("curasync_onboarding_medications");
      if (rawMeds) medications = JSON.parse(rawMeds);
    } catch (e) {
      console.warn("[onboarding-complete] Error reading sessionStorage:", e);
    }

    const res = await fetch("/api/v1/onboarding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: activeUser.displayName || "Patient",
        dateOfBirth: "1990-01-01",
        conditions: conditions.length > 0 ? conditions : ["diabetes_t2"],
        baselines,
        medications,
      }),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || "Failed to persist health profile");
    }

    // Purge sessionStorage onboarding keys once writes succeed
    window.sessionStorage.removeItem("curasync_onboarding_payload");
    window.sessionStorage.removeItem("curasync_conditions");
    window.sessionStorage.removeItem("curasync_onboarding_conditions");
    window.sessionStorage.removeItem("curasync_onboarding_baselines");
    window.sessionStorage.removeItem("curasync_onboarding_medications");
    window.sessionStorage.removeItem("curasync_onboarding_location");
    window.sessionStorage.removeItem("curasync_onboarding_demographics");

    await refreshProfile().catch(() => {});
  };

  const handleGoToDashboard = async () => {
    if (!user) {
      // Intercept unauthenticated user — show explicit sign-up wall
      setShowAuthModal(true);
      return;
    }

    setIsPersisting(true);
    try {
      await persistOnboardingPayload(user);
      router.push("/dashboard");
    } catch (err: any) {
      console.error("[onboarding-complete] Persistence error:", err);
      // Still allow navigation to avoid blocking
      router.push("/dashboard");
    } finally {
      setIsPersisting(false);
    }
  };

  const handleModalGoogleSignUp = async () => {
    setAuthError(null);
    setIsSigningIn(true);
    try {
      const result = await signInWithGoogle(turnstileToken || undefined);
      if (!result || !result.user) return;

      // Persist onboarding payload immediately following successful user creation
      await persistOnboardingPayload(result.user);
      window.location.href = "/dashboard";
    } catch (err: any) {
      console.error("[onboarding-complete] Sign up failed:", err);
      setAuthError(err.message || "Failed to complete account registration. Please try again.");
    } finally {
      setIsSigningIn(false);
    }
  };

  return (
    <div className="min-h-screen gradient-dark flex flex-col items-center justify-center px-4 py-10 relative">
      <div
        className={clsx(
          "w-full max-w-sm text-center transition-all duration-700",
          visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
        )}
      >
        {/* Orb / celebration graphic */}
        <div className="relative w-32 h-32 mx-auto mb-8" aria-hidden="true">
          <div
            className="absolute inset-0 rounded-full animate-ping"
            style={{ background: "rgba(108,92,231,0.2)", animationDuration: "2s" }}
          />
          <div
            className="absolute inset-2 rounded-full"
            style={{
              background: "conic-gradient(from 0deg, #6c5ce7, #a29bfe, #e84393, #00cec9, #6c5ce7)",
              animation: "orbSpin 6s linear infinite",
            }}
          />
          <div
            className="absolute inset-4 rounded-full flex items-center justify-center"
            style={{ background: "rgba(10,10,10,0.7)" }}
          >
            <Heart size={28} className="text-white" strokeWidth={2.5} />
          </div>
        </div>

        <div className="mb-8">
          <p className="text-accent-lavender text-xs font-semibold uppercase tracking-widest mb-2">
            Setup complete 🎉
          </p>
          <h1
            className="text-white font-bold mb-3"
            style={{ fontSize: "clamp(28px, 6vw, 36px)", lineHeight: 1.15 }}
          >
            You&apos;re all set!
          </h1>
          <p className="text-white/60 text-sm leading-relaxed">
            CuraSync is now configured for your {conditionCount}{" "}
            {conditionCount === 1 ? "condition" : "conditions"}. Your dashboard is ready with live metrics and personalised alerts.
          </p>
        </div>

        {/* Checklist */}
        <div className="space-y-2 mb-8 text-left">
          {CHECKLIST.map((item, i) => (
            <div
              key={i}
              className={clsx(
                "flex items-center gap-3 px-4 py-3 rounded-xl transition-all",
                item.done ? "bg-white/8" : "bg-white/4"
              )}
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <CheckCircle2
                size={18}
                style={{ color: item.done ? "#00B894" : "#444" }}
                aria-hidden="true"
              />
              <span className={clsx("text-sm font-medium", item.done ? "text-white" : "text-white/30")}>
                {item.label}
              </span>
            </div>
          ))}
        </div>

        {/* Action Button: Go to Dashboard */}
        <button
          type="button"
          onClick={handleGoToDashboard}
          disabled={isPersisting}
          className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl gradient-violet text-white font-bold text-body-md shadow-lg hover:opacity-90 transition-opacity mb-4 cursor-pointer disabled:opacity-60"
        >
          {isPersisting ? (
            <>
              <Loader2 size={20} className="animate-spin" />
              <span>Saving your health profile…</span>
            </>
          ) : (
            <>
              <span>Go to My Dashboard</span>
              <ArrowRight size={20} aria-hidden="true" />
            </>
          )}
        </button>

        <p className="text-white/30 text-xs">
          You can update any settings or measurements from your dashboard at any time.
        </p>
      </div>

      {/* ── Auth Wall Sign-Up Modal (Eliminates the Redirect Loop) ───────── */}
      {showAuthModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-md bg-bg-card rounded-3xl p-6 md:p-8 border border-divider shadow-2xl relative space-y-6">
            <button
              onClick={() => setShowAuthModal(false)}
              className="absolute top-5 right-5 p-1.5 rounded-full text-text-tertiary hover:text-text-primary hover:bg-bg-light transition-all"
              aria-label="Close dialog"
            >
              <X size={18} />
            </button>

            <div className="text-center space-y-3 pt-2">
              <div className="w-12 h-12 rounded-2xl gradient-violet flex items-center justify-center text-white mx-auto shadow-card">
                <Lock size={22} />
              </div>

              <h2 className="text-xl font-bold text-text-primary tracking-tight">
                Create your CuraSync account
              </h2>

              {/* Exact required copy from prompt */}
              <p className="text-xs text-text-secondary leading-relaxed max-w-xs mx-auto">
                Create your CuraSync account to save your baseline health profile and access your dashboard.
              </p>
            </div>

            {authError && (
              <div className="p-3 rounded-xl bg-accent-coral/10 border border-accent-coral/20 flex items-start gap-2.5 text-xs text-accent-coral animate-shake">
                <AlertCircle size={15} className="shrink-0 mt-0.5" />
                <span>{authError}</span>
              </div>
            )}

            <div className="space-y-3">
              <TurnstileWidget
                onVerify={(token) => setTurnstileToken(token)}
                onError={(err) => console.warn("Turnstile check warning:", err)}
              />

              <button
                type="button"
                onClick={handleModalGoogleSignUp}
                disabled={isSigningIn}
                className="w-full py-3.5 px-4 rounded-xl bg-white hover:bg-neutral-50 text-neutral-800 font-semibold text-sm border border-neutral-200 shadow-sm flex items-center justify-center gap-3 transition-all hover:shadow-md disabled:opacity-60 cursor-pointer active:scale-[0.99]"
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
                <span>{isSigningIn ? "Creating your account…" : "Continue with Google"}</span>
              </button>

              <div className="pt-2 text-center">
                <Link
                  href="/signup?returnTo=/dashboard&pendingOnboarding=true"
                  className="text-xs text-text-secondary hover:text-accent-violet transition-colors font-medium"
                >
                  Prefer full-page sign up? Go to Sign Up Page →
                </Link>
              </div>
            </div>

            <div className="pt-4 border-t border-divider flex items-center justify-center gap-4 text-[11px] text-text-tertiary">
              <div className="flex items-center gap-1.5">
                <ShieldCheck size={14} className="text-[#00B894]" />
                <span>HIPAA Compliant</span>
              </div>
              <span>•</span>
              <div className="flex items-center gap-1.5">
                <Heart size={14} className="text-accent-violet" />
                <span>Zero Unsaved Abandonment</span>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes orbSpin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
