"use client";

// ─── GlucoseLogChart ─────────────────────────────────────────────────────────
// Dual-panel chart ported from the Python glucose tracker matplotlib script.
// Panel 1: Glucose line with color-coded dots per reading type + reference lines
// Panel 2: Insulin (units) & Carbs (grams) bar chart (auto-hidden when no data)
// Plus a summary stats strip and an expandable log table.

import React, { useState, useMemo } from "react";
import {
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  Cell,
  Scatter,
  Area,
  Legend,
} from "recharts";
import { format } from "date-fns";
import { clsx } from "clsx";
import { ChevronDown, ChevronUp, TrendingUp, TrendingDown, Minus, Activity } from "lucide-react";
import type {
  GlucoseLogEntry,
  GlucoseStatus,
} from "@/lib/glucose-utils";
import {
  computeGlucoseStats,
  STATUS_COLORS,
  STATUS_BG_COLORS,
  GLUCOSE_RANGES,
} from "@/lib/glucose-utils";

// ─── Props ───────────────────────────────────────────────────────────────────

interface GlucoseLogChartProps {
  entries: GlucoseLogEntry[];
  /** Show the insulin/carbs secondary chart */
  showSecondaryChart?: boolean;
  /** Show the summary log table below */
  showLogTable?: boolean;
  /** Chart height for the primary glucose panel */
  chartHeight?: number;
}

// ─── Glucose Tooltip ─────────────────────────────────────────────────────────

interface GlucoseTooltipPayload {
  value: number;
  dataKey: string;
  payload: ChartDataPoint;
}

interface GlucoseTooltipProps {
  active?: boolean;
  payload?: GlucoseTooltipPayload[];
  label?: string;
}

function GlucoseTooltip({ active, payload }: GlucoseTooltipProps) {
  if (!active || !payload?.length) return null;

  const point = payload[0]?.payload;
  if (!point) return null;

  return (
    <div
      className="rounded-xl px-3.5 py-2.5 shadow-card border text-xs"
      style={{
        background: "#FFFFFF",
        borderColor: "#E2E0F0",
        minWidth: "140px",
      }}
    >
      <p className="text-text-tertiary mb-1 font-medium">{point.datetime}</p>
      <div className="flex items-center gap-2 mb-1">
        <span
          className="w-2 h-2 rounded-full flex-shrink-0"
          style={{ background: point.color }}
        />
        <span
          className="font-bold text-sm metric-value"
          style={{ color: point.color }}
        >
          {point.glucose} <span className="font-normal text-text-tertiary">mg/dL</span>
        </span>
      </div>
      <p className="text-text-tertiary">
        {point.readingType} · <span style={{ color: point.color }}>{point.status}</span>
      </p>
      {(point.insulin !== undefined && point.insulin > 0) && (
        <p className="text-text-secondary mt-0.5">💉 {point.insulin}u insulin</p>
      )}
      {(point.carbs !== undefined && point.carbs > 0) && (
        <p className="text-text-secondary mt-0.5">🍞 {point.carbs}g carbs</p>
      )}
    </div>
  );
}

// ─── Secondary Tooltip (Insulin & Carbs) ─────────────────────────────────────

interface SecondaryTooltipPayload {
  value: number;
  dataKey: string;
  payload: ChartDataPoint;
}

interface SecondaryTooltipProps {
  active?: boolean;
  payload?: SecondaryTooltipPayload[];
}

function SecondaryTooltip({ active, payload }: SecondaryTooltipProps) {
  if (!active || !payload?.length) return null;
  const point = payload[0]?.payload;
  if (!point) return null;

  return (
    <div
      className="rounded-xl px-3.5 py-2.5 shadow-card border text-xs"
      style={{ background: "#FFFFFF", borderColor: "#E2E0F0" }}
    >
      <p className="text-text-tertiary mb-1">{point.label}</p>
      {payload.map((p) => (
        <p key={p.dataKey} className="text-text-primary font-medium">
          {p.dataKey === "insulin" ? "💉 Insulin: " : "🍞 Carbs: "}
          <span className="font-bold metric-value">
            {p.value}{p.dataKey === "insulin" ? "u" : "g"}
          </span>
        </p>
      ))}
    </div>
  );
}

// ─── Chart data transform ────────────────────────────────────────────────────

interface ChartDataPoint {
  index: number;
  label: string;
  datetime: string;
  glucose: number;
  readingType: string;
  status: GlucoseStatus;
  color: string;
  insulin: number;
  carbs: number;
}

function transformEntries(entries: GlucoseLogEntry[]): ChartDataPoint[] {
  return entries.map((e, i) => {
    let timeLabel: string;
    try {
      timeLabel = format(new Date(e.datetime), "HH:mm");
    } catch {
      timeLabel = e.datetime;
    }

    const shortType = e.readingType.split(" ")[0] ?? e.readingType;

    return {
      index: i,
      label: `E${i + 1}\n${shortType}`,
      datetime: timeLabel,
      glucose: e.glucose,
      readingType: e.readingType,
      status: e.status,
      color: e.color,
      insulin: e.insulin ?? 0,
      carbs: e.carbs ?? 0,
    };
  });
}

// ─── Custom dot for glucose line ─────────────────────────────────────────────

interface DotProps {
  cx?: number;
  cy?: number;
  payload?: ChartDataPoint;
}

function GlucoseDot({ cx, cy, payload }: DotProps) {
  if (cx === undefined || cy === undefined || !payload) return null;
  return (
    <g>
      {/* Outer glow */}
      <circle cx={cx} cy={cy} r={8} fill={payload.color} opacity={0.15} />
      {/* Inner dot */}
      <circle cx={cx} cy={cy} r={5} fill={payload.color} stroke="#FFFFFF" strokeWidth={2} />
    </g>
  );
}

// ─── Status legend pill ──────────────────────────────────────────────────────

function StatusLegend() {
  const items: { status: GlucoseStatus; label: string }[] = [
    { status: "Normal", label: "Normal" },
    { status: "Elevated", label: "Elevated" },
    { status: "High", label: "High" },
    { status: "Low", label: "Low" },
  ];

  return (
    <div className="flex items-center gap-3 flex-wrap">
      {items.map((item) => (
        <div key={item.status} className="flex items-center gap-1.5">
          <span
            className="w-2 h-2 rounded-full flex-shrink-0"
            style={{ background: STATUS_COLORS[item.status] }}
          />
          <span className="text-xs text-text-tertiary">{item.label}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Stat card ───────────────────────────────────────────────────────────────

interface StatCardProps {
  label: string;
  value: string;
  unit?: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
}

function StatCard({ label, value, unit, icon, color, bgColor }: StatCardProps) {
  return (
    <div
      className="rounded-xl p-3.5 flex items-center gap-3 card-enter"
      style={{ background: bgColor }}
    >
      <div
        className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ background: `${color}20` }}
      >
        {icon}
      </div>
      <div>
        <p className="text-xs text-text-tertiary">{label}</p>
        <div className="flex items-baseline gap-1">
          <span
            className="font-bold text-lg metric-value leading-none"
            style={{ color }}
          >
            {value}
          </span>
          {unit && (
            <span className="text-xs text-text-tertiary">{unit}</span>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function GlucoseLogChart({
  entries,
  showSecondaryChart = true,
  showLogTable = true,
  chartHeight = 220,
}: GlucoseLogChartProps) {
  const [tableExpanded, setTableExpanded] = useState(false);

  const chartData = useMemo(() => transformEntries(entries), [entries]);
  const stats = useMemo(() => computeGlucoseStats(entries), [entries]);

  const hasInsulin = entries.some((e) => e.insulin !== undefined && e.insulin > 0);
  const hasCarbs = entries.some((e) => e.carbs !== undefined && e.carbs > 0);
  const showSecondary = showSecondaryChart && (hasInsulin || hasCarbs);

  const avgLine = stats.avg;

  // Determine trend from first half vs second half
  const trend = useMemo(() => {
    if (entries.length < 4) return "stable";
    const mid = Math.floor(entries.length / 2);
    const firstHalf = entries.slice(0, mid).reduce((a, e) => a + e.glucose, 0) / mid;
    const secondHalf = entries.slice(mid).reduce((a, e) => a + e.glucose, 0) / (entries.length - mid);
    const diff = secondHalf - firstHalf;
    if (diff > 10) return "up";
    if (diff < -10) return "down";
    return "stable";
  }, [entries]);

  if (entries.length === 0) {
    return (
      <div className="bg-bg-card rounded-xl p-6 shadow-card text-center">
        <Activity size={32} className="mx-auto text-text-tertiary mb-2" />
        <p className="text-text-tertiary text-sm">No glucose entries to display.</p>
        <p className="text-text-tertiary text-xs mt-1">Log your first reading to see your glucose trend.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* ── Summary Stats Strip ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          label="Average"
          value={`${stats.avg}`}
          unit="mg/dL"
          icon={<Activity size={16} style={{ color: "#6C5CE7" }} />}
          color="#6C5CE7"
          bgColor="#F0EFF8"
        />
        <StatCard
          label="In Range"
          value={`${stats.inRangePercent}%`}
          icon={
            trend === "down" ? (
              <TrendingDown size={16} style={{ color: STATUS_COLORS.Normal }} />
            ) : trend === "up" ? (
              <TrendingUp size={16} style={{ color: STATUS_COLORS.Elevated }} />
            ) : (
              <Minus size={16} style={{ color: STATUS_COLORS.Normal }} />
            )
          }
          color={stats.inRangePercent >= 70 ? STATUS_COLORS.Normal : STATUS_COLORS.Elevated}
          bgColor={stats.inRangePercent >= 70 ? STATUS_BG_COLORS.Normal : STATUS_BG_COLORS.Elevated}
        />
        <StatCard
          label="Lowest"
          value={`${stats.min}`}
          unit="mg/dL"
          icon={<TrendingDown size={16} style={{ color: "#74B9FF" }} />}
          color="#74B9FF"
          bgColor="#EBF5FB"
        />
        <StatCard
          label="Highest"
          value={`${stats.max}`}
          unit="mg/dL"
          icon={<TrendingUp size={16} style={{ color: STATUS_COLORS.High }} />}
          color={STATUS_COLORS.High}
          bgColor={STATUS_BG_COLORS.High}
        />
      </div>

      {/* ── Primary: Glucose Chart ───────────────────────────────────────── */}
      <div className="bg-bg-card rounded-xl shadow-card overflow-hidden card-enter">
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <div>
            <h3 className="font-semibold text-title-md text-text-primary">
              Blood Glucose Log
            </h3>
            <p className="text-xs text-text-tertiary mt-0.5">
              {stats.count} entries · Avg {stats.avg} mg/dL
            </p>
          </div>
          <StatusLegend />
        </div>

        <div className="px-2 pb-3">
          <ResponsiveContainer width="100%" height={chartHeight}>
            <ComposedChart
              data={chartData}
              margin={{ top: 12, right: 16, left: -8, bottom: 4 }}
            >
              <defs>
                <linearGradient id="glucoseLogGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00CEC9" stopOpacity={0.18} />
                  <stop offset="95%" stopColor="#00CEC9" stopOpacity={0.02} />
                </linearGradient>
              </defs>

              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="#E2E0F0"
                strokeOpacity={0.6}
              />

              {/* Reference lines matching the Python script */}
              <ReferenceLine
                y={140}
                stroke={STATUS_COLORS.Elevated}
                strokeDasharray="6 4"
                strokeWidth={1}
                strokeOpacity={0.6}
                label={{
                  value: "140",
                  position: "right",
                  fontSize: 10,
                  fill: "#8888A8",
                }}
              />
              <ReferenceLine
                y={70}
                stroke={STATUS_COLORS.Low}
                strokeDasharray="6 4"
                strokeWidth={1}
                strokeOpacity={0.6}
                label={{
                  value: "70",
                  position: "right",
                  fontSize: 10,
                  fill: "#8888A8",
                }}
              />
              <ReferenceLine
                y={avgLine}
                stroke="#A29BFE"
                strokeDasharray="3 3"
                strokeWidth={1}
                strokeOpacity={0.5}
                label={{
                  value: `Avg ${Math.round(avgLine)}`,
                  position: "left",
                  fontSize: 10,
                  fill: "#A29BFE",
                }}
              />

              <XAxis
                dataKey="datetime"
                tick={{ fontSize: 11, fill: "#8888A8" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                domain={[40, "auto"]}
                tick={{ fontSize: 11, fill: "#8888A8" }}
                axisLine={false}
                tickLine={false}
                tickCount={5}
              />

              <Tooltip content={<GlucoseTooltip />} />

              {/* Gradient area fill */}
              <Area
                type="monotone"
                dataKey="glucose"
                fill="url(#glucoseLogGradient)"
                stroke="none"
              />

              {/* Line */}
              <Line
                type="monotone"
                dataKey="glucose"
                stroke="#00CEC9"
                strokeWidth={2.5}
                dot={<GlucoseDot />}
                activeDot={false}
                connectNulls
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Target range footer */}
        <div className="px-4 pb-3 flex items-center justify-between">
          <p className="text-xs text-text-tertiary">
            Target range: 70–140 mg/dL
          </p>
          <div className="flex items-center gap-1 text-xs">
            {trend === "down" && (
              <>
                <TrendingDown size={12} className="text-status-green" />
                <span className="text-status-green font-medium">Improving</span>
              </>
            )}
            {trend === "up" && (
              <>
                <TrendingUp size={12} style={{ color: STATUS_COLORS.Elevated }} />
                <span style={{ color: STATUS_COLORS.Elevated }} className="font-medium">
                  Trending up
                </span>
              </>
            )}
            {trend === "stable" && (
              <>
                <Minus size={12} className="text-text-tertiary" />
                <span className="text-text-tertiary font-medium">Stable</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Secondary: Insulin & Carbs Chart ────────────────────────────── */}
      {showSecondary && (
        <div className="bg-bg-card rounded-xl shadow-card overflow-hidden card-enter">
          <div className="px-4 pt-4 pb-2">
            <h3 className="font-semibold text-title-md text-text-primary">
              Insulin & Carbs
            </h3>
            <p className="text-xs text-text-tertiary mt-0.5">
              Medication and intake alongside glucose readings
            </p>
          </div>

          <div className="px-2 pb-3">
            <ResponsiveContainer width="100%" height={160}>
              <ComposedChart
                data={chartData}
                margin={{ top: 8, right: 16, left: -8, bottom: 4 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="#E2E0F0"
                  strokeOpacity={0.6}
                />

                <XAxis
                  dataKey="datetime"
                  tick={{ fontSize: 11, fill: "#8888A8" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "#8888A8" }}
                  axisLine={false}
                  tickLine={false}
                />

                <Tooltip content={<SecondaryTooltip />} />

                {hasInsulin && (
                  <Bar
                    dataKey="insulin"
                    name="Insulin (units)"
                    fill="#818CF8"
                    opacity={0.85}
                    radius={[4, 4, 0, 0]}
                    barSize={20}
                  />
                )}

                {hasCarbs && (
                  <Bar
                    dataKey="carbs"
                    name="Carbs (g)"
                    fill="#A78BFA"
                    opacity={0.55}
                    radius={[4, 4, 0, 0]}
                    barSize={20}
                  />
                )}
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* Legend */}
          <div className="px-4 pb-3 flex items-center gap-4">
            {hasInsulin && (
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-2 rounded-sm" style={{ background: "#818CF8", opacity: 0.85 }} />
                <span className="text-xs text-text-tertiary">Insulin (units)</span>
              </div>
            )}
            {hasCarbs && (
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-2 rounded-sm" style={{ background: "#A78BFA", opacity: 0.55 }} />
                <span className="text-xs text-text-tertiary">Carbs (g)</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Log Table ───────────────────────────────────────────────────── */}
      {showLogTable && entries.length > 0 && (
        <div className="bg-bg-card rounded-xl shadow-card overflow-hidden card-enter">
          <button
            onClick={() => setTableExpanded(!tableExpanded)}
            className="w-full flex items-center justify-between px-4 py-3 hover:bg-bg-light transition-colors"
            aria-expanded={tableExpanded}
          >
            <h3 className="font-semibold text-title-md text-text-primary">
              Reading Log
            </h3>
            <div className="flex items-center gap-2">
              <span className="text-xs text-text-tertiary">
                {entries.length} entries
              </span>
              {tableExpanded ? (
                <ChevronUp size={16} className="text-text-tertiary" />
              ) : (
                <ChevronDown size={16} className="text-text-tertiary" />
              )}
            </div>
          </button>

          {tableExpanded && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-t border-b border-divider bg-bg-light">
                    <th className="text-left px-4 py-2 text-xs font-semibold text-text-tertiary">#</th>
                    <th className="text-left px-4 py-2 text-xs font-semibold text-text-tertiary">Time</th>
                    <th className="text-left px-4 py-2 text-xs font-semibold text-text-tertiary">Type</th>
                    <th className="text-right px-4 py-2 text-xs font-semibold text-text-tertiary">Glucose</th>
                    <th className="text-center px-4 py-2 text-xs font-semibold text-text-tertiary">Status</th>
                    {hasInsulin && (
                      <th className="text-right px-4 py-2 text-xs font-semibold text-text-tertiary">Insulin</th>
                    )}
                    {hasCarbs && (
                      <th className="text-right px-4 py-2 text-xs font-semibold text-text-tertiary">Carbs</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry, i) => {
                    let timeStr: string;
                    try {
                      timeStr = format(new Date(entry.datetime), "dd/MM HH:mm");
                    } catch {
                      timeStr = entry.datetime;
                    }

                    return (
                      <tr
                        key={entry.id}
                        className={clsx(
                          "border-b border-divider last:border-0 hover:bg-bg-light/50 transition-colors",
                        )}
                      >
                        <td className="px-4 py-2.5 text-text-tertiary text-xs">{i + 1}</td>
                        <td className="px-4 py-2.5 text-text-secondary text-xs metric-value">{timeStr}</td>
                        <td className="px-4 py-2.5">
                          <span
                            className="text-xs font-medium px-2 py-0.5 rounded-full"
                            style={{
                              background: `${entry.color}15`,
                              color: entry.color,
                            }}
                          >
                            {entry.readingType}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          <span
                            className="font-bold metric-value"
                            style={{ color: entry.color }}
                          >
                            {entry.glucose}
                          </span>
                          <span className="text-text-tertiary text-xs ml-0.5">mg/dL</span>
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          <span
                            className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full"
                            style={{
                              background: STATUS_BG_COLORS[entry.status],
                              color: STATUS_COLORS[entry.status],
                            }}
                          >
                            <span
                              className="w-1.5 h-1.5 rounded-full"
                              style={{ background: STATUS_COLORS[entry.status] }}
                            />
                            {entry.status}
                          </span>
                        </td>
                        {hasInsulin && (
                          <td className="px-4 py-2.5 text-right text-xs text-text-secondary metric-value">
                            {entry.insulin ? `${entry.insulin}u` : "—"}
                          </td>
                        )}
                        {hasCarbs && (
                          <td className="px-4 py-2.5 text-right text-xs text-text-secondary metric-value">
                            {entry.carbs ? `${entry.carbs}g` : "—"}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Summary row */}
              <div className="px-4 py-3 bg-bg-light border-t border-divider flex items-center justify-between">
                <span className="text-xs text-text-tertiary">
                  Average: <span className="font-bold text-text-primary metric-value">{stats.avg} mg/dL</span>
                </span>
                <span className="text-xs text-text-tertiary">
                  Total: <span className="font-semibold text-text-primary">{stats.count} entries</span>
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
