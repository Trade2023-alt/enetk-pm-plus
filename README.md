# ENETK PM+ — Industrial Scheduling Application

A full-stack project management and calendar scheduling application built for electrical trade / industrial operations teams. Designed to ISA-101 High-Performance HMI standards.

## Tech Stack

- **Next.js 16** (App Router, Turbopack)
- **Clerk v7** — Authentication & role-based access control
- **Supabase** — PostgreSQL database with Row Level Security
- **FullCalendar 6** — Drag-and-drop scheduling
- **Zustand** — Client-side state management
- **Tailwind CSS v4** — ISA-101 HMI dark theme

## Features

- 📅 Calendar view (Month / Week / List) with drag-and-drop task scheduling
- 📋 Right-side collapsible backlog sidebar — drag unscheduled tasks onto calendar
- ✅ Task CRUD with sub-tasks, hour tracking, deadline flagging, and dependency linking
- 🚨 Auto-flagging system — tasks missing project or deadline are flagged at DB level
- 📊 Dashboard metrics bar — overdue, flagged, backlog count, weekly hours utilization
- 🔐 Role-based access (Admin vs User) — admins can delete tasks
- 🔔 Clerk webhook → Supabase user sync

## Getting Started

### 1. Clone & Install

```bash
git clone https://github.com/YOUR_USERNAME/enetk-pm-plus.git
cd enetk-pm-plus
npm install
```

### 2. Configure Environment Variables

Copy the example file:

```bash
cp .env.example .env.local
```

Fill in all values in `.env.local`:

| Variable | Where to get it |
|---|---|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | [Clerk Dashboard](https://dashboard.clerk.com) → API Keys |
| `CLERK_SECRET_KEY` | Clerk Dashboard → API Keys |
| `CLERK_WEBHOOK_SECRET` | Clerk Dashboard → Webhooks → your endpoint |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API → `service_role` |

### 3. Apply Database Schema

The schema is in `lib/supabase/schema.sql`. Run it in your Supabase SQL editor, or use the Supabase CLI:

```bash
# Via Supabase CLI
supabase db push
```

### 4. Set Up Clerk Webhook

1. Clerk Dashboard → Webhooks → Add endpoint
2. URL: `https://your-domain.com/api/webhooks/clerk`
3. Events: `user.created`, `user.updated`, `user.deleted`
4. Copy signing secret → `CLERK_WEBHOOK_SECRET`

### 5. Run Locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Deployment (Vercel)

```bash
npm i -g vercel
vercel --prod
```

Add all `.env.local` variables to Vercel's environment settings.

## Setting Admin Role

After signing in, set your role in Clerk Dashboard:
1. Users → click your user
2. Public Metadata → `{ "role": "admin" }`

## Project Structure

```
app/
  (app)/dashboard/     ← Main calendar dashboard
  (auth)/sign-in/      ← Clerk sign-in
  (auth)/sign-up/      ← Clerk sign-up
  api/tasks/           ← Task CRUD endpoints
  api/projects/        ← Project endpoints
  api/metrics/         ← Dashboard KPI endpoint
  api/webhooks/clerk/  ← Clerk user sync
components/
  calendar/            ← FullCalendar integration
  layout/              ← AppShell, NavRail, BacklogSidebar
  tasks/               ← TaskModal, SubTaskList, TaskFlagBadge
  dashboard/           ← MetricsBar
lib/
  supabase/            ← Client & server Supabase clients + schema
  store/               ← Zustand app state
  utils/               ← Task utilities
```

## License

Private — Ystaas Electrical Services
