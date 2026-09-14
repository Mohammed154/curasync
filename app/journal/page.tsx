"use client";

import React, { useState, useEffect } from "react";
import AppShell from "@/components/layout/AppShell";
import { Plus, BookOpen, TrendingUp, ChevronDown, X, Check } from "lucide-react";
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
  const [tab, setTab] = useState<"log" | "trends">("log");
  const [isSaving, setIsSaving] = useState(false);
  const [savedNotification, setSavedNotification] = useState<string | null>(null);

  // Load entries from DB API
  useEffect(() => {
    fetch("/api/v1/journal")
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (json?.data?.length) {
          const mapped: SymptomEntry[] = json.data.map((e: any) => ({
            id: e.id,
            text: e.text,
            severity: e.severity,
            conditionId: (e.conditionId as ConditionId) || "diabetes_t2",
            bodyLocation: e.bodyLocation || undefined,
            createdAt: new Date(e.recordedAt || e.createdAt),
          }));
          setEntries(mapped);
        }
      })
      .catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;

    setIsSaving(true);
    const tempId = crypto.randomUUID();

    const newEntry: SymptomEntry = {
      id: tempId,
      text: text.trim(),
      severity,
      conditionId,
      bodyLocation: bodyLocation || undefined,
      createdAt: new Date(),
    };

    // 1. Optimistic UI update
    setEntries((prev) => [newEntry, ...prev]);

    // 2. Persist to API
    try {
      const res = await fetch("/api/v1/journal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: text.trim(),
          severity,
          conditionId,
          bodyLocation: bodyLocation || undefined,
        }),
      });

      if (res.ok) {
        const json = await res.json();
        if (json?.data?.id) {
          setEntries((prev) => prev.map((item) => (item.id === tempId ? { ...item, id: json.data.id } : item)));
        }
        setSavedNotification("Symptom journal entry saved");
        setTimeout(() => setSavedNotification(null), 2500);
      }
    } catch (err) {
      console.error("Failed to save journal entry:", err);
    } finally {
      setIsSaving(false);
      setText("");
      setSeverity(5);
      setBodyLocation("");
      setShowForm(false);
    }
  };

  const sev = SEVERITY_LABELS[severity] ?? { label: "Moderate", color: "#FDCB6E" };

  // Frequency map for trends tab
  const freqMap: Record<string, number> = {};
  entries.forEach((e) => {
    freqMap[e.conditionId] = (freqMap[e.conditionId] ?? 0) + 1;
  });

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto px-4 lg:px-6 py-6 space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-bold text-display text-text-primary">Symptom Journal</h1>
            <p className="text-body-md text-text-secondary mt-1">{entries.length} entries recorded</p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl gradient-violet text-white font-semibold text-label-sm shadow-card hover:opacity-90 transition-opacity"
          >
            <Plus size={16} aria-hidden="true" />
            Log Symptom
          </button>
        </div>

        {savedNotification && (
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-status-green-bg border border-status-green/30 text-status-green text-xs font-semibold animate-fade-in">
            <Check size={14} />
            <span>{savedNotification}</span>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-bg-card rounded-xl shadow-card">
          {(["log", "trends"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={clsx(
                "flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-label-sm font-semibold transition-all capitalize",
                tab === t ? "bg-accent-violet text-white shadow-xs" : "text-text-secondary hover:text-text-primary"
              )}
            >
              {t === "log" ? <BookOpen size={15} aria-hidden="true" /> : <TrendingUp size={15} aria-hidden="true" />}
              {t === "log" ? "Journal Entries" : "Frequency Trends"}
            </button>
          ))}
        </div>

        {/* LOG TAB */}
        {tab === "log" && (
          <div className="space-y-4 animate-fade-in">
            {entries.length === 0 ? (
              <div className="bg-bg-card rounded-xl p-8 shadow-card text-center text-text-tertiary">
                No symptoms logged yet. Click &quot;Log Symptom&quot; to add your first entry.
              </div>
            ) : (
              entries.map((entry) => {
                const c = conditionColors[entry.conditionId];
                const s = SEVERITY_LABELS[entry.severity] ?? { label: "Moderate", color: "#FDCB6E" };

                return (
                  <div key={entry.id} className="bg-bg-card rounded-xl p-4 shadow-card space-y-2 card-enter">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span className="text-base" aria-hidden="true">{c?.emoji}</span>
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: c?.bg, color: c?.accent }}>
                          {c?.label}
                        </span>
                        {entry.bodyLocation && (
                          <span className="text-xs text-text-tertiary font-medium">· {entry.bodyLocation}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-bold" style={{ color: s.color, background: s.color + "18" }}>
                        <span>Severity: {entry.severity}/10</span>
                      </div>
                    </div>

                    <p className="text-sm text-text-primary font-medium">{entry.text}</p>
                    <p className="text-[11px] text-text-tertiary">{format(entry.createdAt, "EEEE, MMM d, yyyy · h:mm a")}</p>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* TRENDS TAB */}
        {tab === "trends" && (
          <div className="bg-bg-card rounded-xl p-5 shadow-card space-y-4 animate-fade-in">
            <h2 className="font-bold text-title-md text-text-primary">Symptom Distribution by Condition</h2>
            <div className="space-y-3">
              {Object.entries(freqMap).map(([cId, count]) => {
                const c = conditionColors[cId as ConditionId];
                const pct = Math.round((count / entries.length) * 100);
                return (
                  <div key={cId} className="space-y-1">
                    <div className="flex justify-between text-xs font-semibold text-text-primary">
                      <span>{c?.emoji} {c?.label ?? cId}</span>
                      <span>{count} entries ({pct}%)</span>
                    </div>
                    <div className="h-2 bg-bg-light rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: c?.accent ?? "#6C5CE7" }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Log Symptom Modal Form */}
        {showForm && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-bg-card rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-4 animate-fade-in">
              <div className="flex items-center justify-between border-b border-divider pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg gradient-violet flex items-center justify-center text-white">
                    <BookOpen size={16} />
                  </div>
                  <h3 className="font-bold text-title-md text-text-primary">Log Symptom</h3>
                </div>
                <button
                  onClick={() => setShowForm(false)}
                  className="p-1 rounded-lg text-text-tertiary hover:text-text-primary"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4 text-xs">
                <div>
                  <label className="block font-bold text-text-secondary uppercase mb-1">Related Condition</label>
                  <select
                    value={conditionId}
                    onChange={(e) => setConditionId(e.target.value as ConditionId)}
                    className="w-full px-3 py-2 rounded-xl border border-divider bg-bg-light text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-violet"
                  >
                    {Object.keys(CONDITION_SYMPTOMS).map((cId) => (
                      <option key={cId} value={cId}>
                        {conditionColors[cId as ConditionId]?.label ?? cId}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-text-secondary uppercase mb-1">Quick Select Symptoms</label>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {(CONDITION_SYMPTOMS[conditionId] ?? []).map((s) => (
                      <button
                        type="button"
                        key={s}
                        onClick={() => setText((prev) => (prev ? `${prev}, ${s}` : s))}
                        className="px-2 py-1 rounded-lg text-[11px] font-semibold bg-bg-light hover:bg-bg-lavender text-text-secondary border border-divider"
                      >
                        + {s}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-text-secondary uppercase mb-1">Description / Notes *</label>
                  <textarea
                    rows={3}
                    required
                    placeholder="Describe how you feel, triggers, or timing..."
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-divider bg-bg-light text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-violet resize-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-text-secondary uppercase mb-1">Body Location (Optional)</label>
                  <select
                    value={bodyLocation}
                    onChange={(e) => setBodyLocation(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-divider bg-bg-light text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-violet"
                  >
                    <option value="">Select location...</option>
                    {BODY_LOCATIONS.map((loc) => (
                      <option key={loc} value={loc}>{loc}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <div className="flex justify-between mb-1">
                    <label className="font-bold text-text-secondary uppercase">Severity Scale</label>
                    <span className="font-bold" style={{ color: sev.color }}>
                      {severity}/10 — {sev.label}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={10}
                    value={severity}
                    onChange={(e) => setSeverity(Number(e.target.value))}
                    className="w-full accent-accent-violet"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="flex-1 py-2.5 rounded-xl border border-divider font-semibold text-text-secondary hover:bg-bg-light"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="flex-1 py-2.5 rounded-xl gradient-violet text-white font-bold shadow-card hover:opacity-90 disabled:opacity-50"
                  >
                    {isSaving ? "Saving…" : "Save Entry"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
