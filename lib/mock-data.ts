// ─── CuraSync Mock Data ─────────────────────────────────────────────────────
// Simulates real-time data streaming for MVP dashboard.
// Replace with live Supabase/TimescaleDB queries in production.

import type {
  DashboardData,
  ProviderPatientRow,
  Alert,
  SparklinePoint,
  ConditionSummary,
} from "@/types";

// ─── Patient dashboard mock ───────────────────────────────────────────────────

export function getMockDashboardData(): DashboardData {
  return {
    patient: {
      id: "",
      userId: "",
      name: "Patient",
      dateOfBirth: "",
      conditions: [],
      emergencyContact: {
        name: "",
        phone: "",
        relationship: "",
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    latestReadings: {
      bloodGlucose: 0,
      systolic: 0,
      diastolic: 0,
      heartRate: 0,
      spo2: 0,
      weight: 0,
      lastSyncedAt: new Date().toISOString(),
    },
    todayMedications: [],
    activeAlerts: [],
    weeklyAdherence: 0,
    streakDays: 0,
    conditionSummaries: [],
    recentReadings: [],
  };
}
// ─── Provider patient panel mock ──────────────────────────────────────────────

export function getMockProviderPanel(): ProviderPatientRow[] {
  return [];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function generateSparklinePublic(
  min: number,
  max: number,
  points: number
) {
  return generateSparkline(min, max, points);
}

function generateSparkline(
  min: number,
  max: number,
  points: number
): SparklinePoint[] {
  const now = Date.now();
  let prev = (min + max) / 2;
  return Array.from({ length: points }, (_, i) => {
    prev = Math.max(min, Math.min(max, prev + (Math.random() - 0.5) * 20));
    return {
      time: new Date(now - (points - i) * 60 * 60 * 1000).toISOString(),
      value: Math.round(prev),
    };
  });
}

// ─── "Live" streaming simulation — returns slightly mutated data each call ───

export function getStreamedReading(base: number, variance: number): number {
  return Math.round(base + (Math.random() - 0.5) * variance);
}

// ─── Glucose Log mock data (matches Python glucose tracker schema) ────────────

import type { GlucoseLogEntry, GlucoseReadingType } from "@/lib/glucose-utils";
import { getGlucoseStatus } from "@/lib/glucose-utils";

function makeGlucoseEntry(
  index: number,
  hoursAgo: number,
  glucose: number,
  readingType: GlucoseReadingType,
  insulin?: number,
  carbs?: number,
  notes?: string,
): GlucoseLogEntry {
  const { status, color } = getGlucoseStatus(glucose, readingType);
  return {
    id: `glog_${String(index).padStart(3, "0")}`,
    datetime: new Date(Date.now() - hoursAgo * 60 * 60 * 1000).toISOString(),
    glucose,
    readingType,
    insulin,
    carbs,
    status,
    color,
    notes,
  };
}

export function getMockGlucoseLog(): GlucoseLogEntry[] {
  return [];
}
