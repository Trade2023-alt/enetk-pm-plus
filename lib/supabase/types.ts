// Database types auto-generated from Supabase schema
// Run: npx supabase gen types typescript --project-id qbppximsqwohigxbvuxe > lib/supabase/types.ts
// to regenerate after schema changes

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          avatar_url: string | null;
          role: "user" | "admin";
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          avatar_url?: string | null;
          role?: "user" | "admin";
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string | null;
          avatar_url?: string | null;
          role?: "user" | "admin";
          is_active?: boolean;
          updated_at?: string;
        };
      };
      projects: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          color: string;
          status: "active" | "on_hold" | "completed" | "archived";
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          color?: string;
          status?: "active" | "on_hold" | "completed" | "archived";
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          color?: string;
          status?: "active" | "on_hold" | "completed" | "archived";
          updated_at?: string;
        };
      };
      tasks: {
        Row: {
          id: string;
          project_id: string | null;
          assigned_to: string | null;
          job_number: string | null;
          task_name: string;
          description: string | null;
          estimated_hours: number | null;
          used_hours: number;
          deadline: string | null;
          scheduled_date: string | null;
          scheduled_time: string | null;
          duration_hours: number;
          precursor_task_id: string | null;
          status: "pending" | "in_progress" | "completed" | "overdue" | "blocked";
          is_flagged: boolean;
          color_override: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          project_id?: string | null;
          assigned_to?: string | null;
          job_number?: string | null;
          task_name: string;
          description?: string | null;
          estimated_hours?: number | null;
          used_hours?: number;
          deadline?: string | null;
          scheduled_date?: string | null;
          scheduled_time?: string | null;
          duration_hours?: number;
          precursor_task_id?: string | null;
          status?: "pending" | "in_progress" | "completed" | "overdue" | "blocked";
          is_flagged?: boolean;
          color_override?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string | null;
          assigned_to?: string | null;
          job_number?: string | null;
          task_name?: string;
          description?: string | null;
          estimated_hours?: number | null;
          used_hours?: number;
          deadline?: string | null;
          scheduled_date?: string | null;
          scheduled_time?: string | null;
          duration_hours?: number;
          precursor_task_id?: string | null;
          status?: "pending" | "in_progress" | "completed" | "overdue" | "blocked";
          is_flagged?: boolean;
          color_override?: string | null;
          updated_at?: string;
        };
      };
      sub_tasks: {
        Row: {
          id: string;
          task_id: string;
          title: string;
          is_completed: boolean;
          sort_order: number;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          task_id: string;
          title: string;
          is_completed?: boolean;
          sort_order?: number;
          created_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          task_id?: string;
          title?: string;
          is_completed?: boolean;
          sort_order?: number;
        };
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}

// Convenience type aliases
export type User = Database["public"]["Tables"]["users"]["Row"];
export type Project = Database["public"]["Tables"]["projects"]["Row"];
export type Task = Database["public"]["Tables"]["tasks"]["Row"];
export type SubTask = Database["public"]["Tables"]["sub_tasks"]["Row"];

export type TaskWithRelations = Task & {
  project?: Project | null;
  assigned_user?: User | null;
  sub_tasks?: SubTask[];
  precursor?: Task | null;
};

export type ProjectWithTasks = Project & {
  tasks?: Task[];
};
