"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUser, useClerk } from "@clerk/nextjs";
import {
  CalendarDays,
  FolderKanban,
  LayoutDashboard,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Settings,
  Users,
  Zap,
  CheckSquare,
  Square,
} from "lucide-react";
import { useAppStore } from "@/lib/store/useAppStore";
import type { TaskWithRelations } from "@/lib/supabase/types";

interface NavItem {
  href: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  adminOnly?: boolean;
  restrictedRoles?: string[];
}

const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard",  icon: CalendarDays,   label: "Calendar"   },
  { href: "/projects",   icon: FolderKanban,   label: "Projects"   },
  { href: "/customers",  icon: Users,          label: "Customers", restrictedRoles: ["customer"] },
  { href: "/users",      icon: Settings,       label: "Users",     adminOnly: true },
];

export default function NavRail() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const pathname = usePathname();
  const { navRailExpanded, toggleNavRail, tasks, projects, openEditPanel, updateTask } = useAppStore();

  const userRole = (user?.publicMetadata?.role as string) ?? "user";
  const isAdmin = userRole === "admin";
  const expanded = navRailExpanded;

  // ── Task Explorer States & Data ──
  const [localCustomers, setLocalCustomers] = useState<any[]>([]);
  const [expandedCustomers, setExpandedCustomers] = useState<Record<string, boolean>>({});
  const [expandedTasks, setExpandedTasks] = useState<Record<string, boolean>>({});
  const externalEventsRef = useRef<HTMLDivElement>(null);

  // Fetch customers list when expanded
  useEffect(() => {
    if (expanded) {
      fetch("/api/customers")
        .then((res) => res.json())
        .then((data) => {
          if (data.customers) setLocalCustomers(data.customers);
        })
        .catch(console.error);
    }
  }, [expanded]);

  // Group tasks by customer
  const groupedData = useMemo(() => {
    const groups: Record<string, { customerName: string; tasks: TaskWithRelations[] }> = {};

    // Standalone group
    groups["unassigned"] = { customerName: "Standalone / General Tasks", tasks: [] };

    // Initialize groups for fetched customers
    localCustomers.forEach((c) => {
      groups[c.id] = { customerName: c.name, tasks: [] };
    });

    tasks.forEach((task) => {
      const proj = projects.find((p) => p.id === task.project_id);
      const custId = proj?.customer_id;

      if (custId && groups[custId]) {
        groups[custId].tasks.push(task);
      } else {
        groups["unassigned"].tasks.push(task);
      }
    });

    // Remove empty groups (except unassigned if it has tasks)
    const result: Record<string, { customerName: string; tasks: TaskWithRelations[] }> = {};
    Object.keys(groups).forEach((key) => {
      if (groups[key].tasks.length > 0) {
        result[key] = groups[key];
      }
    });

    return result;
  }, [tasks, projects, localCustomers]);

  // FullCalendar external Draggable init for left pane
  useEffect(() => {
    if (!expanded || !externalEventsRef.current || userRole === "customer") return;

    import("@fullcalendar/interaction").then(({ Draggable }) => {
      const draggable = new Draggable(externalEventsRef.current!, {
        itemSelector: "[data-fc-draggable]",
        eventData: (eventEl: HTMLElement) => {
          const tId = eventEl.dataset.taskId ?? "";
          const foundTask = tasks.find(t => t.id === tId);
          const projectColor = projects.find(p => p.id === foundTask?.project_id)?.color ?? "hsl(215,25%,38%)";
          const taskColor = foundTask?.is_flagged
            ? "hsl(38,80%,40%)"
            : foundTask?.color_override ?? projectColor;

          return {
            id:        tId,
            title:     eventEl.dataset.taskName ?? "Task",
            duration:  `${Number(eventEl.dataset.duration ?? 1).toString().padStart(2, "0")}:00`,
            color:     taskColor,
            extendedProps: {
              taskId: tId,
            },
          };
        },
      });

      return () => draggable.destroy();
    });
  }, [expanded, tasks, projects, userRole]);

  // Toggle sub-task complete state
  const handleToggleSubTask = async (task: TaskWithRelations, subTaskId: string, currentVal: boolean) => {
    const updatedSubTasks = (task.sub_tasks ?? []).map((st: any) =>
      st.id === subTaskId ? { ...st, is_completed: !currentVal } : st
    );

    updateTask(task.id, { sub_tasks: updatedSubTasks } as any);

    try {
      await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sub_tasks: updatedSubTasks }),
      });
    } catch (err) {
      console.error(err);
      updateTask(task.id, { sub_tasks: task.sub_tasks } as any);
    }
  };

  const visibleItems = NAV_ITEMS.filter((item) => {
    if (item.adminOnly && !isAdmin) return false;
    if (item.restrictedRoles?.includes(userRole)) return false;
    return true;
  });

  return (
    <aside
      className="fixed left-0 top-0 h-full z-30 flex flex-col border-r transition-all duration-[280ms] ease-out"
      style={{
        width: expanded ? "var(--nav-w)" : "var(--nav-w-sm)",
        background: "var(--bg-surface)",
        borderColor: "var(--border-subtle)",
        boxShadow: "2px 0 12px rgba(0,0,0,0.25)",
      }}
    >
      {/* ── Brand Header ── */}
      <div
        className="flex items-center h-14 px-3 border-b flex-shrink-0"
        style={{ borderColor: "var(--border-subtle)" }}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: "var(--maroon)", boxShadow: "0 2px 8px rgba(0,0,0,0.3)" }}
          >
            <Zap size={16} className="text-white" />
          </div>
          {expanded && (
            <div className="min-w-0 animate-fade-in">
              <div
                className="font-bold text-sm truncate leading-tight"
                style={{ color: "var(--text-primary)" }}
              >
                ENETK PM+
              </div>
              <div
                className="text-[10px] uppercase tracking-widest font-medium truncate"
                style={{ color: "var(--text-muted)" }}
              >
                Scheduling
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Navigation Items ── */}
      <nav className="flex-1 py-3 overflow-y-auto overflow-x-hidden">
        <div className="space-y-0.5 px-2">
          {visibleItems.map((item) => {
            const isActive = pathname.startsWith(item.href);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 rounded-lg px-2.5 py-2.5 transition-all duration-150 group relative"
                style={{
                  background: isActive ? "var(--maroon-subtle)" : "transparent",
                  color: isActive ? "var(--maroon-light)" : "var(--text-secondary)",
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = "var(--bg-hover)";
                    e.currentTarget.style.color = "var(--text-primary)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = "transparent";
                    e.currentTarget.style.color = "var(--text-secondary)";
                  }
                }}
                title={!expanded ? item.label : undefined}
              >
                {/* Active indicator bar */}
                {isActive && (
                  <span
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r"
                    style={{ background: "var(--maroon-light)" }}
                  />
                )}

                <Icon
                  size={18}
                  className="flex-shrink-0 transition-colors"
                />

                {expanded && (
                  <span className="text-sm font-medium truncate animate-fade-in">
                    {item.label}
                  </span>
                )}
              </Link>
            );
          })}
        </div>

        {/* Task Explorer Tree */}
        {expanded && Object.keys(groupedData).length > 0 && (
          <div
            ref={externalEventsRef}
            className="mt-6 border-t pt-4 px-2 select-none"
            style={{ borderColor: "var(--border-subtle)" }}
          >
            <div className="text-[10px] uppercase tracking-widest font-semibold mb-3 px-1" style={{ color: "var(--text-muted)" }}>
              Task Explorer
            </div>

            <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
              {Object.entries(groupedData).map(([custId, group]) => {
                const isCustExpanded = expandedCustomers[custId] ?? false;
                const toggleCust = () => setExpandedCustomers(prev => ({ ...prev, [custId]: !prev[custId] }));

                return (
                  <div key={custId} className="space-y-1">
                    {/* Customer Row */}
                    <button
                      onClick={toggleCust}
                      className="flex items-center gap-1.5 w-full text-left py-1 px-1 rounded hover:bg-[var(--bg-hover)] transition-colors group"
                    >
                      <ChevronRight
                        size={12}
                        className="transition-transform duration-200"
                        style={{
                          color: "var(--text-muted)",
                          transform: isCustExpanded ? "rotate(90deg)" : "rotate(0deg)"
                        }}
                      />
                      <span className="text-xs font-semibold truncate flex-1" style={{ color: "var(--text-secondary)" }}>
                        {group.customerName}
                      </span>
                      <span className="text-[9px] px-1 rounded-full bg-[var(--border-subtle)] text-[var(--text-muted)] group-hover:bg-[var(--maroon-subtle)] group-hover:text-[var(--maroon-light)] transition-colors">
                        {group.tasks.length}
                      </span>
                    </button>

                    {/* Tasks List */}
                    {isCustExpanded && (
                      <div className="pl-3 border-l ml-2.5 space-y-1.5 py-1" style={{ borderColor: "var(--border-subtle)" }}>
                        {group.tasks.map((task) => {
                          const isTaskExpanded = expandedTasks[task.id] ?? false;
                          const toggleTask = (e: React.MouseEvent) => {
                            e.stopPropagation();
                            setExpandedTasks(prev => ({ ...prev, [task.id]: !prev[task.id] }));
                          };

                          const projectColor = projects.find(p => p.id === task.project_id)?.color ?? "hsl(215,25%,38%)";
                          const taskColor = task.is_flagged
                            ? "hsl(38,80%,40%)"
                            : task.color_override ?? projectColor;

                          const hasSubtasks = (task.sub_tasks ?? []).length > 0;

                          return (
                            <div key={task.id} className="space-y-1">
                              {/* Task Row */}
                              <div
                                {...(userRole !== "customer" ? {
                                  "data-fc-draggable": "true",
                                  "data-task-id": task.id,
                                  "data-task-name": task.task_name,
                                  "data-duration": task.duration_hours ?? 1,
                                  "data-color": taskColor,
                                } : {})}
                                onClick={() => openEditPanel(task)}
                                className="flex items-center gap-1.5 py-1 px-1.5 rounded border border-transparent hover:border-[var(--border-subtle)] hover:bg-[var(--bg-hover)] transition-all cursor-grab active:cursor-grabbing group"
                                style={{
                                  borderLeft: `2.5px solid ${taskColor}`
                                }}
                              >
                                {hasSubtasks ? (
                                  <button
                                    onClick={toggleTask}
                                    className="p-0.5 rounded hover:bg-[var(--bg-elevated)] transition-colors"
                                  >
                                    <ChevronRight
                                      size={10}
                                      className="transition-transform duration-200"
                                      style={{
                                        color: "var(--text-muted)",
                                        transform: isTaskExpanded ? "rotate(90deg)" : "rotate(0deg)"
                                      }}
                                    />
                                  </button>
                                ) : (
                                  <span className="w-4" />
                                )}
                                <span className="text-xs truncate flex-1 font-medium" style={{ color: "var(--text-primary)" }}>
                                  {task.task_name}
                                </span>
                              </div>

                              {/* Sub-tasks list */}
                              {isTaskExpanded && hasSubtasks && (
                                <div className="pl-5 space-y-1 py-0.5">
                                  {(task.sub_tasks ?? []).map((st: any) => (
                                    <div
                                      key={st.id ?? Math.random()}
                                      className="flex items-center gap-2 py-0.5 group/sub"
                                    >
                                      <button
                                        disabled={userRole === "customer"}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleToggleSubTask(task, st.id, st.is_completed);
                                        }}
                                        className="transition-colors disabled:cursor-not-allowed"
                                        style={{ color: st.is_completed ? "var(--status-ok)" : "var(--text-muted)" }}
                                      >
                                        {st.is_completed ? <CheckSquare size={11} /> : <Square size={11} />}
                                      </button>
                                      <span
                                        className="text-[11px] truncate flex-1 transition-colors"
                                        style={{
                                          color: st.is_completed ? "var(--text-muted)" : "var(--text-secondary)",
                                          textDecoration: st.is_completed ? "line-through" : "none"
                                        }}
                                      >
                                        {st.title}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </nav>

      {/* ── Bottom: User + Toggle ── */}
      <div
        className="border-t flex-shrink-0 p-2"
        style={{ borderColor: "var(--border-subtle)" }}
      >
        {/* User avatar row */}
        {user && (
          <div
            className="flex items-center gap-2.5 px-1 py-2 rounded-lg mb-1 transition-colors cursor-default"
            style={{ color: "var(--text-secondary)" }}
          >
            <img
              src={user.imageUrl}
              alt={user.fullName ?? "User"}
              className="w-7 h-7 rounded-full flex-shrink-0"
              style={{ outline: "1px solid var(--border-strong)" }}
            />
            {expanded && (
              <div className="min-w-0 animate-fade-in">
                <div
                  className="text-xs font-medium truncate"
                  style={{ color: "var(--text-primary)" }}
                >
                  {user.fullName}
                </div>
                <div className="text-[10px] truncate" style={{ color: "var(--text-muted)" }}>
                  {isAdmin ? "Administrator" : "User"}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Sign out */}
        <button
          onClick={() => signOut()}
          className="w-full flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm transition-all duration-150 mb-1"
          style={{ color: "var(--text-muted)" }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "var(--bg-hover)";
            e.currentTarget.style.color = "var(--status-overdue)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.color = "var(--text-muted)";
          }}
          title={!expanded ? "Sign out" : undefined}
        >
          <LogOut size={16} className="flex-shrink-0" />
          {expanded && <span className="animate-fade-in">Sign out</span>}
        </button>

        {/* Collapse toggle */}
        <button
          onClick={toggleNavRail}
          className="w-full flex items-center justify-center rounded-lg p-2 transition-all duration-150"
          style={{ color: "var(--text-muted)" }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "var(--bg-hover)";
            e.currentTarget.style.color = "var(--text-primary)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.color = "var(--text-muted)";
          }}
          title={expanded ? "Collapse sidebar" : "Expand sidebar"}
          aria-label={expanded ? "Collapse sidebar" : "Expand sidebar"}
        >
          {expanded ? <ChevronLeft size={15} /> : <ChevronRight size={15} />}
        </button>
      </div>
    </aside>
  );
}
