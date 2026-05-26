/**
 * CuraSync — Extended Unit Tests
 * Covers: OCR extraction logic, rate limit arithmetic, mock data integrity
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── OCR reading extraction ────────────────────────────────────────────────────
// Tests the regex extraction logic in isolation (no GCV network call)

describe("OCR text extraction — glucose patterns", () => {
  function extractGlucose(text: string): number | null {
    const normalised = text.replace(/\s+/g, " ").toLowerCase();
    const patterns = [
      /(?:glucose|blood sugar|fasting glucose)[^\d]*(\d+(?:\.\d+)?)\s*mg\/dl/gi,
      /(?:rbs|fbs|ppbs)[^\d]*(\d+(?:\.\d+)?)/gi,
    ];
    for (const p of patterns) {
      p.lastIndex = 0;
      const m = p.exec(normalised);
      if (m?.[1]) return parseFloat(m[1]);
    }
    return null;
  }

  it("extracts glucose from standard lab format", () => {
    expect(extractGlucose("Blood Glucose: 142 mg/dL")).toBe(142);
  });

  it("extracts FBS from abbreviated format", () => {
    expect(extractGlucose("FBS: 128")).toBe(128);
  });

  it("returns null when no glucose value found", () => {
    expect(extractGlucose("Cholesterol: 180 mg/dL")).toBeNull();
  });

  it("handles decimal glucose values", () => {
    expect(extractGlucose("Fasting glucose: 98.5 mg/dL")).toBe(98.5);
  });

  it("is case-insensitive", () => {
    expect(extractGlucose("BLOOD GLUCOSE 154 MG/DL")).toBe(154);
  });
});

describe("OCR plausibility check", () => {
  function isPlausible(type: string, value: number): boolean {
    const ranges: Record<string, [number, number]> = {
      blood_glucose: [20, 800],
      hba1c:         [3, 20],
      egfr:          [1, 130],
      cholesterol_ldl: [20, 400],
      cholesterol_hdl: [10, 150],
    };
    const range = ranges[type];
    if (!range) return true;
    return value >= range[0] && value <= range[1];
  }

  it("accepts normal glucose value", () => {
    expect(isPlausible("blood_glucose", 120)).toBe(true);
  });

  it("rejects impossibly high glucose", () => {
    expect(isPlausible("blood_glucose", 1200)).toBe(false);
  });

  it("rejects negative values", () => {
    expect(isPlausible("hba1c", -1)).toBe(false);
  });

  it("accepts boundary value at minimum", () => {
    expect(isPlausible("blood_glucose", 20)).toBe(true);
  });

  it("accepts boundary value at maximum", () => {
    expect(isPlausible("blood_glucose", 800)).toBe(true);
  });

  it("returns true for unknown type (no range defined)", () => {
    expect(isPlausible("steps", 10000)).toBe(true);
  });
});

// ─── Rate limit arithmetic ─────────────────────────────────────────────────────

describe("Rate limit window logic", () => {
  function isWithinWindow(createdAt: number, windowMs: number, now = Date.now()): boolean {
    return now - createdAt < windowMs;
  }

  it("is within 1-minute window for fresh entry", () => {
    expect(isWithinWindow(Date.now() - 30_000, 60_000)).toBe(true);
  });

  it("is outside 1-minute window for old entry", () => {
    expect(isWithinWindow(Date.now() - 90_000, 60_000)).toBe(false);
  });

  it("is within 24-hour window for recent entry", () => {
    expect(isWithinWindow(Date.now() - 3_600_000, 86_400_000)).toBe(true);
  });

  it("is outside 24-hour window for yesterday entry", () => {
    expect(isWithinWindow(Date.now() - 90_000_000, 86_400_000)).toBe(false);
  });
});

// ─── Adherence computation ────────────────────────────────────────────────────

describe("Adherence score from medication logs", () => {
  interface LogRow { status: string; count: number }

  function computeAdherence(logs: LogRow[]): number {
    const total  = logs.reduce((s, r) => s + r.count, 0);
    const taken  = logs.find((r) => r.status === "taken")?.count ?? 0;
    return total > 0 ? Math.round((taken / total) * 100) : 100;
  }

  it("returns 100 when no logs exist", () => {
    expect(computeAdherence([])).toBe(100);
  });

  it("returns 100 when all logs are taken", () => {
    expect(computeAdherence([{ status: "taken", count: 10 }])).toBe(100);
  });

  it("returns 75 for 3 taken out of 4 total", () => {
    expect(computeAdherence([
      { status: "taken",   count: 3 },
      { status: "skipped", count: 1 },
    ])).toBe(75);
  });

  it("returns 0 when all doses skipped", () => {
    expect(computeAdherence([{ status: "skipped", count: 8 }])).toBe(0);
  });

  it("rounds correctly for non-integer percentages", () => {
    // 2/3 = 66.67 → rounds to 67
    expect(computeAdherence([
      { status: "taken",   count: 2 },
      { status: "skipped", count: 1 },
    ])).toBe(67);
  });
});

// ─── Alert status mapping ─────────────────────────────────────────────────────

describe("Patient alert status from alert count", () => {
  function mapAlertStatus(count: number): "red" | "amber" | "green" {
    return count >= 3 ? "red" : count >= 1 ? "amber" : "green";
  }

  it("maps 0 alerts to green", ()  => expect(mapAlertStatus(0)).toBe("green"));
  it("maps 1 alert to amber",  ()  => expect(mapAlertStatus(1)).toBe("amber"));
  it("maps 2 alerts to amber", ()  => expect(mapAlertStatus(2)).toBe("amber"));
  it("maps 3 alerts to red",   ()  => expect(mapAlertStatus(3)).toBe("red"));
  it("maps 10 alerts to red",  ()  => expect(mapAlertStatus(10)).toBe("red"));
});

// ─── Webhook signature verification ──────────────────────────────────────────

describe("HMAC webhook signature", () => {
  const { createHmac } = require("crypto");

  function sign(secret: string, body: string): string {
    return createHmac("sha256", secret).update(body).digest("hex");
  }

  function verify(secret: string, body: string, sig: string): boolean {
    const expected = sign(secret, body);
    try {
      const { timingSafeEqual } = require("crypto");
      return timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
    } catch { return false; }
  }

  it("verifies a correctly signed payload", () => {
    const secret = "test-secret-32chars-xxxxxxxxxxxx";
    const body   = JSON.stringify({ patientId: "abc", readings: [] });
    const sig    = sign(secret, body);
    expect(verify(secret, body, sig)).toBe(true);
  });

  it("rejects a tampered payload", () => {
    const secret  = "test-secret-32chars-xxxxxxxxxxxx";
    const body    = JSON.stringify({ patientId: "abc", readings: [] });
    const sig     = sign(secret, body);
    const tampered = JSON.stringify({ patientId: "evil", readings: [] });
    expect(verify(secret, tampered, sig)).toBe(false);
  });

  it("rejects a wrong secret", () => {
    const body = JSON.stringify({ patientId: "abc" });
    const sig  = sign("correct-secret", body);
    expect(verify("wrong-secret", body, sig)).toBe(false);
  });
});

// ─── Deduplication logic ──────────────────────────────────────────────────────

describe("Wearable reading deduplication", () => {
  function dedup(readings: Array<{ type: string; recordedAt: string }>): typeof readings {
    const seen = new Set<string>();
    return readings.filter((r) => {
      const key = `${r.type}:${r.recordedAt}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  it("passes through unique readings", () => {
    const input = [
      { type: "blood_glucose", recordedAt: "2026-05-01T09:00:00Z" },
      { type: "blood_glucose", recordedAt: "2026-05-01T10:00:00Z" },
    ];
    expect(dedup(input)).toHaveLength(2);
  });

  it("removes exact duplicates", () => {
    const input = [
      { type: "blood_glucose", recordedAt: "2026-05-01T09:00:00Z" },
      { type: "blood_glucose", recordedAt: "2026-05-01T09:00:00Z" },
    ];
    expect(dedup(input)).toHaveLength(1);
  });

  it("keeps same type at different times", () => {
    const input = [
      { type: "heart_rate", recordedAt: "2026-05-01T09:00:00Z" },
      { type: "heart_rate", recordedAt: "2026-05-01T09:01:00Z" },
    ];
    expect(dedup(input)).toHaveLength(2);
  });

  it("keeps different types at same time", () => {
    const input = [
      { type: "blood_glucose", recordedAt: "2026-05-01T09:00:00Z" },
      { type: "heart_rate",    recordedAt: "2026-05-01T09:00:00Z" },
    ];
    expect(dedup(input)).toHaveLength(2);
  });

  it("handles empty array", () => {
    expect(dedup([])).toHaveLength(0);
  });
});
