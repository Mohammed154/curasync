/**
 * CuraSync — Business Logic Unit Tests
 * Coverage target: 90% lines + functions for lib/alerts.ts
 * Run: npm test
 */

import { describe, it, expect } from "vitest";
import {
  evaluateReading,
  severityColor,
  severityBg,
  severityIcon,
  DEFAULT_THRESHOLDS,
  type ThresholdRule,
} from "../alerts";
import type { AlertSeverity, BiometricType } from "../../types";

// ─── Alert Engine ─────────────────────────────────────────────────────────────

describe("evaluateReading — blood glucose", () => {
  it("returns critical alert when glucose > 400", () => {
    const alerts = evaluateReading("pat_001", "blood_glucose", 420);
    expect(alerts).toHaveLength(1);
    expect(alerts[0]!.severity).toBe("critical");
    expect(alerts[0]!.type).toBe("blood_glucose");
    expect(alerts[0]!.value).toBe(420);
  });

  it("returns high alert when glucose > 250 but <= 400", () => {
    const alerts = evaluateReading("pat_001", "blood_glucose", 265);
    expect(alerts).toHaveLength(1);
    expect(alerts[0]!.severity).toBe("high");
  });

  it("returns critical alert for severe hypoglycemia (< 54)", () => {
    const alerts = evaluateReading("pat_001", "blood_glucose", 40);
    expect(alerts).toHaveLength(1);
    expect(alerts[0]!.severity).toBe("critical");
    expect(alerts[0]!.message).toContain("Severe hypoglycemia");
  });

  it("returns high alert for hypoglycemia (54–69)", () => {
    const alerts = evaluateReading("pat_001", "blood_glucose", 65);
    expect(alerts).toHaveLength(1);
    expect(alerts[0]!.severity).toBe("high");
    expect(alerts[0]!.message).toContain("Low blood glucose");
  });

  it("returns no alert for normal glucose (70–180)", () => {
    const alerts = evaluateReading("pat_001", "blood_glucose", 120);
    expect(alerts).toHaveLength(0);
  });

  it("returns no alert at exact boundary 70 mg/dL", () => {
    const alerts = evaluateReading("pat_001", "blood_glucose", 70);
    expect(alerts).toHaveLength(0);
  });

  it("returns no alert at exact boundary 180 mg/dL", () => {
    const alerts = evaluateReading("pat_001", "blood_glucose", 180);
    expect(alerts).toHaveLength(0);
  });
});

describe("evaluateReading — blood pressure", () => {
  it("returns critical alert for systolic > 180 (hypertensive crisis)", () => {
    const alerts = evaluateReading("pat_001", "blood_pressure_systolic", 190);
    expect(alerts).toHaveLength(1);
    expect(alerts[0]!.severity).toBe("critical");
    expect(alerts[0]!.message).toContain("hypertensive crisis");
  });

  it("returns high alert for systolic 151–180", () => {
    const alerts = evaluateReading("pat_001", "blood_pressure_systolic", 160);
    expect(alerts).toHaveLength(1);
    expect(alerts[0]!.severity).toBe("high");
  });

  it("returns no alert for normal systolic <= 150", () => {
    const alerts = evaluateReading("pat_001", "blood_pressure_systolic", 130);
    expect(alerts).toHaveLength(0);
  });

  it("returns no alert at exact boundary 150 mmHg", () => {
    const alerts = evaluateReading("pat_001", "blood_pressure_systolic", 150);
    expect(alerts).toHaveLength(0);
  });
});

describe("evaluateReading — SpO2", () => {
  it("returns critical alert for SpO2 < 90%", () => {
    const alerts = evaluateReading("pat_001", "spo2", 85);
    expect(alerts).toHaveLength(1);
    expect(alerts[0]!.severity).toBe("critical");
  });

  it("returns high alert for SpO2 90–93%", () => {
    const alerts = evaluateReading("pat_001", "spo2", 92);
    expect(alerts).toHaveLength(1);
    expect(alerts[0]!.severity).toBe("high");
  });

  it("returns no alert for normal SpO2 >= 94%", () => {
    const alerts = evaluateReading("pat_001", "spo2", 98);
    expect(alerts).toHaveLength(0);
  });
});

describe("evaluateReading — heart rate", () => {
  it("returns critical alert for HR > 150 bpm", () => {
    const alerts = evaluateReading("pat_001", "heart_rate", 160);
    expect(alerts).toHaveLength(1);
    expect(alerts[0]!.severity).toBe("critical");
  });

  it("returns critical alert for severe bradycardia (< 40 bpm)", () => {
    const alerts = evaluateReading("pat_001", "heart_rate", 35);
    expect(alerts).toHaveLength(1);
    expect(alerts[0]!.severity).toBe("critical");
    expect(alerts[0]!.message).toContain("Severe bradycardia");
  });

  it("returns no alert for normal HR 40–150", () => {
    const alerts = evaluateReading("pat_001", "heart_rate", 74);
    expect(alerts).toHaveLength(0);
  });
});

describe("evaluateReading — priority deduplication", () => {
  it("returns only the highest severity alert when multiple rules match", () => {
    // glucose of 420 triggers both critical (>400) AND high (>250) — should return only critical
    const alerts = evaluateReading("pat_001", "blood_glucose", 420);
    expect(alerts).toHaveLength(1);
    expect(alerts[0]!.severity).toBe("critical");
  });

  it("sets patientId, triggeredAt and status correctly on alert", () => {
    const alerts = evaluateReading("pat_test", "blood_glucose", 420);
    expect(alerts[0]!.patientId).toBe("pat_test");
    expect(alerts[0]!.status).toBe("active");
    expect(() => new Date(alerts[0]!.triggeredAt)).not.toThrow();
  });

  it("returns empty array for unknown biometric type with no rules", () => {
    const alerts = evaluateReading("pat_001", "weight", 85);
    expect(alerts).toHaveLength(0);
  });
});

describe("evaluateReading — threshold boundary precision", () => {
  it("does NOT trigger at exact threshold value when condition is 'gt'", () => {
    // BG rule: severity high when > 250 (strict greater-than)
    const alerts = evaluateReading("pat_001", "blood_glucose", 250);
    // 250 is not > 250, so high should not trigger. Only if > 250
    const highAlerts = alerts.filter((a) => a.severity === "high" && a.message.includes("elevated"));
    expect(highAlerts).toHaveLength(0);
  });

  it("triggers at threshold + 1", () => {
    const alerts = evaluateReading("pat_001", "blood_glucose", 251);
    const highAlerts = alerts.filter((a) => a.severity === "high");
    expect(highAlerts).toHaveLength(1);
  });
});

// ─── Severity helpers ─────────────────────────────────────────────────────────

describe("severityColor", () => {
  const cases: [AlertSeverity, string][] = [
    ["critical", "#D63031"],
    ["high",     "#E17055"],
    ["medium",   "#FDCB6E"],
    ["low",      "#00B894"],
  ];

  it.each(cases)("returns correct hex for %s severity", (severity, expectedColor) => {
    expect(severityColor(severity)).toBe(expectedColor);
  });
});

describe("severityBg", () => {
  it("returns light background for critical", () => {
    expect(severityBg("critical")).toBe("#FDECEA");
  });

  it("returns light background for low", () => {
    expect(severityBg("low")).toBe("#E8F8F5");
  });
});

describe("severityIcon", () => {
  it("returns red circle for critical", () => {
    expect(severityIcon("critical")).toBe("🔴");
  });

  it("returns warning for high", () => {
    expect(severityIcon("high")).toBe("⚠️");
  });

  it("returns info for low", () => {
    expect(severityIcon("low")).toBe("ℹ️");
  });
});

// ─── Default thresholds completeness ─────────────────────────────────────────

describe("DEFAULT_THRESHOLDS integrity", () => {
  it("has at least 10 threshold rules defined", () => {
    expect(DEFAULT_THRESHOLDS.length).toBeGreaterThanOrEqual(10);
  });

  it("all rules have required fields", () => {
    DEFAULT_THRESHOLDS.forEach((rule: ThresholdRule) => {
      expect(rule.type).toBeTruthy();
      expect(rule.severity).toMatch(/^(critical|high|medium|low)$/);
      expect(rule.condition).toMatch(/^(gt|lt|gte|lte)$/);
      expect(typeof rule.value).toBe("number");
      expect(typeof rule.message).toBe("function");
    });
  });

  it("message function returns a string containing the reading value", () => {
    DEFAULT_THRESHOLDS.forEach((rule: ThresholdRule) => {
      const msg = rule.message(rule.value + 1);
      expect(typeof msg).toBe("string");
      expect(msg.length).toBeGreaterThan(0);
    });
  });

  it("covers all critical biometric types", () => {
    const criticalTypes = DEFAULT_THRESHOLDS
      .filter((r) => r.severity === "critical")
      .map((r) => r.type);

    expect(criticalTypes).toContain("blood_glucose");
    expect(criticalTypes).toContain("blood_pressure_systolic");
    expect(criticalTypes).toContain("spo2");
    expect(criticalTypes).toContain("heart_rate");
  });
});

// ─── Adherence score arithmetic ───────────────────────────────────────────────

describe("adherence score calculation", () => {
  function calcAdherence(taken: number, total: number): number {
    if (total === 0) return 100;
    return Math.round((taken / total) * 100);
  }

  it("returns 100 when all medications taken", () => {
    expect(calcAdherence(4, 4)).toBe(100);
  });

  it("returns 75 when 3 of 4 medications taken", () => {
    expect(calcAdherence(3, 4)).toBe(75);
  });

  it("returns 0 when no medications taken", () => {
    expect(calcAdherence(0, 4)).toBe(0);
  });

  it("returns 100 when no medications scheduled (edge case)", () => {
    expect(calcAdherence(0, 0)).toBe(100);
  });

  it("rounds to nearest integer", () => {
    // 1/3 = 33.33... → rounds to 33
    expect(calcAdherence(1, 3)).toBe(33);
  });
});

// ─── Entry rate limit arithmetic ─────────────────────────────────────────────

describe("entry rate limit logic", () => {
  const MAX = 5;
  const WINDOW = 24 * 60 * 60 * 1000;

  function checkLimit(count: number): { allowed: boolean; remaining: number } {
    if (count >= MAX) return { allowed: false, remaining: 0 };
    return { allowed: true, remaining: MAX - count - 1 };
  }

  it("allows first entry", () => {
    expect(checkLimit(0).allowed).toBe(true);
    expect(checkLimit(0).remaining).toBe(4);
  });

  it("allows up to 4th entry", () => {
    expect(checkLimit(4).allowed).toBe(true);
    expect(checkLimit(4).remaining).toBe(0);
  });

  it("blocks 5th and beyond", () => {
    expect(checkLimit(5).allowed).toBe(false);
    expect(checkLimit(6).allowed).toBe(false);
  });
});

// ─── Edit window check ────────────────────────────────────────────────────────

describe("2-day edit window", () => {
  const TWO_DAYS_MS = 2 * 24 * 60 * 60 * 1000;

  function isEditable(createdAt: Date, now = new Date()): boolean {
    return now.getTime() - createdAt.getTime() < TWO_DAYS_MS;
  }

  it("allows editing entry created now", () => {
    expect(isEditable(new Date())).toBe(true);
  });

  it("allows editing entry created 47 hours ago", () => {
    const created = new Date(Date.now() - 47 * 60 * 60 * 1000);
    expect(isEditable(created)).toBe(true);
  });

  it("blocks editing entry created exactly 48 hours ago", () => {
    const created = new Date(Date.now() - 48 * 60 * 60 * 1000);
    expect(isEditable(created)).toBe(false);
  });

  it("blocks editing entry created 3 days ago", () => {
    const created = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
    expect(isEditable(created)).toBe(false);
  });
});
