"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { BudgetCard } from "@/components/ui/analytics-bento";

const BG = "var(--kf-bg)";
const SURFACE = "var(--kf-surface)";
const BORDER = "var(--kf-border)";
const TEXT = "var(--kf-text)";
const TEXT2 = "var(--kf-text2)";
const TEXT3 = "var(--kf-text3)";
const ORANGE = "#E8521A";

type Product = {
  id: string; name: string; price: number; stock: number;
  image_url?: string; category?: string; description?: string; created_at?: string;
};

type OrderStats = { total_orders: number; pending_orders: number; total_revenue: number; };

function stockBadge(stock: number) {
  if (stock === 0) return { label:"Ausverkauft", color:"#dc2626", bg:"#fef2f2" };
  if (stock <= 5) return { label:"Niedriger Bestand", color:"#ea580c", bg:"#fff7ed" };
  return { label:"Aktiv", color:"#16a34a", bg:"#f0fdf4" };
}

export default function SupplierDashboard() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [orderStats, setOrderStats] = useState<OrderStats>({ total_orders:0, pending_orders:0, total_revenue:0 });
  const [editingStock, setEditingStock] = useState<string|null>(null);
  const [newStock, setNewStock] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"name"|"price"|"stock">("name");

  const fetchAll = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { window.location.href = "/login"; return; }

      const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
      if (profile?.role !== "supplier") { window.location.href = "/signup/supplier"; return; }
      const { data: supplier } = await supabase.from("suppliers").select("*").eq("user_id", user.id).single();
      if (!supplier) return;
      const { data: productsData } = await supabase.from("products").select("*").eq("supplier_id", supplier.id).order("created_at", { ascending:false });
      setProducts(productsData || []);
      const { data: ordersData } = await supabase.from("order_items").select("quantity, price_at_purchase, orders(status)").eq("supplier_id", supplier.id);
      if (ordersData) {
        setOrderStats({
          total_orders: ordersData.length,
          pending_orders: ordersData.filter((o: any) => o.orders?.status === "pending").length,
          total_revenue: ordersData.reduce((sum: number, o: any) => sum + (o.price_at_purchase||0)*(o.quantity||1), 0),
        });
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  const deleteProduct = async (id: string) => {
    if (!confirm("Produkt wirklich löschen?")) return;
    await supabase.from("products").delete().eq("id", id);
    fetchAll();
  };

  const handleStockUpdate = async (id: string) => {
    await supabase.from("products").update({ stock: newStock }).eq("id", id);
    setEditingStock(null);
    fetchAll();
  };

  const filtered = products
    .filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => sortBy==="price" ? b.price-a.price : sortBy==="stock" ? a.stock-b.stock : a.name.localeCompare(b.name));

  const lowStock = products.filter(p => p.stock<=5 && p.stock>0);
  const outOfStock = products.filter(p => p.stock===0);

  if (loading) {
    return (
      <main style={{ minHeight:"100vh", background:BG, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'DM Sans',system-ui,sans-serif" }}>
        <style>{`@keyframes spin { to { transform:rotate(360deg); } }`}</style>
        <div style={{ textAlign:"center" }}>
          <div style={{ width:36, height:36, border:`3px solid ${BORDER}`, borderTopColor:ORANGE, borderRadius:"50%", animation:"spin 0.8s linear infinite", margin:"0 auto 14px" }} />
          <p style={{ color:TEXT3, fontSize:13 }}>Dashboard laden...</p>
        </div>
      </main>
    );
  }

  return (
    <main style={{ minHeight:"100vh", background:BG, fontFamily:"'DM Sans','Helvetica Neue',system-ui,sans-serif", color:TEXT }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500;600;700&display=swap'); @keyframes spin { to { transform:rotate(360deg); } } input:focus,select:focus{outline:none;}`}</style>

      {/* Header */}
      <header style={{ background:SURFACE, borderBottom:`1px solid ${BORDER}`, padding:"0 24px", height:64, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <div style={{ width:32, height:32, background:ORANGE, borderRadius:8, display:"flex", alignItems:"center", justifyContent:"center", fontWeight:900, fontSize:15, color:"#fff", fontFamily:"'Syne',sans-serif" }}>K</div>
          <span style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:15, color:TEXT, letterSpacing:"-0.3px" }}>KioskFlow</span>
          <span style={{ fontSize:12, color:TEXT3, marginLeft:4 }}>/ Lieferant</span>
        </div>
        <a href="/add-product" style={{ display:"inline-flex", alignItems:"center", gap:7, background:ORANGE, color:"#fff", fontWeight:700, padding:"10px 18px", borderRadius:10, textDecoration:"none", fontSize:13 }}>
          <span style={{ fontSize:16, lineHeight:1 }}>+</span> Produkt hinzufügen
        </a>
      </header>

      <div style={{ maxWidth:1100, margin:"0 auto", padding:"28px 24px" }}>

        {/* Page title */}
        <div style={{ marginBottom:28 }}>
          <p style={{ fontSize:11, fontWeight:700, color:TEXT3, letterSpacing:"2.5px", textTransform:"uppercase", marginBottom:8 }}>Lieferant-Dashboard</p>
          <h1 style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:28, color:TEXT, letterSpacing:"-0.8px" }}>Meine Produkte</h1>
        </div>

        {/* Stats + Chart bento grid */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 420px", gap:20, marginBottom:28, alignItems:"start" }}>
          {/* Left: stat cards */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
            {[
              { label:"Produkte", value:String(products.length), icon:"📦", highlight:false },
              { label:"Bestellungen", value:String(orderStats.total_orders), icon:"🧾", highlight:false },
              { label:"Ausstehend", value:String(orderStats.pending_orders), icon:"⏳", highlight:orderStats.pending_orders>0 },
              { label:"Umsatz", value:`€${orderStats.total_revenue.toFixed(2)}`, icon:"💶", highlight:false },
            ].map(stat => (
              <div key={stat.label} style={{ background:SURFACE, border:`1.5px solid ${stat.highlight?ORANGE:BORDER}`, borderRadius:14, padding:"18px 18px 16px" }}>
                <span style={{ fontSize:22, lineHeight:1, display:"block", marginBottom:10 }}>{stat.icon}</span>
                <p style={{ fontSize:11, fontWeight:600, color:TEXT3, letterSpacing:"1px", textTransform:"uppercase", marginBottom:4 }}>{stat.label}</p>
                <p style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:22, color:stat.highlight?ORANGE:TEXT, letterSpacing:"-0.5px" }}>{stat.value}</p>
              </div>
            ))}
          </div>

          {/* Right: analytics bento chart */}
          <BudgetCard />
        </div>

        {/* Stock alerts */}
        {(lowStock.length > 0 || outOfStock.length > 0) && (
          <div style={{ background:"#fff7ed", border:"1.5px solid #fb923c", borderRadius:14, padding:"16px 18px", marginBottom:24 }}>
            <p style={{ fontWeight:700, fontSize:12, color:"#ea580c", textTransform:"uppercase", letterSpacing:"1px", marginBottom:10 }}>⚠️ Bestandswarnung</p>
            <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
              {outOfStock.map(p => <span key={p.id} style={{ background:"#fef2f2", color:"#dc2626", fontSize:12, fontWeight:700, padding:"4px 10px", borderRadius:100 }}>{p.name} — Ausverkauft</span>)}
              {lowStock.map(p => <span key={p.id} style={{ background:"#fff7ed", color:"#ea580c", fontSize:12, fontWeight:700, padding:"4px 10px", borderRadius:100, border:"1px solid #fed7aa" }}>{p.name} — Nur {p.stock} übrig</span>)}
            </div>
          </div>
        )}

        {/* Search + sort */}
        <div style={{ display:"flex", gap:10, marginBottom:20 }}>
          <div style={{ position:"relative", flex:1 }}>
            <svg style={{ position:"absolute", left:12, top:"50%", transform:"translateY(-50%)" }} width={14} height={14} fill="none" stroke={TEXT3} strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            <input type="text" placeholder="Produkte suchen..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              style={{ width:"100%", background:SURFACE, border:`1.5px solid ${BORDER}`, borderRadius:10, padding:"10px 14px 10px 34px", color:TEXT, fontSize:13, boxSizing:"border-box", transition:"border-color 0.2s" }}
              onFocus={e => e.currentTarget.style.borderColor=ORANGE}
              onBlur={e => e.currentTarget.style.borderColor=BORDER} />
          </div>
          <select value={sortBy} onChange={e => setSortBy(e.target.value as any)}
            style={{ background:SURFACE, border:`1.5px solid ${BORDER}`, borderRadius:10, padding:"10px 14px", color:TEXT, fontSize:13, cursor:"pointer", minWidth:180 }}>
            <option value="name">Name A–Z</option>
            <option value="price">Preis (hoch→niedrig)</option>
            <option value="stock">Bestand (niedrig→hoch)</option>
          </select>
        </div>

        {/* Products */}
        {filtered.length === 0 ? (
          <div style={{ textAlign:"center", padding:"80px 0" }}>
            <p style={{ fontSize:48, marginBottom:16 }}>📦</p>
            <p style={{ color:TEXT2, fontSize:15 }}>Keine Produkte gefunden.</p>
            <a href="/add-product" style={{ display:"inline-block", marginTop:20, background:ORANGE, color:"#fff", fontWeight:700, padding:"12px 24px", borderRadius:10, textDecoration:"none", fontSize:14 }}>Erstes Produkt hinzufügen</a>
          </div>
        ) : (
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))", gap:14 }}>
            {filtered.map(product => {
              const badge = stockBadge(product.stock);
              const isEditing = editingStock === product.id;
              return (
                <div key={product.id} style={{ background:SURFACE, border:`1px solid ${BORDER}`, borderRadius:16, overflow:"hidden", transition:"box-shadow 0.2s" }}
                  onMouseEnter={e => e.currentTarget.style.boxShadow="0 6px 24px rgba(0,0,0,0.08)"}
                  onMouseLeave={e => e.currentTarget.style.boxShadow="none"}>
                  <div style={{ position:"relative", height:180 }}>
                    <img src={product.image_url || "https://images.unsplash.com/photo-1543253687-c931c8e01820?q=80&w=1200&auto=format&fit=crop"} alt={product.name} style={{ width:"100%", height:"100%", objectFit:"cover" }} />
                    <span style={{ position:"absolute", top:10, right:10, background:badge.bg, color:badge.color, fontSize:11, fontWeight:700, padding:"4px 10px", borderRadius:100 }}>{badge.label}</span>
                    {product.category && <span style={{ position:"absolute", top:10, left:10, background:"rgba(255,255,255,0.85)", color:TEXT, fontSize:10, fontWeight:600, padding:"3px 9px", borderRadius:100 }}>{product.category}</span>}
                  </div>
                  <div style={{ padding:"14px 16px 16px" }}>
                    <h2 style={{ fontFamily:"'Syne',sans-serif", color:TEXT, fontSize:16, fontWeight:700, marginBottom:4, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{product.name}</h2>
                    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14 }}>
                      <span style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:20, color:TEXT }}>€{product.price}</span>
                      {isEditing ? (
                        <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                          <input type="number" value={newStock} onChange={e => setNewStock(Number(e.target.value))}
                            style={{ width:60, background:BG, border:`1.5px solid ${ORANGE}`, color:TEXT, borderRadius:7, padding:"5px 8px", fontSize:12, textAlign:"center" }} />
                          <button onClick={() => handleStockUpdate(product.id)} style={{ background:ORANGE, color:"#fff", border:"none", borderRadius:7, padding:"6px 10px", fontWeight:700, fontSize:11, cursor:"pointer" }}>OK</button>
                          <button onClick={() => setEditingStock(null)} style={{ background:"none", border:"none", color:TEXT3, cursor:"pointer", fontSize:12 }}>✕</button>
                        </div>
                      ) : (
                        <button onClick={() => { setEditingStock(product.id); setNewStock(product.stock); }}
                          style={{ background:badge.bg, color:badge.color, border:`1px solid ${badge.color}20`, borderRadius:100, padding:"4px 12px", fontSize:12, fontWeight:600, cursor:"pointer" }}>
                          Bestand: {product.stock}
                        </button>
                      )}
                    </div>
                    <div style={{ display:"flex", gap:8 }}>
                      <a href={`/edit-product/${product.id}`} style={{ flex:1, background:ORANGE, color:"#fff", textAlign:"center", fontSize:13, fontWeight:700, padding:"9px", borderRadius:9, textDecoration:"none" }}>Bearbeiten</a>
                      <button onClick={() => deleteProduct(product.id)} style={{ flex:1, background:BG, border:`1px solid ${BORDER}`, color:TEXT2, fontSize:13, fontWeight:600, padding:"9px", borderRadius:9, cursor:"pointer" }}>Löschen</button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
