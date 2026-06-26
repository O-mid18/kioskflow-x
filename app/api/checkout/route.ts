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
    const { data: cartItems, error: cartError } = await supabase
      .from("cart_items")
      .select("quantity, products(id, name, price, supplier_id)")
      .eq("user_id", user.id);

    if (cartError) {
      console.error("[checkout] cart error:", cartError.message);
      return NextResponse.json({ error: cartError.message }, { status: 500 });
    }

    if (!cartItems || cartItems.length === 0) {
      return NextResponse.json({ error: "Cart is empty" }, { status: 400 });
    }

    const totalCents = cartItems.reduce((sum: number, item: any) => {
      return sum + Math.round(item.products.price * 100) * item.quantity;
    }, 0);

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    let stripeSession;
    try {
      stripeSession = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: cartItems.map((item: any) => ({
          price_data: {
            currency: "eur",
            product_data: { name: item.products.name },
            unit_amount: Math.round(item.products.price * 100),
          },
          quantity: item.quantity,
        })),
        mode: "payment",
        success_url: `${baseUrl}/success`,
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

    const supplierId = (cartItems[0] as any).products?.supplier_id ?? null;
    const totalEur = totalCents / 100;

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        buyer_id: user.id,
        supplier_id: supplierId,
        total_price: totalEur,
        status: "pending",
        stripe_session_id: stripeSession.id,
      })
      .select("id")
      .single();

    if (orderError || !order) {
      console.error("[checkout] order error:", orderError?.message, orderError?.code);
      return NextResponse.json({ error: orderError?.message ?? "Order insert failed" }, { status: 500 });
    }

    const { error: itemsError } = await supabase.from("order_items").insert(
      (cartItems as any[]).map((item) => ({
        order_id: order.id,
        product_id: item.products.id,
        supplier_id: item.products.supplier_id ?? null,
        quantity: item.quantity,
        price_at_purchase: item.products.price,
      }))
    );
    if (itemsError) {
      console.error("[checkout] order_items error:", itemsError.message, itemsError.code);
    }

    return NextResponse.json({ url: stripeSession.url });
  } catch (error: any) {
    const msg = error?.message ?? String(error);
    console.error("[checkout] unhandled error:", msg);
    return NextResponse.json({ error: msg, step: "unhandled" }, { status: 500 });
  }
}
