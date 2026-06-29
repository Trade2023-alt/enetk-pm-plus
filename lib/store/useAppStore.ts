import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Task, Project, TaskWithRelations } from "@/lib/supabase/types";

// ── UI State ──────────────────────────────────────────────────────────────────

interface UIState {
  backlogSidebarOpen: boolean;
  navRailExpanded: boolean;
  toggleBacklogSidebar: () => void;
  setBacklogSidebarOpen: (open: boolean) => void;
  toggleNavRail: () => void;

  calendarView: "dayGridMonth" | "timeGridWeek" | "listWeek";
  setCalendarView: (view: "dayGridMonth" | "timeGridWeek" | "listWeek") => void;

  selectedProjectId: string | null;
  setSelectedProjectId: (id: string | null) => void;

  selectedEmployeeId: string | null;
  setSelectedEmployeeId: (id: string | null) => void;

  calendarApi: any | null;
  setCalendarApi: (api: any | null) => void;
}

// ── Drag State ────────────────────────────────────────────────────────────────

interface DragState {
  draggingTask: Task | null;
  isDraggingFromBacklog: boolean;
  setDraggingTask: (task: Task | null, fromBacklog?: boolean) => void;
  clearDrag: () => void;
}

// ── Task Panel State (replaces modal) ─────────────────────────────────────────

interface PanelState {
  // Task panel (slide-in from right)
  taskPanelOpen: boolean;
  taskPanelMode: "create" | "edit";
  editingTask: TaskWithRelations | null;
  defaultDate: string | null;
  defaultEndDate: string | null;
  openCreatePanel: (defaultDate?: string, defaultEndDate?: string) => void;
  openEditPanel: (task: TaskWithRelations) => void;
  closeTaskPanel: () => void;

  // Legacy aliases so existing components don't break
  taskModalOpen: boolean;
  openCreateModal: (defaultDate?: string) => void;
  openEditModal: (task: TaskWithRelations) => void;
  closeTaskModal: () => void;

  // Project modal
  projectModalOpen: boolean;
  openProjectModal: () => void;
  closeProjectModal: () => void;
}

// ── Data Cache ────────────────────────────────────────────────────────────────

interface DataState {
  tasks: TaskWithRelations[];
  projects: Project[];
  customers: any[];
  setTasks: (tasks: TaskWithRelations[]) => void;
  setProjects: (projects: Project[]) => void;
  setCustomers: (customers: any[]) => void;
  updateTask: (id: string, updates: Partial<Task & {
    scheduled_end_date?: string | null;
    daily_hours_plan?: Record<string, number>;
  }>) => void;
  addTask: (task: TaskWithRelations) => void;
  removeTask: (id: string) => void;
  addProject: (project: Project) => void;
  updateProject: (id: string, updates: Partial<Project>) => void;
}

// ── Combined Store ────────────────────────────────────────────────────────────

type AppStore = UIState & DragState & PanelState & DataState;

export const useAppStore = create<AppStore>()(
  persist(
    (set, get) => ({
      // ── UI ──
      backlogSidebarOpen: true,
      navRailExpanded: true,
      calendarView: "dayGridMonth",
      selectedProjectId: null,
      selectedEmployeeId: null,

      toggleBacklogSidebar: () =>
        set((s) => ({ backlogSidebarOpen: !s.backlogSidebarOpen })),
      setBacklogSidebarOpen: (open) => set({ backlogSidebarOpen: open }),
      toggleNavRail: () =>
        set((s) => ({ navRailExpanded: !s.navRailExpanded })),
      setCalendarView: (view) => set({ calendarView: view }),
      setSelectedProjectId: (id) => set({ selectedProjectId: id }),
      setSelectedEmployeeId: (id) => set({ selectedEmployeeId: id }),
      calendarApi: null,
      setCalendarApi: (api) => set({ calendarApi: api }),

      // ── Drag ──
      draggingTask: null,
      isDraggingFromBacklog: false,
      setDraggingTask: (task, fromBacklog = false) =>
        set({ draggingTask: task, isDraggingFromBacklog: fromBacklog }),
      clearDrag: () =>
        set({ draggingTask: null, isDraggingFromBacklog: false }),

      // ── Task Panel ──
      taskPanelOpen: false,
      taskPanelMode: "create",
      editingTask: null,
      defaultDate: null,
      defaultEndDate: null,
      projectModalOpen: false,

      openCreatePanel: (defaultDate, defaultEndDate) =>
        set({
          taskPanelOpen: true,
          taskPanelMode: "create",
          editingTask: null,
          defaultDate: defaultDate ?? null,
          defaultEndDate: defaultEndDate ?? null,
        }),
      openEditPanel: (task) =>
        set({
          taskPanelOpen: true,
          taskPanelMode: "edit",
          editingTask: task,
          defaultDate: null,
          defaultEndDate: null,
        }),
      closeTaskPanel: () =>
        set({ taskPanelOpen: false, editingTask: null, defaultDate: null, defaultEndDate: null }),

      // Legacy aliases → forward to panel
      get taskModalOpen() { return get().taskPanelOpen; },
      openCreateModal: (defaultDate) => get().openCreatePanel(defaultDate),
      openEditModal: (task) => get().openEditPanel(task),
      closeTaskModal: () => get().closeTaskPanel(),

      openProjectModal: () => set({ projectModalOpen: true }),
      closeProjectModal: () => set({ projectModalOpen: false }),

      // ── Data ──
      tasks: [],
      projects: [],
      customers: [],

      setTasks: (tasks) => set({ tasks }),
      setProjects: (projects) => set({ projects }),
      setCustomers: (customers) => set({ customers }),
      updateTask: (id, updates) =>
        set((s) => ({
          tasks: s.tasks.map((t) =>
            t.id === id ? { ...t, ...updates } : t
          ),
        })),
      addTask: (task) => set((s) => ({ tasks: [task, ...s.tasks] })),
      removeTask: (id) =>
        set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) })),
      addProject: (project) => set((s) => ({ projects: [project, ...s.projects] })),
      updateProject: (id, updates) =>
        set((s) => ({
          projects: s.projects.map((p) =>
            p.id === id ? { ...p, ...updates } : p
          ),
        })),
    }),
    {
      name: "enetk-pm-ui-state",
      partialize: (state) => ({
        backlogSidebarOpen: state.backlogSidebarOpen,
        navRailExpanded: state.navRailExpanded,
        calendarView: state.calendarView,
        selectedProjectId: state.selectedProjectId,
        selectedEmployeeId: state.selectedEmployeeId,
      }),
    }
  )
);
