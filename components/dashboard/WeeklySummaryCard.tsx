"use client";

import React, { useState } from "react";
import { Sparkles, ChevronDown, ChevronUp, TrendingDown, TrendingUp, Minus } from "lucide-react";
import { clsx } from "clsx";

export interface WeeklyMetric {
  label: string;
  thisWeek: string;
  lastWeek?: string;
  trend: "better" | "worse" | "stable";
  unit: string;
}

export interface WeeklySummaryCardProps {
  patientName?: string;
  weekOf: string;
  adherence: number;
  adherenceDelta?: number; // +/- vs last week
  metrics: WeeklyMetric[];
  narrativeSentences: string[];
}

const TREND_CONFIG = {
  better: { icon: TrendingDown, color: "#00B894", label: "Improved" },
  worse:  { icon: TrendingUp,   color: "#D63031", label: "Worsened" },
  stable: { icon: Minus,        color: "#8888A8", label: "Stable" },
};

// Default empty weekly summary fallback
export const DEFAULT_WEEKLY_SUMMARY: WeeklySummaryCardProps = {
  patientName: "Your",
  weekOf: "This Week",
  adherence: 100,
  metrics: [
    { label: "Avg Blood Glucose", thisWeek: "--", trend: "stable", unit: "mg/dL" },
    { label: "Avg Blood Pressure", thisWeek: "--", trend: "stable", unit: "mmHg" },
    { label: "Avg Heart Rate", thisWeek: "--", trend: "stable", unit: "bpm" },
    { label: "Readings Logged", thisWeek: "0", trend: "stable", unit: "readings" },
  ],
  narrativeSentences: [
    "No readings logged yet this week. Log your biometrics to see personalized trends and insights.",
    "Track your medications and daily readings to keep your care team informed.",
  ],
};

export default function WeeklySummaryCard({
  patientName,
  weekOf,
  adherence,
  adherenceDelta,
  metrics,
  narrativeSentences,
}: WeeklySummaryCardProps) {
  const [expanded, setExpanded] = useState(false);

  const title = !patientName || patientName.toLowerCase() === "your"
    ? "Your Week in Review"
    : patientName.endsWith("s")
    ? `${patientName}' Week in Review`
    : `${patientName}'s Week in Review`;

  return (
    <div className="bg-bg-card rounded-xl shadow-card overflow-hidden card-enter">
      {/* Header */}
      <div
        className="px-4 py-4"
        style={{ background: "linear-gradient(135deg, #1A1A2E 0%, #2D2B55 100%)" }}
      >
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <Sparkles size={13} className="text-accent-lavender" aria-hidden="true" />
              <p className="text-xs font-semibold text-accent-lavender uppercase tracking-widest">
                Weekly Summary
              </p>
            </div>
            <h3 className="font-bold text-white text-lg leading-tight">
              {title}
            </h3>
            <p className="text-white/50 text-xs mt-0.5">{weekOf}</p>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-white/50 text-xs mb-0.5">Adherence</p>
            <p className="font-bold text-white metric-value" style={{ fontSize: "22px" }}>
              {adherence}%
            </p>
            {adherenceDelta !== undefined && adherenceDelta !== 0 && (
              <p className={clsx("text-xs font-semibold", adherenceDelta >= 0 ? "text-green-400" : "text-red-400")}>
                {adherenceDelta >= 0 ? "+" : ""}{adherenceDelta}% vs last week
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Narrative */}
      <div className="px-4 py-4 bg-bg-lavender/40 border-b border-divider">
        <p className="text-text-primary text-sm leading-relaxed">
          {narrativeSentences[0] || "Track your daily biometrics and medications to view your weekly health summary."}
        </p>
        {expanded && narrativeSentences.slice(1).map((sentence, i) => (
          <p key={i} className="text-text-secondary text-sm leading-relaxed mt-2">
            {sentence}
          </p>
        ))}
        {narrativeSentences.length > 1 && (
          <button
            onClick={() => setExpanded((v) => !v)}
            className="flex items-center gap-1 text-accent-violet text-xs font-semibold mt-2 hover:text-accent-lavender transition-colors"
            aria-expanded={expanded}
          >
            {expanded ? <><ChevronUp size={13} />Show less</> : <><ChevronDown size={13} />Read full summary</>}
          </button>
        )}
      </div>

      {/* Metrics comparison table */}
      <div className="px-4 py-3">
        <div className="grid grid-cols-2 gap-2">
          {metrics.map((m) => {
            const cfg = TREND_CONFIG[m.trend] || TREND_CONFIG.stable;
            const Icon = cfg.icon;
            const trendLabel = m.thisWeek === "--" ? "No data" : cfg.label;

            return (
              <div key={m.label} className="p-3 rounded-lg bg-bg-light">
                <p className="text-xs text-text-tertiary mb-1">{m.label}</p>
                <div className="flex items-end gap-1.5">
                  <span className="font-bold metric-value text-text-primary" style={{ fontSize: "18px", lineHeight: 1.1 }}>
                    {m.thisWeek}
                  </span>
                  <span className="text-xs text-text-tertiary mb-0.5">{m.unit}</span>
                </div>
                <div className="flex items-center gap-1 mt-1">
                  <Icon size={11} style={{ color: cfg.color }} aria-hidden="true" />
                  <span className="text-xs font-medium" style={{ color: cfg.color }}>
                    {trendLabel}
                  </span>
                  {m.lastWeek ? (
                    <span className="text-xs text-text-tertiary">· was {m.lastWeek}</span>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
