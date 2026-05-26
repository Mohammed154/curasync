"use client";

import React from "react";
import { Check, Clock, AlertCircle } from "lucide-react";
import type { TodayMedication } from "@/types";
import { conditionColors } from "@/lib/design-tokens";

interface MedicationCardProps {
  readonly medications: TodayMedication[];
  readonly onLogDose?: (id: string, status: TodayMedication["status"]) => void;
}

const STATUS_CONFIG = {
  taken:   { icon: Check,        color: "#00B894", bg: "#E8F8F5", label: "Taken" },
  pending: { icon: Clock,        color: "#A29BFE", bg: "#F0EFF8", label: "Pending" },
  missed:  { icon: AlertCircle,  color: "#D63031", bg: "#FDECEA", label: "Missed" },
};

export default function MedicationCard({
  medications,
  onLogDose,
}: MedicationCardProps) {
  const taken = medications.filter((m) => m.status === "taken").length;
  const total = medications.length;
  const pct = total > 0 ? Math.round((taken / total) * 100) : 0;
  const progressColor = pct >= 80 ? "#00B894" : pct >= 50 ? "#FDCB6E" : "#D63031";

  return (
    <div className="bg-bg-card rounded-lg p-4 shadow-card card-enter">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-title-md text-text-primary">
          Today&apos;s Medications
        </h3>
        <div className="flex items-center gap-2">
          <span className="text-label-sm font-semibold text-accent-violet">
            {taken}/{total}
          </span>
          <div className="w-16 h-1.5 bg-divider rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${pct}%`,
                background: progressColor,
              }}
            />
          </div>
        </div>
      </div>

      {/* Medication list */}
      <ul className="space-y-2">
        {medications.map((med) => {
          const cfg = STATUS_CONFIG[med.status];
          const StatusIcon = cfg.icon;
          const condColor = conditionColors[med.conditionId];

          return (
            <li
              key={med.id}
              className="flex items-center gap-3 py-2 border-b border-divider last:border-0"
            >
              {/* Condition colour indicator */}
              <div
                className="w-1.5 h-8 rounded-full flex-shrink-0"
                style={{ background: condColor?.accent ?? "#A29BFE" }}
                aria-hidden="true"
              />

              {/* Name + time */}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-label-sm text-text-primary truncate">
                  {med.name}{" "}
                  <span className="font-normal text-text-tertiary">{med.dosage}</span>
                </p>
                <p className="text-xs text-text-tertiary">{med.scheduledAt}</p>
              </div>

              {/* Status badge */}
              <div
                className="flex items-center gap-1 px-2 py-1 rounded-full flex-shrink-0"
                style={{ background: cfg.bg }}
              >
                <StatusIcon
                  size={12}
                  style={{ color: cfg.color }}
                  strokeWidth={2.5}
                  aria-hidden="true"
                />
                <span className="text-xs font-semibold" style={{ color: cfg.color }}>
                  {cfg.label}
                </span>
              </div>

              {/* Log button for pending */}
              {med.status === "pending" && onLogDose && (
                <button
                  onClick={() => onLogDose(med.id, "taken")}
                  className="text-xs font-semibold text-accent-violet hover:text-accent-lavender transition-colors px-2 py-1 rounded-lg hover:bg-bg-lavender flex-shrink-0"
                  aria-label={`Mark ${med.name} as taken`}
                >
                  Mark taken
                </button>
              )}            </li>
          );
        })}
      </ul>
    </div>
  );
}
