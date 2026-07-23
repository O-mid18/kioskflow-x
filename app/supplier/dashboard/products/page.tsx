"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

const BG = "var(--kf-bg)";
const SURFACE = "var(--kf-surface)";
const BORDER = "var(--kf-border)";
const TEXT = "var(--kf-text)";
const TEXT2 = "var(--kf-text2)";
const TEXT3 = "var(--kf-text3)";
const ORANGE = "#003ec7";
const ACCENT = "var(--kf-accent)";
const BTN    = "var(--kf-btn)";

type Product = {
  id: string; name: string; price: number; stock: number;
  image_url?: string | null; category?: string | null; description?: string | null;
};

type SalesData = {
  units: number; orders: number; revenue: number; paidRevenue: number;
};

function stockBadge(stock: number, dark = false) {
  if (dark) {
    if (stock === 0)  return { label: "Ausverkauft",       color: "#f87171", bg: "rgba(239,68,68,0.15)" };
    if (stock <= 5)   return { label: "Niedriger Bestand", color: "#fb923c", bg: "rgba(249,115,22,0.15)" };
    return               { label: "Aktiv",                color: "#4ade80", bg: "rgba(22,163,74,0.15)" };
  }
  if (stock === 0)  return { label: "Ausverkauft",       color: "#dc2626", bg: "#fef2f2" };
  if (stock <= 5)   return { label: "Niedriger Bestand", color: "#ea580c", bg: "#fff7ed" };
  return               { label: "Aktiv",                color: "#16a34a", bg: "#f0fdf4" };
}

export default function SupplierProductsPage() {
  const [products, setProducts]     = useState<Product[]>([]);
  const [sales, setSales]           = useState<Record<string, SalesData>>({});
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState("");
  const [sortBy, setSortBy]         = useState<"name" | "price" | "stock" | "sales">("sales");
  const [editingStock, setEditingStock] = useState<string | null>(null);
  const [newStock, setNewStock]     = useState(0);
  const [deleting, setDeleting]     = useState<string | null>(null);
  const [isDark, setIsDark]         = useState(false);

  useEffect(() => { fetchAll(); }, []);

  useEffect(() => {
    const check = () => setIsDark(document.documentElement.classList.contains("dark"));
    check();
    const obs = new MutationObserver(check);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { window.location.href = "/login"; return; }

    const { data: supplier } = await supabase.from("suppliers").select("id").eq("user_id", user.id).maybeSingle();
    if (!supplier) { setLoading(false); return; }

    // Products
    const { data: prods } = await supabase
      .from("products").select("id, name, price, stock, image_url, category, description")
      .eq("supplier_id", supplier.id).order("created_at", { ascending: false });
    const productList = (prods as Product[]) ?? [];
    setProducts(productList);

    if (productList.length === 0) { setLoading(false); return; }

    // Sales per product via order_items
    const productIds = productList.map(p => p.id);
    const { data: orderItems } = await supabase
      .from("order_items")
      .select("product_id, quantity, price_at_purchase, orders(status)")
      .in("product_id", productIds);

    const salesMap: Record<string, SalesData> = {};
    for (const p of productList) salesMap[p.id] = { units: 0, orders: 0, revenue: 0, paidRevenue: 0 };

    for (const item of (orderItems as any[]) ?? []) {
      const pid = item.product_id;
      if (!salesMap[pid]) continue;
      salesMap[pid].orders += 1;
      salesMap[pid].units  += item.quantity;
      salesMap[pid].revenue += item.price_at_purchase * item.quantity;
      if (["paid", "shipped", "delivered"].includes(item.orders?.status)) {
        salesMap[pid].paidRevenue += item.price_at_purchase * item.quantity;
      }
    }
    setSales(salesMap);
    setLoading(false);
  };

  const updateStock = async (id: string) => {
    await supabase.from("products").update({ stock: newStock }).eq("id", id);
    setEditingStock(null);
    fetchAll();
  };

  const deleteProduct = async (id: string) => {
    if (!confirm("Produkt wirklich löschen?")) return;
    setDeleting(id);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setDeleting(null); return; }
    const { data: sup } = await supabase.from("suppliers").select("id").eq("user_id", user.id).maybeSingle();
    if (!sup) { setDeleting(null); return; }
    await supabase.from("products").delete().eq("id", id).eq("supplier_id", sup.id);
    setDeleting(null);
    fetchAll();
  };

  const filtered = products
    .filter(p => p.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === "price") return b.price - a.price;
      if (sortBy === "stock") return a.stock - b.stock;
      if (sortBy === "sales") return (sales[b.id]?.revenue ?? 0) - (sales[a.id]?.revenue ?? 0);
      return a.name.localeCompare(b.name);
    });

  const totalRevenue = Object.values(sales).reduce((s, v) => s + v.paidRevenue, 0);
  const totalUnits   = Object.values(sales).reduce((s, v) => s + v.units, 0);
  const lowStock     = products.filter(p => p.stock <= 5 && p.stock > 0).length;
  const outOfStock   = products.filter(p => p.stock === 0).length;

  const accentColor = isDark ? ACCENT : ORANGE;
  const btnColor    = isDark ? BTN    : ORANGE;

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh" }}>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <div style={{ width: 36, height: 36, border: `3px solid ${BORDER}`, borderTopColor: accentColor, borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      </div>
    );
  }

  return (
    <div style={{ padding: "32px 32px 60px", fontFamily: "'Inter','Helvetica Neue',system-ui,sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Manrope:wght@600;700;800&family=Inter:wght@400;500;600;700&display=swap'); @keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 28 }}>
        <div>
          <p style={{ fontSize: 11, fontWeight: 700, color: TEXT3, letterSpacing: "2.5px", textTransform: "uppercase", marginBottom: 8 }}>Lieferant-Dashboard</p>
          <h1 style={{ fontFamily: "'Manrope',sans-serif", fontWeight: 800, fontSize: 26, color: TEXT, letterSpacing: "-0.8px" }}>Meine Produkte</h1>
          <p style={{ fontSize: 13, color: TEXT2, marginTop: 4 }}>{products.length} Produkte · {totalUnits} Einheiten verkauft</p>
        </div>
        <a href="/add-product" style={{ display: "inline-flex", alignItems: "center", gap: 7, background: btnColor, color: "#fff", fontWeight: 700, padding: "11px 20px", borderRadius: 11, textDecoration: "none", fontSize: 14, flexShrink: 0 }}>
          + Produkt hinzufügen
        </a>
      </div>

      {/* KPI row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 24 }}>
        {[
          { icon: "📦", label: "Produkte gesamt",     value: String(products.length),       sub: `${outOfStock} ausverkauft` },
          { icon: "💶", label: "Gesamtumsatz",         value: `€${totalRevenue.toFixed(0)}`, sub: "Bezahlte Bestellungen" },
          { icon: "🔢", label: "Verkaufte Einheiten",  value: String(totalUnits),            sub: "Alle Produkte" },
          { icon: "⚠️", label: "Niedriger Bestand",   value: String(lowStock),              sub: "Produkte < 5 Stk.", warn: lowStock > 0 },
        ].map((s: any) => (
          <div key={s.label} style={{ background: SURFACE, border: `1.5px solid ${s.warn ? accentColor : BORDER}`, borderRadius: isDark ? 8 : 14, padding: "18px" }}>
            <span style={{ fontSize: 22 }}>{s.icon}</span>
            <p style={{ fontFamily: "'Manrope',sans-serif", fontWeight: 800, fontSize: 22, color: s.warn ? accentColor : TEXT, margin: "10px 0 2px", letterSpacing: "-0.5px" }}>{s.value}</p>
            <p style={{ fontSize: 12, fontWeight: 600, color: TEXT2 }}>{s.label}</p>
            <p style={{ fontSize: 11, color: TEXT3, marginTop: 2 }}>{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Search + sort */}
      <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
        <div style={{ position: "relative", flex: 1 }}>
          <svg style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }} width={14} height={14} fill="none" stroke={TEXT3} strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          <input type="text" placeholder="Produkt suchen..." value={search} onChange={e => setSearch(e.target.value)}
            style={{ width: "100%", background: SURFACE, border: `1.5px solid ${BORDER}`, borderRadius: 10, padding: "10px 14px 10px 34px", color: TEXT, fontSize: 13, boxSizing: "border-box", outline: "none" }}
            onFocus={e => e.currentTarget.style.borderColor = accentColor}
            onBlur={e => e.currentTarget.style.borderColor = BORDER} />
        </div>
        <select value={sortBy} onChange={e => setSortBy(e.target.value as typeof sortBy)}
          style={{ background: SURFACE, border: `1.5px solid ${BORDER}`, borderRadius: 10, padding: "10px 14px", color: TEXT, fontSize: 13, cursor: "pointer", outline: "none" }}>
          <option value="sales">Nach Umsatz</option>
          <option value="name">Name A–Z</option>
          <option value="price">Preis (hoch→niedrig)</option>
          <option value="stock">Bestand (niedrig→hoch)</option>
        </select>
      </div>

      {/* Products table */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "80px 0" }}>
          <p style={{ fontSize: 48, marginBottom: 16 }}>📦</p>
          <p style={{ color: TEXT2, fontSize: 15 }}>Keine Produkte gefunden.</p>
          <a href="/add-product" style={{ display: "inline-block", marginTop: 20, background: btnColor, color: "#fff", fontWeight: 700, padding: "12px 24px", borderRadius: 10, textDecoration: "none", fontSize: 14 }}>
            Erstes Produkt hinzufügen
          </a>
        </div>
      ) : (
        <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: isDark ? 8 : 18, overflow: "hidden" }}>
          {/* Table head */}
          <div style={{ display: "grid", gridTemplateColumns: "2fr 100px 120px 120px 120px 160px", gap: 0, background: BG, borderBottom: `1px solid ${BORDER}`, padding: "10px 20px" }}>
            {["Produkt", "Preis", "Bestand", "Verkauft", "Umsatz", "Aktionen"].map(h => (
              <p key={h} style={{ fontSize: 11, fontWeight: 700, color: TEXT3, textTransform: "uppercase", letterSpacing: "0.8px" }}>{h}</p>
            ))}
          </div>

          {/* Rows */}
          {filtered.map((product, i) => {
            const badge   = stockBadge(product.stock, isDark);
            const s       = sales[product.id] ?? { units: 0, orders: 0, revenue: 0, paidRevenue: 0 };
            const editing = editingStock === product.id;
            const isDel   = deleting === product.id;

            return (
              <div key={product.id}
                style={{ display: "grid", gridTemplateColumns: "2fr 100px 120px 120px 120px 160px", gap: 0, padding: "14px 20px", borderBottom: i < filtered.length - 1 ? `1px solid ${BORDER}` : "none", alignItems: "center", transition: "background 0.15s" }}
                onMouseEnter={e => e.currentTarget.style.background = BG}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}>

                {/* Product info */}
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 10, overflow: "hidden", flexShrink: 0, background: BG }}>
                    <img loading="lazy" decoding="async" src={product.image_url || "https://images.unsplash.com/photo-1568702846914-96b305d2aaeb?w=100&q=60"} alt={product.name}
                      style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontSize: 14, fontWeight: 700, color: TEXT, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{product.name}</p>
                    {product.category && <p style={{ fontSize: 11, color: TEXT3, marginTop: 2 }}>{product.category}</p>}
                  </div>
                </div>

                {/* Price */}
                <p style={{ fontFamily: "'Manrope',sans-serif", fontWeight: 800, fontSize: 15, color: TEXT }}>€{product.price.toFixed(2)}</p>

                {/* Stock — inline edit */}
                <div>
                  {editing ? (
                    <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                      <input type="number" value={newStock} onChange={e => setNewStock(Number(e.target.value))}
                        style={{ width: 52, background: BG, border: `1.5px solid ${accentColor}`, color: TEXT, borderRadius: 7, padding: "4px 6px", fontSize: 12, textAlign: "center", outline: "none" }} />
                      <button onClick={() => updateStock(product.id)}
                        style={{ background: btnColor, color: "#fff", border: "none", borderRadius: 7, padding: "5px 8px", fontWeight: 700, fontSize: 11, cursor: "pointer" }}>✓</button>
                      <button onClick={() => setEditingStock(null)}
                        style={{ background: "none", border: "none", color: TEXT3, cursor: "pointer", fontSize: 13 }}>✕</button>
                    </div>
                  ) : (
                    <button onClick={() => { setEditingStock(product.id); setNewStock(product.stock); }}
                      style={{ background: badge.bg, color: badge.color, border: "none", borderRadius: 100, padding: "4px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                      {product.stock} Stk.
                    </button>
                  )}
                </div>

                {/* Units sold */}
                <div>
                  <p style={{ fontSize: 14, fontWeight: 700, color: TEXT }}>{s.units}</p>
                  <p style={{ fontSize: 11, color: TEXT3 }}>{s.orders} Bestellungen</p>
                </div>

                {/* Revenue */}
                <div>
                  <p style={{ fontSize: 14, fontWeight: 700, color: s.paidRevenue > 0 ? accentColor : TEXT }}>€{s.paidRevenue.toFixed(0)}</p>
                  {s.revenue !== s.paidRevenue && <p style={{ fontSize: 11, color: TEXT3 }}>€{s.revenue.toFixed(0)} gesamt</p>}
                </div>

                {/* Actions */}
                <div style={{ display: "flex", gap: 7 }}>
                  <a href={`/edit-product/${product.id}`}
                    style={{ flex: 1, background: btnColor, color: "#fff", textAlign: "center", fontSize: 12, fontWeight: 700, padding: "8px 10px", borderRadius: 8, textDecoration: "none" }}>
                    Bearbeiten
                  </a>
                  <button onClick={() => deleteProduct(product.id)} disabled={isDel}
                    style={{ flex: 1, background: BG, border: `1px solid ${BORDER}`, color: isDel ? TEXT3 : TEXT2, fontSize: 12, fontWeight: 600, padding: "8px 10px", borderRadius: 8, cursor: isDel ? "not-allowed" : "pointer" }}>
                    {isDel ? "..." : "Löschen"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
