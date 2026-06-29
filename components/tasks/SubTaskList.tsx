"use client";

import React, { useState, useRef } from "react";
import { Plus, Trash2, CheckSquare, Square, Calendar, Users, Flag } from "lucide-react";
import type { SubTask } from "@/lib/supabase/types";

interface SubTaskListProps {
  subTasks: Partial<SubTask & { scheduled_date?: string }>[];
  onChange: (subTasks: Partial<SubTask & { scheduled_date?: string }>[]) => void;
  showDates?: boolean; // show date picker per sub-task
  disabled?: boolean;
  usersList?: any[];
}

export default function SubTaskList({ subTasks, onChange, showDates = true, disabled = false, usersList }: SubTaskListProps) {
  const [newTitle, setNewTitle] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const completedCount = subTasks.filter((s) => s.is_completed).length;
  const progress = subTasks.length
    ? Math.round((completedCount / subTasks.length) * 100)
    : 0;

  const addSubTask = () => {
    if (disabled) return;
    const title = newTitle.trim();
    if (!title) return;
    onChange([...subTasks, { title, is_completed: false, sort_order: subTasks.length }]);
    setNewTitle("");
    inputRef.current?.focus();
  };

  const toggle = (idx: number) => {
    if (disabled) return;
    onChange(subTasks.map((s, i) => i === idx ? { ...s, is_completed: !s.is_completed } : s));
  };

  const remove = (idx: number) => {
    if (disabled) return;
    onChange(subTasks.filter((_, i) => i !== idx));
  };

  const updateTitle = (idx: number, title: string) => {
    if (disabled) return;
    onChange(subTasks.map((s, i) => i === idx ? { ...s, title } : s));
  };

  const updateDate = (idx: number, date: string) => {
    if (disabled) return;
    onChange(subTasks.map((s, i) => i === idx ? { ...s, scheduled_date: date || undefined } : s));
  };

  const updateAssignedTo = (idx: number, userId: string | null) => {
    if (disabled) return;
    onChange(subTasks.map((s, i) => i === idx ? { ...s, assigned_to: userId } : s));
  };

  const updateDeadline = (idx: number, deadline: string) => {
    if (disabled) return;
    onChange(subTasks.map((s, i) => i === idx ? { ...s, deadline: deadline || null } : s));
  };

  const updateEstimatedHours = (idx: number, hrs: string) => {
    if (disabled) return;
    const val = hrs === "" ? null : Math.max(0, parseFloat(hrs) || 0);
    onChange(subTasks.map((s, i) => i === idx ? { ...s, estimated_hours: val } : s));
  };

  const updateUsedHours = (idx: number, hrs: string) => {
    if (disabled) return;
    const val = hrs === "" ? null : Math.max(0, parseFloat(hrs) || 0);
    onChange(subTasks.map((s, i) => i === idx ? { ...s, used_hours: val } : s));
  };

  return (
    <div>
      {/* Header + progress */}
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
          Sub-Tasks
          {subTasks.length > 0 && (
            <span className="ml-1.5 text-[10px]" style={{ color: "var(--text-muted)" }}>
              {completedCount}/{subTasks.length}
            </span>
          )}
        </label>
      </div>

      {subTasks.length > 0 && (
        <div className="h-1 rounded-full mb-2 overflow-hidden" style={{ background: "var(--border-subtle)" }}>
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{ width: `${progress}%`, background: progress === 100 ? "var(--status-ok)" : "var(--maroon)" }}
          />
        </div>
      )}

      {/* Sub-task rows */}
      <div className="space-y-1 mb-1.5">
        {subTasks.map((st, idx) => (
          <div
            key={idx}
            className="flex items-center gap-2 rounded-lg px-2 py-1.5 group transition-colors"
            style={{ background: "var(--bg-surface)" }}
          >
            {/* Check toggle */}
            <button
              onClick={() => toggle(idx)}
              disabled={disabled}
              className="flex-shrink-0 transition-colors disabled:cursor-not-allowed"
              style={{ color: st.is_completed ? "var(--status-ok)" : "var(--text-muted)" }}
            >
              {st.is_completed ? <CheckSquare size={13} /> : <Square size={13} />}
            </button>

            {/* Title */}
            <input
              type="text"
              value={st.title ?? ""}
              disabled={disabled}
              onChange={(e) => updateTitle(idx, e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addSubTask(); } }}
              className="flex-1 bg-transparent text-xs outline-none min-w-0 disabled:text-slate-400"
              style={{
                color: st.is_completed ? "var(--text-muted)" : "var(--text-primary)",
                textDecoration: st.is_completed ? "line-through" : "none",
              }}
            />

            {/* Scheduled Date picker */}
            {showDates && (
              <div className="flex items-center gap-1 flex-shrink-0">
                {!st.scheduled_date && (
                  <Calendar size={10} style={{ color: "var(--text-muted)" }} />
                )}
                <input
                  type="date"
                  value={st.scheduled_date ?? ""}
                  disabled={disabled}
                  onChange={(e) => updateDate(idx, e.target.value)}
                  className="text-[10px] font-mono rounded border px-1 py-0.5 outline-none transition-colors disabled:cursor-not-allowed disabled:opacity-70"
                  style={{
                    background: "var(--bg-elevated)",
                    borderColor: st.scheduled_date ? "var(--maroon)" : "var(--border-subtle)",
                    color: st.scheduled_date ? "var(--text-primary)" : "var(--text-muted)",
                    colorScheme: "dark",
                    width: st.scheduled_date ? "88px" : "30px",
                    cursor: disabled ? "default" : "pointer",
                  }}
                  title={st.scheduled_date ? `Scheduled: ${st.scheduled_date}` : "Set date"}
                />
              </div>
            )}

            {/* Deadline picker */}
            <div className="flex items-center gap-1 flex-shrink-0">
              {!st.deadline && (
                <Flag size={10} style={{ color: "var(--text-muted)" }} />
              )}
              <input
                type="date"
                value={st.deadline ?? ""}
                disabled={disabled}
                onChange={(e) => updateDeadline(idx, e.target.value)}
                className="text-[10px] font-mono rounded border px-1 py-0.5 outline-none transition-colors disabled:cursor-not-allowed disabled:opacity-70"
                style={{
                  background: "var(--bg-elevated)",
                  borderColor: st.deadline ? "var(--status-warning)" : "var(--border-subtle)",
                  color: st.deadline ? "var(--text-primary)" : "var(--text-muted)",
                  colorScheme: "dark",
                  width: st.deadline ? "88px" : "30px",
                  cursor: disabled ? "default" : "pointer",
                }}
                title={st.deadline ? `Deadline: ${st.deadline}` : "Set deadline"}
              />
            </div>

            {/* Estimated Hours */}
            <div className="flex items-center gap-1 flex-shrink-0">
              <input
                type="number"
                value={st.estimated_hours ?? ""}
                placeholder="est"
                disabled={disabled}
                onChange={(e) => updateEstimatedHours(idx, e.target.value)}
                className="text-[10px] font-mono rounded border px-1 py-0.5 outline-none text-center disabled:cursor-not-allowed disabled:opacity-70"
                style={{
                  background: "var(--bg-elevated)",
                  borderColor: st.estimated_hours ? "var(--maroon)" : "var(--border-subtle)",
                  color: st.estimated_hours ? "var(--text-primary)" : "var(--text-muted)",
                  width: st.estimated_hours ? "45px" : "30px",
                }}
                title={st.estimated_hours ? `Estimated: ${st.estimated_hours}h` : "Estimated hours"}
              />
            </div>

            {/* Used Hours */}
            <div className="flex items-center gap-1 flex-shrink-0">
              <input
                type="number"
                value={st.used_hours ?? ""}
                placeholder="usd"
                disabled={disabled}
                onChange={(e) => updateUsedHours(idx, e.target.value)}
                className="text-[10px] font-mono rounded border px-1 py-0.5 outline-none text-center disabled:cursor-not-allowed disabled:opacity-70"
                style={{
                  background: "var(--bg-elevated)",
                  borderColor: st.used_hours ? "var(--status-ok)" : "var(--border-subtle)",
                  color: st.used_hours ? "var(--text-primary)" : "var(--text-muted)",
                  width: st.used_hours ? "45px" : "30px",
                }}
                title={st.used_hours ? `Used: ${st.used_hours}h` : "Used hours"}
              />
            </div>

            {/* User assignment dropdown */}
            {usersList && usersList.length > 0 && (
              <div className="flex items-center gap-1 flex-shrink-0">
                {!st.assigned_to && (
                  <Users size={10} style={{ color: "var(--text-muted)" }} />
                )}
                <select
                  value={st.assigned_to ?? ""}
                  disabled={disabled}
                  onChange={(e) => updateAssignedTo(idx, e.target.value || null)}
                  className="text-[10px] rounded border px-1 py-0.5 outline-none transition-colors disabled:cursor-not-allowed disabled:opacity-70 cursor-pointer"
                  style={{
                    background: "var(--bg-elevated)",
                    borderColor: st.assigned_to ? "var(--maroon)" : "var(--border-subtle)",
                    color: st.assigned_to ? "var(--text-primary)" : "var(--text-muted)",
                    width: st.assigned_to ? "88px" : "30px",
                  }}
                  title={st.assigned_to ? "Assigned user" : "Assign user"}
                >
                  <option value="">{st.assigned_to ? "Unassigned" : ""}</option>
                  {usersList.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.full_name ?? u.email.split("@")[0]}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Remove */}
            {!disabled && (
              <button
                onClick={() => remove(idx)}
                className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ color: "var(--text-muted)" }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "var(--status-overdue)")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-muted)")}
              >
                <Trash2 size={11} />
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Add row */}
      {!disabled && (
        <div
          className="flex items-center gap-2 rounded-lg px-2 py-1.5 border border-dashed"
          style={{ borderColor: "var(--border-subtle)" }}
        >
          <Plus size={11} style={{ color: "var(--text-muted)" }} />
          <input
            ref={inputRef}
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addSubTask(); } }}
            placeholder="Add sub-task… (Enter to add)"
            className="flex-1 bg-transparent text-xs outline-none"
            style={{ color: "var(--text-primary)" }}
          />
          {newTitle && (
            <button
              onClick={addSubTask}
              className="text-[10px] px-2 py-0.5 rounded transition-colors flex-shrink-0"
              style={{ background: "var(--maroon-subtle)", color: "var(--maroon-light)" }}
            >
              Add
            </button>
          )}
        </div>
      )}
    </div>
  );
}
