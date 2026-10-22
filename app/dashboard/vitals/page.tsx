"use client";

import React, { useState, useMemo } from "react";
import AppShell from "@/components/layout/AppShell";
import LogReadingModal from "@/components/modals/LogReadingModal";
import { useReadings } from "@/hooks/useApi";
import { PlusCircle, Activity, Heart, TestTube2, ArrowUpRight, Calendar, ShieldCheck, RefreshCw } from "lucide-react";
import { format } from "date-fns";

export default function VitalsDashboardPage() {
  const [logModalOpen, setLogModalOpen] = useState(false);
  const { data: allReadings = [], mutate, isValidating } = useReadings(undefined, 100);

  // Separate recent readings by metric
  const hba1cReadings = useMemo(() => allReadings.filter((r) => r.type === "hba1c"), [allReadings]);
  const bpSysReadings = useMemo(() => allReadings.filter((r) => r.type === "blood_pressure_systolic"), [allReadings]);
  const bpDiaReadings = useMemo(() => allReadings.filter((r) => r.type === "blood_pressure_diastolic"), [allReadings]);
  const glucoseReadings = useMemo(() => allReadings.filter((r) => r.type === "blood_glucose"), [allReadings]);
  const hrReadings = useMemo(() => allReadings.filter((r) => r.type === "heart_rate"), [allReadings]);

  const latestHba1c = hba1cReadings[0]?.value ?? null;
  const latestSys = bpSysReadings[0]?.value ?? null;
  const latestDia = bpDiaReadings[0]?.value ?? null;
  const latestGlucose = glucoseReadings[0]?.value ?? null;
  const latestHr = hrReadings[0]?.value ?? null;

  return (
    <AppShell>
      <div className="max-w-5xl mx-auto px-4 lg:px-6 py-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-fade-in">
          <div>
            <h1 className="font-bold text-display text-text-primary">Vitals & Lab Results</h1>
            <p className="text-body-md text-text-secondary mt-1">
              Clinical measurements, historical lab panels, and diagnostic trends
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => mutate()}
              disabled={isValidating}
              className="p-2.5 rounded-xl bg-bg-card border border-divider text-text-secondary hover:text-accent-violet transition-all shadow-card disabled:opacity-50 cursor-pointer"
              title="Refresh readings"
            >
              <RefreshCw size={16} className={isValidating ? "animate-spin" : ""} />
            </button>
            <button
              onClick={() => setLogModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl gradient-violet text-white text-label-sm font-semibold shadow-card hover:opacity-95 transition-all cursor-pointer active:scale-95"
            >
              <PlusCircle size={16} aria-hidden="true" />
              <span>+ Log Vitals / Add Lab Result</span>
            </button>
          </div>
        </div>

        {/* Overview Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* HbA1c */}
          <div className="bg-bg-card rounded-2xl p-4 shadow-card border border-divider space-y-2 card-enter">
            <div className="flex items-center justify-between text-text-tertiary">
              <span className="text-xs font-semibold">Latest HbA1c</span>
              <TestTube2 size={16} className="text-accent-violet" />
            </div>
            <p className="text-2xl font-bold metric-value text-text-primary">
              {latestHba1c !== null ? `${latestHba1c}%` : "--"}
            </p>
            <p className="text-[11px] text-text-tertiary">
              Target: &lt; 7.0% · Lab test average
            </p>
          </div>

          {/* Blood Pressure */}
          <div className="bg-bg-card rounded-2xl p-4 shadow-card border border-divider space-y-2 card-enter">
            <div className="flex items-center justify-between text-text-tertiary">
              <span className="text-xs font-semibold">Blood Pressure</span>
              <Activity size={16} className="text-[#E84393]" />
            </div>
            <p className="text-2xl font-bold metric-value text-text-primary">
              {latestSys !== null && latestDia !== null ? `${latestSys}/${latestDia}` : latestSys !== null ? `${latestSys} sys` : "--"}
              <span className="text-xs font-normal text-text-tertiary ml-1">mmHg</span>
            </p>
            <p className="text-[11px] text-text-tertiary">
              Target: &lt; 120/80 mmHg
            </p>
          </div>

          {/* Blood Glucose */}
          <div className="bg-bg-card rounded-2xl p-4 shadow-card border border-divider space-y-2 card-enter">
            <div className="flex items-center justify-between text-text-tertiary">
              <span className="text-xs font-semibold">Blood Glucose</span>
              <Activity size={16} className="text-status-green" />
            </div>
            <p className="text-2xl font-bold metric-value text-text-primary">
              {latestGlucose !== null ? `${latestGlucose}` : "--"}
              <span className="text-xs font-normal text-text-tertiary ml-1">mg/dL</span>
            </p>
            <p className="text-[11px] text-text-tertiary">
              Target: 70–130 mg/dL (fasting)
            </p>
          </div>

          {/* Heart Rate */}
          <div className="bg-bg-card rounded-2xl p-4 shadow-card border border-divider space-y-2 card-enter">
            <div className="flex items-center justify-between text-text-tertiary">
              <span className="text-xs font-semibold">Resting Heart Rate</span>
              <Heart size={16} className="text-status-red" />
            </div>
            <p className="text-2xl font-bold metric-value text-text-primary">
              {latestHr !== null ? `${latestHr}` : "--"}
              <span className="text-xs font-normal text-text-tertiary ml-1">bpm</span>
            </p>
            <p className="text-[11px] text-text-tertiary">
              Normal: 60–100 bpm
            </p>
          </div>
        </div>

        {/* Recent Readings Table */}
        <div className="bg-bg-card rounded-2xl shadow-card border border-divider overflow-hidden">
          <div className="p-4 border-b border-divider flex items-center justify-between">
            <div>
              <h2 className="font-bold text-title-sm text-text-primary">Recorded History & Labs</h2>
              <p className="text-xs text-text-secondary mt-0.5">
                {allReadings.length} total biometric logs stored in your health record
              </p>
            </div>
          </div>

          {allReadings.length === 0 ? (
            <div className="p-10 text-center space-y-3">
              <div className="w-12 h-12 rounded-xl bg-bg-lavender flex items-center justify-center mx-auto text-accent-violet">
                <Activity size={24} />
              </div>
              <p className="text-sm font-semibold text-text-primary">No vitals logged yet</p>
              <p className="text-xs text-text-secondary max-w-sm mx-auto">
                Use the button above to log your blood pressure, HbA1c, glucose, or lab results.
              </p>
              <button
                onClick={() => setLogModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl gradient-violet text-white text-xs font-semibold shadow-xs"
              >
                <PlusCircle size={14} />
                <span>+ Log Vitals / Add Lab Result</span>
              </button>
            </div>
          ) : (
            <div className="divide-y divide-divider/60">
              {allReadings.slice(0, 25).map((r) => (
                <div key={r.id} className="p-3.5 flex items-center justify-between hover:bg-bg-light/50 transition-colors">
                  <div className="space-y-0.5">
                    <p className="text-sm font-semibold text-text-primary capitalize">
                      {r.type.replace(/_/g, " ")}
                    </p>
                    <p className="text-xs text-text-tertiary flex items-center gap-2">
                      <Calendar size={12} />
                      <span>{format(new Date(r.recordedAt), "MMM d, yyyy · h:mm a")}</span>
                      <span>· Source: {r.source}</span>
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-base font-bold metric-value text-text-primary">
                      {r.value} <span className="text-xs font-normal text-text-tertiary">{r.unit}</span>
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modal */}
        <LogReadingModal
          open={logModalOpen}
          onClose={() => setLogModalOpen(false)}
          onSaved={() => {
            void mutate();
          }}
        />
      </div>
    </AppShell>
  );
}
