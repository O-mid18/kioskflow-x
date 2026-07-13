import { NextResponse } from "next/server";
import { createAdminClient, createServerClient } from "@/lib/supabase";

export async function POST(request: Request) {
  const authHeader = request.headers.get("Authorization");
  const token = authHeader?.replace("Bearer ", "");
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userClient = createServerClient(token);
  const { data: { user }, error: authError } = await userClient.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let user_id: string, type: string, title: string, body: string, link: string, orderId: string | undefined;
  try {
    ({ user_id, type, title, body, link, orderId } = await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (!user_id || !title) {
    return NextResponse.json({ error: "Missing user_id or title" }, { status: 400 });
  }
  // Prevent phishing: link must be a relative path
  if (link && !link.startsWith("/")) {
    return NextResponse.json({ error: "Invalid link: must be a relative path" }, { status: 400 });
  }
  // Buyers can only notify themselves; suppliers/admins can notify for their own orders only
  if (user_id !== user.id) {
    const { data: profile } = await userClient.from("profiles").select("role").eq("id", user.id).maybeSingle();
    if (!profile || !["supplier", "admin"].includes(profile.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    // Suppliers must specify orderId and must have items in that order
    if (profile.role === "supplier") {
      if (!orderId) return NextResponse.json({ error: "orderId required for supplier notifications" }, { status: 400 });
      const db = createAdminClient();
      const { data: callerSup } = await db.from("suppliers").select("id").eq("user_id", user.id).maybeSingle();
      if (!callerSup) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      const { data: items } = await db.from("order_items").select("id").eq("order_id", orderId).eq("supplier_id", callerSup.id).limit(1);
      if (!items || items.length === 0) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const db = createAdminClient();
  const { error } = await db.from("notifications").insert({ user_id, type, title, body, link });
  if (error) {
    return NextResponse.json({ error: "Failed to send notification" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
