"use client";

import React, { useEffect, useState, useCallback } from "react";
import AppShell from "@/components/layout/AppShell";
import AlertBanner from "@/components/ui/AlertBanner";
import ConditionTile from "@/components/patient/ConditionTile";
import VitalCard from "@/components/patient/VitalCard";
import MedicationCard from "@/components/patient/MedicationCard";
import GlucoseChart from "@/components/charts/GlucoseChart";
import GlucoseLogChart from "@/components/charts/GlucoseLogChart";
import AdherenceStreakCard from "@/components/patient/AdherenceStreakCard";
import LogReadingModal from "@/components/modals/LogReadingModal";
import WeeklySummaryCard, { DEFAULT_WEEKLY_SUMMARY } from "@/components/dashboard/WeeklySummaryCard";
import UpcomingRemindersStrip, { MOCK_UPCOMING_DOSES } from "@/components/dashboard/UpcomingRemindersStrip";
import { getMockDashboardData, getStreamedReading, getMockGlucoseLog } from "@/lib/mock-data";
import type { DashboardData, Alert, TodayMedication, BiometricType } from "@/types";
import { format } from "date-fns";
import { RefreshCw, Download, PlusCircle, Sparkles, MessageCircle, CalendarDays } from "lucide-react";
import Link from "next/link";

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData>(() => getMockDashboardData());
  const [alerts, setAlerts] = useState<Alert[]>(() => getMockDashboardData().activeAlerts);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [logModalOpen, setLogModalOpen] = useState(false);

  // ── Simulate real-time streaming (8-second refresh) ──────────────────────
  const refresh = useCallback(() => {
    setIsRefreshing(true);
    setTimeout(() => {
      setData((prev) => ({
        ...prev,
        latestReadings: {
          ...prev.latestReadings,
          bloodGlucose:  getStreamedReading(142, 18),
          heartRate:     getStreamedReading(74,  8),
          systolic:      getStreamedReading(138, 10),
          diastolic:     getStreamedReading(88,  6),
          spo2:          getStreamedReading(97,  2),
          lastSyncedAt:  new Date().toISOString(),
        },
      }));
      setLastRefreshed(new Date());
      setIsRefreshing(false);
    }, 600);
  }, []);

  const handlePdfExport = useCallback(async () => {
    try {
      const response = await fetch('/api/v1/export', {
        credentials: 'include',
      });
      if (!response.ok) {
        const errorText = await response.text();
        console.error('PDF export failed:', response.status, response.statusText, errorText);
        throw new Error(`Failed to generate PDF: ${response.status} ${response.statusText}`);
      }
      const result = await response.json();
      if (result.data.pdfUrl) {
        // Check if it's a development mock URL
        if (result.data.pdfUrl.includes('example.com/mock-pdf')) {
          alert('PDF export is mocked in development mode. In production, this would generate and download a real PDF report.');
          console.log('Mock PDF URL:', result.data.pdfUrl);
          return;
        }

        // Download the PDF
        const link = document.createElement('a');
        link.href = result.data.pdfUrl;
        link.download = `health-report-${result.data.patientName.replace(/\s+/g, '-').toLowerCase()}-${result.data.dateRange.start}-to-${result.data.dateRange.end}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        alert('PDF generation failed. Please try again.');
      }
    } catch (error) {
      console.error('PDF export error:', error);
      alert(`Failed to export PDF: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`);
    }
  }, []);

  useEffect(() => {
    const id = setInterval(refresh, 8000);
    return () => clearInterval(id);
  }, [refresh]);

  // ── Alert dismiss ──────────────────────────────────────────────────────────
  const dismissAlert = (id: string) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  };

  // ── Log dose ───────────────────────────────────────────────────────────────
  const logDose = (medId: string, status: TodayMedication["status"]) => {
    setData((prev) => ({
      ...prev,
      todayMedications: prev.todayMedications.map((m): TodayMedication =>
        m.id === medId ? { ...m, status } : m
      ),
    }));
  };

  const { patient, latestReadings, conditionSummaries, weeklyAdherence, streakDays, recentReadings, todayMedications } = data;

  // ── Derive vital status ────────────────────────────────────────────────────
  const bgStatus: "green" | "amber" | "red" =
    latestReadings.bloodGlucose > 250 ? "red" :
    latestReadings.bloodGlucose > 180 ? "amber" : "green";

  const bpStatus: "green" | "amber" | "red" =
    latestReadings.systolic > 180 ? "red" :
    latestReadings.systolic > 140 ? "amber" : "green";

  const hrStatus: "green" | "amber" | "red" =
    latestReadings.heartRate > 100 || latestReadings.heartRate < 50 ? "amber" : "green";

  const spo2Status: "green" | "amber" | "red" =
    latestReadings.spo2 < 90 ? "red" :
    latestReadings.spo2 < 94 ? "amber" : "green";

  const takenCount = todayMedications.filter((m) => m.status === "taken").length;
  const totalMeds  = todayMedications.length;

  return (
    <AppShell alertCount={alerts.length}>
      <div className="max-w-6xl mx-auto px-4 lg:px-6 py-6 space-y-6">

        {/* ── Page header ─────────────────────────────────────────────────── */}
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
            {/* Manual refresh */}
            <button
              onClick={refresh}
              className="p-2 rounded-lg bg-bg-card border border-divider text-text-secondary hover:text-accent-violet hover:border-accent-lavender transition-all shadow-card"
              aria-label="Refresh readings"
            >
              <RefreshCw
                size={16}
                className={isRefreshing ? "animate-spin" : ""}
              />
            </button>
            {/* Quick add FAB */}
            <button
              onClick={() => setLogModalOpen(true)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg gradient-violet text-white text-label-sm font-semibold shadow-card hover:opacity-90 transition-opacity"
            >
              <PlusCircle size={15} aria-hidden="true" />
              <span className="hidden sm:inline">Log Reading</span>
            </button>
          </div>
        </div>

        {/* ── AI Doctor Banner ──────────────────────────────────────────────── */}
        <Link
          href="/ai-doctor"
          className="block rounded-xl overflow-hidden card-enter hover:opacity-95 transition-opacity"
          style={{ background: "#0A0A0A" }}
          aria-label="Open AI Doctor chat"
        >
          <div className="flex items-center justify-between p-5">
            <div className="flex-1 min-w-0 pr-4">
              <p className="text-white/50 text-xs font-semibold uppercase tracking-widest mb-1">CuraSync AI</p>
              <h2 className="text-white font-bold text-xl leading-tight mb-1.5">Ask AI Doctor</h2>
              <p className="text-white/60 text-xs leading-relaxed line-clamp-2">
                Get plain-language explanations of your readings, medication questions, and what to ask your doctor.
              </p>
              <div className="flex items-center gap-1.5 mt-3 text-accent-lavender text-xs font-semibold">
                <Sparkles size={12} aria-hidden="true" />
                Powered by Claude · Not medical advice
              </div>
            </div>
            {/* Orb */}
            <div className="w-20 h-20 rounded-full flex-shrink-0 relative" aria-hidden="true">
              <div className="absolute inset-0 rounded-full"
                style={{ background: "conic-gradient(from 0deg, #6c5ce7, #a29bfe, #e84393, #00cec9, #6c5ce7)", animation: "orbSpin 8s linear infinite" }} />
              <div className="absolute inset-2 rounded-full flex items-center justify-center"
                style={{ background: "rgba(10,10,10,0.7)" }}>
                <MessageCircle size={22} className="text-white" />
              </div>
            </div>
          </div>
          <style>{`@keyframes orbSpin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </Link>

        {/* ── Active alerts ────────────────────────────────────────────────── */}
        {alerts.length > 0 && (
          <AlertBanner alerts={alerts} onDismiss={dismissAlert} />
        )}

        {/* ── Today at a Glance card ───────────────────────────────────────── */}
        <div
          className="rounded-xl p-4 lg:p-5 gradient-dark text-white card-enter"
          role="region"
          aria-label="Today at a glance"
        >
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-white/50 mb-1">
                Today at a Glance
              </p>
              <p className="text-sm text-white/70">
                Last synced {format(new Date(latestReadings.lastSyncedAt), "h:mm a")}
                {isRefreshing && (
                  <span className="ml-2 text-accent-lavender animate-pulse">
                    · Updating…
                  </span>
                )}
              </p>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10">
              <span className="w-1.5 h-1.5 rounded-full bg-status-green animate-pulse" aria-hidden="true" />
              <span className="text-xs font-semibold text-white">Live</span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* Medications */}
            <div className="bg-white/8 rounded-lg p-3 col-span-2 sm:col-span-1">
              <p className="text-xs text-white/50 mb-1">Medications</p>
              <p className="font-bold text-white" style={{ fontSize: "22px" }}>
                {takenCount}<span className="text-white/50 font-normal text-sm">/{totalMeds}</span>
              </p>
              <p className="text-xs text-white/50 mt-0.5">taken today</p>
            </div>

            <div className="bg-white/8 rounded-lg p-3">
              <p className="text-xs text-white/50 mb-1">Blood Sugar</p>
              <p
                className="font-bold metric-value"
                style={{
                  fontSize: "22px",
                  color: bgStatus === "green" ? "#00CEC9" : bgStatus === "amber" ? "#FDCB6E" : "#D63031",
                }}
              >
                {latestReadings.bloodGlucose}
              </p>
              <p className="text-xs text-white/50 mt-0.5">mg/dL</p>
            </div>

            <div className="bg-white/8 rounded-lg p-3">
              <p className="text-xs text-white/50 mb-1">Blood Pressure</p>
              <p
                className="font-bold metric-value"
                style={{
                  fontSize: "18px",
                  color: bpStatus === "green" ? "#00CEC9" : bpStatus === "amber" ? "#FDCB6E" : "#D63031",
                }}
              >
                {latestReadings.systolic}/{latestReadings.diastolic}
              </p>
              <p className="text-xs text-white/50 mt-0.5">mmHg</p>
            </div>

            <div className="bg-white/8 rounded-lg p-3">
              <p className="text-xs text-white/50 mb-1">Heart Rate</p>
              <p
                className="font-bold metric-value"
                style={{
                  fontSize: "22px",
                  color: hrStatus === "green" ? "#00CEC9" : "#FDCB6E",
                }}
              >
                {latestReadings.heartRate}
              </p>
              <p className="text-xs text-white/50 mt-0.5">bpm</p>
            </div>
          </div>
        </div>

        {/* ── Vitals grid ──────────────────────────────────────────────────── */}
        <section aria-labelledby="vitals-heading">
          <h2 id="vitals-heading" className="font-semibold text-title-md text-text-primary mb-3">
            Latest Readings
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <VitalCard
              label="Blood Glucose"
              value={String(latestReadings.bloodGlucose)}
              unit="mg/dL"
              status={bgStatus}
              icon="🩸"
              sublabel="Fasting"
              animate
            />
            <VitalCard
              label="Blood Pressure"
              value={`${latestReadings.systolic}/${latestReadings.diastolic}`}
              unit="mmHg"
              status={bpStatus}
              icon="💉"
              animate
            />
            <VitalCard
              label="Heart Rate"
              value={String(latestReadings.heartRate)}
              unit="bpm"
              status={hrStatus}
              icon="❤️"
              animate
            />
            <VitalCard
              label="SpO₂"
              value={String(latestReadings.spo2)}
              unit="%"
              status={spo2Status}
              icon="💨"
              sublabel="Blood oxygen"
              animate
            />
            <VitalCard
              label="Weight"
              value={String(latestReadings.weight)}
              unit="kg"
              status="green"
              icon="⚖️"
            />
            <VitalCard
              label="Streak"
              value={String(streakDays)}
              unit="days"
              status="green"
              icon="🔥"
              sublabel="Adherence"
            />
          </div>
        </section>

        {/* ── Condition tiles ───────────────────────────────────────────────── */}
        <section aria-labelledby="conditions-heading">
          <div className="flex items-center justify-between mb-3">
            <h2 id="conditions-heading" className="font-semibold text-title-md text-text-primary">
              My Conditions
            </h2>
            <button className="text-label-sm font-semibold text-accent-violet hover:text-accent-lavender transition-colors">
              View all →
            </button>
          </div>
          <div
            className="grid gap-3"
            style={{
              gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
            }}
          >
            {conditionSummaries.map((s) => (
              <Link key={s.conditionId} href={`/conditions/${s.conditionId}`} className="block hover:scale-[1.01] transition-transform">
                <ConditionTile summary={s} />
              </Link>
            ))}
          </div>
        </section>

        {/* ── Chart + Adherence ─────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <GlucoseChart data={recentReadings} />
          </div>
          <div>
            <AdherenceStreakCard
              weeklyAdherence={weeklyAdherence}
              streakDays={streakDays}
            />
          </div>
        </div>

        {/* ── Glucose Daily Log (from Python glucose tracker) ──────────── */}
        <section aria-labelledby="glucose-log-heading">
          <h2 id="glucose-log-heading" className="font-semibold text-title-md text-text-primary mb-3">
            🩸 Glucose Daily Log
          </h2>
          <GlucoseLogChart entries={getMockGlucoseLog()} />
        </section>

        {/* ── Medications ──────────────────────────────────────────────────── */}
        <section aria-labelledby="meds-heading">
          <h2 id="meds-heading" className="font-semibold text-title-md text-text-primary mb-3">
            Medications
          </h2>
          <MedicationCard
            medications={todayMedications}
            onLogDose={logDose}
          />
        </section>

        {/* ── Upcoming reminders strip ─────────────────────────────────────── */}
        <section aria-labelledby="reminders-heading">
          <h2 id="reminders-heading" className="font-semibold text-title-md text-text-primary mb-3">
            Upcoming Doses
          </h2>
          <UpcomingRemindersStrip doses={MOCK_UPCOMING_DOSES} />
        </section>

        {/* ── Weekly summary ────────────────────────────────────────────────── */}
        <WeeklySummaryCard {...DEFAULT_WEEKLY_SUMMARY} />

        {/* ── PDF export + calendar link ────────────────────────────────────── */}
        <div className="flex items-center justify-between gap-3">
          <Link
            href="/calendar"
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-divider bg-bg-card text-label-sm font-semibold text-text-secondary hover:text-accent-violet hover:border-accent-lavender transition-all shadow-card"
          >
            <CalendarDays size={15} aria-hidden="true" />
            Health Calendar
          </Link>
          <button
            onClick={handlePdfExport}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-divider bg-bg-card text-label-sm font-semibold text-text-secondary hover:text-accent-violet hover:border-accent-lavender transition-all shadow-card"
          >
            <Download size={15} aria-hidden="true" />
            Export PDF
          </button>
        </div>

        {/* Bottom padding — clears floating FAB */}
        <div className="h-24" />
      </div>

      {/* ── Floating Action Button ─────────────────────────────────────────── */}
      <button
        onClick={() => setLogModalOpen(true)}
        className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full gradient-violet text-white shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-transform"
        aria-label="Log a new reading"
        style={{ boxShadow: "0 8px 32px rgba(108,92,231,0.45)" }}
      >
        <PlusCircle size={26} strokeWidth={2} aria-hidden="true" />
      </button>

      {/* ── Log Reading Modal ──────────────────────────────────────────────── */}
      <LogReadingModal
        open={logModalOpen}
        onClose={() => setLogModalOpen(false)}
        onSaved={(type: BiometricType, value: number) => {
          refresh();
        }}
      />
    </AppShell>
  );
}
