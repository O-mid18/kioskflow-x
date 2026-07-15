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

    // Atomically claim this event for processing: only the request that
    // actually flips status from non-paid to paid proceeds. Two overlapping
    // webhook deliveries for the same event (Stripe retries, or a slow
    // serverless cold start) previously could both pass the check above
    // before either had written "paid", letting both run stock decrement +
    // supplier payout — i.e. double-charging stock or double-paying a
    // supplier for one real sale.
    const { data: claimed, error } = await db
      .from("orders")
      .update({ status: "paid" })
      .eq("stripe_session_id", session.id)
      .neq("status", "paid")
      .select("id")
      .maybeSingle();

    if (error) {
      console.error("Order status update error:", error);
      return NextResponse.json({ error: "DB update failed" }, { status: 500 });
    }

    if (!claimed) {
      // Another concurrent delivery already claimed and is processing (or
      // just processed) this same event — don't double up.
      return NextResponse.json({ received: true, alreadyProcessed: true });
    }

    const order = existingOrder;

    if (order) {
      const { data: orderItems } = await db
        .from("order_items")
        .select("product_id, quantity, supplier_id, price_at_purchase")
        .eq("order_id", order.id);

      if (orderItems && orderItems.length > 0) {
        // Conflict-aware stock decrement: returns true if decremented, false if insufficient stock
        const decrementResults = await Promise.all(orderItems.map(async (item: any) => {
          const { data } = await db.rpc("decrement_product_stock", {
            p_product_id: item.product_id,
            p_qty: item.quantity,
          });
          return { item, success: data === true };
        }));

        const conflicts = decrementResults.filter(r => !r.success);
        if (conflicts.length === 0) {
          await db.from("orders").update({ stock_decremented: true }).eq("id", order.id);
        }
        if (conflicts.length > 0) {
          // Roll back successful decrements
          await Promise.all(
            decrementResults
              .filter(r => r.success)
              .map(r => db.rpc("increment_product_stock", { p_product_id: r.item.product_id, p_qty: r.item.quantity }))
          );
          // Cancel the order and issue Stripe refund
          await db.from("orders").update({ status: "cancelled" }).eq("id", order.id);
          try {
            const paymentIntent = session.payment_intent as string;
            if (paymentIntent) {
              await stripe.refunds.create({ payment_intent: paymentIntent });
            }
          } catch (refundErr: any) {
            console.error("[webhook] refund failed:", refundErr?.message);
          }
          // Notify buyer
          if (order.buyer_id) {
            await db.from("notifications").insert({
              user_id: order.buyer_id,
              type: "order_cancelled",
              title: "Bestellung storniert — Rückerstattung eingeleitet",
              body: `Bestellung #${(order.id as string).slice(-6).toUpperCase()} wurde wegen Lagerengpass storniert. Du erhältst eine vollständige Rückerstattung.`,
              link: "/orders",
            }).then(({ error }) => { if (error) console.warn("Buyer notification skipped:", error.message); });
          }
          return NextResponse.json({ received: true, stockConflict: true });
        }
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

        // Fetch the ACTUAL Stripe processing fee for this charge (varies by
        // card type — standard vs premium, EU vs foreign, currency conversion,
        // etc). Previously the 95/5 split was computed on the gross amount with
        // no accounting for Stripe's own cut, which came out of the platform's
        // balance before any transfer — silently eating into the platform's
        // commission (e.g. a nominal 5% could shrink to ~3% after Stripe's fee).
        // Now Stripe's fee is deducted from the SUPPLIER's share instead, so the
        // platform's 5% is protected regardless of which card/fee tier was used.
        let stripeFeeCents = 0;
        try {
          if (session.payment_intent) {
            const paymentIntent = await stripe.paymentIntents.retrieve(session.payment_intent as string, {
              expand: ["latest_charge.balance_transaction"],
            });
            const charge = paymentIntent.latest_charge as Stripe.Charge | null;
            const balanceTxn = charge?.balance_transaction as Stripe.BalanceTransaction | null;
            stripeFeeCents = balanceTxn?.fee ?? 0;
          }
        } catch (feeErr: any) {
          console.error("[webhook] could not fetch actual Stripe fee, falling back to 0:", feeErr?.message);
        }

        const grossOrderTotalCents = (orderItems ?? []).reduce(
          (sum: number, i: any) => sum + Math.round((i.price_at_purchase ?? 0) * 100) * i.quantity,
          0
        );

        await Promise.all((supplierRows ?? []).map(async (s: any) => {
          // Auto-transfer to supplier if they have Stripe Connect set up
          if (s.stripe_account_id && s.stripe_onboarded) {
            const supplierItems = (orderItems ?? []).filter((i: any) => i.supplier_id === s.id);
            const supplierGrossCents = supplierItems.reduce(
              (sum: number, i: any) => sum + Math.round((i.price_at_purchase ?? 0) * 100) * i.quantity,
              0
            );
            const platformCommissionCents = Math.round(supplierGrossCents * PLATFORM_FEE_PERCENT);
            const supplierShareOfStripeFee = grossOrderTotalCents > 0
              ? Math.round(stripeFeeCents * (supplierGrossCents / grossOrderTotalCents))
              : 0;
            const transferAmount = supplierGrossCents - platformCommissionCents - supplierShareOfStripeFee;
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
