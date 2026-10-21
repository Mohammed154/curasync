"use client";

// Force dynamic rendering
export const dynamic = "force-dynamic";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Heart, CheckCircle2, ArrowRight } from "lucide-react";
import { clsx } from "clsx";
import { conditionColors } from "@/lib/design-tokens";
import type { ConditionId } from "@/types";

const MAX_CONDITIONS = 5;

const ALL_CONDITIONS: { id: ConditionId; label: string; description: string }[] = [
  { id: "diabetes_t2",    label: "Type 2 Diabetes",        description: "Blood sugar management" },
  { id: "diabetes_t1",    label: "Type 1 Diabetes",        description: "Insulin-dependent" },
  { id: "hypertension",   label: "Hypertension",           description: "High blood pressure" },
  { id: "ckd",            label: "Chronic Kidney Disease", description: "Kidney function" },
  { id: "hypothyroidism", label: "Thyroid Condition",      description: "Hormone regulation" },
  { id: "ra",             label: "Rheumatoid Arthritis",   description: "Joint inflammation" },
  { id: "asthma",         label: "Asthma",                 description: "Respiratory condition" },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<ConditionId>>(new Set());

  // Restore previously chosen conditions from sessionStorage if user navigates back
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const raw =
          window.sessionStorage.getItem("curasync_onboarding_conditions") ||
          window.sessionStorage.getItem("curasync_conditions");
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setSelected(new Set(parsed as ConditionId[]));
          }
        }
      } catch {
        // ignore
      }
    }
  }, []);

  const toggle = (id: ConditionId) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else if (next.size < MAX_CONDITIONS) {
        next.add(id);
      }
      return next;
    });
  };

  const handleContinue = () => {
    if (selected.size === 0) return;
    const condArray = Array.from(selected);

    // Save condition selection across onboarding steps in sessionStorage
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem("curasync_conditions", JSON.stringify(condArray));
      window.sessionStorage.setItem("curasync_onboarding_conditions", JSON.stringify(condArray));
    }

    router.push("/onboarding/baselines");
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
            {[1, 2, 3, 4, 5].map((step) => (
              <div
                key={step}
                className="h-1.5 rounded-full transition-all"
                style={{
                  width: step === 1 ? "40px" : "12px",
                  background: step === 1 ? "#6C5CE7" : "#E2E0F0",
                }}
              />
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
                type="button"
                onClick={() => toggle(cond.id)}
                disabled={isDisabled}
                aria-pressed={isSelected}
                className={clsx(
                  "relative flex items-start gap-3 p-3 rounded-lg border-2 text-left transition-all duration-200",
                  isSelected
                    ? "border-accent-violet shadow-card"
                    : isDisabled
                    ? "border-divider opacity-40 cursor-not-allowed"
                    : "border-divider hover:border-accent-lavender bg-bg-card hover:shadow-card cursor-pointer"
                )}
                style={isSelected ? { background: colors?.bg ?? "#F0EFF8" } : { background: "#fff" }}
              >
                <span className="text-xl flex-shrink-0 mt-0.5" aria-hidden="true">
                  {colors?.emoji}
                </span>
                <div className="flex-1 min-w-0">
                  <p
                    className="font-semibold text-label-sm leading-tight"
                    style={{ color: isSelected ? (colors?.accent ?? "#6C5CE7") : "#1A1A2E" }}
                  >
                    {cond.label}
                  </p>
                  <p className="text-xs text-text-tertiary mt-0.5">{cond.description}</p>
                </div>
                {isSelected && (
                  <CheckCircle2
                    size={16}
                    className="absolute top-2.5 right-2.5 flex-shrink-0"
                    style={{ color: colors?.accent ?? "#6C5CE7" }}
                    aria-hidden="true"
                  />
                )}
              </button>
            );
          })}
        </div>

        <p className="text-label-sm text-text-secondary mb-4 text-center">
          {selected.size} of {MAX_CONDITIONS} selected
          {selected.size === MAX_CONDITIONS && (
            <span className="ml-2 text-accent-violet font-semibold">· Maximum reached</span>
          )}
        </p>

        {/* CTA */}
        <button
          type="button"
          onClick={handleContinue}
          disabled={selected.size === 0}
          className={clsx(
            "w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-semibold text-body-md transition-all",
            selected.size > 0
              ? "gradient-violet text-white shadow-card hover:opacity-90 cursor-pointer"
              : "bg-divider text-text-tertiary cursor-not-allowed"
          )}
        >
          <span>Continue</span>
          <ArrowRight size={18} aria-hidden="true" />
        </button>

        <div className="flex items-center justify-center mt-4">
          <span className="text-label-sm text-text-tertiary">Already have an account?</span>
          <Link
            href="/login"
            className="ml-2 text-label-sm font-semibold text-accent-violet hover:text-accent-lavender transition-colors"
          >
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
