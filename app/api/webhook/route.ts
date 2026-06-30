import Stripe from "stripe";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(request: Request) {
  const body = await request.text();
  const sig = request.headers.get("stripe-signature");

  if (!sig) {
    return NextResponse.json({ error: "No stripe-signature header" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const db = createAdminClient();

    // Idempotency guard: Stripe can deliver the same webhook event more than
    // once (retries, network blips). Without this check, a duplicate delivery
    // would deduct product stock a second time for an order that was already paid.
    const { data: existingOrder } = await db
      .from("orders")
      .select("id, status, buyer_id, suppliers(user_id)")
      .eq("stripe_session_id", session.id)
      .single();

    if (!existingOrder) {
      console.error("Webhook: no order found for session", session.id);
      return NextResponse.json({ received: true });
    }

    if (existingOrder.status === "paid") {
      // Already processed on a prior delivery of this same event — skip.
      return NextResponse.json({ received: true, alreadyProcessed: true });
    }

    const { error } = await db
      .from("orders")
      .update({ status: "paid" })
      .eq("stripe_session_id", session.id);

    if (error) {
      console.error("Order status update error:", error);
      return NextResponse.json({ error: "DB update failed" }, { status: 500 });
    }

    const order = existingOrder;

    if (order) {
      // Deduct stock for each purchased product
      const { data: orderItems } = await db
        .from("order_items")
        .select("product_id, quantity")
        .eq("order_id", order.id);

      if (orderItems && orderItems.length > 0) {
        await Promise.all(orderItems.map(async (item: any) => {
          const { data: product } = await db
            .from("products")
            .select("stock")
            .eq("id", item.product_id)
            .single();
          if (product != null) {
            await db.from("products")
              .update({ stock: Math.max(0, (product.stock ?? 0) - item.quantity) })
              .eq("id", item.product_id);
          }
        }));
      }

      // Notify supplier of new paid order
      const supplierUserId = (order.suppliers as any)?.user_id;
      if (supplierUserId) {
        await db.from("notifications").insert({
          user_id: supplierUserId,
          type: "new_order",
          title: "Neue Bestellung eingegangen",
          body: `Bestellung #${(order.id as string).slice(-6).toUpperCase()} wurde bezahlt.`,
          link: "/supplier/dashboard/orders",
        }).then(({ error }) => {
          if (error) console.warn("Notification insert skipped:", error.message);
        });
      }
    }
  }

  return NextResponse.json({ received: true });
}
