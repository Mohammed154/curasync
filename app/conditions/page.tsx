"use client";

import React, { useState } from "react";
import AppShell from "@/components/layout/AppShell";
import ConditionTile from "@/components/patient/ConditionTile";
import { getMockDashboardData } from "@/lib/mock-data";
import { conditionColors } from "@/lib/design-tokens";
import type { ConditionId, ConditionSummary } from "@/types";
import Link from "next/link";
import { Plus, TrendingDown, TrendingUp, Minus, ChevronRight, Activity } from "lucide-react";
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

export default function ConditionsPage() {
  const { conditionSummaries, patient } = getMockDashboardData();
  const myConditionIds = patient.conditions;
  const [tab, setTab] = useState<"mine" | "all">("mine");

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
          <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-dashed border-accent-lavender text-accent-violet text-label-sm font-semibold hover:bg-bg-lavender transition-all">
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
                    <span className="text-xs font-semibold text-accent-violet bg-bg-lavender px-2.5 py-1 rounded-full flex-shrink-0">
                      Tracking
                    </span>
                  ) : (
                    <button className="text-xs font-semibold text-text-tertiary hover:text-accent-violet hover:bg-bg-lavender px-2.5 py-1 rounded-full transition-all flex-shrink-0">
                      + Add
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div className="h-8" />
      </div>
    </AppShell>
  );
}
