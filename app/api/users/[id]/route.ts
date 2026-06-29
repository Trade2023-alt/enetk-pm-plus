import { NextRequest, NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { createServerClient } from "@/lib/supabase/server";

// PATCH /api/users/[id] — admin only
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId: currentUserId } = await auth();
  if (!currentUserId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createServerClient();

  // Fetch logged-in user profile from Supabase database to check role
  const { data: userProfile } = await supabase
    .from("users")
    .select("role")
    .eq("id", currentUserId)
    .single();

  if (!userProfile || userProfile.role !== "admin") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();

  // 1. Update public.users in Supabase
  const updateData: any = {};
  if (body.role !== undefined) updateData.role = body.role;
  if (body.customer_id !== undefined) updateData.customer_id = body.customer_id;
  updateData.updated_at = new Date().toISOString();

  const { data: updatedUser, error } = await supabase
    .from("users")
    .update(updateData)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // 2. Sync to Clerk metadata if role or customer_id is updated
  try {
    const client = await clerkClient();
    const metadataUpdates: any = {};
    if (body.role !== undefined) metadataUpdates.role = body.role;
    if (body.customer_id !== undefined) metadataUpdates.customer_id = body.customer_id;

    await client.users.updateUserMetadata(id, {
      publicMetadata: metadataUpdates,
    });
  } catch (clerkErr: any) {
    console.error("Failed to sync permissions to Clerk metadata:", clerkErr);
  }

  return NextResponse.json({ user: updatedUser });
}
