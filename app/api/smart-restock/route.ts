import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";

const PAID_STATUSES = ["paid", "preparing", "shipped", "delivered"];

export async function GET(request: Request) {
  const authHeader = request.headers.get("Authorization");
  const token = authHeader?.replace("Bearer ", "");
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createServerClient(token);
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: orders } = await supabase
    .from("orders")
    .select("id, created_at, status, order_items(product_id, quantity, products(id, name, price, image_url, stock, shipping_cost))")
    .eq("buyer_id", user.id)
    .in("status", PAID_STATUSES)
    .order("created_at", { ascending: true });

  if (!orders || orders.length === 0) {
    return NextResponse.json({ recommendations: [] });
  }

  const timelines = new Map<string, { product: any; dates: Date[]; totalQty: number }>();
  for (const order of orders as any[]) {
    for (const item of order.order_items ?? []) {
      if (!item.products) continue;
      const key = item.product_id;
      if (!timelines.has(key)) timelines.set(key, { product: item.products, dates: [], totalQty: 0 });
      const entry = timelines.get(key)!;
      entry.dates.push(new Date(order.created_at));
      entry.totalQty += item.quantity;
    }
  }

  const now = Date.now();
  const recommendations: any[] = [];

  for (const [, entry] of timelines) {
    if (entry.dates.length < 2) continue;
    if ((entry.product.stock ?? 0) <= 0) continue;

    const sorted = entry.dates.sort((a, b) => a.getTime() - b.getTime());
    const gaps: number[] = [];
    for (let i = 1; i < sorted.length; i++) {
      gaps.push((sorted[i].getTime() - sorted[i - 1].getTime()) / 86_400_000);
    }
    const avgIntervalDays = gaps.reduce((s, g) => s + g, 0) / gaps.length;
    const lastOrderDate = sorted[sorted.length - 1];
    const daysSinceLastOrder = (now - lastOrderDate.getTime()) / 86_400_000;
    const avgQty = Math.max(1, Math.round(entry.totalQty / sorted.length));

    if (avgIntervalDays > 0 && daysSinceLastOrder >= avgIntervalDays * 0.8) {
      recommendations.push({
        product: entry.product,
        avgIntervalDays: Math.round(avgIntervalDays),
        daysSinceLastOrder: Math.round(daysSinceLastOrder),
        suggestedQuantity: avgQty,
        overdue: daysSinceLastOrder > avgIntervalDays,
        orderCount: sorted.length,
      });
    }
  }

  recommendations.sort((a, b) => (b.daysSinceLastOrder - b.avgIntervalDays) - (a.daysSinceLastOrder - a.avgIntervalDays));

  return NextResponse.json({ recommendations: recommendations.slice(0, 8) });
}
