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
      id: "pat_arjun_01",
      userId: "usr_001",
      name: "Arjun Mehta",
      dateOfBirth: "1967-03-14",
      conditions: ["diabetes_t2", "hypertension", "ckd"],
      emergencyContact: {
        name: "Sunita Mehta",
        phone: "+91 98765 43210",
        relationship: "Spouse",
      },
      createdAt: "2026-01-15T08:00:00Z",
      updatedAt: new Date().toISOString(),
    },
    latestReadings: {
      bloodGlucose: 142,
      systolic: 138,
      diastolic: 88,
      heartRate: 74,
      spo2: 97,
      weight: 84.2,
      lastSyncedAt: new Date(Date.now() - 1000 * 60 * 8).toISOString(), // 8 mins ago
    },
    todayMedications: [
      {
        id: "med_001",
        name: "Metformin",
        dosage: "500mg",
        scheduledAt: "08:00",
        status: "taken",
        conditionId: "diabetes_t2",
      },
      {
        id: "med_002",
        name: "Amlodipine",
        dosage: "5mg",
        scheduledAt: "09:00",
        status: "taken",
        conditionId: "hypertension",
      },
      {
        id: "med_003",
        name: "Lisinopril",
        dosage: "10mg",
        scheduledAt: "21:00",
        status: "pending",
        conditionId: "hypertension",
      },
      {
        id: "med_004",
        name: "Metformin",
        dosage: "500mg",
        scheduledAt: "21:00",
        status: "pending",
        conditionId: "diabetes_t2",
      },
    ],
    activeAlerts: [
      {
        id: "alert_001",
        patientId: "pat_arjun_01",
        severity: "medium",
        status: "active",
        type: "blood_pressure_systolic",
        message: "BP trending above target: 138/88 mmHg",
        value: 138,
        threshold: 130,
        triggeredAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
      },
    ],
    weeklyAdherence: 87,
    streakDays: 12,
    conditionSummaries: [
      {
        conditionId: "diabetes_t2",
        label: "Type 2 Diabetes",
        metricLabel: "Blood Glucose",
        metricValue: "142",
        unit: "mg/dL",
        trend: "down",
        status: "amber",
        color: "#00CEC9",
        bgColor: "#E6FAF9",
        iconEmoji: "🩸",
      },
      {
        conditionId: "hypertension",
        label: "Hypertension",
        metricLabel: "Blood Pressure",
        metricValue: "138/88",
        unit: "mmHg",
        trend: "stable",
        status: "amber",
        color: "#E84393",
        bgColor: "#F0EFF8",
        iconEmoji: "💉",
      },
      {
        conditionId: "ckd",
        label: "CKD Stage 3",
        metricLabel: "eGFR",
        metricValue: "48",
        unit: "mL/min",
        trend: "stable",
        status: "amber",
        color: "#A29BFE",
        bgColor: "#F0EFF8",
        iconEmoji: "🫘",
      },
    ],
    recentReadings: generateSparkline(130, 165, 24), // 24 hrs of glucose
  };
}

// ─── Provider patient panel mock ──────────────────────────────────────────────

export function getMockProviderPanel(): ProviderPatientRow[] {
  return [
    {
      patientId: "pat_001",
      name: "Arjun Mehta",
      age: 58,
      conditions: ["diabetes_t2", "hypertension", "ckd"],
      lastActivityDate: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
      alertCount: 1,
      adherenceScore: 87,
      alertStatus: "amber",
    },
    {
      patientId: "pat_002",
      name: "Priya Sharma",
      age: 63,
      conditions: ["hypertension", "chf"],
      lastActivityDate: new Date(Date.now() - 1000 * 60 * 10).toISOString(),
      alertCount: 2,
      adherenceScore: 64,
      alertStatus: "red",
    },
    {
      patientId: "pat_003",
      name: "Rajesh Patel",
      age: 71,
      conditions: ["diabetes_t2", "cad"],
      lastActivityDate: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
      alertCount: 0,
      adherenceScore: 96,
      alertStatus: "green",
    },
    {
      patientId: "pat_004",
      name: "Meena Joshi",
      age: 55,
      conditions: ["diabetes_t1", "hypothyroidism"],
      lastActivityDate: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
      alertCount: 0,
      adherenceScore: 92,
      alertStatus: "green",
    },
    {
      patientId: "pat_005",
      name: "Suresh Iyer",
      age: 67,
      conditions: ["copd", "hypertension"],
      lastActivityDate: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
      alertCount: 3,
      adherenceScore: 45,
      alertStatus: "red",
    },
    {
      patientId: "pat_006",
      name: "Kavita Nair",
      age: 49,
      conditions: ["ra", "hypertension"],
      lastActivityDate: new Date(Date.now() - 1000 * 60 * 20).toISOString(),
      alertCount: 0,
      adherenceScore: 98,
      alertStatus: "green",
    },
  ];
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
  return [
    makeGlucoseEntry(1,  22, 98,  "Fasting",     undefined, undefined, "Morning fasting"),
    makeGlucoseEntry(2,  20, 132, "Before Meal",  4,         undefined, "Pre-lunch"),
    makeGlucoseEntry(3,  18, 178, "After Meal",   undefined, 65,        "Post-lunch rice"),
    makeGlucoseEntry(4,  16, 145, "Before Meal",  undefined, undefined, "Pre-snack"),
    makeGlucoseEntry(5,  14, 168, "After Meal",   undefined, 45,        "Post-snack"),
    makeGlucoseEntry(6,  12, 124, "Bedtime",      6,         undefined, "Before sleep"),
    makeGlucoseEntry(7,  10, 105, "Fasting",      undefined, undefined, "Next morning fasting"),
    makeGlucoseEntry(8,   8, 142, "Before Meal",  4,         undefined, "Pre-breakfast"),
    makeGlucoseEntry(9,   6, 195, "After Meal",   undefined, 80,        "Post-breakfast (dosa)"),
    makeGlucoseEntry(10,  4, 128, "Before Meal",  undefined, undefined, "Pre-lunch"),
    makeGlucoseEntry(11,  2, 162, "After Meal",   undefined, 55,        "Post-lunch"),
    makeGlucoseEntry(12,  1, 118, "Bedtime",      6,         undefined, "Before sleep"),
  ];
}
