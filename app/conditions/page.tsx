"use client";

import React, { useState, useEffect } from "react";
import AppShell from "@/components/layout/AppShell";
import ConditionTile from "@/components/patient/ConditionTile";
import { getMockDashboardData } from "@/lib/mock-data";
import { conditionColors } from "@/lib/design-tokens";
import type { ConditionId, ConditionSummary } from "@/types";
import Link from "next/link";
import { Plus, TrendingDown, TrendingUp, Minus, ChevronRight, Activity, Search, X, Check } from "lucide-react";
import { clsx } from "clsx";

// Full condition list the patient might add
const ALL_AVAILABLE: ConditionId[] = [
  "diabetes_t2","hypertension","ckd","copd","chf","cad","hypothyroidism","ra","asthma","diabetes_t1"
];

const CONDITION_DETAILS: Record<string, {
  description: string;
  keyMetric: string;
  lastUpdated: string;
  weekTrend: "up" | "down" | "stable";
}> = {
  diabetes_t2:   { description: "Blood sugar management & insulin resistance", keyMetric: "142 mg/dL", lastUpdated: "8 min ago", weekTrend: "down" },
  hypertension:  { description: "Blood pressure control & cardiovascular risk", keyMetric: "138/88 mmHg", lastUpdated: "8 min ago", weekTrend: "stable" },
  ckd:           { description: "Kidney filtration rate & toxin clearance", keyMetric: "eGFR 48", lastUpdated: "Apr 10", weekTrend: "stable" },
  copd:          { description: "Airflow obstruction & lung function", keyMetric: "Peak flow 380", lastUpdated: "Yesterday", weekTrend: "stable" },
  chf:           { description: "Cardiac output & fluid management", keyMetric: "HR 74 bpm", lastUpdated: "2 hr ago", weekTrend: "stable" },
  cad:           { description: "Coronary perfusion & cardiac events", keyMetric: "HR 74 bpm", lastUpdated: "2 hr ago", weekTrend: "stable" },
  hypothyroidism:{ description: "Thyroid hormone levels & metabolism", keyMetric: "TSH 4.2", lastUpdated: "Mar 28", weekTrend: "stable" },
  ra:            { description: "Joint inflammation & autoimmune activity", keyMetric: "DAS28: 3.4", lastUpdated: "Apr 1", weekTrend: "down" },
  asthma:        { description: "Airway inflammation & bronchospasm", keyMetric: "Peak flow 82%", lastUpdated: "Yesterday", weekTrend: "stable" },
  diabetes_t1:   { description: "Insulin-dependent glucose management", keyMetric: "142 mg/dL", lastUpdated: "8 min ago", weekTrend: "down" },
};

const METRIC_METADATA: Record<ConditionId, {
  metricLabel: string;
  unit: string;
  status: "green" | "amber" | "red";
  trend: "up" | "down" | "stable";
}> = {
  diabetes_t2:    { metricLabel: "Blood Glucose",  unit: "mg/dL",  status: "amber", trend: "down" },
  diabetes_t1:    { metricLabel: "Blood Glucose",  unit: "mg/dL",  status: "amber", trend: "down" },
  hypertension:   { metricLabel: "Blood Pressure", unit: "mmHg",   status: "amber", trend: "stable" },
  ckd:            { metricLabel: "eGFR",           unit: "mL/min", status: "amber", trend: "stable" },
  copd:           { metricLabel: "Peak Flow",      unit: "L/min",  status: "green", trend: "stable" },
  chf:            { metricLabel: "Heart Rate",     unit: "bpm",    status: "green", trend: "stable" },
  cad:            { metricLabel: "Heart Rate",     unit: "bpm",    status: "green", trend: "stable" },
  hypothyroidism: { metricLabel: "TSH",            unit: "mIU/L",  status: "green", trend: "stable" },
  ra:             { metricLabel: "DAS28 Score",    unit: "",       status: "green", trend: "down" },
  asthma:         { metricLabel: "Peak Flow",      unit: "%",      status: "green", trend: "stable" },
};

const METRIC_VALUES: Record<ConditionId, string> = {
  diabetes_t2: "142",
  diabetes_t1: "142",
  hypertension: "138/88",
  ckd: "48",
  copd: "380",
  chf: "74",
  cad: "74",
  hypothyroidism: "4.2",
  ra: "3.4",
  asthma: "82",
};

export default function ConditionsPage() {
  const { patient } = getMockDashboardData();
  const [myConditionIds, setMyConditionIds] = useState<ConditionId[]>([]);
  const [tab, setTab] = useState<"mine" | "all">("mine");
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Hydrate from localStorage on client-side to prevent Next.js mismatch
  useEffect(() => {
    const saved = localStorage.getItem("tracked_conditions");
    if (saved) {
      setMyConditionIds(JSON.parse(saved));
    } else {
      const initial = patient.conditions;
      setMyConditionIds(initial);
      localStorage.setItem("tracked_conditions", JSON.stringify(initial));
    }
  }, [patient.conditions]);

  const addCondition = (id: ConditionId) => {
    if (!myConditionIds.includes(id)) {
      const updated = [...myConditionIds, id];
      setMyConditionIds(updated);
      localStorage.setItem("tracked_conditions", JSON.stringify(updated));
    }
  };

  const removeCondition = (id: ConditionId) => {
    const updated = myConditionIds.filter((cid) => cid !== id);
    setMyConditionIds(updated);
    localStorage.setItem("tracked_conditions", JSON.stringify(updated));
  };

  const conditionSummaries = myConditionIds.map((cId) => {
    const c = conditionColors[cId];
    const meta = METRIC_METADATA[cId];
    const val = METRIC_VALUES[cId];
    return {
      conditionId: cId,
      label: c?.label ?? "",
      metricLabel: meta?.metricLabel ?? "Metric",
      metricValue: val ?? "--",
      unit: meta?.unit ?? "",
      trend: meta?.trend ?? "stable",
      status: meta?.status ?? "green",
      color: c?.accent ?? "#6C5CE7",
      bgColor: c?.bg ?? "#F0EFF8",
      iconEmoji: c?.emoji ?? "🩺",
    } as ConditionSummary;
  });

  const TrendIcon = (trend: "up" | "down" | "stable") =>
    trend === "down" ? TrendingDown : trend === "up" ? TrendingUp : Minus;

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto px-4 lg:px-6 py-6">

        {/* Header */}
        <div className="flex items-start justify-between mb-6 animate-fade-in">
          <div>
            <h1 className="font-bold text-display text-text-primary">My Conditions</h1>
            <p className="text-body-md text-text-secondary mt-1">
              Managing {myConditionIds.length} chronic condition{myConditionIds.length !== 1 ? "s" : ""}
            </p>
          </div>
          <button
            onClick={() => setAddModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-dashed border-accent-lavender text-accent-violet text-label-sm font-semibold hover:bg-bg-lavender transition-all"
          >
            <Plus size={15} aria-hidden="true" />
            Add Condition
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-bg-card rounded-xl shadow-card mb-6">
          {(["mine", "all"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={clsx("flex-1 py-2.5 rounded-lg text-label-sm font-semibold transition-all",
                tab === t ? "gradient-violet text-white shadow-sm" : "text-text-secondary hover:text-text-primary"
              )}
            >
              {t === "mine" ? `My Conditions (${myConditionIds.length})` : "All Supported Conditions"}
            </button>
          ))}
        </div>

        {/* My conditions tab */}
        {tab === "mine" && (
          <div className="space-y-3">
            {/* Quick tiles grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
              {conditionSummaries.map((s) => (
                <Link href={`/conditions/${s.conditionId}`} key={s.conditionId} className="block hover:scale-[1.01] transition-transform">
                  <ConditionTile summary={s} />
                </Link>
              ))}
            </div>

            {/* Detail cards */}
            {myConditionIds.map((cId) => {
              const c = conditionColors[cId];
              const detail = CONDITION_DETAILS[cId];
              if (!c || !detail) return null;
              const Icon = TrendIcon(detail.weekTrend);
              const trendColor = detail.weekTrend === "down" ? "#00B894" : detail.weekTrend === "up" ? "#D63031" : "#8888A8";
              return (
                <Link
                  key={cId}
                  href={`/conditions/${cId}`}
                  className="block bg-bg-card rounded-xl shadow-card p-4 card-enter hover:shadow-card-hover transition-all group"
                >
                  <div className="flex items-start gap-4">
                    {/* Icon */}
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
                      style={{ background: c.bg }}>
                      {c.emoji}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="font-semibold text-title-md text-text-primary group-hover:text-accent-violet transition-colors">
                            {c.label}
                          </h3>
                          <p className="text-xs text-text-secondary mt-0.5 leading-snug">{detail.description}</p>
                        </div>
                        <ChevronRight size={16} className="text-text-tertiary group-hover:text-accent-violet transition-colors flex-shrink-0 mt-0.5" />
                      </div>

                      <div className="flex items-center gap-4 mt-3">
                        {/* Key metric */}
                        <div>
                          <p className="text-xs text-text-tertiary mb-0.5">Latest</p>
                          <p className="font-bold metric-value text-text-primary" style={{ color: c.accent, fontSize: "15px" }}>
                            {detail.keyMetric}
                          </p>
                        </div>
                        {/* Last updated */}
                        <div>
                          <p className="text-xs text-text-tertiary mb-0.5">Updated</p>
                          <p className="text-label-sm text-text-secondary">{detail.lastUpdated}</p>
                        </div>
                        {/* Week trend */}
                        <div className="ml-auto flex items-center gap-1">
                          <Icon size={14} style={{ color: trendColor }} aria-hidden="true" />
                          <span className="text-xs font-semibold capitalize" style={{ color: trendColor }}>
                            {detail.weekTrend === "down" ? "Improving" : detail.weekTrend === "up" ? "Worsening" : "Stable"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {/* All conditions tab */}
        {tab === "all" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {ALL_AVAILABLE.map((cId) => {
              const c = conditionColors[cId];
              const isTracking = myConditionIds.includes(cId);
              if (!c) return null;
              return (
                <div key={cId}
                  className={clsx(
                    "bg-bg-card rounded-xl p-4 shadow-card card-enter flex items-center gap-3",
                    isTracking && "border border-accent-lavender/40"
                  )}
                >
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0" style={{ background: c.bg }}>
                    {c.emoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-label-sm text-text-primary">{c.label}</p>
                    <p className="text-xs text-text-tertiary mt-0.5">{CONDITION_DETAILS[cId]?.description ?? "Chronic condition tracking"}</p>
                  </div>
                  {isTracking ? (
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <span className="text-xs font-semibold text-accent-violet bg-bg-lavender px-2.5 py-1 rounded-full">
                        Tracking
                      </span>
                      <button
                        onClick={() => removeCondition(cId)}
                        className="text-[10px] font-semibold text-status-red hover:underline ml-1"
                        title="Stop tracking"
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => addCondition(cId)}
                      className="text-xs font-semibold text-text-tertiary hover:text-accent-violet hover:bg-bg-lavender px-2.5 py-1 rounded-full transition-all flex-shrink-0"
                    >
                      + Add
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div className="h-8" />

        {/* Add Condition Modal */}
        {addModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
            {/* Modal Container */}
            <div
              className="bg-bg-card rounded-2xl w-full max-w-lg border border-divider shadow-2xl flex flex-col overflow-hidden max-h-[85vh] animate-scale-up"
              style={{ boxShadow: "0 20px 50px rgba(108,92,231,0.2)" }}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-divider bg-bg-lavender/10">
                <div>
                  <h2 className="font-bold text-title-lg text-text-primary">Add Health Condition</h2>
                  <p className="text-xs text-text-tertiary mt-0.5">Select a chronic condition to start tracking</p>
                </div>
                <button
                  onClick={() => setAddModalOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-bg-lavender text-text-secondary hover:text-text-primary transition-colors"
                  aria-label="Close modal"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Search Bar */}
              <div className="px-5 py-3 border-b border-divider bg-bg-light/40 flex items-center gap-2">
                <Search size={16} className="text-text-tertiary" />
                <input
                  type="text"
                  placeholder="Search conditions..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-transparent border-0 outline-none text-label-sm text-text-primary placeholder:text-text-tertiary w-full focus:ring-0"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="text-text-tertiary hover:text-text-primary p-0.5"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              {/* Scrollable list */}
              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {(() => {
                  const filtered = ALL_AVAILABLE.filter((cId) => {
                    const c = conditionColors[cId];
                    if (!c) return false;
                    return c.label.toLowerCase().includes(searchQuery.toLowerCase());
                  });

                  if (filtered.length === 0) {
                    return (
                      <div className="text-center py-10 text-text-tertiary">
                        <p className="text-xs font-semibold">No conditions found matching "{searchQuery}"</p>
                      </div>
                    );
                  }

                  return filtered.map((cId) => {
                    const c = conditionColors[cId];
                    const isTracking = myConditionIds.includes(cId);
                    if (!c) return null;

                    return (
                      <div
                        key={cId}
                        className={clsx(
                          "flex items-center gap-3 p-3 rounded-xl border transition-all duration-150",
                          isTracking
                            ? "bg-bg-lavender/20 border-accent-lavender/35"
                            : "bg-bg-card border-divider hover:border-accent-lavender hover:bg-bg-lavender/5"
                        )}
                      >
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                          style={{ background: c.bg }}
                        >
                          {c.emoji}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-label-sm text-text-primary">{c.label}</p>
                          <p className="text-[11px] text-text-tertiary truncate">{CONDITION_DETAILS[cId]?.description ?? "Chronic condition tracking"}</p>
                        </div>
                        {isTracking ? (
                          <div className="flex flex-col items-end gap-1 flex-shrink-0">
                            <span className="text-xs font-semibold text-accent-violet bg-bg-lavender px-2.5 py-1 rounded-full">
                              Tracking
                            </span>
                            <button
                              onClick={() => removeCondition(cId)}
                              className="text-[10px] font-semibold text-status-red hover:underline"
                            >
                              Remove
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => addCondition(cId)}
                            className="text-xs font-bold text-white gradient-violet px-3 py-1.5 rounded-full shadow-sm hover:opacity-90 active:scale-95 transition-all flex-shrink-0"
                          >
                            + Track
                          </button>
                        )}
                      </div>
                    );
                  });
                })()}
              </div>

              {/* Footer */}
              <div className="px-5 py-3.5 border-t border-divider bg-bg-light/35 flex justify-end gap-2">
                <button
                  onClick={() => setAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-divider text-label-sm font-semibold text-text-secondary hover:bg-bg-lavender transition-all"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
