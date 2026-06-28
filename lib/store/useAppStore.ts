import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Task, Project, TaskWithRelations } from "@/lib/supabase/types";

// ── UI State ──────────────────────────────────────────────────────────────────

interface UIState {
  // Sidebar panels
  backlogSidebarOpen: boolean;
  navRailExpanded: boolean;
  toggleBacklogSidebar: () => void;
  setBacklogSidebarOpen: (open: boolean) => void;
  toggleNavRail: () => void;

  // Calendar view
  calendarView: "dayGridMonth" | "timeGridWeek" | "listWeek";
  setCalendarView: (view: "dayGridMonth" | "timeGridWeek" | "listWeek") => void;

  // Active filters
  selectedProjectId: string | null;
  setSelectedProjectId: (id: string | null) => void;
}

// ── Drag State ────────────────────────────────────────────────────────────────

interface DragState {
  draggingTask: Task | null;
  isDraggingFromBacklog: boolean;
  setDraggingTask: (task: Task | null, fromBacklog?: boolean) => void;
  clearDrag: () => void;
}

// ── Modal State ───────────────────────────────────────────────────────────────

interface ModalState {
  taskModalOpen: boolean;
  taskModalMode: "create" | "edit";
  editingTask: TaskWithRelations | null;
  defaultDate: string | null; // Pre-fill date when clicking empty calendar cell
  openCreateModal: (defaultDate?: string) => void;
  openEditModal: (task: TaskWithRelations) => void;
  closeTaskModal: () => void;

  projectModalOpen: boolean;
  openProjectModal: () => void;
  closeProjectModal: () => void;
}

// ── Data Cache ────────────────────────────────────────────────────────────────

interface DataState {
  tasks: TaskWithRelations[];
  projects: Project[];
  setTasks: (tasks: TaskWithRelations[]) => void;
  setProjects: (projects: Project[]) => void;
  updateTask: (id: string, updates: Partial<Task>) => void;
  addTask: (task: TaskWithRelations) => void;
  removeTask: (id: string) => void;
  addProject: (project: Project) => void;
}

// ── Combined Store ────────────────────────────────────────────────────────────

type AppStore = UIState & DragState & ModalState & DataState;

export const useAppStore = create<AppStore>()(
  persist(
    (set, get) => ({
      // UI State
      backlogSidebarOpen: true,
      navRailExpanded: true,
      calendarView: "dayGridMonth",
      selectedProjectId: null,

      toggleBacklogSidebar: () =>
        set((s) => ({ backlogSidebarOpen: !s.backlogSidebarOpen })),
      setBacklogSidebarOpen: (open) => set({ backlogSidebarOpen: open }),
      toggleNavRail: () =>
        set((s) => ({ navRailExpanded: !s.navRailExpanded })),
      setCalendarView: (view) => set({ calendarView: view }),
      setSelectedProjectId: (id) => set({ selectedProjectId: id }),

      // Drag State
      draggingTask: null,
      isDraggingFromBacklog: false,
      setDraggingTask: (task, fromBacklog = false) =>
        set({ draggingTask: task, isDraggingFromBacklog: fromBacklog }),
      clearDrag: () =>
        set({ draggingTask: null, isDraggingFromBacklog: false }),

      // Modal State
      taskModalOpen: false,
      taskModalMode: "create",
      editingTask: null,
      defaultDate: null,
      projectModalOpen: false,

      openCreateModal: (defaultDate) =>
        set({
          taskModalOpen: true,
          taskModalMode: "create",
          editingTask: null,
          defaultDate: defaultDate ?? null,
        }),
      openEditModal: (task) =>
        set({
          taskModalOpen: true,
          taskModalMode: "edit",
          editingTask: task,
          defaultDate: null,
        }),
      closeTaskModal: () =>
        set({ taskModalOpen: false, editingTask: null, defaultDate: null }),
      openProjectModal: () => set({ projectModalOpen: true }),
      closeProjectModal: () => set({ projectModalOpen: false }),

      // Data Cache
      tasks: [],
      projects: [],

      setTasks: (tasks) => set({ tasks }),
      setProjects: (projects) => set({ projects }),
      updateTask: (id, updates) =>
        set((s) => ({
          tasks: s.tasks.map((t) =>
            t.id === id ? { ...t, ...updates } : t
          ),
        })),
      addTask: (task) => set((s) => ({ tasks: [task, ...s.tasks] })),
      removeTask: (id) =>
        set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) })),
      addProject: (project) =>
        set((s) => ({ projects: [project, ...s.projects] })),
    }),
    {
      name: "enetk-pm-ui-state",
      // Only persist UI preferences, NOT data cache or modal state
      partialize: (state) => ({
        backlogSidebarOpen: state.backlogSidebarOpen,
        navRailExpanded: state.navRailExpanded,
        calendarView: state.calendarView,
        selectedProjectId: state.selectedProjectId,
      }),
    }
  )
);
