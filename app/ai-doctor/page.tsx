"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { ArrowLeft, Send, Mic, AlertTriangle } from "lucide-react";
import { clsx } from "clsx";
import { getMockDashboardData } from "@/lib/mock-data";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

const PATIENT_CONTEXT = (() => {
  const d = getMockDashboardData();
  return `Patient: ${d.patient.name}, Age: ${2026 - parseInt(d.patient.dateOfBirth.slice(0,4))}.
Conditions: ${d.patient.conditions.join(", ")}.
Latest readings: Blood Glucose ${d.latestReadings.bloodGlucose} mg/dL, BP ${d.latestReadings.systolic}/${d.latestReadings.diastolic} mmHg, HR ${d.latestReadings.heartRate} bpm, SpO2 ${d.latestReadings.spo2}%.
Medications: ${d.todayMedications.map(m => `${m.name} ${m.dosage}`).join(", ")}.
Weekly adherence: ${d.weeklyAdherence}%.`;
})();

const SYSTEM_PROMPT = `You are CuraSync's AI health assistant — a knowledgeable, empathetic health companion for patients managing chronic diseases. You have access to the patient's health context below.

PATIENT CONTEXT:
${PATIENT_CONTEXT}

STRICT RULES:
- You NEVER diagnose conditions or prescribe medications. Always recommend consulting their doctor for medical decisions.
- You CAN explain what readings mean, describe conditions in plain language, suggest questions to ask their doctor, and summarise health trends.
- Keep responses concise and warm — this patient may be unwell or anxious.
- Always use plain English, not medical jargon, unless explaining a term.
- If the patient seems distressed or describes an emergency, immediately direct them to call emergency services.
- Do not store or reference any conversation history beyond this session.`;

const SUGGESTED_PROMPTS = [
  "What does my blood glucose of 142 mg/dL mean?",
  "Why is my blood pressure reading concerning?",
  "What questions should I ask my doctor about my CKD?",
  "Explain my medications and what they do",
  "How is my adherence this week?",
];

export default function AiDoctorPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [requestCount, setRequestCount] = useState(0);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const RATE_LIMIT = 100;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || streaming) return;
    if (requestCount >= RATE_LIMIT) {
      setError("You've reached the hourly limit of 100 AI requests. Please try again later.");
      return;
    }

    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: trimmed,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setStreaming(true);
    setError(null);
    setRequestCount((c) => c + 1);

    const assistantId = crypto.randomUUID();
    setMessages((prev) => [
      ...prev,
      { id: assistantId, role: "assistant", content: "", timestamp: new Date() },
    ]);

    abortRef.current = new AbortController();

    try {
      const history = [...messages, userMsg].map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await fetch("/api/v1/ai", {
        method: "POST",
        signal: abortRef.current.signal,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          system: SYSTEM_PROMPT,
          stream: true,
          messages: history,
        }),
      });

      if (!res.ok) throw new Error(`API error ${res.status}`);

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No response body");
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6);
          if (data === "[DONE]") continue;
          try {
            const parsed = JSON.parse(data) as {
              type: string;
              delta?: { type: string; text?: string };
            };
            if (parsed.type === "content_block_delta" && parsed.delta?.text) {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId
                    ? { ...m, content: m.content + (parsed.delta?.text ?? "") }
                    : m
                )
              );
            }
          } catch {
            // skip malformed SSE line
          }
        }
      }
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      setError("Something went wrong. Please try again.");
      setMessages((prev) => prev.filter((m) => m.id !== assistantId));
    } finally {
      setStreaming(false);
    }
  }, [messages, streaming, requestCount]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  return (
    <div
      className="fixed inset-0 flex flex-col"
      style={{ background: "#0A0A0A" }}
    >
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex items-center px-5 pt-12 pb-4 flex-shrink-0">
        <Link
          href="/dashboard"
          className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors"
          aria-label="Back to dashboard"
        >
          <ArrowLeft size={20} className="text-white" />
        </Link>
        <div className="flex-1 text-center">
          <p className="text-white/40 text-xs font-medium uppercase tracking-widest">
            AI Health Assistant
          </p>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/10">
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" aria-hidden="true" />
          <span className="text-xs font-medium text-white/70">Claude</span>
        </div>
      </div>

      {/* ── Hero / Empty state ──────────────────────────────────────────── */}
      {messages.length === 0 && (
        <div className="flex-1 flex flex-col items-center justify-center px-6 pb-8">
          {/* Orb */}
          <div
            className="relative mb-8"
            aria-hidden="true"
            style={{ width: 200, height: 200 }}
          >
            {/* Outer glow */}
            <div
              className="absolute inset-0 rounded-full"
              style={{
                background: "radial-gradient(circle, rgba(108,92,231,0.3) 0%, transparent 70%)",
                animation: "orbBreath 6s ease-in-out infinite",
              }}
            />
            {/* Main orb */}
            <div
              className="absolute inset-6 rounded-full"
              style={{
                background: "conic-gradient(from 0deg, #1a1a2e, #6c5ce7, #a29bfe, #e84393, #00cec9, #1a1a2e)",
                animation: "orbSpin 12s linear infinite",
                filter: "blur(0px)",
              }}
            />
            {/* Inner shine */}
            <div
              className="absolute inset-8 rounded-full"
              style={{
                background: "radial-gradient(circle at 35% 35%, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0.05) 50%, transparent 70%)",
              }}
            />
            {/* Center */}
            <div
              className="absolute inset-10 rounded-full"
              style={{ background: "rgba(10,10,10,0.6)", backdropFilter: "blur(8px)" }}
            />
          </div>

          <h1 className="text-white font-bold text-3xl text-center mb-2 leading-tight">
            Hey, Arjun 👋<br />
            <span className="text-white/70 font-normal text-xl">How can I help you?</span>
          </h1>
          <p className="text-white/40 text-sm text-center max-w-xs mb-8">
            Ask me about your readings, conditions, medications, or what to discuss with your doctor.
          </p>

          {/* Safety disclaimer */}
          <div className="flex items-start gap-2 px-4 py-3 rounded-xl bg-white/5 border border-white/10 mb-6 max-w-sm">
            <AlertTriangle size={14} className="text-yellow-400 flex-shrink-0 mt-0.5" aria-hidden="true" />
            <p className="text-white/50 text-xs leading-relaxed">
              I provide health information only — not medical advice, diagnosis, or prescriptions. Always consult your doctor for medical decisions.
            </p>
          </div>

          {/* Suggested prompts */}
          <div className="flex flex-col gap-2 w-full max-w-sm">
            {SUGGESTED_PROMPTS.map((p) => (
              <button
                key={p}
                onClick={() => sendMessage(p)}
                className="text-left px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white/70 text-sm hover:bg-white/10 hover:text-white transition-all"
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Messages ────────────────────────────────────────────────────── */}
      {messages.length > 0 && (
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={clsx(
                "flex",
                msg.role === "user" ? "justify-end" : "justify-start"
              )}
            >
              {msg.role === "assistant" && (
                <div
                  className="w-7 h-7 rounded-full flex-shrink-0 mr-2 mt-1"
                  style={{
                    background: "conic-gradient(from 0deg, #6c5ce7, #a29bfe, #e84393, #6c5ce7)",
                  }}
                  aria-hidden="true"
                />
              )}
              <div
                className={clsx(
                  "max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed",
                  msg.role === "user"
                    ? "bg-accent-violet text-white rounded-tr-sm"
                    : "bg-white/8 text-white/90 rounded-tl-sm border border-white/10"
                )}
                style={msg.role === "assistant" ? { background: "rgba(255,255,255,0.06)" } : undefined}
              >
                {msg.content || (
                  <span className="flex gap-1" aria-label="AI is thinking">
                    {[0, 1, 2].map((i) => (
                      <span
                        key={i}
                        className="w-1.5 h-1.5 rounded-full bg-white/40"
                        style={{ animation: `dotPulse 1.2s ${i * 0.2}s ease-in-out infinite` }}
                      />
                    ))}
                  </span>
                )}
              </div>
            </div>
          ))}

          {error && (
            <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 mx-2">
              <AlertTriangle size={14} className="text-red-400" aria-hidden="true" />
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      )}

      {/* ── Input bar ───────────────────────────────────────────────────── */}
      <div className="px-4 pb-8 pt-3 flex-shrink-0 border-t border-white/8">
        <div
          className="flex items-end gap-2 px-4 py-3 rounded-full border border-white/15"
          style={{ background: "rgba(28,28,30,0.9)" }}
        >
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Start typing your health question…"
            rows={1}
            disabled={streaming}
            className="flex-1 bg-transparent text-white placeholder:text-white/30 text-sm resize-none outline-none leading-relaxed max-h-32 overflow-y-auto"
            style={{ scrollbarWidth: "none" }}
            aria-label="Message AI Doctor"
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || streaming}
            className={clsx(
              "w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition-all",
              input.trim() && !streaming
                ? "bg-accent-violet hover:opacity-90 shadow-lg"
                : "bg-white/10 cursor-not-allowed"
            )}
            aria-label="Send message"
          >
            <Send size={15} className={input.trim() && !streaming ? "text-white" : "text-white/30"} />
          </button>
        </div>
        <p className="text-center text-white/20 text-xs mt-2">
          {requestCount}/{RATE_LIMIT} requests used this hour
        </p>
      </div>

      {/* ── Keyframe styles ─────────────────────────────────────────────── */}
      <style>{`
        @keyframes orbSpin   { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes orbBreath { 0%,100% { transform: scale(1); } 50% { transform: scale(1.06); } }
        @keyframes dotPulse  { 0%,80%,100% { transform: scale(0.6); opacity: 0.4; } 40% { transform: scale(1); opacity: 1; } }
      `}</style>
    </div>
  );
}
