import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";

export async function GET() {
  const db = createAdminClient();
  const now = new Date();
  const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  // ── Active sales (discount + free shipping) ──
  const { data: onSale } = await db
    .from("products")
    .select("id, name, price, original_price, shipping_cost, sale_ends_at, image_url, stock, suppliers(name)")
    .not("original_price", "is", null)
    .gt("sale_ends_at", now.toISOString())
    .gt("stock", 0)
    .order("sale_ends_at", { ascending: true });

  const deals = (onSale ?? []).map((p: any) => ({
    ...p,
    discountPct: Math.round((1 - p.price / p.original_price) * 100),
    endingSoon: new Date(p.sale_ends_at) <= in24h,
  }));

  // ── Free shipping highlights (not already counted as a discount deal) ──
  const { data: freeShipping } = await db
    .from("products")
    .select("id, name, price, shipping_cost, image_url, stock, suppliers(name)")
    .eq("shipping_cost", 0)
    .gt("stock", 0)
    .is("original_price", null)
    .limit(6);

  // ── Bestsellers this week (platform-wide, by units sold) ──
  const { data: recentItems } = await db
    .from("order_items")
    .select("product_id, quantity, products(name, image_url), orders!inner(created_at, status)")
    .gte("orders.created_at", weekAgo.toISOString())
    .in("orders.status", ["paid", "preparing", "shipped", "delivered"]);

  const salesByProduct = new Map<string, { name: string; image_url: string | null; units: number }>();
  for (const item of (recentItems ?? []) as any[]) {
    if (!item.products) continue;
    const key = item.product_id;
    if (!salesByProduct.has(key)) salesByProduct.set(key, { name: item.products.name, image_url: item.products.image_url, units: 0 });
    salesByProduct.get(key)!.units += item.quantity;
  }
  const bestsellers = [...salesByProduct.entries()]
    .map(([id, v]) => ({ id, ...v }))
    .sort((a, b) => b.units - a.units)
    .slice(0, 5);

  return NextResponse.json({
    deals,
    freeShipping: freeShipping ?? [],
    bestsellers,
    endingSoon: deals.filter((d) => d.endingSoon),
  });
}
