"use client";

import React, { useEffect } from "react";
import { useAppStore } from "@/lib/store/useAppStore";
import NavRail from "@/components/layout/NavRail";
import BacklogSidebar from "@/components/layout/BacklogSidebar";

interface AppShellProps {
  children: React.ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  const { backlogSidebarOpen, navRailExpanded } = useAppStore();

  // Apply body overflow lock when modal is open (handled globally)
  useEffect(() => {
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  return (
    <div
      className="flex h-screen w-screen overflow-hidden"
      style={{ background: "var(--bg-base)" }}
    >
      {/* ── Left Navigation Rail ── */}
      <NavRail />

      {/* ── Main Content Area ── */}
      <main
        className="flex-1 flex flex-col overflow-hidden min-w-0 transition-all duration-[280ms] ease-out"
        style={{
          marginLeft: navRailExpanded ? "var(--nav-w)" : "var(--nav-w-sm)",
        }}
      >
        {children}
      </main>

      {/* ── Right Backlog Sidebar Dock ── */}
      <BacklogSidebar />
    </div>
  );
}
