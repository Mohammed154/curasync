"use client";

import React, { useState, useEffect } from "react";
import AppShell from "@/components/layout/AppShell";
import VideoRoom from "@/components/telehealth/VideoRoom";
import { Video, Calendar, Clock, Plus, Shield, CheckCircle2, AlertCircle, PhoneCall, X } from "lucide-react";
import { format, addHours, addDays } from "date-fns";
import { clsx } from "clsx";

interface ConsultationItem {
  id: string;
  providerId: string;
  providerName: string;
  specialty: string;
  scheduledAt: string;
  durationMin: number;
  status: "scheduled" | "in_progress" | "completed" | "cancelled";
  roomUrl: string;
  roomName: string;
  notes?: string;
}

const MOCK_CONSULTATIONS: ConsultationItem[] = [
  {
    id: "c1",
    providerId: "dev_provider_001",
    providerName: "Dr. Priya Sharma",
    specialty: "Internal Medicine & Chronic Disease",
    scheduledAt: new Date(Date.now() + 1000 * 60 * 15).toISOString(), // in 15 mins
    durationMin: 20,
    status: "scheduled",
    roomUrl: "https://curasync.daily.co/dr-priya-consultation",
    roomName: "dr-priya-consultation",
    notes: "Review recent elevated systolic BP and metformin titration.",
  },
  {
    id: "c2",
    providerId: "dev_provider_001",
    providerName: "Dr. Priya Sharma",
    specialty: "Internal Medicine",
    scheduledAt: addDays(new Date(), -7).toISOString(),
    durationMin: 20,
    status: "completed",
    roomUrl: "https://curasync.daily.co/dr-priya-past",
    roomName: "dr-priya-past",
    notes: "Baseline review of eGFR and fasting glucose.",
  },
];

export default function TelehealthPage() {
  const [consultations, setConsultations] = useState<ConsultationItem[]>(MOCK_CONSULTATIONS);
  const [activeRoom, setActiveRoom] = useState<ConsultationItem | null>(null);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [isBooking, setIsBooking] = useState(false);

  // Form state for scheduling a new call
  const [scheduledDate, setScheduledDate] = useState(() => format(addDays(new Date(), 1), "yyyy-MM-dd"));
  const [scheduledTime, setScheduledTime] = useState("10:00");
  const [durationMin, setDurationMin] = useState(20);
  const [notes, setNotes] = useState("");

  // Load consultations from API
  useEffect(() => {
    fetch("/api/v1/consultations")
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (json?.data?.length) {
          const mapped: ConsultationItem[] = json.data.map((c: any) => ({
            id: c.id,
            providerId: c.providerId,
            providerName: "Dr. Priya Sharma",
            specialty: "Internal Medicine",
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

  const handleBookConsultation = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsBooking(true);

    const fullIsoDate = new Date(`${scheduledDate}T${scheduledTime}:00`).toISOString();

    try {
      const res = await fetch("/api/v1/consultations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scheduledAt: fullIsoDate,
          durationMin,
          providerId: "dev_provider_001",
          notes: notes.trim() || undefined,
        }),
      });

      if (res.ok) {
        const json = await res.json();
        const created: ConsultationItem = {
          id: json.data.id,
          providerId: json.data.providerId,
          providerName: "Dr. Priya Sharma",
          specialty: "Internal Medicine",
          scheduledAt: json.data.scheduledAt,
          durationMin: json.data.durationMin,
          status: json.data.status,
          roomUrl: json.data.roomUrl,
          roomName: json.data.roomName,
          notes: json.data.notes,
        };
        setConsultations((prev) => [created, ...prev]);
        setShowScheduleModal(false);
        setNotes("");
      }
    } catch (err) {
      console.error("Booking error:", err);
    } finally {
      setIsBooking(false);
    }
  };

  const handleJoinCall = (consultation: ConsultationItem) => {
    // Optionally mark status as in_progress via PATCH
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
        providerName={activeRoom.providerName}
        onLeave={() => setActiveRoom(null)}
      />
    );
  }

  const upcoming = consultations.filter((c) => c.status === "scheduled" || c.status === "in_progress");
  const past = consultations.filter((c) => c.status === "completed" || c.status === "cancelled");

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto px-4 lg:px-6 py-6 space-y-6">
        
        {/* Header */}
        <div className="flex items-start justify-between gap-4 animate-fade-in">
          <div>
            <h1 className="font-bold text-display text-text-primary leading-tight">
              Telehealth Consultations
            </h1>
            <p className="text-body-md text-text-secondary mt-1">
              Encrypted video consultations with your assigned medical care team.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => handleJoinCall({
                id: "instant_call",
                providerId: "dev_provider_001",
                providerName: "Dr. Priya Sharma",
                specialty: "Internal Medicine & Chronic Care",
                scheduledAt: new Date().toISOString(),
                durationMin: 20,
                status: "in_progress",
                roomUrl: "",
                roomName: "live-consultation",
              })}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-status-green hover:opacity-95 text-white font-bold text-label-sm shadow-md transition-all active:scale-95"
            >
              <Video size={16} aria-hidden="true" />
              <span>Instant Video Call</span>
            </button>
            <button
              onClick={() => setShowScheduleModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl gradient-violet text-white font-semibold text-label-sm shadow-card hover:opacity-90 transition-opacity"
            >
              <Plus size={16} aria-hidden="true" />
              <span>Book Appointment</span>
            </button>
          </div>
        </div>

        {/* Upcoming Consultations */}
        <div className="space-y-3">
          <h2 className="text-title-sm font-bold text-text-primary uppercase tracking-wider text-xs">
            Upcoming Appointments ({upcoming.length})
          </h2>

          {upcoming.length === 0 ? (
            <div className="bg-bg-card rounded-xl p-8 border border-divider shadow-card text-center space-y-3">
              <div className="w-12 h-12 rounded-xl bg-bg-lavender flex items-center justify-center mx-auto text-accent-violet">
                <Video size={22} />
              </div>
              <p className="font-semibold text-sm text-text-primary">No upcoming appointments scheduled</p>
              <p className="text-xs text-text-tertiary max-w-sm mx-auto">
                Schedule a consultation with Dr. Priya Sharma to review your chronic vitals and medication protocols.
              </p>
              <button
                onClick={() => setShowScheduleModal(true)}
                className="px-4 py-2 rounded-lg gradient-violet text-white text-xs font-semibold shadow-card hover:opacity-90"
              >
                Schedule Appointment
              </button>
            </div>
          ) : (
            upcoming.map((call) => (
              <div
                key={call.id}
                className="bg-bg-card rounded-xl p-5 border border-divider shadow-card flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 card-enter"
              >
                <div className="flex items-start gap-4">
                  <div className="w-11 h-11 rounded-xl gradient-violet flex items-center justify-center text-white flex-shrink-0 shadow-sm">
                    <Video size={20} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-title-md text-text-primary">{call.providerName}</h3>
                      <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-status-green-bg text-status-green">
                        {call.status === "in_progress" ? "Live Now" : "Confirmed"}
                      </span>
                    </div>
                    <p className="text-xs text-text-secondary mt-0.5">{call.specialty}</p>
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
                        <strong>Clinical Note:</strong> {call.notes}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex sm:flex-col items-center sm:items-end gap-2">
                  <button
                    onClick={() => handleJoinCall(call)}
                    className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-status-green hover:opacity-90 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2"
                  >
                    <Video size={15} />
                    <span>Join Video Room</span>
                  </button>
                  <span className="text-[11px] text-text-tertiary">Room active 5m prior</span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Past Consultations */}
        {past.length > 0 && (
          <div className="space-y-3 pt-4">
            <h2 className="text-title-sm font-bold text-text-tertiary uppercase tracking-wider text-xs">
              Past Appointments ({past.length})
            </h2>
            <div className="space-y-2.5">
              {past.map((call) => (
                <div
                  key={call.id}
                  className="bg-bg-card rounded-xl p-4 border border-divider shadow-card flex items-center justify-between gap-4 text-xs"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-bg-light flex items-center justify-center text-text-tertiary">
                      <CheckCircle2 size={16} />
                    </div>
                    <div>
                      <p className="font-semibold text-text-primary">{call.providerName}</p>
                      <p className="text-text-tertiary">
                        {format(new Date(call.scheduledAt), "MMM d, yyyy · h:mm a")} · {call.durationMin} min
                      </p>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-bg-light text-text-tertiary font-semibold capitalize">
                    {call.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Schedule Consultation Modal */}
        {showScheduleModal && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-bg-card rounded-2xl p-6 w-full max-w-md border border-divider shadow-2xl space-y-4 animate-fade-in">
              <div className="flex items-center justify-between border-b border-divider pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg gradient-violet flex items-center justify-center text-white">
                    <Video size={16} />
                  </div>
                  <div>
                    <h3 className="font-bold text-title-md text-text-primary">Book Consultation</h3>
                    <p className="text-xs text-text-tertiary">Select appointment time slot</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowScheduleModal(false)}
                  className="p-1 rounded-lg text-text-tertiary hover:text-text-primary"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleBookConsultation} className="space-y-4 text-xs">
                <div>
                  <label className="block font-bold text-text-secondary uppercase mb-1">Care Provider</label>
                  <div className="p-3 rounded-xl bg-bg-light border border-divider">
                    <p className="font-bold text-text-primary">Dr. Priya Sharma</p>
                    <p className="text-text-tertiary">Internal Medicine · Mumbai Central Hospital</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-text-secondary uppercase mb-1">Date</label>
                    <input
                      type="date"
                      required
                      value={scheduledDate}
                      onChange={(e) => setScheduledDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-divider bg-bg-card text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-violet"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-text-secondary uppercase mb-1">Time</label>
                    <input
                      type="time"
                      required
                      value={scheduledTime}
                      onChange={(e) => setScheduledTime(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-divider bg-bg-card text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-violet"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-text-secondary uppercase mb-1">Duration</label>
                  <select
                    value={durationMin}
                    onChange={(e) => setDurationMin(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-divider bg-bg-card text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-violet"
                  >
                    <option value={15}>15 minutes (Quick review)</option>
                    <option value={20}>20 minutes (Standard consultation)</option>
                    <option value={30}>30 minutes (Comprehensive evaluation)</option>
                    <option value={45}>45 minutes (Multi-condition review)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-text-secondary uppercase mb-1">Reason for consultation</label>
                  <textarea
                    rows={3}
                    placeholder="e.g. Discuss recent blood pressure fluctuations and medication dose adjustment"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-divider bg-bg-card text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-violet resize-none"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowScheduleModal(false)}
                    className="flex-1 py-2.5 rounded-xl border border-divider font-semibold text-text-secondary hover:bg-bg-light"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isBooking}
                    className="flex-1 py-2.5 rounded-xl gradient-violet text-white font-bold shadow-card hover:opacity-90 disabled:opacity-50"
                  >
                    {isBooking ? "Booking…" : "Confirm Appointment"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
