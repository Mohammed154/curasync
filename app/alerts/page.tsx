"use client";

import React, { useState, useEffect } from "react";
import AppShell from "@/components/layout/AppShell";
import { severityColor, severityBg, severityIcon } from "@/lib/alerts";
import type { Alert, AlertSeverity } from "@/types";
import { Bell, BellOff, CheckCheck, Clock, Filter, X, ShieldAlert, Activity, BookOpen } from "lucide-react";
import { clsx } from "clsx";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";

const SEVERITY_LABELS: Record<AlertSeverity, string> = {
  critical: "Critical 🔴",
  high: "High ⚠️",
  medium: "Medium 🟡",
  low: "Low ℹ️",
};

type FilterType = "all" | AlertSeverity | "active" | "acknowledged" | "dismissed";

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>("all");
  const [dndEnabled, setDndEnabled] = useState(false);
  const [dndStart, setDndStart] = useState("22:00");
  const [dndEnd, setDndEnd] = useState("07:00");

  const loadAlerts = async () => {
    try {
      const res = await fetch("/api/v1/alerts");
      if (res.ok) {
        const json = await res.json();
        setAlerts(json.data || []);
      }
    } catch {
      // Non-blocking error handling
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAlerts();
  }, []);

  const activeCount = alerts.filter((a) => a.status === "active").length;

  const filtered = alerts.filter((a) => {
    if (filter === "all") return true;
    if (filter === "active" || filter === "acknowledged" || filter === "dismissed") return a.status === filter;
    return a.severity === filter;
  });

  const acknowledge = async (id: string) => {
    setAlerts((prev) =>
      prev.map((a) =>
        a.id === id && a.severity !== "critical"
          ? { ...a, status: "acknowledged" as const, acknowledgedAt: new Date().toISOString() }
          : a
      )
    );
    try {
      await fetch("/api/v1/alerts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ alertId: id, action: "acknowledge" }),
      });
    } catch {
      // Non-blocking
    }
  };

  const dismiss = async (id: string) => {
    setAlerts((prev) =>
      prev.map((a) =>
        a.id === id && a.severity !== "critical"
          ? { ...a, status: "dismissed" as const }
          : a
      )
    );
    try {
      await fetch("/api/v1/alerts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ alertId: id, action: "dismiss" }),
      });
    } catch {
      // Non-blocking
    }
  };

  const acknowledgeAll = async () => {
    const activeNonCritical = alerts.filter((a) => a.status === "active" && a.severity !== "critical");
    setAlerts((prev) =>
      prev.map((a) =>
        a.status === "active" && a.severity !== "critical"
          ? { ...a, status: "acknowledged" as const, acknowledgedAt: new Date().toISOString() }
          : a
      )
    );
    for (const a of activeNonCritical) {
      void fetch("/api/v1/alerts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ alertId: a.id, action: "acknowledge" }),
      });
    }
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
            <h1 className="font-bold text-display text-text-primary">Clinical Alerts</h1>
            <p className="text-body-md text-text-secondary mt-1">
              {activeCount} active · {alerts.length} total recorded
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
              <div
                key={sev}
                className={clsx(
                  "p-3 rounded-xl border text-center transition-all card-enter",
                  count > 0 ? "border-transparent shadow-card" : "border-divider bg-bg-card opacity-60"
                )}
                style={count > 0 ? { background: severityBg(sev), borderColor: severityColor(sev) + "40" } : {}}
              >
                <div className="text-lg font-bold" style={{ color: severityColor(sev) }}>
                  {count}
                </div>
                <div className="text-xs text-text-secondary capitalize font-medium">{sev}</div>
              </div>
            );
          })}
        </div>

        {/* Filter pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-4 scrollbar-none">
          <Filter size={14} className="text-text-tertiary flex-shrink-0 mr-1" aria-hidden="true" />
          {FILTER_OPTS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setFilter(opt.value)}
              className={clsx(
                "px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all border",
                filter === opt.value
                  ? "bg-accent-violet border-accent-violet text-white shadow-xs"
                  : "bg-bg-card border-divider text-text-secondary hover:border-accent-lavender shadow-sm"
              )}
              aria-pressed={filter === opt.value}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Alert list & Empty State */}
        <div className="space-y-3 mb-6">
          {filtered.length === 0 && (
            <div className="bg-bg-card border border-divider rounded-2xl p-10 text-center shadow-card animate-fade-in space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-status-green-bg border border-status-green/30 text-status-green flex items-center justify-center mx-auto shadow-xs">
                <BellOff size={28} />
              </div>
              <div className="max-w-md mx-auto">
                <h3 className="font-bold text-title-md text-text-primary">No Active Alerts</h3>
                <p className="text-body-md text-text-secondary mt-1.5 leading-relaxed">
                  All your tracked vitals, medications, and biometric readings are within healthy target ranges. No clinical action is required right now.
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <Link
                  href="/glucose"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl gradient-violet text-white text-label-sm font-semibold shadow-card hover:opacity-95 transition-opacity"
                >
                  <Activity size={15} />
                  <span>Log Blood Sugar</span>
                </Link>
                <Link
                  href="/journal"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-bg-light border border-divider text-text-primary text-label-sm font-semibold shadow-card hover:bg-bg-lavender transition-colors"
                >
                  <BookOpen size={15} />
                  <span>Record Symptoms</span>
                </Link>
              </div>
            </div>
          )}

          {filtered.map((alert) => (
            <div
              key={alert.id}
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
                    <span
                      className="absolute -top-0.5 -left-0.5 w-4 h-4 rounded-full animate-ping"
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
              <span
                className={clsx(
                  "absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all duration-300",
                  dndEnabled ? "left-5" : "left-0.5"
                )}
              />
            </button>
          </div>

          <p className="text-xs text-text-secondary mb-4 leading-relaxed">
            Suppress non-critical push notifications during these hours. <strong>Critical alerts are always delivered regardless of DND.</strong>
          </p>

          <div className={clsx("grid grid-cols-2 gap-3 transition-opacity", !dndEnabled && "opacity-40 pointer-events-none")}>
            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1">Start time</label>
              <input
                type="time"
                value={dndStart}
                onChange={(e) => setDndStart(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-divider bg-bg-light text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-lavender/40"
                aria-label="DND start time"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1">End time</label>
              <input
                type="time"
                value={dndEnd}
                onChange={(e) => setDndEnd(e.target.value)}
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
