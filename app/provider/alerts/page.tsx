"use client";

import React, { useState, useEffect } from "react";
import AppShell from "@/components/layout/AppShell";
import { AlertTriangle, Bell, Check, Loader2, ArrowRight, ShieldAlert, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { clsx } from "clsx";
import type { Alert } from "@/types";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";

export default function ProviderAlertsPage() {
  const router = useRouter();
  const { user, profile, loading: authLoading } = useAuth();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterSeverity, setFilterSeverity] = useState<"all" | "critical" | "high" | "medium" | "low">("all");

  // Client-side RBAC guard
  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      router.replace("/provider/login?returnTo=/provider/alerts");
      return;
    }

    if (profile) {
      const isProvider = profile.role === "provider" || profile.role === "doctor" || profile.role === "admin";
      if (!isProvider) {
        router.replace("/dashboard?error=unauthorized_provider_access");
      }
    }
  }, [user, profile, authLoading, router]);

  const fetchAlerts = () => {
    setIsLoading(true);
    fetch("/api/v1/alerts?status=active")
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (json?.data && Array.isArray(json.data)) {
          setAlerts(json.data);
        } else {
          setAlerts([]);
        }
      })
      .catch(() => {
        setAlerts([]);
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  useEffect(() => {
    fetchAlerts();
  }, []);

  const handleAcknowledge = async (alertId: string) => {
    try {
      await fetch("/api/v1/alerts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: alertId, action: "acknowledge" }),
      });
      setAlerts((prev) => prev.filter((a) => a.id !== alertId));
    } catch (err) {
      console.warn("Failed to acknowledge alert:", err);
    }
  };

  const filteredAlerts = alerts.filter((a) => {
    if (filterSeverity === "all") return true;
    return a.severity === filterSeverity;
  });

  return (
    <AppShell role="provider">
      <div className="p-4 md:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-text-primary tracking-tight">
              Clinical Alert Center
            </h1>
            <p className="text-body-md text-text-secondary mt-1">
              Active Patient Excursions & Threshold Breaches · {alerts.length} active notifications
            </p>
          </div>
          <button
            onClick={fetchAlerts}
            className="self-start sm:self-auto px-3.5 py-2 rounded-xl border border-divider bg-bg-card text-label-sm font-semibold text-text-secondary hover:text-accent-violet hover:border-accent-lavender transition-all shadow-card cursor-pointer"
          >
            Refresh Alerts
          </button>
        </div>

        {/* Severity Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {(["all", "critical", "high", "medium", "low"] as const).map((sev) => (
            <button
              key={sev}
              onClick={() => setFilterSeverity(sev)}
              className={clsx(
                "px-3.5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer",
                filterSeverity === sev
                  ? "bg-accent-violet text-white shadow-xs"
                  : "bg-bg-card border border-divider text-text-secondary hover:text-text-primary"
              )}
            >
              {sev}
              {sev === "all" ? ` (${alerts.length})` : ` (${alerts.filter(a => a.severity === sev).length})`}
            </button>
          ))}
        </div>

        {/* Alerts List */}
        <div className="space-y-3">
          {isLoading ? (
            <div className="py-20 text-center space-y-3 bg-bg-card rounded-2xl border border-divider">
              <Loader2 size={24} className="animate-spin mx-auto text-accent-violet" />
              <p className="text-xs text-text-secondary">Retrieving active clinical alerts…</p>
            </div>
          ) : filteredAlerts.length === 0 ? (
            <div className="py-20 text-center space-y-3 bg-bg-card rounded-2xl border border-divider">
              <CheckCircle2 size={36} className="mx-auto text-emerald-500" />
              <p className="text-base font-bold text-text-primary">No Active Alerts</p>
              <p className="text-xs text-text-secondary max-w-sm mx-auto">
                All patient vitals and biometric readings are currently within clinical threshold boundaries.
              </p>
            </div>
          ) : (
            filteredAlerts.map((alert) => (
              <div
                key={alert.id}
                className={clsx(
                  "p-4 rounded-2xl border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-bg-card shadow-xs",
                  alert.severity === "critical"
                    ? "border-rose-300 dark:border-rose-900 bg-rose-50/40 dark:bg-rose-950/20"
                    : alert.severity === "high"
                    ? "border-amber-300 dark:border-amber-900 bg-amber-50/40 dark:bg-amber-950/20"
                    : "border-divider"
                )}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={clsx(
                      "w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5",
                      alert.severity === "critical"
                        ? "bg-rose-100 dark:bg-rose-900/60 text-rose-600 dark:text-rose-400"
                        : alert.severity === "high"
                        ? "bg-amber-100 dark:bg-amber-900/60 text-amber-600 dark:text-amber-400"
                        : "bg-blue-100 dark:bg-blue-900/60 text-blue-600 dark:text-blue-400"
                    )}
                  >
                    <AlertTriangle size={18} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-text-primary">
                        {alert.message}
                      </span>
                      <span
                        className={clsx(
                          "text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full",
                          alert.severity === "critical"
                            ? "bg-rose-100 dark:bg-rose-900 text-rose-700 dark:text-rose-200"
                            : alert.severity === "high"
                            ? "bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-200"
                            : "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200"
                        )}
                      >
                        {alert.severity}
                      </span>
                    </div>
                    <p className="text-xs text-text-secondary mt-1">
                      Triggered {new Date(alert.triggeredAt).toLocaleString()}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <button
                    onClick={() => handleAcknowledge(alert.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-divider hover:bg-bg-lavender text-xs font-semibold text-text-secondary hover:text-text-primary transition-all cursor-pointer"
                  >
                    <Check size={14} />
                    <span>Acknowledge</span>
                  </button>
                  <Link
                    href={`/provider/patient/${alert.patientId}`}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl gradient-violet text-white text-xs font-semibold shadow-xs hover:opacity-90 transition-opacity"
                  >
                    <span>View Patient</span>
                    <ArrowRight size={14} />
                  </Link>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </AppShell>
  );
}
