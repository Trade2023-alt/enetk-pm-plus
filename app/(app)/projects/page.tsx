"use client";

import React, { useState, useEffect } from "react";
import { FolderKanban, Plus, Pencil, Building2, CheckSquare2 } from "lucide-react";
import { useAppStore } from "@/lib/store/useAppStore";
import ProjectModal from "@/components/projects/ProjectModal";
import type { Project } from "@/lib/supabase/types";

const STATUS_COLORS: Record<string, string> = {
  opportunity: "var(--text-muted)",
  estimate:    "var(--text-secondary)",
  active:      "var(--status-ok)",
  on_hold:     "var(--status-warning)",
  completed:   "var(--maroon-light)",
  invoiced:    "hsl(200, 70%, 50%)",
  paid:        "var(--status-ok)",
  archived:    "var(--text-muted)",
};

export default function ProjectsPage() {
  const { projects, setProjects, tasks } = useAppStore();
  const [loading,    setLoading]    = useState(true);
  const [modalOpen,  setModalOpen]  = useState(false);
  const [editProj,   setEditProj]   = useState<any>(null);
  const [customers,  setCustomers]  = useState<any[]>([]);
  const [activeTab,  setActiveTab]  = useState<"active" | "completed" | "templates">("active");
  const [selectedStatus, setSelectedStatus] = useState<string>("");
  const [selectedCustomer, setSelectedCustomer] = useState<string>("");

  useEffect(() => {
    setSelectedStatus("");
  }, [activeTab]);

  useEffect(() => {
    async function load() {
      try {
        const [projRes, custRes] = await Promise.all([
          fetch("/api/projects"),
          fetch("/api/customers"),
        ]);
        if (projRes.ok) setProjects((await projRes.json()).projects as Project[]);
        if (custRes.ok) setCustomers((await custRes.json()).customers ?? []);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [setProjects]);

  // Task counts per project
  const taskCountByProject = tasks.reduce<Record<string, { total: number; done: number }>>((acc, t) => {
    if (!t.project_id) return acc;
    if (!acc[t.project_id]) acc[t.project_id] = { total: 0, done: 0 };
    acc[t.project_id].total++;
    if (t.status === "completed") acc[t.project_id].done++;
    return acc;
  }, {});

  const filteredProjects = projects.filter((p) => {
    // 1. Tab filtering
    if (activeTab === "templates") {
      if (!p.is_template) return false;
    } else if (activeTab === "completed") {
      if (p.is_template || (p.status !== "completed" && p.status !== "archived" && p.status !== "paid")) return false;
    } else {
      if (p.is_template || p.status === "completed" || p.status === "archived" || p.status === "paid") return false;
    }

    // 2. Customer filtering
    if (selectedCustomer) {
      if (selectedCustomer === "none") {
        if (p.customer_id) return false;
      } else {
        if (p.customer_id !== selectedCustomer) return false;
      }
    }

    // 3. Status filtering
    if (selectedStatus) {
      if (p.status !== selectedStatus) return false;
    }

    return true;
  });

  const openCreate = () => { setEditProj(null); setModalOpen(true); };
  const openEdit   = (p: any) => { setEditProj(p); setModalOpen(true); };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "var(--maroon)" }} />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-base font-bold" style={{ color: "var(--text-primary)" }}>Projects</h1>
          <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
            {projects.length} project{projects.length !== 1 ? "s" : ""}
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors"
          style={{ background: "var(--maroon)", color: "white" }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "var(--maroon-light)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "var(--maroon)")}
        >
          <Plus size={13} /> New Project
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b flex-shrink-0" style={{ borderColor: "var(--border-subtle)" }}>
        {(["active", "completed", "templates"] as const).map((tab) => {
          const isActive = activeTab === tab;
          const label = tab === "active" ? "Active Projects" : tab === "completed" ? "Completed / Archived" : "Templates";
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className="px-4 py-2 text-xs font-semibold border-b-2 -mb-px transition-colors capitalize"
              style={{
                borderColor: isActive ? "var(--maroon)" : "transparent",
                color: isActive ? "var(--maroon-light)" : "var(--text-secondary)",
              }}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4 bg-[var(--bg-surface)] p-3.5 rounded-xl border flex-shrink-0" style={{ borderColor: "var(--border-subtle)" }}>
        {/* Customer Filter */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] uppercase font-bold tracking-wider" style={{ color: "var(--text-muted)" }}>
            Customer
          </label>
          <select
            value={selectedCustomer}
            onChange={(e) => setSelectedCustomer(e.target.value)}
            className="text-xs rounded-lg border px-3 py-1.5 outline-none cursor-pointer"
            style={{
              background: "var(--bg-elevated)",
              borderColor: selectedCustomer ? "var(--maroon)" : "var(--border-subtle)",
              color: selectedCustomer ? "var(--text-primary)" : "var(--text-secondary)",
              minWidth: "160px",
              height: "32px",
            }}
            onFocus={(e) => (e.target.style.borderColor = "var(--maroon)")}
            onBlur={(e) => (e.target.style.borderColor = selectedCustomer ? "var(--maroon)" : "var(--border-subtle)")}
          >
            <option value="">All Customers</option>
            <option value="none">No Customer Link</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        {/* Status Filter */}
        {activeTab !== "templates" && (
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] uppercase font-bold tracking-wider" style={{ color: "var(--text-muted)" }}>
              Status
            </label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="text-xs rounded-lg border px-3 py-1.5 outline-none cursor-pointer"
              style={{
                background: "var(--bg-elevated)",
                borderColor: selectedStatus ? "var(--maroon)" : "var(--border-subtle)",
                color: selectedStatus ? "var(--text-primary)" : "var(--text-secondary)",
                minWidth: "140px",
                height: "32px",
              }}
              onFocus={(e) => (e.target.style.borderColor = "var(--maroon)")}
              onBlur={(e) => (e.target.style.borderColor = selectedStatus ? "var(--maroon)" : "var(--border-subtle)")}
            >
              <option value="">All Statuses</option>
              {activeTab === "active" ? (
                <>
                  <option value="opportunity">Opportunity</option>
                  <option value="estimate">Estimate</option>
                  <option value="active">Active</option>
                  <option value="on_hold">On Hold</option>
                  <option value="invoiced">Invoiced</option>
                </>
              ) : (
                <>
                  <option value="completed">Completed</option>
                  <option value="paid">Paid</option>
                  <option value="archived">Archived</option>
                </>
              )}
            </select>
          </div>
        )}

        {/* Reset button */}
        {(selectedCustomer || selectedStatus) && (
          <button
            onClick={() => { setSelectedCustomer(""); setSelectedStatus(""); }}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors align-self-end mt-4"
            style={{
              background: "var(--bg-hover)",
              color: "var(--text-secondary)",
              height: "32px",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "var(--border-subtle)"; e.currentTarget.style.color = "var(--text-primary)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "var(--bg-hover)"; e.currentTarget.style.color = "var(--text-secondary)"; }}
          >
            Reset Filters
          </button>
        )}
      </div>

      {/* Grid */}
      {filteredProjects.length === 0 ? (
        <div className="flex flex-col items-center justify-center flex-1 gap-3">
          <FolderKanban size={40} style={{ color: "var(--text-muted)" }} />
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            {activeTab === "active"
              ? "No active projects"
              : activeTab === "completed"
              ? "No completed projects"
              : "No template projects"}
          </p>
          {activeTab === "templates" ? (
            <button onClick={openCreate} className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold" style={{ background: "var(--maroon)", color: "white" }}>
              <Plus size={12} /> Create a template project
            </button>
          ) : activeTab === "active" ? (
            <button onClick={openCreate} className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold" style={{ background: "var(--maroon)", color: "white" }}>
              <Plus size={12} /> Create your first project
            </button>
          ) : null}
        </div>
      ) : (
        <div className="overflow-y-auto flex-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredProjects.map((proj) => {
              const counts   = taskCountByProject[proj.id] ?? { total: 0, done: 0 };
              const pct      = counts.total > 0 ? Math.round((counts.done / counts.total) * 100) : 0;
              const customer = customers.find((c) => c.id === (proj as any).customer_id);

              return (
                <div
                  key={proj.id}
                  className="flex flex-col rounded-xl border p-4 gap-3 cursor-pointer transition-all group"
                  style={{
                    background:   "var(--bg-surface)",
                    borderColor:  "var(--border-subtle)",
                    borderLeft:   `3px solid ${proj.color ?? "var(--maroon)"}`,
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = proj.color ?? "var(--maroon)")}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--border-subtle)")}
                  onClick={() => openEdit(proj)}
                >
                  {/* Top row */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold truncate" style={{ color: "var(--text-primary)" }}>
                        {proj.name}
                      </div>
                      {customer && (
                        <div className="flex items-center gap-1 mt-0.5">
                          <Building2 size={9} style={{ color: "var(--text-muted)" }} />
                          <span className="text-[10px] truncate" style={{ color: "var(--text-muted)" }}>{customer.name}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <span
                        className="text-[10px] px-1.5 py-0.5 rounded-full capitalize"
                        style={{ background: STATUS_COLORS[proj.status] + "22", color: STATUS_COLORS[proj.status] }}
                      >
                        {proj.status?.replace("_", " ")}
                      </span>
                      <button
                        onClick={(e) => { e.stopPropagation(); openEdit(proj); }}
                        className="p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                        style={{ color: "var(--text-muted)" }}
                        onMouseEnter={(e) => (e.currentTarget.style.color = "var(--text-primary)")}
                        onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-muted)")}
                      >
                        <Pencil size={11} />
                      </button>
                    </div>
                  </div>

                  {/* Task progress */}
                  <div>
                    <div className="flex justify-between text-[10px] mb-1" style={{ color: "var(--text-muted)" }}>
                      <span className="flex items-center gap-1"><CheckSquare2 size={9} /> {counts.done}/{counts.total} tasks</span>
                      <span>{pct}%</span>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--border-subtle)" }}>
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${pct}%`, background: pct === 100 ? "var(--status-ok)" : proj.color ?? "var(--maroon)" }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Project modal */}
      <ProjectModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        editProject={editProj}
        onSaved={() => {}}
      />
    </div>
  );
}
