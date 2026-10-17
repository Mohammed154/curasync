"use client";

import React, { useState } from "react";
import AppShell from "@/components/layout/AppShell";
import GlucoseChart from "@/components/charts/GlucoseChart";
import GlucoseLogChart from "@/components/charts/GlucoseLogChart";
import { conditionColors } from "@/lib/design-tokens";
import type { ConditionId, SparklinePoint } from "@/types";
import { ArrowLeft, TrendingDown, TrendingUp, Minus, Clock, CheckCircle2, Activity, Pill, Plus } from "lucide-react";
import Link from "next/link";
import { clsx } from "clsx";
import { useReadings, useMedications } from "@/hooks/useApi";
import type { GlucoseLogEntry, GlucoseReadingType } from "@/lib/glucose-utils";
import { getGlucoseStatus } from "@/lib/glucose-utils";

interface ConditionMetricTemplate {
  primary: { label: string; unit: string; vitalType: string };
  secondary: { label: string; unit: string; key?: string }[];
  chartLabel: string;
}

const CONDITION_METRICS: Record<string, ConditionMetricTemplate> = {
  diabetes_t2: {
    primary: { label: "Blood Glucose", unit: "mg/dL", vitalType: "blood_glucose" },
    secondary: [
      { label: "HbA1c", unit: "%", key: "hba1c" },
      { label: "Fasting (avg)", unit: "mg/dL", key: "fasting_avg" },
      { label: "Post-meal (avg)", unit: "mg/dL", key: "post_meal_avg" },
      { label: "Time in Range", unit: "%", key: "tir" },
    ],
    chartLabel: "24-hour glucose trend",
  },
  diabetes_t1: {
    primary: { label: "Blood Glucose", unit: "mg/dL", vitalType: "blood_glucose" },
    secondary: [
      { label: "HbA1c", unit: "%", key: "hba1c" },
      { label: "Fasting (avg)", unit: "mg/dL", key: "fasting_avg" },
      { label: "Post-meal (avg)", unit: "mg/dL", key: "post_meal_avg" },
      { label: "Time in Range", unit: "%", key: "tir" },
    ],
    chartLabel: "24-hour glucose trend",
  },
  hypertension: {
    primary: { label: "Blood Pressure", unit: "mmHg", vitalType: "blood_pressure" },
    secondary: [
      { label: "Systolic avg", unit: "mmHg", key: "systolic_avg" },
      { label: "Diastolic avg", unit: "mmHg", key: "diastolic_avg" },
      { label: "Pulse pressure", unit: "mmHg", key: "pulse_pressure" },
      { label: "Readings this week", unit: "", key: "week_count" },
    ],
    chartLabel: "7-day BP trend",
  },
  ckd: {
    primary: { label: "eGFR", unit: "mL/min/1.73m²", vitalType: "egfr" },
    secondary: [
      { label: "Creatinine", unit: "mg/dL", key: "creatinine" },
      { label: "BUN", unit: "mg/dL", key: "bun" },
      { label: "Stage", unit: "", key: "stage" },
      { label: "Last lab", unit: "", key: "last_lab" },
    ],
    chartLabel: "eGFR trend (6 months)",
  },
  copd: {
    primary: { label: "FEV1", unit: "%", vitalType: "fev1" },
    secondary: [
      { label: "FEV1/FVC", unit: "%", key: "fev1_fvc" },
      { label: "Activity tolerance", unit: "", key: "activity_tol" },
      { label: "Inhaler use", unit: "/day", key: "inhaler_use" },
      { label: "Last spirometry", unit: "", key: "last_spiro" },
    ],
    chartLabel: "6-month FEV1 trend",
  },
  chf: {
    primary: { label: "Heart Rate", unit: "bpm", vitalType: "heart_rate" },
    secondary: [
      { label: "Ejection Fraction", unit: "%", key: "ef" },
      { label: "Blood Pressure", unit: "mmHg", key: "bp" },
      { label: "Fluid retention", unit: "kg", key: "fluid" },
      { label: "Last BNP lab", unit: "", key: "last_bnp" },
    ],
    chartLabel: "7-day heart rate trend",
  },
  cad: {
    primary: { label: "Heart Rate", unit: "bpm", vitalType: "heart_rate" },
    secondary: [
      { label: "LDL Cholesterol", unit: "mg/dL", key: "ldl" },
      { label: "Blood Pressure", unit: "mmHg", key: "bp" },
      { label: "Readings this week", unit: "", key: "week_count" },
      { label: "Last EKG", unit: "", key: "last_ekg" },
    ],
    chartLabel: "7-day heart rate trend",
  },
  hypothyroidism: {
    primary: { label: "TSH", unit: "mIU/L", vitalType: "tsh" },
    secondary: [
      { label: "Free T4", unit: "ng/dL", key: "free_t4" },
      { label: "Free T3", unit: "pg/mL", key: "free_t3" },
      { label: "Levothyroxine dose", unit: "mcg", key: "levo_dose" },
      { label: "Last lab", unit: "", key: "last_lab" },
    ],
    chartLabel: "TSH trend (6 months)",
  },
  ra: {
    primary: { label: "DAS28 Score", unit: "", vitalType: "das28" },
    secondary: [
      { label: "CRP", unit: "mg/L", key: "crp" },
      { label: "ESR", unit: "mm/hr", key: "esr" },
      { label: "Pain scale (avg)", unit: "/10", key: "pain_avg" },
      { label: "Morning stiffness", unit: "min", key: "morning_stiff" },
    ],
    chartLabel: "DAS28 score trend (6 months)",
  },
  asthma: {
    primary: { label: "Control Test Score", unit: "/25", vitalType: "asthma_control" },
    secondary: [
      { label: "Rescue inhaler use", unit: "/week", key: "rescue_use" },
      { label: "Control test score", unit: "/25", key: "test_score" },
      { label: "Trigger events", unit: "this week", key: "trigger_events" },
      { label: "Last checkup", unit: "", key: "last_checkup" },
    ],
    chartLabel: "Asthma control score trend (6 months)",
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
  const colors = conditionColors[conditionId];
  const metricTemplate = CONDITION_METRICS[conditionId];
  const [timeRange, setTimeRange] = useState<"7d" | "30d" | "90d">("7d");

  const { data: readingsData } = useReadings(undefined, 100);
  const { data: medicationsData } = useMedications();

  const recentReadings: SparklinePoint[] = React.useMemo(() => {
    if (!readingsData || readingsData.length === 0) return [];
    return readingsData
      .filter((r) => r.type === "blood_glucose")
      .slice(0, 15)
      .reverse()
      .map((r: any) => ({
        time: r.recordedAt || r.recorded_at || new Date().toISOString(),
        value: Math.round(parseFloat(r.value)),
      }));
  }, [readingsData]);

  const glucoseLogs: GlucoseLogEntry[] = React.useMemo(() => {
    if (!readingsData || readingsData.length === 0) return [];
    return readingsData
      .filter((r) => r.type === "blood_glucose")
      .map((r: any, idx) => {
        const val = Math.round(parseFloat(r.value));
        const statusMeta = getGlucoseStatus(val, "Fasting");
        return {
          id: r.id || `glog_${idx}`,
          datetime: r.recordedAt || r.recorded_at || new Date().toISOString(),
          glucose: val,
          readingType: "Fasting" as GlucoseReadingType,
          status: statusMeta.status,
          color: statusMeta.color,
          notes: r.notes || undefined,
        };
      });
  }, [readingsData]);

  const condMeds = React.useMemo(() => {
    if (!medicationsData || medicationsData.length === 0) return [];
    return medicationsData
      .filter((m: any) => m.conditionId === conditionId)
      .map((m: any) => ({
        id: m.id,
        name: m.name,
        dosage: m.dosage,
        scheduledAt: m.scheduledTimes?.[0] || "08:00",
        status: m.status || "pending",
        conditionId: m.conditionId,
      }));
  }, [medicationsData, conditionId]);

  // Derive dynamic primary value, status, and trend
  const { primaryValue, primaryStatus, trendText, trendIcon } = React.useMemo(() => {
    if (!metricTemplate) {
      return { primaryValue: "--", primaryStatus: "green" as const, trendText: "No readings logged", trendIcon: "neutral" as const };
    }

    const relevant = (readingsData || []).filter((r) => r.type === metricTemplate.primary.vitalType);
    const latest = relevant[0];
    if (!latest) {
      return { primaryValue: "--", primaryStatus: "green" as const, trendText: "No readings logged yet", trendIcon: "neutral" as const };
    }

    const valNum = parseFloat(latest.value);
    const displayVal = isNaN(valNum) ? String(latest.value) : String(Math.round(valNum));

    let status: "green" | "amber" | "red" = "green";
    if (metricTemplate.primary.vitalType === "blood_glucose" && !isNaN(valNum)) {
      const gStat = getGlucoseStatus(valNum, "Fasting").status;
      if (gStat === "Normal") status = "green";
      else if (gStat === "Elevated") status = "amber";
      else status = "red";
    }

    let trend = "Latest recorded reading";
    let icon: "up" | "down" | "neutral" = "neutral";
    const prev = relevant[1];
    if (prev) {
      const prevNum = parseFloat(prev.value);
      if (!isNaN(valNum) && !isNaN(prevNum)) {
        const diff = valNum - prevNum;
        if (diff < 0) {
          trend = `Trending down (${Math.abs(Math.round(diff))} ${metricTemplate.primary.unit})`;
          icon = "down";
        } else if (diff > 0) {
          trend = `Trending up (+${Math.round(diff)} ${metricTemplate.primary.unit})`;
          icon = "up";
        } else {
          trend = "Stable compared to previous";
          icon = "neutral";
        }
      }
    }

    return { primaryValue: displayVal, primaryStatus: status, trendText: trend, trendIcon: icon };
  }, [metricTemplate, readingsData]);

  // Derive dynamic secondary metrics
  const secondaryMetrics = React.useMemo(() => {
    if (!metricTemplate) return [];

    return metricTemplate.secondary.map((s) => {
      let value = "--";

      if (s.key === "tir" && glucoseLogs.length > 0) {
        const inRange = glucoseLogs.filter((g) => g.glucose >= 70 && g.glucose <= 180).length;
        value = `${Math.round((inRange / glucoseLogs.length) * 100)}`;
      } else if (s.key === "fasting_avg" && glucoseLogs.length > 0) {
        const fasting = glucoseLogs.filter((g) => g.readingType === "Fasting");
        if (fasting.length > 0) {
          const avg = Math.round(fasting.reduce((sum, g) => sum + g.glucose, 0) / fasting.length);
          value = `${avg}`;
        }
      } else if (s.key === "post_meal_avg" && glucoseLogs.length > 0) {
        const postMeal = glucoseLogs.filter((g) => g.readingType === "After Meal" || g.readingType === "Bedtime");
        if (postMeal.length > 0) {
          const avg = Math.round(postMeal.reduce((sum, g) => sum + g.glucose, 0) / postMeal.length);
          value = `${avg}`;
        }
      } else if (s.key === "week_count" && readingsData) {
        const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
        const count = readingsData.filter(
          (r) => (r.type === metricTemplate.primary.vitalType || r.type === "blood_pressure") &&
                 new Date(r.recordedAt || (r as any).recorded_at || Date.now()).getTime() >= oneWeekAgo
        ).length;
        value = `${count}`;
      } else if (s.key && readingsData) {
        const matching = readingsData.find((r) => r.type === s.key);
        if (matching?.value != null) {
          value = String(matching.value);
        }
      }

      return {
        label: s.label,
        value,
        unit: s.unit,
      };
    });
  }, [metricTemplate, glucoseLogs, readingsData]);

  if (!colors || !metricTemplate) {
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

  const statusCfg = STATUS_CONFIG[primaryStatus];

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
          <p className="text-xs font-semibold text-text-tertiary uppercase tracking-widest mb-2">{metricTemplate.primary.label}</p>
          <div className="flex items-end gap-2 mb-1">
            <span className="font-bold metric-value text-text-primary" style={{ fontSize: "clamp(32px, 6vw, 44px)", lineHeight: 1 }}>
              {primaryValue}
            </span>
            <span className="text-text-tertiary text-sm mb-1.5">{metricTemplate.primary.unit}</span>
          </div>
          <div className="flex items-center gap-1.5 text-sm" style={{ color: colors.accent }}>
            {trendIcon === "down" ? (
              <TrendingDown size={14} aria-hidden="true" />
            ) : trendIcon === "up" ? (
              <TrendingUp size={14} aria-hidden="true" />
            ) : (
              <Minus size={14} aria-hidden="true" />
            )}
            <span className="font-medium">{trendText}</span>
          </div>
        </div>

        {/* Secondary metrics grid */}
        <div className="grid grid-cols-2 gap-3">
          {secondaryMetrics.map((m) => (
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
            <h3 className="font-semibold text-title-md text-text-primary">{metricTemplate.chartLabel}</h3>
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
            {recentReadings.length > 0 ? (
              <GlucoseChart data={recentReadings} />
            ) : (
              <div className="text-center py-10 px-4 border border-dashed border-divider rounded-xl">
                <Activity size={28} className="mx-auto text-text-tertiary mb-2" />
                <p className="font-semibold text-sm text-text-primary">No readings recorded yet</p>
                <p className="text-xs text-text-secondary mt-1 max-w-sm mx-auto">
                  Log your first biometric reading to populate interactive trend graphs and clinical analysis.
                </p>
                <Link
                  href="/glucose"
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 mt-3 rounded-lg gradient-violet text-white text-xs font-semibold shadow-sm hover:opacity-95"
                >
                  <Plus size={13} />
                  <span>Log Reading</span>
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Glucose Log (only for diabetes) */}
        {(conditionId === "diabetes_t2" || conditionId === "diabetes_t1") && (
          <section aria-labelledby="glucose-log-detail-heading">
            <h3 id="glucose-log-detail-heading" className="font-semibold text-title-md text-text-primary mb-3">
              Glucose Daily Log
            </h3>
            {glucoseLogs.length > 0 ? (
              <GlucoseLogChart
                entries={glucoseLogs}
                showLogTable={true}
                showSecondaryChart={true}
              />
            ) : (
              <div className="bg-bg-card border border-divider rounded-xl p-8 text-center shadow-card space-y-2">
                <Activity size={26} className="mx-auto text-accent-violet" />
                <p className="font-semibold text-sm text-text-primary">No Glucose Entries Logged</p>
                <p className="text-xs text-text-secondary max-w-sm mx-auto">
                  Record your blood sugar readings across fasting, pre-meal, and bedtime checkpoints to generate automated daily averages.
                </p>
                <Link
                  href="/glucose"
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 mt-2 rounded-lg gradient-violet text-white text-xs font-semibold shadow-sm"
                >
                  <Plus size={13} />
                  <span>Log Blood Sugar</span>
                </Link>
              </div>
            )}
          </section>
        )}

        {/* Medications for this condition */}
        <div className="bg-bg-card rounded-xl shadow-card overflow-hidden">
          <div className="px-4 py-3 border-b border-divider flex items-center justify-between">
            <h3 className="font-semibold text-title-md text-text-primary">Medications for {colors.label}</h3>
            <Link href="/medications" className="text-xs font-semibold text-accent-violet hover:underline flex items-center gap-1">
              <Plus size={13} />
              <span>Add</span>
            </Link>
          </div>
          {condMeds.length > 0 ? (
            condMeds.map((med, i) => (
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
            ))
          ) : (
            <div className="p-6 text-center text-text-secondary space-y-1.5">
              <Pill size={22} className="mx-auto text-text-tertiary mb-1" />
              <p className="text-xs font-medium">No medications linked to {colors.label} yet.</p>
              <Link href="/medications" className="inline-block text-xs font-bold text-accent-violet hover:underline">
                Manage Prescriptions →
              </Link>
            </div>
          )}
        </div>

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
