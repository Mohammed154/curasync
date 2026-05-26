"use client";

import { useState, useEffect, useCallback } from "react";
import type { BiometricType } from "@/types";
import { getStreamedReading } from "@/lib/mock-data";

interface ReadingState {
  value: number;
  lastUpdated: Date;
  status: "idle" | "refreshing" | "error";
}

interface UseRealTimeReadingsOptions {
  baseValue: number;
  variance: number;
  intervalMs?: number;
  enabled?: boolean;
}

/**
 * Simulates a live biometric reading with periodic updates.
 * Replace the interval body with a real fetch to /api/v1/readings
 * when the TimescaleDB backend is connected.
 */
export function useRealTimeReading({
  baseValue,
  variance,
  intervalMs = 8000,
  enabled = true,
}: UseRealTimeReadingsOptions): ReadingState & { refresh: () => void } {
  const [state, setState] = useState<ReadingState>({
    value: baseValue,
    lastUpdated: new Date(),
    status: "idle",
  });

  const refresh = useCallback(() => {
    setState((prev) => ({ ...prev, status: "refreshing" }));
    // In production: fetch from /api/v1/readings?patientId=...&type=...&limit=1
    setTimeout(() => {
      setState({
        value: getStreamedReading(baseValue, variance),
        lastUpdated: new Date(),
        status: "idle",
      });
    }, 400);
  }, [baseValue, variance]);

  useEffect(() => {
    if (!enabled) return;
    const id = setInterval(refresh, intervalMs);
    return () => clearInterval(id);
  }, [enabled, intervalMs, refresh]);

  return { ...state, refresh };
}

/**
 * Fetches and posts a reading to the ingestion API.
 * Used by the Log Reading FAB/sheet.
 */
export async function postReading(payload: {
  patientId: string;
  type: BiometricType;
  value: number;
  unit: string;
  source: "manual";
  recordedAt: string;
  notes?: string;
}): Promise<{ success: boolean; alertCount: number; error?: string }> {
  try {
    const res = await fetch("/api/v1/readings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      let errorMsg = `HTTP ${res.status}`;
      try {
        const body = await res.json() as { error?: string; detail?: string };
        errorMsg = body.detail ?? body.error ?? errorMsg;
      } catch {
        // Response body is empty or not valid JSON — use status message
      }
      console.error("[postReading] API error:", errorMsg);
      return { success: false, alertCount: 0, error: errorMsg };
    }

    const alertCount = parseInt(res.headers.get("X-Alert-Count") ?? "0", 10);
    return { success: true, alertCount };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Network error";
    console.error("[postReading] error:", err);
    return { success: false, alertCount: 0, error: message };
  }
}
