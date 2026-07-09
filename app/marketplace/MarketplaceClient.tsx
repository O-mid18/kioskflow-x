"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { NotificationBell } from "@/components/ui/notification-bell";
import { CATEGORY_MAP, DEFAULT_CATEGORY } from "@/lib/categories";

interface Product { id: number; name: string; description?: string; price: number; category?: string; image_url?: string; stock?: number; supplier_id?: number; }
interface Supplier { id: number; name: string; description?: string; logo_url?: string; }
interface Review { id: number; product_id: number; rating: number; comment?: string; }
interface CartItem extends Product { quantity: number; }

const CATS: Record<string, { color: string; bg: string; emoji: string }> = {
  ...CATEGORY_MAP,
  default: DEFAULT_CATEGORY,
};

const BG = "var(--kf-bg)";
const SURFACE = "var(--kf-surface)";
const BORDER = "var(--kf-border)";
const TEXT = "var(--kf-text)";
const TEXT2 = "var(--kf-text2)";
const TEXT3 = "var(--kf-text3)";
const ORANGE = "#E8521A";

function Toast({ msg, onClose }: { msg: string; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 2200); return () => clearTimeout(t); }, [onClose]);
  return (
    <div style={{ position:"fixed", bottom:90, right:20, zIndex:999, background:"var(--kf-toast-bg)", color:"var(--kf-toast-fg)", fontSize:13, padding:"12px 18px", borderRadius:12, display:"flex", alignItems:"center", gap:8, boxShadow:"0 4px 24px rgba(0,0,0,0.15)" }}>
      <span style={{ width:18, height:18, background:"#22c55e", borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", fontSize:9, fontWeight:900 }}>✓</span>
      {msg}
    </div>
  );
}

function Stars({ rating, size = 10 }: { rating: number; size?: number }) {
  return (
    <div style={{ display:"flex", gap:1 }}>
      {[1,2,3,4,5].map(i => (
        <svg key={i} width={size} height={size} viewBox="0 0 24 24" fill={i <= Math.round(rating) ? "#f59e0b" : "none"} stroke="#f59e0b" strokeWidth="2">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
        </svg>
      ))}
    </div>
  );
}

function CartDrawer({ open, onClose, items, onUpdateQty, onRemove, onClearAll }: {
  open:boolean; onClose:()=>void; items:CartItem[];
  onUpdateQty:(id:number,qty:number)=>void; onRemove:(id:number)=>void; onClearAll:()=>void;
}) {
  const total = items.reduce((s,i) => s+i.price*i.quantity, 0);
  return (
    <>
      {open && <div onClick={onClose} style={{ position:"fixed", inset:0, background:"rgba(26,23,20,0.4)", zIndex:90, backdropFilter:"blur(4px)" }} />}
      <div style={{ position:"fixed", top:0, right:0, height:"100%", width:360, background:SURFACE, zIndex:100, display:"flex", flexDirection:"column", transform:open?"translateX(0)":"translateX(100%)", transition:"transform 0.3s cubic-bezier(0.4,0,0.2,1)", borderLeft:`1px solid ${BORDER}`, boxShadow:"-8px 0 40px rgba(0,0,0,0.08)" }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"20px 24px", borderBottom:`1px solid ${BORDER}` }}>
          <div>
            <p style={{ color:TEXT, fontWeight:700, fontSize:16, fontFamily:"'Syne',sans-serif" }}>Warenkorb</p>
            <p style={{ color:TEXT3, fontSize:12, marginTop:2 }}>{items.reduce((s,i)=>s+i.quantity,0)} Artikel</p>
          </div>
          <button onClick={onClose} style={{ width:32, height:32, background:BG, border:`1px solid ${BORDER}`, borderRadius:8, cursor:"pointer", color:TEXT2, fontSize:14 }}>✕</button>
        </div>
        <div style={{ flex:1, overflowY:"auto", padding:"12px 24px" }}>
          {items.length === 0 ? (
            <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", height:"60%", gap:12 }}>
              <span style={{ fontSize:48 }}>🛒</span>
              <p style={{ color:TEXT3, fontSize:13 }}>Warenkorb ist leer</p>
            </div>
          ) : items.map(item => (
            <div key={item.id} style={{ display:"flex", alignItems:"center", gap:12, padding:"14px 0", borderBottom:`1px solid ${BORDER}` }}>
              <div style={{ width:52, height:52, borderRadius:10, overflow:"hidden", flexShrink:0, background:BG }}>
                <img loading="lazy" decoding="async" src={item.image_url || "https://images.unsplash.com/photo-1568702846914-96b305d2aaeb?w=200&q=80"} alt={item.name} style={{ width:"100%", height:"100%", objectFit:"cover" }} onError={e => { (e.currentTarget as HTMLImageElement).src = "https://images.unsplash.com/photo-1568702846914-96b305d2aaeb?w=400&q=80"; }} />
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <p style={{ color:TEXT, fontSize:13, fontWeight:600, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{item.name}</p>
                <p style={{ color:ORANGE, fontSize:12, fontWeight:700, marginTop:2 }}>€{(item.price*item.quantity).toFixed(2)}</p>
              </div>
              <div style={{ display:"flex", alignItems:"center", gap:6, flexShrink:0 }}>
                <button onClick={() => onUpdateQty(item.id, item.quantity-1)} style={{ width:26, height:26, background:BG, border:`1px solid ${BORDER}`, borderRadius:6, color:TEXT, cursor:"pointer", fontWeight:700, fontSize:13 }}>−</button>
                <span style={{ color:TEXT, width:18, textAlign:"center", fontWeight:600, fontSize:13 }}>{item.quantity}</span>
                <button onClick={() => onUpdateQty(item.id, item.quantity+1)} style={{ width:26, height:26, background:ORANGE, border:"none", borderRadius:6, color:"#fff", cursor:"pointer", fontWeight:700, fontSize:13 }}>+</button>
                <button onClick={() => onRemove(item.id)} style={{ background:"none", border:"none", color:TEXT3, cursor:"pointer", fontSize:13, marginLeft:2 }}>✕</button>
              </div>
            </div>
          ))}
        </div>
        {items.length > 0 && (
          <div style={{ padding:"16px 24px", borderTop:`1px solid ${BORDER}` }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
              <span style={{ color:TEXT2, fontSize:13 }}>Gesamt</span>
              <span style={{ color:TEXT, fontSize:20, fontWeight:800, fontFamily:"'Syne',sans-serif" }}>€{total.toFixed(2)}</span>
            </div>
            <a href="/checkout" style={{ display:"block", textAlign:"center", background:ORANGE, color:"#fff", fontWeight:700, padding:"14px", borderRadius:12, textDecoration:"none", fontSize:14 }}>Zur Kasse →</a>
            <button onClick={onClearAll} style={{ width:"100%", marginTop:8, background:"none", border:"none", color:TEXT3, fontSize:12, cursor:"pointer", padding:"6px" }}>Warenkorb leeren</button>
          </div>
        )}
      </div>
    </>
  );
}

function ProductModal({ product, reviews, onClose, onAddToCart, inWishlist, onToggleWishlist, onNegotiate }: {
  product:Product; reviews:Review[]; onClose:()=>void; onAddToCart:(p:Product)=>void;
  inWishlist:boolean; onToggleWishlist:(p:Product)=>void; onNegotiate:(p:Product)=>void;
}) {
  const avg = reviews.length ? reviews.reduce((s,r) => s+r.rating,0)/reviews.length : 0;
  const cat = CATS[product.category || ""] || CATS.default;
  return (
    <div onClick={onClose} style={{ position:"fixed", inset:0, background:"rgba(26,23,20,0.5)", zIndex:150, display:"flex", alignItems:"flex-end", justifyContent:"center", backdropFilter:"blur(8px)" }}>
      <div onClick={e => e.stopPropagation()} style={{ background:SURFACE, borderRadius:"24px 24px 0 0", width:"100%", maxWidth:560, maxHeight:"90vh", overflowY:"auto", boxShadow:"0 -20px 60px rgba(0,0,0,0.15)" }}>
        <div style={{ position:"relative", height:280, overflow:"hidden", borderRadius:"24px 24px 0 0" }}>
          <img loading="lazy" decoding="async" src={product.image_url || "https://images.unsplash.com/photo-1568702846914-96b305d2aaeb?w=800&q=80"} alt={product.name} style={{ width:"100%", height:"100%", objectFit:"cover" }} onError={e => { (e.currentTarget as HTMLImageElement).src = "https://images.unsplash.com/photo-1568702846914-96b305d2aaeb?w=400&q=80"; }} />
          <div style={{ position:"absolute", inset:0, background:"linear-gradient(to top,rgba(0,0,0,0.3),transparent 50%)" }} />
          <button onClick={onClose} style={{ position:"absolute", top:16, left:16, width:36, height:36, background:"rgba(255,255,255,0.9)", border:"none", borderRadius:"50%", cursor:"pointer", fontSize:16, display:"flex", alignItems:"center", justifyContent:"center" }}>←</button>
          <button onClick={() => onToggleWishlist(product)} style={{ position:"absolute", top:16, right:16, width:36, height:36, background:"rgba(255,255,255,0.9)", border:"none", borderRadius:"50%", cursor:"pointer", fontSize:16, display:"flex", alignItems:"center", justifyContent:"center" }}>
            {inWishlist ? "❤️" : "🤍"}
          </button>
          {product.category && (
            <span style={{ position:"absolute", bottom:16, left:16, background:cat.color, color:"#fff", fontSize:10, fontWeight:700, padding:"4px 10px", borderRadius:100 }}>{cat.emoji} {product.category}</span>
          )}
        </div>
        <div style={{ padding:"24px 24px 32px" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:8 }}>
            <h2 style={{ fontFamily:"'Syne',sans-serif", color:TEXT, fontWeight:800, fontSize:22, letterSpacing:"-0.5px", flex:1, marginRight:12 }}>{product.name}</h2>
            <span style={{ fontFamily:"'Syne',sans-serif", color:ORANGE, fontSize:24, fontWeight:800, flexShrink:0 }}>€{product.price}</span>
          </div>
          {reviews.length > 0 && (
            <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:12 }}>
              <Stars rating={avg} size={13} />
              <span style={{ color:TEXT2, fontSize:12 }}>{avg.toFixed(1)} ({reviews.length} Bewertungen)</span>
            </div>
          )}
          {product.description && <p style={{ color:TEXT2, fontSize:14, lineHeight:1.7, marginBottom:20 }}>{product.description}</p>}
          {product.stock !== undefined && (
            <div style={{ display:"inline-flex", alignItems:"center", gap:6, background:product.stock > 0 ? "#dcfce7" : "#fef2f2", borderRadius:8, padding:"5px 10px", marginBottom:20 }}>
              <div style={{ width:6, height:6, borderRadius:"50%", background:product.stock > 0 ? "#16a34a" : "#ef4444" }} />
              <span style={{ color:product.stock > 0 ? "#16a34a" : "#ef4444", fontSize:12, fontWeight:600 }}>{product.stock > 0 ? `${product.stock} auf Lager` : "Nicht auf Lager"}</span>
            </div>
          )}
          <button onClick={() => { if ((product.stock ?? 0) > 0) { onAddToCart(product); onClose(); } }}
            disabled={(product.stock ?? 0) <= 0}
            style={{ width:"100%", background:(product.stock ?? 0) <= 0 ? BORDER : ORANGE, color:(product.stock ?? 0) <= 0 ? TEXT3 : "#fff", fontWeight:700, padding:"16px", borderRadius:14, border:"none", cursor:(product.stock ?? 0) <= 0 ? "not-allowed" : "pointer", fontSize:15, fontFamily:"'DM Sans',sans-serif", marginBottom:10 }}>
            {(product.stock ?? 0) <= 0 ? "Ausverkauft" : "In den Warenkorb"}
          </button>
          <button onClick={() => { onNegotiate(product); onClose(); }} style={{ width:"100%", background:"transparent", color:ORANGE, fontWeight:700, padding:"14px", borderRadius:14, border:`2px solid ${ORANGE}`, cursor:"pointer", fontSize:14, fontFamily:"'DM Sans',sans-serif", display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
            🤝 Preis verhandeln
          </button>
        </div>
      </div>
    </div>
  );
}

function OfferModal({ product, onClose, onSent }: { product: Product; onClose: () => void; onSent: () => void; }) {
  const [qty, setQty]      = useState("1");
  const [price, setPrice]  = useState("");
  const [note, setNote]    = useState("");
  const [sending, setSend] = useState(false);
  const [err, setErr]      = useState("");

  const send = async () => {
    if (!price || !qty || Number(qty) < 1) { setErr("Bitte Menge und Angebotspreis angeben."); return; }
    setSend(true);
    setErr("");
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { window.location.href = "/login"; return; }

    const { data: supplier } = await supabase.from("suppliers").select("user_id").eq("id", product.supplier_id).maybeSingle();
    if (!supplier?.user_id) { setErr("Lieferant nicht gefunden."); setSend(false); return; }

    const { data: conv } = await supabase.from("conversations")
      .upsert({ buyer_id: user.id, supplier_id: supplier.user_id }, { onConflict: "buyer_id,supplier_id" })
      .select().maybeSingle();
    if (!conv) { setErr("Fehler beim Erstellen der Unterhaltung."); setSend(false); return; }

    const content = [
      `🤝 Preisangebot`,
      `📦 Produkt: ${product.name}`,
      `🔢 Menge: ${qty} Stück`,
      `💶 Mein Angebot: €${price}/Stück  (Listenpreis: €${product.price})`,
      note ? `📝 ${note}` : null,
    ].filter(Boolean).join("\n");

    await supabase.from("messages").insert({ conversation_id: conv.id, sender_id: user.id, content });
    setSend(false);
    onSent();
    window.location.href = "/messages";
  };

  return (
    <>
      <div onClick={onClose} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.55)", zIndex:200, backdropFilter:"blur(6px)" }} />
      <div style={{ position:"fixed", top:"50%", left:"50%", transform:"translate(-50%,-50%)", background:SURFACE, border:`1px solid ${BORDER}`, borderRadius:20, padding:28, width:360, zIndex:201, fontFamily:"'DM Sans',sans-serif" }}>

        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20 }}>
          <div>
            <p style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:17, color:TEXT }}>Preis verhandeln</p>
            <p style={{ fontSize:12, color:TEXT3, marginTop:2 }}>{product.name}</p>
          </div>
          <button onClick={onClose} style={{ width:30, height:30, background:BG, border:`1px solid ${BORDER}`, borderRadius:8, cursor:"pointer", color:TEXT2, fontSize:14 }}>✕</button>
        </div>

        <div style={{ background:`${ORANGE}12`, border:`1px solid ${ORANGE}30`, borderRadius:10, padding:"8px 12px", marginBottom:18, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <span style={{ fontSize:12, color:TEXT2 }}>Listenpreis</span>
          <span style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:16, color:ORANGE }}>€{product.price}<span style={{ fontSize:11, fontWeight:500, color:TEXT3 }}>/Stück</span></span>
        </div>

        <label style={{ display:"block", fontSize:12, fontWeight:700, color:TEXT2, marginBottom:6 }}>Menge (Stück)</label>
        <input type="number" min="1" value={qty} onChange={e => setQty(e.target.value)} placeholder="z.B. 50"
          style={{ width:"100%", background:BG, border:`1.5px solid ${BORDER}`, borderRadius:10, padding:"10px 14px", color:TEXT, fontSize:14, boxSizing:"border-box", marginBottom:14, fontFamily:"inherit", outline:"none" }}
          onFocus={e => e.currentTarget.style.borderColor = ORANGE}
          onBlur={e => e.currentTarget.style.borderColor = BORDER} />

        <label style={{ display:"block", fontSize:12, fontWeight:700, color:TEXT2, marginBottom:6 }}>Mein Angebot (€/Stück)</label>
        <div style={{ position:"relative", marginBottom:14 }}>
          <span style={{ position:"absolute", left:13, top:"50%", transform:"translateY(-50%)", color:TEXT3, fontSize:14, fontWeight:600 }}>€</span>
          <input type="number" min="0" step="0.01" value={price} onChange={e => setPrice(e.target.value)} placeholder="z.B. 1.20"
            style={{ width:"100%", background:BG, border:`1.5px solid ${BORDER}`, borderRadius:10, padding:"10px 14px 10px 28px", color:TEXT, fontSize:14, boxSizing:"border-box", fontFamily:"inherit", outline:"none" }}
            onFocus={e => e.currentTarget.style.borderColor = ORANGE}
            onBlur={e => e.currentTarget.style.borderColor = BORDER} />
        </div>

        {price && Number(price) < product.price && (
          <div style={{ background:"#dcfce7", borderRadius:8, padding:"6px 12px", marginBottom:14, display:"flex", alignItems:"center", gap:6 }}>
            <span style={{ fontSize:13 }}>💡</span>
            <span style={{ fontSize:12, color:"#16a34a", fontWeight:600 }}>
              {((1 - Number(price) / product.price) * 100).toFixed(0)}% unter Listenpreis
            </span>
          </div>
        )}

        <label style={{ display:"block", fontSize:12, fontWeight:700, color:TEXT2, marginBottom:6 }}>Nachricht (optional)</label>
        <textarea value={note} onChange={e => setNote(e.target.value)} placeholder="z.B. Ich bestelle regelmäßig und suche einen Stammlieferanten..." rows={3}
          style={{ width:"100%", background:BG, border:`1.5px solid ${BORDER}`, borderRadius:10, padding:"10px 14px", color:TEXT, fontSize:13, boxSizing:"border-box", resize:"none", fontFamily:"inherit", outline:"none", marginBottom:16 }}
          onFocus={e => e.currentTarget.style.borderColor = ORANGE}
          onBlur={e => e.currentTarget.style.borderColor = BORDER} />

        {err && <p style={{ color:"#ef4444", fontSize:12, marginBottom:12 }}>{err}</p>}

        <button onClick={send} disabled={sending} style={{ width:"100%", background:sending ? TEXT3 : ORANGE, color:"#fff", border:"none", borderRadius:12, padding:"14px", fontWeight:700, fontSize:14, cursor:sending ? "not-allowed" : "pointer", fontFamily:"'DM Sans',sans-serif" }}>
          {sending ? "Wird gesendet..." : "🤝 Angebot absenden"}
        </button>
        <p style={{ fontSize:11, color:TEXT3, textAlign:"center", marginTop:10 }}>
          Das Angebot erscheint als Nachricht beim Lieferanten.
        </p>
      </div>
    </>
  );
}

export default function MarketplacePage({ initialProducts = [], initialSuppliers = [], initialReviews = [] }: { initialProducts?: any[]; initialSuppliers?: any[]; initialReviews?: any[]; }) {
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [suppliers, setSuppliers] = useState<Supplier[]>(initialSuppliers);
  const [reviews, setReviews] = useState<Review[]>(initialReviews);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("Alle");
  const [sortBy, setSortBy] = useState("default");
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const [inStockOnly, setInStockOnly] = useState(false);
  const [loading, setLoading] = useState(initialProducts.length === 0);
  const [user, setUser] = useState<any>(null);
  const [toast, setToast] = useState<string|null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product|null>(null);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [wishlist, setWishlist] = useState<Product[]>([]);
  const [offerProduct, setOfferProduct] = useState<Product|null>(null);
  const [visibleCount, setVisibleCount] = useState(20);

  const showToast = useCallback((msg:string) => { setToast(msg); setTimeout(() => setToast(null),2500); },[]);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      const user = data.user ?? null;
      setUser(user);
      if (user) {
        const { data: wl } = await supabase.from("wishlist").select("products(id, name, price, image_url, stock, category, supplier_id)").eq("user_id", user.id);
        if (wl) setWishlist((wl as any[]).map(w => w.products).filter(Boolean));
      }
    });
    if (initialProducts.length === 0) {
      Promise.all([
        supabase.from("products").select("*"),
        supabase.from("suppliers").select("*"),
        supabase.from("reviews").select("*"),
      ]).then(([p,s,r]) => { setProducts(p.data||[]); setSuppliers(s.data||[]); setReviews(r.data||[]); setLoading(false); });
    }
  },[]);

  const addToCart = useCallback(async (product: Product) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: existing } = await supabase.from("cart_items").select("id, quantity").eq("user_id", user.id).eq("product_id", product.id).maybeSingle();
      if (existing) {
        await supabase.from("cart_items").update({ quantity: existing.quantity + 1 }).eq("id", existing.id);
      } else {
        await supabase.from("cart_items").insert({ user_id: user.id, product_id: product.id, quantity: 1 });
      }
    }
    setCartItems(prev => {
      const existing = prev.find(i => i.id === product.id);
      if (existing) return prev.map(i => i.id === product.id ? {...i, quantity: i.quantity+1} : i);
      return [...prev, {...product, quantity:1}];
    });
    showToast(`${product.name} hinzugefügt`);
    setCartOpen(true);
  }, [showToast]);

  const updateQty = (id:number,qty:number) => { if(qty<1) return setCartItems(p=>p.filter(i=>i.id!==id)); setCartItems(p=>p.map(i=>i.id===id?{...i,quantity:qty}:i)); };
  const toggleWishlist = useCallback(async (product: Product) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { window.location.href = "/login"; return; }
    const isWishlisted = wishlist.some(w => w.id === product.id);
    if (isWishlisted) {
      setWishlist(prev => prev.filter(w => w.id !== product.id));
      await supabase.from("wishlist").delete().eq("user_id", user.id).eq("product_id", product.id);
    } else {
      setWishlist(prev => [...prev, product]);
      await supabase.from("wishlist").upsert({ user_id: user.id, product_id: product.id }, { onConflict: "user_id,product_id" });
    }
  }, [wishlist]);

  const getReviews = (id:number) => reviews.filter(r=>r.product_id===id);
  const getAvg = (id:number) => { const r=getReviews(id); return r.length?r.reduce((s,r)=>s+r.rating,0)/r.length:0; };
  const wishlistedIds = wishlist.map(w=>w.id);
  const cartCount = cartItems.reduce((s,i)=>s+i.quantity,0);
  const categories = ["Alle",...Array.from(new Set(products.map(p=>p.category).filter(Boolean))) as string[]];

  const hasActiveFilter = search || category !== "Alle" || priceMin || priceMax || inStockOnly || sortBy !== "default";
  const clearFilters = () => { setSearch(""); setCategory("Alle"); setPriceMin(""); setPriceMax(""); setInStockOnly(false); setSortBy("default"); };

  const filtered = products
    .filter(p => {
      if (!p.name.toLowerCase().includes(search.toLowerCase())) return false;
      if (category !== "Alle" && p.category !== category) return false;
      if (priceMin && p.price < Number(priceMin)) return false;
      if (priceMax && p.price > Number(priceMax)) return false;
      if (inStockOnly && (p.stock ?? 0) <= 0) return false;
      return true;
    })
    .sort((a,b) => sortBy==="price-asc"?a.price-b.price:sortBy==="price-desc"?b.price-a.price:sortBy==="rating"?getAvg(b.id)-getAvg(a.id):0);

  return (
    <main style={{ minHeight:"100vh", background:BG, color:TEXT, fontFamily:"'DM Sans','Helvetica Neue',system-ui,sans-serif", paddingBottom:80 }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500;600;700&display=swap');
        @keyframes fadeUp { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
        .pcard { animation: fadeUp 0.35s ease both; transition: transform 0.2s, box-shadow 0.2s; }
        .pcard:hover { transform: translateY(-3px); box-shadow: 0 12px 32px rgba(0,0,0,0.1) !important; }
        input:focus, textarea:focus { outline:none; }
        ::-webkit-scrollbar { width:4px; height:4px; } ::-webkit-scrollbar-track { background:transparent; } ::-webkit-scrollbar-thumb { background:${BORDER}; border-radius:4px; }
      `}</style>

      {toast && <Toast msg={toast} onClose={() => setToast(null)} />}
      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} items={cartItems} onUpdateQty={updateQty} onRemove={id=>setCartItems(p=>p.filter(i=>i.id!==id))} onClearAll={() => setCartItems([])} />
      {selectedProduct && <ProductModal product={selectedProduct} reviews={getReviews(selectedProduct.id)} onClose={() => setSelectedProduct(null)} onAddToCart={addToCart} inWishlist={wishlistedIds.includes(selectedProduct.id)} onToggleWishlist={toggleWishlist} onNegotiate={p => { setSelectedProduct(null); setOfferProduct(p); }} />}
      {offerProduct && <OfferModal product={offerProduct} onClose={() => setOfferProduct(null)} onSent={() => { setOfferProduct(null); showToast("Angebot gesendet! ✓"); }} />}

      {/* ── HEADER ── */}
      <header style={{ background:SURFACE, borderBottom:`1px solid ${BORDER}`, padding:"14px 20px", position:"sticky", top:0, zIndex:50 }}>
        <style>{`
          @media (max-width: 640px) {
            .kf-search-bar { display: none !important; }
            .kf-wishlist-btn { display: none !important; }
            .kf-cart-label { display: none !important; }
          }
        `}</style>
        <div style={{ maxWidth:1100, margin:"0 auto", display:"flex", alignItems:"center", justifyContent:"space-between", gap:14 }}>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <div style={{ width:32, height:32, background:ORANGE, borderRadius:8, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:15, color:"#fff" }}>V</div>
            <span style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:16, color:TEXT, letterSpacing:"-0.3px" }}>Vendoro</span>
          </div>
          <div className="kf-search-bar" style={{ flex:1, maxWidth:380, position:"relative" }}>
            <svg style={{ position:"absolute", left:12, top:"50%", transform:"translateY(-50%)" }} width={14} height={14} fill="none" stroke={TEXT3} strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            <input type="text" placeholder="Produkte suchen..." value={search} onChange={e => setSearch(e.target.value)}
              style={{ width:"100%", background:BG, border:`1.5px solid ${BORDER}`, borderRadius:10, padding:"9px 14px 9px 34px", color:TEXT, fontSize:13, boxSizing:"border-box", transition:"border-color 0.2s" }}
              onFocus={e => e.currentTarget.style.borderColor=ORANGE}
              onBlur={e => e.currentTarget.style.borderColor=BORDER}
            />
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <NotificationBell />
            <a className="kf-wishlist-btn" href="/wishlist" style={{ position:"relative", display:"flex", alignItems:"center", gap:5, background:"none", border:`1.5px solid ${BORDER}`, borderRadius:10, padding:"9px 14px", color:TEXT2, fontWeight:600, fontSize:13, textDecoration:"none", cursor:"pointer" }}>
              ❤️
              {wishlist.length > 0 && <span style={{ background:ORANGE, color:"#fff", fontSize:10, fontWeight:800, padding:"1px 6px", borderRadius:100 }}>{wishlist.length}</span>}
            </a>
            <button onClick={() => setCartOpen(true)} style={{ position:"relative", display:"flex", alignItems:"center", gap:7, background:ORANGE, border:"none", borderRadius:10, padding:"9px 16px", color:"#fff", fontWeight:700, fontSize:13, cursor:"pointer", fontFamily:"'DM Sans',sans-serif" }}>
              🛒 <span className="kf-cart-label">Warenkorb</span>
              {cartCount > 0 && <span style={{ background:"rgba(0,0,0,0.2)", fontSize:11, fontWeight:800, padding:"1px 6px", borderRadius:100 }}>{cartCount}</span>}
            </button>
          </div>
        </div>
      </header>

      <div style={{ maxWidth:1100, margin:"0 auto", padding:"0 20px" }}>

        {/* ── HERO BANNER ── */}
        <div style={{ margin:"20px 0", borderRadius:20, overflow:"hidden", background:`linear-gradient(135deg, ${ORANGE} 0%, #c4411a 100%)`, padding:"32px 36px", display:"flex", justifyContent:"space-between", alignItems:"center", position:"relative" }}>
          <div style={{ position:"absolute", top:-40, right:-40, width:200, height:200, background:"rgba(255,255,255,0.08)", borderRadius:"50%" }} />
          <div style={{ position:"absolute", bottom:-60, right:80, width:150, height:150, background:"rgba(255,255,255,0.05)", borderRadius:"50%" }} />
          <div>
            <p style={{ color:"rgba(255,255,255,0.7)", fontSize:12, fontWeight:600, letterSpacing:"2px", textTransform:"uppercase", marginBottom:10 }}>Frankfurt · B2B Marktplatz</p>
            <h1 style={{ fontFamily:"'Syne',sans-serif", fontSize:"clamp(24px,3.5vw,40px)", fontWeight:800, color:"#fff", lineHeight:1.1, letterSpacing:"-1px", marginBottom:12 }}>
              Direkt vom<br/>Hersteller zu dir.
            </h1>
            <p style={{ color:"rgba(255,255,255,0.7)", fontSize:14, marginBottom:20 }}>Keine Mindestmengen. Keine Zwischenhändler.</p>
            <a href="/signup" style={{ display:"inline-block", background:"#fff", color:ORANGE, fontWeight:700, padding:"11px 22px", borderRadius:10, textDecoration:"none", fontSize:14 }}>Kostenlos starten →</a>
          </div>
          <div style={{ display:"flex", gap:32, flexShrink:0, position:"relative" }}>
            {[{v:"500+",l:"Kioske"},{v:"50+",l:"Marken"},{v:"24h",l:"Lieferung"}].map(({ v, l }) => (
              <div key={l} style={{ textAlign:"center" }}>
                <p style={{ fontFamily:"'Syne',sans-serif", fontSize:26, fontWeight:800, color:"#fff", letterSpacing:"-0.5px" }}>{v}</p>
                <p style={{ fontSize:11, color:"rgba(255,255,255,0.6)", marginTop:3 }}>{l}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── CATEGORIES ── */}
        <div style={{ display:"flex", gap:10, overflowX:"auto", padding:"4px 0 12px", scrollbarWidth:"none" }}>
          {categories.map(cat => {
            const s = CATS[cat] || CATS.default;
            const active = category === cat;
            return (
              <button key={cat} onClick={() => setCategory(cat)} style={{ flexShrink:0, display:"flex", alignItems:"center", gap:6, padding:"8px 16px", borderRadius:100, border:`1.5px solid ${active ? s.color : BORDER}`, background: active ? s.bg : SURFACE, cursor:"pointer", transition:"all 0.2s" }}>
                <span style={{ fontSize:14 }}>{cat === "Alle" ? "🏪" : s.emoji}</span>
                <span style={{ fontSize:13, fontWeight:active?700:500, color:active?s.color:TEXT2, whiteSpace:"nowrap" }}>{cat}</span>
              </button>
            );
          })}
          <select value={sortBy} onChange={e => setSortBy(e.target.value)} style={{ flexShrink:0, marginLeft:"auto", background:SURFACE, border:`1.5px solid ${BORDER}`, borderRadius:100, padding:"8px 14px", color:TEXT, fontSize:13, cursor:"pointer" }}>
            <option value="default">Sortieren</option>
            <option value="price-asc">Preis ↑</option>
            <option value="price-desc">Preis ↓</option>
            <option value="rating">Bewertung</option>
          </select>
        </div>


        {/* ── FEATURED ── */}
        {!loading && products.length > 0 && (
          <div style={{ marginBottom:28 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
              <h2 style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:17, color:TEXT }}>Featured Products</h2>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))", gap:14 }}>
              {products.slice(0,3).map(p => {
                const cat = CATS[p.category||""] || CATS.default;
                return (
                  <div key={p.id} onClick={() => { if (p.supplier_id) window.location.href = `/supplier/${p.supplier_id}`; }} style={{ position:"relative", height:200, borderRadius:16, overflow:"hidden", cursor:"pointer" }}>
                    <img loading="lazy" decoding="async" src={p.image_url||"https://images.unsplash.com/photo-1568702846914-96b305d2aaeb?w=600&q=80"} alt={p.name} style={{ width:"100%", height:"100%", objectFit:"cover", transition:"transform 0.4s" }}
                      onMouseEnter={e => e.currentTarget.style.transform="scale(1.05)"}
                      onMouseLeave={e => e.currentTarget.style.transform="scale(1)"}
                      onError={e => { (e.currentTarget as HTMLImageElement).src = "https://images.unsplash.com/photo-1568702846914-96b305d2aaeb?w=400&q=80"; }} />
                    <div style={{ position:"absolute", inset:0, background:"linear-gradient(to top,rgba(0,0,0,0.65) 0%,transparent 60%)" }} />
                    <div style={{ position:"absolute", bottom:0, left:0, right:0, padding:"16px" }}>
                      <span style={{ background:cat.color, color:"#fff", fontSize:9, fontWeight:800, padding:"3px 8px", borderRadius:100, marginBottom:6, display:"inline-block" }}>{cat.emoji} {p.category}</span>
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                        <h3 style={{ color:"#fff", fontFamily:"'Syne',sans-serif", fontWeight:700, fontSize:16 }}>{p.name}</h3>
                        <button onClick={e => { e.stopPropagation(); if ((p.stock ?? 0) > 0) addToCart(p); }}
                          disabled={(p.stock ?? 0) <= 0}
                          style={{ background:(p.stock ?? 0) <= 0 ? "rgba(255,255,255,0.2)" : ORANGE, color:"#fff", border:"none", fontSize:11, fontWeight:700, padding:"7px 13px", borderRadius:8, cursor:(p.stock ?? 0) <= 0 ? "not-allowed" : "pointer" }}>
                          {(p.stock ?? 0) <= 0 ? "Ausverkauft" : "+ Warenkorb"}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── FILTER BAR ── */}
        <div style={{ display:"flex", gap:10, flexWrap:"wrap", alignItems:"center", marginBottom:20, padding:"12px 16px", background:SURFACE, borderRadius:14, border:`1px solid ${BORDER}` }}>
          <span style={{ fontSize:12, fontWeight:700, color:TEXT3, letterSpacing:"0.5px" }}>FILTER</span>
          <div style={{ width:1, height:16, background:BORDER }} />
          <div style={{ display:"flex", alignItems:"center", gap:6 }}>
            <span style={{ fontSize:12, color:TEXT2, fontWeight:600 }}>Preis €</span>
            <input type="number" min="0" placeholder="Min" value={priceMin} onChange={e => setPriceMin(e.target.value)}
              style={{ width:64, background:BG, border:`1.5px solid ${BORDER}`, borderRadius:8, padding:"5px 9px", color:TEXT, fontSize:12, outline:"none" }}
              onFocus={e => e.currentTarget.style.borderColor=ORANGE}
              onBlur={e => e.currentTarget.style.borderColor=BORDER} />
            <span style={{ color:TEXT3, fontSize:12 }}>—</span>
            <input type="number" min="0" placeholder="Max" value={priceMax} onChange={e => setPriceMax(e.target.value)}
              style={{ width:64, background:BG, border:`1.5px solid ${BORDER}`, borderRadius:8, padding:"5px 9px", color:TEXT, fontSize:12, outline:"none" }}
              onFocus={e => e.currentTarget.style.borderColor=ORANGE}
              onBlur={e => e.currentTarget.style.borderColor=BORDER} />
          </div>
          <button onClick={() => setInStockOnly(v => !v)} style={{ display:"flex", alignItems:"center", gap:5, padding:"5px 12px", borderRadius:8, border:`1.5px solid ${inStockOnly ? ORANGE : BORDER}`, background:inStockOnly ? `${ORANGE}15` : "transparent", color:inStockOnly ? ORANGE : TEXT2, fontSize:12, fontWeight:600, cursor:"pointer", transition:"all 0.15s" }}>
            {inStockOnly && <span style={{ fontSize:10 }}>✓</span>} Auf Lager
          </button>
          {hasActiveFilter && (
            <button onClick={clearFilters} style={{ marginLeft:"auto", background:"none", border:`1.5px solid ${BORDER}`, borderRadius:8, padding:"5px 12px", fontSize:12, color:TEXT3, cursor:"pointer", fontWeight:600 }}>
              Zurücksetzen ×
            </button>
          )}
        </div>

        {/* ── ALL PRODUCTS ── */}
        <div>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
            <h2 style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:17, color:TEXT }}>
              {category === "Alle" ? "Alle Produkte" : `${(CATS[category]||CATS.default).emoji} ${category}`}
              {hasActiveFilter && <span style={{ fontSize:13, fontWeight:500, color:TEXT3, marginLeft:8 }}>· gefiltert</span>}
            </h2>
            <span style={{ color:TEXT3, fontSize:13 }}>{filtered.length} Produkte</span>
          </div>

          {loading ? (
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))", gap:14 }}>
              {[...Array(8)].map((_,i) => <div key={i} style={{ height:280, background:SURFACE, borderRadius:16, animation:"pulse 1.5s infinite" }} />)}
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign:"center", padding:"80px 0" }}>
              <p style={{ fontSize:48, marginBottom:12 }}>🔍</p>
              <p style={{ color:TEXT2, fontWeight:600, fontSize:15, marginBottom:8 }}>Keine Produkte gefunden</p>
              {hasActiveFilter && <button onClick={clearFilters} style={{ background:ORANGE, color:"#fff", border:"none", borderRadius:10, padding:"10px 20px", fontSize:13, fontWeight:700, cursor:"pointer", marginTop:8 }}>Filter zurücksetzen</button>}
            </div>
          ) : (
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))", gap:14 }}>
              {filtered.slice(0, visibleCount).map((product, i) => {
                const cat = CATS[product.category||""] || CATS.default;
                const pReviews = getReviews(product.id);
                const avg = getAvg(product.id);
                const inWish = wishlistedIds.includes(product.id);
                const isLow = product.stock !== undefined && product.stock < 30;

                return (
                  <div key={product.id} className="pcard" style={{ animationDelay:`${i*0.03}s`, background:SURFACE, border:`1px solid ${BORDER}`, borderRadius:16, overflow:"hidden", cursor:"pointer", boxShadow:"0 2px 8px rgba(0,0,0,0.04)" }}
                    onClick={() => { if (product.supplier_id) window.location.href = `/supplier/${product.supplier_id}`; }}>
                    <div style={{ position:"relative", height:160, overflow:"hidden" }}>
                      <img loading="lazy" decoding="async" src={product.image_url||"https://images.unsplash.com/photo-1568702846914-96b305d2aaeb?w=400&q=80"} alt={product.name}
                        style={{ width:"100%", height:"100%", objectFit:"cover", transition:"transform 0.4s" }}
                        onMouseEnter={e => e.currentTarget.style.transform="scale(1.05)"}
                        onMouseLeave={e => e.currentTarget.style.transform="scale(1)"}
                        onError={e => { (e.currentTarget as HTMLImageElement).src = "https://images.unsplash.com/photo-1568702846914-96b305d2aaeb?w=400&q=80"; }} />
                      <button onClick={e => { e.stopPropagation(); toggleWishlist(product); }}
                        style={{ position:"absolute", top:10, right:10, width:30, height:30, background:SURFACE, border:`1px solid ${BORDER}`, borderRadius:"50%", cursor:"pointer", fontSize:13, display:"flex", alignItems:"center", justifyContent:"center", boxShadow:"0 2px 8px rgba(0,0,0,0.1)" }}>
                        {inWish?"❤️":"🤍"}
                      </button>
                      {product.category && (
                        <span style={{ position:"absolute", top:10, left:10, background:cat.bg, color:cat.color, fontSize:10, fontWeight:700, padding:"3px 8px", borderRadius:100 }}>{cat.emoji} {product.category}</span>
                      )}
                      {isLow && <span style={{ position:"absolute", bottom:10, left:10, background:"#fef2f2", color:"#ef4444", fontSize:9, fontWeight:800, padding:"3px 8px", borderRadius:100 }}>Nur {product.stock} übrig</span>}
                    </div>
                    <div style={{ padding:"12px 14px 14px" }}>
                      <h3 style={{ color:TEXT, fontWeight:600, fontSize:13, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", marginBottom:4 }}>{product.name}</h3>
                      {pReviews.length > 0 && (
                        <div style={{ display:"flex", alignItems:"center", gap:4, marginBottom:8 }}>
                          <Stars rating={avg} />
                          <span style={{ color:TEXT3, fontSize:10 }}>({pReviews.length})</span>
                        </div>
                      )}
                      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:8 }}>
                        <span style={{ fontFamily:"'Syne',sans-serif", color:TEXT, fontSize:18, fontWeight:800 }}>€{product.price}</span>
                        <button onClick={e => { e.stopPropagation(); if ((product.stock ?? 0) > 0) addToCart(product); }}
                          disabled={(product.stock ?? 0) <= 0}
                          style={{ background:(product.stock ?? 0) <= 0 ? BORDER : ORANGE, color:(product.stock ?? 0) <= 0 ? TEXT3 : "#fff", border:"none", fontSize:11, fontWeight:700, padding:"7px 12px", borderRadius:8, cursor:(product.stock ?? 0) <= 0 ? "not-allowed" : "pointer" }}>
                          {(product.stock ?? 0) <= 0 ? "Ausverkauft" : "+ Warenkorb"}
                        </button>
                      </div>
                      <button onClick={e => { e.stopPropagation(); setOfferProduct(product); }}
                        style={{ width:"100%", background:"transparent", border:`1.5px solid ${BORDER}`, borderRadius:8, padding:"6px 0", fontSize:11, fontWeight:700, color:TEXT2, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:5, transition:"all 0.15s" }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor=ORANGE; e.currentTarget.style.color=ORANGE; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor=BORDER; e.currentTarget.style.color=TEXT2; }}>
                        🤝 Preis verhandeln
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── LOAD MORE ── */}
        {!loading && filtered.length > visibleCount && (
          <div style={{ textAlign:"center", margin:"32px 0" }}>
            <button
              onClick={() => setVisibleCount(prev => prev + 20)}
              style={{ background:SURFACE, border:`1.5px solid ${BORDER}`, borderRadius:12, padding:"12px 32px", color:TEXT, fontWeight:600, fontSize:14, cursor:"pointer" }}>
              Mehr laden ({filtered.length - visibleCount} weitere)
            </button>
          </div>
        )}

        {/* ── BOTTOM CTA ── */}
        {!loading && (
          <div style={{ margin:"40px 0", background:SURFACE, border:`1px solid ${BORDER}`, borderRadius:20, padding:"36px 32px", textAlign:"center" }}>
            <h3 style={{ fontFamily:"'Syne',sans-serif", color:TEXT, fontSize:22, fontWeight:800, marginBottom:8 }}>Du bist Marke oder Hersteller?</h3>
            <p style={{ color:TEXT2, fontSize:14, marginBottom:22 }}>Liste kostenlos und erreiche hunderte Kioske in Deutschland.</p>
            <a href="/signup/supplier" style={{ display:"inline-block", background:ORANGE, color:"#fff", fontWeight:700, padding:"12px 28px", borderRadius:10, textDecoration:"none", fontSize:14 }}>Jetzt listen →</a>
          </div>
        )}
      </div>

      {/* ── BOTTOM NAV (mobile) ── */}
      <nav style={{ position:"fixed", bottom:0, left:0, right:0, background:SURFACE, borderTop:`1px solid ${BORDER}`, display:"flex", justifyContent:"space-around", padding:"10px 0 14px", zIndex:50 }}>
        {[
          { icon:"🏪", label:"Marktplatz", href:"/marketplace", active:true },
          { icon:"🛒", label:"Warenkorb", href:"/cart", active:false },
          { icon:"📦", label:"Bestellungen", href:"/orders", active:false },
          { icon:"💬", label:"Nachrichten", href:"/messages", active:false },
          { icon:"👤", label:"Profil", href:"/profile", active:false },
        ].map(({ icon, label, href, active }) => (
          <a key={label} href={href} style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:3, textDecoration:"none", padding:"0 8px" }}>
            <span style={{ fontSize:20, lineHeight:1 }}>{icon}</span>
            <span style={{ fontSize:10, fontWeight:active?700:500, color:active?ORANGE:TEXT3 }}>{label}</span>
            {active && <div style={{ width:16, height:2, background:ORANGE, borderRadius:2, marginTop:1 }} />}
          </a>
        ))}
      </nav>
    </main>
  );
}
