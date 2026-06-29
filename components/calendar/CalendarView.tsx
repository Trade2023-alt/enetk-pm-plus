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

interface CalendarViewProps {
  calendarRef: React.RefObject<FullCalendar | null>;
}

export default function CalendarView({ calendarRef }: CalendarViewProps) {
  const [usersList, setUsersList] = React.useState<any[]>([]);

  useEffect(() => {
    fetch("/api/users")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data.users)) {
          setUsersList(data.users);
        }
      })
      .catch(() => {});
  }, []);

  const {
    calendarView,
    tasks,
    projects,
    updateTask,
    updateProject,
    openCreatePanel,
    openEditPanel,
    taskPanelOpen,
    backlogSidebarOpen,
    navRailExpanded,
    setCalendarApi,
    selectedEmployeeId,
  } = useAppStore();

  useEffect(() => {
    if (calendarRef.current) {
      setCalendarApi(calendarRef.current.getApi());
    }
    return () => setCalendarApi(null);
  }, [calendarRef, setCalendarApi]);

  // ── Build main task events ──────────────────────────────────────────────
  const taskEvents = useMemo(() => {
    const list: any[] = [];
    tasks
      .filter((t) => t.scheduled_date && t.status !== "completed" && !t.is_template && t.on_calendar)
      .forEach((task) => {
        const taskAssignedTo = task.assigned_to;
        const project = projects.find((p) => p.id === task.project_id);
        const color   = getTaskColor(task, project?.color);
        
        const dailyPlan = task.daily_hours_plan as Record<string, any> | null;
        const hasDailyHours = dailyPlan && Object.values(dailyPlan).some((val) => {
          const hrs = typeof val === "object" && val !== null ? (val.hours ?? 0) : (typeof val === "number" ? val : 0);
          return hrs > 0;
        });

        if (hasDailyHours) {
          // Task has a daily hours plan: split into daily events for days with hrs > 0
          Object.entries(dailyPlan!).forEach(([dateStr, val]) => {
            const hrs = typeof val === "object" && val !== null ? (val.hours ?? 0) : (typeof val === "number" ? val : 0);
            if (hrs <= 0) return;

            // Find daily subtask if any
            let dailyAssignedTo = taskAssignedTo;
            let dailySubTask = null;
            if (typeof val === "object" && val !== null && val.sub_task_id) {
              dailySubTask = (task.sub_tasks ?? []).find((st: any) => st.id === val.sub_task_id);
              if (dailySubTask && dailySubTask.assigned_to) {
                dailyAssignedTo = dailySubTask.assigned_to;
              }
            }

            // Apply employee filter
            if (selectedEmployeeId) {
              if (selectedEmployeeId === "unassigned") {
                if (dailyAssignedTo) return;
              } else if (dailyAssignedTo !== selectedEmployeeId) {
                return;
              }
            }

            list.push({
              id:              `${task.id}__${dateStr}`, // unique ID per day
              title:           task.task_name,
              start:           dateStr,
              allDay:          true,
              backgroundColor: color,
              borderColor:     "transparent",
              textColor:       "#E1E4EB",
              editable:        true,
              durationEditable: false, // daily events have fixed 1-day duration
              extendedProps:   { task, project, isTask: true, isDailyPlanned: true, plannedDate: dateStr, plannedHours: hrs, assignedUser: dailySubTask?.assigned_to ? usersList.find(u => u.id === dailySubTask.assigned_to) : null },
            });
          });
        } else {
          // Apply employee filter
          if (selectedEmployeeId) {
            if (selectedEmployeeId === "unassigned") {
              if (taskAssignedTo) return;
            } else if (taskAssignedTo !== selectedEmployeeId) {
              return;
            }
          }

          // Fallback: render single event spanning from scheduled_date to scheduled_end_date
          const endDate = (task as any).scheduled_end_date;
          const endStr = endDate
            ? format(addDays(new Date(endDate), 1), "yyyy-MM-dd")
            : undefined;

          list.push({
            id:              task.id,
            title:           task.task_name,
            start:           task.scheduled_date!,
            end:             endStr,
            allDay:          true,
            backgroundColor: color,
            borderColor:     "transparent",
            textColor:       "#E1E4EB",
            editable:        true,
            durationEditable: true,
            extendedProps:   { task, project, isTask: true },
          });
        }
      });
    return list;
  }, [tasks, projects, selectedEmployeeId, usersList]);

  // ── Sub-task dot events ─────────────────────────────────────────────────
  const subTaskEvents = useMemo(() => {
    const dots: any[] = [];
    tasks.forEach((task) => {
      const project = projects.find((p) => p.id === task.project_id);
      const color   = getTaskColor(task, project?.color);
      (task.sub_tasks ?? []).forEach((st: any) => {
        if (!st.scheduled_date || st.is_completed) return;
        
        // Apply employee filter
        if (selectedEmployeeId) {
          if (selectedEmployeeId === "unassigned") {
            if (st.assigned_to) return;
          } else if (st.assigned_to !== selectedEmployeeId) {
            return;
          }
        }

        const assignedUser = st.assigned_to ? usersList.find(u => u.id === st.assigned_to) : null;

        dots.push({
          id:              `st-${st.id ?? Math.random()}`,
          title:           `· ${st.title}`,
          start:           st.scheduled_date,
          allDay:          true,
          backgroundColor: color + "33",
          borderColor:     color,
          textColor:       "#C8CDD8",
          editable:        true, // sub-tasks are draggable!
          classNames:      ["fc-subtask-dot"],
          extendedProps:   { task, isSubTask: true, subTaskId: st.id, taskId: task.id, assignedUser },
        });
      });
    });
    return dots;
  }, [tasks, projects, usersList, selectedEmployeeId]);

  // ── Project banner events ───────────────────────────────────────────────
  const projectEvents = useMemo(() => {
    if (selectedEmployeeId) return [];

    return projects
      .filter((p) => p.start_date && p.status !== "completed" && p.status !== "archived")
      .map((proj) => {
        const endStr = proj.end_date
          ? format(addDays(new Date(proj.end_date), 1), "yyyy-MM-dd")
          : undefined;

        return {
          id:              `proj-${proj.id}`,
          title:           `📁 PROJECT: ${proj.name}`,
          start:           proj.start_date!,
          end:             endStr,
          allDay:          true,
          backgroundColor: proj.color ?? "var(--maroon)",
          borderColor:     "transparent",
          textColor:       "#FFFFFF",
          editable:        true,
          durationEditable: true,
          classNames:      ["fc-project-banner"],
          extendedProps:   { project: proj, isProject: true },
        };
      });
  }, [projects, selectedEmployeeId]);

  const calendarEvents = useMemo(() => [...taskEvents, ...subTaskEvents, ...projectEvents], [taskEvents, subTaskEvents, projectEvents]);

  // ── Drop: move existing event ───────────────────────────────────────────
  const handleEventDrop = useCallback(
    async (info: EventDropArg) => {
      const { event, revert } = info;
      const isSubTask = event.extendedProps?.isSubTask || event.id.startsWith("st-");
      const isProject = event.extendedProps?.isProject || event.id.startsWith("proj-");
      const newDate = format(event.start!, "yyyy-MM-dd");
      const endDate = event.end
        ? format(addDays(event.end, -1), "yyyy-MM-dd")
        : null;

      if (isSubTask) {
        const subTaskId = event.id.replace("st-", "");
        const parentTaskId = event.extendedProps?.taskId;
        if (parentTaskId) {
          const task = tasks.find(t => t.id === parentTaskId);
          if (task) {
            const updatedSubTasks = (task.sub_tasks ?? []).map((st: any) =>
              st.id === subTaskId ? { ...st, scheduled_date: newDate, on_calendar: true } : st
            );
            updateTask(parentTaskId, { sub_tasks: updatedSubTasks } as any);
          }
        }
        try {
          const res = await fetch(`/api/sub-tasks/${subTaskId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ scheduled_date: newDate, on_calendar: true }),
          });
          if (!res.ok) throw new Error();
        } catch {
          revert();
          if (parentTaskId) {
            const task = tasks.find(t => t.id === parentTaskId);
            if (task) {
              const updatedSubTasks = (task.sub_tasks ?? []).map((st: any) =>
                st.id === subTaskId ? { ...st, scheduled_date: info.oldEvent.startStr.split("T")[0] } : st
              );
              updateTask(parentTaskId, { sub_tasks: updatedSubTasks } as any);
            }
          }
        }
        return;
      }

      if (isProject) {
        const projectId = event.id.replace("proj-", "");
        updateProject(projectId, { start_date: newDate, end_date: endDate, on_calendar: true });
        try {
          const res = await fetch(`/api/projects/${projectId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ start_date: newDate, end_date: endDate, on_calendar: true }),
          });
          if (!res.ok) throw new Error();
        } catch {
          revert();
        }
        return;
      }

      // Default: Task
      const isDailyPlanned = event.extendedProps?.isDailyPlanned;
      if (isDailyPlanned) {
        const [taskId, oldDateStr] = event.id.split("__");
        const task = tasks.find(t => t.id === taskId);
        if (task) {
          const currentPlan = { ...(task.daily_hours_plan as Record<string, any> ?? {}) };
          const hrsVal = currentPlan[oldDateStr];
          delete currentPlan[oldDateStr];
          currentPlan[newDate] = hrsVal;

          updateTask(taskId, { daily_hours_plan: currentPlan, on_calendar: true } as any);
          try {
            const res = await fetch(`/api/tasks/${taskId}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ daily_hours_plan: currentPlan, on_calendar: true }),
            });
            if (!res.ok) throw new Error();
          } catch {
            revert();
            const restoredPlan = { ...(task.daily_hours_plan as Record<string, any> ?? {}) };
            updateTask(taskId, { daily_hours_plan: restoredPlan } as any);
          }
        }
        return;
      }

      const taskId  = event.id;
      updateTask(taskId, { scheduled_date: newDate, scheduled_end_date: endDate, on_calendar: true } as any);
      try {
        const res = await fetch(`/api/tasks/${taskId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ scheduled_date: newDate, scheduled_end_date: endDate, on_calendar: true }),
        });
        if (!res.ok) throw new Error();
      } catch {
        revert();
        updateTask(taskId, { scheduled_date: info.oldEvent.startStr.split("T")[0] } as any);
      }
    },
    [updateTask, updateProject, tasks]
  );

  // ── Resize: stretch event across days ──────────────────────────────────
  const handleEventResize = useCallback(
    async (info: EventResizeDoneArg) => {
      const { event, revert } = info;
      const isProject = event.extendedProps?.isProject || event.id.startsWith("proj-");
      const startDate = format(event.start!, "yyyy-MM-dd");
      const endDate   = event.end
        ? format(addDays(event.end, -1), "yyyy-MM-dd")
        : startDate;

      if (isProject) {
        const projectId = event.id.replace("proj-", "");
        updateProject(projectId, { start_date: startDate, end_date: endDate, on_calendar: true });
        try {
          const res = await fetch(`/api/projects/${projectId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ start_date: startDate, end_date: endDate, on_calendar: true }),
          });
          if (!res.ok) throw new Error();
        } catch {
          revert();
        }
        return;
      }

      // Default: Task
      const taskId = event.id;
      updateTask(taskId, { scheduled_date: startDate, scheduled_end_date: endDate, on_calendar: true } as any);
      try {
        const res = await fetch(`/api/tasks/${taskId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ scheduled_date: startDate, scheduled_end_date: endDate, on_calendar: true }),
        });
        if (!res.ok) throw new Error();
      } catch {
        revert();
      }
    },
    [updateTask, updateProject]
  );

  // ── External drop from backlog ──────────────────────────────────────────
  const handleEventReceive = useCallback(
    async (info: EventReceiveArg) => {
      const { event } = info;
      const isSubTask = event.extendedProps?.isSubTask || event.id.startsWith("st-");
      const isProject = event.extendedProps?.isProject || event.id.startsWith("proj-");
      const newDate = format(event.start!, "yyyy-MM-dd");

      if (isSubTask) {
        const subTaskId = event.extendedProps?.subTaskId || event.id.replace("st-", "");
        const parentTaskId = event.extendedProps?.taskId;
        event.remove();

        if (parentTaskId) {
          const task = tasks.find(t => t.id === parentTaskId);
          if (task) {
            const updatedSubTasks = (task.sub_tasks ?? []).map((st: any) =>
              st.id === subTaskId ? { ...st, scheduled_date: newDate, on_calendar: true } : st
            );
            updateTask(parentTaskId, { sub_tasks: updatedSubTasks } as any);
          }
        }

        try {
          await fetch(`/api/sub-tasks/${subTaskId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ scheduled_date: newDate, on_calendar: true }),
          });
        } catch {
          if (parentTaskId) {
            const task = tasks.find(t => t.id === parentTaskId);
            if (task) {
              const updatedSubTasks = (task.sub_tasks ?? []).map((st: any) =>
                st.id === subTaskId ? { ...st, scheduled_date: null, on_calendar: false } : st
              );
              updateTask(parentTaskId, { sub_tasks: updatedSubTasks } as any);
            }
          }
        }
        return;
      }

      if (isProject) {
        const projectId = event.extendedProps?.projectId || event.id.replace("proj-", "");
        event.remove();
        updateProject(projectId, { start_date: newDate, end_date: newDate, on_calendar: true });
        try {
          await fetch(`/api/projects/${projectId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ start_date: newDate, end_date: newDate, on_calendar: true }),
          });
        } catch {
          updateProject(projectId, { start_date: null, end_date: null, on_calendar: false });
        }
        return;
      }

      // Default: Task
      const taskId  = event.extendedProps?.taskId ?? event.id;
      updateTask(taskId, { scheduled_date: newDate, scheduled_time: undefined, on_calendar: true });
      event.remove();
      try {
        await fetch(`/api/tasks/${taskId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ scheduled_date: newDate, scheduled_time: null, on_calendar: true }),
        });
      } catch {
        updateTask(taskId, { scheduled_date: null as any, on_calendar: false });
      }
    },
    [updateTask, updateProject, tasks]
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
          <CalendarEventCard arg={arg} usersList={usersList} />
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
