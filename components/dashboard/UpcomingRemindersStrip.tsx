"use client";

import React from "react";
import { Clock, CheckCircle2, AlertCircle } from "lucide-react";
import { clsx } from "clsx";
import { conditionColors } from "@/lib/design-tokens";
import type { ConditionId } from "@/types";

interface UpcomingDose {
  id: string;
  medicationName: string;
  dosage: string;
  scheduledAt: string; // "HH:mm"
  conditionId: ConditionId;
  minutesUntil: number; // negative = overdue
  status: "upcoming" | "due_now" | "overdue";
}

interface UpcomingRemindersStripProps {
  doses: UpcomingDose[];
  onMarkTaken?: (id: string) => void;
}

// Mock upcoming doses — replaced by real schedule in production
export const MOCK_UPCOMING_DOSES: UpcomingDose[] = [
  {
    id: "u1",
    medicationName: "Lisinopril",
    dosage: "10mg",
    scheduledAt: "21:00",
    conditionId: "hypertension",
    minutesUntil: 45,
    status: "upcoming",
  },
  {
    id: "u2",
    medicationName: "Metformin",
    dosage: "500mg",
    scheduledAt: "21:00",
    conditionId: "diabetes_t2",
    minutesUntil: 45,
    status: "upcoming",
  },
  {
    id: "u3",
    medicationName: "Calcitriol",
    dosage: "0.25mcg",
    scheduledAt: "22:00",
    conditionId: "ckd",
    minutesUntil: 105,
    status: "upcoming",
  },
];

function formatTimeUntil(minutes: number): string {
  if (minutes < 0) return `${Math.abs(minutes)}m overdue`;
  if (minutes === 0) return "Due now";
  if (minutes < 60) return `in ${minutes}m`;
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `in ${hrs}h ${mins}m` : `in ${hrs}h`;
}

export default function UpcomingRemindersStrip({
  doses,
  onMarkTaken,
}: UpcomingRemindersStripProps) {
  if (doses.length === 0) {
    return (
      <div className="bg-bg-card rounded-xl shadow-card px-4 py-4 card-enter">
        <div className="flex items-center gap-2 mb-2">
          <Clock size={16} className="text-accent-violet" aria-hidden="true" />
          <h3 className="font-semibold text-title-md text-text-primary">Upcoming Reminders</h3>
        </div>
        <div className="flex items-center gap-2 py-3">
          <CheckCircle2 size={18} className="text-status-green" aria-hidden="true" />
          <p className="text-label-sm text-text-secondary">All doses taken for today — great work! 🎉</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-bg-card rounded-xl shadow-card overflow-hidden card-enter">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <div className="flex items-center gap-2">
          <Clock size={16} className="text-accent-violet" aria-hidden="true" />
          <h3 className="font-semibold text-title-md text-text-primary">Next Doses</h3>
        </div>
        <span className="text-xs text-text-tertiary">{doses.length} upcoming</span>
      </div>

      {/* Dose cards — horizontal scroll on mobile */}
      <div className="flex gap-3 px-4 pb-4 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
        {doses.slice(0, 3).map((dose) => {
          const c = conditionColors[dose.conditionId];
          const isOverdue = dose.status === "overdue";
          const isDueNow = dose.status === "due_now";

          return (
            <div
              key={dose.id}
              className={clsx(
                "flex-shrink-0 w-44 rounded-xl p-3 border-2 transition-all",
                isOverdue
                  ? "border-status-red/40 bg-status-red-bg"
                  : isDueNow
                  ? "border-accent-violet/40 bg-bg-lavender"
                  : "border-divider bg-bg-light"
              )}
              role="listitem"
              aria-label={`${dose.medicationName} ${dose.dosage} ${formatTimeUntil(dose.minutesUntil)}`}
            >
              {/* Condition badge */}
              <div className="flex items-center justify-between mb-2">
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-sm"
                  style={{ background: c?.bg }}
                  aria-hidden="true"
                >
                  {c?.emoji}
                </div>
                {isOverdue && (
                  <AlertCircle size={14} className="text-status-red" aria-label="Overdue" />
                )}
                {isDueNow && (
                  <span className="w-2 h-2 rounded-full bg-accent-violet animate-pulse" aria-label="Due now" />
                )}
              </div>

              {/* Med info */}
              <p className="font-semibold text-label-sm text-text-primary leading-tight truncate">
                {dose.medicationName}
              </p>
              <p className="text-xs text-text-tertiary">{dose.dosage}</p>

              {/* Time */}
              <p
                className={clsx(
                  "text-xs font-semibold mt-1.5",
                  isOverdue ? "text-status-red" : isDueNow ? "text-accent-violet" : "text-text-secondary"
                )}
              >
                {formatTimeUntil(dose.minutesUntil)}
              </p>
              <p className="text-xs text-text-tertiary">{dose.scheduledAt}</p>

              {/* Mark taken button */}
              {onMarkTaken && (isDueNow || isOverdue) && (
                <button
                  onClick={() => onMarkTaken(dose.id)}
                  className={clsx(
                    "w-full mt-2 py-1.5 rounded-lg text-xs font-semibold transition-all",
                    isOverdue
                      ? "bg-status-red text-white hover:opacity-80"
                      : "gradient-violet text-white hover:opacity-90"
                  )}
                  aria-label={`Mark ${dose.medicationName} as taken`}
                >
                  Mark taken
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
