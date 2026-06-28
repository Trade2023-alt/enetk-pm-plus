"use client";

import React, { useState, useEffect } from "react";
import {
  AlertTriangle, Clock, Inbox, TrendingUp, Activity,
  CheckCircle2, CalendarX, Flag,
} from "lucide-react";

interface MetricsBarProps {
  totalUsers: number;
  overdueCount: number;
  unscheduledCount: number;
  weeklyHours: { estimated: number; used: number };
  flaggedCount: number;
}

// Live clock
function LiveClock() {
  const [time, setTime] = useState(() => new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
  useEffect(() => {
    const id = setInterval(() => setTime(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })), 10000);
    return () => clearInterval(id);
  }, []);
  return <span className="font-mono text-xs">{time}</span>;
}

export default function MetricsBar({
  totalUsers, overdueCount, unscheduledCount, weeklyHours, flaggedCount,
}: MetricsBarProps) {
  const hourPct = weeklyHours.estimated > 0
    ? Math.min(100, Math.round((weeklyHours.used / weeklyHours.estimated) * 100))
    : 0;

  return (
    <div
      className="flex items-stretch border-b flex-shrink-0 overflow-x-auto"
      style={{ background: "var(--bg-surface)", borderColor: "var(--border-subtle)", height: "44px" }}
    >
      {/* Brand label */}
      <div
        className="flex items-center gap-2 px-4 border-r flex-shrink-0"
        style={{ borderColor: "var(--border-subtle)" }}
      >
        <Activity size={12} style={{ color: "var(--maroon-light)" }} />
        <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
          Dashboard
        </span>
      </div>

      {/* ── Overdue ── */}
      <MetricChip
        icon={CalendarX}
        value={overdueCount}
        label="Overdue"
        status={overdueCount > 0 ? "danger" : "ok"}
        pulse={overdueCount > 0}
      />

      {/* ── Unscheduled ── */}
      <MetricChip
        icon={Inbox}
        value={unscheduledCount}
        label="Unscheduled"
        status={unscheduledCount > 8 ? "warning" : "neutral"}
      />

      {/* ── Flagged ── */}
      <MetricChip
        icon={Flag}
        value={flaggedCount}
        label="Flagged"
        status={flaggedCount > 0 ? "warning" : "neutral"}
        pulse={flaggedCount > 0}
      />

      {/* ── Weekly Hours bar ── */}
      <div
        className="flex items-center gap-3 px-4 border-r flex-shrink-0 cursor-default"
        style={{ borderColor: "var(--border-subtle)" }}
      >
        <Clock size={12} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
        <div>
          <div className="flex items-baseline gap-1.5 mb-0.5">
            <span className="text-xs font-semibold leading-none" style={{ color: hourPct > 100 ? "var(--status-overdue)" : "var(--text-primary)" }}>
              {weeklyHours.used}
              <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>/{weeklyHours.estimated}h</span>
            </span>
            <span className="text-[10px] leading-none" style={{ color: "var(--text-muted)" }}>{hourPct}%</span>
          </div>
          {/* Mini progress bar */}
          <div className="w-20 h-1 rounded-full overflow-hidden" style={{ background: "var(--border-subtle)" }}>
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${hourPct}%`,
                background: hourPct > 100 ? "var(--status-overdue)"
                  : hourPct > 80  ? "var(--status-warning)"
                  : "var(--status-ok)",
              }}
            />
          </div>
        </div>
        <span className="text-[10px] leading-none" style={{ color: "var(--text-muted)" }}>this week</span>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* ── Clock ── */}
      <div className="flex items-center px-4 gap-1.5" style={{ color: "var(--text-muted)" }}>
        <LiveClock />
        <span className="text-[10px] opacity-50">local</span>
      </div>
    </div>
  );
}

// ── Single metric chip ──────────────────────────────────────────────────────
function MetricChip({
  icon: Icon, value, label, status, pulse = false,
}: {
  icon: React.ComponentType<{ size?: number; style?: React.CSSProperties }>;
  value: number;
  label: string;
  status: "neutral" | "warning" | "danger" | "ok";
  pulse?: boolean;
}) {
  const colorMap = {
    neutral: "var(--text-secondary)",
    warning: "var(--status-warning)",
    danger:  "var(--status-overdue)",
    ok:      "var(--text-muted)",
  };
  const color = colorMap[status];

  return (
    <div
      className="flex items-center gap-2 px-4 border-r flex-shrink-0 cursor-default transition-colors"
      style={{ borderColor: "var(--border-subtle)" }}
      onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-hover)")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
    >
      <Icon
        size={12}
        style={{ color, flexShrink: 0, animation: pulse ? "pulse 2s infinite" : undefined }}
      />
      <div className="flex items-baseline gap-1">
        <span className="text-sm font-bold leading-none tabular-nums" style={{ color }}>
          {value}
        </span>
        <span className="text-[10px] leading-none" style={{ color: "var(--text-muted)" }}>
          {label}
        </span>
      </div>
    </div>
  );
}
