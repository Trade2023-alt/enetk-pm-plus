"use client";

import React, { useEffect, useRef, useState } from "react";
import { useAppStore } from "@/lib/store/useAppStore";
import CalendarView from "@/components/calendar/CalendarView";
import CalendarToolbar from "@/components/calendar/CalendarToolbar";
import MetricsBar from "@/components/dashboard/MetricsBar";
import TaskPanel from "@/components/tasks/TaskPanel";
import type { TaskWithRelations, Project } from "@/lib/supabase/types";
import FullCalendar from "@fullcalendar/react";

export default function DashboardPage() {
  const {
    setTasks, setProjects, tasks, projects,
    backlogSidebarOpen, navRailExpanded, taskPanelOpen, calendarApi
  } = useAppStore();

  const [loading,     setLoading]     = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [metrics,     setMetrics]     = useState({
    totalUsers:       0,
    overdueCount:     0,
    unscheduledCount: 0,
    weeklyHours:      { estimated: 0, used: 0 },
    flaggedCount:     0,
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
        if (tasksRes.ok)    setTasks((await tasksRes.json()).tasks as TaskWithRelations[]);
        if (projectsRes.ok) setProjects((await projectsRes.json()).projects as Project[]);
        if (metricsRes.ok)  setMetrics(await metricsRes.json());
      } catch (err) {
        console.error("Failed to load dashboard data:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [setTasks, setProjects]);

  // ── Recompute live metrics from task store ────────────────────────────────
  useEffect(() => {
    const today = new Date().toISOString().split("T")[0];
    setMetrics((prev) => ({
      ...prev,
      overdueCount:     tasks.filter((t) => t.status !== "completed" && t.deadline && t.deadline < today).length,
      unscheduledCount: tasks.filter((t) => !t.scheduled_date && t.status !== "completed").length,
      flaggedCount:     tasks.filter((t) => t.is_flagged).length,
    }));
  }, [tasks]);

  // ── Calendar nav ──────────────────────────────────────────────────────────
  function handleNavigate(dir: "prev" | "next" | "today") {
    if (!calendarApi) return;
    if (dir === "prev")  calendarApi.prev();
    if (dir === "next")  calendarApi.next();
    if (dir === "today") calendarApi.today();
    setCurrentDate(calendarApi.getDate());
  }

  const sidebarW = backlogSidebarOpen ? "var(--sidebar-w)" : "var(--sidebar-w-sm)";
  // When task panel open, add 360px right margin so calendar doesn't hide behind panel
  const panelW   = taskPanelOpen ? "360px" : "0px";

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
            Loading schedule…
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex flex-col h-full overflow-hidden transition-all duration-[280ms]"
      style={{ paddingRight: `calc(${sidebarW} + ${panelW})` }}
    >
      {/* Metrics bar */}
      <MetricsBar {...metrics} />

      {/* Calendar toolbar */}
      <CalendarToolbar currentDate={currentDate} onNavigate={handleNavigate} />

      {/* Calendar */}
      <div className="flex-1 overflow-hidden p-3">
        <CalendarView calendarRef={calendarRef} />
      </div>

      {/* Slide-in task panel (replaces modal) */}
      <TaskPanel />
    </div>
  );
}
