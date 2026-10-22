"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Heart,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Activity,
  ShieldCheck,
  Lock,
  User,
  Calendar,
  Sparkles,
  Loader2,
  AlertCircle,
  HelpCircle,
} from "lucide-react";
import { clsx } from "clsx";
import { conditionColors } from "@/lib/design-tokens";
import type { ConditionId } from "@/types";
import { useAuth } from "@/context/AuthContext";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import TurnstileWidget from "@/components/security/TurnstileWidget";

const MAX_CONDITIONS = 5;

const ALL_CONDITIONS: { id: ConditionId; label: string; description: string }[] = [
  { id: "diabetes_t2", label: "Type 2 Diabetes", description: "Blood sugar management" },
  { id: "diabetes_t1", label: "Type 1 Diabetes", description: "Insulin-dependent" },
  { id: "hypertension", label: "Hypertension", description: "High blood pressure" },
  { id: "ckd", label: "Chronic Kidney Disease", description: "Kidney function" },
  { id: "hypothyroidism", label: "Thyroid Condition", description: "Hormone regulation" },
  { id: "ra", label: "Rheumatoid Arthritis", description: "Joint inflammation" },
  { id: "asthma", label: "Asthma", description: "Respiratory condition" },
];

interface DemographicsState {
  name: string;
  dateOfBirth: string;
  gender: string;
}

interface BaselinesState {
  blood_glucose: string;
  blood_pressure_sys: string;
  blood_pressure_dia: string;
  hba1c: string;
  weight: string;
}

export default function OnboardingWizard() {
  const router = useRouter();
  const { user, profile, refreshProfile, signInWithGoogle, turnstileToken, setTurnstileToken } = useAuth();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedConditions, setSelectedConditions] = useState<Set<ConditionId>>(new Set(["diabetes_t2"]));

  const [demographics, setDemographics] = useState<DemographicsState>({
    name: "",
    dateOfBirth: "1990-01-01",
    gender: "prefer_not_to_say",
  });

  const [baselines, setBaselines] = useState<BaselinesState>({
    blood_glucose: "",
    blood_pressure_sys: "",
    blood_pressure_dia: "",
    hba1c: "",
    weight: "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isSigningIn, setIsSigningIn] = useState(false);

  // Restore existing form state from sessionStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const rawConditions =
          window.sessionStorage.getItem("curasync_onboarding_conditions") ||
          window.sessionStorage.getItem("curasync_conditions");
        if (rawConditions) {
          const parsed = JSON.parse(rawConditions);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setSelectedConditions(new Set(parsed as ConditionId[]));
          }
        }

        const rawDemo = window.sessionStorage.getItem("curasync_onboarding_demographics");
        if (rawDemo) {
          const parsed = JSON.parse(rawDemo);
          if (parsed && typeof parsed === "object") {
            setDemographics((prev) => ({ ...prev, ...parsed }));
          }
        } else if (user?.displayName) {
          setDemographics((prev) => ({ ...prev, name: user.displayName || "" }));
        }

        const rawBase = window.sessionStorage.getItem("curasync_onboarding_baselines");
        if (rawBase) {
          const parsed = JSON.parse(rawBase);
          if (parsed && typeof parsed === "object") {
            setBaselines((prev) => ({ ...prev, ...parsed }));
          }
        }
      } catch {
        // sessionStorage read error ignored
      }
    }
  }, [user]);

  // Synchronize state changes to sessionStorage
  const saveToSessionStorage = (
    nextConditions = selectedConditions,
    nextDemo = demographics,
    nextBase = baselines
  ) => {
    if (typeof window !== "undefined") {
      const condArr = Array.from(nextConditions);
      window.sessionStorage.setItem("curasync_conditions", JSON.stringify(condArr));
      window.sessionStorage.setItem("curasync_onboarding_conditions", JSON.stringify(condArr));
      window.sessionStorage.setItem("curasync_onboarding_demographics", JSON.stringify(nextDemo));
      window.sessionStorage.setItem("curasync_onboarding_baselines", JSON.stringify(nextBase));
    }
  };

  const toggleCondition = (id: ConditionId) => {
    setSelectedConditions((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        if (next.size > 1) next.delete(id);
      } else if (next.size < MAX_CONDITIONS) {
        next.add(id);
      }
      saveToSessionStorage(next, demographics, baselines);
      return next;
    });
  };

  const handleStep1Continue = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedConditions.size === 0) return;
    saveToSessionStorage();
    setStep(2);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleStep2Continue = () => {
    saveToSessionStorage();
    setStep(3);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const persistProfile = async (activeUser: { uid: string; displayName?: string | null; email?: string | null }) => {
    const condArr = Array.from(selectedConditions);
    const parsedBaselines: Record<string, any> = {};

    if (baselines.blood_glucose) parsedBaselines.blood_glucose = parseFloat(baselines.blood_glucose);
    if (baselines.blood_pressure_sys && baselines.blood_pressure_dia) {
      parsedBaselines.blood_pressure = {
        systolic: parseFloat(baselines.blood_pressure_sys),
        diastolic: parseFloat(baselines.blood_pressure_dia),
      };
    }
    if (baselines.hba1c) parsedBaselines.hba1c = parseFloat(baselines.hba1c);
    if (baselines.weight) parsedBaselines.weight = parseFloat(baselines.weight);

    const res = await fetch("/api/v1/onboarding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: demographics.name || activeUser.displayName || "Patient",
        dateOfBirth: demographics.dateOfBirth || "1990-01-01",
        conditions: condArr.length > 0 ? condArr : ["diabetes_t2"],
        baselines: parsedBaselines,
        medications: [],
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Failed to persist health profile");
    }

    if (typeof window !== "undefined") {
      window.sessionStorage.removeItem("curasync_conditions");
      window.sessionStorage.removeItem("curasync_onboarding_conditions");
      window.sessionStorage.removeItem("curasync_onboarding_demographics");
      window.sessionStorage.removeItem("curasync_onboarding_baselines");
      window.sessionStorage.removeItem("curasync_onboarding_payload");
    }

    await refreshProfile().catch(() => {});
  };

  // Step 3 Primary Action: "Go to Dashboard"
  const handleGoToDashboard = async () => {
    // 1. Check if Supabase or Firebase has an active session
    let activeUid: string | null = user?.uid || null;
    let activeUser = user;

    if (!activeUid) {
      try {
        const supabase = getSupabaseBrowserClient();
        const { data } = await supabase.auth.getSession();
        if (data?.session?.user) {
          activeUid = data.session.user.id;
          activeUser = {
            uid: data.session.user.id,
            displayName: demographics.name || (data.session.user.user_metadata as any)?.name || "Patient",
            email: data.session.user.email,
          } as any;
        }
      } catch {
        // ignore
      }
    }

    // If No Active Session -> Intercept: Force Sign Up
    if (!activeUid || !activeUser) {
      saveToSessionStorage();
      setShowAuthModal(true);
      return;
    }

    // Active session found -> Save & Route to Dashboard
    setIsSubmitting(true);
    try {
      await persistProfile(activeUser);
      router.push("/dashboard");
    } catch (err) {
      console.error("[onboarding-wizard] Profile persistence warning:", err);
      router.push("/dashboard");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Forced Sign-Up Action inside Modal Gate
  const handleModalGoogleSignUp = async () => {
    setAuthError(null);
    setIsSigningIn(true);
    try {
      const result = await signInWithGoogle(turnstileToken || undefined);
      if (!result || !result.user) return;

      await persistProfile(result.user);
      window.location.href = "/dashboard";
    } catch (err: any) {
      console.error("[onboarding-wizard] Sign up failed:", err);
      setAuthError(err.message || "Failed to complete account registration. Please try again.");
    } finally {
      setIsSigningIn(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg-light flex flex-col items-center justify-center px-4 py-10 relative overflow-hidden">
      {/* Background ambient decorative blurs */}
      <div
        className="absolute -top-32 -left-32 w-80 h-80 rounded-full opacity-20 pointer-events-none blur-3xl"
        style={{ background: "radial-gradient(circle, #6C5CE7 0%, transparent 70%)" }}
      />
      <div
        className="absolute -bottom-32 -right-32 w-80 h-80 rounded-full opacity-20 pointer-events-none blur-3xl"
        style={{ background: "radial-gradient(circle, #00CEC9 0%, transparent 70%)" }}
      />

      <div className="w-full max-w-xl z-10">
        {/* Brand Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl gradient-violet flex items-center justify-center text-white shadow-sm">
              <Heart size={18} strokeWidth={2.5} />
            </div>
            <span className="font-bold text-title-lg text-text-primary">
              Cura<span className="text-accent-violet">Sync</span>
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs text-text-tertiary">
            <ShieldCheck size={14} className="text-emerald-500" />
            <span>DPDP & HIPAA Encrypted</span>
          </div>
        </div>

        {/* Step Progress Bar */}
        <div className="flex items-center justify-between mb-8 bg-bg-card p-3 rounded-2xl border border-divider shadow-card">
          {[
            { num: 1, title: "Demographics" },
            { num: 2, title: "Baseline Vitals" },
            { num: 3, title: "Ready" },
          ].map((s) => {
            const isActive = step === s.num;
            const isPassed = step > s.num;
            return (
              <div key={s.num} className="flex items-center gap-2 flex-1">
                <div
                  className={clsx(
                    "w-7 h-7 rounded-xl flex items-center justify-center text-xs font-bold transition-all",
                    isActive
                      ? "gradient-violet text-white shadow-sm"
                      : isPassed
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400"
                      : "bg-bg-light text-text-tertiary border border-divider"
                  )}
                >
                  {isPassed ? <CheckCircle2 size={14} /> : s.num}
                </div>
                <span
                  className={clsx(
                    "text-xs font-medium hidden sm:inline",
                    isActive ? "text-text-primary font-semibold" : "text-text-tertiary"
                  )}
                >
                  {s.title}
                </span>
                {s.num < 3 && <div className="h-0.5 flex-1 bg-divider mx-2" />}
              </div>
            );
          })}
        </div>

        {/* ========================================================================= */}
        {/* STEP 1: DEMOGRAPHICS & CONDITIONS */}
        {/* ========================================================================= */}
        {step === 1 && (
          <form onSubmit={handleStep1Continue} className="bg-bg-card rounded-2xl p-6 md:p-8 border border-divider shadow-card space-y-6 animate-fade-in">
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-text-primary mb-1.5">
                Tell us about your health profile
              </h1>
              <p className="text-xs md:text-sm text-text-secondary leading-relaxed">
                Step 1: Enter your demographic information and select the conditions you are actively managing.
              </p>
            </div>

            {/* Demographics Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1.5">
                  Full Name / Preferred Name
                </label>
                <div className="relative">
                  <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-tertiary" />
                  <input
                    type="text"
                    required
                    value={demographics.name}
                    onChange={(e) => {
                      const updated = { ...demographics, name: e.target.value };
                      setDemographics(updated);
                      saveToSessionStorage(selectedConditions, updated, baselines);
                    }}
                    placeholder="e.g. Alex Rivera"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-divider bg-bg-light text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent-violet/30 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1.5">
                  Date of Birth
                </label>
                <div className="relative">
                  <Calendar size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-tertiary" />
                  <input
                    type="date"
                    required
                    value={demographics.dateOfBirth}
                    onChange={(e) => {
                      const updated = { ...demographics, dateOfBirth: e.target.value };
                      setDemographics(updated);
                      saveToSessionStorage(selectedConditions, updated, baselines);
                    }}
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-divider bg-bg-light text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent-violet/30 transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Conditions Selection */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
                  Select Chronic Conditions (Up to {MAX_CONDITIONS})
                </label>
                <span className="text-xs text-accent-violet font-semibold">
                  {selectedConditions.size} of {MAX_CONDITIONS} selected
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {ALL_CONDITIONS.map((cond) => {
                  const colors = conditionColors[cond.id];
                  const isSelected = selectedConditions.has(cond.id);
                  const isDisabled = !isSelected && selectedConditions.size >= MAX_CONDITIONS;
                  return (
                    <button
                      key={cond.id}
                      type="button"
                      onClick={() => toggleCondition(cond.id)}
                      disabled={isDisabled}
                      className={clsx(
                        "relative flex items-start gap-3 p-3 rounded-xl border-2 text-left transition-all",
                        isSelected
                          ? "border-accent-violet shadow-sm"
                          : isDisabled
                          ? "border-divider opacity-40 cursor-not-allowed"
                          : "border-divider hover:border-accent-lavender bg-bg-card hover:shadow-sm cursor-pointer"
                      )}
                      style={isSelected ? { background: colors?.bg ?? "#F0EFF8" } : { background: "#fff" }}
                    >
                      <span className="text-xl shrink-0 mt-0.5">{colors?.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <p
                          className="font-semibold text-xs leading-tight"
                          style={{ color: isSelected ? colors?.accent ?? "#6C5CE7" : "#1A1A2E" }}
                        >
                          {cond.label}
                        </p>
                        <p className="text-[11px] text-text-tertiary mt-0.5 truncate">{cond.description}</p>
                      </div>
                      {isSelected && (
                        <CheckCircle2
                          size={15}
                          className="absolute top-2.5 right-2.5"
                          style={{ color: colors?.accent ?? "#6C5CE7" }}
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Step 1 Actions */}
            <button
              type="submit"
              disabled={selectedConditions.size === 0}
              className="w-full py-3.5 px-4 rounded-xl gradient-violet hover:opacity-95 text-white font-semibold text-sm shadow-card flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
            >
              <span>Continue to Baseline Vitals</span>
              <ArrowRight size={16} />
            </button>
          </form>
        )}

        {/* ========================================================================= */}
        {/* STEP 2: BASELINE VITALS (OPTIONAL) */}
        {/* ========================================================================= */}
        {step === 2 && (
          <div className="bg-bg-card rounded-2xl p-6 md:p-8 border border-divider shadow-card space-y-6 animate-fade-in">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-text-primary mb-1.5">
                  Baseline Health Vitals
                </h1>
                <p className="text-xs md:text-sm text-text-secondary leading-relaxed">
                  Step 2: Enter recent lab or biometric readings. This is optional and can be updated anytime from your dashboard.
                </p>
              </div>
              <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-accent-violet/10 text-accent-violet shrink-0">
                Optional
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Blood Glucose */}
              <div className="p-3.5 rounded-xl border border-divider bg-bg-light space-y-1.5">
                <label className="text-xs font-semibold text-text-primary flex items-center gap-1.5">
                  <span>Fasting Blood Glucose</span>
                  <span className="text-text-tertiary font-normal">(mg/dL)</span>
                </label>
                <input
                  type="number"
                  step="1"
                  placeholder="e.g. 110"
                  value={baselines.blood_glucose}
                  onChange={(e) => {
                    const updated = { ...baselines, blood_glucose: e.target.value };
                    setBaselines(updated);
                    saveToSessionStorage(selectedConditions, demographics, updated);
                  }}
                  className="w-full px-3 py-2 rounded-lg border border-divider bg-bg-card text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent-violet/30"
                />
              </div>

              {/* Blood Pressure */}
              <div className="p-3.5 rounded-xl border border-divider bg-bg-light space-y-1.5">
                <label className="text-xs font-semibold text-text-primary flex items-center gap-1.5">
                  <span>Blood Pressure</span>
                  <span className="text-text-tertiary font-normal">(Systolic / Diastolic)</span>
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    placeholder="120"
                    value={baselines.blood_pressure_sys}
                    onChange={(e) => {
                      const updated = { ...baselines, blood_pressure_sys: e.target.value };
                      setBaselines(updated);
                      saveToSessionStorage(selectedConditions, demographics, updated);
                    }}
                    className="w-full px-3 py-2 rounded-lg border border-divider bg-bg-card text-text-primary text-sm text-center focus:outline-none focus:ring-2 focus:ring-accent-violet/30"
                  />
                  <span className="text-text-tertiary">/</span>
                  <input
                    type="number"
                    placeholder="80"
                    value={baselines.blood_pressure_dia}
                    onChange={(e) => {
                      const updated = { ...baselines, blood_pressure_dia: e.target.value };
                      setBaselines(updated);
                      saveToSessionStorage(selectedConditions, demographics, updated);
                    }}
                    className="w-full px-3 py-2 rounded-lg border border-divider bg-bg-card text-text-primary text-sm text-center focus:outline-none focus:ring-2 focus:ring-accent-violet/30"
                  />
                </div>
              </div>

              {/* HbA1c */}
              <div className="p-3.5 rounded-xl border border-divider bg-bg-light space-y-1.5">
                <label className="text-xs font-semibold text-text-primary flex items-center gap-1.5">
                  <span>HbA1c Lab Reading</span>
                  <span className="text-text-tertiary font-normal">(%)</span>
                </label>
                <input
                  type="number"
                  step="0.1"
                  placeholder="e.g. 6.5"
                  value={baselines.hba1c}
                  onChange={(e) => {
                    const updated = { ...baselines, hba1c: e.target.value };
                    setBaselines(updated);
                    saveToSessionStorage(selectedConditions, demographics, updated);
                  }}
                  className="w-full px-3 py-2 rounded-lg border border-divider bg-bg-card text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent-violet/30"
                />
              </div>

              {/* Weight */}
              <div className="p-3.5 rounded-xl border border-divider bg-bg-light space-y-1.5">
                <label className="text-xs font-semibold text-text-primary flex items-center gap-1.5">
                  <span>Current Weight</span>
                  <span className="text-text-tertiary font-normal">(kg)</span>
                </label>
                <input
                  type="number"
                  step="0.1"
                  placeholder="e.g. 74.5"
                  value={baselines.weight}
                  onChange={(e) => {
                    const updated = { ...baselines, weight: e.target.value };
                    setBaselines(updated);
                    saveToSessionStorage(selectedConditions, demographics, updated);
                  }}
                  className="w-full px-3 py-2 rounded-lg border border-divider bg-bg-card text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent-violet/30"
                />
              </div>
            </div>

            {/* Step 2 Actions */}
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="py-3 px-4 rounded-xl border border-divider hover:bg-bg-light text-text-secondary text-sm font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <ArrowLeft size={16} />
                <span>Back</span>
              </button>

              <button
                type="button"
                onClick={handleStep2Continue}
                className="flex-1 py-3.5 px-4 rounded-xl gradient-violet hover:opacity-95 text-white font-semibold text-sm shadow-card flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <span>Continue to Summary</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STEP 3: AUTH INTERCEPT GATE */}
        {/* ========================================================================= */}
        {step === 3 && (
          <div className="bg-bg-card rounded-2xl p-6 md:p-8 border border-divider shadow-card space-y-6 text-center animate-fade-in">
            {/* Status Icon */}
            <div className="w-16 h-16 mx-auto rounded-3xl gradient-violet flex items-center justify-center text-white shadow-card">
              <Sparkles size={32} />
            </div>

            <div className="space-y-2">
              <h1 className="text-xl md:text-2xl font-bold text-text-primary tracking-tight">
                Profile Ready to Connect
              </h1>
              <p className="text-xs md:text-sm text-text-secondary leading-relaxed max-w-md mx-auto">
                Step 3: Your personalized conditions and clinical targets have been prepared. Proceed to your dashboard to activate live telemetry and doctor sync.
              </p>
            </div>

            {/* Profile Overview Card */}
            <div className="p-4 rounded-xl bg-bg-light border border-divider text-left space-y-3">
              <div className="flex items-center justify-between text-xs pb-2 border-b border-divider">
                <span className="text-text-tertiary">Patient Name:</span>
                <span className="font-semibold text-text-primary">{demographics.name || "Patient"}</span>
              </div>
              <div className="flex items-start justify-between text-xs pb-2 border-b border-divider">
                <span className="text-text-tertiary">Selected Conditions:</span>
                <div className="flex flex-wrap gap-1 justify-end max-w-xs">
                  {Array.from(selectedConditions).map((c) => (
                    <span
                      key={c}
                      className="px-2 py-0.5 rounded-md text-[11px] font-semibold"
                      style={{
                        background: conditionColors[c]?.bg || "#F0EFF8",
                        color: conditionColors[c]?.accent || "#6C5CE7",
                      }}
                    >
                      {conditionColors[c]?.emoji} {conditionColors[c]?.label || c}
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-text-tertiary">Baseline Metrics Logged:</span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                  {Object.values(baselines).filter(Boolean).length > 0 ? "Configured" : "Will log later"}
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3 pt-2">
              <button
                type="button"
                onClick={handleGoToDashboard}
                disabled={isSubmitting}
                className="w-full py-3.5 px-4 rounded-xl gradient-violet hover:opacity-95 text-white font-semibold text-sm shadow-card flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-[0.99] disabled:opacity-60"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Activating Dashboard…</span>
                  </>
                ) : (
                  <>
                    <span>Go to Dashboard</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setStep(2)}
                className="w-full py-2.5 text-xs text-text-tertiary hover:text-text-secondary transition-colors"
              >
                ← Back to Baseline Vitals
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* INTERCEPT MODAL: FORCE SIGN UP / REGISTER FOR GUEST */}
      {/* ========================================================================= */}
      {showAuthModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-bg-card w-full max-w-md rounded-2xl p-6 md:p-8 border border-divider shadow-2xl space-y-6 relative">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 mx-auto rounded-2xl gradient-violet flex items-center justify-center text-white shadow-card mb-3">
                <Lock size={22} />
              </div>
              <h2 className="text-xl font-bold text-text-primary">
                Save Your Health Profile
              </h2>
              <p className="text-xs text-text-secondary leading-relaxed">
                Create your CuraSync account to save your baseline health profile and access your dashboard.
              </p>
            </div>

            {authError && (
              <div className="p-3 rounded-xl bg-accent-coral/10 border border-accent-coral/20 flex items-start gap-2.5 text-xs text-accent-coral">
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                <span>{authError}</span>
              </div>
            )}

            <div className="space-y-1">
              <TurnstileWidget
                onVerify={(token) => setTurnstileToken(token)}
                onError={(err) => console.warn("Turnstile warning:", err)}
              />
            </div>

            <div className="space-y-3">
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
                <span>{isSigningIn ? "Creating Account…" : "Sign Up with Google"}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  window.location.href = "/signup";
                }}
                className="w-full py-2.5 text-center text-xs text-accent-violet hover:underline font-semibold"
              >
                Go to Dedicated Sign Up Page →
              </button>
            </div>

            <div className="pt-3 border-t border-divider text-center">
              <button
                type="button"
                onClick={() => setShowAuthModal(false)}
                className="text-xs text-text-tertiary hover:text-text-secondary"
              >
                Cancel and return to form
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
