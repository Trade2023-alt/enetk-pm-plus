import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createServerClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";

type TaskUpdate = Database["public"]["Tables"]["tasks"]["Update"];
type SubTaskInsert = Database["public"]["Tables"]["sub_tasks"]["Insert"];

// PATCH /api/tasks/[id] — update a task
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const supabase = createServerClient();

  // Fetch logged-in user profile to check role
  const { data: userProfile } = await supabase
    .from("users")
    .select("role")
    .eq("id", userId)
    .single();

  if (userProfile?.role === "customer") {
    return NextResponse.json({ error: "Access denied: Customers cannot edit tasks" }, { status: 403 });
  }

  const body = await req.json() as Record<string, unknown>;
  const { sub_tasks, ...taskData } = body;

  const { data: task, error } = await supabase
    .from("tasks")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .update(taskData as any)
    .eq("id", id)
    .select(`
      *,
      project:projects(id, name, color, status),
      assigned_user:users!tasks_assigned_to_fkey(id, full_name, email),
      sub_tasks(id, title, is_completed, sort_order),
      precursor:tasks!precursor_task_id(id, task_name)
    `)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Update sub-tasks if provided
  if (sub_tasks !== undefined && task) {
    await supabase.from("sub_tasks").delete().eq("task_id", id);

    if (Array.isArray(sub_tasks) && sub_tasks.length > 0) {
      const stInserts = sub_tasks.map((st: any, idx: number) => ({
        task_id:      id,
        title:        st.title,
        is_completed: Boolean((st as any).is_completed),
        sort_order:   Number((st as any).sort_order ?? idx),
        scheduled_date: st.scheduled_date || null,
        created_by:   userId,
      }));
      await supabase.from("sub_tasks").insert(stInserts as SubTaskInsert[]);
    }
  }

  // Refetch with fresh sub-tasks and relations
  const { data: fullTask } = await supabase
    .from("tasks")
    .select(`
      *,
      project:projects(id, name, color, status),
      assigned_user:users!tasks_assigned_to_fkey(id, full_name, email),
      sub_tasks(id, title, is_completed, sort_order),
      precursor:tasks!precursor_task_id(id, task_name)
    `)
    .eq("id", id)
    .single();

  return NextResponse.json({ task: fullTask });
}

// DELETE /api/tasks/[id] — admin only
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId, sessionClaims } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = (sessionClaims?.metadata as any)?.role;
  if (role !== "admin") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const { id } = await params;
  const supabase = createServerClient();
  const { error } = await supabase.from("tasks").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

// GET /api/tasks/[id] — fetch single task with all relations
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("tasks")
    .select(`
      *,
      project:projects(id, name, color, status),
      assigned_user:users!tasks_assigned_to_fkey(id, full_name, email),
      sub_tasks(id, title, is_completed, sort_order),
      precursor:tasks!precursor_task_id(id, task_name)
    `)
    .eq("id", id)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }

  return NextResponse.json({ task: data });
}
