"use client";

import React, { useState } from "react";
import { Sliders, RotateCcw, Save, Info } from "lucide-react";
import { clsx } from "clsx";
import type { BiometricType } from "@/types";

interface ThresholdConfig {
  type: BiometricType;
  label: string;
  unit: string;
  icon: string;
  highThreshold: number;
  criticalThreshold: number;
  globalHigh: number;
  globalCritical: number;
  direction: "above" | "below"; // alert when reading is above or below
}

const DEFAULT_THRESHOLDS: ThresholdConfig[] = [
  {
    type: "blood_glucose", label: "Blood Glucose (High)", icon: "🩸", unit: "mg/dL",
    highThreshold: 250, criticalThreshold: 400,
    globalHigh: 250, globalCritical: 400, direction: "above",
  },
  {
    type: "blood_glucose", label: "Blood Glucose (Low)", icon: "🩸", unit: "mg/dL",
    highThreshold: 70, criticalThreshold: 54,
    globalHigh: 70, globalCritical: 54, direction: "below",
  },
  {
    type: "blood_pressure_systolic", label: "Systolic BP", icon: "💉", unit: "mmHg",
    highThreshold: 150, criticalThreshold: 180,
    globalHigh: 150, globalCritical: 180, direction: "above",
  },
  {
    type: "heart_rate", label: "Heart Rate (High)", icon: "❤️", unit: "bpm",
    highThreshold: 120, criticalThreshold: 150,
    globalHigh: 120, globalCritical: 150, direction: "above",
  },
  {
    type: "spo2", label: "SpO₂ (Low)", icon: "💨", unit: "%",
    highThreshold: 94, criticalThreshold: 90,
    globalHigh: 94, globalCritical: 90, direction: "below",
  },
];

interface Props {
  patientName?: string;
  onSave?: (thresholds: ThresholdConfig[]) => void;
}

export default function AlertThresholdCustomizer({
  patientName = "This Patient",
  onSave,
}: Props) {
  const [thresholds, setThresholds] = useState<ThresholdConfig[]>(
    DEFAULT_THRESHOLDS.map((t) => ({ ...t }))
  );
  const [saved, setSaved] = useState(false);

  const updateThreshold = (
    index: number,
    field: "highThreshold" | "criticalThreshold",
    value: number
  ) => {
    setThresholds((prev) => {
      const next = [...prev];
      const item = { ...next[index]! };
      item[field] = value;
      next[index] = item;
      return next;
    });
    setSaved(false);
  };

  const resetToGlobal = (index: number) => {
    setThresholds((prev) => {
      const next = [...prev];
      const item = { ...next[index]! };
      item.highThreshold = item.globalHigh;
      item.criticalThreshold = item.globalCritical;
      next[index] = item;
      return next;
    });
    setSaved(false);
  };

  const isModified = (t: ThresholdConfig) =>
    t.highThreshold !== t.globalHigh || t.criticalThreshold !== t.globalCritical;

  const handleSave = () => {
    onSave?.(thresholds);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const anyModified = thresholds.some(isModified);

  return (
    <div className="bg-bg-card rounded-xl shadow-card overflow-hidden">
      <div className="px-4 py-3 border-b border-divider flex items-center gap-2">
        <Sliders size={16} className="text-accent-violet" aria-hidden="true" />
        <div className="flex-1">
          <h3 className="font-semibold text-title-md text-text-primary">Alert Thresholds</h3>
          <p className="text-xs text-text-tertiary">Custom overrides for {patientName}</p>
        </div>
        {anyModified && (
          <span className="text-xs text-accent-violet font-semibold bg-bg-lavender px-2 py-0.5 rounded-full">
            Modified
          </span>
        )}
      </div>

      {/* Info banner */}
      <div className="mx-4 mt-3 mb-2 flex items-start gap-2 p-3 rounded-lg bg-bg-lavender">
        <Info size={13} className="text-accent-violet flex-shrink-0 mt-0.5" aria-hidden="true" />
        <p className="text-xs text-text-secondary leading-relaxed">
          These thresholds override the global clinical defaults for this patient only.
          Critical alerts cannot be fully suppressed — only their trigger values adjusted.
        </p>
      </div>

      <div className="px-4 pb-4 space-y-4 mt-2">
        {thresholds.map((t, i) => (
          <div
            key={`${t.type}-${t.direction}-${i}`}
            className={clsx(
              "p-3 rounded-xl border transition-all",
              isModified(t) ? "border-accent-lavender/60 bg-bg-lavender/30" : "border-divider bg-bg-light"
            )}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-base" aria-hidden="true">{t.icon}</span>
                <span className="font-semibold text-label-sm text-text-primary">{t.label}</span>
                {isModified(t) && (
                  <span className="text-xs text-accent-violet font-medium bg-bg-lavender px-1.5 py-0.5 rounded-full">
                    Custom
                  </span>
                )}
              </div>
              {isModified(t) && (
                <button
                  onClick={() => resetToGlobal(i)}
                  className="flex items-center gap-1 text-xs text-text-tertiary hover:text-text-secondary transition-colors"
                  aria-label={`Reset ${t.label} to global defaults`}
                >
                  <RotateCcw size={11} aria-hidden="true" />
                  Reset
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* High threshold */}
              <div>
                <label className="block text-xs font-semibold text-yellow-600 mb-1">
                  ⚠️ High alert
                </label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    value={t.highThreshold}
                    onChange={(e) => updateThreshold(i, "highThreshold", Number(e.target.value))}
                    className="w-full px-2.5 py-2 rounded-lg border border-divider bg-white text-sm font-bold metric-value text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-lavender/40 focus:border-accent-violet"
                    aria-label={`High threshold for ${t.label}`}
                  />
                  <span className="text-xs text-text-tertiary flex-shrink-0">{t.unit}</span>
                </div>
                <p className="text-xs text-text-tertiary mt-0.5">Default: {t.globalHigh}</p>
              </div>

              {/* Critical threshold */}
              <div>
                <label className="block text-xs font-semibold text-status-red mb-1">
                  🔴 Critical alert
                </label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    value={t.criticalThreshold}
                    onChange={(e) => updateThreshold(i, "criticalThreshold", Number(e.target.value))}
                    className="w-full px-2.5 py-2 rounded-lg border border-divider bg-white text-sm font-bold metric-value text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-lavender/40 focus:border-accent-violet"
                    aria-label={`Critical threshold for ${t.label}`}
                  />
                  <span className="text-xs text-text-tertiary flex-shrink-0">{t.unit}</span>
                </div>
                <p className="text-xs text-text-tertiary mt-0.5">Default: {t.globalCritical}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="px-4 pb-4">
        <button
          onClick={handleSave}
          className={clsx(
            "w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-label-sm transition-all",
            saved
              ? "bg-status-green text-white"
              : "gradient-violet text-white hover:opacity-90 shadow-card"
          )}
          aria-label="Save threshold customizations"
        >
          <Save size={15} aria-hidden="true" />
          {saved ? "Thresholds saved ✓" : "Save Custom Thresholds"}
        </button>
      </div>
    </div>
  );
}
