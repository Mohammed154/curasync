"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Mic, MicOff, Video, VideoOff, PhoneOff, Users, Shield, MessageSquare,
  Share2, Activity, Settings, Maximize2, Minimize2, CheckCircle2,
  Volume2, Stethoscope, ChevronRight, Send, AlertTriangle, X
} from "lucide-react";
import { clsx } from "clsx";

interface VideoRoomProps {
  roomUrl?: string;
  roomName: string;
  patientName?: string;
  providerName?: string;
  onLeave: () => void;
}

interface InCallMessage {
  id: string;
  sender: "doctor" | "patient";
  text: string;
  time: string;
}

export default function VideoRoom({
  roomUrl,
  roomName,
  patientName = "Arjun Mehta",
  providerName = "Dr. Priya Sharma",
  onLeave,
}: VideoRoomProps) {
  // Media states
  const [micOn, setMicOn] = useState(true);
  const [cameraOn, setCameraOn] = useState(true);
  const [screenSharing, setScreenSharing] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // UI Panels
  const [activeTab, setActiveTab] = useState<"video" | "chat" | "vitals">("video");
  const [showVitalsHud, setShowVitalsHud] = useState(true);
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Time tracking
  const [elapsedSec, setElapsedSec] = useState(0);

  // Doctor state simulation
  const [doctorSpeaking, setDoctorSpeaking] = useState(true);

  // In-call Chat
  const [messages, setMessages] = useState<InCallMessage[]>([
    {
      id: "1",
      sender: "doctor",
      text: `Hello ${patientName.split(" ")[0]}! I can hear and see you clearly. I have your latest glucose and BP readings pulled up on my clinical terminal.`,
      time: "Just now",
    },
    {
      id: "2",
      sender: "doctor",
      text: "How have you been tolerating your morning Amlodipine dosage?",
      time: "Just now",
    },
  ]);
  const [inputMsg, setInputMsg] = useState("");

  // Refs
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const screenVideoRef = useRef<HTMLVideoElement>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Elapsed timer
  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedSec((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Doctor speaking oscillation
  useEffect(() => {
    const interval = setInterval(() => {
      setDoctorSpeaking((prev) => !prev);
    }, 3500);
    return () => clearInterval(interval);
  }, []);

  // Request actual camera & mic access via getUserMedia
  useEffect(() => {
    let active = true;

    async function startMedia() {
      try {
        if (typeof navigator !== "undefined" && navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: { width: { ideal: 1280 }, height: { ideal: 720 } },
            audio: true,
          });

          if (!active) {
            stream.getTracks().forEach((t) => t.stop());
            return;
          }

          mediaStreamRef.current = stream;
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = stream;
          }
          setCameraError(null);
        } else {
          setCameraError("Media devices API not supported in this environment.");
        }
      } catch (err: any) {
        console.warn("[Telehealth] Camera/Mic access prompt:", err?.message || err);
        setCameraError(err?.message || "Camera/Mic permission pending or device unavailable.");
      }
    }

    startMedia();

    return () => {
      active = false;
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  // Toggle microphone track
  const toggleMic = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getAudioTracks().forEach((track) => {
        track.enabled = !micOn;
      });
    }
    setMicOn((prev) => !prev);
  };

  // Toggle camera track
  const toggleCamera = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getVideoTracks().forEach((track) => {
        track.enabled = !cameraOn;
      });
    }
    setCameraOn((prev) => !prev);
  };

  // Toggle Screen Share via getDisplayMedia
  const toggleScreenShare = async () => {
    if (screenSharing) {
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach((track) => track.stop());
        screenStreamRef.current = null;
      }
      setScreenSharing(false);
    } else {
      try {
        if (typeof navigator !== "undefined" && navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia) {
          const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
          screenStreamRef.current = stream;
          if (screenVideoRef.current) {
            screenVideoRef.current.srcObject = stream;
          }
          const videoTrack = stream.getVideoTracks()[0];
          if (videoTrack) {
            videoTrack.onended = () => {
              setScreenSharing(false);
              screenStreamRef.current = null;
            };
          }
          setScreenSharing(true);
        }
      } catch (err) {
        console.warn("[ScreenShare] Cancelled or failed:", err);
      }
    }
  };

  // Toggle Fullscreen
  const toggleFullscreen = () => {
    if (typeof document !== "undefined") {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen?.().catch(() => {});
        setIsFullscreen(true);
      } else {
        document.exitFullscreen?.().catch(() => {});
        setIsFullscreen(false);
      }
    }
  };

  // In-call message send
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMsg.trim()) return;

    const patientText = inputMsg.trim();
    const newMsg: InCallMessage = {
      id: crypto.randomUUID(),
      sender: "patient",
      text: patientText,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, newMsg]);
    setInputMsg("");

    setTimeout(() => {
      chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);

    // Auto-respond from Dr. Priya Sharma
    setTimeout(() => {
      const responses = [
        "Noted! I have documented that in your clinical record.",
        "That's very helpful context. Let's keep monitoring that trend over the next 48 hours.",
        "I'm sending an updated prescription recommendation right into your CuraSync portal.",
        "Your current vitals look stable. Continue taking your doses on time.",
      ];
      const randomResponse = responses[Math.floor(Math.random() * responses.length)] ?? responses[0]!;
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          sender: "doctor",
          text: randomResponse,
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
      setTimeout(() => {
        chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    }, 1500);
  };

  const formatDuration = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#070B14] text-slate-100 flex flex-col overflow-hidden font-sans select-none">
      {/* ── Top Status Bar ─────────────────────────────────────────── */}
      <header className="px-5 py-3 bg-[#0D1527]/90 border-b border-slate-800/80 backdrop-blur-md flex items-center justify-between flex-shrink-0 z-30">
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center">
            <span className="w-3 h-3 rounded-full bg-emerald-500 animate-ping absolute" />
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 relative" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-sm text-white tracking-wide">
                Telehealth Consultation · Live
              </h1>
              <span className="px-2 py-0.5 rounded-full bg-emerald-950/70 border border-emerald-700/50 text-emerald-400 text-[10px] font-semibold uppercase tracking-wider">
                HD Encrypted
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-2">
              <span>{providerName}</span>
              <span className="text-slate-600">•</span>
              <span>{patientName}</span>
              <span className="text-slate-600">•</span>
              <span className="font-mono text-sky-400 text-[11px]">{roomName}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {/* Vitals HUD Toggle */}
          <button
            onClick={() => setShowVitalsHud((prev) => !prev)}
            className={clsx(
              "hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors border",
              showVitalsHud
                ? "bg-sky-950/60 border-sky-800/70 text-sky-300"
                : "bg-slate-800/60 border-slate-700/60 text-slate-400 hover:text-slate-200"
            )}
            title="Toggle Live Biometrics HUD"
          >
            <Activity size={14} />
            <span>Vitals HUD</span>
          </button>

          {/* Call Duration */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700/80 text-xs font-mono font-bold text-slate-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span>{formatDuration(elapsedSec)}</span>
          </div>

          {/* Security Badge */}
          <div className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-950/50 border border-emerald-800/60 text-emerald-400 text-xs font-medium">
            <Shield size={13} />
            <span>HIPAA BAA · AES-256</span>
          </div>

          {/* Fullscreen Button */}
          <button
            onClick={toggleFullscreen}
            className="p-2 rounded-lg bg-slate-800/60 hover:bg-slate-700/60 text-slate-400 hover:text-white border border-slate-700/50 transition-colors"
            title="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
          </button>
        </div>
      </header>

      {/* ── Main Consultation Space ──────────────────────────────────── */}
      <div className="flex-1 relative bg-[#060911] flex overflow-hidden">
        
        {/* Primary Video / Presentation Stage */}
        <div className="flex-1 relative flex flex-col items-center justify-center p-3 sm:p-5 overflow-hidden">
          
          {/* Live Biometrics HUD Overlay */}
          {showVitalsHud && (
            <div className="absolute top-6 left-6 z-20 hidden sm:flex items-center gap-3 px-4 py-2 rounded-xl bg-slate-900/85 backdrop-blur-md border border-slate-800/80 shadow-2xl animate-fade-in">
              <div className="flex items-center gap-2 pr-3 border-r border-slate-700/70">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">Live Sync</span>
              </div>
              <div className="flex items-center gap-4 text-xs font-mono">
                <div className="flex items-center gap-1.5">
                  <span className="text-rose-400">🩸</span>
                  <span className="text-slate-400">Glucose:</span>
                  <span className="font-bold text-white">142</span>
                  <span className="text-[10px] text-slate-400">mg/dL</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-sky-400">💉</span>
                  <span className="text-slate-400">BP:</span>
                  <span className="font-bold text-amber-300">138/88</span>
                  <span className="text-[10px] text-slate-400">mmHg</span>
                </div>
              </div>
            </div>
          )}

          {/* Screen Share Viewport (when active) */}
          {screenSharing ? (
            <div className="w-full h-full relative rounded-2xl overflow-hidden border border-sky-500/40 shadow-2xl bg-black flex items-center justify-center">
              <video
                ref={screenVideoRef}
                autoPlay
                playsInline
                className="w-full h-full object-contain"
              />
              <div className="absolute top-4 right-4 z-10 px-3 py-1.5 rounded-lg bg-sky-950/80 backdrop-blur-md border border-sky-600 text-xs font-semibold text-sky-200 flex items-center gap-2">
                <Share2 size={13} />
                <span>You are sharing your screen</span>
                <button
                  onClick={toggleScreenShare}
                  className="ml-2 px-2 py-0.5 rounded bg-rose-600 hover:bg-rose-700 text-white text-[11px]"
                >
                  Stop
                </button>
              </div>
            </div>
          ) : (
            /* Clinician Video Feed (Dr. Priya Sharma) */
            <div className="w-full h-full relative rounded-2xl overflow-hidden border border-slate-800 shadow-2xl bg-gradient-to-b from-[#0F172A] to-[#0A0E1A] flex flex-col items-center justify-center">
              
              {/* Subtle ambient lighting effect */}
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(108,92,231,0.15),transparent_70%)] pointer-events-none" />

              {/* Clinician Representation Avatar with Pulse */}
              <div className="relative z-10 flex flex-col items-center text-center p-6 max-w-md">
                <div className="relative mb-6">
                  {doctorSpeaking && (
                    <>
                      <div className="absolute -inset-3 rounded-full bg-violet-500/20 animate-ping" />
                      <div className="absolute -inset-6 rounded-full bg-violet-500/10 animate-pulse" />
                    </>
                  )}
                  <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-full gradient-violet p-1 shadow-2xl flex items-center justify-center relative z-10">
                    <div className="w-full h-full rounded-full bg-[#0F172A] flex flex-col items-center justify-center border-2 border-violet-400/40 overflow-hidden">
                      <Stethoscope size={48} className="text-violet-300 mb-1" />
                      <span className="text-xs font-bold text-violet-200 tracking-wider">DR. PRIYA</span>
                    </div>
                  </div>

                  {/* Active Speaker Badge */}
                  <div className={clsx(
                    "absolute -bottom-2 left-1/2 -translate-x-1/2 z-20 px-3 py-1 rounded-full text-[11px] font-bold flex items-center gap-1.5 shadow-lg border transition-all",
                    doctorSpeaking
                      ? "bg-emerald-600 border-emerald-400 text-white"
                      : "bg-slate-800 border-slate-700 text-slate-400"
                  )}>
                    <Volume2 size={12} className={doctorSpeaking ? "animate-pulse" : ""} />
                    <span>{doctorSpeaking ? "Speaking" : "Listening"}</span>
                  </div>
                </div>

                <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                  {providerName}
                </h2>
                <p className="text-sm text-violet-300 font-medium mt-1">
                  Lead Specialist · Internal Medicine & Chronic Care
                </p>
                <p className="text-xs text-slate-400 mt-2 max-w-sm leading-relaxed">
                  Care team connected via encrypted clinical telehealth node. Live biometric telemetry active.
                </p>

                {/* Animated Speech Equalizer Wave */}
                <div className="flex items-center gap-1.5 mt-5 h-6">
                  {[0.4, 0.8, 1, 0.6, 0.9, 0.5, 0.7, 1, 0.4].map((scale, i) => (
                    <span
                      key={i}
                      className={clsx(
                        "w-1 rounded-full transition-all duration-300",
                        doctorSpeaking ? "bg-violet-400" : "bg-slate-700"
                      )}
                      style={{
                        height: doctorSpeaking ? `${scale * 24}px` : "6px",
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* Doctor Bottom-Left Tag */}
              <div className="absolute bottom-5 left-5 z-20 px-3.5 py-2 rounded-xl bg-slate-900/80 backdrop-blur-md border border-slate-800 text-xs font-semibold text-slate-200 flex items-center gap-2 shadow-lg">
                <Users size={14} className="text-violet-400" />
                <span>{providerName} (Provider)</span>
              </div>
            </div>
          )}

          {/* Self View PIP (Picture-in-Picture) */}
          <div className="absolute bottom-5 right-5 z-20 w-44 sm:w-56 aspect-video rounded-xl overflow-hidden border-2 border-slate-700/80 shadow-2xl bg-slate-950 flex items-center justify-center group transition-all hover:scale-105">
            {cameraOn ? (
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover scale-x-[-1]"
              />
            ) : (
              <div className="flex flex-col items-center justify-center p-3 text-center">
                <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-300 font-bold text-sm mb-1">
                  {patientName.split(" ").map((n) => n[0]).join("")}
                </div>
                <span className="text-[11px] font-medium text-slate-400">Camera Off</span>
              </div>
            )}

            {/* Self PIP Tag */}
            <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-slate-900/90 text-[10px] font-semibold text-slate-300 border border-slate-700/60 flex items-center gap-1.5">
              <span>You ({patientName.split(" ")[0]})</span>
              {!micOn && <MicOff size={10} className="text-rose-400" />}
            </div>

            {/* Fallback info when camera error */}
            {cameraError && !cameraOn && (
              <div className="absolute inset-0 bg-slate-900/90 p-2 text-center flex flex-col items-center justify-center text-[10px] text-amber-300">
                <AlertTriangle size={14} className="mb-1 text-amber-400" />
                <span>Camera preview inactive</span>
              </div>
            )}
          </div>
        </div>

        {/* ── Optional In-Call Chat Sidebar ─────────────────────────── */}
        {activeTab === "chat" && (
          <aside className="w-80 sm:w-96 bg-[#0D1527] border-l border-slate-800 flex flex-col flex-shrink-0 z-30 animate-slide-left">
            <div className="px-4 py-3.5 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare size={16} className="text-violet-400" />
                <h3 className="font-bold text-xs uppercase tracking-wider text-slate-200">Consultation Chat</h3>
              </div>
              <button
                onClick={() => setActiveTab("video")}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X size={16} />
              </button>
            </div>

            {/* Messages Feed */}
            <div className="flex-1 p-4 overflow-y-auto space-y-3">
              {messages.map((m) => {
                const isDoc = m.sender === "doctor";
                return (
                  <div
                    key={m.id}
                    className={clsx("flex flex-col max-w-[85%]", isDoc ? "items-start mr-auto" : "items-end ml-auto")}
                  >
                    <span className="text-[10px] font-semibold text-slate-400 mb-1">
                      {isDoc ? providerName : "You"} · {m.time}
                    </span>
                    <div
                      className={clsx(
                        "px-3.5 py-2.5 rounded-2xl text-xs leading-relaxed shadow-sm",
                        isDoc
                          ? "bg-slate-800/90 text-slate-100 rounded-tl-sm border border-slate-700/60"
                          : "gradient-violet text-white rounded-tr-sm"
                      )}
                    >
                      {m.text}
                    </div>
                  </div>
                );
              })}
              <div ref={chatBottomRef} />
            </div>

            {/* Input Form */}
            <form onSubmit={handleSendMessage} className="p-3 border-t border-slate-800 flex items-center gap-2">
              <input
                type="text"
                value={inputMsg}
                onChange={(e) => setInputMsg(e.target.value)}
                placeholder="Type a clinical note or question..."
                className="flex-1 px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-violet-500"
              />
              <button
                type="submit"
                className="p-2 rounded-xl gradient-violet text-white hover:opacity-90 transition-opacity flex-shrink-0"
              >
                <Send size={14} />
              </button>
            </form>
          </aside>
        )}
      </div>

      {/* ── Bottom Call Control Bar ──────────────────────────────────── */}
      <footer className="px-6 py-4 bg-[#0D1527] border-t border-slate-800/80 flex items-center justify-between flex-shrink-0 z-30">
        
        {/* Left Info: Current Mode */}
        <div className="hidden sm:flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>Connection: <strong>Optimal (24ms)</strong></span>
          </div>
        </div>

        {/* Center Control Buttons */}
        <div className="flex items-center gap-3 mx-auto sm:mx-0">
          
          {/* Mic Toggle */}
          <button
            onClick={toggleMic}
            className={clsx(
              "p-3.5 rounded-full border transition-all active:scale-95 shadow-md flex items-center justify-center",
              micOn
                ? "bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700 hover:text-white"
                : "bg-rose-500/20 border-rose-500 text-rose-400"
            )}
            title={micOn ? "Mute Microphone" : "Unmute Microphone"}
          >
            {micOn ? <Mic size={20} /> : <MicOff size={20} />}
          </button>

          {/* Camera Toggle */}
          <button
            onClick={toggleCamera}
            className={clsx(
              "p-3.5 rounded-full border transition-all active:scale-95 shadow-md flex items-center justify-center",
              cameraOn
                ? "bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700 hover:text-white"
                : "bg-rose-500/20 border-rose-500 text-rose-400"
            )}
            title={cameraOn ? "Turn Off Camera" : "Turn On Camera"}
          >
            {cameraOn ? <Video size={20} /> : <VideoOff size={20} />}
          </button>

          {/* Screen Share Toggle */}
          <button
            onClick={toggleScreenShare}
            className={clsx(
              "hidden sm:flex p-3.5 rounded-full border transition-all active:scale-95 shadow-md items-center justify-center",
              screenSharing
                ? "bg-sky-500/25 border-sky-500 text-sky-300"
                : "bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700 hover:text-white"
            )}
            title={screenSharing ? "Stop Screen Share" : "Share Screen or Reports"}
          >
            <Share2 size={20} />
          </button>

          {/* Chat Toggle */}
          <button
            onClick={() => setActiveTab((prev) => (prev === "chat" ? "video" : "chat"))}
            className={clsx(
              "p-3.5 rounded-full border transition-all active:scale-95 shadow-md flex items-center justify-center relative",
              activeTab === "chat"
                ? "bg-violet-600/30 border-violet-500 text-violet-300"
                : "bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700 hover:text-white"
            )}
            title="In-call Chat"
          >
            <MessageSquare size={20} />
            <span className="w-2 h-2 rounded-full bg-violet-400 absolute top-2 right-2 ring-2 ring-[#0D1527]" />
          </button>

          {/* Leave / End Call */}
          <button
            onClick={() => setShowSummaryModal(true)}
            className="flex items-center gap-2 px-6 py-3.5 rounded-full bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-lg transition-all active:scale-95 ml-2"
          >
            <PhoneOff size={18} />
            <span>End Call</span>
          </button>
        </div>

        {/* Right Info: Room ID */}
        <div className="hidden lg:flex items-center gap-2">
          <span className="text-xs text-slate-500 font-mono">ID: {roomName}</span>
        </div>
      </footer>

      {/* ── Post-Consultation Summary Modal ──────────────────────────── */}
      {showSummaryModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-5 animate-scale-up">
            <div className="w-12 h-12 rounded-full bg-emerald-950 border border-emerald-700/60 flex items-center justify-center text-emerald-400 mx-auto">
              <CheckCircle2 size={26} />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-lg font-bold text-white">Consultation Completed</h3>
              <p className="text-xs text-slate-400">
                Session duration: <strong className="text-white font-mono">{formatDuration(elapsedSec)}</strong>
              </p>
            </div>

            <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800/80 text-xs space-y-2">
              <h4 className="font-semibold text-slate-300">Clinical Takeaways & Follow-up:</h4>
              <ul className="list-disc list-inside text-slate-400 space-y-1">
                <li>Continue current blood pressure medication (Amlodipine 5mg).</li>
                <li>Fasting glucose target range 80–130 mg/dL maintained.</li>
                <li>Next telehealth check-in recommended in 7 days.</li>
              </ul>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowSummaryModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300 text-xs font-semibold"
              >
                Resume Call
              </button>
              <button
                onClick={onLeave}
                className="flex-1 py-2.5 rounded-xl gradient-violet text-white text-xs font-semibold shadow-card hover:opacity-90"
              >
                Return to Dashboard
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
