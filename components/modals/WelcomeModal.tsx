"use client";

import React, { useState } from "react";
import { Activity, Pill, AlertTriangle, TrendingUp, FileText, CheckCircle2, ArrowRight, Sparkles, Loader2 } from "lucide-react";

interface WelcomeModalProps {
  isOpen: boolean;
  onDismiss: () => Promise<void> | void;
}

const HABITS = [
  {
    step: "1",
    title: "Log Daily Vitals",
    description: "Record blood pressure and blood glucose once daily to establish your baseline health trends.",
    icon: Activity,
    color: "#6C5CE7",
    bg: "rgba(108, 92, 231, 0.1)",
  },
  {
    step: "2",
    title: "Track Medication Adherence",
    description: "Mark your scheduled doses as taken so care alerts stay accurate.",
    icon: Pill,
    color: "#E84393",
    bg: "rgba(232, 67, 147, 0.1)",
  },
  {
    step: "3",
    title: "Monitor Risk Alerts",
    description: "Check color-coded flags (Normal, Moderate, Critical) whenever new readings are added.",
    icon: AlertTriangle,
    color: "#F39C12",
    bg: "rgba(243, 156, 18, 0.1)",
  },
  {
    step: "4",
    title: "Review Weekly Trends",
    description: "Inspect 7-day moving averages in the analytics tab before doctor visits.",
    icon: TrendingUp,
    color: "#00CEC9",
    bg: "rgba(0, 206, 201, 0.1)",
  },
  {
    step: "5",
    title: "Generate Clinical Summaries",
    description: "Export a 1-click clinical PDF report to share directly with your healthcare provider.",
    icon: FileText,
    color: "#00B894",
    bg: "rgba(0, 184, 148, 0.1)",
  },
];

export default function WelcomeModal({ isOpen, onDismiss }: WelcomeModalProps) {
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    setSubmitting(true);
    try {
      await onDismiss();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-lg bg-bg-card rounded-3xl p-6 sm:p-8 border border-divider shadow-2xl relative max-h-[90vh] overflow-y-auto space-y-6">
        
        {/* Header Badge */}
        <div className="text-center space-y-2 pt-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent-lavender/30 border border-accent-lavender text-accent-violet text-xs font-semibold mb-1">
            <Sparkles size={13} />
            <span>First-Time Patient Guide</span>
          </div>

          <h2 className="text-2xl font-bold text-text-primary tracking-tight">
            Welcome to CuraSync
          </h2>

          <p className="text-xs text-text-secondary max-w-sm mx-auto leading-relaxed">
            Here are 5 daily habits to keep your health on track and maximize your clinical outcomes:
          </p>
        </div>

        {/* 5 Daily Habits */}
        <div className="space-y-3">
          {HABITS.map((habit) => {
            const Icon = habit.icon;
            return (
              <div
                key={habit.step}
                className="flex items-start gap-3.5 p-3.5 rounded-2xl bg-bg-light/80 hover:bg-bg-lavender/40 border border-divider transition-all"
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 shadow-xs"
                  style={{ background: habit.bg, color: habit.color }}
                >
                  <Icon size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-xs sm:text-sm text-text-primary mb-0.5">
                    {habit.step}. {habit.title}
                  </h3>
                  <p className="text-[11px] sm:text-xs text-text-secondary leading-relaxed">
                    {habit.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Action Button */}
        <div className="pt-2">
          <button
            type="button"
            onClick={handleConfirm}
            disabled={submitting}
            className="w-full py-4 px-6 rounded-2xl gradient-violet text-white font-bold text-sm shadow-card hover:opacity-95 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 active:scale-[0.99]"
          >
            {submitting ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                <span>Entering Dashboard…</span>
              </>
            ) : (
              <>
                <span>Get Started</span>
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
