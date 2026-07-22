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

type OrderItem = {
  id: string;
  quantity: number;
  price_at_purchase: number;
  products?: { name: string; image_url?: string; category?: string; };
  orders?:   { id: string; status: string; created_at: string; total_price: number; buyer_id: string; shipping_name?: string; shipping_street?: string; shipping_postal_code?: string; shipping_city?: string; shipping_country?: string; };
};

const NEXT_STATUS: Record<string, string[]> = {
  awaiting_quote:   [],
  awaiting_payment: [],
  pending:   ["preparing", "shipped", "cancelled"],
  paid:      ["preparing", "shipped", "cancelled"],
  preparing: ["shipped", "cancelled"],
  shipped:   ["delivered", "cancelled"],
  delivered: [],
  cancelled: [],
};

const STATUS_MAP: Record<string, { label:string; color:string; bg:string }> = {
  awaiting_quote:   { label:"Versandkosten ausstehend", color:"#dc2626", bg:"#fef2f2" },
  awaiting_payment: { label:"Wartet auf Zahlung",       color:"#d97706", bg:"#fffbeb" },
  pending:   { label:"Ausstehend",       color:"#ea580c", bg:"#fff7ed" },
  paid:      { label:"Bezahlt",          color:"#16a34a", bg:"#f0fdf4" },
  preparing: { label:"Wird vorbereitet", color:"#7c3aed", bg:"#f3e8ff" },
  shipped:   { label:"Versandt",         color:"#003ec7", bg:"#eff6ff" },
  delivered: { label:"Geliefert",        color:"#16a34a", bg:"#f0fdf4" },
  cancelled: { label:"Storniert",        color:"#dc2626", bg:"#fef2f2" },
};

export default function SupplierOrdersPage() {
  const [items,       setItems]       = useState<OrderItem[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [filter,      setFilter]      = useState("all");
  const [search,      setSearch]      = useState("");
  const [updating,    setUpdating]    = useState<string | null>(null);
  const [quoteInputs, setQuoteInputs] = useState<Record<string, string>>({});
  const [quoting,     setQuoting]     = useState<string | null>(null);

  useEffect(() => { fetchOrders(); }, []);

  const STATUS_NOTIFY: Record<string, string> = {
    preparing: "📦 Deine Bestellung wird vorbereitet",
    shipped:   "🚚 Deine Bestellung wurde versandt",
    delivered: "📦 Deine Bestellung wurde geliefert",
    cancelled: "❌ Deine Bestellung wurde storniert",
  };

  const updateStatus = async (orderId: string, newStatus: string, buyerId: string, oldStatus: string) => {
    if (!items.some(item => item.orders?.id === orderId)) return;
    setUpdating(orderId);
    const { error } = await supabase.from("orders").update({ status: newStatus }).eq("id", orderId);
    if (!error) {
      // If cancelling an order that was already paid/shipped, stock was already
      // deducted at payment time (via the Stripe webhook) — restore it atomically server-side.
      if (newStatus === "cancelled" && (oldStatus === "paid" || oldStatus === "shipped")) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          await fetch("/api/restore-stock", {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${session.access_token}` },
            body: JSON.stringify({ orderId }),
          });
        }
      }
      setItems(prev => prev.map(item =>
        item.orders?.id === orderId ? { ...item, orders: { ...item.orders!, status: newStatus } } : item
      ));
      const notifTitle = STATUS_NOTIFY[newStatus];
      if (notifTitle && buyerId) {
        supabase.auth.getSession().then(({ data: { session } }) => {
          if (!session) return;
          fetch("/api/notify", {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${session.access_token}` },
            body: JSON.stringify({
              user_id: buyerId,
              type: "status_update",
              title: notifTitle,
              body: `Bestell-ID: #${orderId.slice(-6).toUpperCase()}`,
              link: "/orders",
              orderId,
            }),
          });
        });
      }
    }
    setUpdating(null);
  };

  const downloadInvoice = async (orderId: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const res = await fetch(`/api/invoice/${orderId}`, { headers: { Authorization: `Bearer ${session.access_token}` } });
    if (!res.ok) { const d = await res.json().catch(() => ({})); alert(d?.error ?? "Rechnung konnte nicht geladen werden."); return; }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
  };

  const submitQuote = async (orderId: string) => {
    const val = quoteInputs[orderId];
    const cost = parseFloat(val ?? "");
    if (isNaN(cost) || cost < 0) { alert("Bitte einen gültigen Versandpreis eingeben."); return; }
    setQuoting(orderId);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setQuoting(null); return; }
    const res = await fetch("/api/quote-shipping", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${session.access_token}` },
      body: JSON.stringify({ orderId, shippingCost: cost }),
    });
    const data = await res.json();
    setQuoting(null);
    if (!res.ok) { alert(data?.error ?? "Fehler beim Senden"); return; }
    setItems(prev => prev.map(item =>
      item.orders?.id === orderId
        ? { ...item, orders: { ...item.orders!, status: data.fullyQuoted ? "awaiting_payment" : "awaiting_quote" } }
        : item
    ));
    setQuoteInputs(prev => { const n = { ...prev }; delete n[orderId]; return n; });
  };

  const fetchOrders = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { window.location.href = "/login"; return; }
    const { data: supplier } = await supabase.from("suppliers").select("id").eq("user_id", user.id).maybeSingle();
    if (!supplier) { setLoading(false); return; }
    const { data } = await supabase
      .from("order_items")
      .select("id, quantity, price_at_purchase, products(name,image_url,category), orders(id,status,created_at,total_price,buyer_id,shipping_name,shipping_street,shipping_postal_code,shipping_city,shipping_country)")
      .eq("supplier_id", supplier.id)
      .order("created_at", { foreignTable:"orders", ascending:false });
    setItems((data as unknown as OrderItem[]) ?? []);
    setLoading(false);
  };

  const filtered = items.filter(item => {
    const matchStatus = filter === "all" || item.orders?.status === filter;
    const matchSearch = !search || item.products?.name.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  const statusCounts = Object.fromEntries(
    Object.keys(STATUS_MAP).map(k => [k, items.filter(i => i.orders?.status === k).length])
  );

  if (loading) {
    return (
      <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"100vh" }}>
        <style>{`@keyframes spin { to { transform:rotate(360deg); } }`}</style>
        <div style={{ width:36, height:36, border:`3px solid ${BORDER}`, borderTopColor:ORANGE, borderRadius:"50%", animation:"spin 0.8s linear infinite" }} />
      </div>
    );
  }

  return (
    <div style={{ padding:"32px 32px 60px" }}>

      {/* Header */}
      <div style={{ marginBottom:28 }}>
        <p style={{ fontSize:11, fontWeight:700, color:TEXT3, letterSpacing:"2.5px", textTransform:"uppercase", marginBottom:8 }}>Lieferant-Dashboard</p>
        <h1 style={{ fontFamily:"'Hanken Grotesk',sans-serif", fontWeight:800, fontSize:26, color:TEXT, letterSpacing:"-0.8px" }}>Bestellungen</h1>
        <p style={{ fontSize:13, color:TEXT2, marginTop:4 }}>{items.length} Bestellpositionen insgesamt</p>
      </div>

      {/* Status filter tabs */}
      <div style={{ display:"flex", gap:8, marginBottom:20, flexWrap:"wrap" }}>
        <button onClick={() => setFilter("all")} style={{ padding:"8px 16px", borderRadius:100, border:`1.5px solid ${filter==="all"?ORANGE:BORDER}`, background:filter==="all"?`${ORANGE}15`:SURFACE, color:filter==="all"?ORANGE:TEXT2, fontWeight:600, fontSize:13, cursor:"pointer" }}>
          Alle ({items.length})
        </button>
        {Object.entries(STATUS_MAP).map(([key, s]) => (
          <button key={key} onClick={() => setFilter(key)} style={{ padding:"8px 16px", borderRadius:100, border:`1.5px solid ${filter===key?s.color:BORDER}`, background:filter===key?s.bg:SURFACE, color:filter===key?s.color:TEXT2, fontWeight:600, fontSize:13, cursor:"pointer" }}>
            {s.label} ({statusCounts[key] ?? 0})
          </button>
        ))}
      </div>

      {/* Search */}
      <div style={{ position:"relative", marginBottom:20, maxWidth:360 }}>
        <svg style={{ position:"absolute", left:12, top:"50%", transform:"translateY(-50%)" }} width={14} height={14} fill="none" stroke={TEXT3} strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
        <input type="text" placeholder="Produkt suchen..." value={search} onChange={e => setSearch(e.target.value)}
          style={{ width:"100%", background:SURFACE, border:`1.5px solid ${BORDER}`, borderRadius:10, padding:"10px 14px 10px 34px", color:TEXT, fontSize:13, outline:"none" }} />
      </div>

      {/* Orders table */}
      <div style={{ background:SURFACE, border:`1px solid ${BORDER}`, borderRadius:18, overflow:"hidden" }}>
        {filtered.length === 0 ? (
          <div style={{ padding:"64px", textAlign:"center" }}>
            <p style={{ fontSize:48, marginBottom:14 }}>📭</p>
            <p style={{ color:TEXT2, fontSize:15, fontWeight:600 }}>Keine Bestellungen gefunden</p>
            <p style={{ color:TEXT3, fontSize:13, marginTop:6 }}>Ändere den Filter oder warte auf neue Bestellungen.</p>
          </div>
        ) : (
          <table style={{ width:"100%", borderCollapse:"collapse" }}>
            <thead>
              <tr style={{ borderBottom:`1px solid ${BORDER}`, background:BG }}>
                {["Produkt","Bestell-ID","Datum","Menge","Preis","Status","Aktion"].map(h => (
                  <th key={h} style={{ padding:"12px 20px", textAlign:"left", fontSize:11, fontWeight:700, color:TEXT3, textTransform:"uppercase", letterSpacing:"0.8px", whiteSpace:"nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((item, i) => {
                const s = STATUS_MAP[item.orders?.status ?? ""] ?? { label:item.orders?.status ?? "—", color:TEXT3, bg:BG };
                return (
                  <tr key={item.id} style={{ borderBottom:i<filtered.length-1?`1px solid ${BORDER}`:"none", transition:"background 0.15s" }}
                    onMouseEnter={e => e.currentTarget.style.background=BG}
                    onMouseLeave={e => e.currentTarget.style.background="transparent"}>
                    <td style={{ padding:"14px 20px" }}>
                      <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                        <div style={{ width:36, height:36, borderRadius:8, overflow:"hidden", flexShrink:0, background:BG }}>
                          <img loading="lazy" decoding="async" src={item.products?.image_url || "https://images.unsplash.com/photo-1568702846914-96b305d2aaeb?w=100&q=60"} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }} />
                        </div>
                        <div>
                          <p style={{ fontSize:13, fontWeight:600, color:TEXT }}>{item.products?.name ?? "—"}</p>
                          {item.products?.category && <p style={{ fontSize:11, color:TEXT3 }}>{item.products.category}</p>}
                        </div>
                      </div>
                    </td>
                    <td style={{ padding:"14px 20px", fontSize:13, fontWeight:600, color:TEXT, fontFamily:"'Hanken Grotesk',sans-serif" }}>
                      <div>#{(item.orders?.id ?? "").slice(-6).toUpperCase()}</div>
                      {item.orders?.shipping_name && (
                        <div style={{ fontSize:11, color:TEXT3, fontWeight:400, marginTop:2, fontFamily:"'Inter',sans-serif" }}>
                          📍 {item.orders.shipping_name}, {item.orders.shipping_street}, {item.orders.shipping_postal_code} {item.orders.shipping_city}
                        </div>
                      )}
                    </td>
                    <td style={{ padding:"14px 20px", fontSize:12, color:TEXT2, whiteSpace:"nowrap" }}>
                      {item.orders?.created_at ? new Date(item.orders.created_at).toLocaleDateString("de-DE",{day:"2-digit",month:"short",year:"numeric"}) : "—"}
                    </td>
                    <td style={{ padding:"14px 20px", fontSize:13, color:TEXT, fontWeight:600 }}>
                      ×{item.quantity}
                    </td>
                    <td style={{ padding:"14px 20px", fontSize:14, fontWeight:700, color:TEXT }}>
                      €{(item.price_at_purchase * item.quantity).toFixed(2)}
                    </td>
                    <td style={{ padding:"14px 20px" }}>
                      <span style={{ background:s.bg, color:s.color, fontSize:11, fontWeight:700, padding:"4px 10px", borderRadius:100 }}>{s.label}</span>
                    </td>
                    <td style={{ padding:"14px 20px" }}>
                      {item.orders?.status === "awaiting_quote" ? (
                        <div style={{ display:"flex", gap:6, alignItems:"center" }}>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="€ Versand"
                            value={quoteInputs[item.orders.id] ?? ""}
                            onChange={e => setQuoteInputs(prev => ({ ...prev, [item.orders!.id]: e.target.value }))}
                            style={{ width:90, background:SURFACE, border:`1.5px solid ${BORDER}`, borderRadius:8, padding:"5px 8px", color:TEXT, fontSize:12, outline:"none" }}
                          />
                          <button
                            onClick={() => item.orders?.id && submitQuote(item.orders.id)}
                            disabled={quoting === item.orders.id}
                            style={{ background:"#d97706", color:"#fff", border:"none", borderRadius:8, padding:"5px 10px", fontSize:11, fontWeight:700, cursor: quoting === item.orders.id ? "not-allowed" : "pointer" }}>
                            {quoting === item.orders.id ? "..." : "Senden"}
                          </button>
                        </div>
                      ) : NEXT_STATUS[item.orders?.status ?? ""]?.length > 0 ? (
                        <select
                          value=""
                          disabled={updating === item.orders?.id}
                          onChange={e => { if (e.target.value && item.orders?.id) updateStatus(item.orders.id, e.target.value, item.orders.buyer_id, item.orders.status); }}
                          style={{ background:SURFACE, border:`1.5px solid ${BORDER}`, borderRadius:8, padding:"6px 10px", color:TEXT2, fontSize:12, fontWeight:600, cursor:"pointer", outline:"none" }}
                        >
                          <option value="">Status ändern</option>
                          {NEXT_STATUS[item.orders?.status ?? ""].map(ns => (
                            <option key={ns} value={ns}>{STATUS_MAP[ns]?.label}</option>
                          ))}
                        </select>
                      ) : (
                        <span style={{ fontSize:12, color:TEXT3 }}>—</span>
                      )}
                      {["paid","preparing","shipped","delivered"].includes(item.orders?.status ?? "") && (
                        <button
                          onClick={() => item.orders?.id && downloadInvoice(item.orders.id)}
                          style={{ marginTop:6, display:"block", background:"none", border:`1.5px solid ${BORDER}`, borderRadius:8, padding:"5px 10px", color:TEXT2, fontSize:11, fontWeight:700, cursor:"pointer" }}>
                          🧾 Rechnung
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Summary footer */}
      {filtered.length > 0 && (
        <div style={{ marginTop:16, display:"flex", justifyContent:"flex-end" }}>
          <div style={{ background:SURFACE, border:`1px solid ${BORDER}`, borderRadius:12, padding:"14px 22px", display:"flex", gap:28 }}>
            <div style={{ textAlign:"right" }}>
              <p style={{ fontSize:11, color:TEXT3, marginBottom:3 }}>ARTIKEL</p>
              <p style={{ fontFamily:"'Hanken Grotesk',sans-serif", fontWeight:800, fontSize:18, color:TEXT }}>{filtered.reduce((s,i)=>s+i.quantity,0)}</p>
            </div>
            <div style={{ width:1, background:BORDER }} />
            <div style={{ textAlign:"right" }}>
              <p style={{ fontSize:11, color:TEXT3, marginBottom:3 }}>UMSATZ</p>
              <p style={{ fontFamily:"'Hanken Grotesk',sans-serif", fontWeight:800, fontSize:18, color:ORANGE }}>€{filtered.reduce((s,i)=>s+i.price_at_purchase*i.quantity,0).toFixed(2)}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
