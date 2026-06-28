import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

// Browser-side Supabase client using anon key
// Safe to expose to the client — RLS enforced at API route layer via Clerk
let client: ReturnType<typeof createClient<Database>> | null = null;

export function createBrowserClient() {
  if (client) return client;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  if (!url || !key) {
    throw new Error(
      "Missing Supabase client environment variables. Check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY."
    );
  }

  client = createClient<Database>(url, key);
  return client;
}
