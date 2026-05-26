"use client";

import React, { useState } from "react";
import AppShell from "@/components/layout/AppShell";
import GlucoseChart from "@/components/charts/GlucoseChart";
import SymptomHeatmap from "@/components/provider/SymptomHeatmap";
import AlertThresholdCustomizer from "@/components/provider/AlertThresholdCustomizer";
import { getMockDashboardData, getMockProviderPanel } from "@/lib/mock-data";
import { conditionColors } from "@/lib/design-tokens";
import { ArrowLeft, Download, MessageSquare, AlertTriangle, CheckCircle2, Clock, Pill, Activity, FileText, BookOpen, Sliders } from "lucide-react";
import Link from "next/link";
import { clsx } from "clsx";
import { format, subDays } from "date-fns";

interface Props {
  params: Promise<{ id: string }>;
}

const TIMELINE_EVENTS = [
  { id: "t1", type: "reading", icon: "🩸", label: "Blood Glucose logged", value: "142 mg/dL", time: new Date(Date.now() - 1000*60*30), status: "amber" as const },
  { id: "t2", type: "medication", icon: "💊", label: "Metformin 500mg taken", value: "On time", time: new Date(Date.now() - 1000*60*60*2), status: "green" as const },
  { id: "t3", type: "reading", icon: "💉", label: "Blood Pressure logged", value: "138/88 mmHg", time: new Date(Date.now() - 1000*60*60*3), status: "amber" as const },
  { id: "t4", type: "medication", icon: "💊", label: "Amlodipine 5mg taken", value: "On time", time: new Date(Date.now() - 1000*60*60*9), status: "green" as const },
  { id: "t5", type: "alert", icon: "⚠️", label: "BP trending above target", value: "138/88 mmHg", time: new Date(Date.now() - 1000*60*60*10), status: "amber" as const },
  { id: "t6", type: "symptom", icon: "📝", label: "Symptom logged", value: "Mild dizziness (4/10)", time: new Date(Date.now() - 1000*60*60*27), status: "amber" as const },
  { id: "t7", type: "medication", icon: "💊", label: "Metformin 500mg — Missed", value: "Missed dose", time: new Date(Date.now() - 1000*60*60*45), status: "red" as const },
];

const LAB_RESULTS = [
  { name: "HbA1c", value: "7.4%", date: "Apr 10, 2026", trend: "down", ref: "Target < 7.0%", status: "amber" as const },
  { name: "eGFR", value: "48 mL/min", date: "Apr 10, 2026", trend: "stable", ref: "Stage 3A CKD", status: "amber" as const },
  { name: "Creatinine", value: "1.6 mg/dL", date: "Apr 10, 2026", trend: "stable", ref: "Normal: 0.7–1.3", status: "amber" as const },
  { name: "LDL Cholesterol", value: "112 mg/dL", date: "Mar 5, 2026", trend: "down", ref: "Target < 100", status: "amber" as const },
  { name: "Blood Pressure", value: "138/88 mmHg", date: "Today", trend: "up", ref: "Target < 130/80", status: "amber" as const },
];

const STATUS_COLORS = {
  green: "#00B894", amber: "#F39C12", red: "#D63031",
};

export default function ProviderPatientDetailPage({ params }: Props) {
  const { id } = React.use(params);
  const { recentReadings, todayMedications, weeklyAdherence } = getMockDashboardData();
  const patients = getMockProviderPanel();
  const patient = patients.find((p) => p.patientId === id) ?? patients[0]!;
  const [tab, setTab] = useState<"timeline" | "medications" | "labs" | "symptoms" | "thresholds" | "notes">("timeline");
  const [providerNote, setProviderNote] = useState("");
  const [notes, setNotes] = useState<string[]>([]);

  const takenCount = todayMedications.filter((m) => m.status === "taken").length;

  return (
    <AppShell role="provider">
      <div className="max-w-4xl mx-auto px-4 lg:px-6 py-6 space-y-5">
        {/* Header */}
        <div className="flex items-start gap-3">
          <Link
            href="/provider"
            className="w-9 h-9 rounded-xl flex items-center justify-center bg-bg-card border border-divider shadow-card hover:bg-bg-lavender transition-colors flex-shrink-0 mt-1"
            aria-label="Back to panel"
          >
            <ArrowLeft size={17} className="text-text-secondary" />
          </Link>
          <div className="flex-1">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h1 className="font-bold text-display text-text-primary">{patient.name}</h1>
                <p className="text-body-md text-text-secondary mt-0.5">
                  {patient.age} yrs · {patient.conditions.map((c) => conditionColors[c]?.label).join(", ")}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <Link
                  href="/messages"
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-divider bg-bg-card text-label-sm font-semibold text-text-secondary hover:bg-bg-lavender hover:text-accent-violet transition-all shadow-card"
                >
                  <MessageSquare size={14} aria-hidden="true" />
                  Message
                </Link>
                <button className="flex items-center gap-1.5 px-3 py-2 rounded-lg gradient-violet text-white text-label-sm font-semibold shadow-card hover:opacity-90 transition-opacity">
                  <Download size={14} aria-hidden="true" />
                  PDF Export
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Stats strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: "Alert Status", value: patient.alertStatus.toUpperCase(), color: STATUS_COLORS[patient.alertStatus], bg: patient.alertStatus === "red" ? "#FDECEA" : patient.alertStatus === "amber" ? "#FEF9E7" : "#E8F8F5" },
            { label: "Adherence (7d)", value: `${patient.adherenceScore}%`, color: patient.adherenceScore >= 80 ? "#00B894" : patient.adherenceScore >= 60 ? "#F39C12" : "#D63031", bg: "#F0EFF8" },
            { label: "Active Alerts", value: String(patient.alertCount), color: patient.alertCount > 0 ? "#D63031" : "#00B894", bg: patient.alertCount > 0 ? "#FDECEA" : "#E8F8F5" },
            { label: "Last Active", value: format(new Date(patient.lastActivityDate), "h:mm a"), color: "#6C5CE7", bg: "#F0EFF8" },
          ].map((s) => (
            <div key={s.label} className="bg-bg-card rounded-xl p-3 shadow-card card-enter" style={{ borderLeft: `3px solid ${s.color}` }}>
              <p className="text-xs text-text-tertiary mb-0.5">{s.label}</p>
              <p className="font-bold metric-value text-xl" style={{ color: s.color }}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-bg-card rounded-xl shadow-card overflow-x-auto">
          {([
            { key: "timeline",   label: "Timeline",    icon: Activity },
            { key: "medications",label: "Medications",  icon: Pill },
            { key: "labs",       label: "Labs",         icon: FileText },
            { key: "symptoms",   label: "Symptoms",     icon: BookOpen },
            { key: "thresholds", label: "Thresholds",   icon: Sliders },
            { key: "notes",      label: "Notes",        icon: MessageSquare },
          ] as const).map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={clsx(
                "flex items-center gap-1.5 px-3 py-2 rounded-lg text-label-sm font-semibold transition-all whitespace-nowrap flex-shrink-0",
                tab === key ? "gradient-violet text-white" : "text-text-secondary hover:text-text-primary"
              )}
            >
              <Icon size={13} aria-hidden="true" />
              {label}
            </button>
          ))}
        </div>

        {/* Timeline tab */}
        {tab === "timeline" && (
          <div className="space-y-4">
            <GlucoseChart data={recentReadings} />
            <div className="bg-bg-card rounded-xl shadow-card overflow-hidden">
              <div className="px-4 py-3 border-b border-divider">
                <h3 className="font-semibold text-title-md text-text-primary">Health Timeline</h3>
                <p className="text-xs text-text-tertiary mt-0.5">All biometrics, medications, and symptoms</p>
              </div>
              <div className="relative">
                {/* Timeline line */}
                <div className="absolute left-8 top-0 bottom-0 w-px bg-divider" aria-hidden="true" />
                {TIMELINE_EVENTS.map((event) => (
                  <div key={event.id} className="flex items-start gap-4 px-4 py-3 hover:bg-bg-light/50 transition-colors border-b border-divider last:border-0">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-base flex-shrink-0 z-10 border-2 border-bg-card"
                      style={{ background: event.status === "green" ? "#E8F8F5" : event.status === "amber" ? "#FEF9E7" : "#FDECEA" }}
                      aria-hidden="true"
                    >
                      {event.icon}
                    </div>
                    <div className="flex-1 min-w-0 pt-0.5">
                      <p className="font-medium text-label-sm text-text-primary">{event.label}</p>
                      <p className="text-xs text-text-secondary mt-0.5">{event.value}</p>
                    </div>
                    <p className="text-xs text-text-tertiary flex-shrink-0 pt-0.5">
                      {format(event.time, "h:mm a")}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Medications tab */}
        {tab === "medications" && (
          <div className="space-y-4">
            {/* Adherence summary */}
            <div className="bg-bg-card rounded-xl shadow-card p-5">
              <h3 className="font-semibold text-title-md text-text-primary mb-4">Adherence Breakdown</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                {todayMedications.map((med) => {
                  const c = conditionColors[med.conditionId];
                  const taken = med.status === "taken";
                  return (
                    <div key={med.id} className="p-3 rounded-lg border border-divider">
                      <p className="font-semibold text-xs text-text-primary truncate">{med.name}</p>
                      <p className="text-xs text-text-tertiary">{med.dosage}</p>
                      <div className="flex items-center gap-1 mt-2">
                        {taken
                          ? <CheckCircle2 size={13} style={{ color: "#00B894" }} aria-label="Taken" />
                          : <Clock size={13} style={{ color: "#A29BFE" }} aria-label="Pending" />
                        }
                        <span className="text-xs font-semibold capitalize" style={{ color: taken ? "#00B894" : "#A29BFE" }}>
                          {med.status}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-label-sm text-text-secondary">Today: {takenCount}/{todayMedications.length} taken</span>
                <span className="text-label-sm font-semibold" style={{ color: weeklyAdherence >= 80 ? "#00B894" : "#F39C12" }}>
                  7-day: {weeklyAdherence}%
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Labs tab */}
        {tab === "labs" && (
          <div className="bg-bg-card rounded-xl shadow-card overflow-hidden">
            <div className="px-4 py-3 border-b border-divider">
              <h3 className="font-semibold text-title-md text-text-primary">Lab Results</h3>
              <p className="text-xs text-text-tertiary mt-0.5">Manual entries · Last 6 months</p>
            </div>
            {LAB_RESULTS.map((lab, i) => (
              <div key={lab.name} className={clsx("flex items-center gap-4 px-4 py-3", i < LAB_RESULTS.length - 1 && "border-b border-divider")}>
                <div className="flex-1">
                  <p className="font-semibold text-label-sm text-text-primary">{lab.name}</p>
                  <p className="text-xs text-text-tertiary">{lab.ref} · {lab.date}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold metric-value text-label-sm" style={{ color: STATUS_COLORS[lab.status] }}>{lab.value}</p>
                  <p className="text-xs" style={{ color: lab.trend === "down" ? "#00B894" : lab.trend === "up" ? "#D63031" : "#8888A8" }}>
                    {lab.trend === "down" ? "↓ Improving" : lab.trend === "up" ? "↑ Worsening" : "→ Stable"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Symptoms tab */}
        {tab === "symptoms" && (
          <SymptomHeatmap />
        )}

        {/* Thresholds tab */}
        {tab === "thresholds" && (
          <AlertThresholdCustomizer patientName={patient.name} />
        )}

        {/* Clinical notes tab */}
        {tab === "notes" && (
          <div className="space-y-4">
            <div className="bg-bg-card rounded-xl shadow-card p-5">
              <h3 className="font-semibold text-title-md text-text-primary mb-3">Add Clinical Observation</h3>
              <p className="text-xs text-text-tertiary mb-3">Visible only to the care team. Not shared with patient.</p>
              <textarea
                value={providerNote}
                onChange={(e) => setProviderNote(e.target.value)}
                placeholder="Add a clinical observation for this patient…"
                rows={4}
                className="w-full px-3 py-2.5 rounded-lg border border-divider bg-bg-light text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-lavender/40 focus:border-accent-violet resize-none"
              />
              <button
                onClick={() => { if (providerNote.trim()) { setNotes((p) => [providerNote.trim(), ...p]); setProviderNote(""); }}}
                disabled={!providerNote.trim()}
                className="mt-3 px-4 py-2 rounded-lg gradient-violet text-white text-label-sm font-semibold disabled:opacity-40 hover:opacity-90 transition-opacity"
              >
                Save Note
              </button>
            </div>
            {notes.length > 0 && (
              <div className="bg-bg-card rounded-xl shadow-card overflow-hidden">
                {notes.map((note, i) => (
                  <div key={i} className={clsx("px-4 py-3", i < notes.length - 1 && "border-b border-divider")}>
                    <p className="text-sm text-text-primary leading-relaxed">{note}</p>
                    <p className="text-xs text-text-tertiary mt-1">{format(new Date(), "MMM d, h:mm a")} · Dr. Priya</p>
                  </div>
                ))}
              </div>
            )}
            {notes.length === 0 && (
              <div className="text-center py-10 text-text-tertiary">
                <FileText size={36} className="mx-auto mb-2 opacity-30" />
                <p className="text-label-sm">No clinical notes yet.</p>
              </div>
            )}
          </div>
        )}

        <div className="h-8" />
      </div>
    </AppShell>
  );
}
