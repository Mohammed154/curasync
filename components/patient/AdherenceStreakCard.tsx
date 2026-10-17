"use client";

import React from "react";
import { Flame, Trophy } from "lucide-react";

interface AdherenceStreakCardProps {
  weeklyAdherence: number; // 0–100
  streakDays: number;
  weekDays?: boolean[];
}

const DAYS = ["M", "T", "W", "T", "F", "S", "S"];

export default function AdherenceStreakCard({
  weeklyAdherence,
  streakDays,
  weekDays,
}: AdherenceStreakCardProps) {
  const activeDays = weekDays ?? Array.from({ length: 7 }, (_, i) => i < streakDays);
  const circumference = 2 * Math.PI * 26; // r=26
  const offset = circumference - (weeklyAdherence / 100) * circumference;

  const scoreColor =
    weeklyAdherence >= 80
      ? "#00B894"
      : weeklyAdherence >= 60
      ? "#F39C12"
      : "#D63031";

  return (
    <div className="bg-bg-card rounded-lg p-4 shadow-card card-enter">
      <h3 className="font-semibold text-title-md text-text-primary mb-4">
        Adherence
      </h3>

      <div className="flex items-center gap-4">
        {/* Ring chart */}
        <div className="relative flex-shrink-0" role="img" aria-label={`Weekly adherence: ${weeklyAdherence}%`}>
          <svg width="72" height="72" viewBox="0 0 72 72" aria-hidden="true">
            {/* Track */}
            <circle
              cx="36" cy="36" r="26"
              fill="none"
              stroke="#E2E0F0"
              strokeWidth="6"
            />
            {/* Progress */}
            <circle
              cx="36" cy="36" r="26"
              fill="none"
              stroke={scoreColor}
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              transform="rotate(-90 36 36)"
              style={{ transition: "stroke-dashoffset 1s ease-out" }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span
              className="metric-value font-bold"
              style={{ fontSize: "18px", color: scoreColor, lineHeight: "1" }}
            >
              {weeklyAdherence}%
            </span>
          </div>
        </div>

        {/* Day dots + streak */}
        <div className="flex-1">
          {/* Weekly dots */}
          <div className="flex gap-1.5 mb-3" role="list" aria-label="This week's adherence">
            {DAYS.map((day, i) => (
              <div key={i} className="flex flex-col items-center gap-1" role="listitem">
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold"
                  style={{
                    background: activeDays[i] ? "#00B894" : "#F0EFF8",
                    color: activeDays[i] ? "#fff" : "#8888A8",
                  }}
                  aria-label={`${day}: ${activeDays[i] ? "taken" : "missed"}`}
                >
                  {activeDays[i] ? "✓" : day}
                </div>
              </div>
            ))}
          </div>

          {/* Streak */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-bg-lavender w-fit">
            <Flame size={14} className="text-accent-pink" aria-hidden="true" />
            <span className="text-label-sm font-semibold text-text-primary">
              {streakDays}-day streak
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
