"use client";

import React, { useState, useEffect, useMemo } from "react";
import AppShell from "@/components/layout/AppShell";
import ConditionTile from "@/components/patient/ConditionTile";
import { conditionColors } from "@/lib/design-tokens";
import type { ConditionId, ConditionSummary } from "@/types";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Plus,
  TrendingDown,
  TrendingUp,
  Minus,
  ChevronRight,
  Activity,
  Search,
  X,
  Loader2,
} from "lucide-react";
import { clsx } from "clsx";
import { useAuth } from "@/context/AuthContext";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import { useReadings } from "@/hooks/useApi";

// Full condition list the patient might add
const ALL_AVAILABLE: ConditionId[] = [
  "diabetes_t2",
  "hypertension",
  "ckd",
  "hypothyroidism",
  "ra",
  "asthma",
  "diabetes_t1",
];

const CONDITION_DETAILS_BASE: Record<
  string,
  {
    description: string;
    keyMetric: string;
    lastUpdated: string;
    weekTrend: "up" | "down" | "stable";
  }
> = {
  diabetes_t2:    { description: "Blood sugar management & insulin resistance", keyMetric: "--", lastUpdated: "No readings logged", weekTrend: "stable" },
  hypertension:   { description: "Blood pressure control & cardiovascular risk", keyMetric: "--", lastUpdated: "No readings logged", weekTrend: "stable" },
  ckd:            { description: "Kidney filtration rate & toxin clearance", keyMetric: "--", lastUpdated: "No readings logged", weekTrend: "stable" },
  copd:           { description: "Airflow obstruction & lung function", keyMetric: "--", lastUpdated: "No readings logged", weekTrend: "stable" },
  chf:            { description: "Cardiac output & fluid management", keyMetric: "--", lastUpdated: "No readings logged", weekTrend: "stable" },
  cad:            { description: "Coronary perfusion & cardiac events", keyMetric: "--", lastUpdated: "No readings logged", weekTrend: "stable" },
  hypothyroidism: { description: "Thyroid hormone levels & metabolism", keyMetric: "--", lastUpdated: "No readings logged", weekTrend: "stable" },
  ra:             { description: "Joint inflammation & autoimmune activity", keyMetric: "--", lastUpdated: "No readings logged", weekTrend: "stable" },
  asthma:         { description: "Airway inflammation & bronchospasm", keyMetric: "--", lastUpdated: "No readings logged", weekTrend: "stable" },
  diabetes_t1:   { description: "Insulin-dependent glucose management", keyMetric: "--", lastUpdated: "No readings logged", weekTrend: "stable" },
};

const METRIC_METADATA: Record<
  ConditionId,
  {
    metricLabel: string;
    unit: string;
    status: "green" | "amber" | "red";
    trend: "up" | "down" | "stable";
  }
> = {
  diabetes_t2:    { metricLabel: "Blood Glucose",  unit: "mg/dL",          status: "green", trend: "stable" },
  diabetes_t1:    { metricLabel: "Blood Glucose",  unit: "mg/dL",          status: "green", trend: "stable" },
  hypertension:   { metricLabel: "Blood Pressure", unit: "mmHg",           status: "green", trend: "stable" },
  ckd:            { metricLabel: "eGFR",           unit: "mL/min/1.73m²",  status: "green", trend: "stable" },
  copd:           { metricLabel: "FEV1",           unit: "%",              status: "green", trend: "stable" },
  chf:            { metricLabel: "Blood Pressure", unit: "mmHg",           status: "green", trend: "stable" },
  cad:            { metricLabel: "Blood Pressure", unit: "mmHg",           status: "green", trend: "stable" },
  hypothyroidism: { metricLabel: "TSH",            unit: "mIU/L",          status: "green", trend: "stable" },
  ra:             { metricLabel: "DAS28 / Pain",   unit: "",               status: "green", trend: "stable" },
  asthma:         { metricLabel: "Control Score",  unit: "/25",            status: "green", trend: "stable" },
};

/**
 * Robust Supabase patient conditions fetcher.
 * Queries `profiles` by `patientId` (Firebase UID string), falling back to `patient_profiles`.
 */
export async function fetchPatientConditions(patientId: string): Promise<ConditionId[]> {
  if (!patientId) return [];

  try {
    const supabase = getSupabaseBrowserClient();
    const { data: prof, error: profErr } = await supabase
      .from("profiles")
      .select("conditions")
      .eq("id", patientId)
      .maybeSingle();

    if (profErr) {
      console.warn("[conditions] Supabase lookup from profiles warning:", profErr.message || profErr);
    }

    if (prof?.conditions && Array.isArray(prof.conditions) && prof.conditions.length > 0) {
      return prof.conditions as ConditionId[];
    }

    // Secondary fallback: check patient_profiles
    const { data: pat, error: patErr } = await supabase
      .from("patient_profiles")
      .select("conditions")
      .eq("user_id", patientId)
      .maybeSingle();

    if (patErr) {
      console.warn("[conditions] Supabase lookup from patient_profiles warning:", patErr.message || patErr);
    }

    if (pat?.conditions && Array.isArray(pat.conditions)) {
      return pat.conditions as ConditionId[];
    }
  } catch (err) {
    console.error("[conditions] fetchPatientConditions error:", err);
  }

  return [];
}

export default function ConditionsPage() {
  const router = useRouter();
  const { user, profile, loading: authLoading, refreshProfile } = useAuth();
  const [myConditionIds, setMyConditionIds] = useState<ConditionId[]>([]);
  const [tab, setTab] = useState<"mine" | "all">("mine");
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isMutating, setIsMutating] = useState(false);
  const [hasHydratedConditions, setHasHydratedConditions] = useState(false);

  const { data: readingsData } = useReadings(undefined, 100);

  // 1. Firebase UID Hydration Guard:
  // ONLY execute condition query after Firebase Auth has fully initialized and user.uid is defined.
  // Do NOT allow an initial unauthenticated render with patient_id = undefined to overwrite state with an empty array.
  useEffect(() => {
    if (authLoading) return; // UID Hydration Guard: wait until Firebase auth completes

    const patientId = user?.uid || profile?.id;
    if (!patientId) {
      // In unauthenticated state, avoid clearing if already loaded
      setHasHydratedConditions(true);
      return;
    }

    let isMounted = true;
    async function loadConditions() {
      const dbConditions = await fetchPatientConditions(patientId!);
      if (!isMounted) return;

      if (dbConditions.length > 0) {
        setMyConditionIds(dbConditions);
      } else if (profile?.conditions && Array.isArray(profile.conditions) && profile.conditions.length > 0) {
        setMyConditionIds(profile.conditions as ConditionId[]);
      } else {
        setMyConditionIds([]);
      }
      setHasHydratedConditions(true);
    }

    loadConditions();

    return () => {
      isMounted = false;
    };
  }, [user?.uid, profile?.id, authLoading, profile?.conditions]);

  // 2. Database Mutation & Error Inspection: Add Condition
  const addCondition = async (id: ConditionId) => {
    if (myConditionIds.includes(id)) return;
    const updated = Array.from(new Set([...myConditionIds, id]));

    // Optimistic UI state update
    setMyConditionIds(updated);
    if (typeof window !== "undefined") {
      localStorage.setItem("tracked_conditions", JSON.stringify(updated));
    }

    const patientId = user?.uid || profile?.id;
    if (!patientId) {
      console.warn("[conditions] Cannot persist condition: patient_id is not yet defined.");
      return;
    }

    setIsMutating(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const nowIso = new Date().toISOString();

      // Persist to profiles in Supabase
      const { error: profErr } = await supabase
        .from("profiles")
        .update({
          conditions: updated,
          updated_at: nowIso,
          onboarding_complete: true,
        })
        .eq("id", patientId);

      if (profErr) {
        console.error("[conditions] Supabase profiles update error:", profErr.message || profErr);
      }

      // Persist to patient_profiles in Supabase
      const { error: patErr } = await supabase
        .from("patient_profiles")
        .update({
          conditions: updated,
          updated_at: nowIso,
          onboarding_complete: true,
        })
        .eq("user_id", patientId);

      if (patErr) {
        console.error("[conditions] Supabase patient_profiles update error:", patErr.message || patErr);
      }

      // Sync via API route to update server cookies / session cache
      await fetch("/api/v1/onboarding", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conditions: updated, onboarding_complete: true }),
      }).catch((e) => console.warn("[conditions] API sync warning:", e));

      // Synchronize shared auth context and Next.js router cache
      await refreshProfile();
      router.refresh();
    } catch (err) {
      console.error("[conditions] addCondition exception:", err);
    } finally {
      setIsMutating(false);
    }
  };

  // 3. Database Mutation & Error Inspection: Remove Condition
  const removeCondition = async (id: ConditionId) => {
    const updated = myConditionIds.filter((cid) => cid !== id);

    // Optimistic UI update
    setMyConditionIds(updated);
    if (typeof window !== "undefined") {
      localStorage.setItem("tracked_conditions", JSON.stringify(updated));
    }

    const patientId = user?.uid || profile?.id;
    if (!patientId) return;

    setIsMutating(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const nowIso = new Date().toISOString();

      const { error: profErr } = await supabase
        .from("profiles")
        .update({
          conditions: updated,
          updated_at: nowIso,
        })
        .eq("id", patientId);

      if (profErr) {
        console.error("[conditions] Supabase profiles remove error:", profErr.message || profErr);
      }

      const { error: patErr } = await supabase
        .from("patient_profiles")
        .update({
          conditions: updated,
          updated_at: nowIso,
        })
        .eq("user_id", patientId);

      if (patErr) {
        console.error("[conditions] Supabase patient_profiles remove error:", patErr.message || patErr);
      }

      await fetch("/api/v1/onboarding", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conditions: updated }),
      }).catch((e) => console.warn("[conditions] API sync warning:", e));

      await refreshProfile();
      router.refresh();
    } catch (err) {
      console.error("[conditions] removeCondition exception:", err);
    } finally {
      setIsMutating(false);
    }
  };

  // Hydrate condition metrics dynamically from vitals table
  const conditionSummaries = useMemo<ConditionSummary[]>(() => {
    return myConditionIds.map((cId) => {
      const c = conditionColors[cId];
      const meta = METRIC_METADATA[cId];

      let displayVal = "--";
      let status: "green" | "amber" | "red" = meta?.status ?? "green";
      let trend: "up" | "down" | "stable" = "stable";

      if (readingsData && readingsData.length > 0) {
        if (cId === "diabetes_t2" || cId === "diabetes_t1") {
          const match = readingsData.find((r) => r.type === "blood_glucose");
          if (match?.value != null) {
            const v = Math.round(parseFloat(match.value));
            displayVal = `${v}`;
            status = v > 180 || v < 70 ? "amber" : "green";
          }
        } else if (cId === "hypertension") {
          const sys = readingsData.find((r) => r.type === "blood_pressure_systolic");
          const dia = readingsData.find((r) => r.type === "blood_pressure_diastolic");
          if (sys?.value != null) {
            displayVal = dia?.value != null ? `${Math.round(parseFloat(sys.value))}/${Math.round(parseFloat(dia.value))}` : `${Math.round(parseFloat(sys.value))}/--`;
          }
        } else if (cId === "ckd") {
          const match = readingsData.find((r) => r.type === "egfr");
          if (match?.value != null) {
            displayVal = `${Math.round(parseFloat(match.value))}`;
          }
        } else if (cId === "hypothyroidism") {
          const match = readingsData.find((r) => r.type === "tsh");
          if (match?.value != null) {
            displayVal = parseFloat(match.value).toFixed(2);
          }
        } else if (cId === "ra") {
          const match = readingsData.find((r) => r.type === "crp" || r.type === "pain_scale");
          if (match?.value != null) {
            displayVal = match.type === "crp" ? `${match.value} mg/L` : `${match.value}/10`;
          }
        } else if (cId === "asthma") {
          const match = readingsData.find((r) => r.type === "asthma_control" || r.type === "test_score");
          if (match?.value != null) {
            displayVal = `${match.value}`;
          }
        }
      }

      return {
        conditionId: cId,
        label: c?.label ?? "",
        metricLabel: meta?.metricLabel ?? "Metric",
        metricValue: displayVal,
        unit: meta?.unit ?? "",
        trend,
        status,
        color: c?.accent ?? "#6C5CE7",
        bgColor: c?.bg ?? "#F0EFF8",
        iconEmoji: c?.emoji ?? "🩺",
      } as ConditionSummary;
    });
  }, [myConditionIds, readingsData]);

  const conditionDetails = useMemo(() => {
    const details: Record<string, { description: string; keyMetric: string; lastUpdated: string; weekTrend: "up" | "down" | "stable" }> = { ...CONDITION_DETAILS_BASE };
    if (!readingsData || readingsData.length === 0) return details;

    for (const cId of Object.keys(details)) {
      const base = details[cId];
      if (!base) continue;

      let match: any = null;
      if (cId === "diabetes_t2" || cId === "diabetes_t1") {
        match = readingsData.find((r) => r.type === "blood_glucose");
        if (match?.value != null) {
          details[cId] = {
            ...base,
            keyMetric: `${Math.round(parseFloat(match.value))} mg/dL`,
            lastUpdated: new Date(match.recordedAt || (match as any).recorded_at || Date.now()).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
          };
        }
      } else if (cId === "hypertension") {
        const sys = readingsData.find((r) => r.type === "blood_pressure_systolic");
        const dia = readingsData.find((r) => r.type === "blood_pressure_diastolic");
        if (sys?.value != null) {
          const sysVal = Math.round(parseFloat(sys.value));
          const diaVal = dia?.value != null ? Math.round(parseFloat(dia.value)) : "--";
          details[cId] = {
            ...base,
            keyMetric: `${sysVal}/${diaVal} mmHg`,
            lastUpdated: new Date(sys.recordedAt || (sys as any).recorded_at || Date.now()).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
          };
        }
      } else if (cId === "ckd") {
        match = readingsData.find((r) => r.type === "egfr");
        if (match?.value != null) {
          details[cId] = {
            ...base,
            keyMetric: `${Math.round(parseFloat(match.value))} mL/min/1.73m²`,
            lastUpdated: new Date(match.recordedAt || (match as any).recorded_at || Date.now()).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
          };
        }
      } else if (cId === "hypothyroidism") {
        match = readingsData.find((r) => r.type === "tsh");
        if (match?.value != null) {
          details[cId] = {
            ...base,
            keyMetric: `${parseFloat(match.value).toFixed(2)} mIU/L`,
            lastUpdated: new Date(match.recordedAt || (match as any).recorded_at || Date.now()).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
          };
        }
      } else if (cId === "ra") {
        match = readingsData.find((r) => r.type === "crp" || r.type === "pain_scale");
        if (match?.value != null) {
          details[cId] = {
            ...base,
            keyMetric: match.type === "crp" ? `CRP: ${match.value} mg/L` : `Pain: ${match.value}/10`,
            lastUpdated: new Date(match.recordedAt || (match as any).recorded_at || Date.now()).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
          };
        }
      } else if (cId === "asthma") {
        match = readingsData.find((r) => r.type === "asthma_control" || r.type === "test_score");
        if (match?.value != null) {
          details[cId] = {
            ...base,
            keyMetric: `ACT: ${match.value}/25`,
            lastUpdated: new Date(match.recordedAt || (match as any).recorded_at || Date.now()).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
          };
        }
      }
    }
    return details;
  }, [readingsData]);

  const TrendIcon = (trend: "up" | "down" | "stable") =>
    trend === "down" ? TrendingDown : trend === "up" ? TrendingUp : Minus;

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto px-4 lg:px-6 py-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-6 animate-fade-in">
          <div>
            <h1 className="font-bold text-display text-text-primary">My Conditions</h1>
            <p className="text-body-md text-text-secondary mt-1 flex items-center gap-2">
              <span>
                Managing {myConditionIds.length} chronic condition
                {myConditionIds.length !== 1 ? "s" : ""}
              </span>
              {isMutating && (
                <span className="inline-flex items-center gap-1 text-xs text-accent-violet">
                  <Loader2 size={12} className="animate-spin" />
                  <span>Syncing…</span>
                </span>
              )}
            </p>
          </div>
          <button
            onClick={() => setAddModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-dashed border-accent-lavender text-accent-violet text-label-sm font-semibold hover:bg-bg-lavender transition-all cursor-pointer"
          >
            <Plus size={15} aria-hidden="true" />
            <span>Add Condition</span>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-bg-card rounded-xl shadow-card mb-6">
          {(["mine", "all"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={clsx(
                "flex-1 py-2.5 rounded-lg text-label-sm font-semibold transition-all cursor-pointer",
                tab === t
                  ? "gradient-violet text-white shadow-sm"
                  : "text-text-secondary hover:text-text-primary"
              )}
            >
              {t === "mine"
                ? `My Conditions (${myConditionIds.length})`
                : "All Supported Conditions"}
            </button>
          ))}
        </div>

        {/* My conditions tab */}
        {tab === "mine" && (
          <div className="space-y-4">
            {!hasHydratedConditions ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 size={24} className="animate-spin text-accent-violet" />
              </div>
            ) : myConditionIds.length === 0 ? (
              <div className="bg-bg-card border border-divider rounded-2xl p-10 shadow-card text-center space-y-4 animate-fade-in">
                <div className="w-14 h-14 rounded-2xl bg-bg-lavender text-accent-violet flex items-center justify-center mx-auto shadow-xs">
                  <Activity size={28} />
                </div>
                <div className="max-w-md mx-auto">
                  <h3 className="font-bold text-title-md text-text-primary">
                    No Chronic Conditions Tracked
                  </h3>
                  <p className="text-body-md text-text-secondary mt-1.5 leading-relaxed">
                    Select your diagnosed chronic conditions to activate tailored vital tracking,
                    clinical alerts, and personalized medication management.
                  </p>
                </div>
                <button
                  onClick={() => setAddModalOpen(true)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl gradient-violet text-white text-label-sm font-semibold shadow-card hover:opacity-95 transition-opacity cursor-pointer"
                >
                  <Plus size={16} />
                  <span>Log a Condition</span>
                </button>
              </div>
            ) : (
              <>
                {/* Quick tiles grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
                  {conditionSummaries.map((s) => (
                    <Link
                      href={`/conditions/${s.conditionId}`}
                      key={s.conditionId}
                      className="block hover:scale-[1.01] transition-transform"
                    >
                      <ConditionTile summary={s} />
                    </Link>
                  ))}
                </div>

                {/* Detail cards */}
                {myConditionIds.map((cId) => {
                  const c = conditionColors[cId];
                  const detail = conditionDetails[cId];
                  if (!c || !detail) return null;
                  const Icon = TrendIcon(detail.weekTrend);
                  const trendColor =
                    detail.weekTrend === "down"
                      ? "#00B894"
                      : detail.weekTrend === "up"
                      ? "#D63031"
                      : "#8888A8";

                  return (
                    <Link
                      key={cId}
                      href={`/conditions/${cId}`}
                      className="block bg-bg-card rounded-xl shadow-card p-4 card-enter hover:shadow-card-hover transition-all group"
                    >
                      <div className="flex items-start gap-4">
                        {/* Icon */}
                        <div
                          className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
                          style={{ background: c.bg }}
                        >
                          {c.emoji}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <h3 className="font-semibold text-title-md text-text-primary group-hover:text-accent-violet transition-colors">
                                {c.label}
                              </h3>
                              <p className="text-xs text-text-secondary mt-0.5 leading-snug">
                                {detail.description}
                              </p>
                            </div>
                            <ChevronRight
                              size={16}
                              className="text-text-tertiary group-hover:text-accent-violet transition-colors flex-shrink-0 mt-0.5"
                            />
                          </div>

                          <div className="flex items-center gap-4 mt-3">
                            {/* Key metric */}
                            <div>
                              <p className="text-xs text-text-tertiary mb-0.5">Latest</p>
                              <p
                                className="font-bold metric-value text-text-primary"
                                style={{ color: c.accent, fontSize: "15px" }}
                              >
                                {detail.keyMetric}
                              </p>
                            </div>
                            {/* Last updated */}
                            <div>
                              <p className="text-xs text-text-tertiary mb-0.5">Updated</p>
                              <p className="text-label-sm text-text-secondary">
                                {detail.lastUpdated}
                              </p>
                            </div>
                            {/* Week trend */}
                            <div className="ml-auto flex items-center gap-1">
                              <Icon size={14} style={{ color: trendColor }} aria-hidden="true" />
                              <span
                                className="text-xs font-semibold capitalize"
                                style={{ color: trendColor }}
                              >
                                {detail.weekTrend === "down"
                                  ? "Improving"
                                  : detail.weekTrend === "up"
                                  ? "Worsening"
                                  : "Stable"}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </>
            )}
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
                <div
                  key={cId}
                  className={clsx(
                    "bg-bg-card rounded-xl p-4 shadow-card card-enter flex items-center gap-3",
                    isTracking && "border border-accent-lavender/40"
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
                    <p className="text-xs text-text-tertiary mt-0.5">
                      {conditionDetails[cId]?.description ?? "Chronic condition tracking"}
                    </p>
                  </div>
                  {isTracking ? (
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <span className="text-xs font-semibold text-accent-violet bg-bg-lavender px-2.5 py-1 rounded-full">
                        Tracking
                      </span>
                      <button
                        onClick={() => removeCondition(cId)}
                        disabled={isMutating}
                        className="text-[10px] font-semibold text-status-red hover:underline ml-1 cursor-pointer disabled:opacity-50"
                        title="Stop tracking"
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => addCondition(cId)}
                      disabled={isMutating}
                      className="text-xs font-semibold text-text-tertiary hover:text-accent-violet hover:bg-bg-lavender px-2.5 py-1 rounded-full transition-all flex-shrink-0 cursor-pointer disabled:opacity-50"
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
            <div
              className="bg-bg-card rounded-2xl w-full max-w-lg border border-divider shadow-2xl flex flex-col overflow-hidden max-h-[85vh] animate-scale-up"
              style={{ boxShadow: "0 20px 50px rgba(108,92,231,0.2)" }}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-divider bg-bg-lavender/10">
                <div>
                  <h2 className="font-bold text-title-lg text-text-primary">
                    Add Health Condition
                  </h2>
                  <p className="text-xs text-text-tertiary mt-0.5">
                    Select a chronic condition to start tracking
                  </p>
                </div>
                <button
                  onClick={() => setAddModalOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-bg-lavender text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
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
                    className="text-text-tertiary hover:text-text-primary p-0.5 cursor-pointer"
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
                        <p className="text-xs font-semibold">
                          No conditions found matching "{searchQuery}"
                        </p>
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
                          <p className="text-[11px] text-text-tertiary truncate">
                            {conditionDetails[cId]?.description ?? "Chronic condition tracking"}
                          </p>
                        </div>
                        {isTracking ? (
                          <div className="flex flex-col items-end gap-1 flex-shrink-0">
                            <span className="text-xs font-semibold text-accent-violet bg-bg-lavender px-2.5 py-1 rounded-full">
                              Tracking
                            </span>
                            <button
                              onClick={() => removeCondition(cId)}
                              disabled={isMutating}
                              className="text-[10px] font-semibold text-status-red hover:underline cursor-pointer disabled:opacity-50"
                            >
                              Remove
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => addCondition(cId)}
                            disabled={isMutating}
                            className="text-xs font-bold text-white gradient-violet px-3 py-1.5 rounded-full shadow-sm hover:opacity-90 active:scale-95 transition-all flex-shrink-0 cursor-pointer disabled:opacity-50"
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
                  className="px-4 py-2 rounded-xl border border-divider text-label-sm font-semibold text-text-secondary hover:bg-bg-lavender transition-all cursor-pointer"
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
