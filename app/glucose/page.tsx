"use client";

import React, { useState, useMemo } from "react";
import AppShell from "@/components/layout/AppShell";
import GlucoseChart from "@/components/charts/GlucoseChart";
import LogReadingModal from "@/components/modals/LogReadingModal";
import { useReadings } from "@/hooks/useApi";
import type { SparklinePoint } from "@/types";
import { PlusCircle, Activity, Sparkles, TrendingUp } from "lucide-react";

export default function GlucoseTrackerPage() {
  const [logModalOpen, setLogModalOpen] = useState(false);
  const { data: readings = [], mutate } = useReadings("blood_glucose", 100);

  const chartData: SparklinePoint[] = useMemo(() => {
    if (!readings || readings.length === 0) return [];
    return [...readings]
      .sort((a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime())
      .map((r) => ({
        time: r.recordedAt,
        value: typeof r.value === "number" ? r.value : parseFloat(r.value) || 0,
      }));
  }, [readings]);

  // Quick stats
  const latestVal = chartData.length > 0 ? chartData[chartData.length - 1]?.value ?? null : null;
  const inRangeCount = chartData.filter((d) => d.value >= 70 && d.value <= 180).length;
  const timeInRange = chartData.length > 0 ? Math.round((inRangeCount / chartData.length) * 100) : 0;

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto px-4 lg:px-6 py-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 animate-fade-in">
          <div>
            <h1 className="font-bold text-display text-text-primary">Glucose Tracker</h1>
            <p className="text-body-md text-text-secondary mt-1">
              Log readings by meal context · Track trends · Visualise daily metrics
            </p>
          </div>
          <button
            onClick={() => setLogModalOpen(true)}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl gradient-violet text-white text-label-md font-semibold shadow-card hover:opacity-95 transition-opacity active:scale-[0.98]"
          >
            <PlusCircle size={18} />
            Log Blood Glucose
          </button>
        </div>

        {/* Metric Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-bg-card rounded-xl p-4 shadow-card border border-divider">
            <div className="flex items-center gap-2 text-text-tertiary mb-1">
              <Activity size={16} className="text-accent-violet" />
              <span className="text-xs font-medium">Latest Glucose</span>
            </div>
            <p className="text-title-xl font-bold metric-value text-text-primary">
              {latestVal !== null ? `${latestVal} ` : "-- "}
              <span className="text-xs font-normal text-text-tertiary">mg/dL</span>
            </p>
          </div>

          <div className="bg-bg-card rounded-xl p-4 shadow-card border border-divider">
            <div className="flex items-center gap-2 text-text-tertiary mb-1">
              <TrendingUp size={16} className="text-status-green" />
              <span className="text-xs font-medium">Time in Target (70–180)</span>
            </div>
            <p className="text-title-xl font-bold metric-value text-text-primary">
              {chartData.length > 0 ? `${timeInRange}%` : "--"}
            </p>
          </div>

          <div className="bg-bg-card rounded-xl p-4 shadow-card border border-divider">
            <div className="flex items-center gap-2 text-text-tertiary mb-1">
              <Sparkles size={16} className="text-accent-teal" />
              <span className="text-xs font-medium">Total Entries</span>
            </div>
            <p className="text-title-xl font-bold metric-value text-text-primary">
              {chartData.length}
            </p>
          </div>
        </div>

        {/* Glucose Chart with Zero State */}
        <GlucoseChart data={chartData} />

        <div className="h-8" />
      </div>

      <LogReadingModal
        open={logModalOpen}
        onClose={() => setLogModalOpen(false)}
        onSaved={() => {
          void mutate();
        }}
      />
    </AppShell>
  );
}
