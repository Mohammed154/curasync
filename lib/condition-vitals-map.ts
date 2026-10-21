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
    getValue: (r) => {
      if (r.systolic != null && r.diastolic != null) return `${r.systolic}/${r.diastolic}`;
      if (r.systolic != null) return `${r.systolic}/--`;
      if (r.diastolic != null) return `--/${r.diastolic}`;
      return "--";
    },
    getStatus: (r) => {
      const s = r.systolic;
      const d = r.diastolic;
      if (s == null && d == null) return "green";
      if ((s != null && s > 180) || (d != null && d > 120)) return "red";
      if ((s != null && s > 130) || (d != null && d > 85)) return "amber";
      return "green";
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
    getValue: (r) => (r.egfr != null ? String(r.egfr) : "--"),
    getStatus: (r) => {
      const v = r.egfr;
      if (v == null) return "green";
      return v < 30 ? "red" : v < 60 ? "amber" : "green";
    },
  },
  hba1c: {
    key: "hba1c",
    type: "hba1c",
    label: "HbA1c",
    unit: "%",
    icon: "📊",
    getValue: (r) => (r.hba1c != null ? String(r.hba1c) : "--"),
    getStatus: (r) => {
      const v = r.hba1c;
      if (v == null) return "green";
      return v >= 8 ? "red" : v >= 7 ? "amber" : "green";
    },
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
  body_temp: {
    key: "body_temp",
    type: "body_temp",
    label: "Body Temperature",
    unit: "°C",
    icon: "🌡️",
    getValue: (r) => (r.bodyTemp != null ? String(r.bodyTemp) : "--"),
    getStatus: (r) => {
      const v = r.bodyTemp;
      if (v == null) return "green";
      return v >= 38.5 || v <= 35 ? "red" : v >= 37.8 ? "amber" : "green";
    },
  },
  steps: {
    key: "steps",
    type: "steps",
    label: "Daily Steps",
    unit: "steps",
    icon: "🚶",
    getValue: (r) => (r.steps != null ? r.steps.toLocaleString() : "--"),
    getStatus: (r) => {
      const v = r.steps;
      if (v == null) return "green";
      return v < 3000 ? "amber" : "green";
    },
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
 * Returns de-duplicated vital card keys for a given set of condition IDs and latest logged readings,
 * consolidating systolic/diastolic blood pressure into a single "blood_pressure" card.
 * Prioritizes vitals with logged values so newly recorded metrics always display on the UI.
 */
export function getRelevantVitalKeysForConditions(
  conditions: ConditionId[],
  maxCount = 4,
  latest?: LatestReadings
): string[] {
  const result: string[] = [];
  const seen = new Set<string>();

  // 1. Prioritize vitals that have real logged values so user sees their logged entries immediately
  if (latest) {
    if (latest.bloodGlucose != null && !seen.has("blood_glucose")) {
      seen.add("blood_glucose");
      result.push("blood_glucose");
    }
    if ((latest.systolic != null || latest.diastolic != null) && !seen.has("blood_pressure")) {
      seen.add("blood_pressure");
      result.push("blood_pressure");
    }
    if (latest.weight != null && !seen.has("weight")) {
      seen.add("weight");
      result.push("weight");
    }
    if (latest.bodyTemp != null && !seen.has("body_temp")) {
      seen.add("body_temp");
      result.push("body_temp");
    }
    if (latest.steps != null && !seen.has("steps")) {
      seen.add("steps");
      result.push("steps");
    }
    if (latest.heartRate != null && !seen.has("heart_rate")) {
      seen.add("heart_rate");
      result.push("heart_rate");
    }
    if (latest.spo2 != null && !seen.has("spo2")) {
      seen.add("spo2");
      result.push("spo2");
    }
    if (latest.hba1c != null && !seen.has("hba1c")) {
      seen.add("hba1c");
      result.push("hba1c");
    }
  }

  // 2. Add remaining condition-specific vitals up to maxCount
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
    }
  }

  // 3. Fallback defaults if still empty
  if (result.length === 0) {
    return ["blood_glucose", "blood_pressure"];
  }

  const cap = Math.max(maxCount, Math.min(result.length, 6));
  return result.slice(0, cap);
}
