import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createServerClient, ensureUserExists } from "@/lib/supabase/server";

// GET /api/customers
export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createServerClient();
  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search");

  let query = supabase
    .from("customers")
    .select(`
      *,
      contacts(id, first_name, last_name, title, phone, email, is_primary),
      projects(id, name, color, status)
    `)
    .eq("is_active", true)
    .order("name", { ascending: true });

  if (search) {
    query = query.ilike("name", `%${search}%`);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ customers: data });
}

// POST /api/customers
export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await ensureUserExists(userId);

  const supabase = createServerClient();
  const body = await req.json();

  const { data, error } = await supabase
    .from("customers")
    .insert({ ...body, created_by: userId })
    .select(`
      *,
      contacts(id, first_name, last_name, title, phone, email, is_primary),
      projects(id, name, color, status)
    `)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ customer: data }, { status: 201 });
}
