"use client";

import React from "react";
import { formatDistanceToNow } from "date-fns";
import { clsx } from "clsx";
import type { ProviderPatientRow } from "@/types";
import { conditionColors } from "@/lib/design-tokens";
import { AlertTriangle, ChevronRight } from "lucide-react";

interface PatientRowProps {
  patient: ProviderPatientRow;
  onClick?: () => void;
}

const ALERT_STATUS = {
  green: { bg: "#E8F8F5", text: "#00B894", label: "Stable",   dot: "#00B894" },
  amber: { bg: "#FEF9E7", text: "#F39C12", label: "Monitor",  dot: "#FDCB6E" },
  red:   { bg: "#FDECEA", text: "#D63031", label: "Urgent",   dot: "#D63031" },
};

export default function PatientRow({ patient, onClick }: PatientRowProps) {
  const s = ALERT_STATUS[patient.alertStatus];

  const adherenceColor =
    patient.adherenceScore >= 80
      ? "#00B894"
      : patient.adherenceScore >= 60
      ? "#F39C12"
      : "#D63031";

  return (
    <tr
      className="border-b border-divider hover:bg-bg-lavender/50 cursor-pointer transition-colors group"
      onClick={onClick}
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onClick?.()}
      role="row"
    >
      {/* Patient name + conditions */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-full gradient-violet flex items-center justify-center text-white font-semibold text-label-sm flex-shrink-0"
            aria-hidden="true"
          >
            {patient.name
              .split(" ")
              .map((n) => n[0])
              .join("")
              .slice(0, 2)}
          </div>
          <div>
            <p className="font-semibold text-label-sm text-text-primary">
              {patient.name}
            </p>
            <p className="text-xs text-text-tertiary">
              {patient.age} yrs
            </p>
          </div>
        </div>
      </td>

      {/* Conditions */}
      <td className="px-4 py-3 hidden md:table-cell">
        <div className="flex flex-wrap gap-1">
          {patient.conditions.map((cId) => {
            const c = conditionColors[cId];
            return (
              <span
                key={cId}
                className="text-xs px-2 py-0.5 rounded-full font-medium"
                style={{
                  background: c?.bg ?? "#F0EFF8",
                  color: c?.accent ?? "#6C5CE7",
                }}
              >
                {c?.emoji} {c?.label.split(" ").slice(0, 2).join(" ")}
              </span>
            );
          })}
        </div>
      </td>

      {/* Last activity */}
      <td className="px-4 py-3 hidden lg:table-cell">
        <span className="text-label-sm text-text-secondary">
          {formatDistanceToNow(new Date(patient.lastActivityDate), {
            addSuffix: true,
          })}
        </span>
      </td>

      {/* Adherence */}
      <td className="px-4 py-3 hidden sm:table-cell">
        <div className="flex items-center gap-2">
          <div className="w-16 h-1.5 bg-divider rounded-full overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{
                width: `${patient.adherenceScore}%`,
                background: adherenceColor,
              }}
            />
          </div>
          <span
            className="text-label-sm font-semibold tabular-nums"
            style={{ color: adherenceColor }}
          >
            {patient.adherenceScore}%
          </span>
        </div>
      </td>

      {/* Alerts */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <div
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full"
            style={{ background: s.bg }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: s.dot }}
              aria-hidden="true"
            />
            <span
              className="text-xs font-semibold"
              style={{ color: s.text }}
            >
              {s.label}
            </span>
            {patient.alertCount > 0 && (
              <span
                className="text-xs font-bold ml-0.5"
                style={{ color: s.text }}
                aria-label={`${patient.alertCount} active alerts`}
              >
                ({patient.alertCount})
              </span>
            )}
          </div>
        </div>
      </td>

      {/* Chevron */}
      <td className="px-3 py-3">
        <ChevronRight
          size={16}
          className="text-text-tertiary group-hover:text-accent-violet transition-colors"
          aria-hidden="true"
        />
      </td>
    </tr>
  );
}
