"use client";

import React from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { format } from "date-fns";
import { Activity } from "lucide-react";
import type { SparklinePoint } from "@/types";

interface GlucoseChartProps {
  data: SparklinePoint[];
  targetMin?: number;
  targetMax?: number;
  title?: string;
  subtitle?: string;
  unit?: string;
  color?: string;
  showTargets?: boolean;
}

interface TooltipPayload {
  value: number;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayload[];
  label?: string;
  unit?: string;
  targetMin?: number;
  targetMax?: number;
  showTargets?: boolean;
}

function CustomTooltip({
  active,
  payload,
  label,
  unit = "mg/dL",
  targetMin,
  targetMax,
  showTargets = false,
}: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  const val = payload[0]?.value;
  if (val === undefined) return null;

  const hasTargets = showTargets && targetMin !== undefined && targetMax !== undefined;
  const inRange = hasTargets ? val >= targetMin && val <= targetMax : true;

  return (
    <div className="bg-bg-card rounded-lg px-3 py-2 shadow-card border border-divider text-xs">
      <p className="text-text-tertiary mb-0.5">{label}</p>
      <p
        className="font-bold metric-value"
        style={{ color: inRange ? "#00B894" : "#E17055", fontSize: "14px" }}
      >
        {val} <span className="font-normal text-text-tertiary">{unit}</span>
      </p>
    </div>
  );
}

export default function GlucoseChart({
  data,
  targetMin = 70,
  targetMax = 180,
  title = "Blood Glucose",
  subtitle = "24-hour trend",
  unit = "mg/dL",
  color = "#00CEC9",
  showTargets,
}: GlucoseChartProps) {
  // Determine if targets should be rendered
  const isDefaultGlucose = title.toLowerCase().includes("glucose") || unit.toLowerCase().includes("mg/dl");
  const enableTargets = showTargets !== undefined ? showTargets : isDefaultGlucose;

  const formatted = data.map((d) => {
    let label = d.time;
    try {
      const parsed = new Date(d.time);
      if (!isNaN(parsed.getTime())) {
        label = format(parsed, "ha");
      }
    } catch {
      // Keep original label
    }
    return {
      ...d,
      label,
    };
  });

  // Dynamic Y domain
  const values = data.map((d) => d.value).filter((v) => !isNaN(v));
  const minVal = values.length ? Math.min(...values) : 50;
  const maxVal = values.length ? Math.max(...values) : 200;

  const yDomain: [number, number] = React.useMemo(() => {
    if (enableTargets && targetMin !== undefined && targetMax !== undefined) {
      const low = Math.min(minVal, targetMin);
      const high = Math.max(maxVal, targetMax);
      return [Math.max(0, Math.floor(low * 0.8)), Math.ceil(high * 1.15)];
    }
    const padding = Math.max(1, (maxVal - minVal) * 0.2);
    return [Math.max(0, Math.floor(minVal - padding)), Math.ceil(maxVal + padding) || 10];
  }, [minVal, maxVal, targetMin, targetMax, enableTargets]);

  // Show every 4th label on x-axis
  const tickFormatter = (_: string, index: number) =>
    index % 4 === 0 ? formatted[index]?.label ?? "" : "";

  const gradientId = `trendGradient_${title.replace(/[^a-zA-Z0-9]/g, "_")}`;

  return (
    <div className="bg-bg-card rounded-lg p-4 shadow-card card-enter">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-title-md text-text-primary">
            {title}
          </h3>
          <p className="text-xs text-text-tertiary mt-0.5">{subtitle}</p>
        </div>
        {enableTargets && (
          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-accent-mint" />
              <span className="text-text-tertiary">In range</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-status-amber" />
              <span className="text-text-tertiary">Out of range</span>
            </div>
          </div>
        )}
      </div>

      {formatted.length === 0 ? (
        <div className="h-40 flex flex-col items-center justify-center text-center gap-2 text-text-tertiary">
          <Activity size={24} className="opacity-40" />
          <p className="text-xs">No {title.toLowerCase()} readings logged yet.</p>
          <p className="text-[11px] text-text-tertiary">Click &quot;Log Metric&quot; above to record your first entry.</p>
        </div>
      ) : (
        <>
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={formatted} margin={{ top: 8, right: 4, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={color} stopOpacity={0.25} />
                  <stop offset="95%" stopColor={color} stopOpacity={0.02} />
                </linearGradient>
              </defs>

              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="#E2E0F0"
                strokeOpacity={0.6}
              />

              {/* Target range reference band */}
              {enableTargets && (
                <>
                  <ReferenceLine
                    y={targetMin}
                    stroke="#FDCB6E"
                    strokeDasharray="4 4"
                    strokeWidth={1}
                    label={{ value: `${targetMin}`, position: "right", fontSize: 10, fill: "#8888A8" }}
                  />
                  <ReferenceLine
                    y={targetMax}
                    stroke="#FDCB6E"
                    strokeDasharray="4 4"
                    strokeWidth={1}
                    label={{ value: `${targetMax}`, position: "right", fontSize: 10, fill: "#8888A8" }}
                  />
                </>
              )}

              <XAxis
                dataKey="label"
                tickFormatter={tickFormatter}
                tick={{ fontSize: 11, fill: "#8888A8" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                domain={yDomain}
                tick={{ fontSize: 11, fill: "#8888A8" }}
                axisLine={false}
                tickLine={false}
                tickCount={5}
              />

              <Tooltip
                content={
                  <CustomTooltip
                    unit={unit}
                    targetMin={targetMin}
                    targetMax={targetMax}
                    showTargets={enableTargets}
                  />
                }
              />

              <Area
                type="monotoneX"
                dataKey="value"
                stroke={color}
                strokeWidth={2}
                fill={`url(#${gradientId})`}
                dot={false}
                activeDot={{
                  r: 4,
                  fill: color,
                  stroke: "#fff",
                  strokeWidth: 2,
                }}
              />
            </AreaChart>
          </ResponsiveContainer>

          {/* Reference range legend */}
          {enableTargets && (
            <p className="text-xs text-text-tertiary text-center mt-2">
              Target range: {targetMin}–{targetMax} {unit}
            </p>
          )}
        </>
      )}
    </div>
  );
}
