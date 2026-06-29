import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createServerClient } from "@/lib/supabase/server";

// PATCH /api/projects/[id]
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
    return NextResponse.json({ error: "Access denied: Customers cannot edit projects" }, { status: 403 });
  }

  const body = await req.json();
  const { clone_from_project_id, clone_tasks, ...updateData } = body;

  const { data, error } = await supabase
    .from("projects")
    .update(updateData as any)
    .eq("id", id)
    .select("*, customer:customers(id, name)")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ project: data });
}

// DELETE /api/projects/[id] — admin only
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId, sessionClaims } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = (sessionClaims?.metadata as any)?.role;
  if (role !== "admin") return NextResponse.json({ error: "Admin only" }, { status: 403 });

  const { id } = await params;
  const supabase = createServerClient();
  const { error } = await supabase
    .from("projects")
    .update({ status: "archived" } as any)
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
