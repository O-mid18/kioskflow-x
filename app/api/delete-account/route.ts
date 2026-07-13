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
  const uid = user.id;

  // 1. Buyer-owned orders
  const { data: userOrders } = await db.from("orders").select("id").eq("buyer_id", uid);
  const orderIds = (userOrders ?? []).map((o: any) => o.id);

  // 2. User-owned data
  await db.from("cart_items").delete().eq("user_id", uid);
  await db.from("wishlist").delete().eq("user_id", uid);
  await db.from("notifications").delete().eq("user_id", uid);
  await db.from("reviews").delete().eq("user_id", uid);

  // Support chat
  const { data: convs } = await db.from("support_conversations").select("id").eq("user_id", uid);
  const convIds = (convs ?? []).map((c: any) => c.id);
  if (convIds.length > 0) {
    await db.from("support_messages").delete().in("conversation_id", convIds);
    await db.from("support_conversations").delete().in("id", convIds);
  }
  await db.from("support_messages").delete().eq("sender_id", uid);

  // Direct buyer-supplier chat
  const { data: directConvs } = await db
    .from("conversations")
    .select("id")
    .or(`buyer_id.eq.${uid},supplier_id.eq.${uid}`);
  const directConvIds = (directConvs ?? []).map((c: any) => c.id);
  if (directConvIds.length > 0) {
    await db.from("messages").delete().in("conversation_id", directConvIds);
    await db.from("conversations").delete().in("id", directConvIds);
  }
  await db.from("messages").delete().eq("sender_id", uid);

  // Orders & order items
  if (orderIds.length > 0) {
    await db.from("order_items").delete().in("order_id", orderIds);
  }
  await db.from("orders").delete().eq("buyer_id", uid);

  // If supplier: zero out stock + clean up their products
  const { data: supplier } = await db.from("suppliers").select("id").eq("user_id", uid).maybeSingle();
  if (supplier) {
    const { data: supProducts } = await db.from("products").select("id").eq("supplier_id", supplier.id);
    const supProductIds = (supProducts ?? []).map((p: any) => p.id);
    if (supProductIds.length > 0) {
      await db.from("reviews").delete().in("product_id", supProductIds);
      await db.from("wishlist").delete().in("product_id", supProductIds);
      await db.from("cart_items").delete().in("product_id", supProductIds);
    }
    await db.from("order_items").delete().eq("supplier_id", supplier.id);
    await db.from("orders").update({ supplier_id: null }).eq("supplier_id", supplier.id);
    await db.from("products").delete().eq("supplier_id", supplier.id);
    await db.from("suppliers").delete().eq("id", supplier.id);
  }

  await db.from("profiles").delete().eq("id", uid);

  const { error } = await db.auth.admin.deleteUser(uid);
  if (error) return NextResponse.json({ error: "Account konnte nicht gelöscht werden." }, { status: 500 });

  return NextResponse.json({ ok: true });
}
