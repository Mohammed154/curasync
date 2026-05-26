"use client";

import React, { useState } from "react";
import AppShell from "@/components/layout/AppShell";
import { getMockDashboardData } from "@/lib/mock-data";
import { severityColor, severityBg, severityIcon } from "@/lib/alerts";
import type { Alert, AlertSeverity } from "@/types";
import { Bell, BellOff, CheckCheck, Clock, Filter, X, ShieldAlert } from "lucide-react";
import { clsx } from "clsx";
import { formatDistanceToNow, format, subHours, subDays } from "date-fns";
import { nanoid } from "nanoid";

// Extended mock alert history
const MOCK_ALERT_HISTORY: Alert[] = [
  {
    id: nanoid(), patientId: "pat_001", severity: "medium", status: "active",
    type: "blood_pressure_systolic",
    message: "BP trending above target: 138/88 mmHg — 3 readings above 130/80 this week",
    value: 138, threshold: 130,
    triggeredAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
  },
  {
    id: nanoid(), patientId: "pat_001", severity: "medium", status: "active",
    type: "medication_missed",
    message: "Metformin 500mg evening dose missed — scheduled at 21:00",
    triggeredAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
  },
  {
    id: nanoid(), patientId: "pat_001", severity: "low", status: "acknowledged",
    type: "wearable_sync_failed",
    message: "Apple Watch sync failed — last successful sync was 4 hours ago",
    triggeredAt: subHours(new Date(), 5).toISOString(),
    acknowledgedAt: subHours(new Date(), 4).toISOString(),
  },
  {
    id: nanoid(), patientId: "pat_001", severity: "high", status: "dismissed",
    type: "blood_glucose",
    message: "Blood glucose elevated: 264 mg/dL at 14:30 — post-meal spike",
    value: 264, threshold: 250,
    triggeredAt: subDays(new Date(), 1).toISOString(),
  },
  {
    id: nanoid(), patientId: "pat_001", severity: "critical", status: "acknowledged",
    type: "blood_pressure_systolic",
    message: "BP critically high: 184 mmHg — hypertensive crisis threshold exceeded",
    value: 184, threshold: 180,
    triggeredAt: subDays(new Date(), 3).toISOString(),
    acknowledgedAt: subDays(new Date(), 3).toISOString(),
  },
  {
    id: nanoid(), patientId: "pat_001", severity: "low", status: "dismissed",
    type: "medication_missed",
    message: "Refill reminder: Amlodipine 5mg — estimated 7 days supply remaining",
    triggeredAt: subDays(new Date(), 5).toISOString(),
  },
];

const SEVERITY_LABELS: Record<AlertSeverity, string> = {
  critical: "Critical 🔴", high: "High ⚠️", medium: "Medium 🟡", low: "Low ℹ️",
};

type FilterType = "all" | AlertSeverity | "active" | "acknowledged" | "dismissed";

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>(MOCK_ALERT_HISTORY);
  const [filter, setFilter] = useState<FilterType>("all");
  const [dndEnabled, setDndEnabled] = useState(false);
  const [dndStart, setDndStart] = useState("22:00");
  const [dndEnd, setDndEnd] = useState("07:00");

  const activeCount = alerts.filter((a) => a.status === "active").length;

  const filtered = alerts.filter((a) => {
    if (filter === "all") return true;
    if (filter === "active" || filter === "acknowledged" || filter === "dismissed") return a.status === filter;
    return a.severity === filter;
  });

  const acknowledge = (id: string) => {
    setAlerts((prev) => prev.map((a) =>
      a.id === id && a.severity !== "critical"
        ? { ...a, status: "acknowledged" as const, acknowledgedAt: new Date().toISOString() }
        : a
    ));
  };

  const dismiss = (id: string) => {
    setAlerts((prev) => prev.map((a) =>
      a.id === id && a.severity !== "critical"
        ? { ...a, status: "dismissed" as const }
        : a
    ));
  };

  const acknowledgeAll = () => {
    setAlerts((prev) => prev.map((a) =>
      a.status === "active" && a.severity !== "critical"
        ? { ...a, status: "acknowledged" as const, acknowledgedAt: new Date().toISOString() }
        : a
    ));
  };

  const FILTER_OPTS: { value: FilterType; label: string }[] = [
    { value: "all", label: "All" },
    { value: "active", label: "Active" },
    { value: "critical", label: "Critical 🔴" },
    { value: "high", label: "High ⚠️" },
    { value: "medium", label: "Medium 🟡" },
    { value: "low", label: "Low ℹ️" },
  ];

  return (
    <AppShell alertCount={activeCount}>
      <div className="max-w-3xl mx-auto px-4 lg:px-6 py-6">

        {/* Header */}
        <div className="flex items-start justify-between mb-6 animate-fade-in">
          <div>
            <h1 className="font-bold text-display text-text-primary">Alerts</h1>
            <p className="text-body-md text-text-secondary mt-1">
              {activeCount} active · {alerts.length} total (12-month history)
            </p>
          </div>
          {activeCount > 1 && (
            <button
              onClick={acknowledgeAll}
              className="flex items-center gap-2 px-3 py-2 rounded-lg border border-divider bg-bg-card text-label-sm font-semibold text-text-secondary hover:bg-bg-lavender hover:text-accent-violet transition-all shadow-card"
            >
              <CheckCheck size={14} aria-hidden="true" />
              Acknowledge all
            </button>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-2 mb-5">
          {(["critical", "high", "medium", "low"] as AlertSeverity[]).map((sev) => {
            const count = alerts.filter((a) => a.severity === sev && a.status === "active").length;
            return (
              <div key={sev} className="rounded-xl p-3 text-center card-enter"
                style={{ background: severityBg(sev) }}>
                <p className="text-xl font-bold metric-value" style={{ color: severityColor(sev) }}>{count}</p>
                <p className="text-xs font-semibold capitalize mt-0.5" style={{ color: severityColor(sev) }}>{sev}</p>
              </div>
            );
          })}
        </div>

        {/* Filters */}
        <div className="flex gap-1.5 flex-wrap mb-5">
          {FILTER_OPTS.map((opt) => (
            <button key={opt.value} onClick={() => setFilter(opt.value)}
              className={clsx(
                "px-3 py-1.5 rounded-full text-label-sm font-semibold transition-all border",
                filter === opt.value
                  ? "bg-accent-violet text-white border-accent-violet"
                  : "bg-bg-card border-divider text-text-secondary hover:border-accent-lavender shadow-sm"
              )}
              aria-pressed={filter === opt.value}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Alert list */}
        <div className="space-y-2 mb-6">
          {filtered.length === 0 && (
            <div className="text-center py-14 text-text-tertiary">
              <Bell size={40} className="mx-auto mb-3 opacity-20" />
              <p className="text-label-sm">No alerts match this filter.</p>
            </div>
          )}

          {filtered.map((alert) => (
            <div key={alert.id}
              className={clsx(
                "rounded-xl p-4 border transition-all card-enter",
                alert.status !== "active" && "opacity-60"
              )}
              style={{
                background: severityBg(alert.severity),
                borderColor: severityColor(alert.severity) + "33",
              }}
              role="listitem"
              aria-label={`${alert.severity} alert: ${alert.message}`}
            >
              <div className="flex items-start gap-3">
                {/* Pulse dot for critical active */}
                <div className="relative flex-shrink-0 mt-0.5">
                  {alert.severity === "critical" && alert.status === "active" && (
                    <span className="absolute -top-0.5 -left-0.5 w-4 h-4 rounded-full animate-ping"
                      style={{ background: severityColor(alert.severity), opacity: 0.3 }}
                      aria-hidden="true"
                    />
                  )}
                  <span className="text-base" aria-hidden="true">{severityIcon(alert.severity)}</span>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-0.5">
                    <span className="text-xs font-bold uppercase tracking-wide" style={{ color: severityColor(alert.severity) }}>
                      {SEVERITY_LABELS[alert.severity]}
                    </span>
                    {alert.status !== "active" && (
                      <span className="text-xs text-text-tertiary capitalize bg-white/50 px-2 py-0.5 rounded-full">
                        {alert.status}
                      </span>
                    )}
                  </div>
                  <p className="text-label-sm text-text-primary leading-snug">{alert.message}</p>
                  <p className="text-xs text-text-tertiary mt-1">
                    {formatDistanceToNow(new Date(alert.triggeredAt), { addSuffix: true })}
                    {alert.acknowledgedAt && (
                      <span> · Acknowledged {formatDistanceToNow(new Date(alert.acknowledgedAt), { addSuffix: true })}</span>
                    )}
                  </p>
                </div>

                {/* Actions */}
                {alert.status === "active" && (
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {alert.severity !== "critical" && (
                      <>
                        <button
                          onClick={() => acknowledge(alert.id)}
                          className="p-2 rounded-lg hover:bg-white/40 text-text-secondary transition-colors"
                          title="Acknowledge"
                          aria-label="Acknowledge alert"
                        >
                          <CheckCheck size={15} />
                        </button>
                        <button
                          onClick={() => dismiss(alert.id)}
                          className="p-2 rounded-lg hover:bg-white/40 text-text-secondary transition-colors"
                          title="Dismiss"
                          aria-label="Dismiss alert"
                        >
                          <X size={15} />
                        </button>
                      </>
                    )}
                    {alert.severity === "critical" && (
                      <span className="text-xs font-semibold text-red-600 px-2 py-1 bg-white/50 rounded-lg">
                        Cannot dismiss
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Do Not Disturb settings */}
        <div className="bg-bg-card rounded-xl shadow-card p-5 border border-divider">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <BellOff size={18} className="text-text-secondary" aria-hidden="true" />
              <h3 className="font-semibold text-title-md text-text-primary">Do Not Disturb</h3>
            </div>
            {/* Toggle */}
            <button
              onClick={() => setDndEnabled((v) => !v)}
              className={clsx(
                "relative w-11 h-6 rounded-full transition-all duration-300",
                dndEnabled ? "bg-accent-violet" : "bg-divider"
              )}
              role="switch"
              aria-checked={dndEnabled}
              aria-label="Toggle Do Not Disturb"
            >
              <span className={clsx(
                "absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all duration-300",
                dndEnabled ? "left-5" : "left-0.5"
              )} />
            </button>
          </div>

          <p className="text-xs text-text-secondary mb-4 leading-relaxed">
            Suppress non-critical push notifications during these hours. <strong>Critical alerts are always delivered regardless of DND.</strong>
          </p>

          <div className={clsx("grid grid-cols-2 gap-3 transition-opacity", !dndEnabled && "opacity-40 pointer-events-none")}>
            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1">Start time</label>
              <input type="time" value={dndStart} onChange={(e) => setDndStart(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-divider bg-bg-light text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-lavender/40"
                aria-label="DND start time"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1">End time</label>
              <input type="time" value={dndEnd} onChange={(e) => setDndEnd(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-divider bg-bg-light text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-lavender/40"
                aria-label="DND end time"
              />
            </div>
          </div>

          {dndEnabled && (
            <p className="text-xs text-accent-violet font-medium mt-3">
              ✓ DND active {dndStart} – {dndEnd} · Critical alerts bypass DND
            </p>
          )}
        </div>

        <div className="h-8" />
      </div>
    </AppShell>
  );
}
