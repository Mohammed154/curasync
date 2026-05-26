// lib/ocr.ts — Google Cloud Vision OCR for lab report photos (PRD §5.5)
// Install package when ready: npm install @google-cloud/vision --legacy-peer-deps
// Setup: Enable Vision API in GCP console, create service account, base64-encode key JSON

import type { BiometricType } from "@/types";

interface OcrReading {
  type:       BiometricType;
  value:      number;
  unit:       string;
  confidence: number;
  rawText:    string;
}

export interface OcrResult {
  success:    boolean;
  readings:   OcrReading[];
  rawText:    string;
  pageCount:  number;
  error?:     string;
}

// ── Regex patterns for common Indian lab report formats ───────────────────────
const LAB_PATTERNS: Array<{ type: BiometricType; patterns: RegExp[]; unit: string }> = [
  {
    type: "blood_glucose", unit: "mg/dL",
    patterns: [
      /(?:glucose|blood sugar|fasting glucose)[^\d]*(\d+(?:\.\d+)?)\s*mg\/dl/gi,
      /(?:rbs|fbs|ppbs)[^\d]*(\d+(?:\.\d+)?)/gi,
    ],
  },
  {
    type: "hba1c", unit: "%",
    patterns: [/(?:hba1c|glycated haemoglobin|glycosylated)[^\d]*(\d+(?:\.\d+)?)\s*%/gi],
  },
  {
    type: "egfr", unit: "mL/min/1.73m²",
    patterns: [/(?:egfr|gfr|estimated gfr)[^\d]*(\d+(?:\.\d+)?)/gi],
  },
  {
    type: "cholesterol_ldl", unit: "mg/dL",
    patterns: [/(?:ldl|low density)[^\d]*(\d+(?:\.\d+)?)\s*mg\/dl/gi],
  },
  {
    type: "cholesterol_hdl", unit: "mg/dL",
    patterns: [/(?:hdl|high density)[^\d]*(\d+(?:\.\d+)?)\s*mg\/dl/gi],
  },
];

function extractReadingsFromText(text: string): OcrReading[] {
  const results: OcrReading[] = [];
  const normalised = text.replace(/\s+/g, " ").toLowerCase();
  for (const { type, patterns, unit } of LAB_PATTERNS) {
    for (const pattern of patterns) {
      pattern.lastIndex = 0;
      const match = pattern.exec(normalised);
      if (match?.[1]) {
        const value = parseFloat(match[1]);
        if (!isNaN(value) && value > 0) {
          results.push({ type, value, unit, confidence: 0.85, rawText: match[0] });
          break;
        }
      }
    }
  }
  return results;
}

export async function extractLabValues(imageBase64: string): Promise<OcrResult> {
  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
    return { success: false, readings: [], rawText: "", pageCount: 0, error: "OCR service not configured" };
  }

  try {
    const credentialsJson = Buffer.from(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON, "base64").toString("utf-8");
    const credentials = JSON.parse(credentialsJson) as object;

    // Dynamic import — package is optional; install with: npm install @google-cloud/vision
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore — optional package
    const vision = await eval('import("@google-cloud/vision")').catch(() => null);
    if (!vision) return { success: false, readings: [], rawText: "", pageCount: 0, error: "@google-cloud/vision not installed" };

    const client = new vision.ImageAnnotatorClient({ credentials });
    const [result] = await client.documentTextDetection({
      image: { content: imageBase64 },
      imageContext: { languageHints: ["en", "hi"] },
    });

    const fullText: string = result?.fullTextAnnotation?.text ?? "";
    const pages: number = result?.fullTextAnnotation?.pages?.length ?? 0;

    if (!fullText) return { success: false, readings: [], rawText: "", pageCount: pages, error: "No text detected" };

    return { success: true, readings: extractReadingsFromText(fullText), rawText: fullText, pageCount: pages };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { success: false, readings: [], rawText: "", pageCount: 0, error: message };
  }
}

export function isPlausibleReading(type: BiometricType, value: number): boolean {
  const ranges: Partial<Record<BiometricType, [number, number]>> = {
    blood_glucose: [20, 800],
    hba1c: [3, 20],
    egfr: [1, 130],
    cholesterol_ldl: [20, 400],
    cholesterol_hdl: [10, 150],
  };
  const range = ranges[type];
  if (!range) return true;
  return value >= range[0] && value <= range[1];
}
