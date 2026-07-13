"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

const BG = "var(--kf-bg)";
const SURFACE = "var(--kf-surface)";
const BORDER = "var(--kf-border)";
const TEXT = "var(--kf-text)";
const TEXT2 = "var(--kf-text2)";
const TEXT3 = "var(--kf-text3)";
const ORANGE = "#E8521A";

type WishItem = { id: string; products: { id: string; name: string; price: number; image_url: string | null; stock?: number; category?: string } };

export default function WishlistPage() {
  const [items, setItems] = useState<WishItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchWishlist(); }, []);

  const fetchWishlist = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { window.location.href = "/login"; return; }
    const { data } = await supabase.from("wishlist").select("id, products(id, name, price, image_url, stock, category)").eq("user_id", user.id);
    setItems(((data as unknown as WishItem[]) ?? []).filter(i => i.products !== null));
    setLoading(false);
  };

  const remove = async (id: string) => {
    await supabase.from("wishlist").delete().eq("id", id);
    setItems(prev => prev.filter(i => i.id !== id));
  };

  return (
    <main style={{ minHeight: "100vh", background: BG, fontFamily: "'DM Sans','Helvetica Neue',system-ui,sans-serif", color: TEXT, paddingBottom: 60 }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500;600;700&display=swap');`}</style>

      {/* Header */}
      <header style={{ background: SURFACE, borderBottom: `1px solid ${BORDER}`, padding: "0 24px", height: 60, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <a href="/marketplace" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none" }}>
          <img src="/flowio-icon.png" alt="Flowio" style={{ width: 30, height: 30, borderRadius: 7, objectFit: "cover" }} />
          <span style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 15, color: TEXT, letterSpacing: "-0.3px" }}>Flowio</span>
        </a>
        <a href="/marketplace" style={{ color: TEXT2, fontSize: 13, fontWeight: 500, textDecoration: "none" }}>← Zum Marktplatz</a>
      </header>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 24px" }}>

        {/* Hero */}
        <div style={{ background: `linear-gradient(135deg, ${ORANGE} 0%, #c4411a 100%)`, borderRadius: 20, padding: "36px 40px", marginBottom: 32, position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", top: -40, right: -40, width: 200, height: 200, borderRadius: "50%", background: "rgba(255,255,255,0.08)" }} />
          <p style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.7)", letterSpacing: "2.5px", textTransform: "uppercase", marginBottom: 10 }}>Gespeicherte Produkte</p>
          <h1 style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 32, color: "#fff", letterSpacing: "-1px", marginBottom: 8 }}>Meine Wunschliste</h1>
          <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 14 }}>Produkte, die du dir gemerkt hast.</p>
          <div style={{ display: "flex", gap: 32, marginTop: 20 }}>
            <div>
              <p style={{ fontFamily: "'Syne',sans-serif", fontSize: 28, fontWeight: 800, color: "#fff" }}>{items.length}</p>
              <p style={{ fontSize: 12, color: "rgba(255,255,255,0.6)" }}>Gespeicherte Artikel</p>
            </div>
            <div>
              <p style={{ fontFamily: "'Syne',sans-serif", fontSize: 28, fontWeight: 800, color: "#fff" }}>€{items.reduce((s, i) => s + (i.products?.price ?? 0), 0).toFixed(2)}</p>
              <p style={{ fontSize: 12, color: "rgba(255,255,255,0.6)" }}>Gesamtwert</p>
            </div>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 200 }}>
            <style>{`@keyframes spin { to { transform:rotate(360deg); } }`}</style>
            <div style={{ width: 32, height: 32, border: `3px solid ${BORDER}`, borderTopColor: ORANGE, borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
          </div>
        ) : items.length === 0 ? (
          <div style={{ textAlign: "center", padding: "80px 0" }}>
            <p style={{ fontSize: 56, marginBottom: 16 }}>❤️</p>
            <h2 style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 22, color: TEXT, marginBottom: 10 }}>Noch nichts gespeichert</h2>
            <p style={{ color: TEXT2, fontSize: 14, marginBottom: 28 }}>Entdecke Produkte und füge sie deiner Wunschliste hinzu.</p>
            <a href="/marketplace" style={{ display: "inline-block", background: ORANGE, color: "#fff", fontWeight: 700, padding: "13px 28px", borderRadius: 12, textDecoration: "none", fontSize: 14, boxShadow: "0 4px 14px rgba(232,82,26,0.25)" }}>Zum Marktplatz →</a>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 16 }}>
            {items.map(item => (
              <div key={item.id} style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 16, overflow: "hidden", transition: "box-shadow 0.2s" }}
                onMouseEnter={e => e.currentTarget.style.boxShadow = "0 6px 24px rgba(0,0,0,0.08)"}
                onMouseLeave={e => e.currentTarget.style.boxShadow = "none"}>
                <div style={{ height: 180, overflow: "hidden", background: BG }}>
                  <img
                    src={item.products?.image_url || "https://images.unsplash.com/photo-1543253687-c931c8e01820?q=80&w=600&auto=format&fit=crop"}
                    alt={item.products?.name}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    onError={e => { e.currentTarget.src = "https://images.unsplash.com/photo-1568702846914-96b305d2aaeb?w=400&q=80"; }}
                  />
                </div>
                <div style={{ padding: "14px 16px" }}>
                  <h2 style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 15, color: TEXT, marginBottom: 6, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {item.products?.name ?? "—"}
                  </h2>
                  <p style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 20, color: TEXT, marginBottom: 8 }}>
                    €{item.products?.price?.toFixed(2) ?? "—"}
                  </p>
                  {(item.products?.stock ?? 1) <= 0 && (
                    <span style={{ display:"inline-block", fontSize:11, fontWeight:700, color:"#ef4444", background:"#fef2f2", padding:"2px 8px", borderRadius:6, marginBottom:8 }}>Ausverkauft</span>
                  )}
                  <div style={{ display: "flex", gap: 8 }}>
                    <a href={`/product/${item.products?.id}`} style={{ flex: 1, background: (item.products?.stock ?? 1) <= 0 ? BORDER : ORANGE, color: (item.products?.stock ?? 1) <= 0 ? TEXT3 : "#fff", textAlign: "center", fontSize: 13, fontWeight: 700, padding: "9px", borderRadius: 9, textDecoration: "none" }}>
                      {(item.products?.stock ?? 1) <= 0 ? "Nicht verfügbar" : "Zum Produkt →"}
                    </a>
                    <button onClick={() => remove(item.id)}
                      style={{ width: 38, background: BG, border: `1px solid ${BORDER}`, color: TEXT3, borderRadius: 9, cursor: "pointer", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      ✕
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bottom nav */}
      <nav style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: SURFACE, borderTop: `1px solid ${BORDER}`, display: "flex", justifyContent: "space-around", padding: "10px 0 14px", zIndex: 50 }}>
        {[{ icon: "🏪", label: "Marktplatz", href: "/marketplace", active: false }, { icon: "🛒", label: "Warenkorb", href: "/cart", active: false }, { icon: "📦", label: "Bestellungen", href: "/orders", active: false }, { icon: "💬", label: "Nachrichten", href: "/messages", active: false }, { icon: "👤", label: "Profil", href: "/profile", active: false }].map(({ icon, label, href, active }) => (
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
