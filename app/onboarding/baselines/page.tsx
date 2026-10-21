"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Heart, ArrowRight, ArrowLeft, Info, HelpCircle, Search, Activity, ChevronDown, ChevronUp } from "lucide-react";
import { clsx } from "clsx";

interface BaselineField {
  key: string;
  label: string;
  unit: string;
  placeholder: string;
  whatItIs: string;
  whereToFindIt: string;
  whyCuraSyncCollectsIt: string;
  defaultOpen?: boolean;
}

const BASELINE_FIELDS: BaselineField[] = [
  {
    key: "hba1c",
    label: "HbA1c",
    unit: "%",
    placeholder: "e.g. 6.8",
    defaultOpen: true,
    whatItIs: "A 3-month rolling average of your blood sugar levels based on glycated hemoglobin in red blood cells.",
    whereToFindIt: "Found on your routine laboratory blood test results (Comprehensive Metabolic Panel or Hemoglobin A1c test).",
    whyCuraSyncCollectsIt: "Establishes your baseline glycemic target to monitor long-term diabetes control and detect treatment response.",
  },
  {
    key: "glucose",
    label: "Fasting Blood Glucose",
    unit: "mg/dL",
    placeholder: "e.g. 110",
    defaultOpen: true,
    whatItIs: "Your immediate blood sugar concentration measured in the morning before eating or drinking (8+ hours fasting).",
    whereToFindIt: "Your home glucometer test kit or fasting blood panel results from your doctor.",
    whyCuraSyncCollectsIt: "Calibrates daily safe glycemic zones and enables instant warnings for sudden hypoglycemic or hyperglycemic events.",
  },
  {
    key: "systolic",
    label: "Systolic Blood Pressure",
    unit: "mmHg",
    placeholder: "e.g. 128",
    defaultOpen: true,
    whatItIs: "The peak pressure exerted inside your arterial walls when your heart pumps blood outward.",
    whereToFindIt: "The upper / top number displayed on any digital home arm cuff monitor or clinic checkup summary.",
    whyCuraSyncCollectsIt: "Detects cardiovascular strain and hypertensive urgency, helping your care team adjust antihypertensive therapy.",
  },
  {
    key: "diastolic",
    label: "Diastolic Blood Pressure",
    unit: "mmHg",
    placeholder: "e.g. 82",
    defaultOpen: true,
    whatItIs: "The residual resting pressure in your arteries when your heart muscle relaxes between heartbeats.",
    whereToFindIt: "The lower / bottom number on your home blood pressure cuff monitor or clinical summary.",
    whyCuraSyncCollectsIt: "Essential for detecting diastolic hypertension, vascular stiffness, and calculating mean arterial pressure.",
  },
  {
    key: "heart_rate",
    label: "Resting Heart Rate",
    unit: "bpm",
    placeholder: "e.g. 72",
    whatItIs: "The frequency of your heart's beats per minute while you are relaxed and seated.",
    whereToFindIt: "Shown on blood pressure monitors, pulse oximeters, smartwatches, or by counting wrist pulse for 60 seconds.",
    whyCuraSyncCollectsIt: "Monitors autonomic cardiovascular stability, detecting bradycardia, tachycardia, or medication-related changes.",
  },
  {
    key: "egfr",
    label: "Kidney Function (eGFR)",
    unit: "mL/min",
    placeholder: "e.g. 75",
    whatItIs: "Estimated Glomerular Filtration Rate — a score indicating how efficiently your kidneys remove waste from blood.",
    whereToFindIt: "Listed under the Renal Function or Chemistry panel in your recent hospital or clinic lab report.",
    whyCuraSyncCollectsIt: "Used to monitor chronic kidney disease (CKD) stages and flag medications that require dose tapering for renal safety.",
  },
  {
    key: "weight",
    label: "Current Weight",
    unit: "kg",
    placeholder: "e.g. 74.5",
    whatItIs: "Your body weight in kilograms, ideally recorded in the morning without footwear.",
    whereToFindIt: "Standard digital or analog bathroom scale.",
    whyCuraSyncCollectsIt: "Identifies rapid fluid accumulation (crucial for heart failure and kidney care) and tracks metabolic progress.",
  },
  {
    key: "height",
    label: "Height",
    unit: "cm",
    placeholder: "e.g. 172",
    whatItIs: "Your standing height measured in centimeters.",
    whereToFindIt: "Your last annual checkup summary or home measuring tape.",
    whyCuraSyncCollectsIt: "Calculates Body Mass Index (BMI) and personalizes clinical drug dosage recommendations.",
  },
];

export default function OnboardingBaselinesPage() {
  const router = useRouter();
  const [values, setValues] = useState<Record<string, string>>({});
  const [openHelpers, setOpenHelpers] = useState<Record<string, boolean>>({
    hba1c: true,
    glucose: true,
    systolic: true,
    diastolic: true,
  });

  // Load any previously saved baseline inputs from sessionStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const raw = window.sessionStorage.getItem("curasync_onboarding_baselines");
        if (raw) {
          const parsed = JSON.parse(raw);
          const initialMap: Record<string, string> = {};
          for (const [k, v] of Object.entries(parsed)) {
            if (v !== null && v !== undefined) {
              initialMap[k] = String(v);
            }
          }
          setValues(initialMap);
        }
      } catch {
        // ignore
      }
    }
  }, []);

  const toggleHelper = (key: string) => {
    setOpenHelpers((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const saveToSessionStorage = () => {
    if (typeof window === "undefined") return;
    const payload: Record<string, number | null> = {};
    for (const field of BASELINE_FIELDS) {
      const rawVal = values[field.key]?.trim();
      payload[field.key] = rawVal ? parseFloat(rawVal) : null;
    }
    // Also provide standardized aliases for database ingestion
    payload["systolic_bp"] = payload["systolic"] ?? null;
    payload["diastolic_bp"] = payload["diastolic"] ?? null;
    payload["blood_glucose"] = payload["glucose"] ?? null;

    window.sessionStorage.setItem("curasync_onboarding_baselines", JSON.stringify(payload));
  };

  const handleContinue = () => {
    saveToSessionStorage();
    router.push("/onboarding/medications");
  };

  const handleSkip = () => {
    saveToSessionStorage();
    router.push("/onboarding/medications");
  };

  const filled = BASELINE_FIELDS.filter((f) => values[f.key]?.trim()).length;
  const pct = Math.round((filled / BASELINE_FIELDS.length) * 100);

  return (
    <div className="min-h-screen bg-bg-light flex flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-xl">
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
                  width: step <= 2 ? "40px" : "12px",
                  background: step <= 2 ? "#6C5CE7" : "#E2E0F0",
                }}
              />
            ))}
          </div>
          <span className="text-xs text-text-tertiary ml-2">Step 2 of 5</span>
        </div>

        <div className="mb-6">
          <h1 className="font-bold text-title-lg text-text-primary mb-2">
            Set your health baselines
          </h1>
          <p className="text-body-md text-text-secondary">
            All clinical measurements are <span className="font-semibold text-accent-violet">completely optional</span>. Enter any recent numbers you have, or skip without friction to proceed.
          </p>
        </div>

        {/* Baseline fields with Contextual Helper Cards */}
        <div className="space-y-4 mb-6">
          {BASELINE_FIELDS.map((field) => {
            const isHelperOpen = Boolean(openHelpers[field.key]);

            return (
              <div
                key={field.key}
                className="bg-bg-card rounded-2xl p-4 md:p-5 shadow-card border border-divider transition-all"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <label
                      htmlFor={field.key}
                      className="font-semibold text-sm text-text-primary flex items-center gap-1.5"
                    >
                      {field.label}
                      <span className="text-[11px] font-normal text-text-tertiary">
                        (Optional)
                      </span>
                    </label>
                  </div>

                  <button
                    type="button"
                    onClick={() => toggleHelper(field.key)}
                    className="flex items-center gap-1 text-xs text-accent-violet hover:text-accent-lavender font-medium px-2 py-1 rounded-lg hover:bg-bg-lavender transition-all"
                    aria-label={`Clinical guidance for ${field.label}`}
                  >
                    <Info size={13} />
                    <span>{isHelperOpen ? "Hide Guide" : "What is this?"}</span>
                    {isHelperOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                  </button>
                </div>

                {/* Input row */}
                <div className="flex items-center gap-2 mb-3">
                  <input
                    id={field.key}
                    type="number"
                    step="any"
                    value={values[field.key] ?? ""}
                    onChange={(e) =>
                      setValues((prev) => ({ ...prev, [field.key]: e.target.value }))
                    }
                    placeholder={field.placeholder}
                    className="flex-1 px-3.5 py-2.5 rounded-xl border border-divider bg-bg-light text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-lavender/40 focus:border-accent-violet transition-all"
                  />
                  <span className="text-xs text-text-tertiary font-semibold flex-shrink-0 min-w-[65px] px-2 py-2 bg-bg-light rounded-lg border border-divider text-center">
                    {field.unit}
                  </span>
                </div>

                {/* Contextual Clinical Helper Box */}
                {isHelperOpen && (
                  <div className="mt-3 p-3.5 rounded-xl bg-gradient-to-br from-bg-lavender/50 to-bg-light border border-accent-lavender/40 space-y-2 text-xs animate-fade-in">
                    {/* 1. What it is */}
                    <div className="flex items-start gap-2">
                      <div className="w-5 h-5 rounded-md bg-accent-violet/10 text-accent-violet flex items-center justify-center flex-shrink-0 mt-0.5">
                        <HelpCircle size={12} />
                      </div>
                      <div>
                        <span className="font-semibold text-text-primary">What it is: </span>
                        <span className="text-text-secondary leading-relaxed">{field.whatItIs}</span>
                      </div>
                    </div>

                    {/* 2. Where to find it */}
                    <div className="flex items-start gap-2">
                      <div className="w-5 h-5 rounded-md bg-[#00CEC9]/15 text-[#00CEC9] flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Search size={12} />
                      </div>
                      <div>
                        <span className="font-semibold text-text-primary">Where to find it: </span>
                        <span className="text-text-secondary leading-relaxed">{field.whereToFindIt}</span>
                      </div>
                    </div>

                    {/* 3. Why CuraSync collects it */}
                    <div className="flex items-start gap-2">
                      <div className="w-5 h-5 rounded-md bg-[#00B894]/15 text-[#00B894] flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Activity size={12} />
                      </div>
                      <div>
                        <span className="font-semibold text-text-primary">Why CuraSync collects it: </span>
                        <span className="text-text-secondary leading-relaxed">{field.whyCuraSyncCollectsIt}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Progress indicator */}
        <div className="flex items-center justify-between mb-4 text-xs">
          <span className="text-text-secondary font-medium">
            {filled} of {BASELINE_FIELDS.length} optional metrics provided
          </span>
          <div className="flex items-center gap-2">
            <div className="w-24 h-1.5 bg-divider rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-accent-violet transition-all duration-500"
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="text-text-tertiary font-semibold">{pct}%</span>
          </div>
        </div>

        {/* Navigation Buttons */}
        <div className="flex gap-3">
          <Link
            href="/onboarding"
            className="flex items-center gap-2 px-5 py-3 rounded-xl border border-divider font-semibold text-sm text-text-secondary hover:bg-bg-lavender transition-all"
          >
            <ArrowLeft size={16} aria-hidden="true" />
            Back
          </Link>
          <button
            type="button"
            onClick={handleContinue}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl gradient-violet text-white font-semibold text-sm hover:opacity-95 transition-all shadow-md active:scale-[0.99]"
          >
            <span>Continue</span>
            <ArrowRight size={16} aria-hidden="true" />
          </button>
        </div>

        <button
          type="button"
          onClick={handleSkip}
          className="block w-full text-center text-xs font-medium text-text-tertiary mt-3 hover:text-text-secondary transition-colors py-1"
        >
          Skip for now — I&apos;ll enter these measurements later
        </button>
      </div>
    </div>
  );
}
