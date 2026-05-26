// app/api/v1/ocr/route.ts
// Accepts a base64-encoded image of a lab report, runs Google Cloud Vision OCR,
// returns structured biometric readings for the patient to confirm before saving.

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { nanoid } from "nanoid";
import { getPatientAuth, isNextResponse } from "@/lib/auth";
import { extractLabValues, isPlausibleReading } from "@/lib/ocr";

const OcrRequestSchema = z.object({
  imageBase64: z.string().min(100), // base64 encoded image
  mimeType:    z.enum(["image/jpeg", "image/png", "image/webp", "application/pdf"]),
});

export async function POST(request: NextRequest) {
  const requestId = nanoid(12);

  const authCtx = await getPatientAuth(request);
  if (isNextResponse(authCtx)) return authCtx;

  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON", code: "INVALID_JSON", requestId }, { status: 400 });
  }

  const parsed = OcrRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", code: "INVALID_PAYLOAD", details: parsed.error.flatten(), requestId }, { status: 400 });
  }

  // Run OCR
  const ocrResult = await extractLabValues(parsed.data.imageBase64);

  if (!ocrResult.success) {
    return NextResponse.json(
      { error: ocrResult.error ?? "OCR failed", code: "OCR_FAILED", requestId },
      { status: 422 }
    );
  }

  // Filter out implausible values
  const validReadings = ocrResult.readings.filter((r) =>
    isPlausibleReading(r.type, r.value)
  );

  return NextResponse.json(
    {
      data: {
        readings:   validReadings,   // confirmed, plausible values
        rawText:    ocrResult.rawText.slice(0, 2000), // truncate for response size
        pageCount:  ocrResult.pageCount,
        // Client should show these to the patient for confirmation
        // before POSTing to /api/v1/readings to save them
        requiresConfirmation: true,
      },
      requestId,
      timestamp: new Date().toISOString(),
    },
    { status: 200 }
  );
}
