"use client";

import React, { useState } from "react";
import AppShell from "@/components/layout/AppShell";
import { Plus, Mic, BookOpen, TrendingUp, Calendar, ChevronDown, X } from "lucide-react";
import { clsx } from "clsx";
import { format } from "date-fns";
import { conditionColors } from "@/lib/design-tokens";
import type { ConditionId } from "@/types";

interface SymptomEntry {
  id: string;
  text: string;
  severity: number;
  conditionId: ConditionId;
  createdAt: Date;
  bodyLocation?: string;
}

const CONDITION_SYMPTOMS: Record<string, string[]> = {
  diabetes_t2:  ["Excessive thirst", "Frequent urination", "Blurred vision", "Fatigue", "Slow-healing sores", "Tingling in hands/feet"],
  hypertension: ["Headache", "Dizziness", "Chest pain", "Shortness of breath", "Blurred vision", "Nosebleed"],
  ckd:          ["Swollen ankles/feet", "Fatigue", "Nausea", "Poor appetite", "Muscle cramps", "Itchy skin"],
  copd:         ["Shortness of breath", "Chronic cough", "Wheezing", "Chest tightness", "Excess mucus", "Fatigue"],
  chf:          ["Breathlessness", "Ankle swelling", "Fatigue", "Rapid heartbeat", "Persistent cough", "Weight gain"],
  cad:          ["Chest pain", "Shortness of breath", "Heart palpitations", "Dizziness", "Fatigue", "Sweating"],
  hypothyroidism: ["Fatigue", "Weight gain", "Cold sensitivity", "Dry skin", "Hair loss", "Brain fog"],
  ra:           ["Joint pain", "Morning stiffness", "Swollen joints", "Fatigue", "Fever", "Reduced grip"],
  asthma:       ["Wheezing", "Coughing", "Chest tightness", "Shortness of breath", "Sleep disruption"],
};

const MOCK_ENTRIES: SymptomEntry[] = [
  { id: "s1", text: "Mild dizziness in the morning after waking up", severity: 4, conditionId: "hypertension", createdAt: new Date(Date.now() - 1000*60*60*3) },
  { id: "s2", text: "Increased thirst throughout the day", severity: 6, conditionId: "diabetes_t2", createdAt: new Date(Date.now() - 1000*60*60*26) },
  { id: "s3", text: "Ankle swelling noticed in the evening", severity: 5, conditionId: "ckd", createdAt: new Date(Date.now() - 1000*60*60*49) },
];

const BODY_LOCATIONS = ["Head", "Chest", "Abdomen", "Left arm", "Right arm", "Left leg", "Right leg", "Back", "Feet/Ankles", "Hands", "Eyes", "General/Whole body"];

const SEVERITY_LABELS: Record<number, { label: string; color: string }> = {
  1: { label: "Minimal", color: "#00B894" },
  2: { label: "Minimal", color: "#00B894" },
  3: { label: "Mild", color: "#55EFC4" },
  4: { label: "Mild", color: "#55EFC4" },
  5: { label: "Moderate", color: "#FDCB6E" },
  6: { label: "Moderate", color: "#FDCB6E" },
  7: { label: "Significant", color: "#E17055" },
  8: { label: "Significant", color: "#E17055" },
  9: { label: "Severe", color: "#D63031" },
  10: { label: "Severe", color: "#D63031" },
};

export default function JournalPage() {
  const [entries, setEntries] = useState<SymptomEntry[]>(MOCK_ENTRIES);
  const [showForm, setShowForm] = useState(false);
  const [text, setText] = useState("");
  const [severity, setSeverity] = useState(5);
  const [conditionId, setConditionId] = useState<ConditionId>("diabetes_t2");
  const [bodyLocation, setBodyLocation] = useState("");
  const [activeSymptom, setActiveSymptom] = useState<string | null>(null);
  const [tab, setTab] = useState<"log" | "trends">("log");

  const conditions: ConditionId[] = ["diabetes_t2", "hypertension", "ckd"];

  const handleSubmit = () => {
    if (!text.trim()) return;
    const entry: SymptomEntry = {
      id: crypto.randomUUID(),
      text: text.trim(),
      severity,
      conditionId,
      bodyLocation: bodyLocation || undefined,
      createdAt: new Date(),
    };
    setEntries((prev) => [entry, ...prev]);
    setText(""); setSeverity(5); setBodyLocation(""); setShowForm(false);
  };

  const sev = SEVERITY_LABELS[severity] ?? { label: "Moderate", color: "#FDCB6E" };

  // Frequency map for trends tab
  const freqMap: Record<string, number> = {};
  entries.forEach((e) => {
    freqMap[e.conditionId] = (freqMap[e.conditionId] ?? 0) + 1;
  });

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto px-4 lg:px-6 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-bold text-display text-text-primary">Symptom Journal</h1>
            <p className="text-body-md text-text-secondary mt-1">{entries.length} entries logged</p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl gradient-violet text-white font-semibold text-label-sm shadow-card hover:opacity-90 transition-opacity"
          >
            <Plus size={16} aria-hidden="true" />
            Log Symptom
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-bg-card rounded-xl shadow-card mb-6">
          {(["log", "trends"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={clsx(
                "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-label-sm font-semibold transition-all capitalize",
                tab === t ? "gradient-violet text-white shadow-sm" : "text-text-secondary hover:text-text-primary"
              )}
            >
              {t === "log" ? <BookOpen size={15} aria-hidden="true" /> : <TrendingUp size={15} aria-hidden="true" />}
              {t === "log" ? "Journal" : "Trends"}
            </button>
          ))}
        </div>

        {/* Add form */}
        {showForm && (
          <div className="bg-bg-card rounded-xl shadow-card p-5 mb-5 border border-accent-lavender/30 animate-fade-in">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-title-md text-text-primary">Log a Symptom</h3>
              <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg hover:bg-bg-lavender text-text-tertiary" aria-label="Close form">
                <X size={16} />
              </button>
            </div>

            {/* Condition selector */}
            <div className="mb-4">
              <label className="block text-label-sm font-semibold text-text-secondary mb-2">Condition</label>
              <div className="flex flex-wrap gap-2">
                {conditions.map((cId) => {
                  const c = conditionColors[cId];
                  return (
                    <button
                      key={cId}
                      onClick={() => setConditionId(cId)}
                      className={clsx("px-3 py-1.5 rounded-full text-label-sm font-semibold transition-all border-2")}
                      style={{
                        background: conditionId === cId ? c?.bg : "transparent",
                        color: conditionId === cId ? c?.accent : "#8888A8",
                        borderColor: conditionId === cId ? (c?.accent ?? "#6C5CE7") : "#E2E0F0",
                      }}
                      aria-pressed={conditionId === cId}
                    >
                      {c?.emoji} {c?.label.split(" ").slice(0,2).join(" ")}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Quick pick symptoms */}
            {CONDITION_SYMPTOMS[conditionId] && (
              <div className="mb-4">
                <label className="block text-label-sm font-semibold text-text-secondary mb-2">Common symptoms — tap to add</label>
                <div className="flex flex-wrap gap-1.5">
                  {CONDITION_SYMPTOMS[conditionId]?.map((s) => (
                    <button
                      key={s}
                      onClick={() => setText((prev) => prev ? `${prev}, ${s}` : s)}
                      className={clsx(
                        "px-2.5 py-1 rounded-full text-xs font-medium transition-all border",
                        activeSymptom === s
                          ? "bg-accent-violet text-white border-accent-violet"
                          : "bg-bg-lavender text-text-secondary border-divider hover:border-accent-lavender"
                      )}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Free text */}
            <div className="mb-4">
              <label className="block text-label-sm font-semibold text-text-secondary mb-2">Description</label>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Describe your symptom in your own words…"
                rows={3}
                className="w-full px-3 py-2.5 rounded-lg border border-divider bg-bg-light text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent-lavender/40 focus:border-accent-violet resize-none transition-all"
                aria-label="Symptom description"
              />
            </div>

            {/* Severity slider */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <label className="text-label-sm font-semibold text-text-secondary">Severity</label>
                <span className="text-label-sm font-bold" style={{ color: sev.color }}>
                  {severity}/10 — {sev.label}
                </span>
              </div>
              <input
                type="range" min={1} max={10} value={severity}
                onChange={(e) => setSeverity(parseInt(e.target.value))}
                className="w-full h-2 rounded-full appearance-none cursor-pointer"
                style={{ accentColor: sev.color }}
                aria-label={`Severity: ${severity} out of 10`}
              />
              <div className="flex justify-between text-xs text-text-tertiary mt-1">
                <span>Minimal</span><span>Severe</span>
              </div>
            </div>

            {/* Body location */}
            <div className="mb-5">
              <label className="block text-label-sm font-semibold text-text-secondary mb-2">Body location (optional)</label>
              <div className="flex flex-wrap gap-1.5">
                {BODY_LOCATIONS.map((loc) => (
                  <button
                    key={loc}
                    onClick={() => setBodyLocation((prev) => prev === loc ? "" : loc)}
                    className={clsx(
                      "px-2.5 py-1 rounded-full text-xs font-medium border transition-all",
                      bodyLocation === loc
                        ? "bg-accent-violet text-white border-accent-violet"
                        : "border-divider text-text-secondary hover:border-accent-lavender"
                    )}
                    aria-pressed={bodyLocation === loc}
                  >
                    {loc}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleSubmit}
              disabled={!text.trim()}
              className="w-full py-3 rounded-xl gradient-violet text-white font-semibold text-label-sm disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
            >
              Save Symptom Entry
            </button>
          </div>
        )}

        {/* Journal tab */}
        {tab === "log" && (
          <div className="space-y-3">
            {entries.length === 0 && (
              <div className="text-center py-16 text-text-tertiary">
                <BookOpen size={40} className="mx-auto mb-3 opacity-30" />
                <p className="text-label-sm">No symptoms logged yet.</p>
                <p className="text-xs mt-1">Tap &ldquo;Log Symptom&rdquo; to add your first entry.</p>
              </div>
            )}
            {entries.map((entry) => {
              const c = conditionColors[entry.conditionId];
              const s = SEVERITY_LABELS[entry.severity] ?? { label: "Moderate", color: "#FDCB6E" };
              return (
                <div key={entry.id} className="bg-bg-card rounded-xl p-4 shadow-card card-enter border border-divider">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <span
                          className="px-2 py-0.5 rounded-full text-xs font-semibold"
                          style={{ background: c?.bg, color: c?.accent }}
                        >
                          {c?.emoji} {c?.label.split(" ").slice(0,2).join(" ")}
                        </span>
                        {entry.bodyLocation && (
                          <span className="text-xs text-text-tertiary bg-bg-light px-2 py-0.5 rounded-full">
                            📍 {entry.bodyLocation}
                          </span>
                        )}
                      </div>
                      <p className="text-text-primary text-sm leading-snug">{entry.text}</p>
                      <p className="text-xs text-text-tertiary mt-1.5">
                        {format(entry.createdAt, "MMM d, h:mm a")}
                      </p>
                    </div>
                    <div className="flex flex-col items-end flex-shrink-0">
                      <span className="text-xl font-bold metric-value" style={{ color: s.color }}>
                        {entry.severity}
                      </span>
                      <span className="text-xs" style={{ color: s.color }}>{s.label}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Trends tab */}
        {tab === "trends" && (
          <div className="space-y-4">
            <div className="bg-bg-card rounded-xl p-5 shadow-card">
              <h3 className="font-semibold text-title-md text-text-primary mb-4">Frequency by Condition</h3>
              <div className="space-y-3">
                {Object.entries(freqMap).map(([cId, count]) => {
                  const c = conditionColors[cId];
                  const pct = Math.round((count / entries.length) * 100);
                  return (
                    <div key={cId}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-label-sm font-semibold text-text-primary">
                          {c?.emoji} {c?.label}
                        </span>
                        <span className="text-label-sm text-text-tertiary">{count} entries</span>
                      </div>
                      <div className="h-2 bg-divider rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{ width: `${pct}%`, background: c?.accent }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-bg-card rounded-xl p-5 shadow-card">
              <h3 className="font-semibold text-title-md text-text-primary mb-4">Average Severity</h3>
              {conditions.map((cId) => {
                const condEntries = entries.filter((e) => e.conditionId === cId);
                if (!condEntries.length) return null;
                const avg = Math.round(condEntries.reduce((s, e) => s + e.severity, 0) / condEntries.length);
                const s = SEVERITY_LABELS[avg] ?? { label: "Moderate", color: "#FDCB6E" };
                const c = conditionColors[cId];
                return (
                  <div key={cId} className="flex items-center justify-between py-2 border-b border-divider last:border-0">
                    <span className="text-label-sm font-semibold text-text-primary">{c?.emoji} {c?.label}</span>
                    <span className="text-label-sm font-bold" style={{ color: s.color }}>{avg}/10 — {s.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="h-8" />
      </div>
    </AppShell>
  );
}
