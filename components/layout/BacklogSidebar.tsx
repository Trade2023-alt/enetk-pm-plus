"use client";

import React, { useEffect, useRef, useState } from "react";
import { useUser } from "@clerk/nextjs";
import {
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Clock,
  Plus,
  Filter,
  GripVertical,
  CheckSquare,
  Square,
  FolderOpen,
  Inbox,
} from "lucide-react";
import { useAppStore } from "@/lib/store/useAppStore";
import type { TaskWithRelations } from "@/lib/supabase/types";
import { Draggable } from "@fullcalendar/interaction";
import { formatHours, formatDeadline } from "@/lib/utils/taskUtils";
import TaskFlagBadge from "@/components/tasks/TaskFlagBadge";

type SidebarTab = "backlog" | "team";

export default function BacklogSidebar() {
  const { user } = useUser();
  const isAdmin = user?.publicMetadata?.role === "admin";

  const {
    backlogSidebarOpen,
    toggleBacklogSidebar,
    tasks,
    projects,
    openCreateModal,
    selectedProjectId,
    setSelectedProjectId,
  } = useAppStore();

  const [activeTab, setActiveTab] = useState<SidebarTab>("backlog");
  const [filterProject, setFilterProject] = useState<string>("all");
  const externalEventsRef = useRef<HTMLDivElement>(null);

  // ── FullCalendar external Draggable init ─────────────────────────────────
  useEffect(() => {
    if (!externalEventsRef.current) return;

    const draggable = new Draggable(externalEventsRef.current, {
      itemSelector: "[data-fc-draggable]",
      eventData: (eventEl: HTMLElement) => ({
        id:        eventEl.dataset.taskId ?? "",
        title:     eventEl.dataset.taskName ?? "Task",
        duration:  `${Number(eventEl.dataset.duration ?? 1).toString().padStart(2, "0")}:00`,
        color:     eventEl.dataset.color ?? "hsl(215, 25%, 38%)",
        extendedProps: {
          taskId: eventEl.dataset.taskId,
        },
      }),
    });

    return () => draggable.destroy();
  }, [backlogSidebarOpen, tasks]);

  // ── Backlog tasks: unscheduled OR unassigned ─────────────────────────────
  const backlogTasks = tasks.filter((t) => {
    // If a template project is selected, show its template tasks
    const isProjTemplate = filterProject !== "all" && filterProject !== "unassigned" && projects.find(p => p.id === filterProject)?.is_template;
    if (t.is_template) {
      return isProjTemplate && t.project_id === filterProject;
    }
    return !t.scheduled_date && t.status !== "completed";
  });

  const filteredBacklog =
    filterProject === "all"
      ? backlogTasks.filter((t) => !t.is_template)
      : filterProject === "unassigned"
      ? backlogTasks.filter((t) => !t.project_id)
      : backlogTasks.filter((t) => t.project_id === filterProject);

  const flaggedCount = backlogTasks.filter((t) => t.is_flagged && !t.is_template).length;

  const open = backlogSidebarOpen;

  return (
    <aside
      className="fixed right-0 top-0 h-full z-30 flex flex-col border-l transition-all duration-[280ms] ease-out"
      style={{
        width: open ? "var(--sidebar-w)" : "var(--sidebar-w-sm)",
        background: "var(--bg-surface)",
        borderColor: "var(--border-subtle)",
        boxShadow: "-2px 0 16px rgba(0,0,0,0.3)",
      }}
    >
      {/* ── Toggle Handle ── */}
      <button
        onClick={toggleBacklogSidebar}
        className="absolute -left-3.5 top-1/2 -translate-y-1/2 z-10 w-7 h-10 rounded-l-lg flex items-center justify-center transition-all duration-150 hover:w-8 border border-r-0"
        style={{
          background: "var(--bg-elevated)",
          borderColor: "var(--border-subtle)",
          color: "var(--text-muted)",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = "var(--text-primary)";
          e.currentTarget.style.background = "var(--maroon-subtle)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = "var(--text-muted)";
          e.currentTarget.style.background = "var(--bg-elevated)";
        }}
        title={open ? "Collapse backlog panel (B)" : "Expand backlog panel (B)"}
        aria-label={open ? "Collapse backlog panel" : "Expand backlog panel"}
      >
        {open ? <ChevronRight size={13} /> : <ChevronLeft size={13} />}
      </button>

      {/* ── Collapsed State: icon strip ── */}
      {!open && (
        <div className="flex flex-col items-center pt-4 gap-3">
          {/* Backlog icon with badge */}
          <button
            onClick={toggleBacklogSidebar}
            className="relative p-2.5 rounded-lg transition-colors"
            style={{ color: "var(--text-muted)" }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "var(--bg-hover)";
              e.currentTarget.style.color = "var(--text-primary)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = "var(--text-muted)";
            }}
            title="Open backlog"
          >
            <Inbox size={18} />
            {backlogTasks.length > 0 && (
              <span
                className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-[10px] font-bold flex items-center justify-center text-white"
                style={{ background: "var(--maroon)" }}
              >
                {backlogTasks.length > 9 ? "9+" : backlogTasks.length}
              </span>
            )}
          </button>

          {flaggedCount > 0 && (
            <button
              onClick={toggleBacklogSidebar}
              className="relative p-2.5 rounded-lg transition-colors"
              style={{ color: "var(--status-warning)" }}
              title={`${flaggedCount} flagged tasks`}
            >
              <AlertTriangle size={18} />
              <span
                className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-[10px] font-bold flex items-center justify-center"
                style={{
                  background: "var(--status-warning)",
                  color: "var(--bg-base)",
                }}
              >
                {flaggedCount}
              </span>
            </button>
          )}

          <button
            onClick={() => { openCreateModal(); }}
            className="p-2.5 rounded-lg transition-colors"
            style={{ color: "var(--text-muted)" }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "var(--maroon-subtle)";
              e.currentTarget.style.color = "var(--maroon-light)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = "var(--text-muted)";
            }}
            title="New task"
          >
            <Plus size={18} />
          </button>
        </div>
      )}

      {/* ── Expanded State ── */}
      {open && (
        <>
          {/* Header */}
          <div
            className="flex items-center justify-between px-4 h-14 border-b flex-shrink-0"
            style={{ borderColor: "var(--border-subtle)" }}
          >
            <div className="flex items-center gap-2">
              <Inbox size={15} style={{ color: "var(--text-muted)" }} />
              <span
                className="text-sm font-semibold tracking-tight"
                style={{ color: "var(--text-primary)" }}
              >
                Task Backlog
              </span>
              {backlogTasks.length > 0 && (
                <span
                  className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                  style={{
                    background: "var(--maroon-subtle)",
                    color: "var(--maroon-light)",
                  }}
                >
                  {backlogTasks.length}
                </span>
              )}
            </div>

            <button
              onClick={() => openCreateModal()}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all"
              style={{
                background: "var(--maroon)",
                color: "white",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "var(--maroon-light)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "var(--maroon)";
              }}
            >
              <Plus size={12} />
              New Task
            </button>
          </div>

          {/* Tabs */}
          <div
            className="flex border-b flex-shrink-0"
            style={{ borderColor: "var(--border-subtle)" }}
          >
            {(["backlog", ...(isAdmin ? ["team"] : [])] as SidebarTab[]).map(
              (tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className="flex-1 py-2.5 text-xs font-medium capitalize transition-all relative"
                  style={{
                    color:
                      activeTab === tab
                        ? "var(--maroon-light)"
                        : "var(--text-muted)",
                    background: "transparent",
                    borderBottom:
                      activeTab === tab
                        ? "2px solid var(--maroon)"
                        : "2px solid transparent",
                  }}
                >
                  {tab === "backlog" ? "Unscheduled" : "Team"}
                </button>
              )
            )}
          </div>

          {/* ── BACKLOG TAB ── */}
          {activeTab === "backlog" && (
            <div className="flex flex-col flex-1 overflow-hidden">
              {/* Filter bar */}
              <div
                className="px-3 py-2.5 border-b flex items-center gap-2 flex-shrink-0"
                style={{ borderColor: "var(--border-subtle)" }}
              >
                <Filter size={11} style={{ color: "var(--text-muted)" }} />
                <select
                  value={filterProject}
                  onChange={(e) => setFilterProject(e.target.value)}
                  className="flex-1 text-xs rounded-md px-2 py-1 outline-none border cursor-pointer"
                  style={{
                    background: "var(--bg-base)",
                    borderColor: "var(--border-subtle)",
                    color: "var(--text-secondary)",
                  }}
                >
                  <option value="all">All tasks</option>
                  <option value="unassigned">⚠ Unassigned</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.is_template ? `[Template] ${p.name}` : p.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Flagged warning banner */}
              {flaggedCount > 0 && filterProject === "all" && (
                <div
                  className="mx-3 mt-2.5 mb-1 px-3 py-2 rounded-lg flex items-center gap-2 flex-shrink-0 border text-xs"
                  style={{
                    background: "hsl(38, 60%, 14%)",
                    borderColor: "var(--status-warning)",
                    color: "var(--status-warning)",
                  }}
                >
                  <AlertTriangle size={12} className="flex-shrink-0" />
                  <span>
                    {flaggedCount} task{flaggedCount !== 1 ? "s" : ""} need
                    {flaggedCount === 1 ? "s" : ""} attention
                  </span>
                </div>
              )}

              {/* Drop hint */}
              <p
                className="px-4 py-2 text-[10px] leading-relaxed flex-shrink-0"
                style={{ color: "var(--text-muted)" }}
              >
                Drag tasks onto the calendar to schedule them
              </p>

              {/* Draggable task list */}
              <div
                ref={externalEventsRef}
                className="flex-1 overflow-y-auto px-2 pb-4 space-y-1.5"
                id="backlog-external-events"
              >
                {filteredBacklog.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 gap-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center"
                      style={{ background: "var(--bg-elevated)" }}
                    >
                      <CheckSquare
                        size={18}
                        style={{ color: "var(--text-muted)" }}
                      />
                    </div>
                    <p
                      className="text-xs text-center"
                      style={{ color: "var(--text-muted)" }}
                    >
                      No unscheduled tasks
                    </p>
                  </div>
                ) : (
                  filteredBacklog.map((task) => (
                    <BacklogTaskCard key={task.id} task={task} />
                  ))
                )}
              </div>
            </div>
          )}

          {/* ── TEAM TAB ── */}
          {activeTab === "team" && isAdmin && (
            <div className="flex-1 overflow-y-auto p-3">
              <TeamPanel />
            </div>
          )}
        </>
      )}
    </aside>
  );
}

// ── Backlog Task Card (draggable) ──────────────────────────────────────────

function BacklogTaskCard({ task }: { task: TaskWithRelations }) {
  const { openEditModal } = useAppStore();

  const projectColor = task.project?.color ?? "hsl(215,25%,38%)";
  const color = task.is_flagged
    ? "hsl(38,80%,40%)"
    : task.color_override ?? projectColor;

  return (
    <div
      data-fc-draggable
      data-task-id={task.id}
      data-task-name={task.task_name}
      data-duration={task.duration_hours ?? 1}
      data-color={color}
      className="group rounded-lg p-2.5 cursor-grab active:cursor-grabbing border transition-all duration-150 select-none"
      style={{
        background: "var(--bg-elevated)",
        borderColor: task.is_flagged
          ? "var(--status-warning)"
          : "var(--border-subtle)",
        borderLeftWidth: "3px",
        borderLeftColor: color,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = "var(--bg-hover)";
        e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.2)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "var(--bg-elevated)";
        e.currentTarget.style.boxShadow = "none";
      }}
      onDoubleClick={() => openEditModal(task)}
      title="Drag to calendar to schedule • Double-click to edit"
    >
      <div className="flex items-start gap-2">
        {/* Drag handle */}
        <GripVertical
          size={13}
          className="flex-shrink-0 mt-0.5 opacity-30 group-hover:opacity-60 transition-opacity"
          style={{ color: "var(--text-muted)" }}
        />

        <div className="flex-1 min-w-0">
          {/* Task name + flag */}
          <div className="flex items-start gap-1.5 mb-1">
            <span
              className="text-xs font-medium leading-snug truncate-2 flex-1"
              style={{ color: "var(--text-primary)" }}
            >
              {task.task_name}
            </span>
            {task.is_flagged && <TaskFlagBadge size="xs" />}
          </div>

          {/* Job number */}
          {task.job_number && (
            <div
              className="text-[10px] font-mono mb-1"
              style={{ color: "var(--text-muted)" }}
            >
              #{task.job_number}
            </div>
          )}

          {/* Meta row */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Project badge */}
            {task.project ? (
              <span
                className="text-[10px] px-1.5 py-0.5 rounded-sm font-medium"
                style={{
                  background: `${projectColor}22`,
                  color: projectColor,
                }}
              >
                {task.project.name}
              </span>
            ) : (
              <span
                className="text-[10px] px-1.5 py-0.5 rounded-sm"
                style={{
                  background: "hsl(38,60%,14%)",
                  color: "var(--status-warning)",
                }}
              >
                Unassigned
              </span>
            )}

            {/* Hours */}
            {task.estimated_hours && (
              <span
                className="text-[10px] flex items-center gap-0.5"
                style={{ color: "var(--text-muted)" }}
              >
                <Clock size={9} />
                {formatHours(task.estimated_hours)}
              </span>
            )}

            {/* Deadline */}
            {task.deadline && (
              <span
                className="text-[10px]"
                style={{
                  color: task.is_flagged
                    ? "var(--status-warning)"
                    : "var(--text-muted)",
                }}
              >
                {formatDeadline(task.deadline)}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Team Panel (Admin only) ────────────────────────────────────────────────

function TeamPanel() {
  const [users, setUsers] = useState<
    { id: string; full_name: string | null; email: string; role: string }[]
  >([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/users")
      .then((r) => r.json())
      .then((data) => {
        if (data.users) setUsers(data.users);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-2">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="h-12 rounded-lg animate-pulse"
            style={{ background: "var(--bg-elevated)" }}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p
        className="text-[10px] uppercase tracking-widest font-medium mb-3"
        style={{ color: "var(--text-muted)" }}
      >
        {users.length} registered member{users.length !== 1 ? "s" : ""}
      </p>
      {users.map((u) => (
        <div
          key={u.id}
          className="flex items-center gap-2.5 p-2.5 rounded-lg border"
          style={{
            background: "var(--bg-elevated)",
            borderColor: "var(--border-subtle)",
          }}
        >
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
            style={{
              background: "var(--maroon-subtle)",
              color: "var(--maroon-light)",
            }}
          >
            {(u.full_name ?? u.email)[0].toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <div
              className="text-xs font-medium truncate"
              style={{ color: "var(--text-primary)" }}
            >
              {u.full_name ?? u.email}
            </div>
            <div
              className="text-[10px] truncate"
              style={{ color: "var(--text-muted)" }}
            >
              {u.role === "admin" ? "Administrator" : "User"}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
