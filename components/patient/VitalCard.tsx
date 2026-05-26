"use client";

import React from "react";
import { clsx } from "clsx";

interface VitalCardProps {
  label: string;
  value: string;
  unit: string;
  status: "green" | "amber" | "red";
  icon: string;
  sublabel?: string;
  animate?: boolean;
}

const STATUS = {
  green: { ring: "#00B894", bg: "#E8F8F5", dot: "#00B894" },
  amber: { ring: "#FDCB6E", bg: "#FEF9E7", dot: "#F39C12" },
  red:   { ring: "#D63031", bg: "#FDECEA", dot: "#D63031" },
};

export default function VitalCard({
  label,
  value,
  unit,
  status,
  icon,
  sublabel,
  animate = false,
}: VitalCardProps) {
  const s = STATUS[status];

  return (
    <div
      className={clsx(
        "bg-bg-card rounded-lg p-3 flex flex-col gap-1.5 shadow-card card-enter",
        "hover:scale-[1.02] transition-transform duration-200 cursor-default"
      )}
      role="region"
      aria-label={`${label}: ${value} ${unit}`}
    >
      {/* Icon + status dot */}
      <div className="flex items-center justify-between">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center text-base"
          style={{ background: s.bg }}
          aria-hidden="true"
        >
          {icon}
        </div>
        <div className="flex items-center gap-1.5">
          {animate && (
            <span
              className="w-1.5 h-1.5 rounded-full animate-pulse"
              style={{ background: s.dot }}
              aria-label="Live reading"
            />
          )}
          <span
            className="w-2 h-2 rounded-full"
            style={{ background: s.dot }}
            aria-hidden="true"
          />
        </div>
      </div>

      {/* Metric value */}
      <div>
        <p className="text-xs text-text-tertiary font-medium leading-none mb-0.5">
          {label}
        </p>
        <div className="flex items-baseline gap-1">
          <span
            className="metric-value font-bold text-text-primary"
            style={{ fontSize: "24px", lineHeight: "1.1" }}
          >
            {value}
          </span>
          <span className="text-xs text-text-tertiary">{unit}</span>
        </div>
        {sublabel && (
          <p className="text-xs text-text-tertiary mt-0.5">{sublabel}</p>
        )}
      </div>

      {/* Status bar */}
      <div
        className="h-0.5 rounded-full w-full mt-1"
        style={{ background: s.ring + "33" }}
      >
        <div
          className="h-full rounded-full"
          style={{ width: "60%", background: s.ring }}
        />
      </div>
    </div>
  );
}
