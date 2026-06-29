import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createServerClient, ensureUserExists } from "@/lib/supabase/server";

// GET /api/contacts?customer_id=xxx
export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createServerClient();
  const { searchParams } = new URL(req.url);
  const customerId = searchParams.get("customer_id");

  let query = supabase
    .from("contacts")
    .select("*")
    .order("is_primary", { ascending: false })
    .order("last_name", { ascending: true });

  if (customerId) query = query.eq("customer_id", customerId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ contacts: data });
}

// POST /api/contacts
export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await ensureUserExists(userId);

  const supabase = createServerClient();
  const body = await req.json();

  // If this is marked as primary, demote others on this customer
  if (body.is_primary && body.customer_id) {
    await supabase
      .from("contacts")
      .update({ is_primary: false } as any)
      .eq("customer_id", body.customer_id);
  }

  const { data, error } = await supabase
    .from("contacts")
    .insert({ ...body, created_by: userId })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ contact: data }, { status: 201 });
}
