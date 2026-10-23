"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { X, Check, Loader2, Info } from "lucide-react";
import { clsx } from "clsx";
import type { BiometricType } from "@/types";
import { postReading } from "@/hooks/useApi";
import { useAuth } from "@/context/AuthContext";
import { getSupabaseBrowserClient } from "@/lib/supabase";

interface LogReadingModalProps {
  open: boolean;
  onClose: () => void;
  onSaved?: (type: BiometricType, value: number) => void;
  patientConditions?: string[];
  initialMetricId?: string;
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

// ─── A. ALWAYS-VISIBLE BASELINE VITALS ─────────────────────────────────────────

const BASELINE_METRICS: ReadingConfig[] = [
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
    id: "heart_rate",
    type: "heart_rate",
    label: "Resting Heart Rate",
    shortLabel: "Heart Rate",
    icon: "❤️",
    unit: "bpm",
    placeholder: "72",
    min: 30,
    max: 250,
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

const SECONDARY_METRICS: ReadingConfig[] = [
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
    shortLabel: "Body Temperature",
    icon: "🌡️",
    unit: "°C",
    placeholder: "36.8",
    min: 30,
    max: 45,
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

// ─── B. CONDITION-SPECIFIC METRICS ───────────────────────────────────────────

const DIABETES_METRICS: ReadingConfig[] = [
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
];

const CKD_METRICS: ReadingConfig[] = [
  {
    id: "egfr",
    type: "egfr",
    label: "Estimated Glomerular Filtration Rate",
    shortLabel: "eGFR",
    icon: "🫘",
    unit: "mL/min/1.73m²",
    placeholder: "85",
    min: 5,
    max: 160,
    step: "1",
    color: "#00B894",
    bg: "#E8F8F5",
    helper: {
      what: "Estimates how efficiently your kidneys filter metabolic waste from circulating blood.",
      target: "Normal: ≥ 90 mL/min/1.73m² | Mild reduction: 60–89 | Kidney disease: < 60.",
      where: "Found in Comprehensive Metabolic Panel (CMP) or Renal Function lab reports.",
      why: "Primary clinical indicator for staging CKD progression and guiding medication dosing.",
    },
  },
  {
    id: "creatinine",
    type: "creatinine",
    label: "Serum Creatinine",
    shortLabel: "Creatinine",
    icon: "🧪",
    unit: "mg/dL",
    placeholder: "1.05",
    min: 0.1,
    max: 20.0,
    step: "0.01",
    color: "#E17055",
    bg: "#FDF0ED",
    helper: {
      what: "Waste product from muscle metabolism filtered out almost entirely by healthy kidneys.",
      target: "Typical adult baseline: 0.6–1.3 mg/dL.",
      where: "Renal profile, metabolic lab panel, or kidney blood test report.",
      why: "Rising serum creatinine signals impaired glomerular clearance capacity.",
    },
  },
  {
    id: "bun",
    type: "bun",
    label: "Blood Urea Nitrogen (BUN)",
    shortLabel: "BUN",
    icon: "🔬",
    unit: "mg/dL",
    placeholder: "16",
    min: 1,
    max: 150,
    step: "1",
    color: "#F39C12",
    bg: "#FEF9E7",
    helper: {
      what: "Measures the amount of urea nitrogen in blood, a byproduct of hepatic protein breakdown.",
      target: "Standard adult reference range: 7–20 mg/dL.",
      where: "Basic Metabolic Panel (BMP) or renal function panel blood work.",
      why: "Evaluates renal filtration and hydration balance; paired with creatinine for the BUN/Cr ratio.",
    },
  },
];

const HYPOTHYROIDISM_METRICS: ReadingConfig[] = [
  {
    id: "tsh",
    type: "tsh",
    label: "Thyroid Stimulating Hormone (TSH)",
    shortLabel: "TSH",
    icon: "🦋",
    unit: "mIU/L",
    placeholder: "2.10",
    min: 0.01,
    max: 50.0,
    step: "0.01",
    color: "#6C5CE7",
    bg: "#F0EFF8",
    helper: {
      what: "Pituitary hormone that stimulates the thyroid gland to produce metabolic hormones.",
      target: "Standard therapeutic target: 0.45–4.5 mIU/L.",
      where: "Thyroid panel (TSH) laboratory blood test report.",
      why: "Primary diagnostic biomarker for thyroid status and levothyroxine dose titration.",
    },
  },
  {
    id: "free_t4",
    type: "free_t4",
    label: "Free Thyroxine (Free T4)",
    shortLabel: "Free T4",
    icon: "🧪",
    unit: "ng/dL",
    placeholder: "1.25",
    min: 0.1,
    max: 10.0,
    step: "0.01",
    color: "#0984E3",
    bg: "#EDF7FE",
    helper: {
      what: "Active unbound thyroxine circulating in blood available to bodily tissues.",
      target: "Standard adult reference range: 0.8–1.8 ng/dL.",
      where: "Comprehensive thyroid function lab report.",
      why: "Assesses true functional thyroid hormone availability alongside TSH.",
    },
  },
  {
    id: "free_t3",
    type: "free_t3",
    label: "Free Triiodothyronine (Free T3)",
    shortLabel: "Free T3",
    icon: "🔬",
    unit: "pg/mL",
    placeholder: "3.2",
    min: 0.5,
    max: 20.0,
    step: "0.1",
    color: "#00CEC9",
    bg: "#E6FAF9",
    helper: {
      what: "Biologically most active thyroid hormone converted from circulating T4.",
      target: "Standard adult reference range: 2.3–4.2 pg/mL.",
      where: "Extended thyroid laboratory panel.",
      why: "Evaluates peripheral T4-to-T3 conversion efficiency and persistent hypothyroid fatigue.",
    },
  },
  {
    id: "levothyroxine_dose",
    type: "levothyroxine_dose",
    label: "Levothyroxine Daily Dose",
    shortLabel: "Levothyroxine dose",
    icon: "💊",
    unit: "mcg",
    placeholder: "75",
    min: 10,
    max: 500,
    step: "12.5",
    color: "#27AE60",
    bg: "#EAF9F1",
    helper: {
      what: "Current daily prescription strength of synthetic thyroid replacement hormone.",
      target: "Individualized clinical prescription (e.g., 50–150 mcg once daily on empty stomach).",
      where: "Prescription medication bottle label.",
      why: "Allows correlation between dosage adjustments and subsequent TSH/T4 lab stabilization.",
    },
  },
];

const RA_METRICS: ReadingConfig[] = [
  {
    id: "crp",
    type: "crp",
    label: "C-Reactive Protein (CRP)",
    shortLabel: "CRP",
    icon: "🔥",
    unit: "mg/L",
    placeholder: "3.2",
    min: 0.1,
    max: 200,
    step: "0.1",
    color: "#E84393",
    bg: "#FDF2F8",
    helper: {
      what: "Acute phase inflammatory protein synthesized by hepatic tissue.",
      target: "Normal: < 3.0 mg/L | Active rheumatoid flare threshold: > 10.0 mg/L.",
      where: "Inflammatory blood panel (High Sensitivity CRP) laboratory report.",
      why: "Directly quantifies systemic inflammation and clinical response to DMARD/biologic therapies.",
    },
  },
  {
    id: "esr",
    type: "esr",
    label: "Erythrocyte Sedimentation Rate (ESR)",
    shortLabel: "ESR",
    icon: "🩸",
    unit: "mm/hr",
    placeholder: "18",
    min: 1,
    max: 150,
    step: "1",
    color: "#D63031",
    bg: "#FDECEA",
    helper: {
      what: "Rate at which red blood cells sediment in anticoagulated blood over 1 hour.",
      target: "Standard adult reference range: < 20 mm/hr (slight variation by age & sex).",
      where: "Complete blood count with Sed Rate / ESR lab test.",
      why: "Monitors chronic underlying autoimmune inflammatory activity.",
    },
  },
  {
    id: "pain_scale",
    type: "pain_scale",
    label: "Joint Pain Scale Rating",
    shortLabel: "Pain scale",
    icon: "⚡",
    unit: "/10",
    placeholder: "4",
    min: 0,
    max: 10,
    step: "1",
    color: "#E17055",
    bg: "#FDF0ED",
    helper: {
      what: "Self-reported joint and systemic musculoskeletal pain intensity on a 0 to 10 visual scale.",
      target: "Target in remission/control: ≤ 2/10 (Mild or manageable discomfort).",
      where: "Daily patient-reported visual analog scale.",
      why: "Used to compute rolling disease burden averages and DAS28 activity scores.",
    },
  },
  {
    id: "morning_stiffness",
    type: "morning_stiffness",
    label: "Morning Stiffness Duration",
    shortLabel: "Morning stiffness",
    icon: "⏱️",
    unit: "min",
    placeholder: "45",
    min: 0,
    max: 360,
    step: "5",
    color: "#F39C12",
    bg: "#FEF9E7",
    helper: {
      what: "Duration upon awakening until joint stiffness reaches maximal improvement.",
      target: "Target in remission: < 15–30 minutes.",
      where: "Self-timed morning joint sensation.",
      why: "Hallmark clinical symptom distinguishing inflammatory arthritis from mechanical osteoarthritis.",
    },
  },
];

const ASTHMA_METRICS: ReadingConfig[] = [
  {
    id: "asthma_control",
    type: "asthma_control",
    label: "Asthma Control Test Score",
    shortLabel: "Control test score",
    icon: "🫁",
    unit: "/25",
    placeholder: "22",
    min: 0,
    max: 25,
    step: "1",
    color: "#00CEC9",
    bg: "#E6FAF9",
    helper: {
      what: "Standardized 5-item questionnaire score assessing asthma symptom control over the preceding 4 weeks.",
      target: "Well-controlled: 20–25 | Not well controlled: 16–19 | Poorly controlled: ≤ 15.",
      where: "Validated Asthma Control Test (ACT) self-assessment.",
      why: "Core clinical guideline for determining whether preventer inhaler therapy should be stepped up or down.",
    },
  },
  {
    id: "rescue_inhaler_use",
    type: "rescue_inhaler_use",
    label: "Rescue Inhaler Use",
    shortLabel: "Rescue inhaler use",
    icon: "💨",
    unit: "/week",
    placeholder: "1",
    min: 0,
    max: 50,
    step: "1",
    color: "#0984E3",
    bg: "#EDF7FE",
    helper: {
      what: "Number of times a short-acting bronchodilator (e.g., Albuterol / Salbutamol) was required in the past week.",
      target: "Well-controlled asthma guideline: ≤ 2 times per week.",
      where: "Patient-logged rescue inhaler actuations.",
      why: "Frequent rescue reliance signals unaddressed underlying bronchial inflammation.",
    },
  },
  {
    id: "trigger_events",
    type: "trigger_events",
    label: "Trigger Events Count",
    shortLabel: "Trigger events",
    icon: "⚠️",
    unit: "this week",
    placeholder: "0",
    min: 0,
    max: 50,
    step: "1",
    color: "#D63031",
    bg: "#FDECEA",
    helper: {
      what: "Number of acute environmental or exertion exposures (cold air, allergens, exercise, smoke) provoking bronchospasm.",
      target: "Clinical objective: 0 to minimal weekly triggers.",
      where: "Personal symptom and exposure diary.",
      why: "Identifies avoidance needs and informs pre-exercise bronchodilator prophylaxis.",
    },
  },
];

function getLocalDateTimeString(): string {
  const now = new Date();
  const tzOffset = now.getTimezoneOffset() * 60000;
  const localTime = new Date(now.getTime() - tzOffset);
  return localTime.toISOString().slice(0, 16);
}

export default function LogReadingModal({
  open,
  onClose,
  onSaved,
  patientConditions,
  initialMetricId,
}: LogReadingModalProps) {
  const { user, profile } = useAuth();

  // Combine conditions from prop or active profile
  const activeConditions = useMemo<string[]>(() => {
    if (patientConditions && patientConditions.length > 0) return patientConditions;
    if (profile?.conditions && Array.isArray(profile.conditions)) return profile.conditions;
    return [];
  }, [patientConditions, profile?.conditions]);

  const isConditionActive = (condKey: string) => {
    return activeConditions.some(
      (c) => c.toLowerCase() === condKey.toLowerCase() || c.toLowerCase().includes(condKey.toLowerCase())
    );
  };

  // Build condition-specific metric pills dynamically based on actively added conditions
  const dynamicConditionMetrics = useMemo<ReadingConfig[]>(() => {
    const list: ReadingConfig[] = [];
    if (isConditionActive("diabetes")) {
      list.push(...DIABETES_METRICS);
    }
    if (isConditionActive("ckd") || isConditionActive("kidney")) {
      list.push(...CKD_METRICS);
    }
    if (isConditionActive("hypothyroidism") || isConditionActive("thyroid")) {
      list.push(...HYPOTHYROIDISM_METRICS);
    }
    if (isConditionActive("ra") || isConditionActive("arthritis")) {
      list.push(...RA_METRICS);
    }
    if (isConditionActive("asthma")) {
      list.push(...ASTHMA_METRICS);
    }
    return list;
  }, [activeConditions]);

  const visibleMetrics = useMemo(() => {
    return [...BASELINE_METRICS, ...dynamicConditionMetrics];
  }, [dynamicConditionMetrics]);

  const allAvailableMetrics = useMemo(() => {
    return [...BASELINE_METRICS, ...dynamicConditionMetrics, ...SECONDARY_METRICS];
  }, [dynamicConditionMetrics]);

  const [selected, setSelected] = useState<ReadingConfig>(() => {
    if (initialMetricId) {
      const match = allAvailableMetrics.find((m) => m.id === initialMetricId || m.type === initialMetricId);
      if (match) return match;
    }
    return visibleMetrics[0] || BASELINE_METRICS[0]!;
  });

  const [showSecondary, setShowSecondary] = useState(false);
  const [value, setValue] = useState("");
  const [diastolic, setDiastolic] = useState(""); // only for BP
  const [recordedAt, setRecordedAt] = useState(getLocalDateTimeString());
  const [contextTag, setContextTag] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Initialize or re-sync modal state on open or when initialMetricId changes
  useEffect(() => {
    if (open) {
      setValue("");
      setDiastolic("");
      setNotes("");
      setError(null);
      setSaved(false);
      setRecordedAt(getLocalDateTimeString());

      if (initialMetricId) {
        const match = allAvailableMetrics.find((m) => m.id === initialMetricId || m.type === initialMetricId);
        if (match) {
          setSelected(match);
          setContextTag(match.defaultContextTag || "");
          setTimeout(() => inputRef.current?.focus(), 150);
          return;
        }
      }

      // If current selected is no longer in visible, reset to first
      if (!allAvailableMetrics.some((m) => m.id === selected.id)) {
        const next = visibleMetrics[0] || BASELINE_METRICS[0]!;
        setSelected(next);
        setContextTag(next.defaultContextTag || "");
      } else {
        setContextTag(selected.defaultContextTag || "");
      }

      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [open, initialMetricId, allAvailableMetrics, visibleMetrics]);

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

    const contextPrefix =
      selected.id === "fasting_glucose"
        ? "Fasting"
        : selected.id === "postprandial_glucose"
        ? "Post-prandial"
        : contextTag;
    const noteParts = [contextPrefix, notes].filter(Boolean);
    const combinedNotes = noteParts.join(" — ");

    let recordTimestamp: string;
    try {
      recordTimestamp = new Date(recordedAt).toISOString();
    } catch {
      recordTimestamp = new Date().toISOString();
    }

    const patientId = user?.uid || profile?.id;

    // 1. Persist directly into Supabase public.vitals table with patient_id = firebase_uid
    let supabaseInsertSucceeded = false;
    if (patientId) {
      try {
        const supabase = getSupabaseBrowserClient();
        const { error: insertErr } = await supabase.from("vitals").insert({
          user_id: patientId,
          patient_id: patientId,
          type: selected.type,
          value: numVal,
          unit: selected.unit,
          source: "manual",
          recorded_at: recordTimestamp,
          notes: combinedNotes || null,
        });

        if (insertErr) {
          console.error("[LogReadingModal] Supabase vitals insert error:", insertErr.message || insertErr);
        } else {
          supabaseInsertSucceeded = true;
        }

        if (diastolicVal !== undefined) {
          const { error: diaErr } = await supabase.from("vitals").insert({
            user_id: patientId,
            patient_id: patientId,
            type: "blood_pressure_diastolic",
            value: diastolicVal,
            unit: selected.unit,
            source: "manual",
            recorded_at: recordTimestamp,
            notes: combinedNotes ? `${combinedNotes} (diastolic)` : null,
          });
          if (diaErr) {
            console.warn("[LogReadingModal] Supabase diastolic insert error:", diaErr.message || diaErr);
          }
        }
      } catch (sbEx) {
        console.warn("[LogReadingModal] Direct Supabase insert warning:", sbEx);
      }
    }

    // 2. Dispatch to /api/v1/readings for server-side alert evaluation, glucoseReadings sync, and SWR revalidation
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
    if (result.success || supabaseInsertSucceeded) {
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
          {/* 1. Dynamic Metric Selector */}
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
              {visibleMetrics.map((rt) => {
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
                SECONDARY_METRICS.map((rt) => {
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
                  min={selected.min}
                  max={selected.max}
                  value={value}
                  onChange={(e) => {
                    setValue(e.target.value);
                    setError(null);
                  }}
                  placeholder={selected.placeholder}
                  className="w-full px-4 py-3 rounded-xl border border-divider bg-bg-light text-2xl font-bold text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-lavender/40 focus:border-accent-violet metric-value pr-24"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-text-tertiary font-medium">
                  {selected.unit}
                </span>
              </div>
            )}

            {error && <p className="text-xs text-status-red mt-1.5 font-medium">{error}</p>}
          </div>

          {/* 3. Clinical Guidance Helper Box */}
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
              placeholder="e.g. Fasting lab panel, morning assessment"
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
