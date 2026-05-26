"use client";

import React, { useState } from "react";
import { clsx } from "clsx";
import { conditionColors } from "@/lib/design-tokens";
import type { ConditionId } from "@/types";

interface SymptomFrequency {
  symptom: string;
  conditionId: ConditionId;
  count: number; // occurrences in last 30 days
  lastOccurred: string;
  avgSeverity: number; // 1–10
}

const MOCK_SYMPTOM_FREQ: SymptomFrequency[] = [
  { symptom: "Excessive thirst",    conditionId: "diabetes_t2",  count: 18, lastOccurred: "Today",    avgSeverity: 5 },
  { symptom: "Blurred vision",      conditionId: "diabetes_t2",  count: 7,  lastOccurred: "3 days ago", avgSeverity: 4 },
  { symptom: "Fatigue",             conditionId: "diabetes_t2",  count: 14, lastOccurred: "Yesterday", avgSeverity: 6 },
  { symptom: "Headache",            conditionId: "hypertension", count: 9,  lastOccurred: "2 days ago", avgSeverity: 5 },
  { symptom: "Dizziness",           conditionId: "hypertension", count: 11, lastOccurred: "Today",    avgSeverity: 4 },
  { symptom: "Ankle swelling",      conditionId: "ckd",          count: 6,  lastOccurred: "4 days ago", avgSeverity: 5 },
  { symptom: "Nausea",              conditionId: "ckd",          count: 4,  lastOccurred: "1 week ago", avgSeverity: 3 },
  { symptom: "Tingling in feet",    conditionId: "diabetes_t2",  count: 8,  lastOccurred: "Yesterday", avgSeverity: 3 },
];

const MAX_COUNT = Math.max(...MOCK_SYMPTOM_FREQ.map((s) => s.count));

function severityColor(avg: number): string {
  if (avg >= 7) return "#D63031";
  if (avg >= 5) return "#FDCB6E";
  return "#00B894";
}

interface Props {
  symptoms?: SymptomFrequency[];
}

export default function SymptomHeatmap({ symptoms = MOCK_SYMPTOM_FREQ }: Props) {
  const [filterCondition, setFilterCondition] = useState<ConditionId | "all">("all");

  const conditions = [...new Set(symptoms.map((s) => s.conditionId))] as ConditionId[];

  const filtered = filterCondition === "all"
    ? symptoms
    : symptoms.filter((s) => s.conditionId === filterCondition);

  const sorted = [...filtered].sort((a, b) => b.count - a.count);

  return (
    <div className="bg-bg-card rounded-xl shadow-card overflow-hidden">
      <div className="px-4 py-3 border-b border-divider">
        <h3 className="font-semibold text-title-md text-text-primary">Symptom Frequency</h3>
        <p className="text-xs text-text-tertiary mt-0.5">Last 30 days — logged by patient</p>
      </div>

      {/* Condition filter */}
      <div className="flex gap-1.5 px-4 pt-3 pb-2 flex-wrap">
        <button
          onClick={() => setFilterCondition("all")}
          className={clsx(
            "px-2.5 py-1 rounded-full text-xs font-semibold border transition-all",
            filterCondition === "all"
              ? "bg-accent-violet text-white border-accent-violet"
              : "border-divider text-text-secondary hover:border-accent-lavender"
          )}
          aria-pressed={filterCondition === "all"}
        >
          All
        </button>
        {conditions.map((cId) => {
          const c = conditionColors[cId];
          return (
            <button
              key={cId}
              onClick={() => setFilterCondition(cId)}
              className={clsx(
                "px-2.5 py-1 rounded-full text-xs font-semibold border transition-all"
              )}
              style={filterCondition === cId
                ? { background: c?.bg, color: c?.accent, borderColor: c?.accent }
                : { borderColor: "#E2E0F0", color: "#8888A8" }
              }
              aria-pressed={filterCondition === cId}
            >
              {c?.emoji} {c?.label.split(" ")[0]}
            </button>
          );
        })}
      </div>

      {/* Heatmap bars */}
      <div className="px-4 pb-4 space-y-2.5">
        {sorted.length === 0 && (
          <p className="text-label-sm text-text-tertiary py-4 text-center">No symptoms logged for this condition.</p>
        )}
        {sorted.map((s) => {
          const c = conditionColors[s.conditionId];
          const barWidth = (s.count / MAX_COUNT) * 100;
          const sColor = severityColor(s.avgSeverity);

          return (
            <div key={s.symptom}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm" aria-hidden="true">{c?.emoji}</span>
                  <span className="text-label-sm font-medium text-text-primary">{s.symptom}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-text-tertiary">
                  <span
                    className="font-semibold"
                    style={{ color: sColor }}
                    aria-label={`Average severity ${s.avgSeverity} out of 10`}
                  >
                    {s.avgSeverity}/10
                  </span>
                  <span>{s.count}×</span>
                </div>
              </div>
              <div className="h-2.5 bg-bg-light rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${barWidth}%`,
                    background: `linear-gradient(90deg, ${c?.accent ?? "#6C5CE7"} 0%, ${sColor} 100%)`,
                    opacity: 0.85,
                  }}
                  aria-valuenow={s.count}
                  aria-valuemax={MAX_COUNT}
                  role="meter"
                  aria-label={`${s.symptom}: ${s.count} times`}
                />
              </div>
              <p className="text-xs text-text-tertiary mt-0.5">Last: {s.lastOccurred}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
