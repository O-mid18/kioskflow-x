import Stripe from "stripe";
import { NextResponse } from "next/server";
import { createServerClient, createAdminClient } from "@/lib/supabase";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(request: Request) {
  const authHeader = request.headers.get("Authorization");
  const token = authHeader?.replace("Bearer ", "");

  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServerClient(token);
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    let shippingAddress: Record<string, string> = {};
    const discountPct = 0;
    try {
      const body = await request.json();
      shippingAddress = body?.shippingAddress ?? {};
    } catch { /* body might be empty */ }

    const { data: cartItems, error: cartError } = await supabase
      .from("cart_items")
      .select("quantity, products(id, name, price, supplier_id, stock, shipping_cost)")
      .eq("user_id", user.id);

    if (cartError) {
      console.error("[checkout] cart error:", cartError.message);
      return NextResponse.json({ error: cartError.message }, { status: 500 });
    }

    if (!cartItems || cartItems.length === 0) {
      return NextResponse.json({ error: "Cart is empty" }, { status: 400 });
    }

    // Validate stock server-side — the UI disables out-of-stock buttons, but
    // that's bypassable, and stock can also change between page load and
    // checkout. Reject the whole checkout if any item exceeds available stock.
    const insufficient = (cartItems as any[]).filter(
      (item) => (item.products?.stock ?? 0) < item.quantity
    );
    if (insufficient.length > 0) {
      const names = insufficient.map((i: any) => i.products?.name ?? "?").join(", ");
      return NextResponse.json(
        { error: `Nicht genug Lagerbestand für: ${names}. Bitte Menge im Warenkorb anpassen.` },
        { status: 409 }
      );
    }

    // Shipping cost is charged once per distinct product line, not per unit —
    // ordering 1 or 10 units of the same product only adds the fee once.
    const totalCents = Math.round(
      cartItems.reduce((sum: number, item: any) => {
        const lineTotal = Math.round(item.products.price * 100) * item.quantity;
        const shipping = Math.round((item.products.shipping_cost ?? 0) * 100);
        return sum + lineTotal + shipping;
      }, 0) * (1 - discountPct)
    );

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://kioskflow-x.vercel.app";

    let stripeSession;
    try {
      stripeSession = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: [
          ...cartItems.map((item: any) => ({
            price_data: {
              currency: "eur",
              product_data: { name: item.products.name },
              unit_amount: Math.round(item.products.price * 100 * (1 - discountPct)),
            },
            quantity: item.quantity,
          })),
          ...(cartItems as any[])
            .filter((item) => (item.products.shipping_cost ?? 0) > 0)
            .map((item) => ({
              price_data: {
                currency: "eur",
                product_data: { name: `Versand: ${item.products.name}` },
                unit_amount: Math.round(item.products.shipping_cost * 100 * (1 - discountPct)),
              },
              quantity: 1,
            })),
        ],
        mode: "payment",
        success_url: `${baseUrl}/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${baseUrl}/cart`,
        metadata: { buyer_id: user.id },
      });
    } catch (stripeErr: any) {
      console.error("[checkout] stripe error:", stripeErr?.message);
      return NextResponse.json({ error: "Stripe: " + stripeErr?.message }, { status: 500 });
    }

    // Ensure profile exists — trigger may not have run for older accounts
    const db = createAdminClient();
    await db.from("profiles").upsert({ id: user.id, role: "buyer" }, { onConflict: "id", ignoreDuplicates: true });

    const supplierIds = [...new Set((cartItems as any[]).map((i: any) => i.products?.supplier_id).filter(Boolean))];
    const supplierId = supplierIds.length === 1 ? supplierIds[0] : null;
    const totalEur = totalCents / 100;

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        buyer_id: user.id,
        supplier_id: supplierId,
        total_price: totalEur,
        status: "pending",
        stripe_session_id: stripeSession.id,
        shipping_name: shippingAddress.firstName && shippingAddress.lastName ? `${shippingAddress.firstName} ${shippingAddress.lastName}`.trim() : null,
        shipping_email: shippingAddress.email || null,
        shipping_street: shippingAddress.street || null,
        shipping_postal_code: shippingAddress.postalCode || null,
        shipping_city: shippingAddress.city || null,
        shipping_country: shippingAddress.country || "Deutschland",
      })
      .select("id")
      .single();

    if (orderError || !order) {
      try { await stripe.checkout.sessions.expire(stripeSession.id); } catch {}
      console.error("[checkout] order error:", orderError?.message, orderError?.code);
      return NextResponse.json({ error: "Bestellung konnte nicht erstellt werden. Bitte erneut versuchen." }, { status: 500 });
    }

    const { error: itemsError } = await supabase.from("order_items").insert(
      (cartItems as any[]).map((item) => ({
        order_id: order.id,
        product_id: item.products.id,
        supplier_id: item.products.supplier_id ?? null,
        quantity: item.quantity,
        price_at_purchase: item.products.price,
        shipping_cost_at_purchase: item.products.shipping_cost ?? 0,
      }))
    );
    if (itemsError) {
      try { await stripe.checkout.sessions.expire(stripeSession.id); } catch {}
      await supabase.from("orders").delete().eq("id", order.id);
      console.error("[checkout] order_items error:", itemsError.message, itemsError.code);
      return NextResponse.json({ error: "Bestellpositionen konnten nicht gespeichert werden. Bitte erneut versuchen." }, { status: 500 });
    }

    return NextResponse.json({ url: stripeSession.url });
  } catch (error: any) {
    const msg = error?.message ?? String(error);
    console.error("[checkout] unhandled error:", msg);
    return NextResponse.json({ error: msg, step: "unhandled" }, { status: 500 });
  }
}
