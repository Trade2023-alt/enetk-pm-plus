"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useUser } from "@clerk/nextjs";
import {
  X,
  Save,
  Trash2,
  Plus,
  CheckSquare,
  Square,
  Clock,
  Calendar,
  AlertTriangle,
  Link as LinkIcon,
  Briefcase,
  User,
  ChevronDown,
} from "lucide-react";
import { useAppStore } from "@/lib/store/useAppStore";
import type { Task, SubTask, TaskWithRelations } from "@/lib/supabase/types";
import TaskFlagBadge from "./TaskFlagBadge";
import SubTaskList from "./SubTaskList";
import { formatDeadline, formatHours, getHoursVariance } from "@/lib/utils/taskUtils";

interface FormState {
  task_name: string;
  job_number: string;
  description: string;
  project_id: string;
  assigned_to: string;
  estimated_hours: string;
  used_hours: string;
  deadline: string;
  scheduled_date: string;
  precursor_task_id: string;
  status: Task["status"];
  color_override: string;
  duration_hours: string;
}

const INITIAL_FORM: FormState = {
  task_name: "",
  job_number: "",
  description: "",
  project_id: "",
  assigned_to: "",
  estimated_hours: "",
  used_hours: "0",
  deadline: "",
  scheduled_date: "",
  precursor_task_id: "",
  status: "pending",
  color_override: "",
  duration_hours: "1",
};

export default function TaskModal() {
  const { user } = useUser();
  const isAdmin = user?.publicMetadata?.role === "admin";

  const {
    taskModalOpen,
    taskModalMode,
    editingTask,
    defaultDate,
    closeTaskModal,
    tasks,
    projects,
    addTask,
    updateTask,
    removeTask,
  } = useAppStore();

  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [subTasks, setSubTasks] = useState<Partial<SubTask>[]>([]);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Populate form when editing ──────────────────────────────────────────
  useEffect(() => {
    if (!taskModalOpen) return;

    if (taskModalMode === "edit" && editingTask) {
      setForm({
        task_name:        editingTask.task_name,
        job_number:       editingTask.job_number ?? "",
        description:      editingTask.description ?? "",
        project_id:       editingTask.project_id ?? "",
        assigned_to:      editingTask.assigned_to ?? "",
        estimated_hours:  editingTask.estimated_hours?.toString() ?? "",
        used_hours:       editingTask.used_hours?.toString() ?? "0",
        deadline:         editingTask.deadline ?? "",
        scheduled_date:   editingTask.scheduled_date ?? "",
        precursor_task_id: editingTask.precursor_task_id ?? "",
        status:           editingTask.status,
        color_override:   editingTask.color_override ?? "",
        duration_hours:   editingTask.duration_hours?.toString() ?? "1",
      });
      setSubTasks(editingTask.sub_tasks ?? []);
    } else {
      setForm({ ...INITIAL_FORM, scheduled_date: defaultDate ?? "" });
      setSubTasks([]);
    }
    setError(null);
  }, [taskModalOpen, taskModalMode, editingTask, defaultDate]);

  // ── Close on Escape ─────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeTaskModal();
    };
    if (taskModalOpen) {
      window.addEventListener("keydown", handler);
      document.body.style.overflow = "hidden";
    }
    return () => {
      window.removeEventListener("keydown", handler);
      document.body.style.overflow = "";
    };
  }, [taskModalOpen, closeTaskModal]);

  const setField = useCallback(
    <K extends keyof FormState>(key: K, value: FormState[K]) => {
      setForm((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  const isFlagged = !form.project_id || !form.deadline;

  // ── Save handler ────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!form.task_name.trim()) {
      setError("Task name is required.");
      return;
    }
    setSaving(true);
    setError(null);

    const payload = {
      task_name:        form.task_name.trim(),
      job_number:       form.job_number || null,
      description:      form.description || null,
      project_id:       form.project_id || null,
      assigned_to:      form.assigned_to || null,
      estimated_hours:  form.estimated_hours ? parseFloat(form.estimated_hours) : null,
      used_hours:       parseFloat(form.used_hours) || 0,
      deadline:         form.deadline || null,
      scheduled_date:   form.scheduled_date || null,
      precursor_task_id: form.precursor_task_id || null,
      status:           form.status,
      color_override:   form.color_override || null,
      duration_hours:   parseFloat(form.duration_hours) || 1,
      sub_tasks:        subTasks,
    };

    try {
      if (taskModalMode === "create") {
        const res = await fetch("/api/tasks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error(await res.text());
        const { task } = await res.json();
        addTask(task);
      } else {
        const res = await fetch(`/api/tasks/${editingTask!.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error(await res.text());
        const { task } = await res.json();
        updateTask(editingTask!.id, task);
      }
      closeTaskModal();
    } catch (e: any) {
      setError(e.message ?? "Failed to save task. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  // ── Delete handler ──────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!editingTask || !isAdmin) return;
    if (!confirm(`Delete "${editingTask.task_name}"? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      await fetch(`/api/tasks/${editingTask.id}`, { method: "DELETE" });
      removeTask(editingTask.id);
      closeTaskModal();
    } catch {
      setError("Failed to delete task.");
    } finally {
      setDeleting(false);
    }
  };

  if (!taskModalOpen) return null;

  const hoursVariance = editingTask
    ? getHoursVariance(
        parseFloat(form.estimated_hours) || null,
        parseFloat(form.used_hours) || 0
      )
    : null;

  const precursorOptions = tasks.filter(
    (t) => t.id !== editingTask?.id
  );

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm animate-fade-in"
        onClick={closeTaskModal}
      />

      {/* Modal */}
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
      >
        <div
          className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-xl border pointer-events-auto animate-fade-in overflow-hidden"
          style={{
            background: "var(--bg-elevated)",
            borderColor: "var(--border-strong)",
            boxShadow: "0 20px 60px rgba(0,0,0,0.6), 0 4px 20px rgba(0,0,0,0.3)",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* ── Header ── */}
          <div
            className="flex items-center justify-between px-5 py-4 border-b flex-shrink-0"
            style={{ borderColor: "var(--border-subtle)" }}
          >
            <div className="flex items-center gap-2.5">
              <h2
                className="text-sm font-semibold"
                style={{ color: "var(--text-primary)" }}
              >
                {taskModalMode === "create" ? "Create New Task" : "Edit Task"}
              </h2>
              {isFlagged && (
                <TaskFlagBadge size="sm" showLabel />
              )}
            </div>

            <div className="flex items-center gap-1.5">
              {taskModalMode === "edit" && isAdmin && (
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="p-1.5 rounded-md transition-all text-xs"
                  style={{ color: "var(--text-muted)" }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "hsl(0,70%,18%)";
                    e.currentTarget.style.color = "var(--status-overdue)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                    e.currentTarget.style.color = "var(--text-muted)";
                  }}
                  title="Delete task (Admin only)"
                >
                  <Trash2 size={14} />
                </button>
              )}
              <button
                onClick={closeTaskModal}
                className="p-1.5 rounded-md transition-all"
                style={{ color: "var(--text-muted)" }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "var(--bg-hover)";
                  e.currentTarget.style.color = "var(--text-primary)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.color = "var(--text-muted)";
                }}
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* ── Body (scrollable) ── */}
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
            {error && (
              <div
                className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-xs border"
                style={{
                  background: "hsl(0,70%,12%)",
                  borderColor: "var(--status-overdue)",
                  color: "var(--status-overdue)",
                }}
              >
                <AlertTriangle size={12} />
                {error}
              </div>
            )}

            {/* Task name */}
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
                Task Name <span style={{ color: "var(--status-overdue)" }}>*</span>
              </label>
              <input
                type="text"
                value={form.task_name}
                onChange={(e) => setField("task_name", e.target.value)}
                placeholder="Describe the task..."
                className="w-full px-3 py-2 rounded-lg border text-sm transition-all outline-none"
                style={{
                  background: "var(--bg-surface)",
                  borderColor: "var(--border-subtle)",
                  color: "var(--text-primary)",
                }}
                onFocus={(e) => e.target.style.borderColor = "var(--maroon)"}
                onBlur={(e) => e.target.style.borderColor = "var(--border-subtle)"}
                autoFocus
              />
            </div>

            {/* Job number + Status */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
                  <Briefcase size={10} className="inline mr-1" />
                  Job Number
                </label>
                <input
                  type="text"
                  value={form.job_number}
                  onChange={(e) => setField("job_number", e.target.value)}
                  placeholder="e.g. JOB-2024-001"
                  className="w-full px-3 py-2 rounded-lg border text-xs font-mono transition-all outline-none"
                  style={{
                    background: "var(--bg-surface)",
                    borderColor: "var(--border-subtle)",
                    color: "var(--text-primary)",
                  }}
                  onFocus={(e) => e.target.style.borderColor = "var(--maroon)"}
                  onBlur={(e) => e.target.style.borderColor = "var(--border-subtle)"}
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
                  Status
                </label>
                <select
                  value={form.status}
                  onChange={(e) => setField("status", e.target.value as Task["status"])}
                  className="w-full px-3 py-2 rounded-lg border text-xs transition-all outline-none cursor-pointer"
                  style={{
                    background: "var(--bg-surface)",
                    borderColor: "var(--border-subtle)",
                    color: "var(--text-primary)",
                  }}
                >
                  <option value="pending">Pending</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="overdue">Overdue</option>
                  <option value="blocked">Blocked</option>
                </select>
              </div>
            </div>

            {/* Project + Assigned to */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
                  Project
                  {!form.project_id && (
                    <span className="ml-1.5 text-[9px]" style={{ color: "var(--status-warning)" }}>
                      ⚠ Required for scheduling
                    </span>
                  )}
                </label>
                <select
                  value={form.project_id}
                  onChange={(e) => setField("project_id", e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border text-xs transition-all outline-none cursor-pointer"
                  style={{
                    background: "var(--bg-surface)",
                    borderColor: form.project_id ? "var(--border-subtle)" : "hsl(38,60%,30%)",
                    color: "var(--text-primary)",
                  }}
                >
                  <option value="">— Unassigned (backlog) —</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
                  <User size={10} className="inline mr-1" />
                  Assigned To
                </label>
                <input
                  type="text"
                  value={form.assigned_to}
                  onChange={(e) => setField("assigned_to", e.target.value)}
                  placeholder="User ID or leave blank"
                  className="w-full px-3 py-2 rounded-lg border text-xs transition-all outline-none"
                  style={{
                    background: "var(--bg-surface)",
                    borderColor: "var(--border-subtle)",
                    color: "var(--text-primary)",
                  }}
                  onFocus={(e) => e.target.style.borderColor = "var(--maroon)"}
                  onBlur={(e) => e.target.style.borderColor = "var(--border-subtle)"}
                />
              </div>
            </div>

            {/* Hours: estimated + used */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
                  <Clock size={10} className="inline mr-1" />
                  Est. Hours
                </label>
                <input
                  type="number"
                  value={form.estimated_hours}
                  onChange={(e) => setField("estimated_hours", e.target.value)}
                  min="0"
                  step="0.5"
                  placeholder="0.0"
                  className="w-full px-3 py-2 rounded-lg border text-xs transition-all outline-none"
                  style={{
                    background: "var(--bg-surface)",
                    borderColor: "var(--border-subtle)",
                    color: "var(--text-primary)",
                  }}
                  onFocus={(e) => e.target.style.borderColor = "var(--maroon)"}
                  onBlur={(e) => e.target.style.borderColor = "var(--border-subtle)"}
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
                  Used Hours
                </label>
                <input
                  type="number"
                  value={form.used_hours}
                  onChange={(e) => setField("used_hours", e.target.value)}
                  min="0"
                  step="0.5"
                  placeholder="0.0"
                  className="w-full px-3 py-2 rounded-lg border text-xs transition-all outline-none"
                  style={{
                    background: "var(--bg-surface)",
                    borderColor: "var(--border-subtle)",
                    color: "var(--text-primary)",
                  }}
                  onFocus={(e) => e.target.style.borderColor = "var(--maroon)"}
                  onBlur={(e) => e.target.style.borderColor = "var(--border-subtle)"}
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
                  Duration (hrs)
                </label>
                <input
                  type="number"
                  value={form.duration_hours}
                  onChange={(e) => setField("duration_hours", e.target.value)}
                  min="0.5"
                  step="0.5"
                  placeholder="1.0"
                  className="w-full px-3 py-2 rounded-lg border text-xs transition-all outline-none"
                  style={{
                    background: "var(--bg-surface)",
                    borderColor: "var(--border-subtle)",
                    color: "var(--text-primary)",
                  }}
                  onFocus={(e) => e.target.style.borderColor = "var(--maroon)"}
                  onBlur={(e) => e.target.style.borderColor = "var(--border-subtle)"}
                />
              </div>
            </div>

            {/* Hours variance indicator */}
            {hoursVariance && (
              <div
                className="flex items-center gap-2 text-xs px-3 py-2 rounded-lg border"
                style={{
                  background: hoursVariance.isOverBudget ? "hsl(0,70%,12%)" : "hsl(145,40%,12%)",
                  borderColor: hoursVariance.isOverBudget ? "var(--status-overdue)" : "var(--status-ok)",
                  color: hoursVariance.isOverBudget ? "var(--status-overdue)" : "var(--status-ok)",
                }}
              >
                <Clock size={11} />
                {hoursVariance.isOverBudget
                  ? `Over budget by ${formatHours(hoursVariance.variance)}`
                  : `${formatHours(Math.abs(hoursVariance.variance))} remaining`}
              </div>
            )}

            {/* Dates */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
                  <Calendar size={10} className="inline mr-1" />
                  Deadline
                  {!form.deadline && (
                    <span className="ml-1.5 text-[9px]" style={{ color: "var(--status-warning)" }}>
                      ⚠ Missing
                    </span>
                  )}
                </label>
                <input
                  type="date"
                  value={form.deadline}
                  onChange={(e) => setField("deadline", e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border text-xs transition-all outline-none"
                  style={{
                    background: "var(--bg-surface)",
                    borderColor: form.deadline ? "var(--border-subtle)" : "hsl(38,60%,30%)",
                    color: "var(--text-primary)",
                    colorScheme: "dark",
                  }}
                  onFocus={(e) => e.target.style.borderColor = "var(--maroon)"}
                  onBlur={(e) => e.target.style.borderColor = "var(--border-subtle)"}
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
                  <Calendar size={10} className="inline mr-1" />
                  Scheduled Date
                </label>
                <input
                  type="date"
                  value={form.scheduled_date}
                  onChange={(e) => setField("scheduled_date", e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border text-xs transition-all outline-none"
                  style={{
                    background: "var(--bg-surface)",
                    borderColor: "var(--border-subtle)",
                    color: "var(--text-primary)",
                    colorScheme: "dark",
                  }}
                  onFocus={(e) => e.target.style.borderColor = "var(--maroon)"}
                  onBlur={(e) => e.target.style.borderColor = "var(--border-subtle)"}
                />
              </div>
            </div>

            {/* Precursor task */}
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
                <LinkIcon size={10} className="inline mr-1" />
                Precursor Task (Dependency)
              </label>
              <select
                value={form.precursor_task_id}
                onChange={(e) => setField("precursor_task_id", e.target.value)}
                className="w-full px-3 py-2 rounded-lg border text-xs transition-all outline-none cursor-pointer"
                style={{
                  background: "var(--bg-surface)",
                  borderColor: "var(--border-subtle)",
                  color: "var(--text-primary)",
                }}
              >
                <option value="">— No dependency —</option>
                {precursorOptions.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.job_number ? `#${t.job_number} ` : ""}{t.task_name}
                  </option>
                ))}
              </select>
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
                Description / Notes
              </label>
              <textarea
                value={form.description}
                onChange={(e) => setField("description", e.target.value)}
                placeholder="Additional details, instructions, or notes..."
                rows={3}
                className="w-full px-3 py-2 rounded-lg border text-xs resize-y transition-all outline-none"
                style={{
                  background: "var(--bg-surface)",
                  borderColor: "var(--border-subtle)",
                  color: "var(--text-primary)",
                  minHeight: "70px",
                }}
                onFocus={(e) => e.target.style.borderColor = "var(--maroon)"}
                onBlur={(e) => e.target.style.borderColor = "var(--border-subtle)"}
              />
            </div>

            {/* Sub-tasks */}
            <SubTaskList
              subTasks={subTasks}
              onChange={setSubTasks}
            />
          </div>

          {/* ── Footer ── */}
          <div
            className="flex items-center justify-between px-5 py-3.5 border-t flex-shrink-0"
            style={{
              background: "var(--bg-surface)",
              borderColor: "var(--border-subtle)",
            }}
          >
            <div>
              {isFlagged && (
                <p
                  className="text-[10px] flex items-center gap-1"
                  style={{ color: "var(--status-warning)" }}
                >
                  <AlertTriangle size={10} />
                  Task will be saved to backlog (missing project or deadline)
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={closeTaskModal}
                className="px-3.5 py-1.5 rounded-lg text-xs font-medium border transition-all"
                style={{
                  background: "transparent",
                  borderColor: "var(--border-subtle)",
                  color: "var(--text-secondary)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "var(--bg-hover)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-medium transition-all disabled:opacity-60"
                style={{ background: "var(--maroon)", color: "white" }}
                onMouseEnter={(e) => {
                  if (!saving) e.currentTarget.style.background = "var(--maroon-light)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "var(--maroon)";
                }}
              >
                <Save size={12} />
                {saving
                  ? "Saving..."
                  : taskModalMode === "create"
                  ? "Create Task"
                  : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
