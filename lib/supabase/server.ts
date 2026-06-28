import { createClient } from "@supabase/supabase-js";

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
