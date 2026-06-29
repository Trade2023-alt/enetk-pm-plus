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

  const { data, error } = await supabase
    .from("projects")
    .insert({ ...body, created_by: userId })
    .select("*, customer:customers(id, name)")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ project: data }, { status: 201 });
}
