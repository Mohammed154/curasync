"use client";

import React, { useState, useCallback } from "react";
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceLine, ResponsiveContainer,
  Cell, Legend,
} from "recharts";
import { Plus, Trash2, TrendingUp, Activity, Pill, Wheat } from "lucide-react";
import { clsx } from "clsx";

// ─── Mirror of Python GLUCOSE_RANGES ──────────────────────────────────────────
type ReadingType = "Fasting" | "Before Meal" | "After Meal" | "Bedtime";

const GLUCOSE_RANGES: Record<ReadingType, { low: number; normal: number; warn: number }> = {
  "Fasting":     { low: 70, normal: 100, warn: 126 },
  "Before Meal": { low: 70, normal: 130, warn: 180 },
  "After Meal":  { low: 70, normal: 140, warn: 200 },
  "Bedtime":     { low: 100, normal: 140, warn: 180 },
};

const READING_TYPES: ReadingType[] = ["Fasting", "Before Meal", "After Meal", "Bedtime"];

// ─── Mirror of Python get_status() ────────────────────────────────────────────
function getStatus(glucose: number, type: ReadingType): {
  label: "Low" | "Normal" | "Elevated" | "High";
  color: string;
  bg: string;
} {
  const r = GLUCOSE_RANGES[type];
  if (glucose < r.low)        return { label: "Low",      color: "#38bdf8", bg: "#0c2a3a" };
  if (glucose <= r.normal)    return { label: "Normal",   color: "#22c55e", bg: "#052e16" };
  if (glucose <= r.warn)      return { label: "Elevated", color: "#f97316", bg: "#2c1503" };
  return                             { label: "High",     color: "#ef4444", bg: "#2c0404" };
}

// ─── Entry type ───────────────────────────────────────────────────────────────
interface GlucoseEntry {
  id: string;
  label: string;         // "E1\nFasting"
  shortLabel: string;    // "E1"
  datetime: string;
  glucose: number;
  readingType: ReadingType;
  insulin: number | null;
  carbs: number | null;
  status: ReturnType<typeof getStatus>;
}

// ─── Custom dark tooltip ──────────────────────────────────────────────────────
interface TooltipProps {
  active?: boolean;
  payload?: Array<{ value: number; dataKey: string; payload: GlucoseEntry }>;
  label?: string;
}

function GlucoseTooltip({ active, payload }: TooltipProps) {
  if (!active || !payload?.length) return null;
  const entry = payload[0]?.payload;
  if (!entry) return null;
  const s = entry.status;
  return (
    <div style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 8, padding: "10px 14px" }}>
      <p style={{ color: "#94a3b8", fontSize: 11, marginBottom: 4 }}>
        {entry.shortLabel} · {entry.readingType} · {entry.datetime}
      </p>
      <p style={{ color: s.color, fontWeight: 700, fontSize: 16, fontVariantNumeric: "tabular-nums" }}>
        {entry.glucose} <span style={{ color: "#64748b", fontWeight: 400, fontSize: 12 }}>mg/dL</span>
      </p>
      <p style={{ color: s.color, fontSize: 11, marginTop: 2 }}>{s.label}</p>
      {entry.insulin !== null && (
        <p style={{ color: "#818cf8", fontSize: 11, marginTop: 2 }}>💉 {entry.insulin} units insulin</p>
      )}
      {entry.carbs !== null && (
        <p style={{ color: "#a78bfa", fontSize: 11, marginTop: 2 }}>🌾 {entry.carbs}g carbs</p>
      )}
    </div>
  );
}

function InsCarbTooltip({ active, payload, label }: TooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 8, padding: "10px 14px" }}>
      <p style={{ color: "#94a3b8", fontSize: 11, marginBottom: 4 }}>{label}</p>
      {payload.map((p) => (
        <p key={p.dataKey} style={{ color: p.dataKey === "insulin" ? "#818cf8" : "#a78bfa", fontSize: 12, fontWeight: 600 }}>
          {p.dataKey === "insulin" ? `💉 ${p.value}u insulin` : `🌾 ${p.value}g carbs`}
        </p>
      ))}
    </div>
  );
}

// ─── Log entry form ────────────────────────────────────────────────────────────
interface LogFormProps {
  index: number;
  onAdd: (entry: GlucoseEntry) => void;
}

function LogEntryForm({ index, onAdd }: LogFormProps) {
  const [glucose, setGlucose]       = useState("");
  const [readingType, setReadingType] = useState<ReadingType>("Fasting");
  const [insulin, setInsulin]       = useState("");
  const [carbs, setCarbs]           = useState("");
  const [error, setError]           = useState("");

  const handleAdd = () => {
    const g = parseFloat(glucose);
    if (isNaN(g) || g <= 0 || g > 1000) {
      setError("Enter a valid glucose value (1–1000 mg/dL)");
      return;
    }
    setError("");
    const now = new Date();
    const dt  = `${now.getDate().toString().padStart(2,"0")}/${(now.getMonth()+1).toString().padStart(2,"0")} ${now.getHours().toString().padStart(2,"0")}:${now.getMinutes().toString().padStart(2,"0")}`;
    const status = getStatus(g, readingType);
    const entry: GlucoseEntry = {
      id:          crypto.randomUUID(),
      label:       `E${index}\n${readingType.split(" ")[0]}`,
      shortLabel:  `E${index}`,
      datetime:    dt,
      glucose:     g,
      readingType,
      insulin:     insulin.trim() !== "" ? parseFloat(insulin) : null,
      carbs:       carbs.trim()   !== "" ? parseFloat(carbs)   : null,
      status,
    };
    onAdd(entry);
    setGlucose(""); setInsulin(""); setCarbs("");
  };

  return (
    <div style={{ background: "#111827", border: "1px solid #1e293b", borderRadius: 12, padding: "14px 16px" }}>
      <p style={{ color: "#94a3b8", fontSize: 12, fontWeight: 600, marginBottom: 10 }}>
        Entry {index}
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
        {/* Glucose */}
        <div>
          <label style={{ color: "#64748b", fontSize: 11, display: "block", marginBottom: 4 }}>
            Blood Glucose (mg/dL) *
          </label>
          <input
            type="number"
            value={glucose}
            onChange={(e) => setGlucose(e.target.value)}
            placeholder="e.g. 142"
            style={{
              width: "100%", background: "#0a0f1e", border: "1px solid #1e293b",
              borderRadius: 8, padding: "8px 10px", color: "#f1f5f9",
              fontSize: 14, fontVariantNumeric: "tabular-nums", outline: "none",
            }}
          />
        </div>

        {/* Reading type */}
        <div>
          <label style={{ color: "#64748b", fontSize: 11, display: "block", marginBottom: 4 }}>
            Reading Type *
          </label>
          <select
            value={readingType}
            onChange={(e) => setReadingType(e.target.value as ReadingType)}
            style={{
              width: "100%", background: "#0a0f1e", border: "1px solid #1e293b",
              borderRadius: 8, padding: "8px 10px", color: "#f1f5f9", fontSize: 13, outline: "none",
            }}
          >
            {READING_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        {/* Insulin */}
        <div>
          <label style={{ color: "#64748b", fontSize: 11, display: "block", marginBottom: 4 }}>
            Insulin (units) — optional
          </label>
          <input
            type="number"
            value={insulin}
            onChange={(e) => setInsulin(e.target.value)}
            placeholder="e.g. 6"
            style={{
              width: "100%", background: "#0a0f1e", border: "1px solid #1e293b",
              borderRadius: 8, padding: "8px 10px", color: "#f1f5f9", fontSize: 14, outline: "none",
            }}
          />
        </div>

        {/* Carbs */}
        <div>
          <label style={{ color: "#64748b", fontSize: 11, display: "block", marginBottom: 4 }}>
            Carbs (grams) — optional
          </label>
          <input
            type="number"
            value={carbs}
            onChange={(e) => setCarbs(e.target.value)}
            placeholder="e.g. 45"
            style={{
              width: "100%", background: "#0a0f1e", border: "1px solid #1e293b",
              borderRadius: 8, padding: "8px 10px", color: "#f1f5f9", fontSize: 14, outline: "none",
            }}
          />
        </div>
      </div>

      {error && <p style={{ color: "#ef4444", fontSize: 11, marginBottom: 8 }}>{error}</p>}

      <button
        onClick={handleAdd}
        style={{
          width: "100%", background: "linear-gradient(135deg, #6c5ce7, #a29bfe)",
          border: "none", borderRadius: 8, padding: "9px 0",
          color: "#fff", fontWeight: 600, fontSize: 13, cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
        }}
      >
        <Plus size={14} /> Log Entry {index}
      </button>
    </div>
  );
}

// ─── Main GlucoseTracker component ────────────────────────────────────────────
export default function GlucoseTracker() {
  const [entries, setEntries]     = useState<GlucoseEntry[]>([]);
  const [showForm, setShowForm]   = useState(true);

  const addEntry = useCallback((entry: GlucoseEntry) => {
    setEntries((prev) => [...prev, entry]);
  }, []);

  const removeEntry = (id: string) => {
    setEntries((prev) => prev.filter((e) => e.id !== id));
  };

  const avg = entries.length
    ? entries.reduce((s, e) => s + e.glucose, 0) / entries.length
    : 0;

  const hasInsulin = entries.some((e) => e.insulin !== null);
  const hasCarbs   = entries.some((e) => e.carbs   !== null);
  const showBottom = hasInsulin || hasCarbs;

  // Chart data — short labels for x-axis
  const chartData = entries.map((e) => ({
    ...e,
    xLabel: `E${entries.indexOf(e) + 1}\n${e.readingType.split(" ")[0]}`,
  }));

  const DARK_BG   = "#0a0f1e";
  const CARD_BG   = "#111827";
  const BORDER    = "#1e293b";
  const GRID      = "#1e293b";
  const TICK      = "#94a3b8";

  return (
    <div style={{ background: DARK_BG, borderRadius: 16, padding: "20px", fontFamily: "inherit" }}>

      {/* ── Header ──────────────────────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <h2 style={{ color: "#f1f5f9", fontWeight: 700, fontSize: 18, margin: 0 }}>
            🩸 Daily Glucose Log
          </h2>
          <p style={{ color: "#64748b", fontSize: 12, marginTop: 4 }}>
            {entries.length} {entries.length === 1 ? "entry" : "entries"} logged
            {entries.length > 0 && ` · Avg: ${avg.toFixed(1)} mg/dL`}
          </p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          style={{
            background: showForm ? "#1e293b" : "linear-gradient(135deg,#6c5ce7,#a29bfe)",
            border: "none", borderRadius: 8, padding: "7px 14px",
            color: "#fff", fontWeight: 600, fontSize: 12, cursor: "pointer",
            display: "flex", alignItems: "center", gap: 6,
          }}
        >
          <Plus size={13} />
          {showForm ? "Hide Form" : "Add Entry"}
        </button>
      </div>

      {/* ── Log form ────────────────────────────────────────────────── */}
      {showForm && (
        <div style={{ marginBottom: 20 }}>
          <LogEntryForm index={entries.length + 1} onAdd={addEntry} />
        </div>
      )}

      {/* ── Status legend ───────────────────────────────────────────── */}
      <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
        {[
          { label: "Low",      color: "#38bdf8" },
          { label: "Normal",   color: "#22c55e" },
          { label: "Elevated", color: "#f97316" },
          { label: "High",     color: "#ef4444" },
        ].map((s) => (
          <div key={s.label} style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: s.color, display: "inline-block" }} />
            <span style={{ color: "#94a3b8", fontSize: 11 }}>{s.label}</span>
          </div>
        ))}
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <span style={{ width: 20, height: 2, background: "#f97316", opacity: 0.6, display: "inline-block" }} />
          <span style={{ color: "#94a3b8", fontSize: 11 }}>140 mg/dL</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <span style={{ width: 20, height: 2, background: "#38bdf8", opacity: 0.6, display: "inline-block" }} />
          <span style={{ color: "#94a3b8", fontSize: 11 }}>70 mg/dL</span>
        </div>
        {entries.length > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{ width: 20, height: 1, background: "#fff", opacity: 0.3, display: "inline-block", borderTop: "1px dotted #fff" }} />
            <span style={{ color: "#94a3b8", fontSize: 11 }}>Avg {avg.toFixed(0)}</span>
          </div>
        )}
      </div>

      {entries.length === 0 ? (
        <div style={{ background: CARD_BG, borderRadius: 12, padding: "40px 20px", textAlign: "center", border: `1px solid ${BORDER}` }}>
          <Activity size={32} style={{ color: "#334155", marginBottom: 12 }} />
          <p style={{ color: "#475569", fontSize: 14 }}>No entries yet. Log your first glucose reading above.</p>
        </div>
      ) : (
        <>
          {/* ── Glucose line chart ──────────────────────────────────── */}
          <div style={{ background: CARD_BG, borderRadius: 12, padding: "16px 12px", marginBottom: 12, border: `1px solid ${BORDER}` }}>
            <p style={{ color: "#94a3b8", fontSize: 12, fontWeight: 600, marginBottom: 12, paddingLeft: 4 }}>
              Blood Glucose (mg/dL)
            </p>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={chartData} margin={{ top: 8, right: 24, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />

                {/* Python reference lines: 70, 140, avg */}
                <ReferenceLine y={140} stroke="#f97316" strokeDasharray="4 4" strokeWidth={0.8} strokeOpacity={0.6} />
                <ReferenceLine y={70}  stroke="#38bdf8" strokeDasharray="4 4" strokeWidth={0.8} strokeOpacity={0.6} />
                {avg > 0 && (
                  <ReferenceLine y={avg} stroke="#ffffff" strokeDasharray="3 6" strokeWidth={0.8} strokeOpacity={0.35} />
                )}

                <XAxis
                  dataKey="xLabel"
                  tick={{ fontSize: 10, fill: TICK }}
                  axisLine={false}
                  tickLine={false}
                  interval={0}
                />
                <YAxis
                  domain={[
                    (dataMin: number) => Math.max(0, Math.floor(dataMin / 20) * 20 - 20),
                    (dataMax: number) => Math.ceil(dataMax / 20) * 20 + 20,
                  ]}
                  tick={{ fontSize: 10, fill: TICK }}
                  axisLine={false}
                  tickLine={false}
                  tickCount={6}
                />

                <Tooltip content={<GlucoseTooltip />} />

                {/* Line connecting dots */}
                <Line
                  type="monotone"
                  dataKey="glucose"
                  stroke="#38bdf8"
                  strokeWidth={2}
                  dot={false}
                  activeDot={false}
                />

                {/* Coloured dots per status — rendered as a second Line with custom dot */}
                <Line
                  type="monotone"
                  dataKey="glucose"
                  stroke="transparent"
                  strokeWidth={0}
                  dot={(props: {
                    cx?: number; cy?: number; index?: number;
                    payload?: GlucoseEntry;
                  }) => {
                    const { cx, cy, payload, index } = props;
                    if (cx === undefined || cy === undefined || !payload) return <g key={index} />;
                    return (
                      <circle
                        key={`dot-${index}`}
                        cx={cx} cy={cy} r={5}
                        fill={payload.status.color}
                        stroke={DARK_BG}
                        strokeWidth={1.5}
                      />
                    );
                  }}
                  activeDot={false}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* ── Insulin & Carbs bar chart (shown only if data exists) ── */}
          {showBottom && (
            <div style={{ background: CARD_BG, borderRadius: 12, padding: "16px 12px", marginBottom: 12, border: `1px solid ${BORDER}` }}>
              <p style={{ color: "#94a3b8", fontSize: 12, fontWeight: 600, marginBottom: 12, paddingLeft: 4 }}>
                Insulin & Carbs
              </p>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={chartData} margin={{ top: 4, right: 24, left: -10, bottom: 0 }} barGap={2}>
                  <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
                  <XAxis dataKey="xLabel" tick={{ fontSize: 10, fill: TICK }} axisLine={false} tickLine={false} interval={0} />
                  <YAxis tick={{ fontSize: 10, fill: TICK }} axisLine={false} tickLine={false} tickCount={5} />
                  <Tooltip content={<InsCarbTooltip />} />
                  <Legend
                    formatter={(value) => (
                      <span style={{ color: "#94a3b8", fontSize: 11 }}>
                        {value === "insulin" ? "Insulin (units)" : "Carbs (g)"}
                      </span>
                    )}
                    wrapperStyle={{ paddingTop: 8 }}
                  />
                  {hasInsulin && (
                    <Bar dataKey="insulin" name="insulin" fill="#818cf8" opacity={0.85} radius={[3,3,0,0]} maxBarSize={30} />
                  )}
                  {hasCarbs && (
                    <Bar dataKey="carbs" name="carbs" fill="#a78bfa" opacity={0.6} radius={[3,3,0,0]} maxBarSize={30} />
                  )}
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* ── Summary table ───────────────────────────────────────── */}
          <div style={{ background: CARD_BG, borderRadius: 12, border: `1px solid ${BORDER}`, overflow: "hidden", marginBottom: 12 }}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                    {["#", "Date/Time", "Type", "Glucose", "Status", "Insulin", "Carbs"].map((h) => (
                      <th key={h} style={{ padding: "10px 12px", textAlign: "left", color: "#64748b", fontWeight: 600, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap" }}>
                        {h}
                      </th>
                    ))}
                    <th style={{ padding: "10px 12px", width: 32 }} />
                  </tr>
                </thead>
                <tbody>
                  {entries.map((e, i) => (
                    <tr key={e.id} style={{ borderBottom: i < entries.length - 1 ? `1px solid ${BORDER}` : "none" }}>
                      <td style={{ padding: "9px 12px", color: "#64748b", fontWeight: 600 }}>E{i+1}</td>
                      <td style={{ padding: "9px 12px", color: "#94a3b8", whiteSpace: "nowrap" }}>{e.datetime}</td>
                      <td style={{ padding: "9px 12px", color: "#94a3b8", whiteSpace: "nowrap" }}>{e.readingType}</td>
                      <td style={{ padding: "9px 12px", color: "#f1f5f9", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
                        {e.glucose}
                      </td>
                      <td style={{ padding: "9px 12px" }}>
                        <span style={{
                          background: e.status.bg, color: e.status.color,
                          padding: "2px 8px", borderRadius: 99, fontSize: 10, fontWeight: 600,
                        }}>
                          {e.status.label}
                        </span>
                      </td>
                      <td style={{ padding: "9px 12px", color: "#818cf8", fontVariantNumeric: "tabular-nums" }}>
                        {e.insulin !== null ? `${e.insulin}u` : <span style={{ color: "#334155" }}>—</span>}
                      </td>
                      <td style={{ padding: "9px 12px", color: "#a78bfa", fontVariantNumeric: "tabular-nums" }}>
                        {e.carbs !== null ? `${e.carbs}g` : <span style={{ color: "#334155" }}>—</span>}
                      </td>
                      <td style={{ padding: "9px 12px" }}>
                        <button
                          onClick={() => removeEntry(e.id)}
                          style={{ background: "none", border: "none", cursor: "pointer", padding: 4, borderRadius: 6, color: "#475569" }}
                          title="Remove entry"
                          aria-label={`Remove entry ${i+1}`}
                        >
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Footer summary row */}
            <div style={{ borderTop: `1px solid ${BORDER}`, padding: "10px 12px", display: "flex", gap: 20, flexWrap: "wrap" }}>
              <span style={{ color: "#64748b", fontSize: 11 }}>
                <span style={{ color: "#94a3b8", fontWeight: 600 }}>Total entries:</span> {entries.length}
              </span>
              <span style={{ color: "#64748b", fontSize: 11 }}>
                <span style={{ color: "#94a3b8", fontWeight: 600 }}>Average glucose:</span>{" "}
                <span style={{ color: getStatus(avg, "Fasting").color, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
                  {avg.toFixed(1)} mg/dL
                </span>
              </span>
              <span style={{ color: "#64748b", fontSize: 11 }}>
                <span style={{ color: "#94a3b8", fontWeight: 600 }}>Range:</span>{" "}
                <span style={{ fontVariantNumeric: "tabular-nums", color: "#94a3b8" }}>
                  {Math.min(...entries.map(e => e.glucose))} – {Math.max(...entries.map(e => e.glucose))} mg/dL
                </span>
              </span>
              {hasInsulin && (
                <span style={{ color: "#64748b", fontSize: 11 }}>
                  <span style={{ color: "#818cf8", fontWeight: 600 }}>Total insulin:</span>{" "}
                  <span style={{ color: "#818cf8", fontVariantNumeric: "tabular-nums" }}>
                    {entries.reduce((s, e) => s + (e.insulin ?? 0), 0)}u
                  </span>
                </span>
              )}
              {hasCarbs && (
                <span style={{ color: "#64748b", fontSize: 11 }}>
                  <span style={{ color: "#a78bfa", fontWeight: 600 }}>Total carbs:</span>{" "}
                  <span style={{ color: "#a78bfa", fontVariantNumeric: "tabular-nums" }}>
                    {entries.reduce((s, e) => s + (e.carbs ?? 0), 0)}g
                  </span>
                </span>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
