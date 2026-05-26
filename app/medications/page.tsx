"use client";

import React, { useState } from "react";
import AppShell from "@/components/layout/AppShell";
import MedicationCard from "@/components/patient/MedicationCard";
import { getMockDashboardData } from "@/lib/mock-data";
import { Plus, Clock, CheckCircle2, XCircle, AlertCircle, Pill, X, ChevronDown } from "lucide-react";
import { clsx } from "clsx";
import { format, subDays } from "date-fns";
import { conditionColors } from "@/lib/design-tokens";
import type { TodayMedication, ConditionId } from "@/types";

const CONDITION_IDS: ConditionId[] = ["diabetes_t2", "hypertension", "ckd", "copd", "chf", "cad", "hypothyroidism", "ra", "asthma"];

interface MedHistory {
  date: string;
  taken: number;
  total: number;
}

// Generate 30 days of mock adherence history
const MOCK_HISTORY: MedHistory[] = Array.from({ length: 30 }, (_, i) => {
  const total = 4;
  const taken = Math.floor(Math.random() * (total + 1));
  return { date: format(subDays(new Date(), 29 - i), "MMM d"), taken, total };
});

export default function MedicationsPage() {
  const { todayMedications, weeklyAdherence } = getMockDashboardData();
  const [meds, setMeds] = useState<TodayMedication[]>(todayMedications);
  const [showAdd, setShowAdd] = useState(false);
  const [tab, setTab] = useState<"today" | "history" | "all">("today");

  // Add medication form state
  const [newMed, setNewMed] = useState({
    name: "", dosage: "", frequency: "once_daily",
    conditionId: "diabetes_t2" as ConditionId,
    scheduledAt: "08:00",
  });

  const handleLogDose = (id: string, status: TodayMedication["status"]) => {
    setMeds((prev) => prev.map((m) => m.id === id ? { ...m, status } : m));
  };

  const handleAddMed = () => {
    if (!newMed.name.trim()) return;
    const med: TodayMedication = {
      id: crypto.randomUUID(),
      name: newMed.name,
      dosage: newMed.dosage,
      scheduledAt: newMed.scheduledAt,
      status: "pending",
      conditionId: newMed.conditionId,
    };
    setMeds((prev) => [...prev, med]);
    setNewMed({ name: "", dosage: "", frequency: "once_daily", conditionId: "diabetes_t2", scheduledAt: "08:00" });
    setShowAdd(false);
  };

  const taken = meds.filter((m) => m.status === "taken").length;
  const missed = meds.filter((m) => m.status === "missed").length;
  const pending = meds.filter((m) => m.status === "pending").length;

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto px-4 lg:px-6 py-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="font-bold text-display text-text-primary">Medications</h1>
            <p className="text-body-md text-text-secondary mt-1">
              {meds.length} medications · {weeklyAdherence}% weekly adherence
            </p>
          </div>
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl gradient-violet text-white font-semibold text-label-sm shadow-card hover:opacity-90 transition-opacity"
          >
            <Plus size={16} aria-hidden="true" />
            Add Med
          </button>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { label: "Taken", count: taken, icon: CheckCircle2, color: "#00B894", bg: "#E8F8F5" },
            { label: "Pending", count: pending, icon: Clock, color: "#A29BFE", bg: "#F0EFF8" },
            { label: "Missed", count: missed, icon: XCircle, color: "#D63031", bg: "#FDECEA" },
          ].map(({ label, count, icon: Icon, color, bg }) => (
            <div key={label} className="bg-bg-card rounded-xl p-3 shadow-card card-enter text-center">
              <div className="w-8 h-8 rounded-lg mx-auto mb-1.5 flex items-center justify-center" style={{ background: bg }}>
                <Icon size={16} style={{ color }} aria-hidden="true" />
              </div>
              <p className="font-bold text-xl metric-value text-text-primary">{count}</p>
              <p className="text-xs text-text-tertiary">{label}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-bg-card rounded-xl shadow-card mb-5">
          {(["today", "all", "history"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={clsx(
                "flex-1 py-2.5 rounded-lg text-label-sm font-semibold transition-all capitalize",
                tab === t ? "gradient-violet text-white shadow-sm" : "text-text-secondary hover:text-text-primary"
              )}
            >
              {t === "today" ? "Today" : t === "all" ? "All Medications" : "30-Day History"}
            </button>
          ))}
        </div>

        {/* Add medication form */}
        {showAdd && (
          <div className="bg-bg-card rounded-xl shadow-card p-5 mb-5 border border-accent-lavender/30 animate-fade-in">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-title-md text-text-primary">Add Medication</h3>
              <button onClick={() => setShowAdd(false)} className="p-1.5 rounded-lg hover:bg-bg-lavender text-text-tertiary">
                <X size={16} aria-label="Close" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-text-secondary mb-1">Medication name *</label>
                  <input
                    value={newMed.name}
                    onChange={(e) => setNewMed({ ...newMed, name: e.target.value })}
                    placeholder="e.g., Metformin"
                    className="w-full px-3 py-2 rounded-lg border border-divider bg-bg-light text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-lavender/40 focus:border-accent-violet"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-text-secondary mb-1">Dosage</label>
                  <input
                    value={newMed.dosage}
                    onChange={(e) => setNewMed({ ...newMed, dosage: e.target.value })}
                    placeholder="e.g., 500mg"
                    className="w-full px-3 py-2 rounded-lg border border-divider bg-bg-light text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-lavender/40 focus:border-accent-violet"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-text-secondary mb-1">Condition</label>
                  <select
                    value={newMed.conditionId}
                    onChange={(e) => setNewMed({ ...newMed, conditionId: e.target.value as ConditionId })}
                    className="w-full px-3 py-2 rounded-lg border border-divider bg-bg-light text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-lavender/40"
                  >
                    {CONDITION_IDS.map((cId) => (
                      <option key={cId} value={cId}>
                        {conditionColors[cId]?.emoji} {conditionColors[cId]?.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-text-secondary mb-1">Time</label>
                  <input
                    type="time"
                    value={newMed.scheduledAt}
                    onChange={(e) => setNewMed({ ...newMed, scheduledAt: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-divider bg-bg-light text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-lavender/40"
                  />
                </div>
              </div>

              {/* Drug-condition conflict flag */}
              {newMed.conditionId === "ckd" && newMed.name.toLowerCase().includes("ibuprofen") && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-status-red-bg border border-status-red/20">
                  <AlertCircle size={14} className="text-status-red flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-status-red font-medium">
                    ⚠️ NSAIDs like ibuprofen may worsen kidney function in CKD patients. Consult your doctor before taking.
                  </p>
                </div>
              )}

              <button
                onClick={handleAddMed}
                disabled={!newMed.name.trim()}
                className="w-full py-3 rounded-xl gradient-violet text-white font-semibold text-label-sm disabled:opacity-40 hover:opacity-90 transition-opacity"
              >
                Add to Schedule
              </button>
            </div>
          </div>
        )}

        {/* Today tab */}
        {tab === "today" && <MedicationCard medications={meds} onLogDose={handleLogDose} />}

        {/* All medications tab */}
        {tab === "all" && (
          <div className="bg-bg-card rounded-xl shadow-card overflow-hidden">
            <div className="px-4 py-3 border-b border-divider flex items-center justify-between">
              <h3 className="font-semibold text-title-md text-text-primary">All Medications</h3>
              <span className="text-label-sm text-text-tertiary">{meds.length} total</span>
            </div>
            {meds.map((med, i) => {
              const c = conditionColors[med.conditionId];
              return (
                <div key={med.id} className={clsx("flex items-center gap-3 px-4 py-3", i < meds.length - 1 && "border-b border-divider")}>
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: c?.bg }}>
                    <span className="text-base" aria-hidden="true">{c?.emoji}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-label-sm text-text-primary">{med.name} <span className="font-normal text-text-tertiary">{med.dosage}</span></p>
                    <p className="text-xs text-text-tertiary">{c?.label} · {med.scheduledAt}</p>
                  </div>
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full" style={{ background: med.status === "taken" ? "#E8F8F5" : med.status === "missed" ? "#FDECEA" : "#F0EFF8" }}>
                    <span className="text-xs font-semibold capitalize" style={{ color: med.status === "taken" ? "#00B894" : med.status === "missed" ? "#D63031" : "#A29BFE" }}>
                      {med.status}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* History tab */}
        {tab === "history" && (
          <div className="bg-bg-card rounded-xl shadow-card p-5">
            <h3 className="font-semibold text-title-md text-text-primary mb-4">30-Day Adherence</h3>
            <div className="flex items-end gap-1 h-24 mb-3">
              {MOCK_HISTORY.map((d, i) => {
                const pct = d.total > 0 ? d.taken / d.total : 0;
                const color = pct >= 0.8 ? "#00B894" : pct >= 0.5 ? "#FDCB6E" : "#D63031";
                return (
                  <div key={i} className="flex-1 flex flex-col items-center justify-end gap-0.5" title={`${d.date}: ${d.taken}/${d.total} taken`}>
                    <div className="w-full rounded-sm" style={{ height: `${Math.max(pct * 80, 4)}px`, background: color, opacity: 0.85 }} />
                  </div>
                );
              })}
            </div>
            <div className="flex justify-between text-xs text-text-tertiary">
              <span>{MOCK_HISTORY[0]?.date}</span>
              <span>Today</span>
            </div>
            <div className="flex items-center gap-4 mt-4 pt-4 border-t border-divider">
              {[{ color: "#00B894", label: "≥80% taken" }, { color: "#FDCB6E", label: "50–79%" }, { color: "#D63031", label: "<50%" }].map((l) => (
                <div key={l.label} className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm" style={{ background: l.color }} aria-hidden="true" />
                  <span className="text-xs text-text-secondary">{l.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="h-8" />
      </div>
    </AppShell>
  );
}
