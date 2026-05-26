"use client";

import React, { useState, useCallback } from "react";
import AppShell from "@/components/layout/AppShell";
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval,
  isSameMonth, isSameDay, isToday, addMonths, subMonths,
  startOfWeek, endOfWeek, differenceInDays, isAfter, isBefore,
  subDays,
} from "date-fns";
import { ChevronLeft, ChevronRight, Download, Activity, Pill, BookOpen, AlertTriangle } from "lucide-react";
import { clsx } from "clsx";

interface DayData {
  date: Date;
  hasReadings: boolean;
  hasMedications: boolean;
  hasSymptoms: boolean;
  hasAlerts: boolean;
  adherence: number; // 0–100
}

// Generate mock data for every day in the last year
function generateMockCalendarData(): Map<string, DayData> {
  const map = new Map<string, DayData>();
  const today = new Date();
  for (let i = 0; i < 365; i++) {
    const date = subDays(today, i);
    const key = format(date, "yyyy-MM-dd");
    map.set(key, {
      date,
      hasReadings: Math.random() > 0.2,
      hasMedications: Math.random() > 0.15,
      hasSymptoms: Math.random() > 0.7,
      hasAlerts: Math.random() > 0.85,
      adherence: Math.floor(Math.random() * 101),
    });
  }
  return map;
}

const MOCK_DATA = generateMockCalendarData();

const DOW_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function CalendarPage() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [rangeStart, setRangeStart] = useState<Date | null>(null);
  const [rangeEnd, setRangeEnd] = useState<Date | null>(null);
  const [hoverDate, setHoverDate] = useState<Date | null>(null);
  const [view, setView] = useState<"calendar" | "list">("calendar");

  const today = new Date();
  const MAX_RANGE_DAYS = 30;

  // Calendar day grid
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calStart = startOfWeek(monthStart);
  const calEnd = endOfWeek(monthEnd);
  const days = eachDayOfInterval({ start: calStart, end: calEnd });

  const handleDayClick = useCallback((date: Date) => {
    if (isAfter(date, today)) return;

    if (!rangeStart || (rangeStart && rangeEnd)) {
      // Start new range
      setRangeStart(date);
      setRangeEnd(null);
    } else {
      // Complete range
      let start = rangeStart;
      let end = date;
      if (isAfter(start, end)) { [start, end] = [end, start]; }
      const days = differenceInDays(end, start);
      if (days > MAX_RANGE_DAYS) {
        // Clamp to 30 days
        end = addMonths(start, 0);
        end = new Date(start.getTime() + MAX_RANGE_DAYS * 86400000);
      }
      setRangeStart(start);
      setRangeEnd(end);
    }
  }, [rangeStart, rangeEnd, today]);

  const isInRange = (date: Date) => {
    if (!rangeStart) return false;
    const end = rangeEnd ?? hoverDate;
    if (!end) return isSameDay(date, rangeStart);
    const [s, e] = isAfter(rangeStart, end) ? [end, rangeStart] : [rangeStart, end];
    return !isBefore(date, s) && !isAfter(date, e);
  };

  const isRangeStart = (date: Date) => rangeStart ? isSameDay(date, rangeStart) : false;
  const isRangeEnd   = (date: Date) => rangeEnd   ? isSameDay(date, rangeEnd)   : false;

  const getDayData = (date: Date) => MOCK_DATA.get(format(date, "yyyy-MM-dd"));

  const adherenceColor = (adh: number) =>
    adh >= 80 ? "#00B894" : adh >= 50 ? "#FDCB6E" : "#D63031";

  // Range summary stats
  const rangeLabel = rangeStart && rangeEnd
    ? `${format(rangeStart, "MMM d")} – ${format(rangeEnd, "MMM d, yyyy")} (${differenceInDays(rangeEnd, rangeStart) + 1} days)`
    : rangeStart
    ? `${format(rangeStart, "MMM d, yyyy")} — select end date`
    : "Tap a day to start selecting a date range";

  const rangeStats = (() => {
    if (!rangeStart || !rangeEnd) return null;
    const rangeDays = eachDayOfInterval({ start: rangeStart, end: rangeEnd });
    const data = rangeDays.map((d) => getDayData(d)).filter(Boolean) as DayData[];
    if (!data.length) return null;
    return {
      totalDays: data.length,
      daysWithReadings: data.filter((d) => d.hasReadings).length,
      daysWithMeds: data.filter((d) => d.hasMedications).length,
      avgAdherence: Math.round(data.reduce((s, d) => s + d.adherence, 0) / data.length),
      alertDays: data.filter((d) => d.hasAlerts).length,
    };
  })();

  const handlePdfExport = useCallback(async () => {
    if (!rangeStart || !rangeEnd) {
      alert('Please select a date range first.');
      return;
    }

    try {
      const startStr = format(rangeStart, 'yyyy-MM-dd');
      const endStr = format(rangeEnd, 'yyyy-MM-dd');
      const response = await fetch(`/api/v1/export?rangeStart=${startStr}&rangeEnd=${endStr}`, {
        credentials: 'include',
      });
      if (!response.ok) {
        const errorText = await response.text();
        console.error('PDF export failed:', response.status, response.statusText, errorText);
        throw new Error(`Failed to generate PDF: ${response.status} ${response.statusText}`);
      }
      const result = await response.json();
      if (result.data.pdfUrl) {
        // Check if it's a development mock URL
        if (result.data.pdfUrl.includes('example.com/mock-pdf')) {
          alert('PDF export is mocked in development mode. In production, this would generate and download a real PDF report.');
          console.log('Mock PDF URL:', result.data.pdfUrl);
          return;
        }

        // Download the PDF
        const link = document.createElement('a');
        link.href = result.data.pdfUrl;
        link.download = `health-report-${startStr}-to-${endStr}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        alert('PDF generation failed. Please try again.');
      }
    } catch (error) {
      console.error('PDF export error:', error);
      alert(`Failed to export PDF: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`);
    }
  }, [rangeStart, rangeEnd]);

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto px-4 lg:px-6 py-6">

        {/* Header */}
        <div className="flex items-start justify-between mb-6 animate-fade-in">
          <div>
            <h1 className="font-bold text-display text-text-primary">Health Calendar</h1>
            <p className="text-body-md text-text-secondary mt-1">Select up to 30 days · Up to 1 year history</p>
          </div>
          {rangeStart && rangeEnd && (
            <button
              onClick={handlePdfExport}
              className="flex items-center gap-2 px-3 py-2 rounded-lg gradient-violet text-white text-label-sm font-semibold shadow-card hover:opacity-90 transition-opacity"
              aria-label="Download PDF for selected range"
            >
              <Download size={14} aria-hidden="true" />
              PDF Report
            </button>
          )}
        </div>

        {/* Month navigator */}
        <div className="bg-bg-card rounded-xl shadow-card overflow-hidden mb-4 card-enter">
          <div className="flex items-center justify-between px-4 py-3 border-b border-divider">
            <button
              onClick={() => setCurrentMonth((m) => subMonths(m, 1))}
              className="w-8 h-8 rounded-lg hover:bg-bg-lavender flex items-center justify-center transition-colors"
              aria-label="Previous month"
            >
              <ChevronLeft size={16} className="text-text-secondary" />
            </button>
            <h2 className="font-semibold text-title-md text-text-primary">
              {format(currentMonth, "MMMM yyyy")}
            </h2>
            <button
              onClick={() => setCurrentMonth((m) => addMonths(m, 1))}
              disabled={isAfter(addMonths(currentMonth, 1), today)}
              className="w-8 h-8 rounded-lg hover:bg-bg-lavender flex items-center justify-center transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              aria-label="Next month"
            >
              <ChevronRight size={16} className="text-text-secondary" />
            </button>
          </div>

          {/* Day-of-week headers */}
          <div className="grid grid-cols-7 border-b border-divider">
            {DOW_LABELS.map((d) => (
              <div key={d} className="py-2 text-center text-xs font-semibold text-text-tertiary">
                {d}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7">
            {days.map((day, idx) => {
              const dayData = getDayData(day);
              const inCurrentMonth = isSameMonth(day, currentMonth);
              const isFuture = isAfter(day, today);
              const inRange = isInRange(day);
              const isStart = isRangeStart(day);
              const isEnd = isRangeEnd(day);
              const isDayToday = isToday(day);

              return (
                <button
                  key={idx}
                  onClick={() => !isFuture && inCurrentMonth && handleDayClick(day)}
                  onMouseEnter={() => rangeStart && !rangeEnd && setHoverDate(day)}
                  onMouseLeave={() => setHoverDate(null)}
                  disabled={isFuture || !inCurrentMonth}
                  className={clsx(
                    "relative h-12 flex flex-col items-center justify-center transition-all",
                    !inCurrentMonth && "opacity-20 pointer-events-none",
                    isFuture && "opacity-20 cursor-not-allowed",
                    inRange && !isStart && !isEnd && "bg-bg-lavender",
                    isStart && "rounded-l-full bg-accent-violet",
                    isEnd && "rounded-r-full bg-accent-violet",
                    !inRange && !isDayToday && "hover:bg-bg-light",
                  )}
                  aria-label={`${format(day, "MMMM d, yyyy")}${dayData?.hasAlerts ? " — has alerts" : ""}`}
                  aria-pressed={inRange}
                >
                  {/* Today ring */}
                  {isDayToday && !inRange && (
                    <span className="absolute inset-1 rounded-full border-2 border-accent-violet" aria-hidden="true" />
                  )}

                  <span className={clsx(
                    "text-xs font-semibold z-10",
                    isStart || isEnd ? "text-white" : isDayToday ? "text-accent-violet" : "text-text-primary"
                  )}>
                    {format(day, "d")}
                  </span>

                  {/* Data indicator dots */}
                  {dayData && inCurrentMonth && !isFuture && (
                    <div className="flex gap-0.5 z-10 mt-0.5">
                      {dayData.hasReadings && (
                        <span className="w-1 h-1 rounded-full"
                          style={{ background: isStart || isEnd ? "rgba(255,255,255,0.7)" : "#00CEC9" }}
                          aria-hidden="true"
                        />
                      )}
                      {dayData.hasMedications && (
                        <span className="w-1 h-1 rounded-full"
                          style={{ background: isStart || isEnd ? "rgba(255,255,255,0.7)" : adherenceColor(dayData.adherence) }}
                          aria-hidden="true"
                        />
                      )}
                      {dayData.hasAlerts && (
                        <span className="w-1 h-1 rounded-full"
                          style={{ background: isStart || isEnd ? "rgba(255,255,255,0.7)" : "#D63031" }}
                          aria-hidden="true"
                        />
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 px-4 py-3 border-t border-divider flex-wrap">
            {[
              { color: "#00CEC9", label: "Readings logged" },
              { color: "#00B894", label: "Medications taken" },
              { color: "#D63031", label: "Alert triggered" },
            ].map((l) => (
              <div key={l.label} className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full" style={{ background: l.color }} aria-hidden="true" />
                <span className="text-xs text-text-secondary">{l.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Range selector UI */}
        <div className={clsx(
          "rounded-xl px-4 py-3 mb-4 border transition-all card-enter",
          rangeStart && rangeEnd ? "bg-bg-lavender border-accent-lavender/40" : "bg-bg-card border-divider shadow-card"
        )}>
          <p className="text-label-sm font-semibold text-text-primary">{rangeLabel}</p>
          {rangeStart && rangeEnd && (
            <button
              onClick={() => { setRangeStart(null); setRangeEnd(null); }}
              className="text-xs text-text-tertiary hover:text-status-red mt-1 transition-colors"
            >
              Clear selection
            </button>
          )}
        </div>

        {/* Range stats summary */}
        {rangeStats && (
          <div className="bg-bg-card rounded-xl shadow-card p-4 mb-4 card-enter">
            <h3 className="font-semibold text-title-md text-text-primary mb-3">
              Range Summary — {rangeStats.totalDays} days
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { icon: Activity, label: "Days with readings", value: `${rangeStats.daysWithReadings}/${rangeStats.totalDays}`, color: "#00CEC9" },
                { icon: Pill, label: "Days with meds", value: `${rangeStats.daysWithMeds}/${rangeStats.totalDays}`, color: "#A29BFE" },
                { icon: BookOpen, label: "Avg adherence", value: `${rangeStats.avgAdherence}%`, color: "#00B894" },
                { icon: AlertTriangle, label: "Alert days", value: String(rangeStats.alertDays), color: "#D63031" },
              ].map(({ icon: Icon, label, value, color }) => (
                <div key={label} className="p-3 rounded-lg bg-bg-light text-center">
                  <Icon size={16} style={{ color }} className="mx-auto mb-1" aria-hidden="true" />
                  <p className="font-bold text-lg metric-value" style={{ color }}>{value}</p>
                  <p className="text-xs text-text-tertiary leading-tight">{label}</p>
                </div>
              ))}
            </div>

            {/* PDF download with 5/day limit */}
            <div className="mt-4 pt-3 border-t border-divider flex items-center justify-between">
              <div>
                <p className="text-label-sm font-semibold text-text-primary">Export this period as PDF</p>
                <p className="text-xs text-text-tertiary">2-page clinical summary · max 5 downloads/day</p>
              </div>
              <button
                onClick={handlePdfExport}
                className="flex items-center gap-2 px-4 py-2 rounded-xl gradient-violet text-white text-label-sm font-semibold shadow-card hover:opacity-90 transition-opacity"
              >
                <Download size={14} aria-hidden="true" />
                Download PDF
              </button>
            </div>
          </div>
        )}

        <div className="h-8" />
      </div>
    </AppShell>
  );
}
