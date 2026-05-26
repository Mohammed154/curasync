"use client";

import React from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { clsx } from "clsx";
import type { ConditionSummary } from "@/types";

interface ConditionTileProps {
  summary: ConditionSummary;
}

const STATUS_COLORS = {
  green: { dot: "#00B894", label: "Normal",   bg: "#E8F8F5" },
  amber: { dot: "#FDCB6E", label: "Monitor",  bg: "#FEF9E7" },
  red:   { dot: "#D63031", label: "Alert",    bg: "#FDECEA" },
};

export default function ConditionTile({ summary }: ConditionTileProps) {
  const status = STATUS_COLORS[summary.status];

  const TrendIcon =
    summary.trend === "up"
      ? TrendingUp
      : summary.trend === "down"
      ? TrendingDown
      : Minus;

  const trendColor =
    summary.trend === "down"
      ? "#00B894"
      : summary.trend === "up"
      ? "#E17055"
      : "#8888A8";

  return (
    <div
      className="rounded-md p-3 flex flex-col gap-2 transition-all duration-200 hover:scale-[1.02] cursor-pointer card-enter"
      style={{ background: summary.bgColor }}
      role="article"
      aria-label={`${summary.label}: ${summary.metricValue} ${summary.unit}`}
    >
      {/* Header row */}
      <div className="flex items-center justify-between">
        <span
          className="w-7 h-7 rounded-full flex items-center justify-center text-sm flex-shrink-0"
          style={{ background: summary.color + "22" }}
          aria-hidden="true"
        >
          {summary.iconEmoji}
        </span>

        {/* Status badge */}
        <div
          className="flex items-center gap-1 px-2 py-0.5 rounded-full"
          style={{ background: status.bg }}
        >
          <span
            className="status-dot"
            style={{ background: status.dot }}
            aria-hidden="true"
          />
          <span
            className="text-xs font-semibold"
            style={{ color: status.dot }}
            aria-label={`Status: ${status.label}`}
          >
            {status.label}
          </span>
        </div>
      </div>

      {/* Metric */}
      <div>
        <p className="text-xs text-text-secondary font-medium leading-none mb-1">
          {summary.metricLabel}
        </p>
        <div className="flex items-end gap-1.5">
          <span
            className="metric-value font-bold text-text-primary"
            style={{ fontSize: "22px", lineHeight: "1.1" }}
          >
            {summary.metricValue}
          </span>
          <span className="text-xs text-text-tertiary mb-0.5">{summary.unit}</span>
        </div>
      </div>

      {/* Condition label + trend */}
      <div className="flex items-center justify-between">
        <p
          className="text-xs font-semibold truncate"
          style={{ color: summary.color }}
        >
          {summary.label}
        </p>
        <TrendIcon
          size={13}
          strokeWidth={2.5}
          style={{ color: trendColor }}
          aria-label={`Trend: ${summary.trend}`}
        />
      </div>
    </div>
  );
}
