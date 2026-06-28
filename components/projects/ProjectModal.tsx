"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  X,
  Save,
  Trash2,
  FolderKanban,
  AlertTriangle,
} from "lucide-react";
import { useAppStore } from "@/lib/store/useAppStore";
import { useUser } from "@clerk/nextjs";

// Preset project colors (ISA-101 — muted, readable on dark bg)
const COLOR_SWATCHES = [
  { hex: "#5B7FA6", label: "Steel Blue" },
  { hex: "#7A6E9E", label: "Slate Violet" },
  { hex: "#5E9E7A", label: "Sage Green" },
  { hex: "#9E7A5E", label: "Copper" },
  { hex: "#9E5E6A", label: "Maroon Rose" },
  { hex: "#6A9E9E", label: "Teal" },
  { hex: "#8E8E5E", label: "Olive" },
  { hex: "#6E6E6E", label: "Graphite" },
];

interface ProjectModalProps {
  open: boolean;
  onClose: () => void;
  editProject?: {
    id: string;
    name: string;
    description: string | null;
    color: string;
    status: string;
  } | null;
  onSaved: () => void;
}

export default function ProjectModal({
  open,
  onClose,
  editProject,
  onSaved,
}: ProjectModalProps) {
  const { user } = useUser();
  const isAdmin = user?.publicMetadata?.role === "admin";
  const { setProjects, projects } = useAppStore();

  const [name, setName]               = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor]             = useState(COLOR_SWATCHES[0].hex);
  const [status, setStatus]           = useState<"active" | "on_hold" | "completed" | "archived">("active");
  const [saving, setSaving]           = useState(false);
  const [deleting, setDeleting]       = useState(false);
  const [error, setError]             = useState<string | null>(null);

  // Populate when editing
  useEffect(() => {
    if (!open) return;
    if (editProject) {
      setName(editProject.name);
      setDescription(editProject.description ?? "");
      setColor(editProject.color ?? COLOR_SWATCHES[0].hex);
      setStatus(editProject.status as any);
    } else {
      setName("");
      setDescription("");
      setColor(COLOR_SWATCHES[0].hex);
      setStatus("active");
    }
    setError(null);
  }, [open, editProject]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handler);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  const handleSave = async () => {
    if (!name.trim()) { setError("Project name is required."); return; }
    setSaving(true);
    setError(null);

    try {
      const payload = { name: name.trim(), description: description || null, color, status };

      if (editProject) {
        const res = await fetch(`/api/projects/${editProject.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error(await res.text());
        const { project } = await res.json();
        setProjects(projects.map((p) => (p.id === project.id ? project : p)));
      } else {
        const res = await fetch("/api/projects", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error(await res.text());
        const { project } = await res.json();
        setProjects([project, ...projects]);
      }
      onSaved();
      onClose();
    } catch (e: any) {
      setError(e.message ?? "Failed to save project.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!editProject || !isAdmin) return;
    if (!confirm(`Archive "${editProject.name}"? Tasks will remain but become unassigned.`)) return;
    setDeleting(true);
    try {
      await fetch(`/api/projects/${editProject.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "archived" }),
      });
      setProjects(projects.filter((p) => p.id !== editProject.id));
      onClose();
    } catch {
      setError("Failed to archive project.");
    } finally {
      setDeleting(false);
    }
  };

  if (!open) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          className="w-full max-w-md flex flex-col rounded-xl border pointer-events-auto animate-fade-in"
          style={{
            background: "var(--bg-elevated)",
            borderColor: "var(--border-strong)",
            boxShadow: "0 20px 60px rgba(0,0,0,0.6)",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-5 py-4 border-b"
            style={{ borderColor: "var(--border-subtle)" }}
          >
            <div className="flex items-center gap-2.5">
              {/* Color preview dot */}
              <div
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ background: color }}
              />
              <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                {editProject ? "Edit Project" : "New Project"}
              </h2>
            </div>
            <div className="flex items-center gap-1.5">
              {editProject && isAdmin && (
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="p-1.5 rounded-md transition-all"
                  style={{ color: "var(--text-muted)" }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "hsl(0,70%,18%)";
                    e.currentTarget.style.color = "var(--status-overdue)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                    e.currentTarget.style.color = "var(--text-muted)";
                  }}
                  title="Archive project"
                >
                  <Trash2 size={14} />
                </button>
              )}
              <button
                onClick={onClose}
                className="p-1.5 rounded-md transition-all"
                style={{ color: "var(--text-muted)" }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "var(--bg-hover)";
                  e.currentTarget.style.color = "var(--text-primary)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.color = "var(--text-muted)";
                }}
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="px-5 py-4 space-y-4">
            {error && (
              <div
                className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-xs border"
                style={{
                  background: "hsl(0,70%,12%)",
                  borderColor: "var(--status-overdue)",
                  color: "var(--status-overdue)",
                }}
              >
                <AlertTriangle size={12} />
                {error}
              </div>
            )}

            {/* Name */}
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
                Project Name <span style={{ color: "var(--status-overdue)" }}>*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Substation Upgrade — Site A"
                autoFocus
                className="w-full px-3 py-2 rounded-lg border text-sm outline-none transition-all"
                style={{
                  background: "var(--bg-surface)",
                  borderColor: "var(--border-subtle)",
                  color: "var(--text-primary)",
                }}
                onFocus={(e) => (e.target.style.borderColor = "var(--maroon)")}
                onBlur={(e) => (e.target.style.borderColor = "var(--border-subtle)")}
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Scope, location, client info..."
                rows={3}
                className="w-full px-3 py-2 rounded-lg border text-xs resize-none outline-none transition-all"
                style={{
                  background: "var(--bg-surface)",
                  borderColor: "var(--border-subtle)",
                  color: "var(--text-primary)",
                }}
                onFocus={(e) => (e.target.style.borderColor = "var(--maroon)")}
                onBlur={(e) => (e.target.style.borderColor = "var(--border-subtle)")}
              />
            </div>

            {/* Color swatches */}
            <div>
              <label className="block text-xs font-medium mb-2" style={{ color: "var(--text-secondary)" }}>
                Project Color
              </label>
              <div className="flex items-center gap-2 flex-wrap">
                {COLOR_SWATCHES.map((swatch) => (
                  <button
                    key={swatch.hex}
                    onClick={() => setColor(swatch.hex)}
                    title={swatch.label}
                    className="w-7 h-7 rounded-full transition-all flex-shrink-0"
                    style={{
                      background: swatch.hex,
                      outline: color === swatch.hex ? `2px solid white` : "2px solid transparent",
                      outlineOffset: "2px",
                      transform: color === swatch.hex ? "scale(1.2)" : "scale(1)",
                    }}
                  />
                ))}
                {/* Custom hex input */}
                <div className="flex items-center gap-1.5 ml-1">
                  <div
                    className="w-6 h-6 rounded flex-shrink-0 border"
                    style={{ background: color, borderColor: "var(--border-strong)" }}
                  />
                  <input
                    type="text"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    placeholder="#6B7280"
                    className="w-20 px-2 py-1 rounded text-[10px] font-mono outline-none border"
                    style={{
                      background: "var(--bg-surface)",
                      borderColor: "var(--border-subtle)",
                      color: "var(--text-secondary)",
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Status */}
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
                Status
              </label>
              <div className="grid grid-cols-2 gap-2">
                {(["active", "on_hold", "completed", "archived"] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => setStatus(s)}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium border transition-all capitalize"
                    style={{
                      background: status === s ? "var(--maroon-subtle)" : "var(--bg-surface)",
                      borderColor: status === s ? "var(--maroon)" : "var(--border-subtle)",
                      color: status === s ? "var(--maroon-light)" : "var(--text-secondary)",
                    }}
                  >
                    {s.replace("_", " ")}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div
            className="flex justify-end gap-2 px-5 py-3.5 border-t"
            style={{ background: "var(--bg-surface)", borderColor: "var(--border-subtle)" }}
          >
            <button
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-lg text-xs font-medium border transition-all"
              style={{
                background: "transparent",
                borderColor: "var(--border-subtle)",
                color: "var(--text-secondary)",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-hover)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-medium transition-all disabled:opacity-60"
              style={{ background: "var(--maroon)", color: "white" }}
              onMouseEnter={(e) => { if (!saving) e.currentTarget.style.background = "var(--maroon-light)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "var(--maroon)"; }}
            >
              <Save size={12} />
              {saving ? "Saving..." : editProject ? "Save Changes" : "Create Project"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
