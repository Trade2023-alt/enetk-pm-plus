"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  X, Save, Trash2, AlertTriangle, ChevronDown,
  CalendarDays, Clock, FolderKanban, FileText,
  Flag, Link2, Users,
} from "lucide-react";
import { useUser } from "@clerk/nextjs";
import { format, parseISO, differenceInDays } from "date-fns";
import { useAppStore } from "@/lib/store/useAppStore";
import SubTaskList from "@/components/tasks/SubTaskList";
import DailyHourPlanner from "@/components/tasks/DailyHourPlanner";
import type { TaskWithRelations } from "@/lib/supabase/types";

// ─────────────────────────────────────────────
// Helper: section label
// ─────────────────────────────────────────────
function Section({ icon: Icon, label, children }: {
  icon: React.ComponentType<{ size?: number }>;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-2">
        <Icon size={11} />
        <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
          {label}
        </span>
        <div className="flex-1 h-px" style={{ background: "var(--border-subtle)" }} />
      </div>
      {children}
    </div>
  );
}

// ─────────────────────────────────────────────
// Field wrapper
// ─────────────────────────────────────────────
function Field({ children, label, required }: { children: React.ReactNode; label?: string; required?: boolean }) {
  return (
    <div>
      {label && (
        <label className="block text-[10px] font-medium mb-1" style={{ color: "var(--text-secondary)" }}>
          {label}{required && <span style={{ color: "var(--status-overdue)" }}> *</span>}
        </label>
      )}
      {children}
    </div>
  );
}

// ─────────────────────────────────────────────
// Input / Select shared styles
// ─────────────────────────────────────────────
const inputCls = "w-full px-3 py-2 rounded-lg border text-xs outline-none transition-colors";
const inputStyle = {
  background:  "var(--bg-surface)",
  borderColor: "var(--border-subtle)",
  color:       "var(--text-primary)",
  colorScheme: "dark" as const,
};
function onFocusBorder(e: React.FocusEvent<HTMLElement>) {
  (e.target as HTMLElement).style.borderColor = "var(--maroon)";
}
function onBlurBorder(e: React.FocusEvent<HTMLElement>) {
  (e.target as HTMLElement).style.borderColor = "var(--border-subtle)";
}

// ─────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────
export default function TaskPanel() {
  const { user } = useUser();
  const isAdmin = user?.publicMetadata?.role === "admin";
  const isReadOnly = user?.publicMetadata?.role === "customer";

  const {
    taskPanelOpen, taskPanelMode, editingTask, defaultDate, defaultEndDate,
    closeTaskPanel, projects, tasks,
    addTask, updateTask, removeTask,
  } = useAppStore();

  // ── form state ──
  const [taskName,      setTaskName]      = useState("");
  const [projectId,     setProjectId]     = useState("");
  const [startDate,     setStartDate]     = useState("");
  const [endDate,       setEndDate]       = useState("");
  const [priority,      setPriority]      = useState<"low"|"medium"|"high"|"critical">("medium");
  const [status,        setStatus]        = useState<"pending"|"in_progress"|"completed"|"blocked">("pending");
  const [assignedTo,    setAssignedTo]    = useState("");
  const [description,   setDescription]   = useState("");
  const [subTasks,      setSubTasks]      = useState<any[]>([]);
  const [dailyPlan,     setDailyPlan]     = useState<Record<string,number>>({});
  const [precursorId,   setPrecursorId]   = useState<string>("");
  const [saving,        setSaving]        = useState(false);
  const [deleting,      setDeleting]      = useState(false);
  const [error,         setError]         = useState<string|null>(null);
  const [showAdvanced,  setShowAdvanced]  = useState(false);
  const [usersList,     setUsersList]     = useState<any[]>([]);

  // Fetch users list for assignments (admins and employees only)
  useEffect(() => {
    if (taskPanelOpen && !isReadOnly) {
      fetch("/api/users")
        .then((res) => res.json())
        .then((data) => {
          if (data.users) setUsersList(data.users);
        })
        .catch(console.error);
    }
  }, [taskPanelOpen, isReadOnly]);

  // Populate form when opening
  useEffect(() => {
    if (!taskPanelOpen) return;

    if (taskPanelMode === "edit" && editingTask) {
      const t = editingTask as any;
      setTaskName(t.task_name ?? "");
      setProjectId(t.project_id ?? "");
      setStartDate(t.scheduled_date ?? "");
      setEndDate(t.scheduled_end_date ?? "");
      setPriority(t.priority ?? "medium");
      setStatus(t.status ?? "pending");
      setAssignedTo(t.assigned_to ?? "");
      setDescription(t.description ?? "");
      setSubTasks(t.sub_tasks ?? []);
      setDailyPlan(t.daily_hours_plan ?? {});
      setPrecursorId(t.precursor_task_id ?? "");
      setShowAdvanced(false);
    } else {
      setTaskName("");
      setProjectId(projects[0]?.id ?? "");
      setStartDate(defaultDate ?? "");
      setEndDate(defaultEndDate ?? "");
      setPriority("medium");
      setStatus("pending");
      setAssignedTo("");
      setDescription("");
      setSubTasks([]);
      setDailyPlan({});
      setPrecursorId("");
      setShowAdvanced(false);
    }
    setError(null);
  }, [taskPanelOpen, taskPanelMode, editingTask, defaultDate, defaultEndDate, projects]);

  // ESC to close
  useEffect(() => {
    if (!taskPanelOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") closeTaskPanel(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [taskPanelOpen, closeTaskPanel]);

  // ── Derived ──
  const spanDays = startDate && endDate
    ? differenceInDays(parseISO(endDate), parseISO(startDate))
    : 0;

  // ── Save ──
  const handleSave = async () => {
    if (!taskName.trim()) { setError("Task name is required."); return; }
    setSaving(true);
    setError(null);

    const payload = {
      task_name:          taskName.trim(),
      project_id:         projectId || null,
      scheduled_date:     startDate || null,
      scheduled_end_date: endDate || null,
      priority,
      status,
      assigned_to:        assignedTo || null,
      description:        description || null,
      daily_hours_plan:   Object.keys(dailyPlan).length ? dailyPlan : null,
      precursor_task_id:  precursorId || null,
      sub_tasks:          subTasks,
    };

    try {
      if (taskPanelMode === "edit" && editingTask) {
        const res = await fetch(`/api/tasks/${editingTask.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error(await res.text());
        const { task } = await res.json();
        updateTask(editingTask.id, task);
      } else {
        const res = await fetch("/api/tasks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error(await res.text());
        const { task } = await res.json();
        addTask(task);
      }
      closeTaskPanel();
    } catch (e: any) {
      setError(e.message ?? "Failed to save.");
    } finally {
      setSaving(false);
    }
  };

  // ── Delete ──
  const handleDelete = async () => {
    if (!editingTask || !isAdmin) return;
    if (!confirm(`Delete "${editingTask.task_name}"?`)) return;
    setDeleting(true);
    try {
      await fetch(`/api/tasks/${editingTask.id}`, { method: "DELETE" });
      removeTask(editingTask.id);
      closeTaskPanel();
    } catch {
      setError("Failed to delete.");
    } finally {
      setDeleting(false);
    }
  };

  // ── Priority colors ──
  const priorityColor: Record<string, string> = {
    low:      "hsl(200,50%,40%)",
    medium:   "hsl(45,60%,40%)",
    high:     "hsl(25,70%,45%)",
    critical: "var(--status-overdue)",
  };

  if (!taskPanelOpen) return null;

  return (
    <>
      {/* Dim backdrop on small screens */}
      <div
        className="fixed inset-0 z-40 lg:hidden bg-black/50"
        onClick={closeTaskPanel}
      />

      {/* Slide-in panel */}
      <aside
        className="fixed right-0 top-0 h-full z-50 flex flex-col border-l"
        style={{
          width:       "360px",
          background:  "var(--bg-elevated)",
          borderColor: "var(--border-strong)",
          boxShadow:   "-8px 0 32px rgba(0,0,0,0.4)",
          animation:   "slideInRight 220ms ease-out",
        }}
      >
        {/* ── Header ── */}
        <div
          className="flex items-center justify-between px-4 py-3 border-b flex-shrink-0"
          style={{ borderColor: "var(--border-subtle)", background: "var(--bg-surface)" }}
        >
          <div className="flex items-center gap-2">
            {/* Status dot */}
            <div
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ background: status === "completed" ? "var(--status-ok)"
                : status === "blocked" ? "var(--status-overdue)" : "var(--maroon)" }}
            />
            <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
              {taskPanelMode === "edit" ? "Edit Task" : "New Task"}
            </h2>
            {spanDays > 0 && (
              <span
                className="text-[10px] px-1.5 py-0.5 rounded-full font-mono"
                style={{ background: "var(--maroon-subtle)", color: "var(--maroon-light)" }}
              >
                {spanDays + 1}d
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            {taskPanelMode === "edit" && isAdmin && (
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="p-1.5 rounded-md transition-colors"
                style={{ color: "var(--text-muted)" }}
                onMouseEnter={(e) => { e.currentTarget.style.color = "var(--status-overdue)"; e.currentTarget.style.background = "hsl(0,70%,14%)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = "var(--text-muted)"; e.currentTarget.style.background = "transparent"; }}
                title="Delete task (admin)"
              >
                <Trash2 size={14} />
              </button>
            )}
            <button
              onClick={closeTaskPanel}
              className="p-1.5 rounded-md transition-colors"
              style={{ color: "var(--text-muted)" }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "var(--bg-hover)"; e.currentTarget.style.color = "var(--text-primary)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--text-muted)"; }}
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* ── Scrollable Body ── */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">

          {/* Error */}
          {error && (
            <div
              className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-xs border"
              style={{ background: "hsl(0,70%,12%)", borderColor: "var(--status-overdue)", color: "var(--status-overdue)" }}
            >
              <AlertTriangle size={12} />
              {error}
            </div>
          )}

          {/* ── Core Fields ── */}
          <Section icon={FileText} label="Task Details">
            <div className="space-y-2.5">
              {/* Task name */}
              <Field required>
                <input
                  type="text"
                  value={taskName}
                  disabled={isReadOnly}
                  onChange={(e) => setTaskName(e.target.value)}
                  placeholder="What needs to be done?"
                  autoFocus
                  className={inputCls + " text-sm font-medium disabled:opacity-85 disabled:cursor-not-allowed"}
                  style={{ ...inputStyle, fontSize: "13px" }}
                  onFocus={onFocusBorder}
                  onBlur={onBlurBorder}
                />
              </Field>

              {/* Project */}
              <Field label="Project">
                <div className="relative">
                  <FolderKanban
                    size={12}
                    style={{ color: "var(--text-muted)", position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)" }}
                  />
                  <select
                    value={projectId}
                    disabled={isReadOnly}
                    onChange={(e) => setProjectId(e.target.value)}
                    className={inputCls + " disabled:opacity-85 disabled:cursor-not-allowed"}
                    style={{ ...inputStyle, paddingLeft: "28px" }}
                    onFocus={onFocusBorder}
                    onBlur={onBlurBorder}
                  >
                    <option value="">No project</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
              </Field>

              {/* Assigned To */}
              {!isReadOnly && (
                <Field label="Assigned To">
                  <div className="relative">
                    <Users
                      size={12}
                      style={{ color: "var(--text-muted)", position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)" }}
                    />
                    <select
                      value={assignedTo}
                      onChange={(e) => setAssignedTo(e.target.value)}
                      className={inputCls}
                      style={{ ...inputStyle, paddingLeft: "28px" }}
                      onFocus={onFocusBorder}
                      onBlur={onBlurBorder}
                    >
                      <option value="">Unassigned</option>
                      {usersList.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.full_name ?? u.email}
                        </option>
                      ))}
                    </select>
                  </div>
                </Field>
              )}

              {isReadOnly && assignedTo && (
                <Field label="Assigned To">
                  <div className="relative">
                    <Users
                      size={12}
                      style={{ color: "var(--text-muted)", position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)" }}
                    />
                    <input
                      type="text"
                      disabled
                      value={
                        editingTask?.assigned_user
                          ? (editingTask.assigned_user as any).full_name ?? (editingTask.assigned_user as any).email
                          : "Unassigned"
                      }
                      className={inputCls + " disabled:opacity-85 disabled:cursor-not-allowed"}
                      style={{ ...inputStyle, paddingLeft: "28px" }}
                    />
                  </div>
                </Field>
              )}

              {/* Status */}
              <Field label="Status">
                <div className="grid grid-cols-4 gap-1">
                  {(["pending", "in_progress", "completed", "blocked"] as const).map((s) => (
                    <button
                      key={s}
                      disabled={isReadOnly}
                      onClick={() => !isReadOnly && setStatus(s)}
                      className="py-1 rounded text-[10px] font-medium border transition-all capitalize disabled:cursor-not-allowed"
                      style={{
                        background:   status === s ? "var(--maroon-subtle)" : "transparent",
                        borderColor:  status === s ? "var(--maroon)" : "var(--border-subtle)",
                        color:        status === s ? "var(--maroon-light)" : "var(--text-muted)",
                      }}
                    >
                      {s.replace("_", " ")}
                    </button>
                  ))}
                </div>
              </Field>
            </div>
          </Section>
 
          {/* ── Scheduling ── */}
          <Section icon={CalendarDays} label="Schedule">
            <div className="space-y-2.5">
              <div className="grid grid-cols-2 gap-2">
                <Field label="Start Date">
                  <input
                    type="date"
                    value={startDate}
                    disabled={isReadOnly}
                    onChange={(e) => {
                      setStartDate(e.target.value);
                      // Auto-clear end if before start
                      if (endDate && e.target.value > endDate) setEndDate("");
                    }}
                    className={inputCls + " disabled:opacity-85 disabled:cursor-not-allowed"}
                    style={inputStyle}
                    onFocus={onFocusBorder}
                    onBlur={onBlurBorder}
                  />
                </Field>
                <Field label="End Date">
                  <input
                    type="date"
                    value={endDate}
                    min={startDate}
                    disabled={isReadOnly}
                    onChange={(e) => setEndDate(e.target.value)}
                    className={inputCls + " disabled:opacity-85 disabled:cursor-not-allowed"}
                    style={{ ...inputStyle, borderColor: endDate ? "var(--maroon)" : "var(--border-subtle)" }}
                    onFocus={onFocusBorder}
                    onBlur={onBlurBorder}
                  />
                </Field>
              </div>
 
              {/* Daily hours planner — only when multi-day */}
              {startDate && endDate && endDate > startDate && (
                <div
                  className="rounded-lg p-3 border"
                  style={{ background: "var(--bg-surface)", borderColor: "var(--border-subtle)" }}
                >
                  <DailyHourPlanner
                    startDate={startDate}
                    endDate={endDate}
                    plan={dailyPlan}
                    disabled={isReadOnly}
                    onChange={isReadOnly ? () => {} : setDailyPlan}
                  />
                </div>
              )}
            </div>
          </Section>
 
          {/* ── Sub-Tasks ── */}
          <Section icon={Clock} label="Sub-Tasks">
            <SubTaskList
              subTasks={subTasks}
              onChange={setSubTasks}
              showDates={true}
              disabled={isReadOnly}
              usersList={usersList}
            />
          </Section>

          {/* ── Advanced (collapsible) ── */}
          <div>
            <button
              onClick={() => setShowAdvanced((v) => !v)}
              className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest w-full transition-colors"
              style={{ color: "var(--text-muted)" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "var(--text-secondary)")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-muted)")}
            >
              <div className="flex-1 h-px" style={{ background: "var(--border-subtle)" }} />
              <Flag size={10} />
              <span>More Options</span>
              <ChevronDown
                size={11}
                style={{ transform: showAdvanced ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 200ms" }}
              />
              <div className="flex-1 h-px" style={{ background: "var(--border-subtle)" }} />
            </button>

            {showAdvanced && (
              <div className="mt-3 space-y-3 animate-fade-in">
                {/* Priority */}
                <Field label="Priority">
                  <div className="grid grid-cols-4 gap-1">
                    {(["low","medium","high","critical"] as const).map((p) => (
                      <button
                        key={p}
                        disabled={isReadOnly}
                        onClick={() => !isReadOnly && setPriority(p)}
                        className="py-1 rounded text-[10px] font-medium border transition-all capitalize disabled:cursor-not-allowed"
                        style={{
                          background:  priority === p ? priorityColor[p] + "22" : "transparent",
                          borderColor: priority === p ? priorityColor[p] : "var(--border-subtle)",
                          color:       priority === p ? priorityColor[p] : "var(--text-muted)",
                        }}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </Field>

                {/* Notes */}
                <Field label="Notes">
                  <textarea
                    value={description}
                    disabled={isReadOnly}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Additional details, scope, access notes..."
                    rows={3}
                    className={inputCls + " resize-none disabled:opacity-85 disabled:cursor-not-allowed"}
                    style={inputStyle}
                    onFocus={onFocusBorder}
                    onBlur={onBlurBorder}
                  />
                </Field>

                {/* Precursor task */}
                <Field label="Depends On (can't start until)">
                  <div className="relative">
                    <Link2
                      size={12}
                      style={{ color: "var(--text-muted)", position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)" }}
                    />
                    <select
                      value={precursorId}
                      disabled={isReadOnly}
                      onChange={(e) => setPrecursorId(e.target.value)}
                      className={inputCls + " disabled:opacity-85 disabled:cursor-not-allowed"}
                      style={{ ...inputStyle, paddingLeft: "28px" }}
                      onFocus={onFocusBorder}
                      onBlur={onBlurBorder}
                    >
                      <option value="">No dependency</option>
                      {tasks
                        .filter((t) => t.id !== editingTask?.id)
                        .map((t) => (
                          <option key={t.id} value={t.id}>{t.task_name}</option>
                        ))}
                    </select>
                  </div>
                </Field>
              </div>
            )}
          </div>
        </div>

        {/* ── Footer ── */}
        <div
          className="flex items-center justify-between gap-2 px-4 py-3 border-t flex-shrink-0"
          style={{ background: "var(--bg-surface)", borderColor: "var(--border-subtle)" }}
        >
          {isReadOnly ? (
            <button
              onClick={closeTaskPanel}
              className="w-full py-1.5 rounded-lg text-xs font-semibold text-center transition-colors border"
              style={{ borderColor: "var(--border-subtle)", color: "var(--text-primary)", background: "transparent" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-hover)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              Close
            </button>
          ) : (
            <>
              <button
                onClick={closeTaskPanel}
                className="px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors"
                style={{ borderColor: "var(--border-subtle)", color: "var(--text-secondary)", background: "transparent" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-hover)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                Cancel
              </button>

              <button
                onClick={handleSave}
                disabled={saving || !taskName.trim()}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold transition-all disabled:opacity-50"
                style={{ background: "var(--maroon)", color: "white" }}
                onMouseEnter={(e) => { if (!saving) e.currentTarget.style.background = "var(--maroon-light)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "var(--maroon)"; }}
              >
                <Save size={12} />
                {saving ? "Saving…" : taskPanelMode === "edit" ? "Save Changes" : "Create Task"}
              </button>
            </>
          )}
        </div>
      </aside>

      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
      `}</style>
    </>
  );
}
