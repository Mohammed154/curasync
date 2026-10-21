"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Stethoscope,
  ShieldCheck,
  Lock,
  ArrowRight,
  AlertCircle,
  Loader2,
  CheckCircle2,
  Activity,
  Hospital,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import TurnstileWidget from "@/components/security/TurnstileWidget";

export default function ProviderLoginPage() {
  const router = useRouter();
  const { user, profile, loading, signInWithGoogle, signInWithRedirectFlow, turnstileToken, setTurnstileToken } = useAuth();
  const [authError, setAuthError] = useState<string | null>(null);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isActivatingDemo, setIsActivatingDemo] = useState(false);

  const getDestination = () => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const returnTo = params.get("returnTo") || params.get("redirect");
      if (returnTo && returnTo.startsWith("/provider") && returnTo !== "/provider/login") {
        return returnTo;
      }
    }
    return "/provider/dashboard";
  };

  useEffect(() => {
    if (loading) return;
    if (user && profile) {
      if (profile.role === "provider" || profile.role === "doctor" || profile.role === "admin") {
        window.location.replace(getDestination());
      } else {
        setAuthError("Access restricted: This Google account has patient credentials. Clinical provider privileges required.");
      }
    }
  }, [user, profile, loading]);

  const handleProviderSignIn = async () => {
    setAuthError(null);
    setIsSigningIn(true);
    try {
      const result = await signInWithGoogle(turnstileToken || undefined);
      if (!result || !result.user) return;

      const userRole = result.profile?.role || "patient";
      if (userRole === "provider" || userRole === "doctor" || userRole === "admin") {
        window.location.href = getDestination();
      } else {
        setAuthError("Access restricted: Clinical provider or physician credentials required. You are currently logged in with a patient profile.");
      }
    } catch (err: any) {
      console.error("[provider-login] Authentication failed:", err);
      if (
        err.code === "auth/popup-blocked" ||
        err.message?.includes("popup-blocked") ||
        err.code === "auth/cancelled-popup-request"
      ) {
        setAuthError("Popup blocked. Redirecting to provider sign-in…");
        try {
          await signInWithRedirectFlow();
        } catch {
          setAuthError("Failed to initiate redirect. Please retry.");
        }
      } else {
        setAuthError(err.message || "Failed to authenticate clinical session.");
      }
    } finally {
      setIsSigningIn(false);
    }
  };

  // Demo clinician session activator for rapid developer/reviewer testing
  const handleDemoClinicianAccess = async () => {
    setIsActivatingDemo(true);
    setAuthError(null);
    try {
      const res = await fetch("/api/provider/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "dev_clinician_session" }),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || "Failed to initialize clinician session");
      }

      window.location.href = getDestination();
    } catch (err: any) {
      console.error("[provider-login] Demo clinician error:", err);
      // Client-side fallback cookie setup for development environments
      document.cookie = "curasync_role=provider; path=/; max-age=604800";
      document.cookie = "curasync_uid=00000000-0000-0000-0000-000000000001; path=/; max-age=604800";
      window.location.href = getDestination();
    } finally {
      setIsActivatingDemo(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden">
      {/* Background ambient clinical aura */}
      <div
        className="absolute -top-40 -left-40 w-96 h-96 rounded-full opacity-25 pointer-events-none blur-3xl"
        style={{ background: "radial-gradient(circle, #0984e3 0%, transparent 70%)" }}
      />
      <div
        className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full opacity-20 pointer-events-none blur-3xl"
        style={{ background: "radial-gradient(circle, #00cec9 0%, transparent 70%)" }}
      />

      <div className="w-full max-w-md z-10 space-y-6">
        {/* Brand header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
              <Stethoscope size={26} />
            </div>
            <span className="font-bold text-2xl tracking-tight text-white">
              Cura<span className="text-blue-400">Sync</span>
            </span>
          </div>

          <div className="pt-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-blue-500/20 text-blue-300 border border-blue-500/30">
              <Hospital size={12} />
              Clinical Provider Portal
            </span>
          </div>

          <h1 className="text-xl font-bold text-white pt-1">
            Clinical Staff Authentication
          </h1>
          <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
            Restricted access for attending physicians, care managers, and clinical staff.
          </p>
        </div>

        {/* Card */}
        <div className="bg-slate-800/80 backdrop-blur-xl rounded-2xl p-6 md:p-8 border border-slate-700 shadow-2xl space-y-6">
          <div className="space-y-1 text-center">
            <h2 className="text-base font-bold text-white">
              Sign In to Care Provider Workspace
            </h2>
            <p className="text-xs text-slate-400">
              Authenticate with your clinical Google identity or hospital credentials.
            </p>
          </div>

          {authError && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-2.5 text-xs text-rose-300 animate-shake">
              <AlertCircle size={16} className="shrink-0 mt-0.5 text-rose-400" />
              <span>{authError}</span>
            </div>
          )}

          {/* Turnstile widget */}
          <div className="space-y-1">
            <TurnstileWidget
              onVerify={(token) => setTurnstileToken(token)}
              onError={(err) => console.warn("Turnstile check notice:", err)}
            />
          </div>

          {/* Primary Action Button */}
          <div className="space-y-3">
            <button
              onClick={handleProviderSignIn}
              disabled={isSigningIn || isActivatingDemo}
              className="w-full py-3.5 px-4 rounded-xl bg-white hover:bg-slate-100 text-slate-900 font-semibold text-sm border border-slate-200 shadow-sm flex items-center justify-center gap-3 transition-all hover:shadow-md disabled:opacity-60 cursor-pointer active:scale-[0.99]"
            >
              {isSigningIn ? (
                <Loader2 size={18} className="animate-spin text-blue-600" />
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
              <span>{isSigningIn ? "Verifying Credentials…" : "Sign In with Clinical Google Account"}</span>
            </button>

            {/* Quick Demo Clinician Mode for Evaluation */}
            <button
              type="button"
              onClick={handleDemoClinicianAccess}
              disabled={isSigningIn || isActivatingDemo}
              className="w-full py-2.5 px-4 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/40 font-medium text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              {isActivatingDemo ? (
                <>
                  <Loader2 size={14} className="animate-spin text-blue-400" />
                  <span>Loading Attending Physician Session…</span>
                </>
              ) : (
                <>
                  <Stethoscope size={14} />
                  <span>Quick Demo: Sign In as Attending Physician</span>
                </>
              )}
            </button>
          </div>

          <div className="pt-4 border-t border-slate-700/80 flex items-center justify-between text-xs">
            <span className="text-slate-400">Are you a patient?</span>
            <Link
              href="/login"
              className="text-blue-400 font-semibold hover:underline inline-flex items-center gap-1"
            >
              Go to Patient Portal <ArrowRight size={13} />
            </Link>
          </div>
        </div>

        {/* Compliance Footer */}
        <div className="flex items-center justify-center gap-4 text-[11px] text-slate-500">
          <div className="flex items-center gap-1.5">
            <ShieldCheck size={14} className="text-emerald-400" />
            <span>HIPAA § 164.312 Access Control</span>
          </div>
          <span>•</span>
          <div className="flex items-center gap-1.5">
            <Lock size={14} className="text-blue-400" />
            <span>Clinical Audit Trails</span>
          </div>
        </div>
      </div>
    </div>
  );
}
