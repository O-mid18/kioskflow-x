"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

const BG = "var(--kf-bg)";
const SURFACE = "var(--kf-surface)";
const BORDER = "var(--kf-border)";
const TEXT = "var(--kf-text)";
const TEXT2 = "var(--kf-text2)";
const TEXT3 = "var(--kf-text3)";
const ORANGE = "#E8521A";

export default function SupplierProfilePage() {
  const params = useParams();
  const [supplier, setSupplier] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 2500); };

  useEffect(() => {
    const fetchSupplier = async () => {
      const supplierId = String(params.id);
      const { data: supplierData } = await supabase.from("suppliers").select("*").eq("id", supplierId).single();
      setSupplier(supplierData ?? null);
      const { data: productData } = await supabase.from("products").select("*").eq("supplier_id", supplierId).gt("stock", 0).order("created_at", { ascending: false });
      setProducts(productData || []);
      setLoading(false);
    };
    fetchSupplier();
  }, [params.id]);

  const addToCart = async (productId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { window.location.href = "/login"; return; }
    await supabase.from("cart_items").insert({ user_id: user.id, product_id: productId, quantity: 1 });
    showToast("In den Warenkorb gelegt ✓");
  };

  if (loading) return (
    <main style={{ minHeight: "100vh", background: BG, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'DM Sans',system-ui,sans-serif" }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{ textAlign: "center" }}>
        <div style={{ width: 36, height: 36, border: `3px solid ${BORDER}`, borderTopColor: ORANGE, borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 14px" }} />
        <p style={{ color: TEXT3, fontSize: 13 }}>Lieferant wird geladen...</p>
      </div>
    </main>
  );

  if (!supplier) return (
    <main style={{ minHeight: "100vh", background: BG, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, fontFamily: "'DM Sans',system-ui,sans-serif" }}>
      <p style={{ fontSize: 48 }}>😭</p>
      <p style={{ color: TEXT, fontSize: 18, fontWeight: 700 }}>Lieferant nicht gefunden</p>
      <a href="/marketplace" style={{ color: ORANGE, fontWeight: 600, fontSize: 14, textDecoration: "none" }}>← Zurück zum Marktplatz</a>
    </main>
  );

  return (
    <main style={{ minHeight: "100vh", background: BG, fontFamily: "'DM Sans','Helvetica Neue',system-ui,sans-serif", color: TEXT, paddingBottom: 80 }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500;600;700&display=swap'); @keyframes spin{to{transform:rotate(360deg)}}`}</style>

      {/* Toast */}
      {toast && (
        <div style={{ position: "fixed", bottom: 90, right: 20, zIndex: 999, background: SURFACE, border: `1px solid ${BORDER}`, color: TEXT, fontSize: 13, padding: "12px 18px", borderRadius: 12, boxShadow: "0 4px 24px rgba(0,0,0,0.15)", display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ width: 18, height: 18, background: "#22c55e", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 900, color: "#fff" }}>✓</span>
          {toast}
        </div>
      )}

      {/* Header */}
      <header style={{ background: SURFACE, borderBottom: `1px solid ${BORDER}`, padding: "0 20px", height: 60, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 30, height: 30, background: ORANGE, borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 14, color: "#fff", fontFamily: "'Syne',sans-serif" }}>K</div>
          <span style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 15, color: TEXT, letterSpacing: "-0.3px" }}>KioskFlow</span>
        </div>
        <a href="/marketplace" style={{ color: TEXT2, fontSize: 13, fontWeight: 500, textDecoration: "none" }}>← Marktplatz</a>
      </header>

      {/* Supplier hero */}
      <div style={{ background: SURFACE, borderBottom: `1px solid ${BORDER}`, padding: "32px 20px" }}>
        <div style={{ maxWidth: 900, margin: "0 auto", display: "flex", alignItems: "center", gap: 20 }}>
          <div style={{ width: 72, height: 72, borderRadius: 16, overflow: "hidden", flexShrink: 0, background: BG, border: `1px solid ${BORDER}` }}>
            <img src={supplier.logo_url || "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=200&q=80"} alt={supplier.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
              <h1 style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 24, color: TEXT, letterSpacing: "-0.5px" }}>{supplier.name}</h1>
              {supplier.verified && (
                <span style={{ background: "#dcfce7", color: "#16a34a", fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 100 }}>✓ Verifiziert</span>
              )}
            </div>
            {supplier.city && <p style={{ color: TEXT3, fontSize: 13 }}>📍 {supplier.city}</p>}
            {supplier.description && <p style={{ color: TEXT2, fontSize: 14, marginTop: 8, lineHeight: 1.6 }}>{supplier.description}</p>}
          </div>
          <div style={{ textAlign: "right", flexShrink: 0 }}>
            <p style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 28, color: ORANGE }}>{products.length}</p>
            <p style={{ color: TEXT3, fontSize: 12 }}>Produkte</p>
          </div>
        </div>
      </div>

      {/* Products grid */}
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "28px 20px" }}>
        <h2 style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 20, color: TEXT, marginBottom: 20 }}>
          Produkte {products.length > 0 && <span style={{ fontSize: 13, fontWeight: 500, color: TEXT3 }}>({products.length})</span>}
        </h2>

        {products.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 0" }}>
            <p style={{ fontSize: 48, marginBottom: 12 }}>📦</p>
            <p style={{ color: TEXT2, fontSize: 15 }}>Dieser Lieferant hat noch keine Produkte gelistet.</p>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 16 }}>
            {products.map(product => {
              const img = product.image_url?.trim() ? product.image_url : "https://images.unsplash.com/photo-1568702846914-96b305d2aaeb?w=400&q=80";
              return (
                <div key={product.id} style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 16, overflow: "hidden" }}>
                  <a href={`/product/${product.id}`} style={{ display: "block", height: 160, overflow: "hidden" }}>
                    <img src={img} alt={product.name} style={{ width: "100%", height: "100%", objectFit: "cover", transition: "transform 0.3s" }}
                      onMouseEnter={e => (e.currentTarget.style.transform = "scale(1.05)")}
                      onMouseLeave={e => (e.currentTarget.style.transform = "scale(1)")} />
                  </a>
                  <div style={{ padding: "14px 16px" }}>
                    <a href={`/product/${product.id}`} style={{ textDecoration: "none" }}>
                      <p style={{ color: TEXT, fontWeight: 600, fontSize: 14, marginBottom: 8 }}>{product.name}</p>
                    </a>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <span style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 18, color: ORANGE }}>€{product.price}</span>
                      <button onClick={() => addToCart(product.id)}
                        style={{ background: ORANGE, color: "#fff", border: "none", fontSize: 12, fontWeight: 700, padding: "7px 14px", borderRadius: 8, cursor: "pointer" }}>
                        + Warenkorb
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Bottom nav */}
      <nav style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: SURFACE, borderTop: `1px solid ${BORDER}`, display: "flex", justifyContent: "space-around", padding: "10px 0 14px", zIndex: 50 }}>
        {[
          { icon: "🏪", label: "Marktplatz",  href: "/marketplace" },
          { icon: "🛒", label: "Warenkorb",   href: "/cart" },
          { icon: "📦", label: "Bestellungen", href: "/orders" },
          { icon: "💬", label: "Nachrichten", href: "/messages" },
          { icon: "🤝", label: "Profil",      href: "/profile" },
        ].map(({ icon, label, href }) => (
          <a key={label} href={href} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, textDecoration: "none", padding: "0 12px" }}>
            <span style={{ fontSize: 20, lineHeight: 1 }}>{icon}</span>
            <span style={{ fontSize: 10, fontWeight: 500, color: TEXT3 }}>{label}</span>
          </a>
        ))}
      </nav>
    </main>
  );
}
