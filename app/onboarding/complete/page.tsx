"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Heart, CheckCircle2, ArrowRight, Sparkles } from "lucide-react";
import { clsx } from "clsx";

const CHECKLIST = [
  { label: "Conditions selected", done: true },
  { label: "Baseline metrics entered", done: true },
  { label: "Medications added", done: true },
  { label: "Wearable connected", done: true },
];

export default function OnboardingCompletePage() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 100);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="min-h-screen gradient-dark flex flex-col items-center justify-center px-4 py-10">
      <div className={clsx("w-full max-w-sm text-center transition-all duration-700", visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8")}>

        {/* Orb / celebration graphic */}
        <div className="relative w-32 h-32 mx-auto mb-8" aria-hidden="true">
          <div className="absolute inset-0 rounded-full animate-ping"
            style={{ background: "rgba(108,92,231,0.2)", animationDuration: "2s" }} />
          <div className="absolute inset-2 rounded-full"
            style={{ background: "conic-gradient(from 0deg, #6c5ce7, #a29bfe, #e84393, #00cec9, #6c5ce7)", animation: "orbSpin 6s linear infinite" }} />
          <div className="absolute inset-4 rounded-full flex items-center justify-center"
            style={{ background: "rgba(10,10,10,0.7)" }}>
            <Heart size={28} className="text-white" strokeWidth={2.5} />
          </div>
        </div>

        <div className="mb-8">
          <p className="text-accent-lavender text-xs font-semibold uppercase tracking-widest mb-2">Setup complete 🎉</p>
          <h1 className="text-white font-bold mb-3" style={{ fontSize: "clamp(28px, 6vw, 36px)", lineHeight: 1.15 }}>
            You&apos;re all set,<br />Arjun!
          </h1>
          <p className="text-white/60 text-sm leading-relaxed">
            CuraSync is now configured for your 3 conditions. Your dashboard is ready with live metrics and personalised alerts.
          </p>
        </div>

        {/* Checklist */}
        <div className="space-y-2 mb-8 text-left">
          {CHECKLIST.map((item, i) => (
            <div key={i}
              className={clsx(
                "flex items-center gap-3 px-4 py-3 rounded-xl transition-all",
                item.done ? "bg-white/8" : "bg-white/4"
              )}
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <CheckCircle2 size={18} style={{ color: item.done ? "#00B894" : "#444" }} aria-hidden="true" />
              <span className={clsx("text-sm font-medium", item.done ? "text-white" : "text-white/30")}>
                {item.label}
              </span>
            </div>
          ))}
        </div>

        {/* CTA */}
        <Link
          href="/dashboard"
          className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl gradient-violet text-white font-bold text-body-md shadow-lg hover:opacity-90 transition-opacity mb-4"
        >
          Go to My Dashboard
          <ArrowRight size={20} aria-hidden="true" />
        </Link>

        <p className="text-white/30 text-xs">
          You can update any settings from the sidebar at any time.
        </p>
      </div>

      <style>{`
        @keyframes orbSpin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
