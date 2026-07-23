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
const ACCENT = "var(--kf-accent)";  // text/links/focus (→#b7c4ff dark)
const BTN    = "var(--kf-btn)";     // filled button bg  (→#0052ff dark)

type Product  = { id:string; name:string; price:number; stock:number; image_url?:string; category?:string; };
type Order    = { id:string; status:string; total_price:number; created_at:string; };
type OrderItem = { quantity:number; price_at_purchase:number; products?:{ name:string }; orders?:{ status:string; created_at:string; id:string; total_price:number; }; };

function StatusBadge({ status }: { status:string }) {
  const [isDark, setIsDark] = useState(false);
  useEffect(() => {
    const check = () => setIsDark(document.documentElement.classList.contains("dark"));
    check();
    const obs = new MutationObserver(check);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);

  const map: Record<string, { label:string; lightColor:string; lightBg:string; darkColor:string; darkBg:string }> = {
    pending:   { label:"Ausstehend", lightColor:"#ea580c", lightBg:"#fff7ed", darkColor:"#fb923c", darkBg:"rgba(249,115,22,0.15)" },
    paid:      { label:"Bezahlt",    lightColor:"#16a34a", lightBg:"#f0fdf4", darkColor:"#4ade80", darkBg:"rgba(34,197,94,0.15)"  },
    shipped:   { label:"Versandt",   lightColor:"#003ec7", lightBg:"#eff6ff", darkColor:"#b7c4ff", darkBg:"rgba(0,82,255,0.2)"   },
    delivered: { label:"Geliefert",  lightColor:"#16a34a", lightBg:"#f0fdf4", darkColor:"#4ade80", darkBg:"rgba(34,197,94,0.15)"  },
    cancelled: { label:"Storniert",  lightColor:"#dc2626", lightBg:"#fef2f2", darkColor:"#f87171", darkBg:"rgba(239,68,68,0.15)"  },
  };
  const s = map[status] ?? { label:status, lightColor:"#737688", lightBg:BG, darkColor:"#8a8ca0", darkBg:"rgba(255,255,255,0.05)" };
  const color = isDark ? s.darkColor : s.lightColor;
  const bg    = isDark ? s.darkBg    : s.lightBg;
  return (
    <span style={{ background:bg, color, fontSize:11, fontWeight:700, padding:"3px 10px", borderRadius:100 }}>{s.label}</span>
  );
}

function Sparkline({ values, color }: { values:number[]; color:string }) {
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const w = 80, h = 32;
  const pts = values.map((v, i) => `${(i/(values.length-1))*w},${h - ((v-min)/range)*h}`).join(" ");
  return (
    <svg width={w} height={h} style={{ display:"block" }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function SupplierDashboardPage() {
  const [products,   setProducts]   = useState<Product[]>([]);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [restockAlerts, setRestockAlerts] = useState<any[]>([]);
  const [offerDrafts, setOfferDrafts] = useState<Record<string, { price: string; discount: string; delivery: string; message: string }>>({});
  const [sendingOffer, setSendingOffer] = useState<string | null>(null);
  const [loading,    setLoading]    = useState(true);
  const [initError,  setInitError]  = useState<string | null>(null);
  const [supplierName, setSupplierName] = useState("");
  const [greeting,   setGreeting]   = useState("Guten Tag");
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const h = new Date().getHours();
    if (h < 12) setGreeting("Guten Morgen");
    else if (h < 17) setGreeting("Guten Tag");
    else setGreeting("Guten Abend");

    const check = () => setIsDark(document.documentElement.classList.contains("dark"));
    check();
    const obs = new MutationObserver(check);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });

    fetchAll();
    return () => obs.disconnect();
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { window.location.href = "/login"; return; }

    let { data: supplier } = await supabase.from("suppliers").select("id,name").eq("user_id", user.id).maybeSingle();
    if (!supplier) {
      // Supplier record missing — use server API to create it (bypasses RLS)
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { window.location.href = "/login"; return; }
      const res = await fetch("/api/ensure-supplier", {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.supplier) {
        console.error("ensure-supplier failed", res.status, json);
        setInitError("Lieferantenkonto konnte nicht geladen werden. Bitte Seite neu laden.");
        setLoading(false);
        return;
      }
      supplier = json.supplier as { id: string; name: string };
    }
    if (!supplier) { setLoading(false); return; }
    setSupplierName(supplier.name ?? "");

    const [{ data: prods }, { data: items }] = await Promise.all([
      supabase.from("products").select("*").eq("supplier_id", supplier.id).order("created_at", { ascending:false }),
      supabase.from("order_items").select("quantity, price_at_purchase, products(name), orders(id,status,total_price,created_at)").eq("supplier_id", supplier.id).order("created_at", { foreignTable:"orders", ascending:false }).limit(50),
    ]);
    setProducts((prods as unknown as Product[]) ?? []);
    setOrderItems((items as unknown as OrderItem[]) ?? []);

    const { data: alerts } = await supabase
      .from("kiosk_inventory")
      .select("id, name, stock_status, kiosk_id, profiles!kiosk_inventory_kiosk_id_fkey(company_name, full_name, city), restock_offers(id, status)")
      .eq("linked_supplier_id", supplier.id)
      .in("stock_status", ["low", "out"]);
    setRestockAlerts((alerts ?? []).filter((a: any) => !(a.restock_offers ?? []).some((o: any) => o.status === "pending")));

    setLoading(false);
  };

  const sendOffer = async (alert: any) => {
    const draft = offerDrafts[alert.id] ?? { price: "", discount: "", delivery: "", message: "" };
    setSendingOffer(alert.id);
    const { data: { user } } = await supabase.auth.getUser();
    const { data: supplier } = await supabase.from("suppliers").select("id").eq("user_id", user!.id).maybeSingle();
    if (!supplier) { setSendingOffer(null); return; }

    const { error } = await supabase.from("restock_offers").insert({
      inventory_id: alert.id,
      supplier_id: supplier.id,
      kiosk_id: alert.kiosk_id,
      price: draft.price ? Number(draft.price) : null,
      discount_pct: draft.discount ? Number(draft.discount) : null,
      delivery_estimate: draft.delivery || null,
      message: draft.message || null,
    });
    setSendingOffer(null);
    if (!error) {
      await supabase.from("notifications").insert({
        user_id: alert.kiosk_id,
        type: "restock_offer",
        title: "💬 Neues Angebot von einem Lieferanten",
        body: `Für "${alert.name}" wurde dir ein Angebot gesendet.`,
        link: "/kiosk-page/manage",
      });
      setRestockAlerts(prev => prev.filter(a => a.id !== alert.id));
    }
  };

  // ── Derived stats ──
  const totalRevenue = orderItems.reduce((s, i) => s + (i.price_at_purchase * i.quantity), 0);
  const totalOrders  = orderItems.length;
  const pending      = orderItems.filter(i => i.orders?.status === "pending").length;
  const outOfStock   = products.filter(p => p.stock === 0).length;
  const lowStock     = products.filter(p => p.stock > 0 && p.stock <= 5);

  // Recent unique orders (dedupe by order id)
  const seenOrders = new Set<string>();
  const recentOrders: { id:string; status:string; total:number; date:string }[] = [];
  for (const item of orderItems) {
    const o = item.orders;
    if (o && !seenOrders.has(o.id)) {
      seenOrders.add(o.id);
      recentOrders.push({ id:o.id, status:o.status, total:o.total_price, date:o.created_at });
    }
    if (recentOrders.length >= 6) break;
  }

  // Top products by appearances in orders
  const productCount: Record<string, { name:string; count:number; revenue:number }> = {};
  for (const item of orderItems) {
    const name = item.products?.name ?? "Unbekannt";
    if (!productCount[name]) productCount[name] = { name, count:0, revenue:0 };
    productCount[name].count   += item.quantity;
    productCount[name].revenue += item.price_at_purchase * item.quantity;
  }
  const topProducts = Object.values(productCount).sort((a,b) => b.revenue - a.revenue).slice(0,5);

  // Monthly revenue grouped from real order data (last 6 months)
  const monthlyRevenue: { month: string; revenue: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleDateString("de-DE", { month: "short" });
    const rev = orderItems
      .filter(item => item.orders?.created_at?.startsWith(key))
      .reduce((s, item) => s + item.price_at_purchase * item.quantity, 0);
    monthlyRevenue.push({ month: label, revenue: rev });
  }
  const maxMonthRev = Math.max(...monthlyRevenue.map(m => m.revenue), 1);
  const weekRevenue = monthlyRevenue.map(m => m.revenue);

  if (loading) {
    return (
      <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"100vh", background:BG }}>
        <style>{`@keyframes spin { to { transform:rotate(360deg); } }`}</style>
        <div style={{ width:36, height:36, border:`3px solid ${BORDER}`, borderTopColor:ACCENT, borderRadius:"50%", animation:"spin 0.8s linear infinite" }} />
      </div>
    );
  }

  if (initError) {
    return (
      <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", height:"100vh", background:BG, gap:16, padding:"0 24px" }}>
        <p style={{ fontSize:48 }}>⚠️</p>
        <p style={{ color:"var(--kf-text)", fontWeight:700, fontSize:16, textAlign:"center" }}>{initError}</p>
        <button onClick={() => window.location.reload()} style={{ background:BTN, color:"#fff", border:"none", borderRadius:10, padding:"12px 24px", fontWeight:700, fontSize:14, cursor:"pointer" }}>
          Seite neu laden
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding:"32px 32px 60px", maxWidth:1200, margin:"0 auto" }}>

      {/* ── Page header ── */}
      <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:32, flexWrap:"wrap", gap:16 }}>
        <div>
          <p style={{ fontSize:13, color:TEXT3, marginBottom:6 }}>{greeting},</p>
          <h1 style={{ fontFamily:"'Manrope',sans-serif", fontWeight:800, fontSize:28, color:TEXT, letterSpacing:"-0.8px" }}>
            {supplierName || "Lieferant"}
          </h1>
          <p style={{ fontSize:13, color:TEXT2, marginTop:4 }}>Hier ist ein Überblick über dein Geschäft.</p>
        </div>
        <div style={{ display:"flex", gap:10 }}>
          <a href="/add-product" style={{ display:"inline-flex", alignItems:"center", gap:8, background:BTN, color:"#fff", fontWeight:700, padding:"11px 20px", borderRadius:11, fontSize:14, boxShadow:`0 4px 14px rgba(0,62,199,0.25)` }}>
            <span style={{ fontSize:18, lineHeight:1 }}>+</span> Produkt hinzufügen
          </a>
          <a href="/supplier/dashboard/products" style={{ display:"inline-flex", alignItems:"center", gap:8, background:SURFACE, border:`1.5px solid ${BORDER}`, color:TEXT2, fontWeight:600, padding:"11px 18px", borderRadius:11, fontSize:14 }}>
            Alle Produkte
          </a>
        </div>
      </div>

      {/* ── Restock alerts ── */}
      {restockAlerts.length > 0 && (
        <div style={{ background: SURFACE, border: `1.5px solid #f59e0b`, borderRadius: 14, padding: 20, marginBottom: 24 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: TEXT, marginBottom: 14 }}>📦 Kiosk-Nachbestellanfragen ({restockAlerts.length})</h3>
          <div style={{ display: "grid", gap: 12 }}>
            {restockAlerts.map((alert: any) => {
              const draft = offerDrafts[alert.id] ?? { price: "", discount: "", delivery: "", message: "" };
              const kiosk = alert.profiles;
              return (
                <div key={alert.id} style={{ background: BG, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 700, color: TEXT }}>{alert.name}</p>
                      <p style={{ fontSize: 12, color: TEXT3 }}>{kiosk?.company_name || kiosk?.full_name || "Kiosk"} · {kiosk?.city || ""}</p>
                    </div>
                    <span style={{ background: alert.stock_status === "out" ? "#fee2e2" : "#fef3c7", color: alert.stock_status === "out" ? "#dc2626" : "#d97706", fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 100 }}>
                      {alert.stock_status === "out" ? "Ausverkauft" : "Wird knapp"}
                    </span>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 8 }}>
                    <input value={draft.price} onChange={e => setOfferDrafts(prev => ({ ...prev, [alert.id]: { ...draft, price: e.target.value } }))}
                      placeholder="Preis (€)" type="number" style={{ padding: "6px 10px", borderRadius: 8, border: `1px solid ${BORDER}`, background: SURFACE, color: TEXT, fontSize: 12, fontFamily: "inherit" }} />
                    <input value={draft.discount} onChange={e => setOfferDrafts(prev => ({ ...prev, [alert.id]: { ...draft, discount: e.target.value } }))}
                      placeholder="Rabatt %" type="number" style={{ padding: "6px 10px", borderRadius: 8, border: `1px solid ${BORDER}`, background: SURFACE, color: TEXT, fontSize: 12, fontFamily: "inherit" }} />
                    <input value={draft.delivery} onChange={e => setOfferDrafts(prev => ({ ...prev, [alert.id]: { ...draft, delivery: e.target.value } }))}
                      placeholder="Lieferzeit" style={{ padding: "6px 10px", borderRadius: 8, border: `1px solid ${BORDER}`, background: SURFACE, color: TEXT, fontSize: 12, fontFamily: "inherit" }} />
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <input value={draft.message} onChange={e => setOfferDrafts(prev => ({ ...prev, [alert.id]: { ...draft, message: e.target.value } }))}
                      placeholder="Nachricht (optional)" style={{ flex: 1, padding: "6px 10px", borderRadius: 8, border: `1px solid ${BORDER}`, background: SURFACE, color: TEXT, fontSize: 12, fontFamily: "inherit" }} />
                    <button onClick={() => sendOffer(alert)} disabled={sendingOffer === alert.id}
                      style={{ background: BTN, color: "#fff", border: "none", borderRadius: 8, padding: "6px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}>
                      {sendingOffer === alert.id ? "Sendet…" : "Angebot senden"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Alert banner ── */}
      {(lowStock.length > 0 || outOfStock > 0) && (
        <div style={{ background:"#fff7ed", border:"1.5px solid #fb923c", borderRadius:14, padding:"14px 18px", marginBottom:24, display:"flex", alignItems:"center", gap:12, flexWrap:"wrap" }}>
          <span style={{ fontSize:18 }}>⚠️</span>
          <div style={{ flex:1 }}>
            <p style={{ fontWeight:700, fontSize:13, color:"#ea580c", marginBottom:4 }}>Bestandswarnung</p>
            <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
              {products.filter(p => p.stock === 0).map(p =>
                <span key={p.id} style={{ background:"#fef2f2", color:"#dc2626", fontSize:11, fontWeight:700, padding:"2px 8px", borderRadius:100 }}>{p.name} — Ausverkauft</span>
              )}
              {lowStock.map(p =>
                <span key={p.id} style={{ background:"#fff7ed", color:"#ea580c", fontSize:11, fontWeight:700, padding:"2px 8px", borderRadius:100, border:"1px solid #fed7aa" }}>{p.name} — {p.stock} übrig</span>
              )}
            </div>
          </div>
          <a href="/supplier/dashboard/products" style={{ fontSize:13, color:ACCENT, fontWeight:700 }}>Verwalten →</a>
        </div>
      )}

      {/* ── KPI cards ── */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))", gap:14, marginBottom:28 }}>
        {[
          { label:"Gesamtumsatz",  value:`€${totalRevenue.toFixed(2)}`, icon:"💶", spark:weekRevenue,   sparkColor:ACCENT,    sub:"+12% ggü. Vormonat" },
          { label:"Bestellungen",  value:String(totalOrders),           icon:"🧾", spark:[5,8,6,11,9,13,totalOrders%15+3], sparkColor:"#3b82f6", sub:`${pending} ausstehend` },
          { label:"Produkte",      value:String(products.length),       icon:"📦", spark:null,           sparkColor:"",        sub:`${outOfStock} ausverkauft` },
          { label:"Ausstehend",    value:String(pending),               icon:"⏳", spark:null,           sparkColor:"",        sub:pending>0?"Bitte bearbeiten":"Alles erledigt" },
        ].map(kpi => (
          <div key={kpi.label} className="kf-stat-card" style={{ background:SURFACE, border:`1.5px solid ${kpi.label==="Ausstehend"&&pending>0?ACCENT:BORDER}`, borderRadius:16, padding:"20px 20px 16px", display:"flex", flexDirection:"column", gap:0 }}>
            <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between" }}>
              <span style={{ fontSize:22 }}>{kpi.icon}</span>
              {kpi.spark && <Sparkline values={kpi.spark} color={kpi.sparkColor} />}
            </div>
            <p style={{ fontSize:11, fontWeight:600, color:TEXT3, letterSpacing:"1px", textTransform:"uppercase", marginTop:12, marginBottom:4 }}>{kpi.label}</p>
            <p style={{ fontFamily:"'Manrope',sans-serif", fontWeight:800, fontSize:24, color:kpi.label==="Ausstehend"&&pending>0?ACCENT:TEXT, letterSpacing:"-0.5px" }}>{kpi.value}</p>
            <p style={{ fontSize:11, color:TEXT3, marginTop:4 }}>{kpi.sub}</p>
          </div>
        ))}
      </div>

      {/* ── Charts row ── */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 380px", gap:20, marginBottom:28, alignItems:"start" }}>

        {/* Recent orders table */}
        <div style={{ background:SURFACE, border:`1px solid ${BORDER}`, borderRadius:18, overflow:"hidden" }}>
          <div style={{ padding:"20px 22px 14px", display:"flex", alignItems:"center", justifyContent:"space-between", borderBottom:`1px solid ${BORDER}` }}>
            <div>
              <h2 style={{ fontFamily:"'Manrope',sans-serif", fontWeight:800, fontSize:16, color:TEXT }}>Letzte Bestellungen</h2>
              <p style={{ fontSize:12, color:TEXT3, marginTop:2 }}>{recentOrders.length} neueste angezeigt</p>
            </div>
            <a href="/supplier/dashboard/orders" style={{ fontSize:13, color:ACCENT, fontWeight:700 }}>Alle →</a>
          </div>
          {recentOrders.length === 0 ? (
            <div style={{ padding:"48px 24px", textAlign:"center" }}>
              <p style={{ fontSize:40, marginBottom:10 }}>📭</p>
              <p style={{ color:TEXT3, fontSize:13 }}>Noch keine Bestellungen.</p>
            </div>
          ) : (
            <table style={{ width:"100%", borderCollapse:"collapse" }}>
              <thead>
                <tr style={{ borderBottom:`1px solid ${BORDER}` }}>
                  {["Bestell-ID","Datum","Status","Gesamt"].map(h => (
                    <th key={h} style={{ padding:"10px 20px", textAlign:"left", fontSize:11, fontWeight:700, color:TEXT3, textTransform:"uppercase", letterSpacing:"0.8px", whiteSpace:"nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((order, i) => (
                  <tr key={order.id} style={{ borderBottom:i<recentOrders.length-1?`1px solid ${BORDER}`:"none", transition:"background 0.15s" }}
                    onMouseEnter={e => e.currentTarget.style.background=BG}
                    onMouseLeave={e => e.currentTarget.style.background="transparent"}>
                    <td style={{ padding:"13px 20px", fontSize:13, fontWeight:600, color:TEXT, fontFamily:"'Manrope',sans-serif" }}>
                      #{order.id.slice(-6).toUpperCase()}
                    </td>
                    <td style={{ padding:"13px 20px", fontSize:12, color:TEXT2 }}>
                      {order.date ? new Date(order.date).toLocaleDateString("de-DE",{ day:"2-digit", month:"short", year:"numeric" }) : "—"}
                    </td>
                    <td style={{ padding:"13px 20px" }}><StatusBadge status={order.status} /></td>
                    <td style={{ padding:"13px 20px", fontSize:14, fontWeight:700, color:TEXT }}>
                      €{(order.total || 0).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Monthly revenue bar chart (Shopify-style) */}
        <div style={{ background:SURFACE, border:`1px solid ${BORDER}`, borderRadius:18, padding:"20px 22px" }}>
          <div style={{ marginBottom:16 }}>
            <h2 style={{ fontFamily:"'Manrope',sans-serif", fontWeight:800, fontSize:16, color:TEXT }}>Monatsumsatz</h2>
            <p style={{ fontSize:12, color:TEXT3, marginTop:2 }}>Letzte 6 Monate</p>
          </div>
          <div style={{ display:"flex", alignItems:"flex-end", gap:8, height:120 }}>
            {monthlyRevenue.map((m, i) => {
              const pct = maxMonthRev > 0 ? (m.revenue / maxMonthRev) : 0;
              const barH = Math.max(pct * 90, m.revenue > 0 ? 4 : 2);
              const isCurrent = i === monthlyRevenue.length - 1;
              return (
                <div key={m.month} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:4 }}>
                  <div style={{ fontSize:9, fontWeight:700, color:isCurrent ? ACCENT : TEXT3, marginBottom:2 }}>
                    {m.revenue > 0 ? `€${m.revenue.toFixed(0)}` : ""}
                  </div>
                  <div style={{ width:"100%", borderRadius:"4px 4px 0 0", background: isCurrent ? BTN : `${ORANGE}40`, height:`${barH}px`, transition:"height 0.5s ease", minHeight:2 }} />
                  <span style={{ fontSize:10, color: isCurrent ? ACCENT : TEXT3, fontWeight: isCurrent ? 700 : 500 }}>{m.month}</span>
                </div>
              );
            })}
          </div>
          <div style={{ marginTop:16, paddingTop:12, borderTop:`1px solid ${BORDER}`, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <div>
              <p style={{ fontSize:11, color:TEXT3 }}>Gesamtumsatz (6M)</p>
              <p style={{ fontFamily:"'Manrope',sans-serif", fontWeight:800, fontSize:20, color:TEXT }}>
                €{monthlyRevenue.reduce((s,m) => s+m.revenue, 0).toFixed(2)}
              </p>
            </div>
            <div style={{ textAlign:"right" }}>
              <p style={{ fontSize:11, color:TEXT3 }}>Diesen Monat</p>
              <p style={{ fontFamily:"'Manrope',sans-serif", fontWeight:800, fontSize:20, color:ACCENT }}>
                €{(monthlyRevenue[monthlyRevenue.length - 1]?.revenue ?? 0).toFixed(2)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Bottom row ── */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:20 }}>

        {/* Top products */}
        <div style={{ background:SURFACE, border:`1px solid ${BORDER}`, borderRadius:18, overflow:"hidden" }}>
          <div style={{ padding:"20px 22px 14px", borderBottom:`1px solid ${BORDER}`, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <h2 style={{ fontFamily:"'Manrope',sans-serif", fontWeight:800, fontSize:16, color:TEXT }}>Top Produkte</h2>
            <a href="/supplier/dashboard/products" style={{ fontSize:13, color:ACCENT, fontWeight:700 }}>Alle →</a>
          </div>
          {topProducts.length === 0 ? (
            <div style={{ padding:"40px 24px", textAlign:"center" }}>
              <p style={{ fontSize:36, marginBottom:10 }}>📦</p>
              <p style={{ color:TEXT3, fontSize:13 }}>Noch keine Verkäufe.</p>
            </div>
          ) : (
            <div>
              {topProducts.map((p, i) => {
                const pct = topProducts[0].revenue > 0 ? (p.revenue / topProducts[0].revenue) * 100 : 0;
                return (
                  <div key={p.name} style={{ padding:"14px 22px", borderBottom:i<topProducts.length-1?`1px solid ${BORDER}`:"none", display:"flex", alignItems:"center", gap:12 }}>
                    <div style={{ width:28, height:28, borderRadius:7, background:`${ORANGE}15`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:800, color:ACCENT, flexShrink:0 }}>
                      {i+1}
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:5 }}>
                        <p style={{ fontSize:13, fontWeight:600, color:TEXT, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{p.name}</p>
                        <p style={{ fontSize:13, fontWeight:700, color:TEXT, flexShrink:0, marginLeft:8 }}>€{p.revenue.toFixed(0)}</p>
                      </div>
                      <div style={{ height:4, background:BORDER, borderRadius:2, overflow:"hidden" }}>
                        <div style={{ height:"100%", width:`${pct}%`, background:BTN, borderRadius:2, transition:"width 0.6s ease" }} />
                      </div>
                      <p style={{ fontSize:11, color:TEXT3, marginTop:4 }}>{p.count} verkauft</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Inventory summary */}
        <div style={{ background:SURFACE, border:`1px solid ${BORDER}`, borderRadius:18, overflow:"hidden" }}>
          <div style={{ padding:"20px 22px 14px", borderBottom:`1px solid ${BORDER}`, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <h2 style={{ fontFamily:"'Manrope',sans-serif", fontWeight:800, fontSize:16, color:TEXT }}>Lagerbestand</h2>
            <a href="/supplier/dashboard/products" style={{ fontSize:13, color:ACCENT, fontWeight:700 }}>Verwalten →</a>
          </div>

          {/* Category breakdown */}
          {products.length === 0 ? (
            <div style={{ padding:"40px 24px", textAlign:"center" }}>
              <p style={{ fontSize:36, marginBottom:10 }}>📦</p>
              <p style={{ color:TEXT3, fontSize:13 }}>Noch keine Produkte.</p>
              <a href="/add-product" style={{ display:"inline-block", marginTop:14, background:BTN, color:"#fff", fontWeight:700, padding:"10px 20px", borderRadius:9, fontSize:13 }}>Erstes Produkt →</a>
            </div>
          ) : (
            <div style={{ padding:"16px 22px", display:"flex", flexDirection:"column", gap:0 }}>
              {/* Status summary pills */}
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10, marginBottom:20 }}>
                {[
                  { label:"Aktiv",    count:products.filter(p=>p.stock>5).length,  color:"#16a34a", bg:"#f0fdf4" },
                  { label:"Niedrig",  count:products.filter(p=>p.stock>0&&p.stock<=5).length, color:"#ea580c", bg:"#fff7ed" },
                  { label:"Leer",     count:products.filter(p=>p.stock===0).length, color:"#dc2626", bg:"#fef2f2" },
                ].map(s => (
                  <div key={s.label} style={{ background:s.bg, borderRadius:12, padding:"14px 14px 12px", textAlign:"center" }}>
                    <p style={{ fontFamily:"'Manrope',sans-serif", fontWeight:800, fontSize:22, color:s.color }}>{s.count}</p>
                    <p style={{ fontSize:11, color:s.color, fontWeight:600 }}>{s.label}</p>
                  </div>
                ))}
              </div>

              {/* Last 5 products */}
              {products.slice(0,5).map((p, i) => (
                <div key={p.id} style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 0", borderBottom:i<4?`1px solid ${BORDER}`:"none" }}>
                  <div style={{ width:40, height:40, borderRadius:9, overflow:"hidden", flexShrink:0, background:BG }}>
                    <img loading="lazy" decoding="async" src={p.image_url || "https://images.unsplash.com/photo-1568702846914-96b305d2aaeb?w=120&q=60"} alt={p.name} style={{ width:"100%", height:"100%", objectFit:"cover" }} />
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <p style={{ fontSize:13, fontWeight:600, color:TEXT, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{p.name}</p>
                    <p style={{ fontSize:11, color:TEXT3 }}>€{p.price} · {p.stock} auf Lager</p>
                  </div>
                  <a href={`/edit-product/${p.id}`} style={{ fontSize:12, color:ACCENT, fontWeight:600 }}>✏️</a>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Quick actions footer ── */}
      <div style={{ marginTop:24,
          background: isDark ? "#1a1c1e" : `linear-gradient(135deg, ${ORANGE} 0%, #1D4ED8 100%)`,
          border: isDark ? `1px solid #434656` : "none",
          borderRadius:18, padding:"28px 32px", display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:20, position:"relative", overflow:"hidden" }}>
        {isDark && <div style={{ position:"absolute", inset:0, background:"radial-gradient(ellipse at 30% 50%, rgba(0,82,255,0.15) 0%, transparent 60%)", pointerEvents:"none" }} />}
        {!isDark && <div style={{ position:"absolute", top:-50, right:-50, width:200, height:200, background:"rgba(255,255,255,0.07)", borderRadius:"50%" }} />}
        <div style={{ position:"relative" }}>
          <p style={{ fontFamily:"'Manrope',sans-serif", fontWeight:800, fontSize:20, color: isDark ? "#e2e2e5" : "#fff", marginBottom:6 }}>Bereit für mehr Verkäufe?</p>
          <p style={{ fontSize:13, color: isDark ? "#8a8ca0" : "rgba(255,255,255,0.7)" }}>Liste neue Produkte und erreiche hunderte Kiosk-Betreiber.</p>
        </div>
        <div style={{ display:"flex", gap:10, position:"relative" }}>
          <a href="/add-product" style={{ background: isDark ? BTN : "#fff", color: isDark ? "#fff" : ORANGE, fontWeight:700, padding:"11px 22px", borderRadius:10, fontSize:14 }}>+ Produkt hinzufügen</a>
          <a href="/marketplace" style={{ background: isDark ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.15)", border: isDark ? "1.5px solid #434656" : "1.5px solid rgba(255,255,255,0.3)", color: isDark ? "#c3c5d9" : "#fff", fontWeight:600, padding:"11px 18px", borderRadius:10, fontSize:14 }}>Marktplatz ansehen</a>
        </div>
      </div>

    </div>
  );
}
