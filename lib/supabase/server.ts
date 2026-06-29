import { createClient } from "@supabase/supabase-js";
import { currentUser } from "@clerk/nextjs/server";

// Server-side client with service role key — bypasses RLS
// ONLY use in API routes / Server Actions, NEVER expose to client
// Using untyped client to avoid strict generic inference issues with hand-written types
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createServerClient(): ReturnType<typeof createClient<any>> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  if (!url || !key) {
    throw new Error(
      "Missing Supabase server environment variables. Check NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY."
    );
  }

  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

// ── Auto-Sync Clerk User to Supabase Users Table ─────────────────────────────
export async function ensureUserExists(userId: string): Promise<void> {
  const supabase = createServerClient();

  // 1. Check if user already exists
  const { data: existingUser } = await supabase
    .from("users")
    .select("id")
    .eq("id", userId)
    .maybeSingle();

  if (existingUser) return;

  // 2. Fetch profile from Clerk
  try {
    const user = await currentUser();
    if (!user || user.id !== userId) return;

    const email = user.emailAddresses?.[0]?.emailAddress ?? "";
    const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ") || null;
    const role = (user.publicMetadata?.role as string) ?? "user";

    // 3. Upsert user
    await supabase.from("users").upsert(
      {
        id: userId,
        email,
        full_name: fullName,
        avatar_url: user.imageUrl ?? null,
        role,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    );
  } catch (err) {
    console.error("Failed to auto-sync Clerk user to Supabase:", err);
  }
}
