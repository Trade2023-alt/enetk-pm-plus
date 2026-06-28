"use client";

import React, { useRef, useEffect, useCallback, useMemo } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import listPlugin from "@fullcalendar/list";
import type { EventDropArg, EventClickArg, EventContentArg } from "@fullcalendar/core";
import type { EventReceiveArg, DateClickArg, EventResizeDoneArg } from "@fullcalendar/interaction";
import { useAppStore } from "@/lib/store/useAppStore";
import { getTaskColor } from "@/lib/utils/taskUtils";
import CalendarEventCard from "./CalendarEventCard";
import { format, addDays } from "date-fns";

export default function CalendarView() {
  const calendarRef = useRef<FullCalendar>(null);

  const {
    calendarView,
    tasks,
    projects,
    updateTask,
    openCreatePanel,
    openEditPanel,
    taskPanelOpen,
    backlogSidebarOpen,
    navRailExpanded,
  } = useAppStore();

  // ── Build main task events ──────────────────────────────────────────────
  const taskEvents = useMemo(() =>
    tasks
      .filter((t) => t.scheduled_date && t.status !== "completed")
      .map((task) => {
        const project = projects.find((p) => p.id === task.project_id);
        const color   = getTaskColor(task, project?.color);
        const endDate = (task as any).scheduled_end_date;

        // FullCalendar end for all-day multi-day must be exclusive (day after)
        const endStr = endDate
          ? format(addDays(new Date(endDate), 1), "yyyy-MM-dd")
          : undefined;

        return {
          id:              task.id,
          title:           task.task_name,
          start:           task.scheduled_date!,
          end:             endStr,
          allDay:          true,
          backgroundColor: color,
          borderColor:     "transparent",
          textColor:       "#E1E4EB",
          editable:        true,
          durationEditable: true,   // ← enable right-edge resize
          extendedProps:   { task, project, isFlagged: task.is_flagged },
        };
      }),
    [tasks, projects]
  );

  // ── Sub-task dot events ─────────────────────────────────────────────────
  const subTaskEvents = useMemo(() => {
    const dots: any[] = [];
    tasks.forEach((task) => {
      const project = projects.find((p) => p.id === task.project_id);
      const color   = getTaskColor(task, project?.color);
      (task.sub_tasks ?? []).forEach((st: any) => {
        if (!st.scheduled_date || st.is_completed) return;
        dots.push({
          id:              `st-${st.id ?? Math.random()}`,
          title:           `· ${st.title}`,
          start:           st.scheduled_date,
          allDay:          true,
          backgroundColor: color + "55",
          borderColor:     color,
          textColor:       "#C8CDD8",
          editable:        false,
          classNames:      ["fc-subtask-dot"],
          extendedProps:   { task, isSubTask: true },
        });
      });
    });
    return dots;
  }, [tasks, projects]);

  const calendarEvents = useMemo(() => [...taskEvents, ...subTaskEvents], [taskEvents, subTaskEvents]);

  // ── Drop: move existing event ───────────────────────────────────────────
  const handleEventDrop = useCallback(
    async (info: EventDropArg) => {
      if (info.event.extendedProps?.isSubTask) { info.revert(); return; }
      const { event, revert } = info;
      const taskId  = event.id;
      const newDate = format(event.start!, "yyyy-MM-dd");
      // Recalculate end date preserving span length
      const endDate = event.end
        ? format(addDays(event.end, -1), "yyyy-MM-dd")
        : null;

      updateTask(taskId, { scheduled_date: newDate, scheduled_end_date: endDate } as any);
      try {
        const res = await fetch(`/api/tasks/${taskId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ scheduled_date: newDate, scheduled_end_date: endDate }),
        });
        if (!res.ok) throw new Error();
      } catch {
        revert();
        updateTask(taskId, { scheduled_date: info.oldEvent.startStr.split("T")[0] } as any);
      }
    },
    [updateTask]
  );

  // ── Resize: stretch event across days ──────────────────────────────────
  const handleEventResize = useCallback(
    async (info: EventResizeDoneArg) => {
      const { event, revert } = info;
      const taskId    = event.id;
      const startDate = format(event.start!, "yyyy-MM-dd");
      // FC end is exclusive for all-day → subtract 1
      const endDate   = event.end
        ? format(addDays(event.end, -1), "yyyy-MM-dd")
        : startDate;

      updateTask(taskId, { scheduled_date: startDate, scheduled_end_date: endDate } as any);
      try {
        const res = await fetch(`/api/tasks/${taskId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ scheduled_date: startDate, scheduled_end_date: endDate }),
        });
        if (!res.ok) throw new Error();
      } catch {
        revert();
      }
    },
    [updateTask]
  );

  // ── External drop from backlog ──────────────────────────────────────────
  const handleEventReceive = useCallback(
    async (info: EventReceiveArg) => {
      const { event } = info;
      const taskId  = event.extendedProps?.taskId ?? event.id;
      const newDate = format(event.start!, "yyyy-MM-dd");
      updateTask(taskId, { scheduled_date: newDate, scheduled_time: undefined });
      event.remove();
      try {
        await fetch(`/api/tasks/${taskId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ scheduled_date: newDate, scheduled_time: null }),
        });
      } catch {
        updateTask(taskId, { scheduled_date: null as any });
      }
    },
    [updateTask]
  );

  // ── Click empty cell → open create panel ───────────────────────────────
  const handleDateClick = useCallback(
    (info: DateClickArg) => {
      openCreatePanel(format(info.date, "yyyy-MM-dd"));
    },
    [openCreatePanel]
  );

  // ── Select range → open create panel with start+end ────────────────────
  const handleSelect = useCallback(
    (info: { startStr: string; endStr: string; allDay: boolean }) => {
      if (!info.allDay) return;
      const start = info.startStr.split("T")[0];
      // FC select end is exclusive for all-day
      const end   = format(addDays(new Date(info.endStr), -1), "yyyy-MM-dd");
      if (start === end) {
        openCreatePanel(start);
      } else {
        openCreatePanel(start, end);
      }
    },
    [openCreatePanel]
  );

  // ── Click existing event → open edit panel ──────────────────────────────
  const handleEventClick = useCallback(
    (info: EventClickArg) => {
      if (info.event.extendedProps?.isSubTask) {
        // Click sub-task dot → open parent task
        const task = info.event.extendedProps?.task;
        if (task) openEditPanel(task);
        return;
      }
      const task = info.event.extendedProps?.task;
      if (task) openEditPanel(task);
    },
    [openEditPanel]
  );

  // ── Sync view ───────────────────────────────────────────────────────────
  useEffect(() => {
    calendarRef.current?.getApi().changeView(calendarView);
  }, [calendarView]);

  // ── Resize when sidebars or panel toggle ────────────────────────────────
  useEffect(() => {
    const timer = setTimeout(() => calendarRef.current?.getApi().updateSize(), 300);
    return () => clearTimeout(timer);
  }, [backlogSidebarOpen, navRailExpanded, taskPanelOpen]);

  return (
    <div className="h-full w-full p-1">
      <style>{`
        /* Sub-task dot events — smaller, less prominent */
        .fc-subtask-dot .fc-event-title { font-size: 10px; opacity: 0.75; }
        .fc-subtask-dot { border-radius: 3px !important; padding: 0 2px !important; }
        /* Make resize handle more visible */
        .fc-event-resizer { opacity: 0.7; }
        .fc-event-resizer:hover { opacity: 1; }
      `}</style>
      <FullCalendar
        ref={calendarRef}
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
        initialView={calendarView}
        headerToolbar={false}
        events={calendarEvents}
        editable={true}
        droppable={true}
        selectable={true}
        selectMirror={true}
        eventResizableFromStart={false}
        dayMaxEvents={5}
        nowIndicator={true}
        eventDrop={handleEventDrop}
        eventResize={handleEventResize}
        eventReceive={handleEventReceive}
        dateClick={handleDateClick}
        select={handleSelect}
        eventClick={handleEventClick}
        eventContent={(arg: EventContentArg) => (
          <CalendarEventCard arg={arg} />
        )}
        height="100%"
        weekends={true}
        firstDay={0}
        slotDuration="00:30:00"
        slotLabelInterval="01:00"
        scrollTime="07:00:00"
        businessHours={{ daysOfWeek: [1,2,3,4,5], startTime: "07:00", endTime: "18:00" }}
        eventTimeFormat={{ hour: "2-digit", minute: "2-digit", hour12: false }}
      />
    </div>
  );
}
