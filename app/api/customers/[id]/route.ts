import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createServerClient } from "@/lib/supabase/server";

// GET /api/customers/[id]
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const supabase = createServerClient();

  const { data, error } = await supabase
    .from("customers")
    .select(`
      *,
      contacts(id, first_name, last_name, title, phone, email, is_primary, notes),
      projects(id, name, color, status, customer_id)
    `)
    .eq("id", id)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 404 });
  return NextResponse.json({ customer: data });
}

// PATCH /api/customers/[id]
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const supabase = createServerClient();
  const body = await req.json();

  const { data, error } = await supabase
    .from("customers")
    .update(body as any)
    .eq("id", id)
    .select(`
      *,
      contacts(id, first_name, last_name, title, phone, email, is_primary),
      projects(id, name, color, status)
    `)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ customer: data });
}

// DELETE /api/customers/[id] — soft delete
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
    .from("customers")
    .update({ is_active: false } as any)
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
