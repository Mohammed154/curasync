"use client";

import React, { useState, useEffect } from "react";
import AppShell from "@/components/layout/AppShell";
import VideoRoom from "@/components/telehealth/VideoRoom";
import { Video, Calendar, Clock, User, Shield, CheckCircle2, AlertCircle } from "lucide-react";
import { format, addDays } from "date-fns";

interface ProviderConsultation {
  id: string;
  patientId: string;
  patientName: string;
  age: number;
  conditions: string[];
  scheduledAt: string;
  durationMin: number;
  status: "scheduled" | "in_progress" | "completed" | "cancelled";
  roomUrl: string;
  roomName: string;
  notes?: string;
}

const MOCK_PROVIDER_CONSULTATIONS: ProviderConsultation[] = [
  {
    id: "c1",
    patientId: "pat_001",
    patientName: "Arjun Mehta",
    age: 58,
    conditions: ["Type 2 Diabetes", "Hypertension"],
    scheduledAt: new Date(Date.now() + 1000 * 60 * 15).toISOString(),
    durationMin: 20,
    status: "scheduled",
    roomUrl: "https://curasync.daily.co/dr-priya-consultation",
    roomName: "dr-priya-consultation",
    notes: "Review recent elevated systolic BP and metformin titration.",
  },
  {
    id: "c2",
    patientId: "pat_002",
    patientName: "Sunita Patel",
    age: 64,
    conditions: ["CKD Stage 3A", "Hypertension"],
    scheduledAt: addDays(new Date(), 1).toISOString(),
    durationMin: 30,
    status: "scheduled",
    roomUrl: "https://curasync.daily.co/sunita-patel-review",
    roomName: "sunita-patel-review",
    notes: "Review quarterly metabolic panel and eGFR trajectory.",
  },
];

export default function ProviderTelehealthPage() {
  const [consultations, setConsultations] = useState<ProviderConsultation[]>(MOCK_PROVIDER_CONSULTATIONS);
  const [activeRoom, setActiveRoom] = useState<ProviderConsultation | null>(null);

  useEffect(() => {
    fetch("/api/v1/consultations?role=provider")
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (json?.data?.length) {
          const mapped: ProviderConsultation[] = json.data.map((c: any) => ({
            id: c.id,
            patientId: c.patientId,
            patientName: "Arjun Mehta",
            age: 58,
            conditions: ["Type 2 Diabetes", "Hypertension"],
            scheduledAt: c.scheduledAt,
            durationMin: c.durationMin,
            status: c.status,
            roomUrl: c.roomUrl || `https://curasync.daily.co/${c.roomName}`,
            roomName: c.roomName || "consultation-room",
            notes: c.notes,
          }));
          setConsultations(mapped);
        }
      })
      .catch(() => {});
  }, []);

  const handleStartCall = (consultation: ProviderConsultation) => {
    fetch("/api/v1/consultations", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ consultationId: consultation.id, status: "in_progress" }),
    }).catch(() => {});

    setActiveRoom(consultation);
  };

  if (activeRoom) {
    return (
      <VideoRoom
        roomUrl={activeRoom.roomUrl}
        roomName={activeRoom.roomName}
        patientName={activeRoom.patientName}
        providerName="Dr. Priya Sharma"
        onLeave={() => setActiveRoom(null)}
      />
    );
  }

  return (
    <AppShell role="provider">
      <div className="max-w-4xl mx-auto px-4 lg:px-6 py-6 space-y-6">
        
        {/* Header */}
        <div className="flex items-start justify-between gap-4 animate-fade-in">
          <div>
            <h1 className="font-bold text-display text-text-primary leading-tight">
              Clinical Telehealth Sessions
            </h1>
            <p className="text-body-md text-text-secondary mt-1">
              Dr. Priya Sharma · Manage video rooms and start consultations with patients.
            </p>
          </div>

          <button
            onClick={() => handleStartCall({
              id: "instant_provider_call",
              patientId: "pat_001",
              patientName: "Arjun Mehta",
              age: 58,
              conditions: ["Type 2 Diabetes", "Hypertension"],
              scheduledAt: new Date().toISOString(),
              durationMin: 20,
              status: "in_progress",
              roomUrl: "",
              roomName: "live-consultation",
              notes: "Ad-hoc clinical review.",
            })}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-status-green hover:opacity-95 text-white font-bold text-label-sm shadow-md transition-all active:scale-95 flex-shrink-0"
          >
            <Video size={16} aria-hidden="true" />
            <span>Launch Video Consultation</span>
          </button>
        </div>

        {/* Consultations List */}
        <div className="space-y-3">
          <h2 className="text-title-sm font-bold text-text-primary uppercase tracking-wider text-xs">
            Scheduled Telehealth Queue ({consultations.length})
          </h2>

          <div className="space-y-3">
            {consultations.map((call) => (
              <div
                key={call.id}
                className="bg-bg-card rounded-xl p-5 border border-divider shadow-card flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 card-enter"
              >
                <div className="flex items-start gap-4">
                  <div className="w-11 h-11 rounded-xl gradient-violet flex items-center justify-center text-white flex-shrink-0 shadow-sm">
                    <User size={20} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-title-md text-text-primary">{call.patientName}</h3>
                      <span className="text-xs text-text-tertiary">({call.age} yrs)</span>
                      <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-status-green-bg text-status-green">
                        {call.status === "in_progress" ? "In Progress" : "Scheduled"}
                      </span>
                    </div>
                    <p className="text-xs text-text-secondary mt-0.5">
                      Diagnoses: {call.conditions.join(", ")}
                    </p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-text-tertiary font-medium">
                      <span className="flex items-center gap-1">
                        <Calendar size={13} />
                        {format(new Date(call.scheduledAt), "EEEE, MMM d, yyyy")}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock size={13} />
                        {format(new Date(call.scheduledAt), "h:mm a")} ({call.durationMin} min)
                      </span>
                    </div>
                    {call.notes && (
                      <p className="text-xs text-text-tertiary mt-2 bg-bg-light/60 p-2 rounded-lg border border-divider">
                        <strong>Reason / Chief Complaint:</strong> {call.notes}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex sm:flex-col items-center sm:items-end gap-2">
                  <button
                    onClick={() => handleStartCall(call)}
                    className="w-full sm:w-auto px-5 py-2.5 rounded-xl gradient-violet hover:opacity-90 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2"
                  >
                    <Video size={15} />
                    <span>Launch Video Room</span>
                  </button>
                  <span className="text-[11px] text-text-tertiary font-mono">Room: {call.roomName}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
