"use client";

import React, { useState } from "react";
import AppShell from "@/components/layout/AppShell";
import { Watch, Wifi, WifiOff, RefreshCw, CheckCircle2, AlertCircle, Bluetooth, Clock, Activity, Plus, ChevronRight } from "lucide-react";
import { clsx } from "clsx";
import { format, subMinutes, subHours } from "date-fns";

interface WearableDevice {
  id: string;
  name: string;
  brand: string;
  icon: string;
  authType: "apple_health" | "oauth" | "ble";
  status: "connected" | "syncing" | "disconnected" | "error";
  lastSync: Date | null;
  metrics: string[];
  syncFrequency: string;
  batteryPct?: number;
}

const CONNECTED_DEVICES: WearableDevice[] = [
  {
    id: "apple_watch",
    name: "Apple Watch Series 9",
    brand: "Apple",
    icon: "⌚",
    authType: "apple_health",
    status: "connected",
    lastSync: subMinutes(new Date(), 8),
    metrics: ["Heart Rate", "SpO₂", "Steps", "Sleep", "ECG", "Blood Oxygen"],
    syncFrequency: "Continuous (background)",
    batteryPct: 74,
  },
];

const AVAILABLE_DEVICES = [
  { id: "fitbit", name: "Fitbit Charge 6 / Sense 2", brand: "Fitbit", icon: "📿", authType: "oauth" as const, metrics: ["HR", "SpO₂", "Sleep", "Steps", "Skin Temp"] },
  { id: "garmin", name: "Garmin Fenix / Venu Series", brand: "Garmin", icon: "🏃", authType: "oauth" as const, metrics: ["HR", "SpO₂", "Steps", "Body Battery", "Stress"] },
  { id: "ble_glucose", name: "BLE Glucometer", brand: "Accu-Chek / OneTouch", icon: "🩸", authType: "ble" as const, metrics: ["Blood Glucose"] },
  { id: "ble_bp", name: "BLE Blood Pressure Cuff", brand: "Omron / Withings", icon: "💉", authType: "ble" as const, metrics: ["Systolic BP", "Diastolic BP", "Pulse"] },
  { id: "ble_scale", name: "Smart Scale", brand: "Withings / Renpho", icon: "⚖️", authType: "ble" as const, metrics: ["Weight", "BMI", "Body Fat %"] },
];

const AUTH_LABELS = {
  apple_health: { label: "Apple HealthKit", color: "#FF3B30", icon: "🍎" },
  oauth: { label: "OAuth 2.0 cloud sync", color: "#6C5CE7", icon: "🔐" },
  ble: { label: "Bluetooth BLE", color: "#007AFF", icon: "📡" },
};

function SyncStatusBadge({ status }: { status: WearableDevice["status"] }) {
  const config = {
    connected:    { color: "#00B894", bg: "#E8F8F5", label: "Connected",    icon: <CheckCircle2 size={11} /> },
    syncing:      { color: "#6C5CE7", bg: "#F0EFF8", label: "Syncing…",     icon: <RefreshCw size={11} className="animate-spin" /> },
    disconnected: { color: "#8888A8", bg: "#F4F4F6", label: "Disconnected", icon: <WifiOff size={11} /> },
    error:        { color: "#D63031", bg: "#FDECEA", label: "Sync Error",   icon: <AlertCircle size={11} /> },
  }[status];

  return (
    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full" style={{ background: config.bg }}>
      <span style={{ color: config.color }}>{config.icon}</span>
      <span className="text-xs font-semibold" style={{ color: config.color }}>{config.label}</span>
    </div>
  );
}

export default function WearablesPage() {
  const [devices, setDevices] = useState<WearableDevice[]>(CONNECTED_DEVICES);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [connecting, setConnecting] = useState<string | null>(null);

  const forceSync = (deviceId: string) => {
    setSyncing(deviceId);
    setDevices((prev) => prev.map((d) => d.id === deviceId ? { ...d, status: "syncing" } : d));
    setTimeout(() => {
      setDevices((prev) => prev.map((d) => d.id === deviceId ? { ...d, status: "connected", lastSync: new Date() } : d));
      setSyncing(null);
    }, 2200);
  };

  const connectDevice = (deviceId: string) => {
    setConnecting(deviceId);
    setTimeout(() => {
      const template = AVAILABLE_DEVICES.find((d) => d.id === deviceId);
      if (template) {
        const newDevice: WearableDevice = {
          id: template.id,
          name: template.name,
          brand: template.brand,
          icon: template.icon,
          authType: template.authType,
          status: "connected",
          lastSync: new Date(),
          metrics: template.metrics,
          syncFrequency: template.authType === "ble" ? "On demand" : "Every 15 minutes",
        };
        setDevices((prev) => [...prev, newDevice]);
      }
      setConnecting(null);
    }, 2000);
  };

  const disconnectDevice = (deviceId: string) => {
    setDevices((prev) => prev.filter((d) => d.id !== deviceId));
  };

  const connectedIds = new Set(devices.map((d) => d.id));

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto px-4 lg:px-6 py-6">

        {/* Header */}
        <div className="flex items-start justify-between mb-6 animate-fade-in">
          <div>
            <h1 className="font-bold text-display text-text-primary">Wearables & Devices</h1>
            <p className="text-body-md text-text-secondary mt-1">
              {devices.length} device{devices.length !== 1 ? "s" : ""} connected · Auto-sync active
            </p>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-status-green-bg">
            <span className="w-1.5 h-1.5 rounded-full bg-status-green animate-pulse" aria-hidden="true" />
            <span className="text-xs font-semibold text-status-green">Live sync</span>
          </div>
        </div>

        {/* Connected devices */}
        {devices.length > 0 && (
          <div className="mb-6">
            <h2 className="font-semibold text-title-md text-text-primary mb-3">Connected</h2>
            <div className="space-y-3">
              {devices.map((device) => {
                const auth = AUTH_LABELS[device.authType];
                return (
                  <div key={device.id} className="bg-bg-card rounded-xl shadow-card p-4 card-enter">
                    <div className="flex items-start gap-3">
                      <div className="w-12 h-12 rounded-xl bg-bg-light flex items-center justify-center text-2xl flex-shrink-0" aria-hidden="true">
                        {device.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h3 className="font-semibold text-label-sm text-text-primary">{device.name}</h3>
                            <p className="text-xs text-text-tertiary">{device.brand}</p>
                          </div>
                          <SyncStatusBadge status={device.status} />
                        </div>

                        {/* Metrics */}
                        <div className="flex flex-wrap gap-1 mt-2">
                          {device.metrics.map((m) => (
                            <span key={m} className="text-xs px-2 py-0.5 rounded-full bg-bg-lavender text-accent-violet font-medium">
                              {m}
                            </span>
                          ))}
                        </div>

                        {/* Sync info */}
                        <div className="flex items-center gap-4 mt-3 text-xs text-text-tertiary">
                          <div className="flex items-center gap-1">
                            <Clock size={11} aria-hidden="true" />
                            <span>
                              {device.lastSync
                                ? `Last sync ${format(device.lastSync, "h:mm a")}`
                                : "Never synced"}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Activity size={11} aria-hidden="true" />
                            <span>{device.syncFrequency}</span>
                          </div>
                          {device.batteryPct !== undefined && (
                            <div className="flex items-center gap-1">
                              <span>🔋 {device.batteryPct}%</span>
                            </div>
                          )}
                        </div>

                        {/* Auth type */}
                        <div className="flex items-center gap-1.5 mt-2">
                          <span className="text-xs" aria-hidden="true">{auth.icon}</span>
                          <span className="text-xs text-text-tertiary">{auth.label}</span>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 mt-4 pt-3 border-t border-divider">
                      <button
                        onClick={() => forceSync(device.id)}
                        disabled={syncing === device.id}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-bg-lavender text-accent-violet text-xs font-semibold hover:bg-accent-violet hover:text-white transition-all disabled:opacity-60"
                        aria-label={`Force sync ${device.name}`}
                      >
                        <RefreshCw size={12} className={syncing === device.id ? "animate-spin" : ""} aria-hidden="true" />
                        {syncing === device.id ? "Syncing…" : "Force Sync"}
                      </button>
                      <button
                        onClick={() => disconnectDevice(device.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-divider text-text-secondary text-xs font-semibold hover:bg-red-50 hover:text-status-red hover:border-status-red transition-all"
                        aria-label={`Disconnect ${device.name}`}
                      >
                        <WifiOff size={12} aria-hidden="true" />
                        Disconnect
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Add more devices */}
        <div>
          <h2 className="font-semibold text-title-md text-text-primary mb-3">Add a Device</h2>
          <div className="space-y-2">
            {AVAILABLE_DEVICES.filter((d) => !connectedIds.has(d.id)).map((device) => {
              const auth = AUTH_LABELS[device.authType];
              const isConnecting = connecting === device.id;
              return (
                <div key={device.id} className="bg-bg-card rounded-xl shadow-card p-4 card-enter flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-bg-light flex items-center justify-center text-xl flex-shrink-0" aria-hidden="true">
                    {device.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-label-sm text-text-primary">{device.name}</p>
                    <p className="text-xs text-text-tertiary">{device.brand}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-xs" aria-hidden="true">{auth.icon}</span>
                      <span className="text-xs text-text-tertiary">{auth.label}</span>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {device.metrics.map((m) => (
                        <span key={m} className="text-xs px-1.5 py-0.5 rounded bg-bg-light text-text-tertiary">{m}</span>
                      ))}
                    </div>
                  </div>
                  <button
                    onClick={() => connectDevice(device.id)}
                    disabled={isConnecting}
                    className={clsx(
                      "flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all flex-shrink-0",
                      isConnecting
                        ? "bg-bg-lavender text-accent-violet cursor-wait"
                        : "gradient-violet text-white shadow-card hover:opacity-90"
                    )}
                    aria-label={`Connect ${device.name}`}
                  >
                    {isConnecting ? (
                      <><RefreshCw size={12} className="animate-spin" aria-hidden="true" /> Connecting…</>
                    ) : (
                      <><Plus size={12} aria-hidden="true" /> Connect</>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Sync info callout */}
        <div className="mt-5 p-4 rounded-xl bg-bg-lavender border border-accent-lavender/30">
          <div className="flex items-start gap-2">
            <Bluetooth size={16} className="text-accent-violet flex-shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <p className="font-semibold text-label-sm text-text-primary mb-1">How syncing works</p>
              <ul className="text-xs text-text-secondary space-y-1 leading-relaxed list-disc list-inside">
                <li><strong>Apple Watch / Health:</strong> Passive background sync via HealthKit — no battery drain.</li>
                <li><strong>Fitbit / Garmin:</strong> OAuth cloud-to-cloud sync every 15 minutes automatically.</li>
                <li><strong>BLE devices:</strong> Open the app and press sync on your device — data transfers via Bluetooth.</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="h-8" />
      </div>
    </AppShell>
  );
}
