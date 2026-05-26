"use client";

import React, { useState, useEffect, useRef } from "react";
import { X, Check, ChevronDown, Loader2 } from "lucide-react";
import { clsx } from "clsx";
import type { BiometricType } from "@/types";
import { postReading } from "@/hooks/useRealTimeReadings";

interface LogReadingModalProps {
  open: boolean;
  onClose: () => void;
  onSaved?: (type: BiometricType, value: number) => void;
}

interface ReadingConfig {
  type: BiometricType;
  label: string;
  icon: string;
  unit: string;
  placeholder: string;
  min: number;
  max: number;
  color: string;
  bg: string;
}

const READING_TYPES: ReadingConfig[] = [
  { type: "blood_glucose",              label: "Blood Glucose",    icon: "🩸", unit: "mg/dL",  placeholder: "e.g. 142", min: 20,  max: 600,  color: "#00CEC9", bg: "#E6FAF9" },
  { type: "blood_pressure_systolic",    label: "Blood Pressure",   icon: "💉", unit: "mmHg",   placeholder: "systolic", min: 60,  max: 250,  color: "#E84393", bg: "#F0EFF8" },
  { type: "heart_rate",                 label: "Heart Rate",       icon: "❤️", unit: "bpm",    placeholder: "e.g. 74",  min: 30,  max: 220,  color: "#E84393", bg: "#FFF0F7" },
  { type: "spo2",                       label: "SpO₂",             icon: "💨", unit: "%",      placeholder: "e.g. 97",  min: 70,  max: 100,  color: "#74B9FF", bg: "#EBF5FB" },
  { type: "weight",                     label: "Weight",           icon: "⚖️", unit: "kg",     placeholder: "e.g. 84",  min: 20,  max: 300,  color: "#A29BFE", bg: "#F0EFF8" },
  { type: "body_temp",                  label: "Temperature",      icon: "🌡️", unit: "°C",     placeholder: "e.g. 37.2",min: 34,  max: 42,   color: "#FDCB6E", bg: "#FEF9E7" },
  { type: "peak_flow",                  label: "Peak Flow",        icon: "🫁", unit: "L/min",  placeholder: "e.g. 380", min: 60,  max: 900,  color: "#74B9FF", bg: "#EBF5FB" },
  { type: "steps",                      label: "Steps",            icon: "🚶", unit: "steps",  placeholder: "e.g. 7500",min: 0,   max: 60000, color: "#00B894", bg: "#E8F8F5" },
];

const CONTEXT_TAGS = ["Fasting", "Post-meal", "Post-exercise", "Resting", "Morning", "Evening", "Before medication", "After medication"];

export default function LogReadingModal({ open, onClose, onSaved }: LogReadingModalProps) {
  const [selected, setSelected] = useState<ReadingConfig>(READING_TYPES[0]!);
  const [value, setValue] = useState("");
  const [diastolic, setDiastolic] = useState(""); // only for BP
  const [contextTag, setContextTag] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when modal opens
  useEffect(() => {
    if (open) {
      setValue(""); setDiastolic(""); setContextTag(""); setNotes(""); setError(null); setSaved(false);
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [open]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const handleSave = async () => {
    const numVal = parseFloat(value);
    if (isNaN(numVal) || numVal < selected.min || numVal > selected.max) {
      setError(`Please enter a value between ${selected.min} and ${selected.max} ${selected.unit}`);
      return;
    }
    setError(null);
    setSaving(true);

    const noteText = [contextTag, notes].filter(Boolean).join(" — ");

    const result = await postReading({
      patientId: "pat_arjun_01",
      type: selected.type,
      value: numVal,
      unit: selected.unit,
      source: "manual",
      recordedAt: new Date().toISOString(),
      notes: noteText || undefined,
    });

    setSaving(false);
    if (result.success) {
      setSaved(true);
      onSaved?.(selected.type, numVal);
      setTimeout(() => { onClose(); setSaved(false); }, 1200);
    } else {
      setError(result.error ?? "Failed to save reading. Please try again.");
    }
  };

  if (!open) return null;

  return (
    // Backdrop
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-0 sm:px-4"
      style={{ background: "rgba(10,10,10,0.6)", backdropFilter: "blur(4px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      role="dialog"
      aria-modal="true"
      aria-label="Log a reading"
    >
      <div className="w-full sm:max-w-lg bg-bg-card rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden animate-slide-up">

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-divider">
          <div>
            <h2 className="font-bold text-title-md text-text-primary">Log a Reading</h2>
            <p className="text-xs text-text-tertiary mt-0.5">Manual entry · {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-bg-light flex items-center justify-center text-text-tertiary" aria-label="Close">
            <X size={16} />
          </button>
        </div>

        <div className="px-5 py-4 space-y-5 max-h-[80vh] overflow-y-auto">
          {/* Metric type selector */}
          <div>
            <label className="block text-label-sm font-semibold text-text-secondary mb-2">Metric type</label>
            <div className="grid grid-cols-4 gap-1.5">
              {READING_TYPES.map((rt) => (
                <button
                  key={rt.type}
                  onClick={() => { setSelected(rt); setValue(""); setError(null); }}
                  className={clsx(
                    "flex flex-col items-center gap-1 py-2.5 px-1 rounded-xl border-2 transition-all",
                    selected.type === rt.type
                      ? "border-accent-violet shadow-sm"
                      : "border-divider hover:border-accent-lavender"
                  )}
                  style={selected.type === rt.type ? { background: rt.bg } : { background: "#fff" }}
                  aria-pressed={selected.type === rt.type}
                >
                  <span className="text-lg" aria-hidden="true">{rt.icon}</span>
                  <span className="text-xs font-medium leading-tight text-center" style={{ color: selected.type === rt.type ? rt.color : "#8888A8" }}>
                    {rt.label.split(" ")[0]}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Value input */}
          <div>
            <label className="block text-label-sm font-semibold text-text-secondary mb-2">
              {selected.label} value
            </label>
            {selected.type === "blood_pressure_systolic" ? (
              <div className="flex items-center gap-2">
                <div className="flex-1 relative">
                  <input
                    ref={inputRef}
                    type="number"
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    placeholder="Systolic"
                    className="w-full px-4 py-3.5 rounded-xl border border-divider bg-bg-light text-xl font-bold text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-lavender/40 focus:border-accent-violet metric-value"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-text-tertiary">mmHg</span>
                </div>
                <span className="text-2xl font-bold text-text-tertiary">/</span>
                <div className="flex-1 relative">
                  <input
                    type="number"
                    value={diastolic}
                    onChange={(e) => setDiastolic(e.target.value)}
                    placeholder="Diastolic"
                    className="w-full px-4 py-3.5 rounded-xl border border-divider bg-bg-light text-xl font-bold text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-lavender/40 focus:border-accent-violet metric-value"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-text-tertiary">mmHg</span>
                </div>
              </div>
            ) : (
              <div className="relative">
                <input
                  ref={inputRef}
                  type="number"
                  inputMode="decimal"
                  value={value}
                  onChange={(e) => { setValue(e.target.value); setError(null); }}
                  placeholder={selected.placeholder}
                  className="w-full px-4 py-3.5 rounded-xl border border-divider bg-bg-light text-2xl font-bold text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-lavender/40 focus:border-accent-violet metric-value pr-20"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-text-tertiary font-medium">
                  {selected.unit}
                </span>
              </div>
            )}

            {error && (
              <p className="text-xs text-status-red mt-1.5 font-medium">{error}</p>
            )}

            <p className="text-xs text-text-tertiary mt-1.5">
              Normal range: {selected.min}–{selected.max} {selected.unit}
            </p>
          </div>

          {/* Context tags */}
          <div>
            <label className="block text-label-sm font-semibold text-text-secondary mb-2">Context (optional)</label>
            <div className="flex flex-wrap gap-1.5">
              {CONTEXT_TAGS.map((tag) => (
                <button
                  key={tag}
                  onClick={() => setContextTag(contextTag === tag ? "" : tag)}
                  className={clsx(
                    "px-2.5 py-1 rounded-full text-xs font-medium border transition-all",
                    contextTag === tag
                      ? "bg-accent-violet text-white border-accent-violet"
                      : "border-divider text-text-secondary hover:border-accent-lavender"
                  )}
                  aria-pressed={contextTag === tag}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-label-sm font-semibold text-text-secondary mb-2">Notes (optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any additional context…"
              rows={2}
              maxLength={500}
              className="w-full px-3 py-2.5 rounded-xl border border-divider bg-bg-light text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-lavender/40 resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 pb-6 pt-3 border-t border-divider">
          <button
            onClick={handleSave}
            disabled={saving || saved || !value.trim()}
            className={clsx(
              "w-full py-3.5 rounded-xl font-bold text-base flex items-center justify-center gap-2 transition-all",
              saved
                ? "bg-status-green text-white"
                : "gradient-violet text-white hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
            )}
          >
            {saved ? (
              <><Check size={18} aria-hidden="true" /> Saved!</>
            ) : saving ? (
              <><Loader2 size={18} className="animate-spin" aria-hidden="true" /> Saving…</>
            ) : (
              `Save ${selected.label}`
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
