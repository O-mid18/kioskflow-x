import Stripe from "stripe";
import { NextResponse } from "next/server";
import { createServerClient, createAdminClient } from "@/lib/supabase";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(request: Request) {
  const authHeader = request.headers.get("Authorization");
  const token = authHeader?.replace("Bearer ", "");
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createServerClient(token);
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { orderId } = await request.json();
    if (!orderId) return NextResponse.json({ error: "orderId fehlt" }, { status: 400 });

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("id, status, total_price, buyer_id")
      .eq("id", orderId)
      .eq("buyer_id", user.id)
      .single();

    if (orderError || !order) return NextResponse.json({ error: "Bestellung nicht gefunden" }, { status: 404 });
    if (order.status !== "awaiting_payment") return NextResponse.json({ error: "Bestellung ist nicht zahlungsbereit" }, { status: 400 });

    const { data: items } = await supabase
      .from("order_items")
      .select("id, quantity, price_at_purchase, shipping_cost_at_purchase, products(name)")
      .eq("order_id", orderId);

    if (!items || items.length === 0) return NextResponse.json({ error: "Keine Artikel" }, { status: 400 });

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://kioskflow-x.vercel.app";

    const lineItems = [
      ...(items as any[]).map(item => ({
        price_data: {
          currency: "eur",
          product_data: { name: item.products?.name ?? "Produkt" },
          unit_amount: Math.round(item.price_at_purchase * 100),
        },
        quantity: item.quantity,
      })),
      ...(items as any[])
        .filter(item => (item.shipping_cost_at_purchase ?? 0) > 0)
        .map(item => ({
          price_data: {
            currency: "eur",
            product_data: { name: `Versand: ${item.products?.name ?? "Produkt"}` },
            unit_amount: Math.round(item.shipping_cost_at_purchase * 100),
          },
          quantity: 1,
        })),
    ];

    const stripeSession = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: lineItems,
      mode: "payment",
      success_url: `${baseUrl}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/orders`,
      metadata: { buyer_id: user.id, order_id: orderId },
    });

    const db = createAdminClient();
    const { error: updateErr } = await db
      .from("orders")
      .update({ status: "pending", stripe_session_id: stripeSession.id })
      .eq("id", orderId);

    if (updateErr) {
      console.error("[pay-order] order update error:", updateErr.message);
      return NextResponse.json({ error: "Bestellung konnte nicht aktualisiert werden. Bitte erneut versuchen." }, { status: 500 });
    }

    return NextResponse.json({ url: stripeSession.url });
  } catch (error: any) {
    console.error("[pay-order] error:", error?.message);
    return NextResponse.json({ error: error?.message ?? String(error) }, { status: 500 });
  }
}
