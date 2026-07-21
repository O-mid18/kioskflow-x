"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

const BG = "var(--kf-bg)";
const SURFACE = "var(--kf-surface)";
const BORDER = "var(--kf-border)";
const TEXT = "var(--kf-text)";
const TEXT2 = "var(--kf-text2)";
const TEXT3 = "var(--kf-text3)";
const ORANGE = "#2563EB";

function Stars({ rating, size = 12 }: { rating: number; size?: number }) {
  return (
    <div style={{ display: "flex", gap: 2 }}>
      {[1, 2, 3, 4, 5].map(i => (
        <svg key={i} width={size} height={size} viewBox="0 0 24 24" fill={i <= Math.round(rating) ? "#f59e0b" : "none"} stroke="#f59e0b" strokeWidth="2">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      ))}
    </div>
  );
}

export default function ProductDetailsPage() {
  const params = useParams();
  const [product, setProduct] = useState<any>(null);
  const [reviews, setReviews] = useState<any[]>([]);
  const [priceComparison, setPriceComparison] = useState<any[]>([]);
  const [comment, setComment] = useState("");
  const [rating, setRating] = useState(5);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [canReview, setCanReview] = useState(false);
  const [alreadyReviewed, setAlreadyReviewed] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const [role, setRole] = useState<string | null>(null);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 2500); };

  const loadCartCount = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from("cart_items").select("quantity").eq("user_id", user.id);
    setCartCount((data ?? []).reduce((s: number, i: any) => s + (i.quantity ?? 1), 0));
    supabase.from("profiles").select("role").eq("id", user.id).maybeSingle().then(({ data }) => setRole(data?.role ?? null));
  }, []);

  useEffect(() => {
    const fetchProduct = async () => {
      const { data } = await supabase.from("products").select("*").eq("id", String(params.id)).maybeSingle();
      setProduct(data);
      const { data: rv } = await supabase.from("reviews").select("*").eq("product_id", String(params.id)).order("created_at", { ascending: false });
      setReviews(rv ?? []);

      if (data?.name) {
        const { data: comparable } = await supabase
          .from("products")
          .select("id, price, shipping_cost, stock, suppliers(id, name)")
          .ilike("name", data.name.trim())
          .neq("id", String(params.id))
          .gt("stock", 0)
          .order("price", { ascending: true });
        setPriceComparison(comparable ?? []);
      }

      // Only verified buyers (a paid order containing this product) may leave a review
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        if ((rv ?? []).some((r: any) => r.user_id === user.id)) setAlreadyReviewed(true);
        const { data: purchase } = await supabase
          .from("order_items")
          .select("id, orders!inner(buyer_id, status)")
          .eq("product_id", String(params.id))
          .eq("orders.buyer_id", user.id)
          .eq("orders.status", "paid")
          .limit(1)
          .maybeSingle();
        setCanReview(!!purchase);
      }

      setLoading(false);
    };
    fetchProduct();
    loadCartCount();
  }, [params.id, loadCartCount]);

  const addToCart = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { window.location.href = "/login"; return; }
    const { data: existing } = await supabase.from("cart_items").select("id, quantity").eq("user_id", user.id).eq("product_id", product.id).maybeSingle();
    if (existing) {
      await supabase.from("cart_items").update({ quantity: existing.quantity + 1 }).eq("id", existing.id);
    } else {
      await supabase.from("cart_items").insert({ user_id: user.id, product_id: product.id, quantity: 1 });
    }
    await loadCartCount();
    showToast("In den Warenkorb gelegt ✓");
  };

  const submitReview = async () => {
    if (!comment.trim() || !canReview || alreadyReviewed) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { window.location.href = "/login"; return; }
    setSubmitting(true);
    const { error } = await supabase.from("reviews").insert({ product_id: product.id, user_id: user.id, rating, comment });
    if (error) { showToast("Fehler beim Speichern der Bewertung."); setSubmitting(false); return; }
    setAlreadyReviewed(true);
    const { data: rv } = await supabase.from("reviews").select("*").eq("product_id", product.id).order("created_at", { ascending: false });
    setReviews(rv ?? []);
    setComment("");
    setRating(5);
    setSubmitting(false);
    showToast("Bewertung gespeichert ✓");
  };

  const avg = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;

  if (loading) return (
    <main style={{ minHeight: "100vh", background: BG, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'DM Sans',system-ui,sans-serif" }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{ textAlign: "center" }}>
        <div style={{ width: 36, height: 36, border: `3px solid ${BORDER}`, borderTopColor: ORANGE, borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 14px" }} />
        <p style={{ color: TEXT3, fontSize: 13 }}>Produkt wird geladen...</p>
      </div>
    </main>
  );

  if (!product) return (
    <main style={{ minHeight: "100vh", background: BG, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, fontFamily: "'DM Sans',system-ui,sans-serif" }}>
      <p style={{ fontSize: 48 }}>📦</p>
      <p style={{ color: TEXT, fontSize: 18, fontWeight: 700 }}>Produkt nicht gefunden</p>
      <a href="/marketplace" style={{ color: ORANGE, fontWeight: 600, fontSize: 14, textDecoration: "none" }}>← Zurück zum Marktplatz</a>
    </main>
  );

  return (
    <main style={{ minHeight: "100vh", background: BG, fontFamily: "'DM Sans','Helvetica Neue',system-ui,sans-serif", color: TEXT }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500;600;700&display=swap'); @keyframes spin{to{transform:rotate(360deg)}}`}</style>

      {/* Toast */}
      {toast && (
        <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 999, background: SURFACE, border: `1px solid ${BORDER}`, color: TEXT, fontSize: 13, padding: "12px 18px", borderRadius: 12, display: "flex", alignItems: "center", gap: 8, boxShadow: "0 4px 24px rgba(0,0,0,0.15)" }}>
          <span style={{ width: 18, height: 18, background: "#22c55e", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 900, color: "#fff" }}>✓</span>
          {toast}
        </div>
      )}

      {/* Header */}
      <header style={{ background: SURFACE, borderBottom: `1px solid ${BORDER}`, padding: "0 20px", height: 60, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <img src="/flowio-icon.png" alt="Flowio" style={{ width: 30, height: 30, borderRadius: 7, objectFit: "cover" }} />
          <span style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 15, color: TEXT, letterSpacing: "-0.3px" }}>Flowio</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {role === "admin" && <a href="/owner/dashboard" title="Owner-Panel" style={{ background:`${ORANGE}15`, color:ORANGE, fontWeight:700, fontSize:13, textDecoration:"none", padding:"7px 12px", borderRadius:9 }}>🏛️</a>}
          {role === "supplier" && <a href="/supplier/dashboard" title="Lieferanten-Dashboard" style={{ background:`${ORANGE}15`, color:ORANGE, fontWeight:700, fontSize:13, textDecoration:"none", padding:"7px 12px", borderRadius:9 }}>📦</a>}
          <a href="/cart" style={{ position: "relative", display: "flex", alignItems: "center", gap: 6, background: ORANGE, color: "#fff", fontWeight: 700, fontSize: 13, textDecoration: "none", padding: "7px 14px", borderRadius: 9 }}>
            🛒 Warenkorb
            {cartCount > 0 && (
              <span style={{ background: "#fff", color: ORANGE, fontSize: 10, fontWeight: 900, borderRadius: "50%", width: 18, height: 18, display: "flex", alignItems: "center", justifyContent: "center" }}>{cartCount}</span>
            )}
          </a>
        </div>
      </header>

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "32px 20px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 40 }}>

          {/* LEFT — image */}
          <div style={{ borderRadius: 20, overflow: "hidden", background: SURFACE, border: `1px solid ${BORDER}`, aspectRatio: "1", position: "relative" }}>
            <img
              src={product.image_url || "https://images.unsplash.com/photo-1568702846914-96b305d2aaeb?w=800&q=80"}
              alt={product.name}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          </div>

          {/* RIGHT — details */}
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, color: TEXT3, letterSpacing: "2px", textTransform: "uppercase", marginBottom: 8 }}>{product.category || "Produkt"}</p>
            <h1 style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 28, color: TEXT, letterSpacing: "-0.8px", lineHeight: 1.15, marginBottom: 16 }}>{product.name}</h1>

            {reviews.length > 0 && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                <Stars rating={avg} size={14} />
                <span style={{ color: TEXT2, fontSize: 13 }}>{avg.toFixed(1)} ({reviews.length} Bewertungen)</span>
              </div>
            )}

            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 36, fontWeight: 800, color: ORANGE }}>€{product.price}</span>
              <span style={{ color: TEXT3, fontSize: 13 }}>/Stück</span>
            </div>
            {(product as any).shipping_cost > 0 && (
              <p style={{ fontSize: 13, color: TEXT3, marginBottom: 16 }}>+ €{(product as any).shipping_cost} Versand (einmalig, unabhängig von der Menge)</p>
            )}

            {product.stock !== undefined && (
              <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: product.stock > 0 ? "#dcfce7" : "#fee2e2", borderRadius: 8, padding: "5px 12px", marginBottom: 20 }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: product.stock > 0 ? "#16a34a" : "#ef4444" }} />
                <span style={{ color: product.stock > 0 ? "#16a34a" : "#ef4444", fontSize: 12, fontWeight: 600 }}>
                  {product.stock > 0 ? `${product.stock} auf Lager` : "Nicht auf Lager"}
                </span>
              </div>
            )}

            {product.description && (
              <p style={{ color: TEXT2, fontSize: 14, lineHeight: 1.8, marginBottom: 28 }}>{product.description}</p>
            )}

            <button onClick={addToCart} style={{ width: "100%", background: ORANGE, color: "#fff", border: "none", borderRadius: 14, padding: "16px", fontWeight: 700, fontSize: 15, cursor: "pointer", fontFamily: "'DM Sans',sans-serif", marginBottom: 10 }}>
              🛒 In den Warenkorb
            </button>
            <a href="/marketplace" style={{ display: "block", textAlign: "center", color: TEXT2, fontSize: 13, textDecoration: "none", padding: "10px", fontWeight: 500 }}>
              ← Weiter einkaufen
            </a>

            {priceComparison.length > 0 && (
              <div style={{ marginTop: 20, background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 14, padding: 18 }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: TEXT, marginBottom: 12 }}>💶 Preisvergleich – auch erhältlich bei:</p>
                {priceComparison.map((p: any) => {
                  const totalHere = product.price + (product.shipping_cost ?? 0);
                  const totalThere = p.price + (p.shipping_cost ?? 0);
                  const cheaper = totalThere < totalHere;
                  return (
                    <a key={p.id} href={`/product/${p.id}`} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: `1px solid ${BORDER}`, textDecoration: "none" }}>
                      <div>
                        <p style={{ fontSize: 13, color: TEXT, fontWeight: 600 }}>{p.suppliers?.name ?? "Lieferant"}</p>
                        {(p.shipping_cost ?? 0) > 0 && <p style={{ fontSize: 11, color: TEXT3 }}>+ €{p.shipping_cost} Versand</p>}
                      </div>
                      <span style={{ fontSize: 15, fontWeight: 800, color: cheaper ? "#16a34a" : TEXT }}>
                        €{totalThere.toFixed(2)}{cheaper && " ✓"}
                      </span>
                    </a>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Reviews section */}
        <div style={{ marginTop: 52, borderTop: `1px solid ${BORDER}`, paddingTop: 40 }}>
          <h2 style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 22, color: TEXT, marginBottom: 28 }}>
            Bewertungen {reviews.length > 0 && <span style={{ fontSize: 14, fontWeight: 500, color: TEXT3 }}>({reviews.length})</span>}
          </h2>

          {/* Leave review — only for verified buyers */}
          {canReview && !alreadyReviewed ? (
            <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 16, padding: 24, marginBottom: 32 }}>
              <p style={{ fontWeight: 700, fontSize: 14, color: TEXT, marginBottom: 16 }}>Bewertung schreiben</p>

              {/* Star selector */}
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 14 }}>
                <span style={{ color: TEXT2, fontSize: 13, marginRight: 4 }}>Sterne:</span>
                {[1, 2, 3, 4, 5].map(n => (
                  <button key={n} onClick={() => setRating(n)} style={{ background: "none", border: "none", cursor: "pointer", padding: 2 }}>
                    <svg width={22} height={22} viewBox="0 0 24 24" fill={n <= rating ? "#f59e0b" : "none"} stroke="#f59e0b" strokeWidth="2">
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                    </svg>
                  </button>
                ))}
                <span style={{ color: TEXT3, fontSize: 12, marginLeft: 4 }}>{rating}/5</span>
              </div>

              <textarea value={comment} onChange={e => setComment(e.target.value)} placeholder="Deine Bewertung..." rows={4} maxLength={1000}
                style={{ width: "100%", background: BG, border: `1.5px solid ${BORDER}`, borderRadius: 10, padding: "10px 14px", color: TEXT, fontSize: 14, fontFamily: "inherit", resize: "none", boxSizing: "border-box", outline: "none", marginBottom: 12 }}
                onFocus={e => e.currentTarget.style.borderColor = ORANGE}
                onBlur={e => e.currentTarget.style.borderColor = BORDER} />

              <button onClick={submitReview} disabled={submitting || !comment.trim()} style={{ background: submitting || !comment.trim() ? TEXT3 : ORANGE, color: "#fff", border: "none", borderRadius: 10, padding: "11px 22px", fontWeight: 700, fontSize: 14, cursor: submitting || !comment.trim() ? "not-allowed" : "pointer", fontFamily: "'DM Sans',sans-serif" }}>
                {submitting ? "Wird gespeichert..." : "Bewertung abgeben ⭐"}
              </button>
            </div>
          ) : alreadyReviewed ? (
            <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 16, padding: 20, marginBottom: 32 }}>
              <p style={{ color: TEXT2, fontSize: 13 }}>✓ Du hast dieses Produkt bereits bewertet.</p>
            </div>
          ) : (
            <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 16, padding: 20, marginBottom: 32 }}>
              <p style={{ color: TEXT2, fontSize: 13 }}>Nur Käufer mit einer bezahlten Bestellung können dieses Produkt bewerten.</p>
            </div>
          )}

          {/* Review list */}
          {reviews.length === 0 ? (
            <div style={{ textAlign: "center", padding: "48px 0" }}>
              <p style={{ fontSize: 40, marginBottom: 10 }}>⭐</p>
              <p style={{ color: TEXT3, fontSize: 14 }}>Noch keine Bewertungen. Sei der Erste!</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {reviews.map(r => (
                <div key={r.id} style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 14, padding: "16px 20px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                    <Stars rating={r.rating} />
                    <span style={{ fontFamily: "'DM Sans',sans-serif", fontWeight: 700, fontSize: 13, color: TEXT }}>{r.rating}/5</span>
                    <span style={{ color: TEXT3, fontSize: 11, marginLeft: "auto" }}>{new Date(r.created_at).toLocaleDateString("de-DE")}</span>
                  </div>
                  {r.comment && <p style={{ color: TEXT2, fontSize: 14, lineHeight: 1.7 }}>{r.comment}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
