"use client";

import React from "react";
import type { EventContentArg } from "@fullcalendar/core";
import { AlertTriangle, Clock } from "lucide-react";
import { formatHours } from "@/lib/utils/taskUtils";

interface CalendarEventCardProps {
  arg: EventContentArg;
}

export default function CalendarEventCard({ arg }: CalendarEventCardProps) {
  const { event, view } = arg;
  const { task, isFlagged } = event.extendedProps ?? {};

  const isMonthView = view.type === "dayGridMonth";
  const isListView  = view.type === "listWeek";

  if (isMonthView) {
    return (
      <div className="flex items-center gap-1 px-1 w-full min-w-0 h-full">
        {isFlagged && (
          <AlertTriangle size={9} className="flex-shrink-0" style={{ color: "var(--status-warning)" }} />
        )}
        <span className="truncate text-[11px] font-medium leading-none">
          {event.title}
        </span>
        {task?.estimated_hours && (
          <span
            className="flex-shrink-0 text-[9px] opacity-70 hidden sm:inline"
          >
            {formatHours(task.estimated_hours)}
          </span>
        )}
      </div>
    );
  }

  if (isListView) {
    return (
      <div className="flex items-center gap-2 w-full">
        {isFlagged && (
          <AlertTriangle size={11} style={{ color: "var(--status-warning)" }} className="flex-shrink-0" />
        )}
        <span className="font-medium text-xs">{event.title}</span>
        {task?.job_number && (
          <span
            className="text-[10px] font-mono opacity-60"
          >
            #{task.job_number}
          </span>
        )}
        {task?.estimated_hours && (
          <span className="ml-auto text-[10px] flex items-center gap-0.5 opacity-60 flex-shrink-0">
            <Clock size={9} />
            {formatHours(task.estimated_hours)}
          </span>
        )}
      </div>
    );
  }

  // Time grid (week view) — more detail
  return (
    <div className="flex flex-col h-full px-1.5 py-1 min-w-0 overflow-hidden">
      <div className="flex items-center gap-1 mb-0.5">
        {isFlagged && (
          <AlertTriangle size={9} className="flex-shrink-0 flex-none" style={{ color: "var(--status-warning)" }} />
        )}
        <span className="text-[11px] font-semibold leading-tight truncate">
          {event.title}
        </span>
      </div>
      {task?.job_number && (
        <span
          className="text-[9px] font-mono leading-none truncate"
          style={{ opacity: 0.65 }}
        >
          #{task.job_number}
        </span>
      )}
      {task?.estimated_hours && (
        <span
          className="text-[9px] flex items-center gap-0.5 mt-auto leading-none"
          style={{ opacity: 0.65 }}
        >
          <Clock size={8} />
          {formatHours(task.estimated_hours)}
        </span>
      )}
    </div>
  );
}
