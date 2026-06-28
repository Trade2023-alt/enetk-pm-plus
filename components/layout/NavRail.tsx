"use client";

import React from "react";
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
} from "lucide-react";
import { useAppStore } from "@/lib/store/useAppStore";

interface NavItem {
  href: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  adminOnly?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard",  icon: CalendarDays,   label: "Calendar"   },
  { href: "/projects",   icon: FolderKanban,   label: "Projects"   },
  { href: "/customers",  icon: Users,          label: "Customers"  },
  { href: "/admin",      icon: Settings,       label: "Team",      adminOnly: true },
];

export default function NavRail() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const pathname = usePathname();
  const { navRailExpanded, toggleNavRail } = useAppStore();

  const isAdmin = user?.publicMetadata?.role === "admin";
  const expanded = navRailExpanded;

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
          {NAV_ITEMS.filter((item) => !item.adminOnly || isAdmin).map((item) => {
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
