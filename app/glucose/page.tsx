"use client";

import AppShell from "@/components/layout/AppShell";
import GlucoseChart from "@/components/charts/GlucoseChart";
import { generateSparklinePublic } from "@/lib/mock-data";

const glucoseData = generateSparklinePublic(130, 165, 24);

export default function GlucoseTrackerPage() {
  return (
    <AppShell>
      <div className="max-w-3xl mx-auto px-4 lg:px-6 py-6">
        <div className="mb-5 animate-fade-in">
          <h1 className="font-bold text-display text-text-primary">Glucose Tracker</h1>
          <p className="text-body-md text-text-secondary mt-1">
            Log readings by type · Track insulin & carbs · Visualise daily trends
          </p>
        </div>
        <GlucoseChart data={glucoseData} />
        <div className="h-8" />
      </div>
    </AppShell>
  );
}
