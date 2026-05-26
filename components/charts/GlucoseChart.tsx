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
import type { SparklinePoint } from "@/types";

interface GlucoseChartProps {
  data: SparklinePoint[];
  targetMin?: number;
  targetMax?: number;
}

interface TooltipPayload {
  value: number;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayload[];
  label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  const val = payload[0]?.value;
  if (val === undefined) return null;

  const inRange = val >= 70 && val <= 180;
  return (
    <div className="bg-bg-card rounded-lg px-3 py-2 shadow-card border border-divider text-xs">
      <p className="text-text-tertiary mb-0.5">{label}</p>
      <p
        className="font-bold metric-value"
        style={{ color: inRange ? "#00B894" : "#E17055", fontSize: "14px" }}
      >
        {val} <span className="font-normal text-text-tertiary">mg/dL</span>
      </p>
    </div>
  );
}

export default function GlucoseChart({
  data,
  targetMin = 70,
  targetMax = 180,
}: GlucoseChartProps) {
  const formatted = data.map((d) => ({
    ...d,
    label: format(new Date(d.time), "ha"),
  }));

  // Show every 4th label on x-axis
  const tickFormatter = (_: string, index: number) =>
    index % 4 === 0 ? formatted[index]?.label ?? "" : "";

  return (
    <div className="bg-bg-card rounded-lg p-4 shadow-card card-enter">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-title-md text-text-primary">
            Blood Glucose
          </h3>
          <p className="text-xs text-text-tertiary mt-0.5">24-hour trend</p>
        </div>
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
      </div>

      <ResponsiveContainer width="100%" height={160}>
        <AreaChart data={formatted} margin={{ top: 8, right: 4, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="glucoseGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#00CEC9" stopOpacity={0.25} />
              <stop offset="95%" stopColor="#00CEC9" stopOpacity={0.02} />
            </linearGradient>
          </defs>

          <CartesianGrid
            strokeDasharray="3 3"
            vertical={false}
            stroke="#E2E0F0"
            strokeOpacity={0.6}
          />

          {/* Target range reference band */}
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

          <XAxis
            dataKey="label"
            tickFormatter={tickFormatter}
            tick={{ fontSize: 11, fill: "#8888A8" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            domain={[50, 250]}
            tick={{ fontSize: 11, fill: "#8888A8" }}
            axisLine={false}
            tickLine={false}
            tickCount={5}
          />

          <Tooltip content={<CustomTooltip />} />

          <Area
            type="monotoneX"
            dataKey="value"
            stroke="#00CEC9"
            strokeWidth={2}
            fill="url(#glucoseGradient)"
            dot={false}
            activeDot={{
              r: 4,
              fill: "#00CEC9",
              stroke: "#fff",
              strokeWidth: 2,
            }}
          />
        </AreaChart>
      </ResponsiveContainer>

      {/* Reference range legend */}
      <p className="text-xs text-text-tertiary text-center mt-2">
        Target range: {targetMin}–{targetMax} mg/dL
      </p>
    </div>
  );
}
