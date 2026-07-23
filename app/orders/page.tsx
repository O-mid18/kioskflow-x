"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

const BG      = "var(--kf-bg)";
const SURFACE = "var(--kf-surface)";
const BORDER  = "var(--kf-border)";
const TEXT    = "var(--kf-text)";
const TEXT2   = "var(--kf-text2)";
const TEXT3   = "var(--kf-text3)";
const ORANGE  = "#003ec7";

const STATUS: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  awaiting_quote:   { label: "Wartet auf Versandkosten", color: "#dc2626", bg: "#fef2f2", icon: "📦" },
  awaiting_payment: { label: "Zahlung erforderlich",     color: "#d97706", bg: "#fffbeb", icon: "💳" },
  pending:   { label: "Ausstehend",       color: "#ea580c", bg: "#fff7ed", icon: "⏳" },
  paid:      { label: "Bezahlt",          color: "#16a34a", bg: "#f0fdf4", icon: "✅" },
  preparing: { label: "Wird vorbereitet", color: "#7c3aed", bg: "#f3e8ff", icon: "📦" },
  shipped:   { label: "Versandt",         color: "#003ec7", bg: "#eff6ff", icon: "🚚" },
  delivered: { label: "Geliefert",        color: "#16a34a", bg: "#f0fdf4", icon: "📦" },
  cancelled: { label: "Storniert",        color: "#dc2626", bg: "#fef2f2", icon: "❌" },
};

const STEPS = [
  { key: "pending",   label: "Bestellt" },
  { key: "paid",      label: "Bezahlt"  },
  { key: "preparing", label: "Vorbereitung" },
  { key: "shipped",   label: "Versandt" },
  { key: "delivered", label: "Geliefert"},
];

type OrderItem = {
  id: string; product_id: string; quantity: number; price_at_purchase: number;
  products?: { name: string; image_url?: string } | null;
};
type Order = {
  id: string; total_price: number; status: string; created_at: string;
  order_items?: OrderItem[];
};

function StatusBadge({ status }: { status: string }) {
  const s = STATUS[status] ?? { label: status, color: TEXT3, bg: BG, icon: "•" };
  return (
    <span style={{ background: s.bg, color: s.color, fontSize: 12, fontWeight: 700, padding: "4px 12px", borderRadius: 100, display: "inline-flex", alignItems: "center", gap: 5 }}>
      {s.icon} {s.label}
    </span>
  );
}

function ProgressBar({ status }: { status: string }) {
  if (status === "cancelled") return (
    <div style={{ marginTop: 16, display: "flex", alignItems: "center", gap: 8 }}>
      <span style={{ background: "#fef2f2", color: "#dc2626", fontSize: 12, fontWeight: 700, padding: "4px 12px", borderRadius: 100 }}>❌ Bestellung storniert</span>
    </div>
  );

  const currentIdx = STEPS.findIndex(s => s.key === status);

  return (
    <div style={{ marginTop: 20 }}>
      <div style={{ display: "flex", alignItems: "center" }}>
        {STEPS.map((step, i) => {
          const done = i <= currentIdx;
          return (
            <div key={step.key} style={{ display: "flex", alignItems: "center", flex: i < STEPS.length - 1 ? 1 : 0 }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                <div style={{ width: 28, height: 28, borderRadius: "50%", background: done ? ORANGE : BORDER, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, color: done ? "#fff" : TEXT3, flexShrink: 0, transition: "background 0.3s" }}>
                  {done ? "✓" : i + 1}
                </div>
                <p style={{ fontSize: 10, fontWeight: 600, color: done ? ORANGE : TEXT3, whiteSpace: "nowrap" }}>{step.label}</p>
              </div>
              {i < STEPS.length - 1 && (
                <div style={{ flex: 1, height: 2, background: i < currentIdx ? ORANGE : BORDER, margin: "0 4px", marginBottom: 18, transition: "background 0.3s" }} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function OrdersPage() {
  const [orders, setOrders]           = useState<Order[]>([]);
  const [loading, setLoading]         = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [expandedId, setExpandedId]   = useState<string | null>(null);
  const [role, setRole]               = useState<string | null>(null);
  const [reordering, setReordering]   = useState<string | null>(null);
  const [confirmingCancel, setConfirmingCancel] = useState<string | null>(null);
  const [reorderToast, setReorderToast] = useState<string | null>(null);
  const [paying, setPaying]           = useState<string | null>(null);

  useEffect(() => { fetchOrders(); }, []);

  const cancelOrder = async (orderId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from("orders")
      .update({ status: "cancelled" })
      .eq("id", orderId)
      .eq("buyer_id", user.id)
      .eq("status", "pending");
    setConfirmingCancel(null);
    if (error) { alert("Stornierung fehlgeschlagen. Bitte versuche es erneut."); return; }
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: "cancelled" } : o));
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

  const payNow = async (orderId: string) => {
    setPaying(orderId);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { window.location.href = "/login"; return; }
    const res = await fetch("/api/pay-order", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${session.access_token}` },
      body: JSON.stringify({ orderId }),
    });
    const data = await res.json();
    setPaying(null);
    if (!res.ok) { alert(data?.error ?? "Fehler beim Bezahlen"); return; }
    window.location.href = data.url;
  };

  const reorderItems = async (orderId: string, items: OrderItem[]) => {
    setReordering(orderId);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { window.location.href = "/login"; return; }
    for (const item of items) {
      if (!item.product_id) continue;
      const { data: existing } = await supabase.from("cart_items").select("id, quantity").eq("user_id", user.id).eq("product_id", item.product_id).maybeSingle();
      if (existing) {
        await supabase.from("cart_items").update({ quantity: existing.quantity + item.quantity }).eq("id", existing.id);
      } else {
        await supabase.from("cart_items").insert({ user_id: user.id, product_id: item.product_id, quantity: item.quantity });
      }
    }
    setReordering(null);
    setReorderToast("Alle Artikel zum Warenkorb hinzugefügt ✓");
    setTimeout(() => setReorderToast(null), 2500);
  };

  const fetchOrders = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { window.location.href = "/login"; return; }
    supabase.from("profiles").select("role").eq("id", user.id).maybeSingle().then(({ data }) => setRole(data?.role ?? null));

    const { data, error: fetchErr } = await supabase
      .from("orders")
      .select("id, total_price, status, created_at, order_items(id, product_id, quantity, price_at_purchase, products(name, image_url))")
      .eq("buyer_id", user.id)
      .order("created_at", { ascending: false });

    if (!fetchErr) setOrders((data as unknown as Order[]) ?? []);
    setLoading(false);
  };

  const filtered = statusFilter === "all"
    ? orders
    : orders.filter(o => o.status === statusFilter);

  const totalSpent = orders
    .filter(o => ["paid","shipped","delivered"].includes(o.status))
    .reduce((s, o) => s + Number(o.total_price), 0);

  if (loading) return (
    <main style={{ minHeight: "100vh", background: BG, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Inter',system-ui,sans-serif" }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{ width: 36, height: 36, border: `3px solid ${BORDER}`, borderTopColor: ORANGE, borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
    </main>
  );

  return (
    <main style={{ minHeight: "100vh", background: BG, fontFamily: "'Inter','Helvetica Neue',system-ui,sans-serif", color: TEXT, paddingBottom: 60 }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Manrope:wght@600;700;800&family=Inter:wght@400;500;600;700&display=swap'); *{box-sizing:border-box}`}</style>
      {reorderToast && (
        <div style={{ position:"fixed", bottom:90, right:20, zIndex:999, background:"var(--kf-toast-bg,#1a1714)", color:"var(--kf-toast-fg,#fff)", fontSize:13, padding:"12px 18px", borderRadius:12, display:"flex", alignItems:"center", gap:8, boxShadow:"0 4px 24px rgba(0,0,0,0.15)" }}>
          <span style={{ width:18, height:18, background:"#22c55e", borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", fontSize:9, fontWeight:900 }}>✓</span>
          {reorderToast}
          <a href="/cart" style={{ color:ORANGE, fontWeight:700, fontSize:12, marginLeft:6 }}>Zum Warenkorb →</a>
        </div>
      )}

      {/* Navbar */}
      <nav style={{ background: SURFACE, borderBottom: `1px solid ${BORDER}`, padding: "0 28px", height: 60, display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 40 }}>
        <a href="/marketplace" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none" }}>
          <img src="/flowio-icon.png" alt="Flowio" style={{ width: 30, height: 30, borderRadius: 7, objectFit: "cover" }} />
          <span style={{ fontFamily: "'Manrope',sans-serif", fontWeight: 800, fontSize: 14, color: TEXT }}>Flowio</span>
        </a>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {role === "admin" && <a href="/owner/dashboard" title="Owner-Panel" style={{ background:`${ORANGE}15`, color:ORANGE, fontWeight:700, fontSize:13, textDecoration:"none", padding:"6px 12px", borderRadius:8 }}>🏛️</a>}
          {role === "supplier" && <a href="/supplier/dashboard" title="Lieferanten-Dashboard" style={{ background:`${ORANGE}15`, color:ORANGE, fontWeight:700, fontSize:13, textDecoration:"none", padding:"6px 12px", borderRadius:8 }}>📦</a>}
          <a href="/marketplace" style={{ fontSize: 13, color: TEXT2, textDecoration: "none", fontWeight: 500, padding: "6px 14px", borderRadius: 8 }}>Marktplatz</a>
          <a href="/cart" style={{ fontSize: 13, color: TEXT2, textDecoration: "none", fontWeight: 500, padding: "6px 14px", borderRadius: 8 }}>Warenkorb</a>
          <a href="/analytics" style={{ fontSize: 13, color: TEXT2, textDecoration: "none", fontWeight: 500, padding: "6px 14px", borderRadius: 8 }}>📊 Analytik</a>
          <a href="/profile" style={{ fontSize: 13, color: TEXT2, textDecoration: "none", fontWeight: 500, padding: "6px 14px", borderRadius: 8 }}>Profil</a>
          <button onClick={async () => { await supabase.auth.signOut(); window.location.href = "/login"; }}
            style={{ marginLeft: 8, background: "none", border: `1.5px solid ${BORDER}`, borderRadius: 8, padding: "6px 14px", color: TEXT2, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
            Abmelden
          </button>
        </div>
      </nav>

      <div style={{ maxWidth: 800, margin: "0 auto", padding: "36px 24px" }}>

        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: TEXT3, letterSpacing: "2.5px", textTransform: "uppercase", marginBottom: 8 }}>Mein Konto</p>
          <h1 style={{ fontFamily: "'Manrope',sans-serif", fontWeight: 800, fontSize: 28, color: TEXT, letterSpacing: "-0.8px" }}>Meine Bestellungen</h1>
        </div>

        {/* KPI row */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 28 }}>
          {[
            { icon: "🧾", label: "Bestellungen",    value: String(orders.length) },
            { icon: "💶", label: "Ausgegeben",       value: `€${totalSpent.toFixed(2)}`, hi: true },
            { icon: "⏳", label: "Ausstehend",       value: String(orders.filter(o => o.status === "pending").length) },
          ].map(s => (
            <div key={s.label} style={{ background: s.hi ? ORANGE : SURFACE, border: `1px solid ${s.hi ? ORANGE : BORDER}`, borderRadius: 14, padding: "18px 20px" }}>
              <span style={{ fontSize: 20 }}>{s.icon}</span>
              <p style={{ fontFamily: "'Manrope',sans-serif", fontWeight: 800, fontSize: 22, color: s.hi ? "#fff" : TEXT, margin: "8px 0 2px" }}>{s.value}</p>
              <p style={{ fontSize: 12, fontWeight: 600, color: s.hi ? "rgba(255,255,255,0.8)" : TEXT2 }}>{s.label}</p>
            </div>
          ))}
        </div>

        {/* Status filter */}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 20 }}>
          {[{ key: "all", label: `Alle (${orders.length})` }, ...Object.entries(STATUS).map(([k, v]) => ({ key: k, label: `${v.icon} ${v.label} (${orders.filter(o => o.status === k).length})` }))]
            .map(f => (
              <button key={f.key} onClick={() => setStatusFilter(f.key)}
                style={{ padding: "8px 14px", borderRadius: 100, border: `1.5px solid ${statusFilter === f.key ? ORANGE : BORDER}`, background: statusFilter === f.key ? `${ORANGE}15` : SURFACE, color: statusFilter === f.key ? ORANGE : TEXT2, fontWeight: 600, fontSize: 12, cursor: "pointer", whiteSpace: "nowrap" }}>
                {f.label}
              </button>
            ))}
        </div>

        {/* Orders list */}
        {filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "80px 0" }}>
            <p style={{ fontSize: 48, marginBottom: 16 }}>📭</p>
            <p style={{ color: TEXT2, fontSize: 15, fontWeight: 600 }}>Keine Bestellungen gefunden.</p>
            <a href="/marketplace" style={{ display: "inline-block", marginTop: 20, background: ORANGE, color: "#fff", fontWeight: 700, padding: "12px 24px", borderRadius: 10, textDecoration: "none", fontSize: 14 }}>
              Zum Marktplatz →
            </a>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {filtered.map(order => {
              const expanded = expandedId === order.id;
              const s = STATUS[order.status] ?? STATUS.pending;
              const itemCount = order.order_items?.length ?? 0;

              return (
                <div key={order.id} style={{ background: SURFACE, border: `1.5px solid ${expanded ? ORANGE : BORDER}`, borderRadius: 16, overflow: "hidden", transition: "border-color 0.2s" }}>
                  {/* Order row */}
                  <div onClick={() => setExpandedId(expanded ? null : order.id)}
                    style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 22px", cursor: "pointer" }}
                    onMouseEnter={e => { if (!expanded) e.currentTarget.style.background = BG; }}
                    onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                      <div style={{ width: 44, height: 44, borderRadius: 12, background: `${s.color}15`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>
                        {s.icon}
                      </div>
                      <div>
                        <p style={{ fontFamily: "'Manrope',sans-serif", fontWeight: 800, fontSize: 15, color: TEXT }}>
                          #{order.id.slice(-8).toUpperCase()}
                        </p>
                        <p style={{ fontSize: 12, color: TEXT3, marginTop: 2 }}>
                          {new Date(order.created_at).toLocaleDateString("de-DE", { day: "2-digit", month: "short", year: "numeric" })} · {itemCount} Artikel
                        </p>
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                      <StatusBadge status={order.status} />
                      <p style={{ fontFamily: "'Manrope',sans-serif", fontWeight: 800, fontSize: 18, color: TEXT }}>
                        €{Number(order.total_price).toFixed(2)}
                      </p>
                      {order.status === "awaiting_payment" && (
                        <button
                          onClick={e => { e.stopPropagation(); payNow(order.id); }}
                          disabled={paying === order.id}
                          style={{ background: paying === order.id ? "#9ca3af" : "#d97706", border: "none", borderRadius: 8, padding: "5px 12px", color: "#fff", fontSize: 11, fontWeight: 700, cursor: paying === order.id ? "not-allowed" : "pointer" }}>
                          {paying === order.id ? "..." : "💳 Jetzt bezahlen →"}
                        </button>
                      )}
                      {["paid", "preparing", "shipped", "delivered"].includes(order.status) && (
                        <button
                          onClick={e => { e.stopPropagation(); downloadInvoice(order.id); }}
                          style={{ background: "none", border: `1.5px solid ${BORDER}`, borderRadius: 8, padding: "5px 12px", color: TEXT2, fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
                          🧾 Rechnung
                        </button>
                      )}
                      {order.status === "pending" && (
                        confirmingCancel === order.id ? (
                          <span onClick={e => e.stopPropagation()} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <span style={{ fontSize: 11, color: TEXT2 }}>Sicher?</span>
                            <button onClick={() => cancelOrder(order.id)} style={{ background: "#dc2626", border: "none", borderRadius: 8, padding: "5px 10px", color: "#fff", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>Ja, stornieren</button>
                            <button onClick={() => setConfirmingCancel(null)} style={{ background: "none", border: `1.5px solid ${BORDER}`, borderRadius: 8, padding: "5px 10px", color: TEXT2, fontSize: 11, cursor: "pointer" }}>Abbrechen</button>
                          </span>
                        ) : (
                          <button
                            onClick={e => { e.stopPropagation(); setConfirmingCancel(order.id); }}
                            style={{ background: "none", border: "1.5px solid #dc2626", borderRadius: 8, padding: "5px 10px", color: "#dc2626", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
                            Stornieren
                          </button>
                        )
                      )}
                      <span style={{ color: TEXT3, fontSize: 16, transition: "transform 0.2s", transform: expanded ? "rotate(180deg)" : "rotate(0deg)", display: "inline-block" }}>▾</span>
                    </div>
                  </div>

                  {/* Expanded */}
                  {expanded && (
                    <div style={{ borderTop: `1px solid ${BORDER}`, padding: "20px 22px" }}>
                      {/* Progress */}
                      <ProgressBar status={order.status} />

                      {/* Items */}
                      {itemCount > 0 && (
                        <div style={{ marginTop: 20 }}>
                          <p style={{ fontSize: 12, fontWeight: 700, color: TEXT3, textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 12 }}>Bestellte Artikel</p>
                          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                            {order.order_items!.map(item => (
                              <div key={item.id} style={{ display: "flex", alignItems: "center", gap: 12, background: BG, borderRadius: 12, padding: "12px 14px" }}>
                                <div style={{ width: 44, height: 44, borderRadius: 10, overflow: "hidden", flexShrink: 0, background: BORDER }}>
                                  <img loading="lazy" decoding="async" src={(item.products as any)?.image_url || "https://images.unsplash.com/photo-1568702846914-96b305d2aaeb?w=80&q=60"} alt={(item.products as any)?.name}
                                    style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                </div>
                                <div style={{ flex: 1 }}>
                                  <p style={{ fontSize: 13, fontWeight: 600, color: TEXT }}>{(item.products as any)?.name ?? `Produkt #${item.product_id.slice(-6)}`}</p>
                                  <p style={{ fontSize: 12, color: TEXT3 }}>Menge: {item.quantity}</p>
                                </div>
                                <p style={{ fontFamily: "'Manrope',sans-serif", fontWeight: 800, fontSize: 14, color: TEXT }}>
                                  €{(item.price_at_purchase * item.quantity).toFixed(2)}
                                </p>
                              </div>
                            ))}
                          </div>

                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 14px 0", borderTop: `1px solid ${BORDER}`, marginTop: 8 }}>
                            <div>
                              <p style={{ fontSize: 13, fontWeight: 700, color: TEXT2 }}>Gesamtbetrag</p>
                              <p style={{ fontFamily: "'Manrope',sans-serif", fontWeight: 800, fontSize: 16, color: ORANGE }}>€{Number(order.total_price).toFixed(2)}</p>
                            </div>
                            <button
                              onClick={() => reorderItems(order.id, order.order_items ?? [])}
                              disabled={reordering === order.id}
                              style={{ display:"flex", alignItems:"center", gap:7, background: reordering === order.id ? BORDER : ORANGE, color:"#fff", border:"none", borderRadius:10, padding:"10px 18px", fontWeight:700, fontSize:13, cursor: reordering === order.id ? "not-allowed" : "pointer", transition:"all 0.2s" }}>
                              {reordering === order.id ? "..." : "🔄 Wieder bestellen"}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Bottom nav */}
      <nav style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: SURFACE, borderTop: `1px solid ${BORDER}`, display: "flex", justifyContent: "space-around", padding: "10px 0 14px", zIndex: 50 }}>
        {[{ icon: "🏪", label: "Marktplatz", href: "/marketplace", active: false }, { icon: "🛒", label: "Warenkorb", href: "/cart", active: false }, { icon: "📦", label: "Bestellungen", href: "/orders", active: true }, { icon: "💬", label: "Nachrichten", href: "/messages", active: false }, { icon: "👤", label: "Profil", href: "/profile", active: false }].map(({ icon, label, href, active }) => (
          <a key={label} href={href} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, textDecoration: "none", padding: "0 12px" }}>
            <span style={{ fontSize: 20, lineHeight: 1 }}>{icon}</span>
            <span style={{ fontSize: 10, fontWeight: active ? 700 : 500, color: active ? ORANGE : TEXT3 }}>{label}</span>
            {active && <div style={{ width: 16, height: 2, background: ORANGE, borderRadius: 2, marginTop: 1 }} />}
          </a>
        ))}
      </nav>
    </main>
  );
}
