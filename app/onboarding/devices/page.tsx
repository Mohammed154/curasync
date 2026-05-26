"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Heart, ArrowRight, ArrowLeft, CheckCircle2, Loader2, Wifi } from "lucide-react";
import { clsx } from "clsx";

interface Device {
  id: string;
  name: string;
  description: string;
  icon: string;
  available: boolean;
  authType: "oauth" | "ble" | "native";
}

const DEVICES: Device[] = [
  { id: "apple_health", name: "Apple Health", description: "Syncs all metrics automatically via HealthKit", icon: "🍎", available: true, authType: "native" },
  { id: "apple_watch",  name: "Apple Watch", description: "Heart rate, SpO2, activity, ECG complications", icon: "⌚", available: true, authType: "native" },
  { id: "fitbit",       name: "Fitbit", description: "Cloud sync every 15 min — steps, HR, sleep, SpO2", icon: "📿", available: true, authType: "oauth" },
  { id: "garmin",       name: "Garmin Connect", description: "Cloud sync every 15 min — all Garmin metrics", icon: "🏃", available: true, authType: "oauth" },
  { id: "ble_glucose",  name: "BLE Glucometer", description: "Bluetooth glucose meter — Accu-Chek, OneTouch supported", icon: "🩸", available: false, authType: "ble" },
  { id: "ble_bp",       name: "BLE Blood Pressure Cuff", description: "Omron BLE profile — automatic BP sync", icon: "💉", available: false, authType: "ble" },
];

export default function OnboardingDevicesPage() {
  const [connected, setConnected] = useState<Set<string>>(new Set());
  const [connecting, setConnecting] = useState<string | null>(null);

  const connectDevice = (id: string) => {
    setConnecting(id);
    // Simulate OAuth / native auth flow
    setTimeout(() => {
      setConnected((prev) => new Set([...prev, id]));
      setConnecting(null);
    }, 1800);
  };

  return (
    <div className="min-h-screen bg-bg-light flex flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="flex items-center gap-2 mb-8">
          <div className="w-9 h-9 rounded-xl gradient-violet flex items-center justify-center">
            <Heart size={18} className="text-white" strokeWidth={2.5} />
          </div>
          <span className="font-bold text-title-lg text-text-primary">CuraSync</span>
        </div>

        {/* Progress */}
        <div className="flex items-center gap-2 mb-6">
          <div className="flex gap-1.5">
            {[1,2,3,4,5].map((step) => (
              <div key={step} className="h-1.5 rounded-full transition-all"
                style={{ width: step <= 4 ? "40px" : "12px", background: step <= 4 ? "#6C5CE7" : "#E2E0F0" }} />
            ))}
          </div>
          <span className="text-xs text-text-tertiary ml-2">Step 4 of 5</span>
        </div>

        <div className="mb-6">
          <h1 className="font-bold text-title-lg text-text-primary mb-2">Connect your devices</h1>
          <p className="text-body-md text-text-secondary">
            Connect wearables to log metrics automatically — no manual entry needed. You can add more devices later in Settings.
          </p>
        </div>

        {connected.size > 0 && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-status-green-bg border border-status-green/20 mb-4">
            <Wifi size={14} className="text-status-green" aria-hidden="true" />
            <span className="text-xs font-semibold text-status-green">{connected.size} device{connected.size !== 1 ? "s" : ""} connected</span>
          </div>
        )}

        {/* Device list */}
        <div className="space-y-2 mb-6">
          {DEVICES.map((device) => {
            const isConnected = connected.has(device.id);
            const isConnecting = connecting === device.id;
            return (
              <div key={device.id}
                className={clsx(
                  "bg-bg-card rounded-xl p-4 shadow-card flex items-center gap-3 transition-all",
                  isConnected && "border border-status-green/30",
                  !device.available && "opacity-50"
                )}
              >
                <span className="text-2xl flex-shrink-0" aria-hidden="true">{device.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-label-sm text-text-primary">
                    {device.name}
                    {!device.available && <span className="ml-2 text-xs text-text-tertiary font-normal">(mobile only)</span>}
                  </p>
                  <p className="text-xs text-text-tertiary leading-snug mt-0.5">{device.description}</p>
                  <p className="text-xs text-text-tertiary mt-0.5 capitalize">
                    {device.authType === "oauth" ? "🔐 OAuth 2.0" : device.authType === "native" ? "📱 Native bridge" : "📡 Bluetooth BLE"}
                  </p>
                </div>

                {device.available && (
                  <button
                    onClick={() => !isConnected && !isConnecting && connectDevice(device.id)}
                    disabled={isConnected || isConnecting || !device.available}
                    className={clsx(
                      "px-3 py-2 rounded-full text-xs font-semibold transition-all flex-shrink-0 flex items-center gap-1.5",
                      isConnected
                        ? "bg-status-green-bg text-status-green cursor-default"
                        : isConnecting
                        ? "bg-bg-lavender text-accent-violet cursor-wait"
                        : "bg-bg-lavender text-accent-violet hover:bg-accent-violet hover:text-white"
                    )}
                    aria-label={isConnected ? `${device.name} connected` : `Connect ${device.name}`}
                  >
                    {isConnected
                      ? <><CheckCircle2 size={12} aria-hidden="true" /> Connected</>
                      : isConnecting
                      ? <><Loader2 size={12} className="animate-spin" aria-hidden="true" /> Connecting…</>
                      : "Connect"
                    }
                  </button>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex gap-3">
          <Link href="/onboarding/medications" className="flex items-center gap-2 px-4 py-3 rounded-xl border border-divider font-semibold text-body-md text-text-secondary hover:bg-bg-lavender transition-all">
            <ArrowLeft size={18} aria-hidden="true" />
            Back
          </Link>
          <Link href="/onboarding/complete" className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl gradient-violet text-white font-semibold text-body-md hover:opacity-90 transition-opacity">
            {connected.size > 0 ? "Continue with devices" : "Skip for now"}
            <ArrowRight size={18} aria-hidden="true" />
          </Link>
        </div>
      </div>
    </div>
  );
}
