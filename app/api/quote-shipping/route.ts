import { NextResponse } from "next/server";
import { createServerClient, createAdminClient } from "@/lib/supabase";
import { checkRateLimit } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const authHeader = request.headers.get("Authorization");
  const token = authHeader?.replace("Bearer ", "");
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createServerClient(token);
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rateLimit = await checkRateLimit(user.id, "quote-shipping", 30, 300);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Zu viele Anfragen. Bitte versuche es später erneut." },
      { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } }
    );
  }

  try {
    const { orderId, shippingCost } = await request.json();
    if (!orderId || shippingCost === undefined) {
      return NextResponse.json({ error: "orderId und shippingCost erforderlich" }, { status: 400 });
    }

    const costNum = parseFloat(shippingCost);
    if (isNaN(costNum) || costNum < 0) {
      return NextResponse.json({ error: "Ungültiger Versandpreis" }, { status: 400 });
    }

    const { data: supplier } = await supabase.from("suppliers").select("id").eq("user_id", user.id).maybeSingle();
    if (!supplier) return NextResponse.json({ error: "Kein Lieferant gefunden" }, { status: 403 });

    const { data: myItems } = await supabase
      .from("order_items")
      .select("id")
      .eq("order_id", orderId)
      .eq("supplier_id", supplier.id)
      .eq("shipping_quoted", false);

    if (!myItems || myItems.length === 0) {
      return NextResponse.json({ error: "Keine offenen Positionen für diesen Lieferanten" }, { status: 400 });
    }

    const costPerItem = costNum / myItems.length;

    await supabase
      .from("order_items")
      .update({ shipping_cost_at_purchase: costPerItem, shipping_quoted: true })
      .eq("order_id", orderId)
      .eq("supplier_id", supplier.id);

    const { data: allItems } = await supabase
      .from("order_items")
      .select("shipping_quoted, quantity, price_at_purchase, shipping_cost_at_purchase")
      .eq("order_id", orderId);

    const fullyQuoted = (allItems as any[])?.every(i => i.shipping_quoted) ?? false;

    if (fullyQuoted) {
      const newTotal = (allItems as any[]).reduce((sum, i) =>
        sum + i.price_at_purchase * i.quantity + (i.shipping_cost_at_purchase ?? 0), 0);

      const { data: orderData } = await supabase
        .from("orders")
        .update({ status: "awaiting_payment", total_price: newTotal })
        .eq("id", orderId)
        .select("buyer_id")
        .single();

      if (orderData?.buyer_id) {
        const db = createAdminClient();
        await db.from("notifications").insert({
          user_id: orderData.buyer_id,
          type: "payment_ready",
          title: "💳 Versandkosten bestätigt – Jetzt bezahlen",
          body: `Bestell-ID: #${orderId.slice(-6).toUpperCase()}`,
          link: "/orders",
          order_id: orderId,
        });
      }
    }

    return NextResponse.json({ ok: true, fullyQuoted });
  } catch (error: any) {
    console.error("[quote-shipping] error:", error?.message);
    return NextResponse.json({ error: error?.message ?? String(error) }, { status: 500 });
  }
}
