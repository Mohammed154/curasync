"use client";

import React, { useState, useEffect } from "react";
import AppShell from "@/components/layout/AppShell";
import VideoRoom from "@/components/telehealth/VideoRoom";
import DoctorConnectionModal from "@/components/telehealth/DoctorConnectionModal";
import { useDoctorConnection } from "@/hooks/useDoctorConnection";
import {
  Video, Calendar, Clock, Plus, Shield, CheckCircle2, AlertCircle,
  PhoneCall, X, ShieldAlert, UserPlus, Lock, Stethoscope, AlertTriangle
} from "lucide-react";
import { format, addDays } from "date-fns";
import { clsx } from "clsx";
import Link from "next/link";

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
  token?: string;
  notes?: string;
}

export default function TelehealthPage() {
  const {
    loading: isConnectionLoading,
    connected,
    status: connectionStatus,
    provider,
    doctorPresence,
    isDoctorOnline,
    connectDoctor,
    requestVideoToken,
    mutate: mutateConnection,
  } = useDoctorConnection();

  const [consultations, setConsultations] = useState<ConsultationItem[]>([]);
  const [activeRoom, setActiveRoom] = useState<ConsultationItem | null>(null);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [isBooking, setIsBooking] = useState(false);
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [joiningCallId, setJoiningCallId] = useState<string | null>(null);

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
        if (json?.data && Array.isArray(json.data)) {
          const mapped: ConsultationItem[] = json.data.map((c: any) => ({
            id: c.id,
            providerId: c.providerId,
            providerName: c.providerName || provider.name,
            specialty: c.specialty || provider.specialty,
            scheduledAt: c.scheduledAt,
            durationMin: c.durationMin || 20,
            status: c.status,
            roomUrl: c.roomUrl || `https://curasync.daily.co/${c.roomName}`,
            roomName: c.roomName || "consultation-room",
            notes: c.notes,
          }));
          setConsultations(mapped);
        } else {
          setConsultations([]);
        }
      })
      .catch(() => {
        setConsultations([]);
      });
  }, [provider.name, provider.specialty]);

  const handleBookConsultation = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!connected) {
      setShowScheduleModal(false);
      setShowConnectModal(true);
      return;
    }

    setIsBooking(true);
    setTokenError(null);

    const fullIsoDate = new Date(`${scheduledDate}T${scheduledTime}:00`).toISOString();

    try {
      const res = await fetch("/api/v1/consultations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scheduledAt: fullIsoDate,
          durationMin,
          providerId: provider.id,
          notes: notes.trim() || undefined,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        if (res.status === 403) {
          setShowScheduleModal(false);
          setShowConnectModal(true);
          return;
        }
        setTokenError(json.error || "Failed to schedule appointment.");
        return;
      }

      const created: ConsultationItem = {
        id: json.data.id,
        providerId: json.data.providerId,
        providerName: provider.name,
        specialty: provider.specialty,
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
    } catch (err: any) {
      setTokenError(err?.message || "Booking error occurred.");
    } finally {
      setIsBooking(false);
    }
  };

  const handleJoinCall = async (consultation: ConsultationItem) => {
    setJoiningCallId(consultation.id);
    setTokenError(null);

    try {
      // 1. Mandatory verification & signed token issuance
      const authResult = await requestVideoToken(
        consultation.roomName || "live-consultation",
        consultation.id !== "instant_call" ? consultation.id : undefined
      );

      if (!authResult.authorized || !authResult.token) {
        setTokenError(authResult.error || "Access denied: Verified doctor connection required.");
        if (authResult.code === "DOCTOR_CONNECTION_REQUIRED") {
          setShowConnectModal(true);
        }
        setJoiningCallId(null);
        return;
      }

      // 2. Mark consultation in progress
      if (consultation.id !== "instant_call") {
        fetch("/api/v1/consultations", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ consultationId: consultation.id, status: "in_progress" }),
        }).catch(() => {});
      }

      // 3. Grant access to authorized VideoRoom
      setActiveRoom({
        ...consultation,
        token: authResult.token,
        roomUrl: authResult.roomUrl || consultation.roomUrl,
        roomName: authResult.roomName || consultation.roomName,
      });
    } catch (err: any) {
      setTokenError(err?.message || "Failed to authorize video session.");
    } finally {
      setJoiningCallId(null);
    }
  };

  if (activeRoom) {
    return (
      <VideoRoom
        roomUrl={activeRoom.roomUrl}
        roomName={activeRoom.roomName}
        token={activeRoom.token}
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
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 animate-fade-in">
          <div>
            <h1 className="font-bold text-display text-text-primary leading-tight">
              Telehealth Consultations
            </h1>
            <p className="text-body-md text-text-secondary mt-1">
              Encrypted clinical video consultations with your verified care team.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Instant Video Call Button */}
            {!connected ? (
              <div className="relative group">
                <button
                  onClick={() => setShowConnectModal(true)}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-text-secondary font-bold text-label-sm border border-divider shadow-xs transition-all active:scale-95"
                  aria-label="Doctor connection required for video call"
                >
                  <Lock size={15} className="text-text-tertiary" />
                  <span>Instant Call (Locked)</span>
                </button>
                <div className="absolute right-0 top-full mt-2 hidden group-hover:block z-30 w-64 p-2.5 bg-bg-card rounded-xl shadow-card border border-divider text-[11px] text-text-secondary">
                  🔒 Video calls require an approved doctor connection on the platform. Click to connect.
                </div>
              </div>
            ) : !isDoctorOnline ? (
              <div className="relative group">
                <button
                  disabled
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gray-100 text-text-tertiary font-bold text-label-sm border border-divider shadow-xs cursor-not-allowed opacity-75"
                  aria-label="Doctor is currently offline"
                >
                  <span className="w-2 h-2 rounded-full bg-gray-400" />
                  <span>Doctor Offline</span>
                </button>
                <div className="absolute right-0 top-full mt-2 hidden group-hover:block z-30 w-64 p-2.5 bg-bg-card rounded-xl shadow-card border border-divider text-[11px] text-text-secondary">
                  Your doctor is currently offline. You can schedule an upcoming consultation or message their team.
                </div>
              </div>
            ) : (
              <button
                onClick={() =>
                  handleJoinCall({
                    id: "instant_call",
                    providerId: provider.id,
                    providerName: provider.name,
                    specialty: provider.specialty,
                    scheduledAt: new Date().toISOString(),
                    durationMin: 20,
                    status: "in_progress",
                    roomUrl: "",
                    roomName: "live-consultation",
                  })
                }
                disabled={joiningCallId === "instant_call"}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-status-green hover:opacity-95 text-white font-bold text-label-sm shadow-md transition-all active:scale-95 animate-pulse"
              >
                <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                <Video size={16} aria-hidden="true" />
                <span>{joiningCallId === "instant_call" ? "Authorizing…" : "Start Live Video Call"}</span>
              </button>
            )}

            {/* Book Appointment Button */}
            <button
              onClick={() => {
                if (!connected) {
                  setShowConnectModal(true);
                } else {
                  setShowScheduleModal(true);
                }
              }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl gradient-violet text-white font-semibold text-label-sm shadow-card hover:opacity-90 transition-opacity"
            >
              <Plus size={16} aria-hidden="true" />
              <span>Book Appointment</span>
            </button>
          </div>
        </div>

        {/* Token Error Alert */}
        {tokenError && (
          <div className="p-4 rounded-xl bg-status-red-bg border border-status-red/20 text-status-red text-xs flex items-center justify-between gap-3 animate-fade-in">
            <div className="flex items-center gap-2">
              <AlertCircle size={16} className="flex-shrink-0" />
              <span>{tokenError}</span>
            </div>
            <button onClick={() => setTokenError(null)} className="p-1 hover:opacity-75">
              <X size={14} />
            </button>
          </div>
        )}

        {/* Warning Banner: No Doctor Connection */}
        {!connected && !isConnectionLoading && (
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 card-enter">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-800 flex items-center justify-center flex-shrink-0 mt-0.5">
                <ShieldAlert size={20} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-sm text-amber-950">Active Doctor Connection Required</h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-800">
                    Authorization Needed
                  </span>
                </div>
                <p className="text-xs text-amber-800/90 mt-1 max-w-xl leading-relaxed">
                  Video calls are restricted to approved doctor-patient relationships. Connect with your primary physician or care team to unlock live sessions and appointments.
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowConnectModal(true)}
              className="px-4 py-2.5 rounded-xl gradient-violet text-white text-xs font-bold shadow-card hover:opacity-95 transition-opacity flex-shrink-0 flex items-center justify-center gap-2"
            >
              <UserPlus size={15} />
              <span>Connect with Doctor</span>
            </button>
          </div>
        )}

        {/* Doctor Status Banner (When Connected) */}
        {connected && (
          <div className="bg-bg-card border border-divider rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 card-enter">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl gradient-violet flex items-center justify-center text-white flex-shrink-0">
                <Stethoscope size={18} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-sm text-text-primary">{provider.name}</h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-bg-lavender text-accent-violet">
                    Verified Connection
                  </span>
                  {isDoctorOnline ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-status-green-bg text-status-green text-[10px] font-bold">
                      <span className="w-1.5 h-1.5 rounded-full bg-status-green animate-pulse" />
                      Doctor Online & Available
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-100 text-text-tertiary text-[10px] font-semibold">
                      <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                      Doctor Offline
                    </span>
                  )}
                </div>
                <p className="text-xs text-text-secondary mt-0.5">{provider.specialty}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <Link
                href="/messages"
                className="px-3 py-1.5 rounded-xl border border-divider text-xs font-semibold text-text-secondary hover:bg-bg-light transition-colors"
              >
                Send Message
              </Link>
              {!isDoctorOnline && (
                <button
                  onClick={() => setShowScheduleModal(true)}
                  className="px-3 py-1.5 rounded-xl gradient-violet text-white text-xs font-semibold shadow-card hover:opacity-90"
                >
                  Schedule Consultation
                </button>
              )}
            </div>
          </div>
        )}

        {/* Upcoming Consultations */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-title-sm font-bold text-text-primary uppercase tracking-wider text-xs">
              Upcoming Appointments ({upcoming.length})
            </h2>
          </div>

          {upcoming.length === 0 ? (
            <div className="bg-bg-card rounded-xl p-8 border border-divider shadow-card text-center space-y-3">
              <div className="w-12 h-12 rounded-xl bg-bg-lavender flex items-center justify-center mx-auto text-accent-violet">
                <Video size={22} />
              </div>
              <p className="font-semibold text-sm text-text-primary">No upcoming appointments scheduled</p>
              <p className="text-xs text-text-tertiary max-w-sm mx-auto">
                {connected
                  ? `Schedule a consultation with ${provider.name} to review your chronic vitals and medication protocol.`
                  : "Connect with a healthcare provider to book and join encrypted telehealth appointments."}
              </p>
              <button
                onClick={() => {
                  if (!connected) {
                    setShowConnectModal(true);
                  } else {
                    setShowScheduleModal(true);
                  }
                }}
                className="px-4 py-2 rounded-lg gradient-violet text-white text-xs font-semibold shadow-card hover:opacity-90"
              >
                {connected ? "Schedule Appointment" : "Connect with Doctor"}
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
                    disabled={joiningCallId === call.id}
                    className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-status-green hover:opacity-90 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 active:scale-95"
                  >
                    <Video size={15} />
                    <span>{joiningCallId === call.id ? "Authorizing…" : "Join Video Room"}</span>
                  </button>
                  <span className="text-[11px] text-text-tertiary">Verified session token required</span>
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
                    <p className="font-bold text-text-primary">{provider.name}</p>
                    <p className="text-text-tertiary">{provider.specialty}</p>
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

        {/* Doctor Connection Modal */}
        <DoctorConnectionModal
          open={showConnectModal}
          onClose={() => setShowConnectModal(false)}
          onConnected={() => {
            void mutateConnection();
          }}
          doctorName={provider.name}
          specialty={provider.specialty}
          onConnect={connectDoctor}
        />
      </div>
    </AppShell>
  );
}
