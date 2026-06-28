"use client";

import React from "react";
import {
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  LayoutGrid,
  List,
  Plus,
  CalendarCheck,
} from "lucide-react";
import { useAppStore } from "@/lib/store/useAppStore";
import { format, addMonths, addWeeks, subMonths, subWeeks } from "date-fns";

interface CalendarToolbarProps {
  currentDate: Date;
  onNavigate: (dir: "prev" | "next" | "today") => void;
}

type ViewOption = {
  key: "dayGridMonth" | "timeGridWeek" | "listWeek";
  label: string;
  icon: React.ComponentType<{ size?: number }>;
  shortLabel: string;
};

const VIEW_OPTIONS: ViewOption[] = [
  { key: "dayGridMonth", label: "Month",  icon: LayoutGrid,   shortLabel: "M" },
  { key: "timeGridWeek", label: "Week",   icon: CalendarDays, shortLabel: "W" },
  { key: "listWeek",     label: "List",   icon: List,         shortLabel: "L" },
];

export default function CalendarToolbar({
  currentDate,
  onNavigate,
}: CalendarToolbarProps) {
  const { calendarView, setCalendarView, openCreateModal } = useAppStore();

  const dateLabel =
    calendarView === "dayGridMonth"
      ? format(currentDate, "MMMM yyyy")
      : calendarView === "timeGridWeek"
      ? `Week of ${format(currentDate, "MMM d, yyyy")}`
      : format(currentDate, "MMM d, yyyy");

  return (
    <div
      className="flex items-center justify-between px-4 py-3 border-b flex-shrink-0"
      style={{
        background: "var(--bg-surface)",
        borderColor: "var(--border-subtle)",
      }}
    >
      {/* Left: Date navigation */}
      <div className="flex items-center gap-2">
        {/* Prev / Next */}
        <div className="flex items-center">
          <button
            onClick={() => onNavigate("prev")}
            className="p-1.5 rounded-l-md border-y border-l transition-all"
            style={{
              background: "var(--bg-elevated)",
              borderColor: "var(--border-subtle)",
              color: "var(--text-secondary)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "var(--bg-hover)";
              e.currentTarget.style.color = "var(--text-primary)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "var(--bg-elevated)";
              e.currentTarget.style.color = "var(--text-secondary)";
            }}
            aria-label="Previous"
          >
            <ChevronLeft size={14} />
          </button>
          <button
            onClick={() => onNavigate("next")}
            className="p-1.5 rounded-r-md border transition-all"
            style={{
              background: "var(--bg-elevated)",
              borderColor: "var(--border-subtle)",
              color: "var(--text-secondary)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "var(--bg-hover)";
              e.currentTarget.style.color = "var(--text-primary)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "var(--bg-elevated)";
              e.currentTarget.style.color = "var(--text-secondary)";
            }}
            aria-label="Next"
          >
            <ChevronRight size={14} />
          </button>
        </div>

        {/* Today button */}
        <button
          onClick={() => onNavigate("today")}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium border transition-all"
          style={{
            background: "var(--bg-elevated)",
            borderColor: "var(--border-subtle)",
            color: "var(--text-secondary)",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "var(--bg-hover)";
            e.currentTarget.style.color = "var(--text-primary)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "var(--bg-elevated)";
            e.currentTarget.style.color = "var(--text-secondary)";
          }}
        >
          <CalendarCheck size={11} />
          Today
        </button>

        {/* Current date label */}
        <h2
          className="text-sm font-semibold ml-1 tracking-tight"
          style={{ color: "var(--text-primary)" }}
        >
          {dateLabel}
        </h2>
      </div>

      {/* Right: View switcher + New Task */}
      <div className="flex items-center gap-2">
        {/* View switcher */}
        <div
          className="flex rounded-lg overflow-hidden border"
          style={{ borderColor: "var(--border-subtle)" }}
        >
          {VIEW_OPTIONS.map((view, idx) => {
            const Icon = view.icon;
            const isActive = calendarView === view.key;
            return (
              <button
                key={view.key}
                onClick={() => setCalendarView(view.key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-all ${
                  idx > 0 ? "border-l" : ""
                }`}
                style={{
                  background: isActive ? "var(--maroon)" : "var(--bg-elevated)",
                  borderColor: "var(--border-subtle)",
                  color: isActive ? "white" : "var(--text-secondary)",
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = "var(--bg-hover)";
                    e.currentTarget.style.color = "var(--text-primary)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = "var(--bg-elevated)";
                    e.currentTarget.style.color = "var(--text-secondary)";
                  }
                }}
                title={view.label}
                aria-pressed={isActive}
              >
                <Icon size={12} />
                <span className="hidden sm:inline">{view.label}</span>
              </button>
            );
          })}
        </div>

        {/* New Task CTA */}
        <button
          onClick={() => openCreateModal()}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
          style={{ background: "var(--maroon)", color: "white" }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "var(--maroon-light)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "var(--maroon)";
          }}
        >
          <Plus size={13} />
          New Task
        </button>
      </div>
    </div>
  );
}
