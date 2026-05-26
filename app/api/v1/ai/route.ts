// app/api/v1/ai/route.ts
// Server-side proxy for the AI Doctor feature.
// Keeps ANTHROPIC_API_KEY on the server — never exposed to the browser.
// Streams the Claude response back to the client as SSE.

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { nanoid } from "nanoid";
import { getPatientAuth, isNextResponse } from "@/lib/auth";
import { checkRateLimit, aiLimiter } from "@/lib/ratelimit";
import { db, patientProfiles, readings, medications } from "@/lib/db";
import { eq, desc } from "drizzle-orm";

const MessageSchema = z.object({
  role:    z.enum(["user", "assistant"]),
  content: z.string().min(1).max(4000),
});

const RequestSchema = z.object({
  messages: z.array(MessageSchema).min(1).max(50),
});

// Build patient context from real DB data
async function buildPatientContext(patientId: string): Promise<string> {
  const patId = patientId as `${string}-${string}-${string}-${string}-${string}`;

  const [patient, latestReadings, activeMeds] = await Promise.all([
    db.select().from(patientProfiles).where(eq(patientProfiles.id, patId)).limit(1),
    db.select().from(readings).where(eq(readings.patientId, patId)).orderBy(desc(readings.recordedAt)).limit(10),
    db.select().from(medications).where(eq(medications.patientId, patId)).limit(20),
  ]);

  const p = patient[0];
  if (!p) return "Patient data unavailable.";

  const age = new Date().getFullYear() - new Date(p.dateOfBirth ?? "1970").getFullYear();
  const readingSummary = latestReadings
    .map((r) => `${r.type}: ${r.value} ${r.unit} (${new Date(r.recordedAt).toLocaleDateString()})`)
    .join(", ");
  const medSummary = activeMeds.map((m) => `${m.name} ${m.dosage} ${m.frequency}`).join(", ");

  return `Patient: ${p.name}, Age: ${age}.
Conditions: ${p.conditions.join(", ")}.
Recent readings: ${readingSummary || "none logged"}.
Medications: ${medSummary || "none recorded"}.`;
}

const SYSTEM_PROMPT_BASE = `You are CuraSync's AI health assistant — a knowledgeable, empathetic health companion for patients managing chronic diseases.

STRICT RULES:
- You NEVER diagnose conditions or prescribe medications.
- You CAN explain what readings mean, describe conditions in plain language, and suggest questions for their doctor.
- Keep responses concise (under 150 words) and warm.
- If the patient describes an emergency, immediately direct them to call 112.
- Do not reproduce or reference any previous session's conversation.`;

export async function POST(request: NextRequest) {
  const requestId = nanoid(12);

  // Auth
  const authCtx = await getPatientAuth(request);
  if (isNextResponse(authCtx)) return authCtx;

  // Rate limit: 100 AI requests per user per hour
  const rl = await checkRateLimit(aiLimiter, authCtx.clerkUserId);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Hourly AI request limit reached (100/hr)", code: "RATE_LIMIT_EXCEEDED", requestId },
      { status: 429, headers: { "X-RateLimit-Remaining": "0" } }
    );
  }

  // Parse body
  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON", code: "INVALID_JSON", requestId }, { status: 400 });
  }

  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", code: "INVALID_PAYLOAD", requestId }, { status: 400 });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "AI service not configured", code: "SERVICE_UNAVAILABLE", requestId },
      { status: 503 }
    );
  }

  // Build patient context from real DB
  const patientContext = await buildPatientContext(authCtx.patientId);
  const systemPrompt = `${SYSTEM_PROMPT_BASE}\n\nPATIENT CONTEXT:\n${patientContext}`;

  // Stream from Anthropic
  const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type":         "application/json",
      "x-api-key":            process.env.ANTHROPIC_API_KEY,
      "anthropic-version":    "2023-06-01",
      "anthropic-beta":       "messages-2023-12-15",
    },
    body: JSON.stringify({
      model:      "claude-sonnet-4-20250514",
      max_tokens: 1000,
      system:     systemPrompt,
      stream:     true,
      messages:   parsed.data.messages,
    }),
  });

  if (!anthropicRes.ok) {
    const errText = await anthropicRes.text();
    console.error("[ai] Anthropic error:", errText);
    return NextResponse.json({ error: "AI service error", code: "AI_ERROR", requestId }, { status: 502 });
  }

  // Pipe the SSE stream directly to the client
  return new NextResponse(anthropicRes.body, {
    status: 200,
    headers: {
      "Content-Type":      "text/event-stream",
      "Cache-Control":     "no-cache",
      "X-Request-Id":      requestId,
      "X-RateLimit-Remaining": String(rl.remaining),
    },
  });
}
