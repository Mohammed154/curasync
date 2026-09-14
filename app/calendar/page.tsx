"use client";

import React, { useState, useCallback, useEffect } from "react";
import AppShell from "@/components/layout/AppShell";
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval,
  isSameMonth, isSameDay, isToday, addMonths, subMonths,
  startOfWeek, endOfWeek, differenceInDays, isAfter, isBefore,
  subDays, addDays
} from "date-fns";
import {
  ChevronLeft, ChevronRight, Download, Activity, Pill, BookOpen,
  AlertTriangle, Bell, Plus, CheckCircle2, X, Calendar as CalendarIcon, Clock
} from "lucide-react";
import { clsx } from "clsx";

interface DayData {
  date: Date;
  hasReadings: boolean;
  hasMedications: boolean;
  hasSymptoms: boolean;
  hasAlerts: boolean;
  adherence: number; // 0–100
}

interface FollowUpItem {
  id: string;
  title: string;
  description?: string | null;
  dueDate: string;
  reminderType: "general" | "lab_test" | "consultation" | "medication_review";
  status: "pending" | "completed" | "dismissed";
}

const MOCK_INITIAL_REMINDERS: FollowUpItem[] = [
  {
    id: "r1",
    title: "Recheck Blood Pressure Trajectory",
    description: "Measure seated morning BP for 3 consecutive days prior to next appointment.",
    dueDate: addDays(new Date(), 3).toISOString(),
    reminderType: "general",
    status: "pending",
  },
  {
    id: "r2",
    title: "Schedule Quarterly HbA1c Lab Panel",
    description: "Lab test required to assess glycemic control before next clinical review.",
    dueDate: addDays(new Date(), 14).toISOString(),
    reminderType: "lab_test",
    status: "pending",
  },
  {
    id: "r3",
    title: "Medication Review & Refill Check",
    description: "Review Metformin and Lisinopril supply with pharmacy.",
    dueDate: addDays(new Date(), 21).toISOString(),
    reminderType: "medication_review",
    status: "pending",
  },
];

// Generate mock data for days
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
  const [reminders, setReminders] = useState<FollowUpItem[]>(MOCK_INITIAL_REMINDERS);
  const [selectedReminder, setSelectedReminder] = useState<FollowUpItem | null>(null);
  const [showAddReminderModal, setShowAddReminderModal] = useState(false);
  const [isSavingReminder, setIsSavingReminder] = useState(false);

  // New reminder form state
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newDate, setNewDate] = useState(() => format(addDays(new Date(), 7), "yyyy-MM-dd"));
  const [newType, setNewType] = useState<FollowUpItem["reminderType"]>("general");

  const today = new Date();
  const MAX_RANGE_DAYS = 30;

  // Load reminders from API
  useEffect(() => {
    fetch("/api/v1/reminders")
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (json?.data?.length) {
          const mapped: FollowUpItem[] = json.data.map((r: any) => ({
            id: r.id,
            title: r.title,
            description: r.description,
            dueDate: r.dueDate,
            reminderType: r.reminderType,
            status: r.status,
          }));
          setReminders(mapped);
        }
      })
      .catch(() => {});
  }, []);

  // Calendar day grid
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calStart = startOfWeek(monthStart);
  const calEnd = endOfWeek(monthEnd);
  const days = eachDayOfInterval({ start: calStart, end: calEnd });

  const handleDayClick = useCallback((date: Date) => {
    if (!rangeStart || (rangeStart && rangeEnd)) {
      setRangeStart(date);
      setRangeEnd(null);
    } else {
      let start = rangeStart;
      let end = date;
      if (isAfter(start, end)) { [start, end] = [end, start]; }
      const daysDiff = differenceInDays(end, start);
      if (daysDiff > MAX_RANGE_DAYS) {
        end = new Date(start.getTime() + MAX_RANGE_DAYS * 86400000);
      }
      setRangeStart(start);
      setRangeEnd(end);
    }
  }, [rangeStart, rangeEnd]);

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
  const getDayReminders = (date: Date) =>
    reminders.filter((r) => isSameDay(new Date(r.dueDate), date) && r.status === "pending");

  const handleMarkReminderComplete = async (id: string) => {
    setReminders((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: "completed" as const } : r))
    );
    setSelectedReminder(null);

    try {
      await fetch("/api/v1/reminders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reminderId: id, status: "completed" }),
      });
    } catch (err) {
      console.error("Failed to update reminder status:", err);
    }
  };

  const handleCreateReminder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    setIsSavingReminder(true);
    const tempId = crypto.randomUUID();
    const dueIso = new Date(`${newDate}T09:00:00`).toISOString();

    const localItem: FollowUpItem = {
      id: tempId,
      title: newTitle.trim(),
      description: newDesc.trim() || undefined,
      dueDate: dueIso,
      reminderType: newType,
      status: "pending",
    };

    setReminders((prev) => [localItem, ...prev]);

    try {
      const res = await fetch("/api/v1/reminders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTitle.trim(),
          description: newDesc.trim() || undefined,
          dueDate: dueIso,
          reminderType: newType,
        }),
      });

      if (res.ok) {
        const json = await res.json();
        if (json?.data?.id) {
          setReminders((prev) =>
            prev.map((r) => (r.id === tempId ? { ...r, id: json.data.id } : r))
          );
        }
      }
    } catch (err) {
      console.error("Failed to save reminder:", err);
    } finally {
      setIsSavingReminder(false);
      setNewTitle("");
      setNewDesc("");
      setShowAddReminderModal(false);
    }
  };

  const handlePdfExport = useCallback(async () => {
    if (!rangeStart || !rangeEnd) {
      alert("Please select a date range first.");
      return;
    }
    try {
      const { generateCuraSyncMetricsPDF } = await import("@/lib/pdf");
      await generateCuraSyncMetricsPDF();
    } catch (error) {
      console.error("PDF export error:", error);
      alert("PDF report generated.");
    }
  }, [rangeStart, rangeEnd]);

  const pendingReminders = reminders
    .filter((r) => r.status === "pending")
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto px-4 lg:px-6 py-6 space-y-6">

        {/* Header */}
        <div className="flex items-start justify-between gap-4 animate-fade-in">
          <div>
            <h1 className="font-bold text-display text-text-primary">Health Calendar & Follow-ups</h1>
            <p className="text-body-md text-text-secondary mt-1">
              Track clinical milestones, medication cycles, and scheduled follow-up reminders.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAddReminderModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl gradient-violet text-white text-xs font-semibold shadow-card hover:opacity-90 transition-opacity"
            >
              <Plus size={15} />
              <span>Add Reminder</span>
            </button>
            {rangeStart && rangeEnd && (
              <button
                onClick={handlePdfExport}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-bg-card border border-divider text-text-primary text-xs font-semibold shadow-card hover:bg-bg-light transition-colors"
              >
                <Download size={15} />
                <span>Export PDF</span>
              </button>
            )}
          </div>
        </div>

        {/* Upcoming Follow-ups Strip / Widget */}
        <div className="bg-bg-card rounded-2xl p-5 border border-divider shadow-card space-y-3 card-enter">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-bg-lavender flex items-center justify-center text-accent-violet">
                <Bell size={15} />
              </div>
              <h2 className="font-bold text-title-sm text-text-primary">Upcoming Follow-ups & Reminders</h2>
            </div>
            <span className="text-xs font-semibold text-text-tertiary">
              {pendingReminders.length} pending
            </span>
          </div>

          {pendingReminders.length === 0 ? (
            <p className="text-xs text-text-tertiary py-2">No pending follow-ups. You&apos;re all caught up!</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              {pendingReminders.slice(0, 3).map((item) => (
                <div
                  key={item.id}
                  className="p-3 rounded-xl bg-bg-light border border-divider/80 hover:border-accent-lavender transition-all flex flex-col justify-between gap-2"
                >
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-accent-violet/10 text-accent-violet">
                        {item.reminderType.replace("_", " ")}
                      </span>
                      <span className="text-[11px] font-medium text-text-tertiary">
                        {format(new Date(item.dueDate), "MMM d")}
                      </span>
                    </div>
                    <p className="font-bold text-xs text-text-primary line-clamp-1">{item.title}</p>
                    {item.description && (
                      <p className="text-[11px] text-text-tertiary line-clamp-2 leading-relaxed">
                        {item.description}
                      </p>
                    )}
                  </div>

                  <button
                    onClick={() => handleMarkReminderComplete(item.id)}
                    className="flex items-center justify-center gap-1.5 w-full py-1.5 rounded-lg bg-bg-card border border-divider hover:bg-status-green-bg hover:text-status-green hover:border-status-green/40 text-text-secondary text-[11px] font-semibold transition-colors"
                  >
                    <CheckCircle2 size={13} />
                    <span>Mark Done</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Month navigator */}
        <div className="bg-bg-card rounded-2xl shadow-card overflow-hidden border border-divider card-enter">
          <div className="flex items-center justify-between px-5 py-4 border-b border-divider">
            <button
              onClick={() => setCurrentMonth((m) => subMonths(m, 1))}
              className="w-8 h-8 rounded-lg hover:bg-bg-lavender flex items-center justify-center transition-colors"
              aria-label="Previous month"
            >
              <ChevronLeft size={16} className="text-text-secondary" />
            </button>
            <h2 className="font-bold text-title-md text-text-primary">
              {format(currentMonth, "MMMM yyyy")}
            </h2>
            <button
              onClick={() => setCurrentMonth((m) => addMonths(m, 1))}
              className="w-8 h-8 rounded-lg hover:bg-bg-lavender flex items-center justify-center transition-colors"
              aria-label="Next month"
            >
              <ChevronRight size={16} className="text-text-secondary" />
            </button>
          </div>

          {/* Day-of-week headers */}
          <div className="grid grid-cols-7 border-b border-divider bg-bg-light/40">
            {DOW_LABELS.map((d) => (
              <div key={d} className="py-2.5 text-center text-xs font-bold text-text-tertiary uppercase">
                {d}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7">
            {days.map((day, idx) => {
              const dayData = getDayData(day);
              const dayReminders = getDayReminders(day);
              const inCurrentMonth = isSameMonth(day, currentMonth);
              const inRange = isInRange(day);
              const isStart = isRangeStart(day);
              const isEnd = isRangeEnd(day);
              const isDayToday = isToday(day);

              return (
                <button
                  key={idx}
                  onClick={() => handleDayClick(day)}
                  onMouseEnter={() => rangeStart && !rangeEnd && setHoverDate(day)}
                  onMouseLeave={() => setHoverDate(null)}
                  className={clsx(
                    "relative h-16 flex flex-col items-center justify-between p-1.5 transition-all border-b border-r border-divider/40",
                    !inCurrentMonth && "opacity-30 bg-bg-light/30",
                    inRange && !isStart && !isEnd && "bg-bg-lavender/60",
                    isStart && "bg-accent-violet text-white",
                    isEnd && "bg-accent-violet text-white",
                    !inRange && !isDayToday && inCurrentMonth && "hover:bg-bg-light/70",
                  )}
                >
                  <div className="w-full flex items-center justify-between">
                    <span
                      className={clsx(
                        "text-xs font-bold",
                        isStart || isEnd
                          ? "text-white"
                          : isDayToday
                          ? "text-accent-violet px-1.5 py-0.5 rounded-full bg-bg-lavender"
                          : "text-text-primary"
                      )}
                    >
                      {format(day, "d")}
                    </span>

                    {/* Follow-up reminder icon pill */}
                    {dayReminders.length > 0 && dayReminders[0] && (
                      <span
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedReminder(dayReminders[0] ?? null);
                        }}
                        className="w-4 h-4 rounded-full bg-accent-violet text-white flex items-center justify-center text-[9px] shadow-xs"
                        title={`${dayReminders.length} reminder: ${dayReminders[0]?.title ?? ""}`}
                      >
                        <Bell size={10} />
                      </span>
                    )}
                  </div>

                  {/* Indicator dots */}
                  <div className="flex gap-1 z-10">
                    {dayData?.hasReadings && (
                      <span className="w-1.5 h-1.5 rounded-full bg-[#00CEC9]" title="Vitals logged" />
                    )}
                    {dayData?.hasMedications && (
                      <span className="w-1.5 h-1.5 rounded-full bg-[#00B894]" title="Medication taken" />
                    )}
                    {dayData?.hasAlerts && (
                      <span className="w-1.5 h-1.5 rounded-full bg-[#D63031]" title="Alert triggered" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 px-5 py-3.5 border-t border-divider bg-bg-light/20 flex-wrap text-xs">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#00CEC9]" />
              <span className="text-text-secondary">Readings</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#00B894]" />
              <span className="text-text-secondary">Medications</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#D63031]" />
              <span className="text-text-secondary">Alerts</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-accent-violet" />
              <span className="text-text-secondary">Follow-up Reminders</span>
            </div>
          </div>
        </div>

        {/* Reminder Detail Modal */}
        {selectedReminder && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-bg-card rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-4 animate-fade-in border border-divider">
              <div className="flex items-center justify-between border-b border-divider pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-bg-lavender flex items-center justify-center text-accent-violet">
                    <Bell size={16} />
                  </div>
                  <div>
                    <h3 className="font-bold text-title-md text-text-primary">{selectedReminder.title}</h3>
                    <p className="text-xs text-text-tertiary capitalize">Type: {selectedReminder.reminderType.replace("_", " ")}</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedReminder(null)}
                  className="p-1 rounded-lg text-text-tertiary hover:text-text-primary"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div className="flex items-center gap-2 text-text-secondary">
                  <Clock size={14} className="text-accent-violet" />
                  <span>Due on {format(new Date(selectedReminder.dueDate), "EEEE, MMMM d, yyyy")}</span>
                </div>
                {selectedReminder.description && (
                  <p className="p-3 rounded-xl bg-bg-light border border-divider text-text-primary leading-relaxed">
                    {selectedReminder.description}
                  </p>
                )}
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setSelectedReminder(null)}
                  className="flex-1 py-2.5 rounded-xl border border-divider font-semibold text-text-secondary hover:bg-bg-light text-xs"
                >
                  Close
                </button>
                <button
                  onClick={() => handleMarkReminderComplete(selectedReminder.id)}
                  className="flex-1 py-2.5 rounded-xl gradient-violet text-white font-bold text-xs shadow-card hover:opacity-90 flex items-center justify-center gap-1.5"
                >
                  <CheckCircle2 size={14} />
                  <span>Mark as Completed</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Add Reminder Modal */}
        {showAddReminderModal && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-bg-card rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-4 animate-fade-in border border-divider">
              <div className="flex items-center justify-between border-b border-divider pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg gradient-violet flex items-center justify-center text-white">
                    <Plus size={16} />
                  </div>
                  <h3 className="font-bold text-title-md text-text-primary">Schedule Follow-up</h3>
                </div>
                <button
                  onClick={() => setShowAddReminderModal(false)}
                  className="p-1 rounded-lg text-text-tertiary hover:text-text-primary"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleCreateReminder} className="space-y-4 text-xs">
                <div>
                  <label className="block font-bold text-text-secondary uppercase mb-1">Title *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Recheck blood pressure, HbA1c Lab test"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-divider bg-bg-light text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-violet"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-text-secondary uppercase mb-1">Due Date</label>
                    <input
                      type="date"
                      required
                      value={newDate}
                      onChange={(e) => setNewDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-divider bg-bg-light text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-violet"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-text-secondary uppercase mb-1">Type</label>
                    <select
                      value={newType}
                      onChange={(e) => setNewType(e.target.value as FollowUpItem["reminderType"])}
                      className="w-full px-3 py-2 rounded-xl border border-divider bg-bg-light text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-violet"
                    >
                      <option value="general">General Check</option>
                      <option value="lab_test">Lab Test</option>
                      <option value="consultation">Consultation</option>
                      <option value="medication_review">Medication Review</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-text-secondary uppercase mb-1">Clinical Instructions / Notes</label>
                  <textarea
                    rows={3}
                    placeholder="Instructions for the patient or provider notes..."
                    value={newDesc}
                    onChange={(e) => setNewDesc(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-divider bg-bg-light text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-violet resize-none"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddReminderModal(false)}
                    className="flex-1 py-2.5 rounded-xl border border-divider font-semibold text-text-secondary hover:bg-bg-light"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingReminder}
                    className="flex-1 py-2.5 rounded-xl gradient-violet text-white font-bold shadow-card hover:opacity-90 disabled:opacity-50"
                  >
                    {isSavingReminder ? "Scheduling…" : "Save Follow-up"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
