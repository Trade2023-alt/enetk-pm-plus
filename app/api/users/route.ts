import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createServerClient } from "@/lib/supabase/server";

// GET /api/users — user list for admin and team members
export async function GET(req: NextRequest) {
  const { userId, sessionClaims } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = (sessionClaims?.metadata as any)?.role;
  if (role !== "admin" && role !== "user") {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("users")
    .select("id, full_name, email, role, is_active, created_at, customer_id")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ users: data });
}
