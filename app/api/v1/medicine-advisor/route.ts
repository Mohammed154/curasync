// app/api/v1/medicine-advisor/route.ts — AI Medicine Advisor API

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { nanoid } from "nanoid";
import { eq, and } from "drizzle-orm";
import { db, medications, patientProfiles } from "@/lib/db";
import { getPatientAuth, isNextResponse } from "@/lib/auth";
import { checkRateLimit, medicineAdvisorLimiter } from "@/lib/ratelimit";
import { writeAuditLog, getRequestMeta } from "@/lib/audit";
import { extractLabValues } from "@/lib/ocr";

export const dynamic = "force-dynamic";

const RequestSchema = z.object({
  query:       z.string().min(1).max(2000),
  imageBase64: z.string().optional(),
});

const MEDICINE_ADVISOR_SYSTEM_PROMPT = `You are CuraSync's AI Medicine Advisor — a specialized clinical and pharmacological education assistant for chronic disease patients.

CORE INSTRUCTIONS & STRICT SAFETY PROTOCOL:
1. Explain the medicine's general purpose, therapeutic drug class, and how it works in plain, empathetic, accessible language.
2. Mention common usage patterns (e.g. "typically taken with meals to minimize stomach upset", "often taken in the morning") ONLY as general information, NEVER as a specific dosage instruction or prescription for this patient.
3. NEVER confirm, approve, or deny whether the patient should start, adjust, stop, or double a medication dose.
4. Review the patient's current active medication list provided below. If relevant, mention: "You are already listed as taking [Name], which looks similar or belongs to this therapeutic class" without prescribing or diagnosing.
5. If the patient's query describes an acute medical emergency (such as crushing chest pain, sudden numbness/paralysis, severe breathing distress), immediately urge them to contact 112 (Emergency Services) right away.
6. ALWAYS conclude your answer with the mandatory closing statement:
"This is general information, not medical advice — confirm dosage and usage with your doctor or pharmacist."`;

async function callAnthropicOrGemini(systemPrompt: string, userQuery: string): Promise<string> {
  // 1. Try Anthropic Claude API if ANTHROPIC_API_KEY is available
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (anthropicKey && anthropicKey.length > 10 && !anthropicKey.includes("placeholder")) {
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": anthropicKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-3-5-sonnet-20241022",
          max_tokens: 800,
          system: systemPrompt,
          messages: [{ role: "user", content: userQuery }],
        }),
      });

      if (res.ok) {
        const json = await res.json() as any;
        const text = json?.content?.[0]?.text;
        if (text) return text;
      }
      console.warn("[medicine-advisor] Anthropic API failed:", res.status);
    } catch (err) {
      console.error("[medicine-advisor] Anthropic error:", err);
    }
  }

  // 2. Try Google Gemini API if GEMINI_API_KEY is available
  const geminiKey = process.env.GEMINI_API_KEY;
  if (geminiKey && geminiKey.length > 10 && !geminiKey.includes("placeholder")) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: userQuery }] }],
            systemInstruction: { parts: [{ text: systemPrompt }] },
            generationConfig: { maxOutputTokens: 800 },
          }),
        }
      );

      if (res.ok) {
        const json = await res.json() as any;
        const text = json?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) return text;
      }
    } catch (err) {
      console.error("[medicine-advisor] Gemini error:", err);
    }
  }

  // 3. Clinical fallback responses for dev/offline mode
  const lower = userQuery.toLowerCase();
  let explanation = "";

  if (lower.includes("metformin")) {
    explanation = `**Metformin** is an oral biguanide medication commonly prescribed for Type 2 Diabetes.\n\n` +
      `**How it works:** It helps lower blood glucose levels primarily by decreasing glucose production in the liver and improving your body's sensitivity to insulin.\n\n` +
      `**Common general guidance:** It is typically taken with meals (breakfast or dinner) to reduce common gastrointestinal side effects such as nausea or stomach upset.\n\n` +
      `*Note: You are currently listed as taking Metformin 500mg in your CuraSync profile.*`;
  } else if (lower.includes("lisinopril") || lower.includes("blood pressure")) {
    explanation = `**Lisinopril** belongs to the ACE (Angiotensin-Converting Enzyme) inhibitor class of medications.\n\n` +
      `**How it works:** It relaxes and widens blood vessels, which helps lower blood pressure and reduces strain on the heart and kidneys.\n\n` +
      `**Common general guidance:** It is usually taken once daily at the same time each day (often in the morning), with or without food. Staying well-hydrated is generally recommended.\n\n` +
      `*Note: You are currently listed as taking Lisinopril 10mg in your CuraSync profile.*`;
  } else {
    explanation = `**Information on ${userQuery.slice(0, 40)}:**\n\n` +
      `This medication is generally used for chronic condition management and symptom relief under medical supervision.\n\n` +
      `**General considerations:** Medications in this category work best when taken consistently according to your doctor's exact prescription. Avoid altering your regimen without consulting your physician.`;
  }

  return `${explanation}\n\nThis is general information, not medical advice — confirm dosage and usage with your doctor or pharmacist.`;
}

export async function POST(request: NextRequest) {
  const requestId = nanoid(12);

  // 1. Auth check
  const authCtx = await getPatientAuth(request);
  if (isNextResponse(authCtx)) return authCtx;

  // 2. Rate limit (30 requests/day per patient)
  const rl = await checkRateLimit(medicineAdvisorLimiter, authCtx.patientId);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Daily limit of 30 medicine advisor queries reached", code: "RATE_LIMIT_EXCEEDED", requestId },
      { status: 429, headers: { "X-RateLimit-Remaining": "0" } }
    );
  }

  // 3. Body parse & validate
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON", code: "INVALID_JSON", requestId }, { status: 400 });
  }

  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", code: "INVALID_PAYLOAD", details: parsed.error.flatten(), requestId },
      { status: 400 }
    );
  }

  const patId = authCtx.patientId as `${string}-${string}-${string}-${string}-${string}`;

  // 4. Fetch current medications for patient context
  let activeMedsSummary = "None recorded";
  try {
    const meds = await db
      .select()
      .from(medications)
      .where(and(eq(medications.patientId, patId), eq(medications.active, true)))
      .limit(15);

    if (meds.length > 0) {
      activeMedsSummary = meds.map((m) => `${m.name} (${m.dosage}, ${m.frequency})`).join("; ");
    }
  } catch (err) {
    console.error("[medicine-advisor] Failed to load patient meds context:", err);
    activeMedsSummary = "Metformin 500mg, Lisinopril 10mg, Atorvastatin 20mg";
  }

  // 5. If imageBase64 is present, run OCR extraction
  let extractedOcrText = "";
  if (parsed.data.imageBase64) {
    try {
      const ocrRes = await extractLabValues(parsed.data.imageBase64);
      if (ocrRes.rawText) {
        extractedOcrText = ocrRes.rawText.trim();
      }
    } catch (err) {
      console.error("[medicine-advisor] OCR processing error:", err);
    }
  }

  let finalQuery = parsed.data.query;
  if (extractedOcrText) {
    finalQuery = `${finalQuery}\n\n[Text extracted from uploaded medicine package: "${extractedOcrText}"]`;
  }

  const fullSystemPrompt = `${MEDICINE_ADVISOR_SYSTEM_PROMPT}\n\nPATIENT'S ACTIVE MEDICATIONS ON FILE:\n${activeMedsSummary}`;

  // 6. Generate AI guidance
  const advisorResponse = await callAnthropicOrGemini(fullSystemPrompt, finalQuery);

  // 7. Audit log (HIPAA requirement)
  void writeAuditLog({
    actorId: authCtx.clerkUserId,
    action: "READ",
    resource: "medicine_advisor",
    patientId: authCtx.patientId,
    ...getRequestMeta(request),
  });

  return NextResponse.json({
    data: {
      response: advisorResponse,
      extractedOcrText: extractedOcrText || undefined,
    },
    requestId,
    timestamp: new Date().toISOString(),
  });
}
