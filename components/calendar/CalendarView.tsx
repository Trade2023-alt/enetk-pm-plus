"use client";

import React, { useRef, useEffect, useCallback } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import listPlugin from "@fullcalendar/list";
import type {
  EventDropArg,
  EventClickArg,
  EventContentArg,
} from "@fullcalendar/core";
import type { EventReceiveArg, DateClickArg } from "@fullcalendar/interaction";
import { useAppStore } from "@/lib/store/useAppStore";
import { getTaskColor } from "@/lib/utils/taskUtils";
import CalendarEventCard from "./CalendarEventCard";
import { format } from "date-fns";

export default function CalendarView() {
  const calendarRef = useRef<FullCalendar>(null);

  const {
    calendarView,
    tasks,
    projects,
    updateTask,
    openCreateModal,
    openEditModal,
    backlogSidebarOpen,
    navRailExpanded,
  } = useAppStore();

  // Build FullCalendar events from tasks
  const calendarEvents = tasks
    .filter((t) => t.scheduled_date && t.status !== "completed")
    .map((task) => {
      const project = projects.find((p) => p.id === task.project_id);
      const color = getTaskColor(task, project?.color);

      const startDate = task.scheduled_time
        ? `${task.scheduled_date}T${task.scheduled_time}`
        : task.scheduled_date!;

      return {
        id: task.id,
        title: task.task_name,
        start: startDate,
        duration: task.scheduled_time
          ? { hours: task.duration_hours ?? 1 }
          : undefined,
        allDay: !task.scheduled_time,
        backgroundColor: color,
        borderColor: "transparent",
        textColor: "#E1E4EB",
        extendedProps: {
          task,
          project,
          isFlagged: task.is_flagged,
        },
      };
    });

  // ── Handler: existing calendar event moved ───────────────────────────────
  const handleEventDrop = useCallback(
    async (info: EventDropArg) => {
      const { event, revert } = info;
      const taskId = event.id;
      const newDate = format(event.start!, "yyyy-MM-dd");
      const newTime = event.allDay
        ? null
        : format(event.start!, "HH:mm:ss");

      // Optimistic update
      updateTask(taskId, { scheduled_date: newDate, scheduled_time: newTime ?? undefined });

      try {
        const res = await fetch(`/api/tasks/${taskId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            scheduled_date: newDate,
            scheduled_time: newTime,
          }),
        });
        if (!res.ok) throw new Error("Update failed");
      } catch {
        revert();
        updateTask(taskId, {
          scheduled_date: info.oldEvent.startStr.split("T")[0],
        });
      }
    },
    [updateTask]
  );

  // ── Handler: external item (from backlog sidebar) dropped ────────────────
  const handleEventReceive = useCallback(
    async (info: EventReceiveArg) => {
      const { event } = info;
      const taskId = event.extendedProps?.taskId ?? event.id;
      const newDate = format(event.start!, "yyyy-MM-dd");
      const newTime = event.allDay
        ? null
        : format(event.start!, "HH:mm:ss");

      // Optimistic update in store
      updateTask(taskId, {
        scheduled_date: newDate,
        scheduled_time: newTime ?? undefined,
      });

      // Remove the ghost FC event — our store will re-render the real one
      event.remove();

      try {
        const res = await fetch(`/api/tasks/${taskId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            scheduled_date: newDate,
            scheduled_time: newTime,
          }),
        });
        if (!res.ok) throw new Error("Failed to schedule task");
      } catch {
        // Rollback
        updateTask(taskId, { scheduled_date: null as any });
        console.error("Failed to save task schedule");
      }
    },
    [updateTask]
  );

  // ── Handler: click on empty date cell → open create modal ───────────────
  const handleDateClick = useCallback(
    (info: DateClickArg) => {
      openCreateModal(format(info.date, "yyyy-MM-dd"));
    },
    [openCreateModal]
  );

  // ── Handler: click on existing event → open edit modal ──────────────────
  const handleEventClick = useCallback(
    (info: EventClickArg) => {
      const task = info.event.extendedProps?.task;
      if (task) openEditModal(task);
    },
    [openEditModal]
  );

  // ── Sync calendar view ───────────────────────────────────────────────────
  useEffect(() => {
    calendarRef.current?.getApi().changeView(calendarView);
  }, [calendarView]);

  // ── Resize calendar when sidebars toggle ────────────────────────────────
  useEffect(() => {
    const timer = setTimeout(() => {
      calendarRef.current?.getApi().updateSize();
    }, 300);
    return () => clearTimeout(timer);
  }, [backlogSidebarOpen, navRailExpanded]);

  return (
    <div className="h-full w-full p-1">
      <FullCalendar
        ref={calendarRef}
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
        initialView={calendarView}
        headerToolbar={false} // We use our custom CalendarToolbar
        events={calendarEvents}
        editable={true}
        droppable={true}
        selectable={true}
        selectMirror={true}
        dayMaxEvents={4}
        nowIndicator={true}
        eventDrop={handleEventDrop}
        eventReceive={handleEventReceive}
        dateClick={handleDateClick}
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
        businessHours={{
          daysOfWeek: [1, 2, 3, 4, 5],
          startTime: "07:00",
          endTime: "18:00",
        }}
        eventTimeFormat={{
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        }}
      />
    </div>
  );
}
