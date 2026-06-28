import type { Task } from "@/lib/supabase/types";
import { format, isPast, differenceInDays, parseISO } from "date-fns";

/**
 * Determines if a task should be flagged (missing critical data).
 * Auto-flagging also happens at the DB trigger level.
 */
export function isTaskFlagged(task: Partial<Task>): boolean {
  return !task.project_id || !task.deadline;
}

/**
 * Computes the visual status of a task for UI display.
 */
export function getTaskDisplayStatus(
  task: Task
): "overdue" | "warning" | "ok" | "blocked" | "completed" | "pending" {
  if (task.status === "completed") return "completed";
  if (task.status === "blocked") return "blocked";

  if (task.deadline) {
    const deadline = parseISO(task.deadline);
    if (isPast(deadline)) return "overdue";
    if (differenceInDays(deadline, new Date()) <= 3) return "warning";
  }

  if (task.status === "in_progress") return "ok";
  return "pending";
}

/**
 * Get the color for a task event on the calendar.
 * Priority: color_override → project color → status color → default
 */
export function getTaskColor(
  task: Task,
  projectColor?: string | null
): string {
  if (task.color_override) return task.color_override;
  if (task.is_flagged) return "hsl(38, 80%, 40%)"; // Amber for flagged
  if (task.status === "overdue") return "hsl(0, 70%, 45%)";
  if (task.status === "blocked") return "hsl(280, 50%, 40%)";
  if (task.status === "completed") return "hsl(145, 50%, 32%)";
  if (projectColor) return projectColor;
  return "hsl(215, 25%, 38%)"; // Default slate
}

/**
 * Format hours for display (e.g. 1.5 → "1h 30m")
 */
export function formatHours(hours: number | null | undefined): string {
  if (hours == null) return "—";
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  if (m === 0) return `${h}h`;
  if (h === 0) return `${m}m`;
  return `${h}h ${m}m`;
}

/**
 * Calculate hours variance (estimated vs used)
 */
export function getHoursVariance(
  estimated: number | null,
  used: number
): { variance: number; isOverBudget: boolean } | null {
  if (estimated == null) return null;
  const variance = used - estimated;
  return { variance, isOverBudget: variance > 0 };
}

/**
 * Format a deadline date for display
 */
export function formatDeadline(deadline: string | null): string {
  if (!deadline) return "No deadline";
  const date = parseISO(deadline);
  const daysLeft = differenceInDays(date, new Date());

  if (isPast(date)) {
    const daysOver = Math.abs(daysLeft);
    return `Overdue by ${daysOver}d (${format(date, "MMM d")})`;
  }

  if (daysLeft === 0) return "Due today";
  if (daysLeft === 1) return "Due tomorrow";
  if (daysLeft <= 7) return `Due in ${daysLeft}d (${format(date, "MMM d")})`;
  return format(date, "MMM d, yyyy");
}

/**
 * Get sub-task completion ratio as a percentage
 */
export function getSubTaskProgress(
  subTasks: { is_completed: boolean }[]
): number {
  if (!subTasks.length) return 0;
  const completed = subTasks.filter((s) => s.is_completed).length;
  return Math.round((completed / subTasks.length) * 100);
}
