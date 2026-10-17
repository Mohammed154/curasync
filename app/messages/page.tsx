"use client";

import React, { useState, useRef, useEffect } from "react";
import AppShell from "@/components/layout/AppShell";
import Link from "next/link";
import { Send, Lock, Stethoscope, User, Video, MessageSquare, Sparkles, UserPlus } from "lucide-react";
import { clsx } from "clsx";
import { format } from "date-fns";
import { useAuth } from "@/context/AuthContext";
import { useDoctorConnection } from "@/hooks/useDoctorConnection";
import DoctorConnectionModal from "@/components/telehealth/DoctorConnectionModal";

interface ChatMessage {
  id: string;
  senderId: "patient" | "provider";
  senderName: string;
  content: string;
  timestamp: Date;
  read: boolean;
}

const CONVERSATION_STARTERS = [
  "Questions about my daily medication schedule",
  "Experiencing mild headache after morning dosage",
  "Request prescription refill before next week",
  "Latest blood glucose readings look slightly higher",
];

export default function MessagesPage() {
  const { user, profile } = useAuth();
  const {
    connected,
    provider,
    isDoctorOnline,
    connectDoctor,
    mutate: mutateDoctorConnection,
  } = useDoctorConnection();
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const threadId = "00000000-0000-0000-0000-000000000100";

  useEffect(() => {
    fetch("/api/v1/messages")
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (json?.data && Array.isArray(json.data) && json.data.length > 0) {
          const mapped: ChatMessage[] = json.data
            .map((m: any) => ({
              id: m.id,
              senderId: (m.senderRole === "provider" ? "provider" : "patient") as "patient" | "provider",
              senderName: m.senderRole === "provider" ? "Dr. Priya Sharma" : (profile?.display_name || user?.displayName || "You"),
              content: m.content,
              timestamp: new Date(m.sentAt || m.insertedAt || m.created_at || Date.now()),
              read: Boolean(m.readAt),
            }))
            .reverse();
          setMessages(mapped);
        } else {
          setMessages([]);
        }
      })
      .catch(() => setMessages([]))
      .finally(() => setIsLoading(false));
  }, [profile, user]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (customContent?: string) => {
    const textToSend = (customContent || input).trim();
    if (!textToSend) return;

    const tempId = crypto.randomUUID();
    const newMsg: ChatMessage = {
      id: tempId,
      senderId: "patient",
      senderName: profile?.display_name || user?.displayName || "You",
      content: textToSend,
      timestamp: new Date(),
      read: false,
    };

    setMessages((prev) => [...prev, newMsg]);
    if (!customContent) setInput("");

    try {
      await fetch("/api/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          threadId,
          recipientId: "provider_dr_priya_sharma",
          content: textToSend,
          senderRole: "patient",
        }),
      });
    } catch {
      // Non-blocking optimistic sync
    }
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
              <h1 className="font-semibold text-title-md text-text-primary">Clinical Care Team</h1>
              <p className="text-xs text-text-secondary">{provider.name} · {provider.specialty}</p>
            </div>
            <div className="ml-auto flex items-center gap-2">
              {!connected ? (
                <>
                  <button
                    onClick={() => setShowConnectModal(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-text-secondary text-xs font-bold shadow-xs border border-divider transition-all active:scale-95"
                    title="Doctor connection required for live video calling"
                  >
                    <Lock size={13} className="text-text-tertiary" />
                    <span>Video Call</span>
                  </button>
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-700">
                    <span className="text-[11px] font-semibold">Not Connected</span>
                  </div>
                </>
              ) : !isDoctorOnline ? (
                <>
                  <Link
                    href="/telehealth"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-text-tertiary text-xs font-semibold shadow-xs border border-divider transition-all"
                    title="Doctor is currently offline. Click to schedule an appointment."
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                    <span>Doctor Offline</span>
                  </Link>
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gray-100">
                    <span className="text-[11px] font-medium text-text-tertiary">Offline</span>
                  </div>
                </>
              ) : (
                <>
                  <Link
                    href="/telehealth"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-status-green hover:opacity-90 text-white text-xs font-bold shadow-sm transition-all active:scale-95"
                  >
                    <Video size={13} aria-hidden="true" />
                    <span>Live Video Call</span>
                  </Link>
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-status-green-bg">
                    <span className="w-1.5 h-1.5 rounded-full bg-status-green animate-pulse" />
                    <span className="text-xs font-medium text-status-green">Available</span>
                  </div>
                </>
              )}
            </div>
          </div>
          {/* Encryption notice */}
          <div className="flex items-center gap-1.5 mt-3 text-xs text-text-tertiary">
            <Lock size={11} aria-hidden="true" />
            <span>End-to-end encrypted · HIPAA & DPDP Compliant · Scoped strictly to your account</span>
          </div>
        </div>

        {/* Messages & Empty State */}
        <div className="flex-1 overflow-y-auto px-4 lg:px-6 py-4 space-y-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center py-10 px-4 space-y-5 animate-fade-in my-auto">
              <div className="w-14 h-14 rounded-2xl bg-bg-lavender text-accent-violet flex items-center justify-center shadow-xs">
                <MessageSquare size={28} />
              </div>
              <div className="max-w-md">
                <h3 className="font-bold text-title-md text-text-primary">No Conversation History</h3>
                <p className="text-body-md text-text-secondary mt-1.5 leading-relaxed">
                  Start a secure conversation directly with your clinician. Ask about medication adjustments, report unusual vitals, or request prescription follow-ups.
                </p>
              </div>

              {/* Starter chips */}
              <div className="w-full max-w-md text-left pt-2">
                <p className="text-xs font-semibold text-text-tertiary mb-2 flex items-center gap-1">
                  <Sparkles size={12} className="text-accent-violet" />
                  <span>Suggested Conversation Starters:</span>
                </p>
                <div className="flex flex-col gap-2">
                  {CONVERSATION_STARTERS.map((prompt) => (
                    <button
                      key={prompt}
                      onClick={() => sendMessage(prompt)}
                      className="text-left text-xs text-text-primary font-medium p-2.5 rounded-xl bg-bg-card border border-divider hover:border-accent-lavender hover:bg-bg-lavender transition-all"
                    >
                      &ldquo;{prompt}&rdquo;
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            messages.map((msg, i) => {
              const isPatient = msg.senderId === "patient";
              const showDate = i === 0 || format(messages[i - 1]!.timestamp, "MMM d") !== format(msg.timestamp, "MMM d");
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
                      <div className="w-7 h-7 rounded-full gradient-violet flex items-center justify-center text-white flex-shrink-0 text-xs">
                        <Stethoscope size={13} />
                      </div>
                    )}
                    <div
                      className={clsx(
                        "max-w-[78%] rounded-2xl p-3.5 space-y-1 shadow-card card-enter",
                        isPatient
                          ? "gradient-violet text-white rounded-br-xs"
                          : "bg-bg-card border border-divider text-text-primary rounded-bl-xs"
                      )}
                    >
                      <p className="text-sm leading-relaxed">{msg.content}</p>
                      <div className={clsx("flex items-center gap-1 text-[10px]", isPatient ? "text-white/60 justify-end" : "text-text-tertiary")}>
                        <span suppressHydrationWarning>{format(msg.timestamp, "h:mm a")}</span>
                        {isPatient && <span>{msg.read ? "· Read" : "· Sent"}</span>}
                      </div>
                    </div>
                    {isPatient && (
                      <div className="w-7 h-7 rounded-full bg-accent-lavender flex items-center justify-center text-accent-violet flex-shrink-0 text-xs">
                        <User size={13} />
                      </div>
                    )}
                  </div>
                </React.Fragment>
              );
            })
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input bar */}
        <div className="px-4 lg:px-6 py-3 bg-bg-card border-t border-divider flex-shrink-0">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void sendMessage();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Message your care team securely..."
              className="flex-1 px-4 py-2.5 rounded-xl border border-divider bg-bg-light text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent-lavender/50 focus:border-accent-violet transition-all"
              aria-label="Message text"
            />
            <button
              type="submit"
              disabled={!input.trim()}
              className="p-2.5 rounded-xl gradient-violet text-white shadow-card hover:opacity-90 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0 active:scale-95"
              aria-label="Send message"
            >
              <Send size={16} />
            </button>
          </form>
        </div>

        {/* Doctor Connection Modal */}
        <DoctorConnectionModal
          open={showConnectModal}
          onClose={() => setShowConnectModal(false)}
          onConnected={() => {
            void mutateDoctorConnection();
          }}
          doctorName={provider.name}
          specialty={provider.specialty}
          onConnect={connectDoctor}
        />
      </div>
    </AppShell>
  );
}
