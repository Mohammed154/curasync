// ─── CuraSync Alert Engine ──────────────────────────────────────────────────
// Rule-based threshold engine per PRD §5.8 and To-Do §4.1
// No AI/ML — pure rule evaluation for MVP (Phase 2 adds ML)

import { Alert, AlertSeverity, BiometricType } from "@/types";
import { nanoid } from "nanoid";

// ─── Default clinical thresholds ─────────────────────────────────────────────
// These are the global defaults; providers can override per-patient (Phase 1)

export interface ThresholdRule {
  type: BiometricType;
  severity: AlertSeverity;
  condition: "gt" | "lt" | "gte" | "lte";
  value: number;
  message: (reading: number) => string;
}

export const DEFAULT_THRESHOLDS: ThresholdRule[] = [
  // Blood glucose — critical
  {
    type: "blood_glucose",
    severity: "critical",
    condition: "gt",
    value: 400,
    message: (v) => `Blood glucose critically high: ${v} mg/dL (>400)`,
  },
  // Blood glucose — high
  {
    type: "blood_glucose",
    severity: "high",
    condition: "gt",
    value: 250,
    message: (v) => `Blood glucose elevated: ${v} mg/dL (>250)`,
  },
  // Blood glucose — low (hypoglycemia critical)
  {
    type: "blood_glucose",
    severity: "critical",
    condition: "lt",
    value: 54,
    message: (v) => `Severe hypoglycemia: ${v} mg/dL (<54)`,
  },
  // Blood glucose — low (hypoglycemia high)
  {
    type: "blood_glucose",
    severity: "high",
    condition: "lt",
    value: 70,
    message: (v) => `Low blood glucose: ${v} mg/dL (<70)`,
  },
  // Blood pressure systolic — critical (hypertensive crisis)
  {
    type: "blood_pressure_systolic",
    severity: "critical",
    condition: "gt",
    value: 180,
    message: (v) => `BP critically high: ${v}/? mmHg — hypertensive crisis`,
  },
  // Blood pressure systolic — high
  {
    type: "blood_pressure_systolic",
    severity: "high",
    condition: "gt",
    value: 150,
    message: (v) => `BP elevated: ${v} mmHg systolic`,
  },
  // SpO2 — critical
  {
    type: "spo2",
    severity: "critical",
    condition: "lt",
    value: 90,
    message: (v) => `SpO2 critically low: ${v}% — urgent attention needed`,
  },
  // SpO2 — high alert
  {
    type: "spo2",
    severity: "high",
    condition: "lt",
    value: 94,
    message: (v) => `SpO2 below normal: ${v}%`,
  },
  // Heart rate — critical high
  {
    type: "heart_rate",
    severity: "critical",
    condition: "gt",
    value: 150,
    message: (v) => `Heart rate critically elevated: ${v} bpm`,
  },
  // Heart rate — critical low (bradycardia)
  {
    type: "heart_rate",
    severity: "critical",
    condition: "lt",
    value: 40,
    message: (v) => `Severe bradycardia: ${v} bpm`,
  },
];

// ─── Evaluate a single reading against all rules ──────────────────────────────

export function evaluateReading(
  patientId: string,
  type: BiometricType,
  value: number
): Alert[] {
  const triggered: Alert[] = [];

  for (const rule of DEFAULT_THRESHOLDS) {
    if (rule.type !== type) continue;

    const breach =
      (rule.condition === "gt" && value > rule.value) ||
      (rule.condition === "gte" && value >= rule.value) ||
      (rule.condition === "lt" && value < rule.value) ||
      (rule.condition === "lte" && value <= rule.value);

    if (breach) {
      triggered.push({
        id: nanoid(),
        patientId,
        severity: rule.severity,
        status: "active",
        type,
        message: rule.message(value),
        value,
        threshold: rule.value,
        triggeredAt: new Date().toISOString(),
      });
    }
  }

  // Return highest-severity only (no duplicate alerts per reading)
  const priorityMap: Record<AlertSeverity, number> = {
    critical: 4,
    high: 3,
    medium: 2,
    low: 1,
  };

  triggered.sort(
    (a, b) => priorityMap[b.severity] - priorityMap[a.severity]
  );

  return triggered.slice(0, 1);
}

// ─── Alert severity badge helpers ────────────────────────────────────────────

export function severityColor(severity: AlertSeverity): string {
  switch (severity) {
    case "critical":
      return "#D63031";
    case "high":
      return "#E17055";
    case "medium":
      return "#FDCB6E";
    case "low":
      return "#00B894";
  }
}

export function severityBg(severity: AlertSeverity): string {
  switch (severity) {
    case "critical":
      return "#FDECEA";
    case "high":
      return "#FEF0EC";
    case "medium":
      return "#FEF9E7";
    case "low":
      return "#E8F8F5";
  }
}

export function severityIcon(severity: AlertSeverity): string {
  switch (severity) {
    case "critical":
      return "🔴";
    case "high":
      return "⚠️";
    case "medium":
      return "🟡";
    case "low":
      return "ℹ️";
  }
}
