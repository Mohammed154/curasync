"use client";

// Force dynamic rendering — this page uses Clerk hooks at runtime
export const dynamic = "force-dynamic";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Heart, CheckCircle2, ArrowRight, Loader2 } from "lucide-react";
import { clsx } from "clsx";
import { conditionColors } from "@/lib/design-tokens";
import type { ConditionId } from "@/types";
import { saveOnboardingProfile } from "@/hooks/useApi";

// Safe Clerk hook — gracefully handles missing ClerkProvider in non-auth environments
function useSafeUser() {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { useUser } = require("@clerk/nextjs");
    // eslint-disable-next-line react-hooks/rules-of-hooks
    return useUser() as { user: { fullName?: string | null; firstName?: string | null } | null };
  } catch {
    return { user: null };
  }
}

const MAX_CONDITIONS = 5;

const ALL_CONDITIONS: { id: ConditionId; label: string; description: string }[] = [
  { id: "diabetes_t2",    label: "Type 2 Diabetes",        description: "Blood sugar management" },
  { id: "diabetes_t1",    label: "Type 1 Diabetes",        description: "Insulin-dependent" },
  { id: "hypertension",   label: "Hypertension",           description: "High blood pressure" },
  { id: "ckd",            label: "Chronic Kidney Disease", description: "Kidney function" },
  { id: "copd",           label: "COPD",                   description: "Lung disease" },
  { id: "chf",            label: "Heart Failure",          description: "Cardiac condition" },
  { id: "cad",            label: "Coronary Artery Disease",description: "Heart disease" },
  { id: "hypothyroidism", label: "Thyroid Condition",      description: "Hormone regulation" },
  { id: "ra",             label: "Rheumatoid Arthritis",   description: "Joint inflammation" },
  { id: "asthma",         label: "Asthma",                 description: "Respiratory condition" },
];

export default function OnboardingPage() {
  const { user } = useSafeUser();
  const router = useRouter();
  const [selected, setSelected] = useState<Set<ConditionId>>(new Set());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggle = (id: ConditionId) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); } else if (next.size < MAX_CONDITIONS) { next.add(id); }
      return next;
    });
  };

  const handleContinue = async () => {
    if (selected.size === 0) return;
    setSaving(true);
    setError(null);

    // Store selected conditions in sessionStorage for subsequent onboarding steps
    sessionStorage.setItem("curasync_conditions", JSON.stringify(Array.from(selected)));

    try {
      // If Clerk is active and user is loaded, save to DB
      if (user) {
        await saveOnboardingProfile({
          name:        user.fullName ?? user.firstName ?? "Patient",
          dateOfBirth: "1990-01-01",
          conditions:  Array.from(selected),
        });
      }
      // Navigate regardless — DB save is best-effort in dev without credentials
      router.push("/onboarding/baselines");
    } catch {
      // Still navigate — don't block the user on a network error
      router.push("/onboarding/baselines");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg-light flex flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="flex items-center gap-2 mb-8">
          <div className="w-9 h-9 rounded-xl gradient-violet flex items-center justify-center">
            <Heart size={18} className="text-white" strokeWidth={2.5} />
          </div>
          <span className="font-bold text-title-lg text-text-primary">CuraSync</span>
        </div>

        {/* Progress */}
        <div className="flex items-center gap-2 mb-6">
          <div className="flex gap-1.5">
            {[1,2,3,4,5].map((step) => (
              <div key={step} className="h-1.5 rounded-full transition-all"
                style={{ width: step === 1 ? "40px" : "12px", background: step === 1 ? "#6C5CE7" : "#E2E0F0" }} />
            ))}
          </div>
          <span className="text-xs text-text-tertiary ml-2">Step 1 of 5</span>
        </div>

        <div className="mb-6 animate-fade-in">
          <h1 className="font-bold text-title-lg text-text-primary mb-2">
            Which conditions are you managing?
          </h1>
          <p className="text-body-md text-text-secondary">
            Select up to {MAX_CONDITIONS} conditions. We&apos;ll tailor your dashboard, metrics, and alerts to your needs.
          </p>
        </div>

        {/* Condition grid */}
        <div className="grid grid-cols-2 gap-2.5 mb-6">
          {ALL_CONDITIONS.map((cond) => {
            const colors = conditionColors[cond.id];
            const isSelected = selected.has(cond.id);
            const isDisabled = !isSelected && selected.size >= MAX_CONDITIONS;
            return (
              <button
                key={cond.id}
                onClick={() => toggle(cond.id)}
                disabled={isDisabled}
                aria-pressed={isSelected}
                className={clsx(
                  "relative flex items-start gap-3 p-3 rounded-lg border-2 text-left transition-all duration-200",
                  isSelected ? "border-accent-violet shadow-card" : isDisabled ? "border-divider opacity-40 cursor-not-allowed" : "border-divider hover:border-accent-lavender bg-bg-card hover:shadow-card cursor-pointer"
                )}
                style={isSelected ? { background: colors?.bg ?? "#F0EFF8" } : { background: "#fff" }}
              >
                <span className="text-xl flex-shrink-0 mt-0.5" aria-hidden="true">{colors?.emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-label-sm leading-tight" style={{ color: isSelected ? (colors?.accent ?? "#6C5CE7") : "#1A1A2E" }}>
                    {cond.label}
                  </p>
                  <p className="text-xs text-text-tertiary mt-0.5">{cond.description}</p>
                </div>
                {isSelected && (
                  <CheckCircle2 size={16} className="absolute top-2.5 right-2.5 flex-shrink-0"
                    style={{ color: colors?.accent ?? "#6C5CE7" }} aria-hidden="true" />
                )}
              </button>
            );
          })}
        </div>

        <p className="text-label-sm text-text-secondary mb-4 text-center">
          {selected.size} of {MAX_CONDITIONS} selected
          {selected.size === MAX_CONDITIONS && <span className="ml-2 text-accent-violet font-semibold">· Maximum reached</span>}
        </p>

        {error && <p className="text-xs text-status-red text-center mb-3">{error}</p>}

        {/* CTA */}
        <button
          onClick={handleContinue}
          disabled={selected.size === 0 || saving}
          className={clsx(
            "w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-semibold text-body-md transition-all",
            selected.size > 0 && !saving ? "gradient-violet text-white shadow-card hover:opacity-90" : "bg-divider text-text-tertiary cursor-not-allowed"
          )}
        >
          {saving ? <><Loader2 size={18} className="animate-spin" />Saving…</> : <>Continue <ArrowRight size={18} aria-hidden="true" /></>}
        </button>

        <div className="flex items-center justify-center mt-4">
          <span className="text-label-sm text-text-tertiary">Already have an account?</span>
          <Link href="/dashboard" className="ml-2 text-label-sm font-semibold text-accent-violet hover:text-accent-lavender transition-colors">
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
