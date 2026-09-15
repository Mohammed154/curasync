"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import AppShell from "@/components/layout/AppShell";
import AlertBanner from "@/components/ui/AlertBanner";
import VitalCard from "@/components/patient/VitalCard";
import MedicationCard from "@/components/patient/MedicationCard";
import GlucoseChart from "@/components/charts/GlucoseChart";
import LogReadingModal from "@/components/modals/LogReadingModal";
import WeeklySummaryCard, { DEFAULT_WEEKLY_SUMMARY } from "@/components/dashboard/WeeklySummaryCard";
import UpcomingRemindersStrip, { MOCK_UPCOMING_DOSES } from "@/components/dashboard/UpcomingRemindersStrip";
import AdherenceStreakCard from "@/components/patient/AdherenceStreakCard";
import ConditionTile from "@/components/patient/ConditionTile";
import { getMockDashboardData } from "@/lib/mock-data";
import { getRelevantVitalKeysForConditions, VITAL_METADATA } from "@/lib/condition-vitals-map";
import { useReadings, useAlerts, useMedications, patchAlert, logDose as apiLogDose } from "@/hooks/useApi";
import type { DashboardData, Alert, TodayMedication, ConditionId, SparklinePoint, LatestReadings } from "@/types";
import { format } from "date-fns";
import Link from "next/link";
import { RefreshCw, PlusCircle, ChevronDown, ChevronUp, Video } from "lucide-react";

export default function DashboardPage() {
  const initialMock = useMemo(() => getMockDashboardData(), []);

  // ── SWR Live Data Hooks ──────────────────────────────────────────────────
  const { data: readingsData, mutate: mutateReadings, isValidating: isReadingsValidating } = useReadings(undefined, 100);
  const { data: alertsData, mutate: mutateAlerts } = useAlerts("active");
  const { data: medicationsData, mutate: mutateMeds } = useMedications();

  // Local optimistic overrides
  const [dismissedAlertIds, setDismissedAlertIds] = useState<Set<string>>(() => new Set());
  const [localMedStatuses, setLocalMedStatuses] = useState<Record<string, TodayMedication["status"]>>({});
  const [upcomingDoses, setUpcomingDoses] = useState(() => MOCK_UPCOMING_DOSES);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [logModalOpen, setLogModalOpen] = useState(false);
  const [showMoreWidgets, setShowMoreWidgets] = useState(false);

  // ── Derive Live Biometrics from DB Readings with Fallbacks ───────────────
  const latestReadings: LatestReadings = useMemo(() => {
    const base = { ...initialMock.latestReadings };
    if (!readingsData || readingsData.length === 0) return base;

    const seenTypes = new Set<string>();

    for (const r of readingsData) {
      if (seenTypes.has(r.type)) continue;
      const numVal = parseFloat(r.value);
      if (isNaN(numVal)) continue;

      seenTypes.add(r.type);

      switch (r.type) {
        case "blood_glucose":
          base.bloodGlucose = Math.round(numVal);
          break;
        case "blood_pressure_systolic":
          base.systolic = Math.round(numVal);
          break;
        case "blood_pressure_diastolic":
          base.diastolic = Math.round(numVal);
          break;
        case "heart_rate":
          base.heartRate = Math.round(numVal);
          break;
        case "spo2":
          base.spo2 = Math.round(numVal);
          break;
        case "weight":
          base.weight = parseFloat(numVal.toFixed(1));
          break;
      }
    }

    base.lastSyncedAt = readingsData[0]?.recordedAt || base.lastSyncedAt;
    return base;
  }, [readingsData, initialMock.latestReadings]);

  // ── Derive Primary Condition Sparkline Points from DB Readings ───────────
  const recentReadings: SparklinePoint[] = useMemo(() => {
    if (!readingsData || readingsData.length === 0) {
      return initialMock.recentReadings;
    }

    const glucoseReadings = readingsData
      .filter((r) => r.type === "blood_glucose")
      .slice(0, 12)
      .reverse();

    if (glucoseReadings.length === 0) {
      return initialMock.recentReadings;
    }

    return glucoseReadings.map((r) => ({
      time: format(new Date(r.recordedAt), "h a"),
      value: Math.round(parseFloat(r.value)),
    }));
  }, [readingsData, initialMock.recentReadings]);

  // ── Derive Today's Medications from DB or Mock ───────────────────────────
  const todayMedications: TodayMedication[] = useMemo(() => {
    let sourceList: TodayMedication[] = [];

    if (medicationsData && medicationsData.length > 0) {
      sourceList = medicationsData.map((m: any) => ({
        id: m.id,
        name: m.name,
        dosage: m.dosage,
        scheduledAt: m.scheduledTimes?.[0] || "08:00",
        status: (m.status as TodayMedication["status"]) || "pending",
        conditionId: (m.conditionId as ConditionId) || "diabetes_t2",
      }));
    } else {
      sourceList = initialMock.todayMedications;
    }

    // Apply local optimistic overrides
    return sourceList.map((med) => {
      const localStatus = localMedStatuses[med.id];
      return localStatus ? { ...med, status: localStatus } : med;
    });
  }, [medicationsData, localMedStatuses, initialMock.todayMedications]);

  // ── Active Alerts with Dismiss Filter ────────────────────────────────────
  const activeAlerts: Alert[] = useMemo(() => {
    const rawList = alertsData ?? initialMock.activeAlerts;
    return rawList.filter((a) => !dismissedAlertIds.has(a.id));
  }, [alertsData, dismissedAlertIds, initialMock.activeAlerts]);

  // ── Manual & Background Refresh ─────────────────────────────────────────
  const refresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await Promise.allSettled([
        mutateReadings(),
        mutateAlerts(),
        mutateMeds(),
      ]);
      setLastRefreshed(new Date());
    } finally {
      setIsRefreshing(false);
    }
  }, [mutateReadings, mutateAlerts, mutateMeds]);

  // ── Alert dismiss with API persistence ──────────────────────────────────
  const dismissAlert = async (id: string) => {
    setDismissedAlertIds((prev) => new Set([...prev, id]));
    try {
      await patchAlert(id, "dismiss");
      await mutateAlerts();
    } catch (err) {
      console.error("[dashboard] Error dismissing alert:", err);
    }
  };

  // ── Log dose with API persistence ───────────────────────────────────────
  const logDose = async (medId: string, status: TodayMedication["status"]) => {
    // 1. Optimistic local update
    setLocalMedStatuses((prev) => ({ ...prev, [medId]: status }));

    // 2. Remove matching upcoming reminder
    const matchedMed = todayMedications.find((m) => m.id === medId);
    if (matchedMed) {
      setUpcomingDoses((prev) =>
        prev.filter((d) => d.medicationName.toLowerCase() !== matchedMed.name.toLowerCase())
      );
    }

    // 3. Persist to API
    try {
      await apiLogDose({
        medicationId: medId,
        status: status === "taken" ? "taken" : "skipped",
        scheduledAt: new Date().toISOString(),
      });
      await mutateMeds();
    } catch (err) {
      console.error("[dashboard] Failed to persist dose log:", err);
    }
  };

  const markUpcomingDoseTaken = async (doseId: string) => {
    const dose = upcomingDoses.find((d) => d.id === doseId);
    if (!dose) return;

    setUpcomingDoses((prev) => prev.filter((d) => d.id !== doseId));

    const matchedMed = todayMedications.find(
      (m) => m.name.toLowerCase() === dose.medicationName.toLowerCase()
    );
    if (matchedMed) {
      await logDose(matchedMed.id, "taken");
    }
  };

  const { patient, conditionSummaries, weeklyAdherence, streakDays } = initialMock;

  // ── Condition-derived relevant vitals (Capped at 4) ───────────────────────
  const relevantVitalKeys = useMemo(
    () => getRelevantVitalKeysForConditions(patient.conditions, 4),
    [patient.conditions]
  );

  return (
    <AppShell alertCount={activeAlerts.length}>
      <div className="max-w-5xl mx-auto px-4 lg:px-6 py-6 space-y-6">

        {/* ── 1. Greeting Header ─────────────────────────────────────────── */}
        <div className="flex items-start justify-between gap-4 animate-fade-in">
          <div>
            <h1 className="font-bold text-display text-text-primary leading-tight">
              Hey, {patient.name.split(" ")[0]} 👋
            </h1>
            <p className="text-body-md text-text-secondary mt-1">
              {format(new Date(), "EEEE, MMMM d")} · Managing{" "}
              <span className="font-semibold text-accent-violet">
                {patient.conditions.length} conditions
              </span>
            </p>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Live Video Consultation action */}
            <Link
              href="/telehealth"
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-status-green hover:opacity-90 text-white text-label-sm font-bold shadow-card transition-all"
            >
              <Video size={15} aria-hidden="true" />
              <span>Video Call</span>
            </Link>

            {/* Manual refresh */}
            <button
              onClick={refresh}
              disabled={isRefreshing || isReadingsValidating}
              className="p-2 rounded-lg bg-bg-card border border-divider text-text-secondary hover:text-accent-violet hover:border-accent-lavender transition-all shadow-card disabled:opacity-50"
              aria-label="Refresh readings"
            >
              <RefreshCw
                size={16}
                className={isRefreshing || isReadingsValidating ? "animate-spin" : ""}
              />
            </button>

            {/* Log reading action */}
            <button
              onClick={() => setLogModalOpen(true)}
              className="flex items-center gap-2 px-3.5 py-2 rounded-lg gradient-violet text-white text-label-sm font-semibold shadow-card hover:opacity-90 transition-opacity"
            >
              <PlusCircle size={15} aria-hidden="true" />
              <span>Log Reading</span>
            </button>
          </div>
        </div>

        {/* ── Live Telehealth Video Call Banner ─────────────────────────────── */}
        <section aria-label="Live Video Consultation">
          <div className="rounded-2xl p-4 sm:p-5 bg-gradient-to-r from-[#1B1238] via-[#0F172A] to-[#0A2522] border border-violet-800/40 shadow-card flex flex-col sm:flex-row sm:items-center justify-between gap-4 card-enter">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl gradient-violet flex items-center justify-center text-white flex-shrink-0 shadow-md">
                <Video size={20} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-bold text-sm text-white">Live Clinical Consultation</h2>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Doctor Ready
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-0.5">
                  Dr. Priya Sharma is available for your chronic care telehealth consultation.
                </p>
              </div>
            </div>
            <Link
              href="/telehealth"
              className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-status-green hover:opacity-90 text-white font-bold text-xs shadow-md transition-all active:scale-95 flex-shrink-0"
            >
              <Video size={14} />
              <span>Start Live Video Call</span>
            </Link>
          </div>
        </section>

        {/* ── 2. Hero Vitals Row (Condition-derived, Max 4) ─────────────────── */}
        <section aria-label="Hero Vitals">
          <div
            className={`grid gap-3 ${
              relevantVitalKeys.length === 1
                ? "grid-cols-1"
                : relevantVitalKeys.length === 2
                ? "grid-cols-1 sm:grid-cols-2"
                : relevantVitalKeys.length === 3
                ? "grid-cols-1 sm:grid-cols-3"
                : "grid-cols-2 sm:grid-cols-4"
            }`}
          >
            {relevantVitalKeys.map((vitalKey) => {
              const meta = VITAL_METADATA[vitalKey];
              if (!meta) return null;

              return (
                <VitalCard
                  key={meta.key}
                  label={meta.label}
                  value={meta.getValue(latestReadings)}
                  unit={meta.unit}
                  status={meta.getStatus(latestReadings)}
                  icon={meta.icon}
                  sublabel={meta.sublabel}
                  animate={meta.key === "blood_glucose"}
                  onClick={() => setLogModalOpen(true)}
                />
              );
            })}
          </div>
        </section>

        {/* ── 3. Today's Medications ───────────────────────────────────────── */}
        <section aria-label="Today's Medications">
          <MedicationCard
            medications={todayMedications}
            onLogDose={logDose}
          />
        </section>

        {/* ── 4. Active Alerts (Only rendered when activeAlerts.length > 0) ── */}
        {activeAlerts.length > 0 && (
          <section aria-label="Active Alerts">
            <AlertBanner alerts={activeAlerts} onDismiss={dismissAlert} />
          </section>
        )}

        {/* ── 5. Primary Condition Trend Chart ─────────────────────────────── */}
        <section aria-label="Primary Trend Chart">
          <GlucoseChart data={recentReadings} targetMin={70} targetMax={180} />
        </section>

        {/* ── Optional Collapsible More Section (Hidden on first load) ─────── */}
        <div className="pt-2">
          <button
            onClick={() => setShowMoreWidgets((prev) => !prev)}
            className="flex items-center gap-1.5 text-xs font-semibold text-text-tertiary hover:text-text-primary transition-colors py-2"
            aria-expanded={showMoreWidgets}
          >
            <span>{showMoreWidgets ? "Hide Additional Insights" : "Show More Insights & Summaries"}</span>
            {showMoreWidgets ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>

          {showMoreWidgets && (
            <div className="space-y-6 pt-4 border-t border-divider animate-fade-in">
              <AdherenceStreakCard
                weeklyAdherence={weeklyAdherence}
                streakDays={streakDays}
              />
              <UpcomingRemindersStrip
                doses={upcomingDoses}
                onMarkTaken={markUpcomingDoseTaken}
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {conditionSummaries.map((summary) => (
                  <ConditionTile key={summary.conditionId} summary={summary} />
                ))}
              </div>
              <WeeklySummaryCard {...DEFAULT_WEEKLY_SUMMARY} />
            </div>
          )}
        </div>

        {/* ── Log Reading Modal ────────────────────────────────────────────── */}
        <LogReadingModal
          open={logModalOpen}
          onClose={() => setLogModalOpen(false)}
          onSaved={() => {
            void mutateReadings();
            void mutateAlerts();
          }}
        />
      </div>
    </AppShell>
  );
}

