// app/api/v1/sync/route.ts — wearable webhook, signature-verified, real DB

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { nanoid } from "nanoid";
import { db, readings, alertEvents } from "@/lib/db";
import { evaluateReading } from "@/lib/alerts";
import { createHmac, timingSafeEqual } from "crypto";

const SyncReadingSchema = z.object({
  type: z.enum([
    "blood_glucose","blood_pressure_systolic","blood_pressure_diastolic",
    "heart_rate","hrv","spo2","weight","steps","sleep_hours",
    "body_temp","peak_flow","hba1c","egfr","cholesterol_ldl","cholesterol_hdl",
  ]),
  value:      z.number().finite(),
  unit:       z.string().max(20),
  recordedAt: z.string().datetime(),
});

const SyncPayloadSchema = z.object({
  patientId: z.string().uuid(),
  source:    z.enum(["apple_health","fitbit","garmin","ble"]),
  deviceId:  z.string().optional(),
  readings:  z.array(SyncReadingSchema).min(1).max(1000),
});

// Verify HMAC-SHA256 webhook signature
async function verifySignature(request: NextRequest, body: string): Promise<boolean> {
  const secret = process.env.WEBHOOK_SECRET;
  if (!secret) return process.env.NODE_ENV !== "production"; // allow in dev
  const sig = request.headers.get("x-webhook-signature");
  if (!sig) return false;
  const expected = createHmac("sha256", secret).update(body).digest("hex");
  try {
    return timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
  } catch { return false; }
}

export async function POST(request: NextRequest) {
  const requestId = nanoid(12);
  const rawBody = await request.text();

  if (!(await verifySignature(request, rawBody))) {
    return NextResponse.json({ error: "Invalid webhook signature", code: "INVALID_SIGNATURE", requestId }, { status: 401 });
  }

  let body: unknown;
  try { body = JSON.parse(rawBody); } catch {
    return NextResponse.json({ error: "Invalid JSON", code: "INVALID_JSON", requestId }, { status: 400 });
  }

  const parsed = SyncPayloadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", code: "INVALID_PAYLOAD", details: parsed.error.flatten(), requestId }, { status: 400 });
  }

  const { patientId, source, readings: incomingReadings } = parsed.data;
  const patId = patientId as `${string}-${string}-${string}-${string}-${string}`;

  // Deduplicate by type + recordedAt
  const seen = new Set<string>();
  const deduped = incomingReadings.filter((r) => {
    const key = `${r.type}:${r.recordedAt}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // Batch insert readings
  if (deduped.length > 0) {
    await db.insert(readings).values(
      deduped.map((r) => ({
        patientId: patId,
        type:      r.type,
        value:     String(r.value),
        unit:      r.unit,
        source,
        recordedAt: new Date(r.recordedAt),
      }))
    ).onConflictDoNothing();
  }

  // Evaluate alerts for every reading
  const allAlerts = deduped.flatMap((r) => evaluateReading(patientId, r.type, r.value));
  if (allAlerts.length > 0) {
    await db.insert(alertEvents).values(
      allAlerts.map((a) => ({
        patientId:   patId,
        severity:    a.severity,
        status:      "active" as const,
        type:        a.type,
        message:     a.message,
        value:       a.value !== undefined ? String(a.value) : undefined,
        threshold:   a.threshold !== undefined ? String(a.threshold) : undefined,
        triggeredAt: new Date(a.triggeredAt),
      }))
    );
  }

  return NextResponse.json(
    {
      data: {
        accepted:          deduped.length,
        duplicatesDropped: incomingReadings.length - deduped.length,
        alertsTriggered:   allAlerts.length,
        source,
      },
      requestId,
      timestamp: new Date().toISOString(),
    },
    {
      status: 201,
      headers: {
        "X-Request-Id":        requestId,
        "X-Alerts-Triggered":  String(allAlerts.length),
        "X-Readings-Accepted": String(deduped.length),
      },
    }
  );
}

export async function GET(_request: NextRequest) {
  return NextResponse.json({
    data: { status: "healthy", supportedSources: ["apple_health","fitbit","garmin","ble"], maxBatchSize: 1000 },
    timestamp: new Date().toISOString(),
  });
}
