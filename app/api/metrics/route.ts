import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createServerClient } from "@/lib/supabase/server";
import { startOfWeek, endOfWeek, format } from "date-fns";

// GET /api/metrics — dashboard KPI data
export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createServerClient();

  // Fetch logged-in user profile to check role
  const { data: userProfile } = await supabase
    .from("users")
    .select("role, customer_id")
    .eq("id", userId)
    .single();

  const weekStart = format(startOfWeek(new Date()), "yyyy-MM-dd");
  const weekEnd   = format(endOfWeek(new Date()), "yyyy-MM-dd");

  let tasksQuery = supabase
    .from("tasks")
    .select("id, status, is_flagged, scheduled_date, estimated_hours, used_hours, project_id")
    .not("status", "eq", "completed");

  let hasProjects = true;
  if (userProfile?.role === "customer" && userProfile.customer_id) {
    const { data: customerProjects } = await supabase
      .from("projects")
      .select("id")
      .eq("customer_id", userProfile.customer_id);

    const projectIds = customerProjects?.map((p) => p.id) ?? [];
    if (projectIds.length > 0) {
      tasksQuery = tasksQuery.in("project_id", projectIds);
    } else {
      hasProjects = false;
    }
  }

  if (!hasProjects) {
    return NextResponse.json({
      totalUsers:       0,
      overdueCount:     0,
      flaggedCount:     0,
      unscheduledCount: 0,
      weeklyHours: {
        estimated: 0,
        used:      0,
      },
    });
  }

  const [usersRes, tasksRes] = await Promise.all([
    userProfile?.role === "customer"
      ? Promise.resolve({ count: 0 })
      : supabase.from("users").select("id", { count: "exact", head: true }),
    tasksQuery,
  ]);

  type TaskRow = {
    id: string;
    status: string;
    is_flagged: boolean;
    scheduled_date: string | null;
    estimated_hours: number | null;
    used_hours: number | null;
  };

  const tasks = (tasksRes.data ?? []) as TaskRow[];

  const weekTasks = tasks.filter(
    (t) =>
      t.scheduled_date &&
      t.scheduled_date >= weekStart &&
      t.scheduled_date <= weekEnd
  );

  const weeklyHours = weekTasks.reduce(
    (acc, t) => ({
      estimated: acc.estimated + (t.estimated_hours ?? 0),
      used:      acc.used      + (t.used_hours      ?? 0),
    }),
    { estimated: 0, used: 0 }
  );

  return NextResponse.json({
    totalUsers:       usersRes.count ?? 0,
    overdueCount:     tasks.filter((t) => t.status === "overdue").length,
    flaggedCount:     tasks.filter((t) => t.is_flagged).length,
    unscheduledCount: tasks.filter((t) => !t.scheduled_date).length,
    weeklyHours: {
      estimated: Math.round(weeklyHours.estimated * 10) / 10,
      used:      Math.round(weeklyHours.used      * 10) / 10,
    },
  });
}
