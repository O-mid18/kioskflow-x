"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";

const BG      = "var(--kf-bg)";
const SURFACE = "var(--kf-surface)";
const BORDER  = "var(--kf-border)";
const TEXT    = "var(--kf-text)";
const TEXT2   = "var(--kf-text2)";
const TEXT3   = "var(--kf-text3)";
const ORANGE  = "#E8521A";

type Tab = "overview" | "suppliers" | "orders" | "products" | "buyers" | "support";

type Supplier     = { id: string; name: string; user_id: string; created_at: string; legal_name?: string; street?: string; city?: string; postal_code?: string; country?: string; registration_nr?: string; tax_id?: string; phone?: string; website?: string; verified?: boolean; verification_note?: string; };
type Profile      = { id: string; role: string; status?: string; email?: string; created_at?: string; };
type Order        = { id: string; buyer_id: string; supplier_id: string; total_price: number; status: string; created_at: string; stripe_session_id?: string; };
type Product      = { id: string; name: string; price: number; stock: number; category?: string; image_url?: string; supplier_id: string; created_at: string; suppliers?: { name: string } | null; };
type Conversation = { id: string; user_id: string; created_at: string; last_message_at: string; last_message_text?: string; unread_for_admin: boolean; };
type ChatMessage  = { id: string; conversation_id: string; sender_id: string; is_admin: boolean; message: string; created_at: string; };

const STATUS_CFG: Record<string, { label: string; color: string; bg: string }> = {
  pending:   { label: "Ausstehend", color: "#ea580c", bg: "#fff7ed" },
  paid:      { label: "Bezahlt",    color: "#16a34a", bg: "#f0fdf4" },
  shipped:   { label: "Versandt",   color: "#2563eb", bg: "#eff6ff" },
  delivered: { label: "Geliefert",  color: "#16a34a", bg: "#f0fdf4" },
  cancelled: { label: "Storniert",  color: "#dc2626", bg: "#fef2f2" },
};

function Badge({ status }: { status: string }) {
  const cfg = STATUS_CFG[status] ?? { label: status, color: TEXT3, bg: BG };
  return <span style={{ background: cfg.bg, color: cfg.color, fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 100 }}>{cfg.label}</span>;
}

export default function AdminDashboard() {
  const [tab, setTab]             = useState<Tab>("overview");
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [profiles, setProfiles]   = useState<Profile[]>([]);
  const [orders, setOrders]       = useState<Order[]>([]);
  const [products, setProducts]   = useState<Product[]>([]);
  const [loading, setLoading]     = useState(true);
  const [msg, setMsg]             = useState<{ text: string; ok: boolean } | null>(null);
  const [search, setSearch]       = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [deletingProduct, setDeletingProduct] = useState<string | null>(null);

  // Support chat state
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null);
  const [convMessages, setConvMessages]   = useState<ChatMessage[]>([]);
  const [adminInput, setAdminInput]       = useState("");
  const [adminSending, setAdminSending]   = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const adminIdRef    = useRef<string | null>(null);

  useEffect(() => { fetchAll(); }, []);

  // Realtime: new conversations
  useEffect(() => {
    const ch = supabase
      .channel("admin-convs")
      .on("postgres_changes", { event: "*", schema: "public", table: "support_conversations" },
        () => { fetchConversations(); })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  // Realtime: messages in selected conversation
  useEffect(() => {
    if (!selectedConvId) return;
    loadMessages(selectedConvId);
    const ch = supabase
      .channel(`admin-msgs-${selectedConvId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "support_messages", filter: `conversation_id=eq.${selectedConvId}` },
        payload => {
          setConvMessages(prev => {
            const m = payload.new as ChatMessage;
            if (prev.some(x => x.id === m.id)) return prev;
            return [...prev, m];
          });
        })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [selectedConvId]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [convMessages]);

  const fetchConversations = async () => {
    const { data } = await supabase
      .from("support_conversations")
      .select("*")
      .order("last_message_at", { ascending: false });
    setConversations((data as Conversation[]) ?? []);
  };

  const loadMessages = async (convId: string) => {
    const { data } = await supabase
      .from("support_messages")
      .select("*")
      .eq("conversation_id", convId)
      .order("created_at", { ascending: true });
    setConvMessages((data as ChatMessage[]) ?? []);
    await supabase.from("support_conversations")
      .update({ unread_for_admin: false })
      .eq("id", convId);
    setConversations(prev => prev.map(c => c.id === convId ? { ...c, unread_for_admin: false } : c));
  };

  const sendAdminMessage = async () => {
    const text = adminInput.trim();
    if (!text || !selectedConvId || adminSending || !adminIdRef.current) return;
    setAdminSending(true);
    setAdminInput("");
    await supabase.from("support_messages").insert({
      conversation_id: selectedConvId,
      sender_id: adminIdRef.current,
      is_admin: true,
      message: text,
    });
    await supabase.from("support_conversations").update({
      last_message_at: new Date().toISOString(),
      last_message_text: text,
      unread_for_admin: false,
    }).eq("id", selectedConvId);
    setAdminSending(false);
  };

  const fetchAll = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { window.location.href = "/login"; return; }
    adminIdRef.current = user.id;

    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
    if (profile?.role !== "admin") { window.location.href = "/marketplace"; return; }

    const [{ data: supData }, { data: profData }, { data: ordData }, { data: prodData }, { data: convData }] = await Promise.all([
      supabase.from("suppliers").select("id, name, user_id, created_at, legal_name, street, city, postal_code, country, registration_nr, tax_id, phone, website, verified, verification_note").order("created_at", { ascending: false }),
      supabase.from("profiles").select("id, role, status, created_at").order("created_at" as any, { ascending: false }),
      supabase.from("orders").select("id, buyer_id, supplier_id, total_price, status, created_at, stripe_session_id").order("created_at", { ascending: false }),
      supabase.from("products").select("id, name, price, stock, category, image_url, supplier_id, created_at, suppliers(name)").order("created_at", { ascending: false }),
      supabase.from("support_conversations").select("*").order("last_message_at", { ascending: false }),
    ]);

    setSuppliers((supData as Supplier[]) ?? []);
    setProfiles((profData as Profile[]) ?? []);
    setOrders((ordData as Order[]) ?? []);
    setProducts((prodData as unknown as Product[]) ?? []);
    setConversations((convData as Conversation[]) ?? []);
    setLoading(false);
  };

  const flash = (text: string, ok: boolean) => {
    setMsg({ text, ok });
    setTimeout(() => setMsg(null), 3000);
  };

  const adminFetch = async (body: object) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { window.location.href = "/login"; return new Response(null, { status: 401 }); }
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch("/api/admin", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${session?.access_token}` },
      body: JSON.stringify(body),
    });
    return res;
  };

  const updateOrderStatus = async (id: string, status: string) => {
    const res = await adminFetch({ action: "update_order_status", orderId: id, status });
    const json = await res.json();
    if (!res.ok) flash(json.error ?? "Fehler beim Aktualisieren", false);
    else { flash("Status aktualisiert", true); fetchAll(); }
  };

  const deleteProduct = async (id: string) => {
    if (!confirm("Produkt wirklich löschen?")) return;
    setDeletingProduct(id);
    const res = await adminFetch({ action: "delete_product", productId: id });
    const json = await res.json();
    setDeletingProduct(null);
    if (!res.ok) flash(json.error ?? "Fehler beim Löschen", false);
    else { flash("Produkt gelöscht", true); fetchAll(); }
  };

  const totalRevenue    = orders.filter(o => ["paid","shipped","delivered"].includes(o.status)).reduce((s, o) => s + Number(o.total_price), 0);
  const pendingOrders   = orders.filter(o => o.status === "pending").length;
  const activeSuppliers = suppliers.length;
  const outOfStock      = products.filter(p => p.stock === 0).length;
  const unreadConvs     = conversations.filter(c => c.unread_for_admin).length;

  const filteredOrders = orders.filter(o =>
    (statusFilter === "all" || o.status === statusFilter) &&
    (!search || o.id.includes(search) || o.buyer_id.includes(search))
  );
  const filteredProducts = products.filter(p =>
    !search || p.name.toLowerCase().includes(search.toLowerCase())
  );
  const filteredSuppliers = suppliers.filter(s =>
    !search ||
    s.name?.toLowerCase().includes(search.toLowerCase()) ||
    s.id.toLowerCase().includes(search.toLowerCase()) ||
    s.legal_name?.toLowerCase().includes(search.toLowerCase())
  );

  const fmtTime = (ts: string) => new Date(ts).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
  const fmtDate = (ts: string) => new Date(ts).toLocaleDateString("de-DE", { day: "2-digit", month: "short" });

  if (loading) {
    return (
      <main style={{ minHeight: "100vh", background: BG, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'DM Sans',system-ui,sans-serif" }}>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <div style={{ width: 36, height: 36, border: `3px solid ${BORDER}`, borderTopColor: ORANGE, borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      </main>
    );
  }

  return (
    <main style={{ minHeight: "100vh", background: BG, fontFamily: "'DM Sans','Helvetica Neue',system-ui,sans-serif", color: TEXT }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500;600;700&display=swap'); * { box-sizing: border-box; }`}</style>

      {/* Header */}
      <header style={{ background: SURFACE, borderBottom: `1px solid ${BORDER}`, padding: "0 32px", height: 60, display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 50 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 32, height: 32, background: ORANGE, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 15, color: "#fff", fontFamily: "'Syne',sans-serif" }}>V</div>
          <span style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 15, color: TEXT }}>Vendoro</span>
          <span style={{ fontSize: 12, background: `${ORANGE}15`, color: ORANGE, fontWeight: 700, padding: "2px 8px", borderRadius: 100, marginLeft: 4 }}>Admin</span>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <a href="/marketplace" style={{ fontSize: 13, color: TEXT2, textDecoration: "none", fontWeight: 500 }}>← Marktplatz</a>
          <button onClick={() => { supabase.auth.signOut().then(() => window.location.href = "/login"); }}
            style={{ background: "none", border: `1.5px solid ${BORDER}`, borderRadius: 8, padding: "6px 14px", fontSize: 12, fontWeight: 600, color: TEXT2, cursor: "pointer" }}>
            Abmelden ⏏
          </button>
        </div>
      </header>

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "28px 32px" }}>

        <div style={{ marginBottom: 24 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: TEXT3, letterSpacing: "2.5px", textTransform: "uppercase", marginBottom: 8 }}>Administration</p>
          <h1 style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 28, color: TEXT, letterSpacing: "-0.8px" }}>Admin-Dashboard</h1>
        </div>

        {msg && (
          <div style={{ background: msg.ok ? "#f0fdf4" : "#fef2f2", border: `1.5px solid ${msg.ok ? "#bbf7d0" : "#fca5a5"}`, borderRadius: 10, padding: "12px 16px", marginBottom: 20 }}>
            <p style={{ color: msg.ok ? "#16a34a" : "#dc2626", fontSize: 13, fontWeight: 600 }}>{msg.text}</p>
          </div>
        )}

        {/* Tabs */}
        <div style={{ display: "flex", gap: 4, background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 4, marginBottom: 24, width: "fit-content", flexWrap: "wrap" }}>
          {([
            { id: "overview",  label: "Übersicht",    icon: "◉" },
            { id: "suppliers", label: "Unternehmen",  icon: "🏭" },
            { id: "buyers",    label: "Käufer",       icon: "🛒" },
            { id: "orders",    label: "Bestellungen", icon: "🧾" },
            { id: "products",  label: "Produkte",     icon: "📦" },
            { id: "support",   label: unreadConvs > 0 ? `Support (${unreadConvs})` : "Support", icon: "💬" },
          ] as { id: Tab; label: string; icon: string }[]).map(t => (
            <button key={t.id} onClick={() => { setTab(t.id); setSearch(""); setStatusFilter("all"); }}
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 18px", borderRadius: 9, border: "none", fontSize: 13, fontWeight: 700, cursor: "pointer", background: tab === t.id ? ORANGE : "transparent", color: tab === t.id ? "#fff" : TEXT2, transition: "all 0.2s", position: "relative" }}>
              <span>{t.icon}</span>
              {t.label}
              {t.id === "support" && unreadConvs > 0 && tab !== "support" && (
                <span style={{ position: "absolute", top: 4, right: 4, width: 8, height: 8, background: "#ef4444", borderRadius: "50%" }} />
              )}
            </button>
          ))}
        </div>

        {/* ── OVERVIEW ── */}
        {tab === "overview" && (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 24 }}>
              {[
                { icon: "💶", label: "Gesamtumsatz",  value: `€${totalRevenue.toFixed(2)}`, sub: "Bezahlte Bestellungen", hi: true },
                { icon: "🧾", label: "Bestellungen",  value: String(orders.length),         sub: `${pendingOrders} ausstehend` },
                { icon: "🏭", label: "Unternehmen",   value: String(activeSuppliers),       sub: "Registriert", clickTab: "suppliers" },
                { icon: "📦", label: "Produkte",      value: String(products.length),       sub: `${outOfStock} ausverkauft` },
              ].map((s: any) => (
                <div key={s.label}
                  style={{ background: s.hi ? ORANGE : SURFACE, border: `1px solid ${s.hi ? ORANGE : BORDER}`, borderRadius: 16, padding: "22px", cursor: s.clickTab ? "pointer" : "default", transition: "opacity 0.15s" }}
                  onClick={() => s.clickTab && (setTab(s.clickTab), setSearch(""), setStatusFilter("all"))}
                  onMouseEnter={e => { if (s.clickTab) e.currentTarget.style.opacity = "0.85"; }}
                  onMouseLeave={e => { e.currentTarget.style.opacity = "1"; }}>
                  <span style={{ fontSize: 24 }}>{s.icon}</span>
                  <p style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 26, color: s.hi ? "#fff" : TEXT, margin: "10px 0 2px", letterSpacing: "-0.5px" }}>{s.value}</p>
                  <p style={{ fontSize: 12, fontWeight: 700, color: s.hi ? "rgba(255,255,255,0.85)" : TEXT2 }}>{s.label}</p>
                  <p style={{ fontSize: 11, color: s.hi ? "rgba(255,255,255,0.6)" : TEXT3, marginTop: 2 }}>{s.sub}{s.clickTab && " →"}</p>
                </div>
              ))}
            </div>

            <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 18, overflow: "hidden", marginBottom: 20 }}>
              <div style={{ padding: "16px 22px", borderBottom: `1px solid ${BORDER}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h2 style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 16, color: TEXT }}>Letzte Bestellungen</h2>
                <button onClick={() => setTab("orders")} style={{ fontSize: 12, color: ORANGE, fontWeight: 700, background: "none", border: "none", cursor: "pointer" }}>Alle ansehen →</button>
              </div>
              {orders.slice(0, 5).map((o, i) => (
                <div key={o.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 22px", borderBottom: i < 4 ? `1px solid ${BORDER}` : "none" }}>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 700, color: TEXT }}>#{o.id.slice(-8).toUpperCase()}</p>
                    <p style={{ fontSize: 11, color: TEXT3 }}>{new Date(o.created_at).toLocaleDateString("de-DE", { day: "2-digit", month: "short", year: "numeric" })}</p>
                  </div>
                  <Badge status={o.status} />
                  <p style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 15, color: TEXT }}>€{Number(o.total_price).toFixed(2)}</p>
                </div>
              ))}
            </div>

            <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 18, padding: "22px" }}>
              <h2 style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 16, color: TEXT, marginBottom: 16 }}>Bestellstatus-Verteilung</h2>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10 }}>
                {Object.entries(STATUS_CFG).map(([key, cfg]) => {
                  const count = orders.filter(o => o.status === key).length;
                  return (
                    <div key={key} style={{ background: cfg.bg, borderRadius: 12, padding: "14px", textAlign: "center" }}>
                      <p style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 24, color: cfg.color }}>{count}</p>
                      <p style={{ fontSize: 11, fontWeight: 700, color: cfg.color, marginTop: 4 }}>{cfg.label}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {/* ── SUPPLIERS ── */}
        {tab === "suppliers" && (
          <>
            <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
              <input type="text" placeholder="Name oder Unternehmens-ID suchen..." value={search} onChange={e => setSearch(e.target.value)}
                style={{ background: SURFACE, border: `1.5px solid ${BORDER}`, borderRadius: 10, padding: "10px 14px", color: TEXT, fontSize: 13, width: 380, outline: "none", fontFamily: "inherit" }}
                onFocus={e => e.currentTarget.style.borderColor = ORANGE}
                onBlur={e => e.currentTarget.style.borderColor = BORDER} />
              <span style={{ fontSize: 12, color: TEXT3, alignSelf: "center" }}>
                {suppliers.filter(s => s.verified).length} verifiziert · {suppliers.filter(s => !s.verified).length} ausstehend
              </span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {filteredSuppliers.length === 0 ? (
                <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 18, padding: "40px", textAlign: "center" }}>
                  <p style={{ color: TEXT3, fontSize: 13 }}>Keine Lieferanten gefunden.</p>
                </div>
              ) : filteredSuppliers.map(s => {
                const prodCount = products.filter(p => p.supplier_id === s.id).length;
                const hasVerifData = !!(s.legal_name || s.street);
                return (
                  <div key={s.id} style={{ background: SURFACE, border: `1.5px solid ${s.verified ? "#bbf7d0" : BORDER}`, borderRadius: 18, overflow: "hidden" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 22px", borderBottom: `1px solid ${BORDER}` }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <div style={{ width: 40, height: 40, borderRadius: 10, background: `${ORANGE}15`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 16, color: ORANGE }}>
                          {(s.name ?? "?")[0].toUpperCase()}
                        </div>
                        <div>
                          <p style={{ fontSize: 15, fontWeight: 700, color: TEXT }}>{s.name || "—"}</p>
                          {s.legal_name && <p style={{ fontSize: 12, color: TEXT3 }}>{s.legal_name}</p>}
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, padding: "4px 12px", borderRadius: 100, background: s.verified ? "#f0fdf4" : "#fff7ed", color: s.verified ? "#16a34a" : "#ea580c" }}>
                          {s.verified ? "✅ Verifiziert" : "⏳ Ausstehend"}
                        </span>
                        <span style={{ fontSize: 12, color: TEXT3 }}>{prodCount} Produkte</span>
                        <span style={{ fontSize: 12, color: TEXT3 }}>{new Date(s.created_at).toLocaleDateString("de-DE")}</span>
                      </div>
                    </div>

                    <div style={{ padding: "16px 22px", borderBottom: `1px solid ${BORDER}` }}>
                      {hasVerifData ? (
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px 24px" }}>
                          {s.street && <div><p style={{ fontSize: 10, fontWeight: 700, color: TEXT3, textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 3 }}>Adresse</p><p style={{ fontSize: 13, color: TEXT }}>{s.street}, {s.postal_code} {s.city}</p><p style={{ fontSize: 12, color: TEXT3 }}>{s.country}</p></div>}
                          {s.registration_nr && <div><p style={{ fontSize: 10, fontWeight: 700, color: TEXT3, textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 3 }}>Handelsregister</p><p style={{ fontSize: 13, color: TEXT }}>{s.registration_nr}</p></div>}
                          {s.tax_id && <div><p style={{ fontSize: 10, fontWeight: 700, color: TEXT3, textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 3 }}>USt-IdNr.</p><p style={{ fontSize: 13, color: TEXT }}>{s.tax_id}</p></div>}
                          {s.phone && <div><p style={{ fontSize: 10, fontWeight: 700, color: TEXT3, textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 3 }}>Telefon</p><p style={{ fontSize: 13, color: TEXT }}>{s.phone}</p></div>}
                          {s.website && <div><p style={{ fontSize: 10, fontWeight: 700, color: TEXT3, textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 3 }}>Website</p><a href={s.website} target="_blank" style={{ fontSize: 13, color: ORANGE, textDecoration: "none" }}>{s.website}</a></div>}
                        </div>
                      ) : (
                        <p style={{ fontSize: 12, color: TEXT3, fontStyle: "italic" }}>Noch keine Verifizierungsdaten eingereicht.</p>
                      )}
                    </div>

                    <div style={{ padding: "14px 22px", borderBottom: `1px solid ${BORDER}` }}>
                      <p style={{ fontSize: 10, fontWeight: 700, color: TEXT3, textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 10 }}>Produkte ({prodCount})</p>
                      {prodCount === 0 ? (
                        <p style={{ fontSize: 12, color: TEXT3, fontStyle: "italic" }}>Keine Produkte vorhanden.</p>
                      ) : (
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                          {products.filter(p => p.supplier_id === s.id).slice(0, 6).map(p => (
                            <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 8, background: BG, borderRadius: 10, padding: "7px 12px", border: `1px solid ${BORDER}` }}>
                              <div style={{ width: 28, height: 28, borderRadius: 6, overflow: "hidden", flexShrink: 0, background: BORDER }}>
                                <img loading="lazy" decoding="async" src={p.image_url || "https://images.unsplash.com/photo-1568702846914-96b305d2aaeb?w=60&q=50"} alt={p.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                              </div>
                              <div><p style={{ fontSize: 12, fontWeight: 600, color: TEXT }}>{p.name}</p><p style={{ fontSize: 11, color: TEXT3 }}>€{Number(p.price).toFixed(2)} · {p.stock} Stk.</p></div>
                            </div>
                          ))}
                          {prodCount > 6 && <p style={{ fontSize: 12, color: TEXT3, alignSelf: "center" }}>+{prodCount - 6} weitere</p>}
                        </div>
                      )}
                    </div>

                    <div style={{ padding: "12px 22px", display: "flex", gap: 10 }}>
                      {!s.verified ? (
                        <button onClick={async () => {
                          const { error } = await supabase.from("suppliers").update({ verified: true }).eq("id", s.id);
                          if (error) { flash(error.message, false); return; }
                          flash("Lieferant verifiziert ✅", true);
                          supabase.auth.getSession().then(({ data: { session } }) => { if (session) fetch("/api/notify", { method: "POST", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${session.access_token}` }, body: JSON.stringify({ user_id: s.user_id, type: "info", title: "✅ Ihr Konto wurde verifiziert", body: "Vendoro hat Ihr Unternehmen bestätigt. Sie können jetzt Produkte verkaufen.", link: "/supplier/dashboard/verification" }) }); });
                          fetchAll();
                        }} style={{ background: "#16a34a", color: "#fff", border: "none", borderRadius: 8, padding: "7px 16px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                          Verifizieren ✅
                        </button>
                      ) : (
                        <button onClick={async () => {
                          const { error } = await supabase.from("suppliers").update({ verified: false }).eq("id", s.id);
                          if (error) { flash(error.message, false); return; }
                          flash("Verifizierung widerrufen", true);
                          supabase.auth.getSession().then(({ data: { session } }) => { if (session) fetch("/api/notify", { method: "POST", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${session.access_token}` }, body: JSON.stringify({ user_id: s.user_id, type: "info", title: "⚠️ Verifizierung widerrufen", body: "Ihre Unternehmensverifizierung wurde vom Admin widerrufen.", link: "/supplier/dashboard/verification" }) }); });
                          fetchAll();
                        }} style={{ background: "#fef2f2", color: "#dc2626", border: "1px solid #fca5a5", borderRadius: 8, padding: "7px 16px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                          Widerrufen
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* ── BUYERS ── */}
        {tab === "buyers" && (() => {
          const buyerProfiles = profiles.filter(p => p.role !== "admin" && p.role !== "supplier");
          const supplierUserIds = new Set(suppliers.map(s => s.user_id));
          const buyers = buyerProfiles.filter(p => !supplierUserIds.has(p.id));
          const filtered = buyers.filter(b => !search || b.id.toLowerCase().includes(search.toLowerCase()));
          return (
            <>
              <div style={{ display: "flex", gap: 10, marginBottom: 16, alignItems: "center" }}>
                <input type="text" placeholder="Käufer-ID suchen..." value={search} onChange={e => setSearch(e.target.value)}
                  style={{ background: SURFACE, border: `1.5px solid ${BORDER}`, borderRadius: 10, padding: "10px 14px", color: TEXT, fontSize: 13, width: 380, outline: "none", fontFamily: "monospace" }}
                  onFocus={e => e.currentTarget.style.borderColor = ORANGE}
                  onBlur={e => e.currentTarget.style.borderColor = BORDER} />
                <span style={{ fontSize: 12, color: TEXT3 }}>{buyers.length} Käufer registriert</span>
              </div>
              <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 18, overflow: "hidden" }}>
                <div style={{ display: "grid", gridTemplateColumns: "2fr 120px 140px", padding: "10px 22px", background: BG, borderBottom: `1px solid ${BORDER}` }}>
                  {["Käufer-ID", "Rolle", "Registriert"].map(h => (
                    <p key={h} style={{ fontSize: 11, fontWeight: 700, color: TEXT3, textTransform: "uppercase", letterSpacing: "0.8px" }}>{h}</p>
                  ))}
                </div>
                {filtered.length === 0 ? (
                  <div style={{ padding: "40px", textAlign: "center" }}><p style={{ color: TEXT3, fontSize: 13 }}>Keine Käufer gefunden.</p></div>
                ) : filtered.map((b, i) => {
                  const orderCount = orders.filter(o => o.buyer_id === b.id).length;
                  const spent = orders.filter(o => o.buyer_id === b.id && ["paid","shipped","delivered"].includes(o.status)).reduce((s, o) => s + Number(o.total_price), 0);
                  return (
                    <div key={b.id} style={{ padding: "14px 22px", borderBottom: i < filtered.length - 1 ? `1px solid ${BORDER}` : "none" }}
                      onMouseEnter={e => e.currentTarget.style.background = BG}
                      onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                      <div style={{ display: "grid", gridTemplateColumns: "2fr 120px 140px", alignItems: "center", marginBottom: 8 }}>
                        <p style={{ fontFamily: "monospace", fontSize: 12, fontWeight: 700, color: TEXT, wordBreak: "break-all" }}>{b.id}</p>
                        <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 100, background: `${ORANGE}15`, color: ORANGE, width: "fit-content" }}>Käufer</span>
                        <p style={{ fontSize: 12, color: TEXT2 }}>{b.created_at ? new Date(b.created_at).toLocaleDateString("de-DE") : "—"}</p>
                      </div>
                      <div style={{ display: "flex", gap: 20 }}>
                        <p style={{ fontSize: 12, color: TEXT3 }}>🧾 {orderCount} Bestellungen</p>
                        <p style={{ fontSize: 12, color: TEXT3 }}>💶 €{spent.toFixed(2)} ausgegeben</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          );
        })()}

        {/* ── ORDERS ── */}
        {tab === "orders" && (
          <>
            <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
              <input type="text" placeholder="Bestellungs-ID suchen..." value={search} onChange={e => setSearch(e.target.value)}
                style={{ background: SURFACE, border: `1.5px solid ${BORDER}`, borderRadius: 10, padding: "10px 14px", color: TEXT, fontSize: 13, width: 260, outline: "none" }}
                onFocus={e => e.currentTarget.style.borderColor = ORANGE}
                onBlur={e => e.currentTarget.style.borderColor = BORDER} />
              <button onClick={() => setStatusFilter("all")}
                style={{ padding: "10px 16px", borderRadius: 100, border: `1.5px solid ${statusFilter === "all" ? ORANGE : BORDER}`, background: statusFilter === "all" ? `${ORANGE}15` : SURFACE, color: statusFilter === "all" ? ORANGE : TEXT2, fontWeight: 600, fontSize: 12, cursor: "pointer" }}>
                Alle ({orders.length})
              </button>
              {Object.entries(STATUS_CFG).map(([key, cfg]) => (
                <button key={key} onClick={() => setStatusFilter(key)}
                  style={{ padding: "10px 16px", borderRadius: 100, border: `1.5px solid ${statusFilter === key ? cfg.color : BORDER}`, background: statusFilter === key ? cfg.bg : SURFACE, color: statusFilter === key ? cfg.color : TEXT2, fontWeight: 600, fontSize: 12, cursor: "pointer" }}>
                  {cfg.label} ({orders.filter(o => o.status === key).length})
                </button>
              ))}
            </div>

            <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 18, overflow: "hidden" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 140px 140px 120px 200px", padding: "10px 22px", background: BG, borderBottom: `1px solid ${BORDER}` }}>
                {["Bestell-ID", "Datum", "Betrag", "Status", "Status ändern"].map(h => (
                  <p key={h} style={{ fontSize: 11, fontWeight: 700, color: TEXT3, textTransform: "uppercase", letterSpacing: "0.8px" }}>{h}</p>
                ))}
              </div>
              {filteredOrders.length === 0 ? (
                <div style={{ padding: "40px", textAlign: "center" }}><p style={{ color: TEXT3, fontSize: 13 }}>Keine Bestellungen gefunden.</p></div>
              ) : filteredOrders.map((o, i) => (
                <div key={o.id} style={{ display: "grid", gridTemplateColumns: "1fr 140px 140px 120px 200px", padding: "14px 22px", borderBottom: i < filteredOrders.length - 1 ? `1px solid ${BORDER}` : "none", alignItems: "center" }}
                  onMouseEnter={e => e.currentTarget.style.background = BG}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 700, color: TEXT, fontFamily: "'Syne',sans-serif" }}>#{o.id.slice(-8).toUpperCase()}</p>
                    <p style={{ fontSize: 11, color: TEXT3 }}>{o.buyer_id.slice(0, 8)}…</p>
                  </div>
                  <p style={{ fontSize: 12, color: TEXT2 }}>{new Date(o.created_at).toLocaleDateString("de-DE", { day: "2-digit", month: "short", year: "numeric" })}</p>
                  <p style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 15, color: TEXT }}>€{Number(o.total_price).toFixed(2)}</p>
                  <Badge status={o.status} />
                  <select value={o.status} onChange={e => updateOrderStatus(o.id, e.target.value)}
                    style={{ background: SURFACE, border: `1.5px solid ${BORDER}`, borderRadius: 8, padding: "6px 10px", color: TEXT, fontSize: 12, cursor: "pointer", outline: "none", width: "100%" }}>
                    {Object.entries(STATUS_CFG).map(([key, cfg]) => (
                      <option key={key} value={key}>{cfg.label}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </>
        )}

        {/* ── PRODUCTS ── */}
        {tab === "products" && (
          <>
            <div style={{ marginBottom: 16 }}>
              <input type="text" placeholder="Produkt suchen..." value={search} onChange={e => setSearch(e.target.value)}
                style={{ background: SURFACE, border: `1.5px solid ${BORDER}`, borderRadius: 10, padding: "10px 14px", color: TEXT, fontSize: 13, width: 320, outline: "none" }}
                onFocus={e => e.currentTarget.style.borderColor = ORANGE}
                onBlur={e => e.currentTarget.style.borderColor = BORDER} />
            </div>
            <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 18, overflow: "hidden" }}>
              <div style={{ display: "grid", gridTemplateColumns: "2fr 120px 100px 120px 80px 100px", padding: "10px 22px", background: BG, borderBottom: `1px solid ${BORDER}` }}>
                {["Produkt", "Lieferant", "Preis", "Kategorie", "Bestand", "Löschen"].map(h => (
                  <p key={h} style={{ fontSize: 11, fontWeight: 700, color: TEXT3, textTransform: "uppercase", letterSpacing: "0.8px" }}>{h}</p>
                ))}
              </div>
              {filteredProducts.length === 0 ? (
                <div style={{ padding: "40px", textAlign: "center" }}><p style={{ color: TEXT3, fontSize: 13 }}>Keine Produkte gefunden.</p></div>
              ) : filteredProducts.map((p, i) => (
                <div key={p.id} style={{ display: "grid", gridTemplateColumns: "2fr 120px 100px 120px 80px 100px", padding: "12px 22px", borderBottom: i < filteredProducts.length - 1 ? `1px solid ${BORDER}` : "none", alignItems: "center" }}
                  onMouseEnter={e => e.currentTarget.style.background = BG}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 8, overflow: "hidden", flexShrink: 0, background: BG }}>
                      <img loading="lazy" decoding="async" src={p.image_url || "https://images.unsplash.com/photo-1568702846914-96b305d2aaeb?w=80&q=60"} alt={p.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    </div>
                    <p style={{ fontSize: 13, fontWeight: 600, color: TEXT, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</p>
                  </div>
                  <p style={{ fontSize: 12, color: TEXT2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{(p.suppliers as any)?.name ?? "—"}</p>
                  <p style={{ fontSize: 13, fontWeight: 700, color: TEXT }}>€{Number(p.price).toFixed(2)}</p>
                  <p style={{ fontSize: 12, color: TEXT3 }}>{p.category ?? "—"}</p>
                  <p style={{ fontSize: 13, fontWeight: 600, color: p.stock === 0 ? "#dc2626" : TEXT }}>{p.stock}</p>
                  <button onClick={() => deleteProduct(p.id)} disabled={deletingProduct === p.id}
                    style={{ background: "#fef2f2", border: "1px solid #fca5a5", color: "#dc2626", borderRadius: 8, padding: "6px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                    {deletingProduct === p.id ? "..." : "Löschen"}
                  </button>
                </div>
              ))}
            </div>
          </>
        )}

        {/* ── SUPPORT CHAT ── */}
        {tab === "support" && (
          <div style={{ display: "flex", background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 18, overflow: "hidden", height: "calc(100vh - 252px)", minHeight: 480 }}>

            {/* Left: conversation list */}
            <div style={{ width: 280, borderRight: `1px solid ${BORDER}`, display: "flex", flexDirection: "column", flexShrink: 0 }}>
              <div style={{ padding: "16px 18px", borderBottom: `1px solid ${BORDER}` }}>
                <p style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 14, color: TEXT }}>Chats</p>
                <p style={{ fontSize: 11, color: TEXT3, marginTop: 2 }}>
                  {conversations.length} gesamt · {unreadConvs > 0 ? <span style={{ color: ORANGE, fontWeight: 700 }}>{unreadConvs} ungelesen</span> : "alle gelesen"}
                </p>
              </div>
              <div style={{ flex: 1, overflowY: "auto" }}>
                {conversations.length === 0 ? (
                  <div style={{ padding: "40px 20px", textAlign: "center" }}>
                    <p style={{ fontSize: 28, marginBottom: 8 }}>💬</p>
                    <p style={{ color: TEXT3, fontSize: 13 }}>Noch keine Chats.</p>
                  </div>
                ) : conversations.map(conv => {
                  const supplier = suppliers.find(s => s.user_id === conv.user_id);
                  const name = supplier?.name ?? (conv.user_id.slice(0, 8) + "…");
                  const role = supplier ? "Lieferant" : "Käufer";
                  const isSelected = selectedConvId === conv.id;
                  return (
                    <div key={conv.id} onClick={() => setSelectedConvId(conv.id)}
                      style={{ padding: "13px 18px", borderBottom: `1px solid ${BORDER}`, cursor: "pointer", background: isSelected ? `${ORANGE}12` : "transparent", borderLeft: isSelected ? `3px solid ${ORANGE}` : "3px solid transparent", transition: "background 0.15s" }}
                      onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = BG; }}
                      onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = "transparent"; }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          {conv.unread_for_admin && <div style={{ width: 7, height: 7, borderRadius: "50%", background: ORANGE, flexShrink: 0 }} />}
                          <p style={{ fontSize: 13, fontWeight: conv.unread_for_admin ? 700 : 500, color: TEXT, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</p>
                        </div>
                        <p style={{ fontSize: 10, color: TEXT3, flexShrink: 0, marginLeft: 6 }}>{fmtDate(conv.last_message_at)}</p>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 6 }}>
                        <p style={{ fontSize: 12, color: TEXT3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
                          {conv.last_message_text ?? "Keine Nachrichten"}
                        </p>
                        <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 100, background: `${ORANGE}15`, color: ORANGE, flexShrink: 0 }}>{role}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right: chat area */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
              {!selectedConvId ? (
                <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10 }}>
                  <p style={{ fontSize: 40 }}>💬</p>
                  <p style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 16, color: TEXT }}>Chat auswählen</p>
                  <p style={{ fontSize: 13, color: TEXT3 }}>Klick links auf einen Benutzer um den Chat zu öffnen.</p>
                </div>
              ) : (() => {
                const conv = conversations.find(c => c.id === selectedConvId);
                const supplier = suppliers.find(s => s.user_id === conv?.user_id);
                const name = supplier?.name ?? ((conv?.user_id ?? "").slice(0, 8) + "…");
                const role = supplier ? "Lieferant" : "Käufer";
                return (
                  <>
                    {/* Chat header */}
                    <div style={{ padding: "14px 20px", borderBottom: `1px solid ${BORDER}`, display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
                      <div style={{ width: 36, height: 36, borderRadius: 10, background: `${ORANGE}15`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 15, color: ORANGE, flexShrink: 0 }}>
                        {name[0]?.toUpperCase() ?? "?"}
                      </div>
                      <div>
                        <p style={{ fontSize: 14, fontWeight: 700, color: TEXT }}>{name}</p>
                        <p style={{ fontSize: 11, color: TEXT3 }}>{role} · {conv?.user_id?.slice(0, 18)}…</p>
                      </div>
                    </div>

                    {/* Messages */}
                    <div style={{ flex: 1, overflowY: "auto", padding: "20px", display: "flex", flexDirection: "column", gap: 8 }}>
                      {convMessages.length === 0 ? (
                        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <p style={{ color: TEXT3, fontSize: 13 }}>Noch keine Nachrichten.</p>
                        </div>
                      ) : convMessages.map((m, i) => {
                        const prevSame = i > 0 && convMessages[i - 1].is_admin === m.is_admin;
                        return (
                          <div key={m.id} style={{ display: "flex", justifyContent: m.is_admin ? "flex-end" : "flex-start", marginTop: prevSame ? 2 : 10 }}>
                            <div style={{ maxWidth: "72%" }}>
                              {!m.is_admin && !prevSame && <p style={{ fontSize: 11, color: TEXT3, marginBottom: 3, marginLeft: 2 }}>{name}</p>}
                              <div style={{ padding: "10px 14px", borderRadius: m.is_admin ? "16px 16px 4px 16px" : "16px 16px 16px 4px", background: m.is_admin ? ORANGE : BG, border: m.is_admin ? "none" : `1px solid ${BORDER}` }}>
                                <p style={{ fontSize: 13, color: m.is_admin ? "#fff" : TEXT, lineHeight: 1.55, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{m.message}</p>
                              </div>
                              <p style={{ fontSize: 10, color: TEXT3, marginTop: 3, textAlign: m.is_admin ? "right" : "left" }}>{fmtTime(m.created_at)}</p>
                            </div>
                          </div>
                        );
                      })}
                      <div ref={chatBottomRef} />
                    </div>

                    {/* Input */}
                    <div style={{ padding: "14px 20px", borderTop: `1px solid ${BORDER}`, display: "flex", gap: 10, flexShrink: 0 }}>
                      <input
                        value={adminInput}
                        onChange={e => setAdminInput(e.target.value)}
                        onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendAdminMessage(); } }}
                        placeholder="Antwort schreiben..."
                        style={{ flex: 1, background: BG, border: `1.5px solid ${BORDER}`, borderRadius: 10, padding: "10px 14px", color: TEXT, fontSize: 13, fontFamily: "inherit", outline: "none" }}
                        onFocus={e => e.currentTarget.style.borderColor = ORANGE}
                        onBlur={e => e.currentTarget.style.borderColor = BORDER}
                      />
                      <button onClick={sendAdminMessage} disabled={adminSending || !adminInput.trim()}
                        style={{ background: adminSending || !adminInput.trim() ? `${ORANGE}50` : ORANGE, color: "#fff", border: "none", borderRadius: 10, padding: "10px 20px", fontSize: 14, fontWeight: 700, cursor: adminSending || !adminInput.trim() ? "not-allowed" : "pointer", flexShrink: 0 }}>
                        {adminSending ? "…" : "→"}
                      </button>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        )}

      </div>
    </main>
  );
}
