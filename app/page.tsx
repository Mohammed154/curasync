"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Aurora from "@/components/ui/Aurora";
import {
  Heart, Activity, Pill, MessageSquare, Brain,
  Watch, Shield, ChevronRight, Star, CheckCircle2,
  ArrowRight, Zap, BarChart3, Bell,
} from "lucide-react";
import { clsx } from "clsx";

const FEATURES = [
  { icon: Activity,    title: "Live Health Monitoring",  description: "Real-time biometric tracking from wearables and manual entry. Blood glucose, BP, heart rate — all in one dashboard.", color: "#00CEC9", bg: "#E6FAF9" },
  { icon: Brain,       title: "AI Doctor",               description: "Get instant, plain-language explanations of your readings and personalised questions to ask your care team.", color: "#6C5CE7", bg: "#F0EFF8" },
  { icon: Pill,        title: "Medication Management",   description: "Never miss a dose. Smart reminders, adherence tracking, and drug-condition conflict alerts built in.", color: "#E84393", bg: "#FFF0F7" },
  { icon: BarChart3,   title: "Glucose Tracker",         description: "Log fasting, pre-meal, post-meal and bedtime readings with context-aware status and trend charts.", color: "#F39C12", bg: "#FEF9E7" },
  { icon: MessageSquare, title: "Secure Messaging",      description: "HIPAA-compliant direct messaging with your care team. Get clinical feedback without a visit.", color: "#00B894", bg: "#E8F8F5" },
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

const TESTIMONIALS = [
  { name: "Arjun Mehta",    role: "Type 2 Diabetes · Mumbai",                     avatar: "AM", quote: "CuraSync helped me understand my glucose patterns in a way my reports never could. My HbA1c dropped from 8.2 to 7.1 in four months.", rating: 5 },
  { name: "Dr. Priya Sharma", role: "Internal Medicine · Mumbai Central Hospital", avatar: "PS", quote: "I can now monitor 40+ patients remotely and intervene before a crisis. The alert system is exactly what chronic care needed.", rating: 5 },
  { name: "Meena Joshi",    role: "Type 1 Diabetes + Thyroid · Pune",             avatar: "MJ", quote: "Managing two conditions was overwhelming. CuraSync gives me one clear view — my medications, readings, and doctor in one place.", rating: 5 },
];

const STATS = [
  { value: "10+",    label: "Chronic conditions supported" },
  { value: "87%",    label: "Average medication adherence" },
  { value: "< 2s",   label: "Alert delivery time"          },
  { value: "HIPAA",  label: "Compliant + DPDP Act 2023"    },
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
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#00B894", display: "inline-block", animation: "pulse 2s infinite" }} />
            <span style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.8)", letterSpacing: "0.08em", textTransform: "uppercase" }}>HIPAA Compliant · DPDP Act 2023</span>
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
              {["Real-time patient vitals panel","Per-patient alert threshold customisation","7-day adherence from actual dose logs","HIPAA-compliant patient messaging","One-click clinical PDF export","Symptom frequency heatmaps"].map(item => (
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

      {/* ── TESTIMONIALS ─────────────────────────────────────────────────── */}
      <section style={{ padding: "96px 20px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
        <div style={{ maxWidth: 1000, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 52 }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: "#E84393", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12 }}>Real stories</p>
            <h2 style={{ fontWeight: 800, color: "#fff", fontSize: "clamp(1.8rem,4vw,2.4rem)" }}>Trusted by patients and doctors</h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 16 }}>
            {TESTIMONIALS.map(t => (
              <div key={t.name} style={{ borderRadius: 20, padding: 24, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)", display: "flex", flexDirection: "column" }}>
                <div style={{ display: "flex", gap: 3, marginBottom: 16 }}>
                  {Array.from({ length: t.rating }).map((_, i) => (
                    <Star key={i} size={13} color="#FBBF24" fill="#FBBF24" />
                  ))}
                </div>
                <p style={{ color: "rgba(255,255,255,0.65)", fontSize: 13, lineHeight: 1.75, flex: 1, marginBottom: 20 }}>
                  &ldquo;{t.quote}&rdquo;
                </p>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 36, height: 36, borderRadius: "50%", background: "linear-gradient(135deg,#6C5CE7,#E84393)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: 11, flexShrink: 0 }}>
                    {t.avatar}
                  </div>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 600, color: "#fff" }}>{t.name}</p>
                    <p style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

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
            {["🔒 HIPAA Compliant","🇮🇳 DPDP Act 2023","🏥 10+ Conditions","⌚ Apple Watch · Fitbit · Garmin"].map(t => (
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
            {["Privacy","Terms","HIPAA"].map(l => (
              <a key={l} href="#" style={{ color: "rgba(255,255,255,0.25)", fontSize: 12, textDecoration: "none" }}>{l}</a>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
