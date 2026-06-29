import { NextRequest, NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
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

  // Proactive sync: Fetch users from Clerk and sync any missing users to Supabase database
  try {
    const client = await clerkClient();
    const clerkUsersList = await client.users.getUserList({ limit: 100 });
    
    // Fetch current user IDs in Supabase
    const { data: dbUsers } = await supabase.from("users").select("id");
    const dbUserIds = new Set(dbUsers?.map((u) => u.id) ?? []);

    for (const u of clerkUsersList.data) {
      if (!dbUserIds.has(u.id)) {
        const email = u.emailAddresses?.[0]?.emailAddress ?? "";
        const fullName = [u.firstName, u.lastName].filter(Boolean).join(" ") || null;
        const uRole = (u.publicMetadata?.role as string) ?? "user";

        await supabase.from("users").insert({
          id: u.id,
          email,
          full_name: fullName,
          avatar_url: u.imageUrl ?? null,
          role: uRole,
          is_active: true,
          updated_at: new Date().toISOString(),
        });
      }
    }
  } catch (syncErr) {
    console.error("Failed to auto-sync Clerk users during GET:", syncErr);
  }

  const { data, error } = await supabase
    .from("users")
    .select("id, full_name, email, role, is_active, created_at, customer_id")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ users: data });
}
