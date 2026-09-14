"use client";

import React, { useState, useRef } from "react";
import AppShell from "@/components/layout/AppShell";
import { Pill, Camera, Send, Sparkles, AlertTriangle, CheckCircle2, Shield, RefreshCw, X, Image as ImageIcon } from "lucide-react";
import { clsx } from "clsx";

interface AdvisorMessage {
  id: string;
  sender: "user" | "advisor";
  text: string;
  timestamp: Date;
  extractedOcr?: string;
  imagePreview?: string;
}

const SAMPLE_QUERIES = [
  "What is Metformin used for and when should it be taken?",
  "How does Lisinopril help with blood pressure?",
  "What are common considerations when taking Atorvastatin?",
  "Why is it important to take chronic medications with meals?",
];

export default function MedicineAdvisorPage() {
  const [messages, setMessages] = useState<AdvisorMessage[]>([
    {
      id: "welcome",
      sender: "advisor",
      text: "Hello Arjun! I'm your AI Medicine Advisor. You can ask me about any medication's purpose, common usage guidelines, or upload a photo of a medicine strip/box for explanation.\n\n*Note: I provide general drug education, not medical prescriptions.*",
      timestamp: new Date(),
    },
  ]);
  const [inputQuery, setInputQuery] = useState("");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      setSelectedImage(base64);
    };
    reader.readAsDataURL(file);
  };

  const handleSend = async (queryText = inputQuery) => {
    const trimmed = queryText.trim();
    if (!trimmed && !selectedImage) return;

    const userMsgId = crypto.randomUUID();
    const advisorMsgId = crypto.randomUUID();

    const newMsg: AdvisorMessage = {
      id: userMsgId,
      sender: "user",
      text: trimmed || "Analyzed uploaded medicine image",
      timestamp: new Date(),
      imagePreview: selectedImage ?? undefined,
    };

    setMessages((prev) => [...prev, newMsg]);
    setInputQuery("");
    const imgToSend = selectedImage ? selectedImage.split(",")[1] : undefined;
    setSelectedImage(null);
    setIsLoading(true);

    try {
      const res = await fetch("/api/v1/medicine-advisor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: trimmed || "Please explain this medication based on the packaging.",
          imageBase64: imgToSend,
        }),
      });

      if (res.ok) {
        const json = await res.json();
        const advisorMsg: AdvisorMessage = {
          id: advisorMsgId,
          sender: "advisor",
          text: json.data?.response || "Unable to retrieve advice at this moment.",
          timestamp: new Date(),
          extractedOcr: json.data?.extractedOcrText,
        };
        setMessages((prev) => [...prev, advisorMsg]);
      } else {
        const errorMsg: AdvisorMessage = {
          id: advisorMsgId,
          sender: "advisor",
          text: "I encountered an error retrieving this medication information. Please try again shortly.",
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, errorMsg]);
      }
    } catch (err) {
      console.error("Medicine advisor query error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto px-4 lg:px-6 py-6 space-y-6">
        
        {/* Header */}
        <div className="flex items-start justify-between gap-4 animate-fade-in">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-display text-text-primary leading-tight">
                AI Medicine Advisor
              </h1>
              <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold gradient-violet text-white">
                <Sparkles size={12} />
                Clinical AI
              </span>
            </div>
            <p className="text-body-md text-text-secondary mt-1">
              Plain-language guidance on purpose, class, and general medication considerations.
            </p>
          </div>
        </div>

        {/* Persistent Safety Disclaimer Banner */}
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-950 flex items-start gap-3 text-xs leading-relaxed card-enter">
          <AlertTriangle size={18} className="text-amber-700 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <strong className="font-bold block text-sm text-amber-950">Clinical Disclaimer & Patient Safety</strong>
            <p className="text-amber-900 font-medium leading-relaxed">
              This advisor provides general pharmacological education. It never confirms or prescribes dosages, nor does it replace your physician or pharmacist. For acute emergencies, call <strong className="text-amber-950 font-bold">112</strong> immediately.
            </p>
          </div>
        </div>

        {/* Quick Suggestion Prompts */}
        {messages.length <= 1 && (
          <div className="space-y-2">
            <p className="text-xs font-bold text-text-tertiary uppercase tracking-wider">Suggested Questions</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {SAMPLE_QUERIES.map((q) => (
                <button
                  key={q}
                  onClick={() => handleSend(q)}
                  className="p-3 text-left rounded-xl bg-bg-card border border-divider hover:border-accent-violet text-xs text-text-primary font-medium shadow-card transition-all"
                >
                  💡 {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Conversation Stream */}
        <div className="space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={clsx(
                "flex gap-3",
                msg.sender === "user" ? "justify-end" : "justify-start"
              )}
            >
              {msg.sender === "advisor" && (
                <div className="w-9 h-9 rounded-xl gradient-violet flex items-center justify-center text-white flex-shrink-0 shadow-sm mt-1">
                  <Pill size={18} />
                </div>
              )}

              <div
                className={clsx(
                  "max-w-[85%] rounded-2xl p-4 text-xs leading-relaxed shadow-card space-y-2",
                  msg.sender === "user"
                    ? "bg-accent-violet text-white rounded-tr-none"
                    : "bg-bg-card border border-divider text-text-primary rounded-tl-none"
                )}
              >
                {msg.imagePreview && (
                  <div className="mb-2 rounded-lg overflow-hidden border border-white/20 max-w-xs">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={msg.imagePreview} alt="Uploaded medicine strip" className="w-full h-auto" />
                  </div>
                )}

                {msg.extractedOcr && (
                  <div className="p-2 rounded-lg bg-bg-light text-[11px] font-mono text-text-tertiary border border-divider">
                    <strong>Detected packaging text:</strong> {msg.extractedOcr}
                  </div>
                )}

                <div className="whitespace-pre-line prose-xs">
                  {msg.text}
                </div>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex items-center gap-3 animate-pulse">
              <div className="w-9 h-9 rounded-xl gradient-violet flex items-center justify-center text-white">
                <RefreshCw size={16} className="animate-spin" />
              </div>
              <div className="bg-bg-card border border-divider rounded-2xl px-4 py-3 text-xs text-text-tertiary shadow-card">
                Reviewing pharmacological guidelines and patient profile…
              </div>
            </div>
          )}
        </div>

        {/* Input Bar */}
        <div className="bg-bg-card rounded-2xl p-3 border border-divider shadow-lg space-y-2">
          {selectedImage && (
            <div className="flex items-center justify-between p-2 rounded-xl bg-bg-light border border-divider">
              <div className="flex items-center gap-2 text-xs font-semibold text-text-primary">
                <ImageIcon size={16} className="text-accent-violet" />
                <span>Medicine photo attached</span>
              </div>
              <button
                onClick={() => setSelectedImage(null)}
                className="p-1 text-text-tertiary hover:text-text-primary"
              >
                <X size={14} />
              </button>
            </div>
          )}

          <div className="flex items-center gap-2">
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              className="hidden"
              onChange={handleImageUpload}
            />

            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-2.5 rounded-xl bg-bg-light hover:bg-bg-lavender text-text-secondary hover:text-accent-violet transition-colors"
              title="Upload photo of medicine packaging / strip"
            >
              <Camera size={18} />
            </button>

            <input
              type="text"
              placeholder="Ask about a medicine, symptom, or purpose..."
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !isLoading && handleSend()}
              className="flex-1 bg-transparent px-2 py-1 text-xs text-text-primary focus:outline-none placeholder:text-text-tertiary"
            />

            <button
              onClick={() => handleSend()}
              disabled={isLoading || (!inputQuery.trim() && !selectedImage)}
              className="p-2.5 rounded-xl gradient-violet text-white shadow-card hover:opacity-90 disabled:opacity-40 transition-opacity"
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
