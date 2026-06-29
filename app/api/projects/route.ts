import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createServerClient, ensureUserExists } from "@/lib/supabase/server";

// GET /api/projects
export async function GET(_req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createServerClient();

  // Fetch logged-in user profile to check role
  const { data: userProfile } = await supabase
    .from("users")
    .select("role, customer_id")
    .eq("id", userId)
    .single();

  let query = supabase
    .from("projects")
    .select("*, customer:customers(id, name)")
    .neq("status", "archived")
    .order("name", { ascending: true });

  if (userProfile?.role === "customer" && userProfile.customer_id) {
    query = query.eq("customer_id", userProfile.customer_id);
  }

  const { data, error } = await query;

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ projects: data });
}

// POST /api/projects
export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await ensureUserExists(userId);

  const supabase = createServerClient();

  // Fetch logged-in user profile to check role
  const { data: userProfile } = await supabase
    .from("users")
    .select("role")
    .eq("id", userId)
    .single();

  if (userProfile?.role === "customer") {
    return NextResponse.json({ error: "Access denied: Customers cannot create projects" }, { status: 403 });
  }

  const body = await req.json();
  const { clone_from_project_id, clone_tasks = true, ...projectFields } = body;

  const { data: project, error } = await supabase
    .from("projects")
    .insert({ ...projectFields, created_by: userId })
    .select("*, customer:customers(id, name)")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Handle cloning tasks from template
  if (clone_from_project_id && clone_tasks) {
    // 1. Fetch template tasks and their sub_tasks
    const { data: templateTasks } = await supabase
      .from("tasks")
      .select(`
        *,
        sub_tasks(title, sort_order)
      `)
      .eq("project_id", clone_from_project_id);

    if (templateTasks && templateTasks.length > 0) {
      const taskIdMap: Record<string, string> = {};

      // 2. Clone tasks (excluding sub_tasks, id, and precursor_task_id for now)
      for (const t of templateTasks) {
        const { id: oldId, sub_tasks, precursor_task_id, created_at, updated_at, ...taskFields } = t as any;
        const { data: newDbTask } = await supabase
          .from("tasks")
          .insert({
            ...taskFields,
            project_id: project.id,
            is_template: false,
            created_by: userId,
            scheduled_date: null,
            scheduled_end_date: null,
            scheduled_time: null,
            daily_hours_plan: null,
            status: "pending"
          })
          .select("id")
          .single();

        if (newDbTask) {
          taskIdMap[oldId] = newDbTask.id;

          // 3. Clone sub-tasks
          if (sub_tasks && sub_tasks.length > 0) {
            const stInserts = sub_tasks.map((st: any) => ({
              task_id: newDbTask.id,
              title: st.title,
              is_completed: false,
              sort_order: st.sort_order,
              created_by: userId
            }));
            await supabase.from("sub_tasks").insert(stInserts);
          }
        }
      }

      // 4. Clone dependency references
      for (const t of templateTasks) {
        const { id: oldId, precursor_task_id } = t as any;
        if (precursor_task_id && taskIdMap[precursor_task_id]) {
          const newTaskId = taskIdMap[oldId];
          const newPrecursorId = taskIdMap[precursor_task_id];
          await supabase
            .from("tasks")
            .update({ precursor_task_id: newPrecursorId })
            .eq("id", newTaskId);
        }
      }
    }
  }

  return NextResponse.json({ project }, { status: 201 });
}
