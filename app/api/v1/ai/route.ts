// app/api/v1/ai/route.ts
// Server-side proxy for the AI Doctor feature.
// Keeps GEMINI_API_KEY on the server — never exposed to the browser.
// Streams the Gemini response back to the client as SSE (formatted to match expected schema).

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

  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json(
      { error: "AI service not configured", code: "SERVICE_UNAVAILABLE", requestId },
      { status: 503 }
    );
  }

  // Build patient context from real DB
  const patientContext = await buildPatientContext(authCtx.patientId);
  const systemPrompt = `${SYSTEM_PROMPT_BASE}\n\nPATIENT CONTEXT:\n${patientContext}`;

  // Map incoming messages to Gemini structure (roles are user/model)
  const geminiMessages = parsed.data.messages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  // Stream from Gemini API using alt=sse for standard EventSource format
  const geminiRes = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:streamGenerateContent?key=${process.env.GEMINI_API_KEY}&alt=sse`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: geminiMessages,
        systemInstruction: {
          parts: [{ text: systemPrompt }],
        },
        generationConfig: {
          maxOutputTokens: 1000,
        },
      }),
    }
  );

  if (!geminiRes.ok) {
    const errText = await geminiRes.text();
    console.error("[ai] Gemini API error:", errText);
    return NextResponse.json({ error: "AI service error", code: "AI_ERROR", requestId }, { status: 502 });
  }

  if (!geminiRes.body) {
    console.error("[ai] Gemini response body is null");
    return NextResponse.json({ error: "AI service response body error", code: "AI_ERROR", requestId }, { status: 502 });
  }

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  // Create a transform stream to format Gemini's chunk output into expected Anthropic client format
  const transformStream = new ReadableStream({
    async start(controller) {
      const reader = geminiRes.body!.getReader();
      let buffer = "";

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;

            if (trimmed.startsWith("data: ")) {
              const dataStr = trimmed.slice(6);
              try {
                const parsedChunk = JSON.parse(dataStr);
                const text = parsedChunk.candidates?.[0]?.content?.parts?.[0]?.text;
                if (text) {
                  const clientEvent = {
                    type: "content_block_delta",
                    delta: {
                      type: "text_delta",
                      text: text,
                    },
                  };
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify(clientEvent)}\n\n`));
                }
              } catch (e) {
                // Ignore parse errors from partial / control events in the stream
              }
            }
          }
        }
      } catch (err) {
        console.error("[ai] Transform stream error:", err);
        controller.error(err);
      } finally {
        controller.close();
      }
    },
  });

  // Pipe the translated stream to the client
  return new NextResponse(transformStream, {
    status: 200,
    headers: {
      "Content-Type":      "text/event-stream",
      "Cache-Control":     "no-cache",
      "X-Request-Id":      requestId,
      "X-RateLimit-Remaining": String(rl.remaining),
    },
  });
}
