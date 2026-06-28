"use client";

import React from "react";
import {
  Users,
  AlertTriangle,
  Clock,
  Inbox,
  TrendingUp,
  Activity,
} from "lucide-react";

interface MetricCard {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ComponentType<{ size?: number; className?: string; style?: React.CSSProperties }>;
  status?: "neutral" | "warning" | "danger" | "ok";
}

interface MetricsBarProps {
  totalUsers: number;
  overdueCount: number;
  unscheduledCount: number;
  weeklyHours: { estimated: number; used: number };
  flaggedCount: number;
}

export default function MetricsBar({
  totalUsers,
  overdueCount,
  unscheduledCount,
  weeklyHours,
  flaggedCount,
}: MetricsBarProps) {
  const metrics: MetricCard[] = [
    {
      label: "Team Members",
      value: totalUsers,
      icon: Users,
      status: "neutral",
      sub: "registered",
    },
    {
      label: "Unscheduled",
      value: unscheduledCount,
      icon: Inbox,
      status: unscheduledCount > 5 ? "warning" : "neutral",
      sub: "in backlog",
    },
    {
      label: "Overdue",
      value: overdueCount,
      icon: AlertTriangle,
      status: overdueCount > 0 ? "danger" : "ok",
      sub: "tasks",
    },
    {
      label: "Flagged",
      value: flaggedCount,
      icon: AlertTriangle,
      status: flaggedCount > 0 ? "warning" : "ok",
      sub: "need info",
    },
    {
      label: "Week Hours",
      value: `${weeklyHours.used}h / ${weeklyHours.estimated}h`,
      icon: Clock,
      status:
        weeklyHours.used > weeklyHours.estimated
          ? "danger"
          : weeklyHours.used > weeklyHours.estimated * 0.8
          ? "warning"
          : "neutral",
      sub: weeklyHours.estimated > 0
        ? `${Math.round((weeklyHours.used / weeklyHours.estimated) * 100)}% utilized`
        : "this week",
    },
  ];

  const statusColors: Record<string, string> = {
    neutral: "var(--text-secondary)",
    warning: "var(--status-warning)",
    danger:  "var(--status-overdue)",
    ok:      "var(--text-muted)",
  };

  return (
    <div
      className="flex items-center gap-px border-b flex-shrink-0 overflow-x-auto"
      style={{
        background: "var(--bg-surface)",
        borderColor: "var(--border-subtle)",
      }}
    >
      {/* Brand label */}
      <div
        className="flex items-center gap-2 px-4 py-2.5 border-r flex-shrink-0"
        style={{ borderColor: "var(--border-subtle)" }}
      >
        <Activity size={12} style={{ color: "var(--maroon)" }} />
        <span
          className="text-[10px] font-semibold uppercase tracking-widest"
          style={{ color: "var(--text-muted)" }}
        >
          Dashboard
        </span>
      </div>

      {metrics.map((m, idx) => {
        const Icon = m.icon;
        const color = statusColors[m.status ?? "neutral"];
        const isAlert = m.status === "warning" || m.status === "danger";

        return (
          <div
            key={idx}
            className="flex items-center gap-2.5 px-4 py-2.5 border-r transition-colors flex-shrink-0"
            style={{ borderColor: "var(--border-subtle)" }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "var(--bg-hover)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
            }}
          >
            <Icon
              size={13}
              style={{ color, flexShrink: 0 }}
              className={isAlert ? "animate-pulse-soft" : ""}
            />
            <div>
              <div
                className="text-xs font-semibold leading-none"
                style={{ color }}
              >
                {m.value}
              </div>
              <div
                className="text-[10px] leading-none mt-0.5"
                style={{ color: "var(--text-muted)" }}
              >
                {m.label}
              </div>
            </div>
          </div>
        );
      })}

      {/* Separator + time indicator */}
      <div className="flex-1" />
      <div
        className="px-4 py-2.5 flex-shrink-0 text-[10px]"
        style={{ color: "var(--text-muted)" }}
      >
        <span className="font-mono">
          {new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
        <span className="ml-1 opacity-50">local</span>
      </div>
    </div>
  );
}
