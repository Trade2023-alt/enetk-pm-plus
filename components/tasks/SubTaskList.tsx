"use client";

import React, { useState, useRef, useEffect } from "react";
import { Plus, Trash2, CheckSquare, Square, GripVertical } from "lucide-react";
import type { SubTask } from "@/lib/supabase/types";

interface SubTaskListProps {
  subTasks: Partial<SubTask>[];
  onChange: (subTasks: Partial<SubTask>[]) => void;
}

export default function SubTaskList({ subTasks, onChange }: SubTaskListProps) {
  const [newTitle, setNewTitle] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const completedCount = subTasks.filter((s) => s.is_completed).length;
  const progress = subTasks.length
    ? Math.round((completedCount / subTasks.length) * 100)
    : 0;

  const addSubTask = () => {
    const title = newTitle.trim();
    if (!title) return;
    onChange([
      ...subTasks,
      {
        title,
        is_completed: false,
        sort_order: subTasks.length,
      },
    ]);
    setNewTitle("");
    inputRef.current?.focus();
  };

  const toggleSubTask = (idx: number) => {
    onChange(
      subTasks.map((s, i) =>
        i === idx ? { ...s, is_completed: !s.is_completed } : s
      )
    );
  };

  const removeSubTask = (idx: number) => {
    onChange(subTasks.filter((_, i) => i !== idx));
  };

  const updateTitle = (idx: number, title: string) => {
    onChange(
      subTasks.map((s, i) => (i === idx ? { ...s, title } : s))
    );
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <label
          className="text-xs font-medium"
          style={{ color: "var(--text-secondary)" }}
        >
          Sub-Tasks
          {subTasks.length > 0 && (
            <span
              className="ml-1.5 text-[10px]"
              style={{ color: "var(--text-muted)" }}
            >
              {completedCount}/{subTasks.length}
            </span>
          )}
        </label>
      </div>

      {/* Progress bar */}
      {subTasks.length > 0 && (
        <div
          className="h-1 rounded-full mb-3 overflow-hidden"
          style={{ background: "var(--border-subtle)" }}
        >
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{
              width: `${progress}%`,
              background:
                progress === 100 ? "var(--status-ok)" : "var(--maroon)",
            }}
          />
        </div>
      )}

      {/* Sub-task items */}
      <div className="space-y-1 mb-2">
        {subTasks.map((st, idx) => (
          <div
            key={idx}
            className="flex items-center gap-2 group rounded-lg px-2 py-1.5 transition-colors"
            style={{ background: "var(--bg-surface)" }}
          >
            <button
              onClick={() => toggleSubTask(idx)}
              className="flex-shrink-0 transition-colors"
              style={{
                color: st.is_completed
                  ? "var(--status-ok)"
                  : "var(--text-muted)",
              }}
            >
              {st.is_completed ? (
                <CheckSquare size={13} />
              ) : (
                <Square size={13} />
              )}
            </button>

            <input
              type="text"
              value={st.title ?? ""}
              onChange={(e) => updateTitle(idx, e.target.value)}
              className="flex-1 bg-transparent text-xs outline-none"
              style={{
                color: st.is_completed
                  ? "var(--text-muted)"
                  : "var(--text-primary)",
                textDecoration: st.is_completed ? "line-through" : "none",
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addSubTask();
                }
              }}
            />

            <button
              onClick={() => removeSubTask(idx)}
              className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ color: "var(--text-muted)" }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.color = "var(--status-overdue)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.color = "var(--text-muted)")
              }
            >
              <Trash2 size={11} />
            </button>
          </div>
        ))}
      </div>

      {/* Add new sub-task */}
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
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addSubTask();
            }
          }}
          placeholder="Add sub-task... (Enter to add)"
          className="flex-1 bg-transparent text-xs outline-none"
          style={{ color: "var(--text-primary)" }}
        />
        {newTitle && (
          <button
            onClick={addSubTask}
            className="text-[10px] px-2 py-0.5 rounded transition-colors"
            style={{
              background: "var(--maroon-subtle)",
              color: "var(--maroon-light)",
            }}
          >
            Add
          </button>
        )}
      </div>
    </div>
  );
}
