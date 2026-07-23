import { NextResponse } from "next/server";
import { createServerClient, createAdminClient } from "@/lib/supabase";

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
    try {
      const body = await request.json();
      shippingAddress = body?.shippingAddress ?? {};
    } catch { /* body might be empty */ }

    if (!shippingAddress.street || !shippingAddress.postalCode || !shippingAddress.city) {
      return NextResponse.json({ error: "Vollständige Lieferadresse erforderlich (Straße, PLZ, Stadt)." }, { status: 400 });
    }

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

    const cartSupplierIds = [...new Set((cartItems as any[]).map((i: any) => i.products?.supplier_id).filter(Boolean))];
    if (cartSupplierIds.length > 0) {
      const { data: ownSuppliers } = await supabase.from("suppliers").select("id").in("id", cartSupplierIds).eq("user_id", user.id);
      if (ownSuppliers && ownSuppliers.length > 0) {
        return NextResponse.json({ error: "Du kannst deine eigenen Produkte nicht kaufen. Bitte entferne sie aus dem Warenkorb." }, { status: 403 });
      }
    }

    const productTotalCents = (cartItems as any[]).reduce((sum: number, item: any) => {
      return sum + Math.round(item.products.price * 100) * item.quantity;
    }, 0);
    const productTotalEur = productTotalCents / 100;

    const db = createAdminClient();
    await db.from("profiles").upsert({ id: user.id, role: "buyer" }, { onConflict: "id", ignoreDuplicates: true });

    const supplierIds = [...new Set((cartItems as any[]).map((i: any) => i.products?.supplier_id).filter(Boolean))];
    const supplierId = supplierIds.length === 1 ? supplierIds[0] : null;

    // Uses the buyer's own client (not the admin client) so the "orders:
    // buyer insert" RLS policy stays the real safety net — it enforces
    // buyer_id = auth.uid() at the database level, not just in this code.
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        buyer_id: user.id,
        supplier_id: supplierId,
        total_price: productTotalEur,
        status: "awaiting_quote",
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
        shipping_quoted: false,
      }))
    );
    if (itemsError) {
      await supabase.from("orders").delete().eq("id", order.id);
      console.error("[checkout] order_items error:", itemsError.message, itemsError.code);
      return NextResponse.json({ error: "Bestellpositionen konnten nicht gespeichert werden. Bitte erneut versuchen." }, { status: 500 });
    }

    for (const sid of supplierIds) {
      const { data: supplierProfile } = await db
        .from("suppliers")
        .select("user_id")
        .eq("id", sid)
        .maybeSingle();
      if (supplierProfile?.user_id) {
        await db.from("notifications").insert({
          user_id: supplierProfile.user_id,
          type: "quote_needed",
          title: "📦 Neue Bestellung – Versandkosten festlegen",
          body: `Bestell-ID: #${order.id.slice(-6).toUpperCase()}`,
          link: "/supplier/dashboard/orders",
        });
      }
    }

    await supabase.from("cart_items").delete().eq("user_id", user.id);

    return NextResponse.json({ orderId: order.id });
  } catch (error: any) {
    const msg = error?.message ?? String(error);
    console.error("[checkout] unhandled error:", msg);
    return NextResponse.json({ error: msg, step: "unhandled" }, { status: 500 });
  }
}
