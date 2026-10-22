"use client";

import React, { useState, useEffect, useRef } from "react";
import { X, Check, Loader2, Calendar, FileText, Info, HelpCircle } from "lucide-react";
import { clsx } from "clsx";
import type { BiometricType } from "@/types";
import { postReading } from "@/hooks/useApi";

interface LogReadingModalProps {
  open: boolean;
  onClose: () => void;
  onSaved?: (type: BiometricType, value: number) => void;
}

interface ReadingHelper {
  what: string;
  target: string;
  where: string;
  why: string;
}

interface ReadingConfig {
  id: string;
  type: BiometricType;
  label: string;
  shortLabel: string;
  icon: string;
  unit: string;
  placeholder: string;
  min: number;
  max: number;
  step?: string;
  color: string;
  bg: string;
  defaultContextTag?: string;
  helper: ReadingHelper;
}

const READING_TYPES: ReadingConfig[] = [
  {
    id: "bp",
    type: "blood_pressure_systolic",
    label: "Blood Pressure",
    shortLabel: "Blood Pressure",
    icon: "💉",
    unit: "mmHg",
    placeholder: "120",
    min: 60,
    max: 250,
    color: "#E84393",
    bg: "#FDF2F8",
    helper: {
      what: "Systolic (top number) measures arterial pressure when the heart beats; Diastolic (bottom number) measures resting arterial pressure between beats.",
      target: "Normal clinical target: < 120/80 mmHg (Elevated: 120–129/<80, Stage 1: 130–139/80–89).",
      where: "Found on digital blood pressure arm cuff displays or clinical consultation records.",
      why: "Essential for calibrating hypertension severity, vascular load, and cardiovascular risk scores.",
    },
  },
  {
    id: "hba1c",
    type: "hba1c",
    label: "HbA1c (Glycated Hemoglobin)",
    shortLabel: "HbA1c (%)",
    icon: "🧪",
    unit: "%",
    placeholder: "6.5",
    min: 3.5,
    max: 18.0,
    step: "0.1",
    color: "#6C5CE7",
    bg: "#F0EFF8",
    helper: {
      what: "Measures glycated hemoglobin to determine your average circulating blood glucose level over the preceding 2–3 months.",
      target: "Normal: < 5.7% | Prediabetes: 5.7%–6.4% | Diabetes target: < 7.0% (individualized clinical goal).",
      where: "Found on standard glycated hemoglobin blood lab reports from pathology centers.",
      why: "Gold standard diagnostic biomarker for evaluating chronic glycemic stability and microvascular risk.",
    },
  },
  {
    id: "fasting_glucose",
    type: "blood_glucose",
    label: "Fasting Blood Glucose",
    shortLabel: "Fasting Glucose",
    icon: "🩸",
    unit: "mg/dL",
    placeholder: "95",
    min: 20,
    max: 600,
    color: "#00CEC9",
    bg: "#E6FAF9",
    defaultContextTag: "Fasting",
    helper: {
      what: "Circulating blood sugar concentration evaluated following at least 8 to 10 hours of overnight fasting.",
      target: "Normal: 70–99 mg/dL | Impaired fasting: 100–125 mg/dL | Diabetes threshold: ≥ 126 mg/dL.",
      where: "Morning finger-prick glucometer reading or hospital fasting metabolic lab report.",
      why: "Evaluates basal hepatic glucose output and overnight insulin sensitivity.",
    },
  },
  {
    id: "postprandial_glucose",
    type: "blood_glucose",
    label: "Post-prandial Glucose",
    shortLabel: "Post-prandial",
    icon: "🍽️",
    unit: "mg/dL",
    placeholder: "135",
    min: 20,
    max: 600,
    color: "#0984E3",
    bg: "#EDF7FE",
    defaultContextTag: "Post-meal",
    helper: {
      what: "Blood glucose concentration evaluated precisely 1.5 to 2 hours after beginning a meal.",
      target: "Normal clinical target: < 140 mg/dL | Pre-diabetes: 140–199 mg/dL | Diabetes threshold: ≥ 200 mg/dL.",
      where: "Glucometer test taken 2 hours after your primary meal or post-meal oral glucose lab test.",
      why: "Measures acute prandial insulin secretion response and guards against dangerous post-meal spikes.",
    },
  },
  {
    id: "heart_rate",
    type: "heart_rate",
    label: "Resting Heart Rate",
    shortLabel: "Heart Rate",
    icon: "❤️",
    unit: "bpm",
    placeholder: "72",
    min: 35,
    max: 220,
    color: "#D63031",
    bg: "#FDECEA",
    defaultContextTag: "Resting",
    helper: {
      what: "Number of myocardial contractions per minute while seated and completely at rest.",
      target: "Normal adult resting range: 60–100 beats per minute (athletic baseline: 40–60 bpm).",
      where: "Smartwatch (Apple Watch, Fitbit, Garmin), pulse oximeter, or radial pulse manual count.",
      why: "Monitors autonomic tone, flags acute bradycardia or tachycardia, and informs beta-blocker dosing.",
    },
  },
];

const SECONDARY_TYPES: ReadingConfig[] = [
  {
    id: "weight",
    type: "weight",
    label: "Body Weight",
    shortLabel: "Weight",
    icon: "⚖️",
    unit: "kg",
    placeholder: "74.5",
    min: 20,
    max: 300,
    step: "0.1",
    color: "#A29BFE",
    bg: "#F4F3FB",
    helper: {
      what: "Total body mass measurement.",
      target: "Target BMI 18.5–24.9 kg/m² depending on individual clinical guidance.",
      where: "Digital bathroom scale or clinic weigh-in.",
      why: "Detects rapid fluid retention in CHF or gradual weight changes affecting metabolic resistance.",
    },
  },
  {
    id: "body_temp",
    type: "body_temp",
    label: "Body Temperature",
    shortLabel: "Temperature",
    icon: "🌡️",
    unit: "°C",
    placeholder: "36.8",
    min: 34,
    max: 42,
    step: "0.1",
    color: "#FDCB6E",
    bg: "#FEF9E7",
    helper: {
      what: "Core body temperature.",
      target: "Normal physiological range: 36.1°C – 37.2°C (97°F – 99°F).",
      where: "Oral or infrared digital thermometer.",
      why: "Identifies systemic infections, febrile responses, and inflammatory exacerbations.",
    },
  },
];

const CONTEXT_TAGS = [
  "Fasting",
  "Post-meal",
  "Lab Report",
  "Resting",
  "Morning",
  "Evening",
  "Before Medication",
  "After Medication",
];

function getLocalDateTimeString(): string {
  const now = new Date();
  const tzOffset = now.getTimezoneOffset() * 60000;
  const localTime = new Date(now.getTime() - tzOffset);
  return localTime.toISOString().slice(0, 16);
}

export default function LogReadingModal({ open, onClose, onSaved }: LogReadingModalProps) {
  const [selected, setSelected] = useState<ReadingConfig>(READING_TYPES[0]!);
  const [showSecondary, setShowSecondary] = useState(false);
  const [value, setValue] = useState("");
  const [diastolic, setDiastolic] = useState(""); // only for BP
  const [recordedAt, setRecordedAt] = useState(getLocalDateTimeString());
  const [contextTag, setContextTag] = useState<string>("Fasting");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Initialize modal state on open
  useEffect(() => {
    if (open) {
      setValue("");
      setDiastolic("");
      setNotes("");
      setError(null);
      setSaved(false);
      setRecordedAt(getLocalDateTimeString());
      setContextTag(selected.defaultContextTag || "");
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [open, selected]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const handleSelectMetric = (rt: ReadingConfig) => {
    setSelected(rt);
    setValue("");
    setDiastolic("");
    setError(null);
    setContextTag(rt.defaultContextTag || "");
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const handleSave = async () => {
    const numVal = parseFloat(value);
    if (isNaN(numVal) || numVal < selected.min || numVal > selected.max) {
      setError(`Please enter a valid value between ${selected.min} and ${selected.max} ${selected.unit}`);
      return;
    }

    let diastolicVal: number | undefined;
    if (selected.id === "bp") {
      diastolicVal = parseFloat(diastolic);
      if (isNaN(diastolicVal) || diastolicVal < 40 || diastolicVal > 150) {
        setError("Please enter a valid diastolic value between 40 and 150 mmHg");
        return;
      }
    }

    setError(null);
    setSaving(true);

    const contextPrefix = selected.id === "fasting_glucose" ? "Fasting" : selected.id === "postprandial_glucose" ? "Post-prandial" : contextTag;
    const noteParts = [contextPrefix, notes].filter(Boolean);
    const combinedNotes = noteParts.join(" — ");

    let recordTimestamp: string;
    try {
      recordTimestamp = new Date(recordedAt).toISOString();
    } catch {
      recordTimestamp = new Date().toISOString();
    }

    const result = await postReading({
      type: selected.type,
      value: numVal,
      unit: selected.unit,
      source: "manual",
      recordedAt: recordTimestamp,
      notes: combinedNotes || undefined,
    });

    if (result.success && diastolicVal !== undefined) {
      await postReading({
        type: "blood_pressure_diastolic",
        value: diastolicVal,
        unit: selected.unit,
        source: "manual",
        recordedAt: recordTimestamp,
        notes: combinedNotes ? `${combinedNotes} (diastolic)` : undefined,
      });
    }

    setSaving(false);
    if (result.success) {
      setSaved(true);
      onSaved?.(selected.type, numVal);
      setTimeout(() => {
        onClose();
        setSaved(false);
      }, 1200);
    } else {
      setError(result.error ?? "Failed to save reading. Please try again.");
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-0 sm:px-4"
      style={{ background: "rgba(10, 10, 15, 0.65)", backdropFilter: "blur(6px)" }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Log vitals or add lab result"
    >
      <div className="w-full sm:max-w-xl bg-bg-card rounded-t-2xl sm:rounded-2xl shadow-2xl border border-divider overflow-hidden animate-slide-up flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-divider flex-shrink-0">
          <div>
            <h2 className="font-bold text-title-md text-text-primary flex items-center gap-2">
              <span>Log Vitals / Add Lab Result</span>
            </h2>
            <p className="text-xs text-text-tertiary mt-0.5">
              Record biometric observations and laboratory reports
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-bg-light flex items-center justify-center text-text-tertiary hover:text-text-primary transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <div className="px-5 py-4 space-y-5 overflow-y-auto flex-1">
          {/* 1. Metric Selector */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-label-sm font-semibold text-text-secondary">
                Select Metric / Test
              </label>
              <button
                type="button"
                onClick={() => setShowSecondary((prev) => !prev)}
                className="text-xs text-accent-violet hover:underline font-medium cursor-pointer"
              >
                {showSecondary ? "Fewer metrics" : "+ More metrics (Weight/Temp)"}
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {READING_TYPES.map((rt) => {
                const isSelected = selected.id === rt.id;
                return (
                  <button
                    key={rt.id}
                    type="button"
                    onClick={() => handleSelectMetric(rt)}
                    className={clsx(
                      "flex items-center gap-2.5 p-2.5 rounded-xl border-2 text-left transition-all cursor-pointer",
                      isSelected
                        ? "border-accent-violet shadow-xs"
                        : "border-divider bg-bg-light/60 hover:border-accent-lavender"
                    )}
                    style={isSelected ? { background: rt.bg } : undefined}
                    aria-pressed={isSelected}
                  >
                    <span className="text-xl flex-shrink-0" aria-hidden="true">
                      {rt.icon}
                    </span>
                    <div className="min-w-0">
                      <p
                        className="text-xs font-bold truncate leading-tight"
                        style={{ color: isSelected ? rt.color : "var(--text-primary)" }}
                      >
                        {rt.shortLabel}
                      </p>
                      <p className="text-[10px] text-text-tertiary truncate">{rt.unit}</p>
                    </div>
                  </button>
                );
              })}

              {showSecondary &&
                SECONDARY_TYPES.map((rt) => {
                  const isSelected = selected.id === rt.id;
                  return (
                    <button
                      key={rt.id}
                      type="button"
                      onClick={() => handleSelectMetric(rt)}
                      className={clsx(
                        "flex items-center gap-2.5 p-2.5 rounded-xl border-2 text-left transition-all cursor-pointer",
                        isSelected
                          ? "border-accent-violet shadow-xs"
                          : "border-divider bg-bg-light/60 hover:border-accent-lavender"
                      )}
                      style={isSelected ? { background: rt.bg } : undefined}
                      aria-pressed={isSelected}
                    >
                      <span className="text-xl flex-shrink-0" aria-hidden="true">
                        {rt.icon}
                      </span>
                      <div className="min-w-0">
                        <p
                          className="text-xs font-bold truncate leading-tight"
                          style={{ color: isSelected ? rt.color : "var(--text-primary)" }}
                        >
                          {rt.shortLabel}
                        </p>
                        <p className="text-[10px] text-text-tertiary truncate">{rt.unit}</p>
                      </div>
                    </button>
                  );
                })}
            </div>
          </div>

          {/* 2. Value Input */}
          <div>
            <label className="block text-label-sm font-semibold text-text-secondary mb-2">
              {selected.label} Value
            </label>

            {selected.id === "bp" ? (
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="flex-1 relative">
                    <input
                      ref={inputRef}
                      type="number"
                      inputMode="numeric"
                      value={value}
                      onChange={(e) => {
                        setValue(e.target.value);
                        setError(null);
                      }}
                      placeholder="Systolic (120)"
                      className="w-full px-4 py-3 rounded-xl border border-divider bg-bg-light text-xl font-bold text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-lavender/40 focus:border-accent-violet metric-value"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-text-tertiary font-medium">
                      sys
                    </span>
                  </div>
                  <span className="text-2xl font-bold text-text-tertiary">/</span>
                  <div className="flex-1 relative">
                    <input
                      type="number"
                      inputMode="numeric"
                      value={diastolic}
                      onChange={(e) => {
                        setDiastolic(e.target.value);
                        setError(null);
                      }}
                      placeholder="Diastolic (80)"
                      className="w-full px-4 py-3 rounded-xl border border-divider bg-bg-light text-xl font-bold text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-lavender/40 focus:border-accent-violet metric-value"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-text-tertiary font-medium">
                      dia
                    </span>
                  </div>
                </div>
                <p className="text-xs text-text-tertiary">Unit: mmHg (Systolic / Diastolic)</p>
              </div>
            ) : (
              <div className="relative">
                <input
                  ref={inputRef}
                  type="number"
                  inputMode="decimal"
                  step={selected.step || "any"}
                  value={value}
                  onChange={(e) => {
                    setValue(e.target.value);
                    setError(null);
                  }}
                  placeholder={selected.placeholder}
                  className="w-full px-4 py-3 rounded-xl border border-divider bg-bg-light text-2xl font-bold text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-lavender/40 focus:border-accent-violet metric-value pr-20"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-text-tertiary font-medium">
                  {selected.unit}
                </span>
              </div>
            )}

            {error && <p className="text-xs text-status-red mt-1.5 font-medium">{error}</p>}
          </div>

          {/* 3. Contextual Helper Box */}
          <div className="rounded-xl border border-divider bg-bg-light/80 p-3.5 space-y-2 text-xs text-text-secondary animate-fade-in">
            <div className="flex items-center gap-1.5 font-semibold text-text-primary">
              <Info size={14} className="text-accent-violet shrink-0" />
              <span>Clinical Guidance: {selected.label}</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1 border-t border-divider/60">
              <div className="space-y-0.5">
                <span className="font-bold text-text-primary block text-[11px] uppercase tracking-wider text-accent-violet">
                  What it is & Targets
                </span>
                <p className="text-text-secondary leading-relaxed">{selected.helper.what}</p>
                <p className="font-medium text-emerald-700 dark:text-emerald-400 mt-1">
                  {selected.helper.target}
                </p>
              </div>

              <div className="space-y-0.5">
                <span className="font-bold text-text-primary block text-[11px] uppercase tracking-wider text-accent-violet">
                  Where to find it
                </span>
                <p className="text-text-secondary leading-relaxed">{selected.helper.where}</p>
              </div>

              <div className="space-y-0.5">
                <span className="font-bold text-text-primary block text-[11px] uppercase tracking-wider text-accent-violet">
                  Why it matters
                </span>
                <p className="text-text-secondary leading-relaxed">{selected.helper.why}</p>
              </div>
            </div>
          </div>

          {/* 4. Timestamp Input (Supports Backdating) */}
          <div>
            <label className="block text-label-sm font-semibold text-text-secondary mb-1.5">
              Measurement / Test Date & Time
            </label>
            <div className="relative">
              <input
                type="datetime-local"
                value={recordedAt}
                onChange={(e) => setRecordedAt(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-divider bg-bg-light text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-lavender/40 focus:border-accent-violet"
              />
            </div>
            <p className="text-[11px] text-text-tertiary mt-1">
              Defaults to current time. You can backdate to record past laboratory tests or reports.
            </p>
          </div>

          {/* 5. Notes Field */}
          <div>
            <label className="block text-label-sm font-semibold text-text-secondary mb-1.5">
              Notes (Optional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Metropolis Lab fasting report"
              maxLength={200}
              className="w-full px-3 py-2.5 rounded-xl border border-divider bg-bg-light text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-lavender/40 focus:border-accent-violet"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 pb-5 pt-3 border-t border-divider flex-shrink-0 bg-bg-card">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || saved || !value.trim()}
            className={clsx(
              "w-full py-3.5 rounded-xl font-bold text-base flex items-center justify-center gap-2 transition-all cursor-pointer shadow-card",
              saved
                ? "bg-status-green text-white"
                : "gradient-violet text-white hover:opacity-95 disabled:opacity-40 disabled:cursor-not-allowed"
            )}
          >
            {saved ? (
              <>
                <Check size={18} aria-hidden="true" />
                <span>Reading Saved Successfully!</span>
              </>
            ) : saving ? (
              <>
                <Loader2 size={18} className="animate-spin" aria-hidden="true" />
                <span>Saving to Health Records…</span>
              </>
            ) : (
              <span>Save {selected.shortLabel}</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
