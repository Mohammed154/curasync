// ─── Glucose Classification Utilities ─────────────────────────────────────────
// Ported from the Python glucose tracker script.
// Provides reading-type-aware status classification with CuraSync design tokens.

import { colors } from "@/lib/design-tokens";

export type GlucoseReadingType = "Fasting" | "Before Meal" | "After Meal" | "Bedtime";

export interface GlucoseThresholds {
  low: number;
  normal: number;
  warn: number;
}

export type GlucoseStatus = "Low" | "Normal" | "Elevated" | "High";

// ── Per-reading-type clinical thresholds ──────────────────────────────────────
export const GLUCOSE_RANGES: Record<GlucoseReadingType, GlucoseThresholds> = {
  "Fasting":     { low: 70,  normal: 100, warn: 126 },
  "Before Meal": { low: 70,  normal: 130, warn: 180 },
  "After Meal":  { low: 70,  normal: 140, warn: 200 },
  "Bedtime":     { low: 100, normal: 140, warn: 180 },
};

// ── Status color mapping using design tokens ─────────────────────────────────
export const STATUS_COLORS: Record<GlucoseStatus, string> = {
  Low:      "#74B9FF",           // sky blue
  Normal:   colors.status.green, // #00B894
  Elevated: colors.status.amber, // #FDCB6E
  High:     colors.status.red,   // #D63031
};

export const STATUS_BG_COLORS: Record<GlucoseStatus, string> = {
  Low:      "#EBF5FB",
  Normal:   colors.status.greenBg,
  Elevated: colors.status.amberBg,
  High:     colors.status.redBg,
};

// ── Classification function ──────────────────────────────────────────────────
export function getGlucoseStatus(
  glucose: number,
  readingType: GlucoseReadingType
): { status: GlucoseStatus; color: string; bgColor: string } {
  const r = GLUCOSE_RANGES[readingType];

  if (glucose < r.low) {
    return { status: "Low", color: STATUS_COLORS.Low, bgColor: STATUS_BG_COLORS.Low };
  } else if (glucose <= r.normal) {
    return { status: "Normal", color: STATUS_COLORS.Normal, bgColor: STATUS_BG_COLORS.Normal };
  } else if (glucose <= r.warn) {
    return { status: "Elevated", color: STATUS_COLORS.Elevated, bgColor: STATUS_BG_COLORS.Elevated };
  } else {
    return { status: "High", color: STATUS_COLORS.High, bgColor: STATUS_BG_COLORS.High };
  }
}

// ── Entry type for the glucose log chart ─────────────────────────────────────
export interface GlucoseLogEntry {
  id: string;
  datetime: string;       // ISO string or formatted
  glucose: number;        // mg/dL
  readingType: GlucoseReadingType;
  insulin?: number;       // units
  carbs?: number;         // grams
  status: GlucoseStatus;
  color: string;
  notes?: string;
}

// ── Helper: compute summary statistics ───────────────────────────────────────
export function computeGlucoseStats(entries: GlucoseLogEntry[]) {
  if (entries.length === 0) {
    return { avg: 0, min: 0, max: 0, inRangePercent: 0, count: 0 };
  }

  const values = entries.map((e) => e.glucose);
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const inRange = entries.filter((e) => e.status === "Normal").length;
  const inRangePercent = Math.round((inRange / entries.length) * 100);

  return { avg: Math.round(avg * 10) / 10, min, max, inRangePercent, count: entries.length };
}

// ── Reading type options for UI selectors ────────────────────────────────────
export const READING_TYPE_OPTIONS: { value: GlucoseReadingType; label: string; icon: string }[] = [
  { value: "Fasting",     label: "Fasting",     icon: "🌅" },
  { value: "Before Meal", label: "Before Meal",  icon: "🍽️" },
  { value: "After Meal",  label: "After Meal",   icon: "🥗" },
  { value: "Bedtime",     label: "Bedtime",      icon: "🌙" },
];
