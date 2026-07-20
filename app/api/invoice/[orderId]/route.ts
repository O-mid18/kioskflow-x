import { NextRequest, NextResponse } from "next/server";
import { createServerClient, createAdminClient } from "@/lib/supabase";
import PDFDocument from "pdfkit";

const PAID_STATUSES = ["paid", "preparing", "shipped", "delivered"];

function eur(n: number) {
  return `${n.toFixed(2).replace(".", ",")} €`;
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;

  const authHeader = request.headers.get("Authorization");
  const token = authHeader?.replace("Bearer ", "");
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createServerClient(token);
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = createAdminClient();

  const { data: order } = await db.from("orders").select("*").eq("id", orderId).maybeSingle();
  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
  if (!PAID_STATUSES.includes(order.status)) {
    return NextResponse.json({ error: "Für diese Bestellung liegt noch keine Rechnung vor (noch nicht bezahlt)." }, { status: 409 });
  }

  const { data: myProfile } = await db.from("profiles").select("role").eq("id", user.id).maybeSingle();
  const { data: mySupplier } = await db.from("suppliers").select("id").eq("user_id", user.id).maybeSingle();

  const { data: items } = await db
    .from("order_items")
    .select("quantity, price_at_purchase, shipping_cost_at_purchase, supplier_id, products(name), suppliers(name, legal_name, street, postal_code, city, country, tax_id, registration_nr)")
    .eq("order_id", orderId);

  if (!items || items.length === 0) return NextResponse.json({ error: "Keine Bestellpositionen gefunden." }, { status: 404 });

  const isBuyer = order.buyer_id === user.id;
  const isMySupplierItem = mySupplier && items.some((i: any) => i.supplier_id === mySupplier.id);
  const isAdmin = myProfile?.role === "admin";
  if (!isBuyer && !isMySupplierItem && !isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let invoiceNumber = order.invoice_number;
  if (!invoiceNumber) {
    const { data: seqRow } = await db.rpc("nextval_invoice_number");
    const seq = seqRow ?? Date.now();
    invoiceNumber = `FLW-${new Date(order.created_at).getFullYear()}-${String(seq).padStart(5, "0")}`;
    await db.from("orders").update({ invoice_number: invoiceNumber, invoice_issued_at: new Date().toISOString() }).eq("id", orderId);
  }

  const bySupplier = new Map<string, any[]>();
  for (const item of items as any[]) {
    const key = item.supplier_id ?? "unknown";
    if (!bySupplier.has(key)) bySupplier.set(key, []);
    bySupplier.get(key)!.push(item);
  }

  const chunks: Buffer[] = [];
  const doc = new PDFDocument({ size: "A4", margin: 50 });
  doc.on("data", (c) => chunks.push(c));

  const donePromise = new Promise<Buffer>((resolve) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
  });

  // ── Header ──
  doc.fontSize(20).fillColor("#2563EB").text("Flowio", 50, 50);
  doc.fontSize(9).fillColor("#666").text("B2B Marktplatz · Frankfurt am Main", 50, 74);

  doc.fontSize(18).fillColor("#111").text("RECHNUNG", 350, 50, { align: "right" });
  doc.fontSize(10).fillColor("#333")
    .text(`Rechnungsnummer: ${invoiceNumber}`, 350, 78, { align: "right" })
    .text(`Datum: ${new Date(order.invoice_issued_at ?? Date.now()).toLocaleDateString("de-DE")}`, 350, 92, { align: "right" })
    .text(`Bestellung: #${(order.id as string).slice(-8).toUpperCase()}`, 350, 106, { align: "right" });

  doc.moveTo(50, 130).lineTo(545, 130).strokeColor("#ddd").stroke();

  // ── Buyer address ──
  doc.fontSize(9).fillColor("#888").text("Rechnungsempfänger", 50, 145);
  doc.fontSize(11).fillColor("#111")
    .text(order.shipping_name ?? "–", 50, 160)
    .text(order.shipping_street ?? "", 50, 175)
    .text(`${order.shipping_postal_code ?? ""} ${order.shipping_city ?? ""}`, 50, 190)
    .text(order.shipping_country ?? "Deutschland", 50, 205);

  let y = 245;

  for (const [, supplierItems] of bySupplier) {
    const s = supplierItems[0]?.suppliers;
    doc.fontSize(10).fillColor("#2563EB").text(`Verkäufer: ${s?.legal_name ?? s?.name ?? "–"}`, 50, y);
    if (s?.street) doc.fontSize(9).fillColor("#666").text(`${s.street}, ${s.postal_code ?? ""} ${s.city ?? ""}, ${s.country ?? "Deutschland"}`, 50, y + 14);
    if (s?.tax_id) doc.text(`USt-IdNr.: ${s.tax_id}`, 50, y + 27);
    y += 46;

    // Table header
    doc.fontSize(9).fillColor("#888")
      .text("Artikel", 50, y)
      .text("Menge", 320, y, { width: 50, align: "right" })
      .text("Einzelpreis", 380, y, { width: 70, align: "right" })
      .text("Gesamt", 470, y, { width: 75, align: "right" });
    y += 14;
    doc.moveTo(50, y).lineTo(545, y).strokeColor("#eee").stroke();
    y += 8;

    let supplierSubtotal = 0;
    let supplierShipping = 0;
    for (const item of supplierItems) {
      const lineTotal = item.price_at_purchase * item.quantity;
      supplierSubtotal += lineTotal;
      doc.fontSize(10).fillColor("#111")
        .text(item.products?.name ?? "–", 50, y, { width: 260 })
        .text(String(item.quantity), 320, y, { width: 50, align: "right" })
        .text(eur(item.price_at_purchase), 380, y, { width: 70, align: "right" })
        .text(eur(lineTotal), 470, y, { width: 75, align: "right" });
      y += 18;
    }
    if (supplierItems.some((i: any) => (i.shipping_cost_at_purchase ?? 0) > 0)) {
      supplierShipping = supplierItems.reduce((s: number, i: any) => s + (i.shipping_cost_at_purchase ?? 0), 0);
      doc.fontSize(10).fillColor("#666")
        .text("Versandkosten", 50, y, { width: 260 })
        .text(eur(supplierShipping), 470, y, { width: 75, align: "right" });
      y += 18;
    }
    doc.moveTo(350, y).lineTo(545, y).strokeColor("#eee").stroke();
    y += 6;
    doc.fontSize(10).fillColor("#111").font("Helvetica-Bold")
      .text("Zwischensumme", 350, y, { width: 120 })
      .text(eur(supplierSubtotal + supplierShipping), 470, y, { width: 75, align: "right" });
    doc.font("Helvetica");
    y += 32;
  }

  // ── Grand total ──
  doc.moveTo(350, y).lineTo(545, y).strokeColor("#111").stroke();
  y += 8;
  doc.fontSize(13).fillColor("#111").font("Helvetica-Bold")
    .text("Gesamtbetrag", 350, y, { width: 120 })
    .text(eur(order.total_price ?? 0), 470, y, { width: 75, align: "right" });
  doc.font("Helvetica");

  y += 40;
  doc.fontSize(9).fillColor("#888")
    .text("Diese Rechnung wurde automatisch erstellt und ist auch ohne Unterschrift gültig.", 50, y)
    .text("Zahlungsstatus: Bezahlt.", 50, y + 13);

  doc.end();
  const pdfBuffer = await donePromise;

  return new NextResponse(pdfBuffer as any, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="Rechnung-${invoiceNumber}.pdf"`,
    },
  });
}
