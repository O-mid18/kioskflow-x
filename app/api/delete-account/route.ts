import { NextResponse } from "next/server";
import { createAdminClient, createServerClient } from "@/lib/supabase";

export async function POST(request: Request) {
  const authHeader = request.headers.get("Authorization");
  const token = authHeader?.replace("Bearer ", "");
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userClient = createServerClient(token);
  const { data: { user }, error: authError } = await userClient.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = createAdminClient();

  await db.from("cart_items").delete().eq("user_id", user.id);
  await db.from("wishlist").delete().eq("user_id", user.id);
  await db.from("notifications").delete().eq("user_id", user.id);

  // If this account is a supplier, their products would otherwise stay listed
  // and purchasable forever with no one left to fulfill orders. Set stock to 0
  // so they can no longer be bought, instead of risky hard-deletes that could
  // break historical order_items referencing those products.
  const { data: supplier } = await db.from("suppliers").select("id").eq("user_id", user.id).maybeSingle();
  if (supplier) {
    await db.from("products").update({ stock: 0 }).eq("supplier_id", supplier.id);
    await db.from("suppliers").delete().eq("id", supplier.id);
  }

  await db.from("profiles").delete().eq("id", user.id);

  const { error } = await db.auth.admin.deleteUser(user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
