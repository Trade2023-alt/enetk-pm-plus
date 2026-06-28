"use client";

import React, { useEffect, useRef, useState } from "react";
import { useAppStore } from "@/lib/store/useAppStore";
import CalendarView from "@/components/calendar/CalendarView";
import CalendarToolbar from "@/components/calendar/CalendarToolbar";
import MetricsBar from "@/components/dashboard/MetricsBar";
import TaskModal from "@/components/tasks/TaskModal";
import type { TaskWithRelations, Project } from "@/lib/supabase/types";
import FullCalendar from "@fullcalendar/react";

export default function DashboardPage() {
  const { setTasks, setProjects, tasks, projects, backlogSidebarOpen, navRailExpanded } = useAppStore();
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [metrics, setMetrics] = useState({
    totalUsers: 0,
    overdueCount: 0,
    unscheduledCount: 0,
    weeklyHours: { estimated: 0, used: 0 },
    flaggedCount: 0,
  });

  const calendarRef = useRef<FullCalendar>(null);

  // ── Fetch initial data ────────────────────────────────────────────────────
  useEffect(() => {
    async function loadData() {
      try {
        const [tasksRes, projectsRes, metricsRes] = await Promise.all([
          fetch("/api/tasks"),
          fetch("/api/projects"),
          fetch("/api/metrics"),
        ]);

        if (tasksRes.ok) {
          const { tasks: t } = await tasksRes.json();
          setTasks(t as TaskWithRelations[]);
        }

        if (projectsRes.ok) {
          const { projects: p } = await projectsRes.json();
          setProjects(p as Project[]);
        }

        if (metricsRes.ok) {
          const m = await metricsRes.json();
          setMetrics(m);
        }
      } catch (err) {
        console.error("Failed to load dashboard data:", err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [setTasks, setProjects]);

  // ── Re-compute metrics when tasks change ─────────────────────────────────
  useEffect(() => {
    setMetrics((prev) => ({
      ...prev,
      overdueCount:     tasks.filter((t) => t.status === "overdue").length,
      unscheduledCount: tasks.filter((t) => !t.scheduled_date && t.status !== "completed").length,
      flaggedCount:     tasks.filter((t) => t.is_flagged).length,
    }));
  }, [tasks]);

  // ── Calendar navigation ───────────────────────────────────────────────────
  function handleNavigate(dir: "prev" | "next" | "today") {
    const api = calendarRef.current?.getApi();
    if (!api) return;
    if (dir === "prev")  api.prev();
    if (dir === "next")  api.next();
    if (dir === "today") api.today();
    setCurrentDate(api.getDate());
  }

  // ── Dynamic right padding for sidebar ────────────────────────────────────
  const sidebarW = backlogSidebarOpen ? "var(--sidebar-w)" : "var(--sidebar-w-sm)";
  const navW     = navRailExpanded    ? "var(--nav-w)"     : "var(--nav-w-sm)";

  if (loading) {
    return (
      <div
        className="flex-1 flex items-center justify-center"
        style={{ paddingRight: sidebarW }}
      >
        <div className="flex flex-col items-center gap-3">
          <div
            className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
            style={{ borderColor: "var(--maroon)" }}
          />
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            Loading schedule...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex flex-col h-full overflow-hidden transition-all duration-[280ms]"
      style={{ paddingRight: sidebarW }}
    >
      {/* Metrics bar */}
      <MetricsBar {...metrics} />

      {/* Calendar toolbar */}
      <CalendarToolbar
        currentDate={currentDate}
        onNavigate={handleNavigate}
      />

      {/* Calendar */}
      <div className="flex-1 overflow-hidden p-3">
        <CalendarView />
      </div>

      {/* Task create/edit modal */}
      <TaskModal />
    </div>
  );
}
