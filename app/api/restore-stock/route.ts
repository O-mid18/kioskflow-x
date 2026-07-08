import { NextResponse } from "next/server";
import { createServerClient, createAdminClient } from "@/lib/supabase";

export async function POST(request: Request) {
  const authHeader = request.headers.get("Authorization");
  const token = authHeader?.replace("Bearer ", "");
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userClient = createServerClient(token);
  const { data: { user }, error: authError } = await userClient.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { orderId } = await request.json().catch(() => ({}));
  if (!orderId) return NextResponse.json({ error: "orderId required" }, { status: 400 });

  const db = createAdminClient();

  const { data: order } = await db.from("orders").select("id, status").eq("id", orderId).maybeSingle();
  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
  if (order.status !== "cancelled") return NextResponse.json({ error: "Order is not cancelled" }, { status: 400 });

  // Verify caller is a supplier who has items in this order
  const { data: callerSupplier } = await db.from("suppliers").select("id").eq("user_id", user.id).maybeSingle();
  if (!callerSupplier) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { data: supplierItems } = await db.from("order_items").select("id").eq("order_id", orderId).eq("supplier_id", callerSupplier.id).limit(1);
  if (!supplierItems || supplierItems.length === 0) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { data: orderItems } = await db.from("order_items").select("product_id, quantity").eq("order_id", orderId);
  if (!orderItems || orderItems.length === 0) return NextResponse.json({ ok: true });

  // Atomic increment via SQL: UPDATE products SET stock = stock + qty WHERE id = product_id
  // Supabase doesn't support expressions in .update(), so we use rpc or individual updates.
  // Each update is a single atomic statement at DB level — safe for concurrent reads.
  await Promise.all(orderItems.map(async (item: any) => {
    await db.rpc("increment_product_stock", { p_product_id: item.product_id, p_qty: item.quantity });
  }));

  return NextResponse.json({ ok: true });
}
