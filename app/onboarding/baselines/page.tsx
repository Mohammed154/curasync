"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Heart, ArrowRight, ArrowLeft, Info } from "lucide-react";
import { clsx } from "clsx";

interface BaselineField { key: string; label: string; unit: string; placeholder: string; tip: string; }

const BASELINE_FIELDS: BaselineField[] = [
  { key: "hba1c",      label: "HbA1c",              unit: "%",             placeholder: "e.g. 7.4",    tip: "From your last lab report. Normal <5.7%, Diabetic ≥6.5%" },
  { key: "glucose",    label: "Fasting Blood Glucose", unit: "mg/dL",      placeholder: "e.g. 128",    tip: "Taken after 8+ hours without eating." },
  { key: "systolic",   label: "Systolic BP",         unit: "mmHg",         placeholder: "e.g. 138",    tip: "The top number in your blood pressure reading." },
  { key: "diastolic",  label: "Diastolic BP",        unit: "mmHg",         placeholder: "e.g. 88",     tip: "The bottom number in your blood pressure reading." },
  { key: "egfr",       label: "eGFR",                unit: "mL/min/1.73m²", placeholder: "e.g. 48",   tip: "Kidney filtration rate. From your last lab report." },
  { key: "weight",     label: "Current Weight",      unit: "kg",           placeholder: "e.g. 84.2",   tip: "Measured first thing in the morning, without shoes." },
  { key: "height",     label: "Height",              unit: "cm",           placeholder: "e.g. 168",    tip: "Used to calculate BMI and dose adjustments." },
];

export default function OnboardingBaselinesPage() {
  const [values, setValues] = useState<Record<string, string>>({});
  const [activeTip, setActiveTip] = useState<string | null>(null);

  const filled = BASELINE_FIELDS.filter((f) => values[f.key]?.trim()).length;
  const pct = Math.round((filled / BASELINE_FIELDS.length) * 100);

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
                style={{ width: step <= 2 ? "40px" : "12px", background: step <= 2 ? "#6C5CE7" : "#E2E0F0" }} />
            ))}
          </div>
          <span className="text-xs text-text-tertiary ml-2">Step 2 of 5</span>
        </div>

        <div className="mb-6">
          <h1 className="font-bold text-title-lg text-text-primary mb-2">Set your health baselines</h1>
          <p className="text-body-md text-text-secondary">
            These starting values help us calibrate your alerts and trends. You can update them anytime. Skip any you don&apos;t have right now.
          </p>
        </div>

        {/* Baseline fields */}
        <div className="space-y-3 mb-6">
          {BASELINE_FIELDS.map((field) => (
            <div key={field.key} className="bg-bg-card rounded-xl p-4 shadow-card">
              <div className="flex items-center justify-between mb-2">
                <label htmlFor={field.key} className="font-semibold text-label-sm text-text-primary">
                  {field.label}
                </label>
                <button
                  onClick={() => setActiveTip(activeTip === field.key ? null : field.key)}
                  className="p-1 rounded-full hover:bg-bg-lavender transition-colors"
                  aria-label={`Info about ${field.label}`}
                >
                  <Info size={13} className="text-text-tertiary" />
                </button>
              </div>

              {activeTip === field.key && (
                <p className="text-xs text-text-secondary bg-bg-lavender rounded-lg px-3 py-2 mb-2 leading-relaxed">
                  {field.tip}
                </p>
              )}

              <div className="flex items-center gap-2">
                <input
                  id={field.key}
                  type="number"
                  value={values[field.key] ?? ""}
                  onChange={(e) => setValues((prev) => ({ ...prev, [field.key]: e.target.value }))}
                  placeholder={field.placeholder}
                  className="flex-1 px-3 py-2.5 rounded-lg border border-divider bg-bg-light text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-lavender/40 focus:border-accent-violet transition-all"
                />
                <span className="text-label-sm text-text-tertiary font-medium flex-shrink-0 min-w-[60px]">{field.unit}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Progress indicator */}
        <div className="flex items-center justify-between mb-4 text-label-sm">
          <span className="text-text-secondary">{filled} of {BASELINE_FIELDS.length} filled</span>
          <div className="flex items-center gap-2">
            <div className="w-20 h-1.5 bg-divider rounded-full overflow-hidden">
              <div className="h-full rounded-full bg-accent-violet transition-all duration-500" style={{ width: `${pct}%` }} />
            </div>
            <span className="text-text-tertiary">{pct}%</span>
          </div>
        </div>

        <div className="flex gap-3">
          <Link
            href="/onboarding"
            className="flex items-center gap-2 px-4 py-3 rounded-xl border border-divider font-semibold text-body-md text-text-secondary hover:bg-bg-lavender transition-all"
          >
            <ArrowLeft size={18} aria-hidden="true" />
            Back
          </Link>
          <Link
            href="/onboarding/medications"
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl gradient-violet text-white font-semibold text-body-md hover:opacity-90 transition-opacity"
          >
            Continue
            <ArrowRight size={18} aria-hidden="true" />
          </Link>
        </div>

        <button className="w-full text-center text-label-sm text-text-tertiary mt-3 hover:text-text-secondary transition-colors">
          Skip — I&apos;ll add these later
        </button>
      </div>
    </div>
  );
}
