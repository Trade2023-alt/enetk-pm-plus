"use client";

import React, { useMemo } from "react";
import { eachDayOfInterval, format, parseISO, isWeekend } from "date-fns";

interface DailyHourPlannerProps {
  startDate: string;           // "yyyy-MM-dd"
  endDate: string;             // "yyyy-MM-dd"
  plan: Record<string, number>; // { "2026-07-01": 4 }
  onChange: (plan: Record<string, number>) => void;
}

export default function DailyHourPlanner({
  startDate,
  endDate,
  plan,
  onChange,
}: DailyHourPlannerProps) {
  const days = useMemo(() => {
    try {
      return eachDayOfInterval({
        start: parseISO(startDate),
        end:   parseISO(endDate),
      });
    } catch {
      return [];
    }
  }, [startDate, endDate]);

  if (days.length < 2) return null;

  const totalHours = days.reduce((sum, d) => {
    return sum + (plan[format(d, "yyyy-MM-dd")] ?? 0);
  }, 0);

  const setHours = (dateKey: string, value: string) => {
    const h = Math.max(0, Math.min(24, parseFloat(value) || 0));
    onChange({ ...plan, [dateKey]: h });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
          Hours Per Day
        </label>
        <span className="text-[10px] font-mono" style={{ color: "var(--text-muted)" }}>
          {totalHours}h total planned
        </span>
      </div>

      <div className="space-y-1">
        {days.map((day) => {
          const key     = format(day, "yyyy-MM-dd");
          const dayName = format(day, "EEE");
          const dayNum  = format(day, "MMM d");
          const hrs     = plan[key] ?? 0;
          const isWknd  = isWeekend(day);
          const pct     = hrs > 0 ? Math.min(100, (hrs / 10) * 100) : 0;

          return (
            <div
              key={key}
              className="flex items-center gap-2 rounded-lg px-2.5 py-1.5"
              style={{
                background: isWknd ? "transparent" : "var(--bg-surface)",
                opacity: isWknd ? 0.5 : 1,
              }}
            >
              {/* Day label */}
              <div className="flex items-center gap-1.5 w-20 flex-shrink-0">
                <span
                  className="text-[10px] font-semibold uppercase tracking-wide w-7"
                  style={{ color: "var(--text-muted)" }}
                >
                  {dayName}
                </span>
                <span
                  className="text-[10px]"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {dayNum}
                </span>
              </div>

              {/* Progress bar */}
              <div
                className="flex-1 h-1.5 rounded-full overflow-hidden"
                style={{ background: "var(--border-subtle)" }}
              >
                <div
                  className="h-full rounded-full transition-all duration-200"
                  style={{
                    width: `${pct}%`,
                    background: isWknd ? "var(--text-muted)" : "var(--maroon)",
                  }}
                />
              </div>

              {/* Hours input */}
              <div className="flex items-center gap-1 flex-shrink-0">
                <input
                  type="number"
                  value={hrs || ""}
                  onChange={(e) => setHours(key, e.target.value)}
                  min={0}
                  max={24}
                  step={0.5}
                  placeholder="0"
                  className="w-10 text-center rounded border text-xs outline-none py-0.5 font-mono"
                  style={{
                    background: "var(--bg-elevated)",
                    borderColor: hrs > 0 ? "var(--maroon)" : "var(--border-subtle)",
                    color: "var(--text-primary)",
                  }}
                  onFocus={(e) => (e.target.style.borderColor = "var(--maroon)")}
                  onBlur={(e) => (e.target.style.borderColor = hrs > 0 ? "var(--maroon)" : "var(--border-subtle)")}
                />
                <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>h</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
