"use client";

import React from "react";
import type { EventContentArg } from "@fullcalendar/core";
import { AlertTriangle, Clock, Users } from "lucide-react";
import { formatHours } from "@/lib/utils/taskUtils";

export default function CalendarEventCard({ arg }: { arg: EventContentArg }) {
  const { event, view } = arg;
  const { task, isFlagged, project, isSubTask } = event.extendedProps ?? {};

  const isMonth = view.type === "dayGridMonth";
  const isList  = view.type === "listWeek";
  const isMulti = event.end && event.start
    ? Math.floor((event.end.getTime() - event.start.getTime()) / 86400000) > 0
    : false;

  // Sub-task dot — minimal
  if (isSubTask) {
    return (
      <div className="flex items-center gap-0.5 px-1 w-full min-w-0 h-full" title={event.title}>
        <span className="truncate text-[10px] leading-none opacity-75">{event.title}</span>
      </div>
    );
  }

  // ── MONTH VIEW ───────────────────────────────────────────────────────────
  if (isMonth) {
    return (
      <div
        className="flex items-center gap-1 px-1.5 w-full min-w-0 h-full"
        style={{ minHeight: "20px" }}
      >
        {isFlagged && (
          <AlertTriangle size={8} className="flex-shrink-0" style={{ color: "var(--status-warning)" }} />
        )}
        <span className="truncate text-[11px] font-medium leading-none flex-1">
          {event.title}
        </span>
        {/* Show day count for multi-day */}
        {isMulti && event.end && event.start && (
          <span
            className="flex-shrink-0 text-[9px] font-mono leading-none opacity-60 hidden sm:block"
          >
            {Math.floor((event.end.getTime() - event.start.getTime()) / 86400000)}d
          </span>
        )}
      </div>
    );
  }

  // ── LIST VIEW ────────────────────────────────────────────────────────────
  if (isList) {
    return (
      <div className="flex items-center gap-2.5 w-full py-0.5">
        {isFlagged && (
          <AlertTriangle size={11} style={{ color: "var(--status-warning)" }} className="flex-shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <span className="font-medium text-xs block truncate">{event.title}</span>
          {project && (
            <span className="text-[10px] opacity-60">{project.name}</span>
          )}
        </div>
        {task?.job_number && (
          <span className="text-[10px] font-mono opacity-50 flex-shrink-0">#{task.job_number}</span>
        )}
        {task?.estimated_hours && (
          <span className="text-[10px] flex items-center gap-0.5 opacity-60 flex-shrink-0">
            <Clock size={9} />{formatHours(task.estimated_hours)}
          </span>
        )}
      </div>
    );
  }

  // ── WEEK (time-grid) VIEW ────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full px-1.5 py-1.5 min-w-0 overflow-hidden gap-0.5">
      <div className="flex items-start gap-1">
        {isFlagged && (
          <AlertTriangle size={9} className="flex-shrink-0 mt-0.5" style={{ color: "var(--status-warning)" }} />
        )}
        <span className="text-[11px] font-semibold leading-tight truncate">{event.title}</span>
      </div>
      {project && (
        <span className="text-[9px] leading-none truncate opacity-65">{project.name}</span>
      )}
      {task?.estimated_hours && (
        <span className="text-[9px] flex items-center gap-0.5 mt-auto opacity-60 leading-none">
          <Clock size={8} />{formatHours(task.estimated_hours)}
        </span>
      )}
    </div>
  );
}
