import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createServerClient } from "@/lib/supabase/server";

// GET /api/tasks — fetch all tasks with relations
export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createServerClient();
  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get("project_id");

  let query = supabase
    .from("tasks")
    .select(`
      *,
      project:projects(id, name, color, status),
      assigned_user:users!tasks_assigned_to_fkey(id, full_name, email),
      sub_tasks(id, title, is_completed, sort_order),
      precursor:tasks!tasks_precursor_task_id_fkey(id, task_name)
    `)
    .order("created_at", { ascending: false });

  if (projectId) {
    query = query.eq("project_id", projectId);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ tasks: data });
}

// POST /api/tasks — create a new task
export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const supabase = createServerClient();

  const { sub_tasks, ...taskData } = body;

  const { data: task, error } = await supabase
    .from("tasks")
    .insert({
      ...taskData,
      created_by: userId,
    })
    .select(`
      *,
      project:projects(id, name, color, status),
      sub_tasks(id, title, is_completed, sort_order)
    `)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Insert sub-tasks if any
  if (sub_tasks?.length && task) {
    const stInserts = sub_tasks.map((st: any, idx: number) => ({
      task_id:      task.id,
      title:        st.title,
      is_completed: st.is_completed ?? false,
      sort_order:   idx,
      created_by:   userId,
    }));

    await supabase.from("sub_tasks").insert(stInserts);
  }

  // Refetch with sub-tasks
  const { data: fullTask } = await supabase
    .from("tasks")
    .select(`
      *,
      project:projects(id, name, color, status),
      sub_tasks(id, title, is_completed, sort_order)
    `)
    .eq("id", task!.id)
    .single();

  return NextResponse.json({ task: fullTask }, { status: 201 });
}
