"use client";

import React, { useState, useRef, useEffect } from "react";
import AppShell from "@/components/layout/AppShell";
import { Send, Lock, Stethoscope, User } from "lucide-react";
import { clsx } from "clsx";
import { format } from "date-fns";

interface ChatMessage {
  id: string;
  senderId: "patient" | "provider";
  senderName: string;
  content: string;
  timestamp: Date;
  read: boolean;
}

const MOCK_THREAD: ChatMessage[] = [
  { id: "m1", senderId: "provider", senderName: "Dr. Priya Sharma", content: "Good morning Arjun! I've reviewed your latest readings from this week. Your blood glucose is tracking well — the 142 mg/dL fasting reading is within acceptable range for now.", timestamp: new Date(Date.now() - 1000*60*60*24*2), read: true },
  { id: "m2", senderId: "provider", senderName: "Dr. Priya Sharma", content: "However, I'm noticing your BP has been running a little high this week (138/88). Please continue Amlodipine and avoid salty foods. Let's monitor for another week before adjusting doses.", timestamp: new Date(Date.now() - 1000*60*60*24*2 + 1000*30), read: true },
  { id: "m3", senderId: "patient", senderName: "Arjun Mehta", content: "Thank you Dr. Priya. I've been more stressed than usual this week — could that be affecting the BP?", timestamp: new Date(Date.now() - 1000*60*60*24*1), read: true },
  { id: "m4", senderId: "provider", senderName: "Dr. Priya Sharma", content: "Absolutely — stress is a significant contributor to BP elevation. Please try 10-15 minutes of deep breathing or light walking in the evening. Also, are you getting 7+ hours of sleep?", timestamp: new Date(Date.now() - 1000*60*60*20), read: true },
  { id: "m5", senderId: "patient", senderName: "Arjun Mehta", content: "Sleep has been 6 hours or less lately. I'll try to improve that.", timestamp: new Date(Date.now() - 1000*60*60*18), read: true },
  { id: "m6", senderId: "provider", senderName: "Dr. Priya Sharma", content: "That explains a lot. Poor sleep raises cortisol which elevates both glucose and BP. Aim for 7-8 hours and check in with your next readings in 3 days. See you at our appointment on the 15th!", timestamp: new Date(Date.now() - 1000*60*60*4), read: false },
];

export default function MessagesPage() {
  const [messages, setMessages] = useState<ChatMessage[]>(MOCK_THREAD);
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = () => {
    if (!input.trim()) return;
    const msg: ChatMessage = {
      id: crypto.randomUUID(),
      senderId: "patient",
      senderName: "Arjun Mehta",
      content: input.trim(),
      timestamp: new Date(),
      read: false,
    };
    setMessages((prev) => [...prev, msg]);
    setInput("");
  };

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto flex flex-col" style={{ height: "calc(100vh - 60px)" }}>
        {/* Thread header */}
        <div className="px-4 lg:px-6 py-4 bg-bg-card border-b border-divider flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full gradient-violet flex items-center justify-center flex-shrink-0">
              <Stethoscope size={18} className="text-white" aria-hidden="true" />
            </div>
            <div>
              <h1 className="font-semibold text-title-md text-text-primary">Dr. Priya Sharma</h1>
              <p className="text-xs text-text-secondary">Internal Medicine · Mumbai Central Hospital</p>
            </div>
            <div className="ml-auto flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-status-green-bg">
              <span className="w-1.5 h-1.5 rounded-full bg-status-green" aria-hidden="true" />
              <span className="text-xs font-medium text-status-green">Active</span>
            </div>
          </div>
          {/* Encryption notice */}
          <div className="flex items-center gap-1.5 mt-3 text-xs text-text-tertiary">
            <Lock size={11} aria-hidden="true" />
            <span>End-to-end encrypted · HIPAA compliant · Only you and your care team can read this</span>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 lg:px-6 py-4 space-y-4">
          {messages.map((msg, i) => {
            const isPatient = msg.senderId === "patient";
            const showDate = i === 0 || format(messages[i-1]!.timestamp, "MMM d") !== format(msg.timestamp, "MMM d");
            return (
              <React.Fragment key={msg.id}>
                {showDate && (
                  <div className="flex items-center gap-3 my-2">
                    <div className="flex-1 h-px bg-divider" />
                    <span className="text-xs text-text-tertiary">{format(msg.timestamp, "EEEE, MMM d")}</span>
                    <div className="flex-1 h-px bg-divider" />
                  </div>
                )}
                <div className={clsx("flex gap-2.5", isPatient ? "justify-end" : "justify-start")}>
                  {!isPatient && (
                    <div className="w-8 h-8 rounded-full gradient-violet flex items-center justify-center flex-shrink-0 mt-1" aria-hidden="true">
                      <Stethoscope size={14} className="text-white" />
                    </div>
                  )}
                  <div className={clsx("max-w-[75%] space-y-1", isPatient && "items-end flex flex-col")}>
                    {!isPatient && (
                      <p className="text-xs font-semibold text-text-tertiary">{msg.senderName}</p>
                    )}
                    <div
                      className={clsx(
                        "px-4 py-3 rounded-2xl text-sm leading-relaxed",
                        isPatient
                          ? "bg-accent-violet text-white rounded-tr-sm"
                          : "bg-bg-card text-text-primary border border-divider rounded-tl-sm shadow-card"
                      )}
                    >
                      {msg.content}
                    </div>
                    <p className="text-xs text-text-tertiary">{format(msg.timestamp, "h:mm a")}</p>
                  </div>
                  {isPatient && (
                    <div className="w-8 h-8 rounded-full bg-bg-lavender flex items-center justify-center flex-shrink-0 mt-1" aria-hidden="true">
                      <User size={14} className="text-accent-violet" />
                    </div>
                  )}
                </div>
              </React.Fragment>
            );
          })}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="px-4 lg:px-6 py-4 bg-bg-card border-t border-divider flex-shrink-0">
          <div className="flex items-end gap-3">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }}}
              placeholder="Message Dr. Priya…"
              rows={1}
              className="flex-1 px-4 py-3 rounded-xl border border-divider bg-bg-light text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent-lavender/40 focus:border-accent-violet resize-none transition-all max-h-28"
              aria-label="Compose message"
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim()}
              className={clsx(
                "w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 transition-all",
                input.trim() ? "gradient-violet shadow-card hover:opacity-90" : "bg-divider cursor-not-allowed"
              )}
              aria-label="Send message"
            >
              <Send size={16} className={input.trim() ? "text-white" : "text-text-tertiary"} />
            </button>
          </div>
          <p className="text-xs text-text-tertiary text-center mt-2">
            Messages are reviewed within 24 hours. For emergencies call 112.
          </p>
        </div>
      </div>
    </AppShell>
  );
}
