-- ============================================================
-- ENETK PM+ Database Schema
-- ISA-101 Compliant Industrial Calendar Scheduling Platform
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- USERS TABLE (synced from Clerk via webhook)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.users (
  id          TEXT PRIMARY KEY,             -- Clerk user_id (e.g. user_abc123)
  email       TEXT NOT NULL UNIQUE,
  full_name   TEXT,
  avatar_url  TEXT,
  role        TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin', 'customer')),
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  is_active   BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- PROJECTS TABLE (top-level containers)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.projects (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  description TEXT,
  color       TEXT DEFAULT '#6B7280',       -- Hex color for calendar display
  status      TEXT NOT NULL DEFAULT 'active'
                CHECK (status IN ('active', 'on_hold', 'completed', 'archived')),
  created_by  TEXT REFERENCES public.users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TASKS TABLE (mid-level, project_id NULLABLE = unassigned)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.tasks (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id        UUID REFERENCES public.projects(id) ON DELETE SET NULL,   -- NULLABLE: unassigned backlog
  assigned_to       TEXT REFERENCES public.users(id) ON DELETE SET NULL,
  job_number        TEXT,
  task_name         TEXT NOT NULL,
  description       TEXT,
  estimated_hours   NUMERIC(6,2),
  used_hours        NUMERIC(6,2) DEFAULT 0,
  deadline          DATE,
  scheduled_date    DATE,                   -- Calendar placement date
  scheduled_time    TIME,                   -- Optional start time (weekly view)
  duration_hours    NUMERIC(4,2) DEFAULT 1, -- For calendar block sizing
  precursor_task_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL,  -- Self-ref dependency
  status            TEXT NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending', 'in_progress', 'completed', 'overdue', 'blocked')),
  is_flagged        BOOLEAN DEFAULT FALSE,  -- TRUE if missing project/deadline (incomplete data)
  color_override    TEXT,                   -- Optional hex override for calendar
  created_by        TEXT REFERENCES public.users(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- SUB-TASKS TABLE (bottom-level checklist items)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.sub_tasks (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id      UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  title        TEXT NOT NULL,
  is_completed BOOLEAN DEFAULT FALSE,
  sort_order   INTEGER DEFAULT 0,
  created_by   TEXT REFERENCES public.users(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- INDEXES for performance (RLS adds WHERE clauses per row)
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_tasks_project_id     ON public.tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to    ON public.tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_scheduled_date ON public.tasks(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_tasks_status         ON public.tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_is_flagged     ON public.tasks(is_flagged);
CREATE INDEX IF NOT EXISTS idx_sub_tasks_task_id    ON public.sub_tasks(task_id);
CREATE INDEX IF NOT EXISTS idx_projects_status      ON public.projects(status);

-- ============================================================
-- UPDATED_AT TRIGGER FUNCTION
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER set_updated_at_tasks
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE OR REPLACE TRIGGER set_updated_at_projects
  BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE OR REPLACE TRIGGER set_updated_at_users
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================
-- AUTO-FLAG TRIGGER: Mark tasks as flagged if missing key data
-- ============================================================
CREATE OR REPLACE FUNCTION public.auto_flag_task()
RETURNS TRIGGER AS $$
BEGIN
  -- Flag if missing project assignment OR deadline
  IF NEW.project_id IS NULL OR NEW.deadline IS NULL THEN
    NEW.is_flagged = TRUE;
  ELSE
    NEW.is_flagged = FALSE;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER flag_incomplete_tasks
  BEFORE INSERT OR UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.auto_flag_task();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE public.users     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sub_tasks ENABLE ROW LEVEL SECURITY;

-- NOTE: Since we use Clerk (not Supabase Auth), we use service_role on the
-- server side (API routes) and anon key with no auth on public read paths.
-- RLS is enforced at the API route layer via Clerk session validation.
-- We still enable RLS as defense-in-depth.

-- Public read for all authenticated users (API routes pass service key)
-- These policies allow service_role (bypasses RLS) and block anon direct access
CREATE POLICY "Service role full access - users"
  ON public.users FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access - projects"
  ON public.projects FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access - tasks"
  ON public.tasks FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access - sub_tasks"
  ON public.sub_tasks FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);
