"use client";

import React, { useState, useEffect, useMemo } from "react";
import AppShell from "@/components/layout/AppShell";
import GlucoseChart from "@/components/charts/GlucoseChart";
import GlucoseLogChart from "@/components/charts/GlucoseLogChart";
import LogReadingModal from "@/components/modals/LogReadingModal";
import { conditionColors } from "@/lib/design-tokens";
import type { ConditionId, SparklinePoint } from "@/types";
import {
  ArrowLeft,
  TrendingDown,
  TrendingUp,
  Minus,
  Clock,
  CheckCircle2,
  Activity,
  Pill,
  Plus,
} from "lucide-react";
import Link from "next/link";
import { clsx } from "clsx";
import { useReadings, useMedications } from "@/hooks/useApi";
import { useAuth } from "@/context/AuthContext";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import type { GlucoseLogEntry, GlucoseReadingType } from "@/lib/glucose-utils";
import { getGlucoseStatus } from "@/lib/glucose-utils";

interface ConditionMetricTemplate {
  primary: { label: string; unit: string; vitalType: string };
  secondary: { label: string; unit: string; key: string }[];
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
    primary: { label: "Blood Pressure", unit: "mmHg", vitalType: "blood_pressure_systolic" },
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
    chartLabel: "eGFR filtration trend",
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
    chartLabel: "TSH hormone trend",
  },
  ra: {
    primary: { label: "Disease Activity (Pain / CRP)", unit: "", vitalType: "pain_scale" },
    secondary: [
      { label: "CRP", unit: "mg/L", key: "crp" },
      { label: "ESR", unit: "mm/hr", key: "esr" },
      { label: "Pain scale (avg)", unit: "/10", key: "pain_avg" },
      { label: "Morning stiffness", unit: "min", key: "morning_stiff" },
    ],
    chartLabel: "Pain intensity trend",
  },
  asthma: {
    primary: { label: "CONTROL TEST SCORE", unit: "/25", vitalType: "asthma_control" },
    secondary: [
      { label: "Control test score", unit: "/25", key: "test_score" },
      { label: "Rescue inhaler use", unit: "/week", key: "rescue_use" },
      { label: "Trigger events", unit: "this week", key: "trigger_events" },
      { label: "Last checkup", unit: "", key: "last_checkup" },
    ],
    chartLabel: "Asthma control score trend",
  },
};

function formatLabDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "--";
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return "--";
  }
}

interface Props {
  params: Promise<{ id: string }>;
}

export default function ConditionDetailPage({ params }: Props) {
  const { id } = React.use(params);
  const conditionId = id as ConditionId;
  const colors = conditionColors[conditionId];
  const metricTemplate = CONDITION_METRICS[conditionId];

  const { user, profile } = useAuth();
  const patientId = user?.uid || profile?.id;
  const [timeRange, setTimeRange] = useState<"7d" | "30d" | "90d">("7d");
  const [logModalOpen, setLogModalOpen] = useState(false);

  const { data: readingsData } = useReadings(undefined, 100);
  const { data: medicationsData } = useMedications();
  const [supabaseReadings, setSupabaseReadings] = useState<any[]>([]);

  // Direct Supabase query to guarantee vitals hydration by patient_id = firebase_uid
  useEffect(() => {
    if (!patientId) return;
    let isMounted = true;

    async function fetchVitalsDirect() {
      try {
        const supabase = getSupabaseBrowserClient();
        const { data, error } = await supabase
          .from("vitals")
          .select("*")
          .or(`user_id.eq.${patientId},patient_id.eq.${patientId}`)
          .order("recorded_at", { ascending: false })
          .limit(100);

        if (!error && data && isMounted) {
          setSupabaseReadings(data);
        }
      } catch (err) {
        console.warn("[condition-detail] Supabase vitals lookup warning:", err);
      }
    }

    fetchVitalsDirect();
    return () => {
      isMounted = false;
    };
  }, [patientId]);

  // Unified readings pool
  const allReadings = useMemo(() => {
    const combined = [...(readingsData || [])];
    const seenIds = new Set(combined.map((r) => r.id));

    for (const r of supabaseReadings) {
      if (!seenIds.has(r.id)) {
        combined.push({
          id: r.id,
          patientId: r.patient_id || r.user_id,
          type: r.type,
          value: String(r.value),
          unit: r.unit,
          source: r.source,
          recordedAt: r.recorded_at,
          notes: r.notes,
        });
      }
    }

    combined.sort(
      (a, b) =>
        new Date(b.recordedAt || (b as any).recorded_at || 0).getTime() -
        new Date(a.recordedAt || (a as any).recorded_at || 0).getTime()
    );
    return combined;
  }, [readingsData, supabaseReadings]);

  // Target vital types for chart
  const recentReadings: SparklinePoint[] = useMemo(() => {
    if (!allReadings || allReadings.length === 0 || !metricTemplate) return [];

    let targetTypes: string[] = [metricTemplate.primary.vitalType];
    if (conditionId === "hypertension") {
      targetTypes = ["blood_pressure_systolic", "blood_pressure"];
    } else if (conditionId === "ra") {
      targetTypes = ["pain_scale", "pain_avg", "das28", "crp"];
    } else if (conditionId === "asthma") {
      targetTypes = ["asthma_control", "test_score"];
    }

    const matches = allReadings.filter((r) => targetTypes.includes(r.type));
    if (matches.length === 0) return [];

    return matches
      .slice(0, 15)
      .reverse()
      .map((r: any) => ({
        time: r.recordedAt || r.recorded_at || new Date().toISOString(),
        value: Math.round(parseFloat(r.value)),
      }));
  }, [allReadings, metricTemplate, conditionId]);

  // Glucose logs for diabetes charts
  const glucoseLogs: GlucoseLogEntry[] = useMemo(() => {
    if (!allReadings || allReadings.length === 0) return [];
    return allReadings
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
  }, [allReadings]);

  // Condition medications
  const condMeds = useMemo(() => {
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

  // ─── TASK 3: DERIVED FIELDS & OVERVIEW CARD HYDRATION ─────────────────────

  // 1. Primary Value & Status Calculation
  const { primaryDisplay, badgeInfo, trendText, trendIcon } = useMemo(() => {
    if (!metricTemplate) {
      return {
        primaryDisplay: "--",
        badgeInfo: { status: "green" as const, label: "Normal", color: "#00B894", bg: "#E8F8F5" },
        trendText: "No readings logged",
        trendIcon: "neutral" as const,
      };
    }

    // Determine relevant readings for the hero card
    let targetVital = metricTemplate.primary.vitalType;
    let relevant = allReadings.filter((r) => r.type === targetVital);

    if (conditionId === "ra" && relevant.length === 0) {
      relevant = allReadings.filter((r) => r.type === "crp" || r.type === "pain_scale");
      if (relevant[0]) targetVital = relevant[0].type;
    }

    const latest = relevant[0];
    const prev = relevant[1];

    let displayVal = "--";
    let statusColor = "#00B894";
    let statusBg = "#E8F8F5";
    let statusLabel = "Normal";
    let statusLevel: "green" | "amber" | "red" = "green";

    if (latest) {
      const num = parseFloat(latest.value);
      if (!isNaN(num)) {
        displayVal = Number.isInteger(num) ? String(num) : num.toFixed(num < 10 ? 2 : 1);
      } else {
        displayVal = String(latest.value);
      }
    }

    // Condition-Specific Status Badge logic:
    if (conditionId === "ckd") {
      // 1. CKD: Update top-right status badge (Normal / Elevated / Critical) based on eGFR and Creatinine
      const latestEgfr = allReadings.find((r) => r.type === "egfr");
      const latestCr = allReadings.find((r) => r.type === "creatinine");
      const egfrVal = latestEgfr ? parseFloat(latestEgfr.value) : null;
      const crVal = latestCr ? parseFloat(latestCr.value) : null;

      if ((egfrVal != null && egfrVal < 30) || (crVal != null && crVal > 3.0)) {
        statusLevel = "red";
        statusLabel = "Critical";
        statusColor = "#D63031";
        statusBg = "#FDECEA";
      } else if ((egfrVal != null && egfrVal < 60) || (crVal != null && crVal > 1.3)) {
        statusLevel = "amber";
        statusLabel = "Elevated";
        statusColor = "#F39C12";
        statusBg = "#FEF9E7";
      } else if (egfrVal != null || crVal != null) {
        statusLevel = "green";
        statusLabel = "Normal";
        statusColor = "#00B894";
        statusBg = "#E8F8F5";
      }
    } else if (conditionId === "hypothyroidism") {
      // 2. Hypothyroidism: Update top status badge based on TSH (0.45 - 4.5 mIU/L = Normal, outside range = Needs Attention)
      const latestTsh = allReadings.find((r) => r.type === "tsh");
      if (latestTsh) {
        const tshVal = parseFloat(latestTsh.value);
        if (!isNaN(tshVal)) {
          if (tshVal >= 0.45 && tshVal <= 4.5) {
            statusLevel = "green";
            statusLabel = "Normal";
            statusColor = "#00B894";
            statusBg = "#E8F8F5";
          } else if (tshVal > 10.0 || tshVal < 0.1) {
            statusLevel = "red";
            statusLabel = "Needs Attention";
            statusColor = "#D63031";
            statusBg = "#FDECEA";
          } else {
            statusLevel = "amber";
            statusLabel = "Needs Attention";
            statusColor = "#F39C12";
            statusBg = "#FEF9E7";
          }
        }
      }
    } else if (conditionId === "asthma") {
      // 4. Asthma: Control Test Score: >= 20 -> Normal, 16–19 -> Needs Attention, <= 15 -> Critical
      const latestAct = allReadings.find((r) => r.type === "asthma_control" || r.type === "test_score");
      if (latestAct) {
        const actVal = parseFloat(latestAct.value);
        if (!isNaN(actVal)) {
          if (actVal >= 20) {
            statusLevel = "green";
            statusLabel = "Normal";
            statusColor = "#00B894";
            statusBg = "#E8F8F5";
          } else if (actVal >= 16) {
            statusLevel = "amber";
            statusLabel = "Needs Attention";
            statusColor = "#F39C12";
            statusBg = "#FEF9E7";
          } else {
            statusLevel = "red";
            statusLabel = "Critical";
            statusColor = "#D63031";
            statusBg = "#FDECEA";
          }
        }
      }
    } else if (conditionId === "ra") {
      const latestCrp = allReadings.find((r) => r.type === "crp");
      const latestEsr = allReadings.find((r) => r.type === "esr");
      const crpVal = latestCrp ? parseFloat(latestCrp.value) : null;
      const esrVal = latestEsr ? parseFloat(latestEsr.value) : null;
      if ((crpVal != null && crpVal > 10) || (esrVal != null && esrVal > 30)) {
        statusLevel = "amber";
        statusLabel = "Elevated";
        statusColor = "#F39C12";
        statusBg = "#FEF9E7";
      }
    } else if (conditionId === "diabetes_t2" || conditionId === "diabetes_t1") {
      if (latest) {
        const gStat = getGlucoseStatus(parseFloat(latest.value), "Fasting").status;
        if (gStat === "Normal") {
          statusLevel = "green";
          statusLabel = "Normal";
        } else if (gStat === "Elevated") {
          statusLevel = "amber";
          statusLabel = "Elevated";
          statusColor = "#F39C12";
          statusBg = "#FEF9E7";
        } else {
          statusLevel = "red";
          statusLabel = "High Alert";
          statusColor = "#D63031";
          statusBg = "#FDECEA";
        }
      }
    }

    // Trend calculation
    let trend = latest ? "Latest recorded reading" : "No readings logged yet";
    let icon: "up" | "down" | "neutral" = "neutral";
    if (latest && prev) {
      const cur = parseFloat(latest.value);
      const pre = parseFloat(prev.value);
      if (!isNaN(cur) && !isNaN(pre)) {
        const diff = cur - pre;
        if (diff < 0) {
          trend = `Trending down (${Math.abs(Number(diff.toFixed(1)))} ${metricTemplate.primary.unit})`;
          icon = "down";
        } else if (diff > 0) {
          trend = `Trending up (+${Number(diff.toFixed(1))} ${metricTemplate.primary.unit})`;
          icon = "up";
        } else {
          trend = "Stable compared to previous";
          icon = "neutral";
        }
      }
    }

    return {
      primaryDisplay: displayVal,
      badgeInfo: { status: statusLevel, label: statusLabel, color: statusColor, bg: statusBg },
      trendText: trend,
      trendIcon: icon,
    };
  }, [allReadings, metricTemplate, conditionId]);

  // 2. Secondary Metrics & Auto-calculated Derived Fields
  const secondaryMetrics = useMemo(() => {
    if (!metricTemplate) return [];

    return metricTemplate.secondary.map((s) => {
      let value = "--";

      // ───────────────────────────────────────────────────────────────────────
      // CKD Derived Fields
      // ───────────────────────────────────────────────────────────────────────
      if (conditionId === "ckd") {
        if (s.key === "creatinine") {
          const r = allReadings.find((x) => x.type === "creatinine");
          if (r?.value != null) value = String(r.value);
        } else if (s.key === "bun") {
          const r = allReadings.find((x) => x.type === "bun");
          if (r?.value != null) value = String(r.value);
        } else if (s.key === "stage") {
          // Auto-calculate Stage directly from latest eGFR:
          // >= 90: Stage 1 | 60-89: Stage 2 | 45-59: Stage 3a | 30-44: Stage 3b | 15-29: Stage 4 | < 15: Stage 5
          const egfrReading = allReadings.find((x) => x.type === "egfr");
          if (egfrReading?.value != null) {
            const num = parseFloat(egfrReading.value);
            if (!isNaN(num)) {
              if (num >= 90) value = "Stage 1";
              else if (num >= 60) value = "Stage 2";
              else if (num >= 45) value = "Stage 3a";
              else if (num >= 30) value = "Stage 3b";
              else if (num >= 15) value = "Stage 4";
              else value = "Stage 5";
            }
          }
        } else if (s.key === "last_lab") {
          // Auto-calculate Last lab: Format recorded_at date of most recent CKD lab (eGFR, Creatinine, or BUN)
          const latestCkdLab = allReadings.find((x) =>
            ["egfr", "creatinine", "bun"].includes(x.type)
          );
          if (latestCkdLab?.recordedAt) {
            value = formatLabDate(latestCkdLab.recordedAt);
          }
        }
      }

      // ───────────────────────────────────────────────────────────────────────
      // Hypothyroidism Derived Fields
      // ───────────────────────────────────────────────────────────────────────
      else if (conditionId === "hypothyroidism") {
        if (s.key === "free_t4") {
          const r = allReadings.find((x) => x.type === "free_t4");
          if (r?.value != null) value = String(r.value);
        } else if (s.key === "free_t3") {
          const r = allReadings.find((x) => x.type === "free_t3");
          if (r?.value != null) value = String(r.value);
        } else if (s.key === "levo_dose" || s.key === "levothyroxine_dose") {
          const r = allReadings.find((x) =>
            x.type === "levothyroxine_dose" || x.type === "levo_dose"
          );
          if (r?.value != null) value = String(r.value);
        } else if (s.key === "last_lab") {
          // Auto-calculate Last lab: Format recorded_at date of most recent thyroid reading (TSH, Free T4, or Free T3)
          const latestThyroid = allReadings.find((x) =>
            ["tsh", "free_t4", "free_t3"].includes(x.type)
          );
          if (latestThyroid?.recordedAt) {
            value = formatLabDate(latestThyroid.recordedAt);
          }
        }
      }

      // ───────────────────────────────────────────────────────────────────────
      // Rheumatoid Arthritis Derived Fields
      // ───────────────────────────────────────────────────────────────────────
      else if (conditionId === "ra") {
        if (s.key === "crp") {
          const r = allReadings.find((x) => x.type === "crp");
          if (r?.value != null) value = String(r.value);
        } else if (s.key === "esr") {
          const r = allReadings.find((x) => x.type === "esr");
          if (r?.value != null) value = String(r.value);
        } else if (s.key === "morning_stiff" || s.key === "morning_stiffness") {
          const r = allReadings.find((x) =>
            x.type === "morning_stiffness" || x.type === "morning_stiff"
          );
          if (r?.value != null) value = String(r.value);
        } else if (s.key === "pain_avg" || s.key === "pain_scale") {
          // Auto-calculate Pain scale (avg): Rolling average of logged Pain scale readings over last 30 days
          const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
          const painLogs = allReadings.filter(
            (x) =>
              (x.type === "pain_scale" || x.type === "pain_avg") &&
              new Date(x.recordedAt || (x as any).recorded_at || Date.now()).getTime() >= thirtyDaysAgo
          );

          if (painLogs.length === 1 && painLogs[0]?.value != null) {
            value = `${parseFloat(painLogs[0].value)}`;
          } else if (painLogs.length > 1) {
            const sum = painLogs.reduce((acc, p) => acc + parseFloat(p.value), 0);
            const avg = sum / painLogs.length;
            value = `${avg.toFixed(1)}`;
          } else {
            // Fallback to latest reading if outside 30 days
            const latestPain = allReadings.find((x) => x.type === "pain_scale" || x.type === "pain_avg");
            if (latestPain?.value != null) value = `${parseFloat(latestPain.value)}`;
          }
        }
      }

      // ───────────────────────────────────────────────────────────────────────
      // Asthma Derived Fields
      // ───────────────────────────────────────────────────────────────────────
      else if (conditionId === "asthma") {
        if (s.key === "test_score" || s.key === "asthma_control") {
          const r = allReadings.find((x) =>
            x.type === "asthma_control" || x.type === "test_score"
          );
          if (r?.value != null) value = String(r.value);
        } else if (s.key === "rescue_use" || s.key === "rescue_inhaler_use") {
          const r = allReadings.find((x) =>
            x.type === "rescue_inhaler_use" || x.type === "rescue_use"
          );
          if (r?.value != null) value = String(r.value);
        } else if (s.key === "trigger_events") {
          const r = allReadings.find((x) => x.type === "trigger_events");
          if (r?.value != null) value = String(r.value);
        } else if (s.key === "last_checkup") {
          // Auto-calculate Last checkup: Format recorded_at date of latest logged Asthma metric
          const latestAsthma = allReadings.find((x) =>
            ["asthma_control", "test_score", "rescue_inhaler_use", "rescue_use", "trigger_events"].includes(x.type)
          );
          if (latestAsthma?.recordedAt) {
            value = formatLabDate(latestAsthma.recordedAt);
          }
        }
      }

      // ───────────────────────────────────────────────────────────────────────
      // Diabetes / Hypertension / Generic Fallback
      // ───────────────────────────────────────────────────────────────────────
      else {
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
          const postMeal = glucoseLogs.filter(
            (g) => g.readingType === "After Meal" || g.readingType === "Bedtime"
          );
          if (postMeal.length > 0) {
            const avg = Math.round(postMeal.reduce((sum, g) => sum + g.glucose, 0) / postMeal.length);
            value = `${avg}`;
          }
        } else if (s.key === "week_count" && allReadings) {
          const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
          const count = allReadings.filter(
            (r) =>
              (r.type === metricTemplate.primary.vitalType || r.type === "blood_pressure_systolic") &&
              new Date(r.recordedAt || (r as any).recorded_at || Date.now()).getTime() >= oneWeekAgo
          ).length;
          value = `${count}`;
        } else if (s.key && allReadings) {
          const matching = allReadings.find((r) => r.type === s.key);
          if (matching?.value != null) {
            value = String(matching.value);
          }
        }
      }

      return {
        label: s.label,
        value,
        unit: s.unit,
      };
    });
  }, [metricTemplate, conditionId, allReadings, glucoseLogs]);

  if (!colors || !metricTemplate) {
    return (
      <AppShell>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <p className="text-text-tertiary">Condition not found.</p>
            <Link href="/conditions" className="text-accent-violet font-semibold text-sm mt-2 block">
              ← Back to Conditions
            </Link>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto px-4 lg:px-6 py-6 space-y-5">
        {/* Back + Header */}
        <div className="flex items-center gap-3">
          <Link
            href="/conditions"
            className="w-9 h-9 rounded-xl flex items-center justify-center bg-bg-card border border-divider shadow-card hover:bg-bg-lavender transition-colors cursor-pointer"
            aria-label="Back"
          >
            <ArrowLeft size={17} className="text-text-secondary" />
          </Link>
          <div className="flex-1">
            <h1 className="font-bold text-title-lg text-text-primary">
              {colors.emoji} {colors.label}
            </h1>
            <p className="text-xs text-text-tertiary">Condition overview & vitals tracking</p>
          </div>

          {/* Dynamic Status Badge */}
          <div
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
            style={{ background: badgeInfo.bg }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: badgeInfo.color }}
              aria-hidden="true"
            />
            <span className="text-xs font-semibold" style={{ color: badgeInfo.color }}>
              {badgeInfo.label}
            </span>
          </div>

          {/* Log Metric Action Button */}
          <button
            onClick={() => setLogModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl gradient-violet text-white text-xs font-bold shadow-card hover:opacity-95 transition-all cursor-pointer"
          >
            <Plus size={14} />
            <span>Log Metric</span>
          </button>
        </div>

        {/* Hero Primary Metric Card */}
        <div
          className="rounded-xl p-5 animate-fade-in shadow-card border border-divider/60"
          style={{ background: colors.bg }}
        >
          <p className="text-xs font-semibold text-text-tertiary uppercase tracking-widest mb-2">
            {metricTemplate.primary.label}
          </p>
          <div className="flex items-end gap-2 mb-1">
            <span
              className="font-bold metric-value text-text-primary"
              style={{ fontSize: "clamp(32px, 6vw, 44px)", lineHeight: 1 }}
            >
              {primaryDisplay}
            </span>
            {metricTemplate.primary.unit && (
              <span className="text-text-tertiary text-sm mb-1.5 font-medium">
                {metricTemplate.primary.unit}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 text-sm" style={{ color: colors.accent }}>
            {trendIcon === "down" ? (
              <TrendingDown size={14} aria-hidden="true" />
            ) : trendIcon === "up" ? (
              <TrendingUp size={14} aria-hidden="true" />
            ) : (
              <Minus size={14} aria-hidden="true" />
            )}
            <span className="font-semibold text-xs">{trendText}</span>
          </div>
        </div>

        {/* Secondary Metrics Grid */}
        <div className="grid grid-cols-2 gap-3">
          {secondaryMetrics.map((m) => (
            <div key={m.label} className="bg-bg-card rounded-xl p-4 shadow-card card-enter border border-divider/40">
              <p className="text-xs text-text-tertiary mb-1 font-medium">{m.label}</p>
              <div className="flex items-baseline gap-1">
                <span className="font-bold text-xl metric-value text-text-primary">{m.value}</span>
                {m.unit && <span className="text-xs text-text-tertiary">{m.unit}</span>}
              </div>
            </div>
          ))}
        </div>

        {/* Trend Chart */}
        <div className="bg-bg-card rounded-xl shadow-card overflow-hidden border border-divider/50">
          <div className="flex items-center justify-between px-4 pt-4 pb-2">
            <h3 className="font-semibold text-title-md text-text-primary">
              {metricTemplate.chartLabel}
            </h3>
            <div className="flex gap-1 p-0.5 bg-bg-light rounded-lg">
              {(["7d", "30d", "90d"] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => setTimeRange(r)}
                  className={clsx(
                    "px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer",
                    timeRange === r
                      ? "bg-accent-violet text-white"
                      : "text-text-tertiary hover:text-text-primary"
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
              <GlucoseChart
                data={recentReadings}
                title={metricTemplate.primary.label}
                subtitle={metricTemplate.chartLabel}
                unit={metricTemplate.primary.unit}
                color={colors.accent || "#00CEC9"}
                showTargets={conditionId === "diabetes_t2" || conditionId === "diabetes_t1"}
              />
            ) : (
              <div className="text-center py-10 px-4 border border-dashed border-divider rounded-xl">
                <Activity size={28} className="mx-auto text-text-tertiary mb-2" />
                <p className="font-semibold text-sm text-text-primary">No readings recorded yet</p>
                <p className="text-xs text-text-secondary mt-1 max-w-sm mx-auto">
                  Log your biometric readings or lab results to populate interactive trend graphs and clinical insights.
                </p>
                <button
                  onClick={() => setLogModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 mt-3 rounded-lg gradient-violet text-white text-xs font-semibold shadow-sm hover:opacity-95 cursor-pointer"
                >
                  <Plus size={13} />
                  <span>Log {metricTemplate.primary.label}</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Glucose Log (for diabetes) */}
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
                  Record blood sugar readings across fasting and post-meal checkpoints to generate daily clinical averages.
                </p>
                <button
                  onClick={() => setLogModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 mt-2 rounded-lg gradient-violet text-white text-xs font-semibold shadow-sm cursor-pointer"
                >
                  <Plus size={13} />
                  <span>Log Blood Sugar</span>
                </button>
              </div>
            )}
          </section>
        )}

        {/* Medications for this Condition */}
        <div className="bg-bg-card rounded-xl shadow-card overflow-hidden border border-divider/50">
          <div className="px-4 py-3 border-b border-divider flex items-center justify-between">
            <h3 className="font-semibold text-title-md text-text-primary">
              Medications for {colors.label}
            </h3>
            <Link
              href="/medications"
              className="text-xs font-semibold text-accent-violet hover:underline flex items-center gap-1"
            >
              <Plus size={13} />
              <span>Add</span>
            </Link>
          </div>
          {condMeds.length > 0 ? (
            condMeds.map((med, i) => (
              <div
                key={med.id}
                className={clsx(
                  "flex items-center gap-3 px-4 py-3",
                  i < condMeds.length - 1 && "border-b border-divider"
                )}
              >
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: colors.bg }}
                >
                  <span style={{ color: colors.accent }} className="font-bold text-xs">
                    {med.name[0]}
                  </span>
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-label-sm text-text-primary">
                    {med.name} {med.dosage}
                  </p>
                  <p className="text-xs text-text-tertiary flex items-center gap-1">
                    <Clock size={10} aria-hidden="true" /> {med.scheduledAt}
                  </p>
                </div>
                <div
                  className="flex items-center gap-1 px-2.5 py-1 rounded-full"
                  style={{ background: med.status === "taken" ? "#E8F8F5" : "#F0EFF8" }}
                >
                  {med.status === "taken" ? (
                    <CheckCircle2 size={12} style={{ color: "#00B894" }} aria-hidden="true" />
                  ) : (
                    <Clock size={12} style={{ color: "#A29BFE" }} aria-hidden="true" />
                  )}
                  <span
                    className="text-xs font-semibold capitalize"
                    style={{ color: med.status === "taken" ? "#00B894" : "#A29BFE" }}
                  >
                    {med.status}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div className="p-6 text-center text-text-secondary space-y-1.5">
              <Pill size={22} className="mx-auto text-text-tertiary mb-1" />
              <p className="text-xs font-medium">No medications linked to {colors.label} yet.</p>
              <Link
                href="/medications"
                className="inline-block text-xs font-bold text-accent-violet hover:underline"
              >
                Manage Prescriptions →
              </Link>
            </div>
          )}
        </div>

        {/* Clinical Reference Ranges Card */}
        <div className="bg-bg-card rounded-xl shadow-card p-4 border border-divider/50">
          <h3 className="font-semibold text-title-md text-text-primary mb-3">Clinical Reference Ranges</h3>

          {conditionId === "diabetes_t2" && (
            <div className="space-y-2">
              {[
                { range: "70–99 mg/dL", label: "Fasting — Normal", color: "#00B894" },
                { range: "100–125 mg/dL", label: "Fasting — Pre-diabetic", color: "#FDCB6E" },
                { range: "≥ 126 mg/dL", label: "Fasting — Diabetic", color: "#D63031" },
                { range: "< 140 mg/dL", label: "2hr Post-meal target (Non-diabetic)", color: "#00B894" },
                { range: "< 180 mg/dL", label: "2hr Post-meal clinical target (Diabetic)", color: "#55EFC4" },
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
                { range: "< 120/80 mmHg", label: "Normal blood pressure", color: "#00B894" },
                { range: "120–129 / <80 mmHg", label: "Elevated", color: "#55EFC4" },
                { range: "130–139 / 80–89 mmHg", label: "Stage 1 Hypertension", color: "#FDCB6E" },
                { range: "≥ 140 / ≥ 90 mmHg", label: "Stage 2 Hypertension", color: "#E17055" },
                { range: "> 180 / > 120 mmHg", label: "Hypertensive Crisis", color: "#D63031" },
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
                { range: "≥ 90 mL/min/1.73m²", label: "Stage 1 — Normal filtration with evidence of kidney damage", color: "#00B894" },
                { range: "60–89 mL/min/1.73m²", label: "Stage 2 — Mildly reduced kidney function", color: "#55EFC4" },
                { range: "45–59 mL/min/1.73m²", label: "Stage 3a — Mildly to moderately reduced kidney function", color: "#FDCB6E" },
                { range: "30–44 mL/min/1.73m²", label: "Stage 3b — Moderately to severely reduced kidney function", color: "#E17055" },
                { range: "15–29 mL/min/1.73m²", label: "Stage 4 — Severely reduced kidney function", color: "#D63031" },
                { range: "< 15 mL/min/1.73m²", label: "Stage 5 — Kidney failure (End-stage renal disease)", color: "#D63031" },
                { range: "0.6–1.3 mg/dL", label: "Serum Creatinine — Normal adult baseline", color: "#00B894" },
                { range: "7–20 mg/dL", label: "Blood Urea Nitrogen (BUN) — Normal reference", color: "#00B894" },
              ].map((r) => (
                <div key={r.label} className="flex items-center justify-between py-1.5 border-b border-divider last:border-0">
                  <span className="text-xs text-text-secondary">{r.label}</span>
                  <span className="text-xs font-semibold metric-value" style={{ color: r.color }}>{r.range}</span>
                </div>
              ))}
            </div>
          )}

          {conditionId === "hypothyroidism" && (
            <div className="space-y-2">
              {[
                { range: "0.45–4.5 mIU/L", label: "TSH — Normal therapeutic target", color: "#00B894" },
                { range: "0.8–1.8 ng/dL", label: "Free T4 — Standard reference range", color: "#00B894" },
                { range: "2.3–4.2 pg/mL", label: "Free T3 — Active triiodothyronine range", color: "#00B894" },
                { range: "> 4.5 mIU/L", label: "Elevated TSH — Underactive thyroid / dose adjustment needed", color: "#F39C12" },
                { range: "< 0.45 mIU/L", label: "Suppressed TSH — Over-replacement risk", color: "#E17055" },
              ].map((r) => (
                <div key={r.label} className="flex items-center justify-between py-1.5 border-b border-divider last:border-0">
                  <span className="text-xs text-text-secondary">{r.label}</span>
                  <span className="text-xs font-semibold metric-value" style={{ color: r.color }}>{r.range}</span>
                </div>
              ))}
            </div>
          )}

          {conditionId === "ra" && (
            <div className="space-y-2">
              {[
                { range: "< 3.0 mg/L", label: "C-Reactive Protein (CRP) — Normal / Remission", color: "#00B894" },
                { range: "> 10.0 mg/L", label: "CRP — Active inflammatory flare threshold", color: "#D63031" },
                { range: "< 20 mm/hr", label: "Erythrocyte Sedimentation Rate (ESR) — Normal reference", color: "#00B894" },
                { range: "≤ 2.0 / 10", label: "Pain Scale Target — Controlled or mild discomfort", color: "#00B894" },
                { range: "< 30 min", label: "Morning Stiffness Target — Clinical remission", color: "#00B894" },
              ].map((r) => (
                <div key={r.label} className="flex items-center justify-between py-1.5 border-b border-divider last:border-0">
                  <span className="text-xs text-text-secondary">{r.label}</span>
                  <span className="text-xs font-semibold metric-value" style={{ color: r.color }}>{r.range}</span>
                </div>
              ))}
            </div>
          )}

          {conditionId === "asthma" && (
            <div className="space-y-2">
              {[
                { range: "20–25 / 25", label: "Asthma Control Test (ACT) — Well-controlled", color: "#00B894" },
                { range: "16–19 / 25", label: "ACT Score — Not well controlled", color: "#F39C12" },
                { range: "≤ 15 / 25", label: "ACT Score — Poorly controlled (Action required)", color: "#D63031" },
                { range: "≤ 2 / week", label: "Rescue Inhaler Use — Target control frequency", color: "#00B894" },
                { range: "0 / week", label: "Trigger Events — Optimal stability", color: "#00B894" },
              ].map((r) => (
                <div key={r.label} className="flex items-center justify-between py-1.5 border-b border-divider last:border-0">
                  <span className="text-xs text-text-secondary">{r.label}</span>
                  <span className="text-xs font-semibold metric-value" style={{ color: r.color }}>{r.range}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="h-8" />
      </div>

      {/* Dynamic Condition Logger Modal */}
      {logModalOpen && (
        <LogReadingModal
          open={logModalOpen}
          onClose={() => setLogModalOpen(false)}
          patientConditions={[conditionId]}
          initialMetricId={metricTemplate.primary.vitalType}
          onSaved={() => {
            // Re-fetch direct Supabase vitals
            if (patientId) {
              const supabase = getSupabaseBrowserClient();
              supabase
                .from("vitals")
                .select("*")
                .or(`user_id.eq.${patientId},patient_id.eq.${patientId}`)
                .order("recorded_at", { ascending: false })
                .limit(100)
                .then(({ data }) => {
                  if (data) setSupabaseReadings(data);
                });
            }
          }}
        />
      )}
    </AppShell>
  );
}
