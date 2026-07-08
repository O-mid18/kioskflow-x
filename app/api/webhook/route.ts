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

    const { data: existingOrder, error: orderLookupErr } = await db
      .from("orders")
      .select("id, status, buyer_id, suppliers(user_id)")
      .eq("stripe_session_id", session.id)
      .maybeSingle();

    if (orderLookupErr) {
      console.error("Webhook: DB error looking up order", orderLookupErr.message);
      return NextResponse.json({ error: "DB error" }, { status: 500 });
    }

    if (!existingOrder) {
      console.error("Webhook: no order found for session", session.id);
      return NextResponse.json({ received: true });
    }

    if (existingOrder.status === "paid") {
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
      const { data: orderItems } = await db
        .from("order_items")
        .select("product_id, quantity, supplier_id, price_at_purchase")
        .eq("order_id", order.id);

      if (orderItems && orderItems.length > 0) {
        await Promise.all(orderItems.map(async (item: any) => {
          const { data: product } = await db
            .from("products")
            .select("stock")
            .eq("id", item.product_id)
            .maybeSingle();
          if (product != null) {
            await db.from("products")
              .update({ stock: Math.max(0, (product.stock ?? 0) - item.quantity) })
              .eq("id", item.product_id);
          }
        }));
      }

      const distinctSupplierIds = Array.from(
        new Set((orderItems ?? []).map((i: any) => i.supplier_id).filter(Boolean))
      );

      if (distinctSupplierIds.length > 0) {
        const { data: supplierRows } = await db
          .from("suppliers")
          .select("id, user_id, stripe_account_id, stripe_onboarded")
          .in("id", distinctSupplierIds);

        const PLATFORM_FEE_PERCENT = 0.05;

        await Promise.all((supplierRows ?? []).map(async (s: any) => {
          // Auto-transfer 95% to supplier if they have Stripe Connect set up
          if (s.stripe_account_id && s.stripe_onboarded) {
            const supplierItems = (orderItems ?? []).filter((i: any) => i.supplier_id === s.id);
            const supplierTotal = supplierItems.reduce(
              (sum: number, i: any) => sum + Math.round((i.price_at_purchase ?? 0) * 100) * i.quantity,
              0
            );
            const transferAmount = Math.floor(supplierTotal * (1 - PLATFORM_FEE_PERCENT));
            if (transferAmount > 0) {
              try {
                await stripe.transfers.create({
                  amount: transferAmount,
                  currency: "eur",
                  destination: s.stripe_account_id,
                  transfer_group: order.id,
                  metadata: { order_id: order.id, supplier_id: s.id },
                });
              } catch (transferErr: any) {
                console.error("[webhook] transfer failed:", s.id, transferErr?.message);
              }
            }
          }

          if (!s.user_id) return;
          await db.from("notifications").insert({
            user_id: s.user_id,
            type: "new_order",
            title: "Neue Bestellung eingegangen",
            body: `Bestellung #${(order.id as string).slice(-6).toUpperCase()} wurde bezahlt.`,
            link: "/supplier/dashboard/orders",
          }).then(({ error }) => {
            if (error) console.warn("Notification insert skipped:", error.message);
          });
        }));
      } else {
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
  }

  return NextResponse.json({ received: true });
}
