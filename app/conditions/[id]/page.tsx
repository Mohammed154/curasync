"use client";

import React, { useState } from "react";
import AppShell from "@/components/layout/AppShell";
import GlucoseChart from "@/components/charts/GlucoseChart";
import GlucoseLogChart from "@/components/charts/GlucoseLogChart";
import { getMockDashboardData, generateSparklinePublic, getMockGlucoseLog } from "@/lib/mock-data";
import { conditionColors } from "@/lib/design-tokens";
import type { ConditionId } from "@/types";
import { ArrowLeft, TrendingDown, TrendingUp, Minus, Clock, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { clsx } from "clsx";

const CONDITION_METRICS: Record<string, {
  primary: { label: string; value: string; unit: string; status: "green" | "amber" | "red" };
  secondary: { label: string; value: string; unit: string }[];
  chartLabel: string;
}> = {
  diabetes_t2: {
    primary: { label: "Blood Glucose", value: "142", unit: "mg/dL", status: "amber" },
    secondary: [
      { label: "HbA1c", value: "7.4", unit: "%" },
      { label: "Fasting (avg)", value: "128", unit: "mg/dL" },
      { label: "Post-meal (avg)", value: "168", unit: "mg/dL" },
      { label: "Time in Range", value: "64", unit: "%" },
    ],
    chartLabel: "24-hour glucose trend",
  },
  hypertension: {
    primary: { label: "Blood Pressure", value: "138/88", unit: "mmHg", status: "amber" },
    secondary: [
      { label: "Systolic avg", value: "136", unit: "mmHg" },
      { label: "Diastolic avg", value: "87", unit: "mmHg" },
      { label: "Pulse pressure", value: "50", unit: "mmHg" },
      { label: "Readings this week", value: "14", unit: "" },
    ],
    chartLabel: "7-day BP trend",
  },
  ckd: {
    primary: { label: "eGFR", value: "48", unit: "mL/min/1.73m²", status: "amber" },
    secondary: [
      { label: "Creatinine", value: "1.6", unit: "mg/dL" },
      { label: "BUN", value: "22", unit: "mg/dL" },
      { label: "Stage", value: "3A", unit: "" },
      { label: "Last lab", value: "Apr 10", unit: "" },
    ],
    chartLabel: "eGFR trend (6 months)",
  },
};

const STATUS_CONFIG = {
  green: { label: "Normal", color: "#00B894", bg: "#E8F8F5" },
  amber: { label: "Monitor", color: "#F39C12", bg: "#FEF9E7" },
  red:   { label: "Alert",  color: "#D63031", bg: "#FDECEA" },
};

interface Props {
  params: Promise<{ id: string }>;
}

export default function ConditionDetailPage({ params }: Props) {
  const { id } = React.use(params);
  const conditionId = id as ConditionId;
  const { todayMedications, recentReadings } = getMockDashboardData();
  const colors = conditionColors[conditionId];
  const metrics = CONDITION_METRICS[conditionId];
  const condMeds = todayMedications.filter((m) => m.conditionId === conditionId);
  const [timeRange, setTimeRange] = useState<"7d" | "30d" | "90d">("7d");

  if (!colors || !metrics) {
    return (
      <AppShell>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <p className="text-text-tertiary">Condition not found.</p>
            <Link href="/dashboard" className="text-accent-violet font-semibold text-sm mt-2 block">← Back to Dashboard</Link>
          </div>
        </div>
      </AppShell>
    );
  }

  const statusCfg = STATUS_CONFIG[metrics.primary.status];

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto px-4 lg:px-6 py-6 space-y-5">
        {/* Back + header */}
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="w-9 h-9 rounded-xl flex items-center justify-center bg-bg-card border border-divider shadow-card hover:bg-bg-lavender transition-colors"
            aria-label="Back"
          >
            <ArrowLeft size={17} className="text-text-secondary" />
          </Link>
          <div className="flex-1">
            <h1 className="font-bold text-title-lg text-text-primary">
              {colors.emoji} {colors.label}
            </h1>
            <p className="text-xs text-text-tertiary">Condition overview</p>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full" style={{ background: statusCfg.bg }}>
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: statusCfg.color }} aria-hidden="true" />
            <span className="text-xs font-semibold" style={{ color: statusCfg.color }}>{statusCfg.label}</span>
          </div>
        </div>

        {/* Hero metric */}
        <div
          className="rounded-xl p-5 animate-fade-in"
          style={{ background: colors.bg }}
        >
          <p className="text-xs font-semibold text-text-tertiary uppercase tracking-widest mb-2">{metrics.primary.label}</p>
          <div className="flex items-end gap-2 mb-1">
            <span className="font-bold metric-value text-text-primary" style={{ fontSize: "clamp(32px, 6vw, 44px)", lineHeight: 1 }}>
              {metrics.primary.value}
            </span>
            <span className="text-text-tertiary text-sm mb-1.5">{metrics.primary.unit}</span>
          </div>
          <div className="flex items-center gap-1.5 text-sm" style={{ color: colors.accent }}>
            <TrendingDown size={14} aria-hidden="true" />
            <span className="font-medium">Trending down — improving</span>
          </div>
        </div>

        {/* Secondary metrics grid */}
        <div className="grid grid-cols-2 gap-3">
          {metrics.secondary.map((m) => (
            <div key={m.label} className="bg-bg-card rounded-xl p-4 shadow-card card-enter">
              <p className="text-xs text-text-tertiary mb-1">{m.label}</p>
              <div className="flex items-baseline gap-1">
                <span className="font-bold text-xl metric-value text-text-primary">{m.value}</span>
                {m.unit && <span className="text-xs text-text-tertiary">{m.unit}</span>}
              </div>
            </div>
          ))}
        </div>

        {/* Chart with time range selector */}
        <div className="bg-bg-card rounded-xl shadow-card overflow-hidden">
          <div className="flex items-center justify-between px-4 pt-4 pb-2">
            <h3 className="font-semibold text-title-md text-text-primary">{metrics.chartLabel}</h3>
            <div className="flex gap-1 p-0.5 bg-bg-light rounded-lg">
              {(["7d", "30d", "90d"] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => setTimeRange(r)}
                  className={clsx(
                    "px-2.5 py-1 rounded-md text-xs font-semibold transition-all",
                    timeRange === r ? "bg-accent-violet text-white" : "text-text-tertiary hover:text-text-primary"
                  )}
                  aria-pressed={timeRange === r}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
          <div className="px-4 pb-4">
            <GlucoseChart data={recentReadings} />
          </div>
        </div>

        {/* Glucose Log (only for diabetes) */}
        {(conditionId === "diabetes_t2" || conditionId === "diabetes_t1") && (
          <section aria-labelledby="glucose-log-detail-heading">
            <h3 id="glucose-log-detail-heading" className="font-semibold text-title-md text-text-primary mb-3">
              Glucose Daily Log
            </h3>
            <GlucoseLogChart
              entries={getMockGlucoseLog()}
              showLogTable={true}
              showSecondaryChart={true}
            />
          </section>
        )}

        {/* Medications for this condition */}
        {condMeds.length > 0 && (
          <div className="bg-bg-card rounded-xl shadow-card overflow-hidden">
            <div className="px-4 py-3 border-b border-divider">
              <h3 className="font-semibold text-title-md text-text-primary">Medications for {colors.label}</h3>
            </div>
            {condMeds.map((med, i) => (
              <div key={med.id} className={clsx("flex items-center gap-3 px-4 py-3", i < condMeds.length - 1 && "border-b border-divider")}>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: colors.bg }}>
                  <span style={{ color: colors.accent }} className="font-bold text-xs">{med.name[0]}</span>
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-label-sm text-text-primary">{med.name} {med.dosage}</p>
                  <p className="text-xs text-text-tertiary flex items-center gap-1">
                    <Clock size={10} aria-hidden="true" /> {med.scheduledAt}
                  </p>
                </div>
                <div className="flex items-center gap-1 px-2.5 py-1 rounded-full" style={{ background: med.status === "taken" ? "#E8F8F5" : "#F0EFF8" }}>
                  {med.status === "taken"
                    ? <CheckCircle2 size={12} style={{ color: "#00B894" }} aria-hidden="true" />
                    : <Clock size={12} style={{ color: "#A29BFE" }} aria-hidden="true" />
                  }
                  <span className="text-xs font-semibold capitalize" style={{ color: med.status === "taken" ? "#00B894" : "#A29BFE" }}>
                    {med.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Reference ranges */}
        <div className="bg-bg-card rounded-xl shadow-card p-4">
          <h3 className="font-semibold text-title-md text-text-primary mb-3">Reference Ranges</h3>
          {conditionId === "diabetes_t2" && (
            <div className="space-y-2">
              {[
                { range: "70–99 mg/dL", label: "Fasting — Normal", color: "#00B894" },
                { range: "100–125 mg/dL", label: "Fasting — Pre-diabetic", color: "#FDCB6E" },
                { range: "≥126 mg/dL", label: "Fasting — Diabetic", color: "#D63031" },
                { range: "< 180 mg/dL", label: "2hr post-meal target", color: "#00B894" },
              ].map((r) => (
                <div key={r.label} className="flex items-center justify-between py-1.5 border-b border-divider last:border-0">
                  <span className="text-xs text-text-secondary">{r.label}</span>
                  <span className="text-xs font-semibold" style={{ color: r.color }}>{r.range}</span>
                </div>
              ))}
            </div>
          )}
          {conditionId === "hypertension" && (
            <div className="space-y-2">
              {[
                { range: "< 120/80", label: "Normal", color: "#00B894" },
                { range: "120–129 / <80", label: "Elevated", color: "#55EFC4" },
                { range: "130–139 / 80–89", label: "Stage 1 High BP", color: "#FDCB6E" },
                { range: "≥ 140 / ≥90", label: "Stage 2 High BP", color: "#E17055" },
                { range: "> 180 / > 120", label: "Hypertensive Crisis", color: "#D63031" },
              ].map((r) => (
                <div key={r.label} className="flex items-center justify-between py-1.5 border-b border-divider last:border-0">
                  <span className="text-xs text-text-secondary">{r.label}</span>
                  <span className="text-xs font-semibold" style={{ color: r.color }}>{r.range}</span>
                </div>
              ))}
            </div>
          )}
          {conditionId === "ckd" && (
            <div className="space-y-2">
              {[
                { range: "≥ 90", label: "Stage 1 — Kidney damage, normal function", color: "#00B894" },
                { range: "60–89", label: "Stage 2 — Mildly reduced", color: "#55EFC4" },
                { range: "45–59", label: "Stage 3A — Mildly to moderately reduced", color: "#FDCB6E" },
                { range: "30–44", label: "Stage 3B — Moderately to severely reduced", color: "#E17055" },
                { range: "15–29", label: "Stage 4 — Severely reduced", color: "#D63031" },
                { range: "< 15", label: "Stage 5 — Kidney failure", color: "#D63031" },
              ].map((r) => (
                <div key={r.label} className="flex items-center justify-between py-1.5 border-b border-divider last:border-0">
                  <span className="text-xs text-text-secondary">{r.label}</span>
                  <span className="text-xs font-semibold metric-value" style={{ color: r.color }}>{r.range} mL/min</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="h-8" />
      </div>
    </AppShell>
  );
}
