"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Heart, ArrowRight, ArrowLeft, Plus, X, Pill } from "lucide-react";
import { conditionColors } from "@/lib/design-tokens";
import type { ConditionId } from "@/types";
import { clsx } from "clsx";

interface OnboardMed { id: string; name: string; dosage: string; frequency: string; conditionId: ConditionId; }

const FREQUENCIES = ["Once daily", "Twice daily", "Three times daily", "Every 8 hours", "Weekly", "As needed (PRN)"];
const CONDITION_IDS: ConditionId[] = ["diabetes_t2", "hypertension", "ckd", "copd", "chf", "cad", "hypothyroidism", "ra", "asthma"];

const COMMON_MEDS: Record<string, string[]> = {
  diabetes_t2: ["Metformin", "Glipizide", "Januvia", "Jardiance", "Ozempic"],
  hypertension: ["Amlodipine", "Lisinopril", "Losartan", "Metoprolol", "Hydrochlorothiazide"],
  ckd: ["Calcium carbonate", "Calcitriol", "Ferrous sulfate", "Sodium bicarbonate"],
};

export default function OnboardingMedicationsPage() {
  const [meds, setMeds] = useState<OnboardMed[]>([
    { id: "1", name: "Metformin", dosage: "500mg", frequency: "Twice daily", conditionId: "diabetes_t2" },
    { id: "2", name: "Amlodipine", dosage: "5mg", frequency: "Once daily", conditionId: "hypertension" },
  ]);
  const [showAdd, setShowAdd] = useState(false);
  const [newMed, setNewMed] = useState({ name: "", dosage: "", frequency: "Once daily", conditionId: "diabetes_t2" as ConditionId });

  const addMed = () => {
    if (!newMed.name.trim()) return;
    setMeds((prev) => [...prev, { id: crypto.randomUUID(), ...newMed }]);
    setNewMed({ name: "", dosage: "", frequency: "Once daily", conditionId: "diabetes_t2" });
    setShowAdd(false);
  };

  return (
    <div className="min-h-screen bg-bg-light flex flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-lg">
        <div className="flex items-center gap-2 mb-8">
          <div className="w-9 h-9 rounded-xl gradient-violet flex items-center justify-center">
            <Heart size={18} className="text-white" strokeWidth={2.5} />
          </div>
          <span className="font-bold text-title-lg text-text-primary">CuraSync</span>
        </div>

        <div className="flex items-center gap-2 mb-6">
          <div className="flex gap-1.5">
            {[1,2,3,4,5].map((step) => (
              <div key={step} className="h-1.5 rounded-full transition-all"
                style={{ width: step <= 3 ? "40px" : "12px", background: step <= 3 ? "#6C5CE7" : "#E2E0F0" }} />
            ))}
          </div>
          <span className="text-xs text-text-tertiary ml-2">Step 3 of 5</span>
        </div>

        <div className="mb-6">
          <h1 className="font-bold text-title-lg text-text-primary mb-2">Add your medications</h1>
          <p className="text-body-md text-text-secondary">Add medications for all your conditions. We&apos;ll set up reminders automatically.</p>
        </div>

        {/* Medication list */}
        <div className="space-y-2 mb-4">
          {meds.map((med) => {
            const c = conditionColors[med.conditionId];
            return (
              <div key={med.id} className="bg-bg-card rounded-xl p-3.5 shadow-card flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: c?.bg }}>
                  <span className="text-base" aria-hidden="true">{c?.emoji}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-label-sm text-text-primary">{med.name} <span className="font-normal text-text-tertiary">{med.dosage}</span></p>
                  <p className="text-xs text-text-tertiary">{med.frequency} · {c?.label}</p>
                </div>
                <button
                  onClick={() => setMeds((prev) => prev.filter((m) => m.id !== med.id))}
                  className="p-1.5 rounded-lg hover:bg-bg-light text-text-tertiary"
                  aria-label={`Remove ${med.name}`}
                >
                  <X size={14} />
                </button>
              </div>
            );
          })}
        </div>

        {/* Add form */}
        {showAdd ? (
          <div className="bg-bg-card rounded-xl shadow-card p-4 mb-4 border border-accent-lavender/30">
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1">Medication name *</label>
                <input
                  value={newMed.name}
                  onChange={(e) => setNewMed({ ...newMed, name: e.target.value })}
                  placeholder="e.g., Metformin"
                  list="med-suggestions"
                  className="w-full px-3 py-2 rounded-lg border border-divider bg-bg-light text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-lavender/40"
                />
                <datalist id="med-suggestions">
                  {Object.values(COMMON_MEDS).flat().map((m) => <option key={m} value={m} />)}
                </datalist>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-text-secondary mb-1">Dosage</label>
                  <input
                    value={newMed.dosage}
                    onChange={(e) => setNewMed({ ...newMed, dosage: e.target.value })}
                    placeholder="e.g., 500mg"
                    className="w-full px-3 py-2 rounded-lg border border-divider bg-bg-light text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-lavender/40"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-text-secondary mb-1">Frequency</label>
                  <select
                    value={newMed.frequency}
                    onChange={(e) => setNewMed({ ...newMed, frequency: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-divider bg-bg-light text-sm text-text-primary focus:outline-none"
                  >
                    {FREQUENCIES.map((f) => <option key={f}>{f}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1">Condition</label>
                <select
                  value={newMed.conditionId}
                  onChange={(e) => setNewMed({ ...newMed, conditionId: e.target.value as ConditionId })}
                  className="w-full px-3 py-2 rounded-lg border border-divider bg-bg-light text-sm text-text-primary focus:outline-none"
                >
                  {CONDITION_IDS.map((cId) => <option key={cId} value={cId}>{conditionColors[cId]?.emoji} {conditionColors[cId]?.label}</option>)}
                </select>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setShowAdd(false)} className="flex-1 py-2 rounded-lg border border-divider text-label-sm font-semibold text-text-secondary hover:bg-bg-lavender">Cancel</button>
                <button onClick={addMed} disabled={!newMed.name.trim()} className="flex-1 py-2 rounded-lg gradient-violet text-white text-label-sm font-semibold disabled:opacity-40">Add</button>
              </div>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowAdd(true)}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-divider text-label-sm font-semibold text-text-secondary hover:border-accent-lavender hover:text-accent-violet transition-all mb-4"
          >
            <Plus size={16} aria-hidden="true" />
            Add another medication
          </button>
        )}

        <div className="flex gap-3">
          <Link href="/onboarding/baselines" className="flex items-center gap-2 px-4 py-3 rounded-xl border border-divider font-semibold text-body-md text-text-secondary hover:bg-bg-lavender transition-all">
            <ArrowLeft size={18} aria-hidden="true" />
            Back
          </Link>
          <Link href="/onboarding/devices" className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl gradient-violet text-white font-semibold text-body-md hover:opacity-90 transition-opacity">
            Continue
            <ArrowRight size={18} aria-hidden="true" />
          </Link>
        </div>

        <Link
          href="/onboarding/devices"
          className="block w-full text-center text-label-sm text-text-tertiary mt-3 hover:text-text-secondary transition-colors"
        >
          Skip — I&apos;ll add these later
        </Link>
      </div>
    </div>
  );
}
