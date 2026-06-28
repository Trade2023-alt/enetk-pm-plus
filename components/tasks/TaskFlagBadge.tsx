"use client";

import React from "react";
import { AlertTriangle } from "lucide-react";

interface TaskFlagBadgeProps {
  size?: "xs" | "sm" | "md";
  showLabel?: boolean;
}

export default function TaskFlagBadge({
  size = "sm",
  showLabel = false,
}: TaskFlagBadgeProps) {
  const iconSizes = { xs: 9, sm: 11, md: 13 };
  const iconSize = iconSizes[size];

  return (
    <span
      className="inline-flex items-center gap-1 rounded px-1 py-0.5 font-medium border flex-shrink-0"
      style={{
        background: "hsl(38, 60%, 14%)",
        borderColor: "var(--status-warning)",
        color: "var(--status-warning)",
        fontSize: size === "xs" ? "9px" : size === "sm" ? "10px" : "11px",
      }}
      title="This task is missing required information (project or deadline). An admin can complete it."
    >
      <AlertTriangle size={iconSize} className="flex-shrink-0" />
      {showLabel && <span>Needs info</span>}
    </span>
  );
}
