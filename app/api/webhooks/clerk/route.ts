import { NextRequest, NextResponse } from "next/server";
import { Webhook } from "svix";
import { createServerClient } from "@/lib/supabase/server";

// POST /api/webhooks/clerk
// Syncs Clerk user events to our Supabase users table
export async function POST(req: NextRequest) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;
  if (!WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Missing webhook secret" }, { status: 500 });
  }

  // Verify webhook signature
  const svixId        = req.headers.get("svix-id");
  const svixTimestamp = req.headers.get("svix-timestamp");
  const svixSignature = req.headers.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json({ error: "Missing svix headers" }, { status: 400 });
  }

  const payload = await req.text();
  const wh = new Webhook(WEBHOOK_SECRET);

  let event: any;
  try {
    event = wh.verify(payload, {
      "svix-id":        svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    });
  } catch {
    return NextResponse.json({ error: "Invalid webhook signature" }, { status: 400 });
  }

  const supabase = createServerClient();
  const { type, data } = event;

  if (type === "user.created" || type === "user.updated") {
    const { id, email_addresses, first_name, last_name, image_url, public_metadata } = data;
    const email    = email_addresses?.[0]?.email_address ?? "";
    const fullName = [first_name, last_name].filter(Boolean).join(" ") || null;
    const role     = (public_metadata?.role as string) ?? "user";

    await supabase.from("users").upsert(
      {
        id,
        email,
        full_name:  fullName,
        avatar_url: image_url ?? null,
        role,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    );
  }

  if (type === "user.deleted") {
    await supabase.from("users").update({ is_active: false }).eq("id", data.id);
  }

  return NextResponse.json({ received: true });
}
