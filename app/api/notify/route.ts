import { NextResponse } from "next/server";
import { createAdminClient, createServerClient } from "@/lib/supabase";

export async function POST(request: Request) {
  const authHeader = request.headers.get("Authorization");
  const token = authHeader?.replace("Bearer ", "");
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userClient = createServerClient(token);
  const { data: { user }, error: authError } = await userClient.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { user_id, type, title, body, link } = await request.json();
  if (!user_id || !title) {
    return NextResponse.json({ error: "Missing user_id or title" }, { status: 400 });
  }
  // Buyers can only notify themselves; suppliers and admins can notify any user (for order updates)
  if (user_id !== user.id) {
    const { data: profile } = await userClient.from("profiles").select("role").eq("id", user.id).maybeSingle();
    if (!profile || !["supplier", "admin"].includes(profile.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const db = createAdminClient();
  const { error } = await db.from("notifications").insert({ user_id, type, title, body, link });
  if (error) {
    return NextResponse.json({ error: "Failed to send notification" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
