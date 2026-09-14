"use client";

import React, { useState, useEffect } from "react";
import AppShell from "@/components/layout/AppShell";
import MedicationCard from "@/components/patient/MedicationCard";
import { getMockDashboardData } from "@/lib/mock-data";
import { Plus, Clock, CheckCircle2, XCircle, AlertCircle, Pill, X, ChevronDown, Check } from "lucide-react";
import { clsx } from "clsx";
import { format, subDays } from "date-fns";
import { conditionColors } from "@/lib/design-tokens";
import type { TodayMedication, ConditionId } from "@/types";

const CONDITION_IDS: ConditionId[] = ["diabetes_t2", "hypertension", "ckd", "hypothyroidism", "ra", "asthma"];

interface MedHistory {
  date: string;
  taken: number;
  total: number;
}

// Generate 30 days of adherence history
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
  const [isSaving, setIsSaving] = useState(false);
  const [savedNotification, setSavedNotification] = useState<string | null>(null);

  // Load medications from DB API
  useEffect(() => {
    fetch("/api/v1/medications")
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (json?.data?.length) {
          const mapped: TodayMedication[] = json.data.map((m: any) => ({
            id: m.id,
            name: m.name,
            dosage: m.dosage,
            scheduledAt: m.scheduledTimes?.[0] || "08:00",
            status: m.status || "pending",
            conditionId: (m.conditionId as ConditionId) || "diabetes_t2",
          }));
          setMeds(mapped);
        }
      })
      .catch(() => {});
  }, []);

  // Add medication form state
  const [newMed, setNewMed] = useState({
    name: "",
    dosage: "",
    frequency: "once_daily",
    conditionId: "diabetes_t2" as ConditionId,
    scheduledAt: "08:00",
  });

  const handleLogDose = async (id: string, status: TodayMedication["status"]) => {
    // 1. Optimistic UI update
    setMeds((prev) => prev.map((m) => (m.id === id ? { ...m, status } : m)));

    // 2. Persist to API
    try {
      await fetch("/api/v1/medications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          medicationId: id,
          status,
          scheduledAt: new Date().toISOString(),
        }),
      });
      setSavedNotification(`Dose marked as ${status}`);
      setTimeout(() => setSavedNotification(null), 2500);
    } catch (err) {
      console.error("Failed to persist dose log:", err);
    }
  };

  const handleAddMed = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMed.name.trim()) return;

    setIsSaving(true);
    const tempId = crypto.randomUUID();

    const localMed: TodayMedication = {
      id: tempId,
      name: newMed.name,
      dosage: newMed.dosage,
      scheduledAt: newMed.scheduledAt,
      status: "pending",
      conditionId: newMed.conditionId,
    };

    // Optimistic UI update
    setMeds((prev) => [...prev, localMed]);

    try {
      const res = await fetch("/api/v1/medications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create_medication",
          name: newMed.name,
          dosage: newMed.dosage,
          frequency: newMed.frequency,
          conditionId: newMed.conditionId,
          scheduledTimes: [newMed.scheduledAt],
        }),
      });

      if (res.ok) {
        const json = await res.json();
        if (json?.data?.id) {
          setMeds((prev) => prev.map((m) => (m.id === tempId ? { ...m, id: json.data.id } : m)));
        }
        setSavedNotification(`Added ${newMed.name} to prescriptions`);
        setTimeout(() => setSavedNotification(null), 2500);
      }
    } catch (err) {
      console.error("Failed to save medication:", err);
    } finally {
      setIsSaving(false);
      setNewMed({ name: "", dosage: "", frequency: "once_daily", conditionId: "diabetes_t2", scheduledAt: "08:00" });
      setShowAdd(false);
    }
  };

  const taken = meds.filter((m) => m.status === "taken").length;
  const missed = meds.filter((m) => m.status === "missed").length;
  const pending = meds.filter((m) => m.status === "pending").length;

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto px-4 lg:px-6 py-6 space-y-6">
        
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="font-bold text-display text-text-primary">Medications</h1>
            <p className="text-body-md text-text-secondary mt-1">
              {meds.length} active prescriptions · {weeklyAdherence}% weekly adherence
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

        {savedNotification && (
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-status-green-bg border border-status-green/30 text-status-green text-xs font-semibold animate-fade-in">
            <Check size={14} />
            <span>{savedNotification}</span>
          </div>
        )}

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3">
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
        <div className="flex gap-1 p-1 bg-bg-card rounded-xl shadow-card">
          {(["today", "history", "all"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={clsx(
                "flex-1 py-2 rounded-lg text-label-sm font-semibold capitalize transition-all",
                tab === t ? "bg-accent-violet text-white shadow-xs" : "text-text-secondary hover:text-text-primary"
              )}
            >
              {t === "today" ? "Today's Schedule" : t === "history" ? "30-Day History" : "All Prescriptions"}
            </button>
          ))}
        </div>

        {/* TAB 1: Today's medications */}
        {tab === "today" && (
          <MedicationCard
            medications={meds}
            onLogDose={handleLogDose}
          />
        )}

        {/* TAB 2: History heatmap */}
        {tab === "history" && (
          <div className="bg-bg-card rounded-xl shadow-card p-5 space-y-4 animate-fade-in">
            <h2 className="font-semibold text-title-md text-text-primary">30-Day Medication Adherence</h2>
            <div className="grid grid-cols-6 sm:grid-cols-10 gap-1.5">
              {MOCK_HISTORY.map((h) => {
                const pct = h.total > 0 ? (h.taken / h.total) * 100 : 0;
                const bg =
                  pct === 100 ? "#00B894" :
                  pct >= 75   ? "#55EFC4" :
                  pct >= 50   ? "#FDCB6E" :
                  pct > 0     ? "#E17055" : "#D63031";
                return (
                  <div
                    key={h.date}
                    className="aspect-square rounded-lg flex flex-col items-center justify-center text-[10px] text-white font-bold transition-transform hover:scale-110 cursor-default"
                    style={{ background: bg }}
                    title={`${h.date}: ${h.taken}/${h.total} taken (${Math.round(pct)}%)`}
                  >
                    <span>{h.date.split(" ")[1]}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 3: All medications list */}
        {tab === "all" && (
          <div className="space-y-3 animate-fade-in">
            {meds.map((med) => {
              const c = conditionColors[med.conditionId];
              return (
                <div key={med.id} className="bg-bg-card rounded-xl p-4 shadow-card flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg" style={{ background: c?.bg }}>
                      {c?.emoji}
                    </div>
                    <div>
                      <p className="font-semibold text-title-sm text-text-primary">{med.name}</p>
                      <p className="text-xs text-text-secondary">{med.dosage} · Scheduled at {med.scheduledAt}</p>
                      <p className="text-xs text-text-tertiary mt-0.5">{c?.label}</p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-bg-light text-text-secondary capitalize">
                    {med.status}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* Add Medication Modal */}
        {showAdd && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-bg-card rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-4 animate-fade-in">
              <div className="flex items-center justify-between border-b border-divider pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg gradient-violet flex items-center justify-center text-white">
                    <Pill size={16} />
                  </div>
                  <h3 className="font-bold text-title-md text-text-primary">Add Prescription</h3>
                </div>
                <button
                  onClick={() => setShowAdd(false)}
                  className="p-1 rounded-lg text-text-tertiary hover:text-text-primary"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleAddMed} className="space-y-4 text-xs">
                <div>
                  <label className="block font-bold text-text-secondary uppercase mb-1">Medication Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Metformin, Amlodipine"
                    value={newMed.name}
                    onChange={(e) => setNewMed({ ...newMed, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-divider bg-bg-light text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-violet"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-text-secondary uppercase mb-1">Dosage *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 500mg, 10mg"
                      value={newMed.dosage}
                      onChange={(e) => setNewMed({ ...newMed, dosage: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-divider bg-bg-light text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-violet"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-text-secondary uppercase mb-1">Schedule Time</label>
                    <input
                      type="time"
                      value={newMed.scheduledAt}
                      onChange={(e) => setNewMed({ ...newMed, scheduledAt: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-divider bg-bg-light text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-violet"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-text-secondary uppercase mb-1">Condition Protocol</label>
                  <select
                    value={newMed.conditionId}
                    onChange={(e) => setNewMed({ ...newMed, conditionId: e.target.value as ConditionId })}
                    className="w-full px-3 py-2 rounded-xl border border-divider bg-bg-light text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-violet"
                  >
                    {CONDITION_IDS.map((cId) => (
                      <option key={cId} value={cId}>
                        {conditionColors[cId]?.label ?? cId}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAdd(false)}
                    className="flex-1 py-2.5 rounded-xl border border-divider font-semibold text-text-secondary hover:bg-bg-light"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="flex-1 py-2.5 rounded-xl gradient-violet text-white font-bold shadow-card hover:opacity-90 disabled:opacity-50"
                  >
                    {isSaving ? "Saving…" : "Save Medication"}
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
