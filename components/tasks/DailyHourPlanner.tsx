"use client";

import React, { useMemo } from "react";
import { eachDayOfInterval, format, parseISO, isWeekend } from "date-fns";

interface DailyHourPlannerProps {
  startDate: string;           // "yyyy-MM-dd"
  endDate: string;             // "yyyy-MM-dd"
  plan: Record<string, any>;   // { "2026-07-01": 4 } or { "2026-07-01": { hours: 4, sub_task_id: "id" } }
  onChange: (plan: Record<string, any>) => void;
  disabled?: boolean;
  subTasks?: any[];
}

export default function DailyHourPlanner({
  startDate,
  endDate,
  plan,
  onChange,
  disabled = false,
  subTasks = [],
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
    const entry = plan[format(d, "yyyy-MM-dd")];
    const hrs = typeof entry === "object" && entry !== null ? (entry.hours ?? 0) : (typeof entry === "number" ? entry : 0);
    return sum + hrs;
  }, 0);

  const setHours = (dateKey: string, value: string) => {
    const h = Math.max(0, Math.min(24, parseFloat(value) || 0));
    const current = plan[dateKey];
    const sub_task_id = typeof current === "object" && current !== null ? current.sub_task_id : null;
    
    onChange({
      ...plan,
      [dateKey]: { hours: h, sub_task_id }
    });
  };

  const setSubTaskId = (dateKey: string, subTaskId: string | null) => {
    const current = plan[dateKey];
    const hours = typeof current === "object" && current !== null ? current.hours : (typeof current === "number" ? current : 0);

    onChange({
      ...plan,
      [dateKey]: { hours, sub_task_id: subTaskId }
    });
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
          
          const entry   = plan[key];
          const hrs     = typeof entry === "object" && entry !== null ? (entry.hours ?? 0) : (typeof entry === "number" ? entry : 0);
          const subTaskId = typeof entry === "object" && entry !== null ? (entry.sub_task_id ?? "") : "";

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

              {/* Hours input + Sub-task select */}
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <input
                  type="number"
                  value={hrs || ""}
                  disabled={disabled}
                  onChange={(e) => setHours(key, e.target.value)}
                  min={0}
                  max={24}
                  step={0.5}
                  placeholder="0"
                  className="w-10 text-center rounded border text-xs outline-none py-0.5 font-mono disabled:opacity-75 disabled:cursor-not-allowed"
                  style={{
                    background: "var(--bg-elevated)",
                    borderColor: hrs > 0 ? "var(--maroon)" : "var(--border-subtle)",
                    color: "var(--text-primary)",
                  }}
                  onFocus={(e) => (e.target.style.borderColor = "var(--maroon)")}
                  onBlur={(e) => (e.target.style.borderColor = hrs > 0 ? "var(--maroon)" : "var(--border-subtle)")}
                />
                <span className="text-[10px] mr-1" style={{ color: "var(--text-muted)" }}>h</span>

                {subTasks && subTasks.length > 0 && (
                  <select
                    value={subTaskId ?? ""}
                    disabled={disabled}
                    onChange={(e) => setSubTaskId(key, e.target.value || null)}
                    className="text-[10px] rounded border px-1 py-0.5 outline-none transition-colors disabled:opacity-70 max-w-[110px] cursor-pointer"
                    style={{
                      background: "var(--bg-elevated)",
                      borderColor: subTaskId ? "var(--maroon)" : "var(--border-subtle)",
                      color: subTaskId ? "var(--text-primary)" : "var(--text-muted)",
                    }}
                    title="Select sub-task for this day"
                  >
                    <option value="">-- Sub-task --</option>
                    {subTasks.map((st) => (
                      <option key={st.id} value={st.id}>
                        {st.title}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
