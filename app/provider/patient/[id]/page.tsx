"use client";

import React, { useState, useEffect } from "react";
import AppShell from "@/components/layout/AppShell";
import GlucoseChart from "@/components/charts/GlucoseChart";
import SymptomHeatmap from "@/components/provider/SymptomHeatmap";
import AlertThresholdCustomizer from "@/components/provider/AlertThresholdCustomizer";
import { conditionColors } from "@/lib/design-tokens";
import { ArrowLeft, Download, MessageSquare, AlertTriangle, CheckCircle2, Clock, Pill, Activity, FileText, BookOpen, Sliders, Video, Loader2, UserX } from "lucide-react";
import Link from "next/link";
import { clsx } from "clsx";
import { format } from "date-fns";
import { requestPdfExport } from "@/hooks/useApi";
import type { ProviderPatientRow } from "@/types";

interface Props {
  params: Promise<{ id: string }>;
}

const STATUS_COLORS = {
  green: "#00B894", amber: "#F39C12", red: "#D63031",
};

const STATUS_BADGE = {
  green: "bg-emerald-500/10 text-emerald-600",
  amber: "bg-amber-500/10 text-amber-600",
  red: "bg-rose-500/10 text-rose-600",
};

export default function ProviderPatientDetailPage({ params }: Props) {
  const { id } = React.use(params);
  const [patient, setPatient] = useState<ProviderPatientRow | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [tab, setTab] = useState<"timeline" | "medications" | "labs" | "symptoms" | "thresholds" | "notes">("timeline");
  const [providerNote, setProviderNote] = useState("");
  const [notes, setNotes] = useState<string[]>([]);
  const [exportingPdf, setExportingPdf] = useState(false);

  useEffect(() => {
    fetch("/api/v1/patients")
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (json?.data && Array.isArray(json.data)) {
          const matched = json.data.find((p: ProviderPatientRow) => p.patientId === id);
          setPatient(matched || null);
        } else {
          setPatient(null);
        }
      })
      .catch(() => {
        setPatient(null);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [id]);

  const handleExportPdf = async () => {
    if (exportingPdf) return;
    setExportingPdf(true);
    try {
      await requestPdfExport();
    } catch (err) {
      console.error("PDF export error:", err);
      alert("Failed to export PDF. Please try again.");
    } finally {
      setExportingPdf(false);
    }
  };

  if (isLoading) {
    return (
      <AppShell role="provider">
        <div className="max-w-4xl mx-auto px-4 lg:px-6 py-20 flex flex-col items-center justify-center gap-3 text-text-tertiary">
          <Loader2 size={32} className="animate-spin text-accent-violet" />
          <p className="text-sm">Loading patient clinical record…</p>
        </div>
      </AppShell>
    );
  }

  if (!patient) {
    return (
      <AppShell role="provider">
        <div className="max-w-md mx-auto px-4 py-24 text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-text-tertiary/10 text-text-tertiary flex items-center justify-center mx-auto">
            <UserX size={32} />
          </div>
          <div className="space-y-1">
            <h2 className="font-bold text-title-lg text-text-primary">Patient Not Found</h2>
            <p className="text-body-sm text-text-secondary">
              The requested patient record could not be found or has not been linked to your clinical panel yet.
            </p>
          </div>
          <Link
            href="/provider"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl gradient-violet text-white font-semibold text-label-sm shadow-card hover:opacity-90 transition-opacity"
          >
            <ArrowLeft size={16} />
            <span>Return to Patient Panel</span>
          </Link>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell role="provider">
      <div className="max-w-4xl mx-auto px-4 lg:px-6 py-6 space-y-5">
        {/* Header */}
        <div className="flex items-start gap-3">
          <Link
            href="/provider"
            className="w-9 h-9 rounded-xl flex items-center justify-center bg-bg-card border border-divider shadow-card hover:bg-bg-lavender transition-colors flex-shrink-0 mt-1"
          >
            <ArrowLeft size={16} className="text-text-secondary" />
          </Link>
          <div className="flex-1">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-display-sm font-bold text-text-primary">{patient.name}</h1>
                  <span className={clsx("badge text-xs font-semibold px-2 py-0.5 rounded-full", STATUS_BADGE[patient.alertStatus])}>
                    {patient.alertStatus.toUpperCase()}
                  </span>
                </div>
                <p className="text-label-sm text-text-tertiary mt-0.5">
                  Age {patient.age} · Last active {format(new Date(patient.lastActivityDate), "MMM d, h:mm a")}
                </p>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {patient.conditions.map((c) => {
                    const cfg = conditionColors[c];
                    return (
                      <span key={c} className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: cfg?.bg ?? "#F0EFF8", color: cfg?.accent ?? "#6C5CE7" }}>
                        {cfg?.emoji} {cfg?.label ?? c}
                      </span>
                    );
                  })}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  href="/provider/telehealth"
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-label-sm font-semibold shadow-card transition-all"
                >
                  <Video size={14} aria-hidden="true" />
                  Live Call
                </Link>
                <Link
                  href="/messages"
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-divider bg-bg-card text-label-sm font-semibold text-text-secondary hover:bg-bg-lavender hover:text-accent-violet transition-all shadow-card"
                >
                  <MessageSquare size={14} aria-hidden="true" />
                  Message
                </Link>
                <button
                  onClick={handleExportPdf}
                  disabled={exportingPdf}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg gradient-violet text-white text-label-sm font-semibold shadow-card hover:opacity-90 disabled:opacity-50 transition-opacity"
                >
                  {exportingPdf ? (
                    <>
                      <Loader2 size={14} className="animate-spin" aria-hidden="true" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Download size={14} aria-hidden="true" />
                      PDF Export
                    </>
                  )}
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
            <GlucoseChart data={[]} />
            <div className="bg-bg-card rounded-xl shadow-card overflow-hidden">
              <div className="px-4 py-3 border-b border-divider">
                <h3 className="font-semibold text-title-md text-text-primary">Health Timeline</h3>
                <p className="text-xs text-text-tertiary mt-0.5">All biometrics, medications, and symptoms</p>
              </div>
              <div className="py-12 flex flex-col items-center justify-center text-center gap-2 text-text-tertiary">
                <Activity size={28} className="opacity-40" />
                <p className="text-sm font-semibold text-text-primary">No health activity recorded</p>
                <p className="text-xs">Logged biometrics, doses, and symptoms will populate this timeline.</p>
              </div>
            </div>
          </div>
        )}

        {/* Medications tab */}
        {tab === "medications" && (
          <div className="bg-bg-card rounded-xl shadow-card p-12 text-center flex flex-col items-center justify-center gap-2 text-text-tertiary">
            <Pill size={28} className="opacity-40" />
            <p className="text-sm font-semibold text-text-primary">No active prescriptions</p>
            <p className="text-xs">This patient does not have active medications configured in their protocol.</p>
          </div>
        )}

        {/* Labs tab */}
        {tab === "labs" && (
          <div className="bg-bg-card rounded-xl shadow-card p-12 text-center flex flex-col items-center justify-center gap-2 text-text-tertiary">
            <FileText size={28} className="opacity-40" />
            <p className="text-sm font-semibold text-text-primary">No laboratory results</p>
            <p className="text-xs">No laboratory test panels have been uploaded for this patient.</p>
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
                    <p className="text-xs text-text-tertiary mt-1">{format(new Date(), "MMM d, h:mm a")} · Care Team</p>
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
