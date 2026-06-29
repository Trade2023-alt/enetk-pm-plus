"use client";

import React from "react";
import {
  ChevronLeft, ChevronRight, LayoutGrid, CalendarDays, List, Plus, CalendarCheck,
} from "lucide-react";
import { useAppStore } from "@/lib/store/useAppStore";
import { format } from "date-fns";

interface CalendarToolbarProps {
  currentDate: Date;
  onNavigate: (dir: "prev" | "next" | "today") => void;
}

const VIEW_OPTIONS = [
  { key: "dayGridMonth" as const, label: "Month", icon: LayoutGrid  },
  { key: "timeGridWeek" as const, label: "Week",  icon: CalendarDays },
  { key: "listWeek"     as const, label: "Agenda",icon: List        },
];

export default function CalendarToolbar({ currentDate, onNavigate }: CalendarToolbarProps) {
  const { calendarView, setCalendarView, openCreatePanel, selectedEmployeeId, setSelectedEmployeeId } = useAppStore();
  const [users, setUsers] = React.useState<any[]>([]);

  React.useEffect(() => {
    fetch("/api/users")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data.users)) {
          setUsers(data.users);
        }
      })
      .catch(() => {});
  }, []);

  const dateLabel =
    calendarView === "dayGridMonth"
      ? format(currentDate, "MMMM yyyy")
      : calendarView === "timeGridWeek"
      ? `Week of ${format(currentDate, "MMM d, yyyy")}`
      : format(currentDate, "MMM d, yyyy");

  return (
    <div
      className="flex items-center justify-between px-5 py-3 border-b flex-shrink-0"
      style={{ background: "var(--bg-surface)", borderColor: "var(--border-subtle)" }}
    >
      {/* ── Left: navigation ── */}
      <div className="flex items-center gap-3">
        {/* Prev / Next group */}
        <div
          className="flex rounded-lg overflow-hidden border"
          style={{ borderColor: "var(--border-subtle)" }}
        >
          <button
            onClick={() => onNavigate("prev")}
            className="p-2 transition-colors"
            style={{ background: "var(--bg-elevated)", color: "var(--text-secondary)" }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "var(--bg-hover)"; e.currentTarget.style.color = "var(--text-primary)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "var(--bg-elevated)"; e.currentTarget.style.color = "var(--text-secondary)"; }}
            aria-label="Previous period"
          >
            <ChevronLeft size={15} />
          </button>
          <button
            onClick={() => onNavigate("next")}
            className="p-2 border-l transition-colors"
            style={{ background: "var(--bg-elevated)", borderColor: "var(--border-subtle)", color: "var(--text-secondary)" }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "var(--bg-hover)"; e.currentTarget.style.color = "var(--text-primary)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "var(--bg-elevated)"; e.currentTarget.style.color = "var(--text-secondary)"; }}
            aria-label="Next period"
          >
            <ChevronRight size={15} />
          </button>
        </div>

        {/* Today */}
        <button
          onClick={() => onNavigate("today")}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors"
          style={{ background: "var(--bg-elevated)", borderColor: "var(--border-subtle)", color: "var(--text-secondary)" }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "var(--bg-hover)"; e.currentTarget.style.color = "var(--text-primary)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "var(--bg-elevated)"; e.currentTarget.style.color = "var(--text-secondary)"; }}
        >
          <CalendarCheck size={12} />
          Today
        </button>

        {/* Current period label */}
        <h2
          className="text-base font-semibold tracking-tight"
          style={{ color: "var(--text-primary)" }}
        >
          {dateLabel}
        </h2>
      </div>

      {/* ── Right: view switcher + new task ── */}
      <div className="flex items-center gap-2.5">
        {/* Employee Filter */}
        <select
          value={selectedEmployeeId ?? ""}
          onChange={(e) => setSelectedEmployeeId(e.target.value || null)}
          className="text-xs rounded-lg border px-2.5 py-1.5 outline-none transition-colors cursor-pointer"
          style={{
            background: "var(--bg-elevated)",
            borderColor: selectedEmployeeId ? "var(--maroon)" : "var(--border-subtle)",
            color: selectedEmployeeId ? "var(--text-primary)" : "var(--text-secondary)",
            height: "30px",
          }}
          title="Filter by Assigned Employee"
        >
          <option value="">All Employees</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.full_name || u.email.split("@")[0]}
            </option>
          ))}
        </select>

        {/* View switcher */}
        <div
          className="flex rounded-lg overflow-hidden border"
          style={{ borderColor: "var(--border-subtle)" }}
        >
          {VIEW_OPTIONS.map((view, idx) => {
            const Icon     = view.icon;
            const isActive = calendarView === view.key;
            return (
              <button
                key={view.key}
                onClick={() => setCalendarView(view.key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors ${idx > 0 ? "border-l" : ""}`}
                style={{
                  background:  isActive ? "var(--maroon)" : "var(--bg-elevated)",
                  borderColor: "var(--border-subtle)",
                  color:       isActive ? "white" : "var(--text-secondary)",
                }}
                onMouseEnter={(e) => { if (!isActive) { e.currentTarget.style.background = "var(--bg-hover)"; e.currentTarget.style.color = "var(--text-primary)"; } }}
                onMouseLeave={(e) => { if (!isActive) { e.currentTarget.style.background = "var(--bg-elevated)"; e.currentTarget.style.color = "var(--text-secondary)"; } }}
                aria-pressed={isActive}
                title={view.label}
              >
                <Icon size={13} />
                <span>{view.label}</span>
              </button>
            );
          })}
        </div>

        {/* New Task — prominent CTA */}
        <button
          onClick={() => openCreatePanel()}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all"
          style={{ background: "var(--maroon)", color: "white", boxShadow: "0 2px 8px rgba(0,0,0,0.3)" }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "var(--maroon-light)"; e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.4)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "var(--maroon)"; e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.3)"; }}
        >
          <Plus size={14} />
          New Task
        </button>
      </div>
    </div>
  );
}
