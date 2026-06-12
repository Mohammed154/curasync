"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Aurora from "@/components/ui/Aurora";
import {
  Heart, Activity, Pill, MessageSquare, Brain,
  Watch, Shield, ChevronRight, CheckCircle2,
  ArrowRight, Zap, BarChart3, Bell,
} from "lucide-react";
import { clsx } from "clsx";

const FEATURES = [
  { icon: Activity,    title: "Live Health Monitoring",  description: "Real-time biometric tracking from wearables and manual entry. Blood glucose, BP, heart rate — all in one dashboard.", color: "#00CEC9", bg: "#E6FAF9" },
  { icon: Brain,       title: "AI Doctor",               description: "Get instant, plain-language explanations of your readings and personalised questions to ask your care team.", color: "#6C5CE7", bg: "#F0EFF8" },
  { icon: Pill,        title: "Medication Management",   description: "Never miss a dose. Smart reminders, adherence tracking, and drug-condition conflict alerts built in.", color: "#E84393", bg: "#FFF0F7" },
  { icon: BarChart3,   title: "Glucose Tracker",         description: "Log fasting, pre-meal, post-meal and bedtime readings with context-aware status and trend charts.", color: "#F39C12", bg: "#FEF9E7" },
  { icon: MessageSquare, title: "Secure Messaging",      description: "Secure direct messaging with your care team. Get clinical feedback without a visit.", color: "#00B894", bg: "#E8F8F5" },
  { icon: Watch,       title: "Wearable Sync",           description: "Automatic sync with Apple Watch, Fitbit, and Garmin. Data flows in — you focus on getting better.", color: "#A29BFE", bg: "#F0EFF8" },
];

const CONDITIONS = [
  { emoji: "🩸", label: "Diabetes"        },
  { emoji: "💉", label: "Hypertension"    },
  { emoji: "🫘", label: "CKD"             },
  { emoji: "🫁", label: "COPD"            },
  { emoji: "❤️", label: "Heart Failure"  },
  { emoji: "🦴", label: "Rheumatoid Arthritis" },
  { emoji: "🦋", label: "Hypothyroidism" },
  { emoji: "💨", label: "Asthma"          },
  { emoji: "🫀", label: "Coronary Artery Disease" },
];

const STATS = [
  { value: "10+",    label: "Chronic conditions supported" },
  { value: "87%",    label: "Average medication adherence" },
  { value: "< 2s",   label: "Alert delivery time"          },
];

const GRAD_TEXT: React.CSSProperties = {
  background: "linear-gradient(135deg, #6C5CE7 0%, #00CEC9 50%, #E84393 100%)",
  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent",
  backgroundClip: "text",
};

export default function HomePage() {
  const [scrolled, setScrolled] = useState(false);
  const [activeCond, setActiveCond] = useState(0);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(true);
  const [activeModal, setActiveModal] = useState<"privacy" | "terms" | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
      const mountTimer = setTimeout(() => setMounted(false), 800);
      return () => clearTimeout(mountTimer);
    }, 2200);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);

  useEffect(() => {
    const t = setInterval(() => setActiveCond((i: number) => (i + 1) % CONDITIONS.length), 1800);
    return () => clearInterval(t);
  }, []);

  return (
    <div style={{ background: "#0A0A0A", color: "#fff", overflowX: "hidden", minHeight: "100vh" }}>
      <style>{`
        @keyframes curasyncPulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.03); opacity: 0.95; }
        }
        @keyframes ccFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes ccSlideUp {
          from { opacity: 0; transform: translateY(14px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {mounted && (
        <div style={{
          position: "fixed",
          inset: 0,
          zIndex: 9999,
          background: "#0A0A0A",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          transition: "all 0.8s cubic-bezier(0.16, 1, 0.3, 1)",
          opacity: loading ? 1 : 0,
          pointerEvents: loading ? "all" : "none",
          transform: loading ? "scale(1)" : "scale(1.05)",
        }}>
          <div style={{
            position: "absolute",
            width: "600px",
            height: "600px",
            background: "radial-gradient(circle, rgba(108,92,231,0.15) 0%, rgba(0,0,0,0) 70%)",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            pointerEvents: "none"
          }} />

          <div style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 16,
            animation: "curasyncPulse 2s ease-in-out infinite",
          }}>
            <div className="gradient-violet" style={{
              width: 64,
              height: 64,
              borderRadius: 16,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 0 40px rgba(108,92,231,0.4)",
            }}>
              <Heart size={32} color="#fff" strokeWidth={2.5} />
            </div>
            <h1 style={{
              fontSize: 28,
              fontWeight: 800,
              letterSpacing: "0.05em",
              color: "#fff",
              margin: 0
            }}>
              CuraSync
            </h1>
            <div style={{
              width: 120,
              height: 3,
              background: "linear-gradient(90deg, #6C5CE7, #00CEC9)",
              borderRadius: 2,
              marginTop: 4
            }} />
          </div>

          <div style={{
            position: "absolute",
            bottom: 48,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 8,
            color: "rgba(255, 255, 255, 0.4)",
            fontSize: 13,
            fontWeight: 500,
          }}>
            <span>Created by</span>
            <a
              href="https://github.com/Mohammed154"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                color: "#fff",
                textDecoration: "none",
                fontWeight: 600,
                background: "rgba(255, 255, 255, 0.05)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                padding: "8px 16px",
                borderRadius: 99,
                transition: "all 0.3s ease",
                boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(255, 255, 255, 0.1)";
                e.currentTarget.style.borderColor = "rgba(108, 92, 231, 0.5)";
                e.currentTarget.style.boxShadow = "0 4px 20px rgba(108, 92, 231, 0.25)";
                e.currentTarget.style.transform = "translateY(-2px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(255, 255, 255, 0.05)";
                e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.1)";
                e.currentTarget.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.1)";
                e.currentTarget.style.transform = "translateY(0)";
              }}
            >
              <svg height="16" width="16" viewBox="0 0 16 16" fill="currentColor" style={{ flexShrink: 0 }}>
                <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
              </svg>
              <span>Mohammed Songadhwala</span>
            </a>
          </div>
        </div>
      )}

      {/* ── NAV ─────────────────────────────────────────────────────────── */}
      <nav style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 50,
        transition: "all 0.3s",
        background: scrolled ? "rgba(10,10,10,0.9)" : "transparent",
        backdropFilter: scrolled ? "blur(12px)" : "none",
        borderBottom: scrolled ? "1px solid rgba(255,255,255,0.08)" : "none",
      }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div className="gradient-violet" style={{ width: 32, height: 32, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Heart size={15} color="#fff" strokeWidth={2.5} />
            </div>
            <span style={{ fontWeight: 700, fontSize: 18, color: "#fff" }}>CuraSync</span>
          </div>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <Link href="/dashboard" style={{ color: "rgba(255,255,255,0.6)", fontSize: 14, fontWeight: 500, textDecoration: "none" }}>
              Sign in
            </Link>
            <Link href="/onboarding" style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "8px 18px", borderRadius: 99,
              background: "linear-gradient(135deg,#6C5CE7,#A29BFE)",
              color: "#fff", fontSize: 14, fontWeight: 600, textDecoration: "none",
            }}>
              Get Started <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </nav>

      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <section style={{ position: "relative", minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "100px 20px 80px" }}>
        <Aurora colorStops={["#6C5CE7", "#00CEC9", "#E84393"]} amplitude={1.2} blend={0.6} speed={0.8} />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(10,10,10,0.35) 0%, rgba(10,10,10,0.55) 60%, rgba(10,10,10,1) 100%)" }} />

        <div style={{ position: "relative", zIndex: 10, maxWidth: 820, margin: "0 auto" }}>
          {/* Badge */}
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 14px", borderRadius: 99, background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)", marginBottom: 24, backdropFilter: "blur(8px)" }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#00B894", display: "inline-block" }} />
            <span style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.8)", letterSpacing: "0.08em", textTransform: "uppercase" }}>Unified Chronic Care Platform</span>
          </div>

          {/* Headline */}
          <h1 style={{ fontWeight: 800, lineHeight: 1.08, marginBottom: 24, fontSize: "clamp(2.4rem,6vw,4.4rem)" }}>
            All Your Conditions.<br />
            <span style={GRAD_TEXT}>One Smart Platform.</span>
          </h1>

          <p style={{ color: "rgba(255,255,255,0.55)", fontSize: "clamp(1rem,2vw,1.2rem)", maxWidth: 580, margin: "0 auto 36px", lineHeight: 1.7 }}>
            CuraSync connects your biometrics, medications, and care team in real time — so you stay ahead of your chronic conditions instead of reacting to them.
          </p>

          {/* CTAs */}
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap", marginBottom: 48 }}>
            <Link href="/onboarding" style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              padding: "14px 28px", borderRadius: 99, fontWeight: 700, fontSize: 16,
              background: "linear-gradient(135deg,#6C5CE7,#A29BFE)", color: "#fff",
              textDecoration: "none", boxShadow: "0 8px 32px rgba(108,92,231,0.4)",
            }}>
              Start for Free <ArrowRight size={18} />
            </Link>
            <Link href="/dashboard" style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              padding: "14px 28px", borderRadius: 99, fontWeight: 600, fontSize: 16,
              background: "rgba(255,255,255,0.09)", color: "rgba(255,255,255,0.75)",
              border: "1px solid rgba(255,255,255,0.18)", textDecoration: "none",
              backdropFilter: "blur(8px)",
            }}>
              View Demo
            </Link>
          </div>

          {/* Condition tags */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center", maxWidth: 560, margin: "0 auto" }}>
            {CONDITIONS.map((c, i) => (
              <span key={c.label} style={{
                padding: "5px 12px", borderRadius: 99, fontSize: 12, fontWeight: 500,
                transition: "all 0.5s",
                background: i === activeCond ? "rgba(108,92,231,0.3)" : "rgba(255,255,255,0.06)",
                border: `1px solid ${i === activeCond ? "rgba(108,92,231,0.6)" : "rgba(255,255,255,0.1)"}`,
                color: i === activeCond ? "#A29BFE" : "rgba(255,255,255,0.45)",
                transform: i === activeCond ? "scale(1.06)" : "scale(1)",
              }}>
                {c.emoji} {c.label}
              </span>
            ))}
          </div>
        </div>

        {/* Scroll indicator */}
        <div style={{ position: "absolute", bottom: 28, left: "50%", transform: "translateX(-50%)", zIndex: 10, opacity: 0.4, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 10, color: "rgba(255,255,255,0.5)", letterSpacing: "0.1em", textTransform: "uppercase" }}>Scroll</span>
          <div style={{ width: 1, height: 32, background: "linear-gradient(to bottom, rgba(255,255,255,0.4), transparent)" }} />
        </div>
      </section>

      {/* ── STATS ────────────────────────────────────────────────────────── */}
      <section style={{ borderTop: "1px solid rgba(255,255,255,0.08)", borderBottom: "1px solid rgba(255,255,255,0.08)", padding: "36px 20px" }}>
        <div style={{ maxWidth: 900, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 24, textAlign: "center" }}>
          {STATS.map(s => (
            <div key={s.label}>
              <p style={{ fontWeight: 800, fontSize: "clamp(1.6rem,4vw,2.2rem)", marginBottom: 4, ...GRAD_TEXT }}>{s.value}</p>
              <p style={{ color: "rgba(255,255,255,0.38)", fontSize: 12, fontWeight: 500 }}>{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── FEATURES ─────────────────────────────────────────────────────── */}
      <section style={{ padding: "96px 20px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 56 }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: "#A29BFE", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12 }}>Everything in one place</p>
            <h2 style={{ fontWeight: 800, color: "#fff", fontSize: "clamp(1.8rem,4vw,2.8rem)", marginBottom: 16 }}>
              Built for chronic care.<br />Not general wellness.
            </h2>
            <p style={{ color: "rgba(255,255,255,0.45)", maxWidth: 500, margin: "0 auto", fontSize: 15, lineHeight: 1.7 }}>
              Every feature is designed around the real challenges of managing long-term conditions.
            </p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(300px,1fr))", gap: 16 }}>
            {FEATURES.map(f => {
              const Icon = f.icon;
              return (
                <div key={f.title} style={{ borderRadius: 20, padding: "24px", border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)", transition: "border-color 0.2s" }}>
                  <div style={{ width: 42, height: 42, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16, background: f.color + "22" }}>
                    <Icon size={20} color={f.color} />
                  </div>
                  <h3 style={{ fontWeight: 700, color: "#fff", fontSize: 15, marginBottom: 8 }}>{f.title}</h3>
                  <p style={{ color: "rgba(255,255,255,0.45)", fontSize: 13, lineHeight: 1.7 }}>{f.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── FOR PROVIDERS ────────────────────────────────────────────────── */}
      <section style={{ padding: "96px 20px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
        <div style={{ maxWidth: 1000, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))", gap: 56, alignItems: "center" }}>
          <div>
            <p style={{ fontSize: 11, fontWeight: 600, color: "#00CEC9", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12 }}>For care providers</p>
            <h2 style={{ fontWeight: 800, color: "#fff", fontSize: "clamp(1.8rem,4vw,2.4rem)", marginBottom: 20, lineHeight: 1.15 }}>
              Monitor 40+ patients.<br />Intervene before crisis.
            </h2>
            <p style={{ color: "rgba(255,255,255,0.45)", marginBottom: 28, lineHeight: 1.75, fontSize: 15 }}>
              The provider dashboard gives you a live panel sorted by alert severity, adherence, and last activity. Customise thresholds per patient and message them directly.
            </p>
            <ul style={{ listStyle: "none", padding: 0, margin: "0 0 28px", display: "flex", flexDirection: "column", gap: 10 }}>
              {["Real-time patient vitals panel","Per-patient alert threshold customisation","7-day adherence from actual dose logs","Secure patient messaging","One-click clinical PDF export","Symptom frequency heatmaps"].map(item => (
                <li key={item} style={{ display: "flex", alignItems: "flex-start", gap: 10, fontSize: 14, color: "rgba(255,255,255,0.65)" }}>
                  <CheckCircle2 size={15} color="#00CEC9" style={{ flexShrink: 0, marginTop: 2 }} />
                  {item}
                </li>
              ))}
            </ul>
            <Link href="/provider" style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "10px 20px", borderRadius: 99, fontSize: 14, fontWeight: 600, color: "#fff", border: "1px solid rgba(255,255,255,0.2)", background: "rgba(255,255,255,0.07)", textDecoration: "none" }}>
              See Provider Dashboard <ChevronRight size={15} />
            </Link>
          </div>

          {/* Mock patient panel card */}
          <div style={{ borderRadius: 20, padding: 20, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.04)" }}>
            <p style={{ fontSize: 10, fontWeight: 600, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 16 }}>Patient Panel · Live</p>
            {[
              { name: "Arjun Mehta",  tags: "🩸 T2D · 💉 HTN · 🫘 CKD", adh: 87, status: "amber" },
              { name: "Priya Sharma", tags: "💉 HTN · ❤️ CHF",           adh: 64, status: "red"   },
              { name: "Rajesh Patel", tags: "🩸 T2D · 🫀 CAD",           adh: 96, status: "green" },
              { name: "Kavita Nair",  tags: "🦴 RA · 💉 HTN",            adh: 98, status: "green" },
            ].map((p, i, arr) => {
              const sc = p.status === "red" ? "#D63031" : p.status === "amber" ? "#F39C12" : "#00B894";
              const ac = p.adh >= 80 ? "#00B894" : p.adh >= 60 ? "#F39C12" : "#D63031";
              return (
                <div key={p.name} style={{ display: "flex", alignItems: "center", gap: 12, paddingTop: 12, paddingBottom: 12, borderBottom: i < arr.length - 1 ? "1px solid rgba(255,255,255,0.07)" : "none" }}>
                  <div style={{ width: 34, height: 34, borderRadius: "50%", background: "linear-gradient(135deg,#6C5CE7,#A29BFE)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: 11, flexShrink: 0 }}>
                    {p.name.split(" ").map(n => n[0]).join("")}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: "#fff", marginBottom: 2 }}>{p.name}</p>
                    <p style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.tags}</p>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <p style={{ fontSize: 12, fontWeight: 700, color: ac, marginBottom: 3 }}>{p.adh}%</p>
                    <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 99, background: sc + "22", color: sc }}>
                      {p.status === "red" ? "Urgent" : p.status === "amber" ? "Monitor" : "Stable"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Testimonials removed */}

      {/* ── FINAL CTA ────────────────────────────────────────────────────── */}
      <section style={{ padding: "96px 20px", position: "relative", overflow: "hidden" }}>
        <Aurora colorStops={["#6C5CE7","#E84393","#00CEC9"]} amplitude={0.8} blend={0.35} speed={0.5} />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom,rgba(10,10,10,0.72),rgba(10,10,10,0.88))" }} />
        <div style={{ position: "relative", zIndex: 10, maxWidth: 640, margin: "0 auto", textAlign: "center" }}>
          <div className="gradient-violet" style={{ width: 56, height: 56, borderRadius: 16, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px", boxShadow: "0 8px 32px rgba(108,92,231,0.45)" }}>
            <Heart size={26} color="#fff" strokeWidth={2.5} />
          </div>
          <h2 style={{ fontWeight: 800, color: "#fff", fontSize: "clamp(1.8rem,4vw,2.6rem)", marginBottom: 16, lineHeight: 1.15 }}>
            Take control of your health — today.
          </h2>
          <p style={{ color: "rgba(255,255,255,0.45)", marginBottom: 32, fontSize: 15, lineHeight: 1.75 }}>
            Set up takes under 8 minutes. No credit card required. Works with your existing devices.
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap", marginBottom: 32 }}>
            <Link href="/onboarding" style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "14px 32px", borderRadius: 99, fontWeight: 700, fontSize: 16, background: "linear-gradient(135deg,#6C5CE7,#A29BFE)", color: "#fff", textDecoration: "none", boxShadow: "0 8px 32px rgba(108,92,231,0.4)" }}>
              Start for Free <Zap size={17} />
            </Link>
            <Link href="/dashboard" style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "14px 32px", borderRadius: 99, fontWeight: 600, fontSize: 16, background: "rgba(255,255,255,0.09)", color: "rgba(255,255,255,0.7)", border: "1px solid rgba(255,255,255,0.18)", textDecoration: "none" }}>
              Explore Demo
            </Link>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 20, fontSize: 12, color: "rgba(255,255,255,0.3)" }}>
            {["🛡️ Secure & Encrypted","🏥 10+ Conditions","⌚ Apple Watch · Fitbit · Garmin"].map(t => (
              <span key={t}>{t}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────────────────── */}
      <footer style={{ borderTop: "1px solid rgba(255,255,255,0.08)", padding: "32px 20px" }}>
        <div style={{ maxWidth: 1000, margin: "0 auto", display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div className="gradient-violet" style={{ width: 28, height: 28, borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Heart size={13} color="#fff" strokeWidth={2.5} />
            </div>
            <span style={{ fontWeight: 700, color: "rgba(255,255,255,0.7)", fontSize: 15 }}>CuraSync</span>
            <span style={{ color: "rgba(255,255,255,0.2)", fontSize: 12 }}>v0.1.0</span>
          </div>
          <p style={{ color: "rgba(255,255,255,0.22)", fontSize: 12, textAlign: "center", maxWidth: 380 }}>
            Not a substitute for professional medical advice. Always consult your doctor.
          </p>
          <div style={{ display: "flex", gap: 20 }}>
            {["Privacy","Terms"].map(l => (
              <button
                key={l}
                onClick={() => setActiveModal(l.toLowerCase() as any)}
                style={{
                  background: "none",
                  border: "none",
                  padding: 0,
                  cursor: "pointer",
                  color: "rgba(255,255,255,0.25)",
                  fontSize: 12,
                  transition: "color 0.2s"
                }}
                onMouseEnter={e => e.currentTarget.style.color = "rgba(255,255,255,0.6)"}
                onMouseLeave={e => e.currentTarget.style.color = "rgba(255,255,255,0.25)"}
              >
                {l}
              </button>
            ))}
          </div>
        </div>
      </footer>

      {/* ── MODALS ───────────────────────────────────────────────────────── */}
      {activeModal && (
        <div style={{
          position: "fixed",
          inset: 0,
          zIndex: 9999,
          background: "rgba(0,0,0,0.7)",
          backdropFilter: "blur(8px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 20,
          animation: "ccFadeIn 0.3s ease-out"
        }} onClick={() => setActiveModal(null)}>
          <div style={{
            background: "#121212",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 24,
            width: "100%",
            maxWidth: 560,
            maxHeight: "80vh",
            display: "flex",
            flexDirection: "column",
            position: "relative",
            boxShadow: "0 20px 40px rgba(0,0,0,0.5)",
            animation: "ccSlideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)"
          }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: "24px 24px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: "#fff" }}>
                {activeModal === "privacy" ? "Privacy Policy" : "Terms of Service"}
              </h3>
              <button
                onClick={() => setActiveModal(null)}
                style={{ background: "rgba(255,255,255,0.05)", border: "none", color: "#fff", cursor: "pointer", width: 32, height: 32, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", transition: "background 0.2s" }}
                onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.1)"}
                onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.05)"}
              >
                ✕
              </button>
            </div>

            <div style={{ padding: 24, overflowY: "auto", fontSize: 14, color: "rgba(255,255,255,0.65)", lineHeight: 1.6, flex: 1 }}>
              {activeModal === "privacy" ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  <div>
                    <h4 style={{ color: "#fff", fontWeight: 600, marginBottom: 6 }}>1. Information We Collect</h4>
                    <p style={{ margin: 0 }}>We collect health metrics (such as blood glucose, blood pressure, heart rate), medication logs, and device data synced from Apple Watch, Fitbit, or Garmin, solely to display them on your dashboard.</p>
                  </div>
                  <div>
                    <h4 style={{ color: "#fff", fontWeight: 600, marginBottom: 6 }}>2. Data Security & Storage</h4>
                    <p style={{ margin: 0 }}>All medical and personal data is encrypted in transit and at rest. Access control mechanisms ensure only you and your authorized care providers can view your data.</p>
                  </div>
                  <div>
                    <h4 style={{ color: "#fff", fontWeight: 600, marginBottom: 6 }}>3. Right to Erasure</h4>
                    <p style={{ margin: 0 }}>You have complete control over your accounts. You can delete your profile and all associated medical readings at any time via the Settings page.</p>
                  </div>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  <div>
                    <h4 style={{ color: "#fff", fontWeight: 600, marginBottom: 6 }}>1. Informational Purposes Only</h4>
                    <p style={{ margin: 0 }}>CuraSync is an educational and monitoring dashboard designed to assist patients in tracking chronic health metrics. It is NOT a substitute for professional medical advice, diagnosis, or treatment.</p>
                  </div>
                  <div>
                    <h4 style={{ color: "#fff", fontWeight: 600, marginBottom: 6 }}>2. Not for Emergencies</h4>
                    <p style={{ margin: 0 }}>CuraSync is not a crisis response system. In the event of a medical emergency, please contact your local emergency response services or visit the nearest hospital immediately.</p>
                  </div>
                  <div>
                    <h4 style={{ color: "#fff", fontWeight: 600, marginBottom: 6 }}>3. Account Security</h4>
                    <p style={{ margin: 0 }}>You are responsible for securing your login credentials and tracking access permissions granted to your care providers.</p>
                  </div>
                </div>
              )}
            </div>

            <div style={{ padding: 16, borderTop: "1px solid rgba(255,255,255,0.06)", display: "flex", justifyContent: "flex-end" }}>
              <button
                onClick={() => setActiveModal(null)}
                style={{ background: "linear-gradient(135deg,#6C5CE7,#A29BFE)", border: "none", color: "#fff", fontWeight: 600, padding: "8px 20px", borderRadius: 99, cursor: "pointer" }}
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
