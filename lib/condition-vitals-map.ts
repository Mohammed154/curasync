import type { ConditionId, BiometricType, LatestReadings } from "@/types";

export interface VitalDisplayMeta {
  key: string;
  type: BiometricType | "blood_pressure";
  label: string;
  unit: string;
  icon: string;
  getValue: (readings: LatestReadings) => string;
  getStatus: (readings: LatestReadings) => "green" | "amber" | "red";
  sublabel?: string;
}

/**
 * Maps each condition_id to the 1–3 vital types that matter clinically.
 */
export const CONDITION_VITALS_MAP: Record<ConditionId, BiometricType[]> = {
  diabetes_t2:    ["blood_glucose", "hba1c"],
  diabetes_t1:    ["blood_glucose", "hba1c"],
  hypertension:   ["blood_pressure_systolic", "blood_pressure_diastolic"],
  ckd:            ["egfr", "blood_pressure_systolic"],
  copd:           [],
  asthma:         [],
  chf:            ["blood_pressure_systolic"],
  cad:            ["blood_pressure_systolic"],
  hypothyroidism: ["weight"],
  ra:             [], // No numeric vital — symptom/journal tracking
};

/**
 * Metadata and accessor rules for each vital display card.
 */
export const VITAL_METADATA: Record<string, VitalDisplayMeta> = {
  blood_glucose: {
    key: "blood_glucose",
    type: "blood_glucose",
    label: "Blood Glucose",
    unit: "mg/dL",
    icon: "🩸",
    getValue: (r) => (r.bloodGlucose != null ? String(r.bloodGlucose) : "--"),
    getStatus: (r) => {
      const v = r.bloodGlucose;
      if (v == null) return "green";
      return v > 250 || v < 54 ? "red" : v > 180 || v < 70 ? "amber" : "green";
    },
  },
  blood_pressure: {
    key: "blood_pressure",
    type: "blood_pressure",
    label: "Blood Pressure",
    unit: "mmHg",
    icon: "💉",
    getValue: (r) => (r.systolic != null && r.diastolic != null ? `${r.systolic}/${r.diastolic}` : "--"),
    getStatus: (r) => {
      const s = r.systolic;
      const d = r.diastolic;
      if (s == null || d == null) return "green";
      return s > 180 || d > 120 ? "red" : s > 130 || d > 85 ? "amber" : "green";
    },
  },
  heart_rate: {
    key: "heart_rate",
    type: "heart_rate",
    label: "Heart Rate",
    unit: "bpm",
    icon: "❤️",
    getValue: (r) => (r.heartRate != null ? String(r.heartRate) : "--"),
    getStatus: (r) => {
      const v = r.heartRate;
      if (v == null) return "green";
      return v > 120 || v < 45 ? "red" : v > 100 || v < 55 ? "amber" : "green";
    },
  },
  spo2: {
    key: "spo2",
    type: "spo2",
    label: "Blood Oxygen (SpO₂)",
    unit: "%",
    icon: "💨",
    getValue: (r) => (r.spo2 != null ? String(r.spo2) : "--"),
    getStatus: (r) => {
      const v = r.spo2;
      if (v == null) return "green";
      return v < 90 ? "red" : v < 95 ? "amber" : "green";
    },
  },
  egfr: {
    key: "egfr",
    type: "egfr",
    label: "Kidney eGFR",
    unit: "mL/min",
    icon: "🧪",
    getValue: () => "--",
    getStatus: () => "green",
  },
  hba1c: {
    key: "hba1c",
    type: "hba1c",
    label: "HbA1c",
    unit: "%",
    icon: "📊",
    getValue: () => "--",
    getStatus: () => "green",
  },
  weight: {
    key: "weight",
    type: "weight",
    label: "Weight",
    unit: "kg",
    icon: "⚖️",
    getValue: (r) => (r.weight != null ? String(r.weight) : "--"),
    getStatus: () => "green",
  },
  peak_flow: {
    key: "peak_flow",
    type: "peak_flow",
    label: "Peak Flow",
    unit: "L/min",
    icon: "🫁",
    getValue: () => "--",
    getStatus: () => "green",
  },
};

/**
 * Returns de-duplicated vital card keys for a given set of condition IDs,
 * consolidating systolic/diastolic blood pressure into a single "blood_pressure" card,
 * capped at maxCount (default 4).
 */
export function getRelevantVitalKeysForConditions(
  conditions: ConditionId[],
  maxCount = 4
): string[] {
  const result: string[] = [];
  const seen = new Set<string>();

  for (const condition of conditions) {
    const vitals = CONDITION_VITALS_MAP[condition] ?? [];
    for (const v of vitals) {
      const normalizedKey =
        v === "blood_pressure_systolic" || v === "blood_pressure_diastolic"
          ? "blood_pressure"
          : v;

      if (!seen.has(normalizedKey) && VITAL_METADATA[normalizedKey]) {
        seen.add(normalizedKey);
        result.push(normalizedKey);
      }
      if (result.length >= maxCount) {
        return result;
      }
    }
  }

  // Fallback if patient has no conditions or RA only
  if (result.length === 0) {
    return ["blood_glucose", "blood_pressure"];
  }

  return result.slice(0, maxCount);
}
