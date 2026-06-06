"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";

interface Product { id: number; name: string; description?: string; price: number; category?: string; image_url?: string; stock?: number; }
interface Supplier { id: number; name: string; description?: string; logo_url?: string; }
interface Review { id: number; product_id: number; rating: number; comment?: string; }
interface CartItem extends Product { quantity: number; }

const CATS: Record<string, { color: string; emoji: string }> = {
  Energy:   { color: "#f59e0b", emoji: "⚡" },
  Cola:     { color: "#3b82f6", emoji: "🥤" },
  Bio:      { color: "#22c55e", emoji: "🌿" },
  Snacks:   { color: "#a855f7", emoji: "🍬" },
  Limo:     { color: "#ec4899", emoji: "🍋" },
  Getränke: { color: "#06b6d4", emoji: "💧" },
  default:  { color: "#e8521a", emoji: "📦" },
};

// ── Toast ─────────────────────────────────────────────────────
function Toast({ msg, onClose }: { msg: string; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 2200); return () => clearTimeout(t); }, [onClose]);
  return (
    <div style={{ position:"fixed", bottom:28, right:28, zIndex:999, background:"rgba(15,14,12,0.95)", backdropFilter:"blur(20px)", color:"#fff", fontSize:13, padding:"12px 20px", borderRadius:14, display:"flex", alignItems:"center", gap:10, boxShadow:"0 8px 32px rgba(0,0,0,0.5)", border:"1px solid rgba(255,255,255,0.08)" }}>
      <span style={{ width:20, height:20, background:"#22c55e", borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", fontSize:10, fontWeight:900 }}>✓</span>
      {msg}
    </div>
  );
}

// ── Stars ─────────────────────────────────────────────────────
function Stars({ rating, size = 11 }: { rating: number; size?: number }) {
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

// ── AI Recommendations ────────────────────────────────────────
function AIRecs({ products, cart, viewedProduct, onAddToCart, wishlistedIds, onToggleWishlist }: {
  products: Product[]; cart: CartItem[]; viewedProduct: Product | null;
  onAddToCart: (p: Product) => void; wishlistedIds: number[]; onToggleWishlist: (p: Product) => void;
}) {
  const [recs, setRecs] = useState<Product[]>([]);
  const [reasoning, setReasoning] = useState("");
  const [loading, setLoading] = useState(false);
  const [shown, setShown] = useState(false);

  const fetchRecs = useCallback(async () => {
    if (!products.length) return;
    setLoading(true); setShown(true);
    try {
      const res = await fetch("/api/ai-recommendations", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ products, cart, viewedProduct }) });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setRecs(data.recommendations ?? []);
      setReasoning(data.reasoning ?? "");
    } catch {
      setRecs([...products].sort(() => Math.random() - 0.5).slice(0, 4));
      setReasoning("Beliebte Produkte in deiner Region.");
    } finally { setLoading(false); }
  }, [products, cart, viewedProduct]);

  if (!shown) return (
    <div style={{ margin:"40px 0" }}>
      <button onClick={fetchRecs} style={{ width:"100%", border:"1px dashed rgba(232,82,26,0.4)", borderRadius:20, padding:"28px 24px", display:"flex", alignItems:"center", gap:16, cursor:"pointer", background:"rgba(232,82,26,0.04)", transition:"all 0.2s" }}
        onMouseEnter={e => { e.currentTarget.style.borderColor="rgba(232,82,26,0.8)"; e.currentTarget.style.background="rgba(232,82,26,0.08)"; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor="rgba(232,82,26,0.4)"; e.currentTarget.style.background="rgba(232,82,26,0.04)"; }}>
        <div style={{ width:44, height:44, background:"linear-gradient(135deg,#e8521a,#f59e0b)", borderRadius:12, display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, flexShrink:0 }}>✨</div>
        <div style={{ textAlign:"left" }}>
          <p style={{ color:"#f5f0e8", fontWeight:700, fontSize:15, marginBottom:4 }}>KI-Empfehlungen abrufen</p>
          <p style={{ color:"rgba(245,240,232,0.4)", fontSize:13 }}>Claude analysiert deinen Warenkorb und schlägt passende Produkte vor</p>
        </div>
        <span style={{ marginLeft:"auto", background:"#e8521a", color:"#fff", fontSize:10, fontWeight:700, padding:"4px 10px", borderRadius:100, flexShrink:0 }}>Claude AI</span>
      </button>
    </div>
  );

  return (
    <div style={{ margin:"40px 0" }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20 }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <span style={{ fontSize:20 }}>✨</span>
          <span style={{ color:"#f5f0e8", fontWeight:800, fontSize:18, letterSpacing:"-0.5px" }}>KI-Empfehlungen</span>
          <span style={{ background:"#e8521a", color:"#fff", fontSize:10, fontWeight:700, padding:"3px 8px", borderRadius:100 }}>Claude</span>
        </div>
        <button onClick={fetchRecs} disabled={loading} style={{ color:"#e8521a", fontSize:13, background:"none", border:"none", cursor:"pointer", fontWeight:600 }}>{loading ? "Analysiere..." : "↻ Neu"}</button>
      </div>
      {reasoning && !loading && <p style={{ color:"rgba(245,240,232,0.3)", fontSize:12, marginBottom:16 }}>{reasoning}</p>}
      {loading ? (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:14 }}>
          {[1,2,3,4].map(i => <div key={i} style={{ height:220, background:"rgba(255,255,255,0.04)", borderRadius:16 }} />)}
        </div>
      ) : (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))", gap:14 }}>
          {recs.map(p => {
            const cat = CATS[p.category || ""] || CATS.default;
            const inWish = wishlistedIds.includes(p.id);
            return (
              <div key={p.id} style={{ background:"rgba(255,255,255,0.03)", border:`1px solid ${cat.color}33`, borderRadius:16, overflow:"hidden", transition:"all 0.2s" }}
                onMouseEnter={e => { e.currentTarget.style.transform="translateY(-3px)"; e.currentTarget.style.borderColor=`${cat.color}66`; }}
                onMouseLeave={e => { e.currentTarget.style.transform="translateY(0)"; e.currentTarget.style.borderColor=`${cat.color}33`; }}>
                <div style={{ height:3, background:`linear-gradient(90deg,${cat.color},${cat.color}44)` }} />
                <div style={{ position:"relative", height:130 }}>
                  <img src={p.image_url || "https://images.unsplash.com/photo-1568702846914-96b305d2aaeb?w=400&q=80"} alt={p.name} style={{ width:"100%", height:"100%", objectFit:"cover" }} />
                  <div style={{ position:"absolute", inset:0, background:"linear-gradient(to top,rgba(10,10,15,0.6),transparent)" }} />
                  <span style={{ position:"absolute", top:8, left:8, background:cat.color, color:"#fff", fontSize:9, fontWeight:800, padding:"2px 7px", borderRadius:100 }}>✨ KI Pick</span>
                  <button onClick={() => onToggleWishlist(p)} style={{ position:"absolute", top:8, right:8, width:26, height:26, background:"rgba(10,10,15,0.7)", border:"none", borderRadius:"50%", cursor:"pointer", fontSize:12, display:"flex", alignItems:"center", justifyContent:"center" }}>
                    {inWish ? "❤️" : "🤍"}
                  </button>
                </div>
                <div style={{ padding:"12px 14px" }}>
                  <p style={{ color:"#f5f0e8", fontWeight:700, fontSize:13, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", marginBottom:8 }}>{p.name}</p>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                    <span style={{ color:"#f5f0e8", fontWeight:900, fontSize:16 }}>€{p.price}</span>
                    <button onClick={() => onAddToCart(p)} style={{ background:cat.color, color:"#fff", border:"none", fontSize:10, fontWeight:800, padding:"5px 10px", borderRadius:8, cursor:"pointer" }}>+ Warenkorb</button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Cart Sidebar ──────────────────────────────────────────────
function CartSidebar({ open, onClose, items, onUpdateQty, onRemove, onClearAll }: {
  open:boolean; onClose:()=>void; items:CartItem[];
  onUpdateQty:(id:number,qty:number)=>void; onRemove:(id:number)=>void; onClearAll:()=>void;
}) {
  const total = items.reduce((s, i) => s + i.price * i.quantity, 0);
  return (
    <>
      {open && <div onClick={onClose} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.6)", zIndex:90, backdropFilter:"blur(6px)" }} />}
      <div style={{ position:"fixed", top:0, right:0, height:"100%", width:380, background:"#0f0e0c", zIndex:100, display:"flex", flexDirection:"column", transform:open?"translateX(0)":"translateX(100%)", transition:"transform 0.35s cubic-bezier(0.4,0,0.2,1)", borderLeft:"1px solid rgba(245,240,232,0.06)" }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"22px 24px", borderBottom:"1px solid rgba(245,240,232,0.06)" }}>
          <div>
            <p style={{ color:"#f5f0e8", fontWeight:900, fontSize:17, letterSpacing:"-0.5px" }}>Warenkorb</p>
            <p style={{ color:"rgba(245,240,232,0.35)", fontSize:12, marginTop:2 }}>{items.reduce((s,i)=>s+i.quantity,0)} Artikel</p>
          </div>
          <button onClick={onClose} style={{ width:32, height:32, background:"rgba(245,240,232,0.06)", border:"none", borderRadius:8, cursor:"pointer", color:"rgba(245,240,232,0.5)", fontSize:14 }}>✕</button>
        </div>
        <div style={{ flex:1, overflowY:"auto", padding:"16px 24px" }}>
          {items.length === 0 ? (
            <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", height:"60%", gap:12 }}>
              <span style={{ fontSize:48 }}>🛒</span>
              <p style={{ color:"rgba(245,240,232,0.25)", fontSize:13 }}>Warenkorb ist leer</p>
            </div>
          ) : items.map(item => (
            <div key={item.id} style={{ display:"flex", alignItems:"center", gap:12, padding:"14px 0", borderBottom:"1px solid rgba(245,240,232,0.05)" }}>
              <div style={{ width:50, height:50, borderRadius:10, overflow:"hidden", flexShrink:0, background:"rgba(245,240,232,0.05)" }}>
                <img src={item.image_url || "https://images.unsplash.com/photo-1568702846914-96b305d2aaeb?w=200&q=80"} alt={item.name} style={{ width:"100%", height:"100%", objectFit:"cover" }} />
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <p style={{ color:"#f5f0e8", fontSize:13, fontWeight:600, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{item.name}</p>
                <p style={{ color:"#e8521a", fontSize:12, fontWeight:800, marginTop:2 }}>€{(item.price * item.quantity).toFixed(2)}</p>
              </div>
              <div style={{ display:"flex", alignItems:"center", gap:6, flexShrink:0 }}>
                <button onClick={() => onUpdateQty(item.id, item.quantity - 1)} style={{ width:26, height:26, background:"rgba(245,240,232,0.06)", border:"none", borderRadius:6, color:"#f5f0e8", cursor:"pointer", fontWeight:700 }}>−</button>
                <span style={{ color:"#f5f0e8", width:18, textAlign:"center", fontWeight:700, fontSize:13 }}>{item.quantity}</span>
                <button onClick={() => onUpdateQty(item.id, item.quantity + 1)} style={{ width:26, height:26, background:"#e8521a", border:"none", borderRadius:6, color:"#fff", cursor:"pointer", fontWeight:700 }}>+</button>
                <button onClick={() => onRemove(item.id)} style={{ background:"none", border:"none", color:"rgba(245,240,232,0.2)", cursor:"pointer", fontSize:14, marginLeft:2 }}>✕</button>
              </div>
            </div>
          ))}
        </div>
        {items.length > 0 && (
          <div style={{ padding:"18px 24px", borderTop:"1px solid rgba(245,240,232,0.06)" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
              <span style={{ color:"rgba(245,240,232,0.4)", fontSize:13 }}>Gesamt</span>
              <span style={{ color:"#f5f0e8", fontSize:22, fontWeight:900, letterSpacing:"-0.5px" }}>€{total.toFixed(2)}</span>
            </div>
            <a href="/checkout" style={{ display:"block", textAlign:"center", background:"linear-gradient(135deg,#e8521a,#c4411200)", backgroundImage:"linear-gradient(135deg,#e8521a,#f07340)", color:"#fff", fontWeight:800, padding:"14px", borderRadius:12, textDecoration:"none", fontSize:14 }}>Zur Kasse →</a>
            <button onClick={onClearAll} style={{ width:"100%", marginTop:8, background:"none", border:"none", color:"rgba(245,240,232,0.2)", fontSize:12, cursor:"pointer", padding:"8px" }}>Warenkorb leeren</button>
          </div>
        )}
      </div>
    </>
  );
}

// ── Wishlist Sidebar ──────────────────────────────────────────
function WishlistSidebar({ open, onClose, items, onAddToCart, onRemove }: {
  open:boolean; onClose:()=>void; items:Product[];
  onAddToCart:(p:Product)=>void; onRemove:(p:Product)=>void;
}) {
  return (
    <>
      {open && <div onClick={onClose} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.6)", zIndex:90, backdropFilter:"blur(6px)" }} />}
      <div style={{ position:"fixed", top:0, right:0, height:"100%", width:360, background:"#0f0e0c", zIndex:100, display:"flex", flexDirection:"column", transform:open?"translateX(0)":"translateX(100%)", transition:"transform 0.35s cubic-bezier(0.4,0,0.2,1)", borderLeft:"1px solid rgba(245,240,232,0.06)" }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"22px 24px", borderBottom:"1px solid rgba(245,240,232,0.06)" }}>
          <p style={{ color:"#f5f0e8", fontWeight:900, fontSize:17 }}>❤️ Wunschliste ({items.length})</p>
          <button onClick={onClose} style={{ width:32, height:32, background:"rgba(245,240,232,0.06)", border:"none", borderRadius:8, cursor:"pointer", color:"rgba(245,240,232,0.5)", fontSize:14 }}>✕</button>
        </div>
        <div style={{ flex:1, overflowY:"auto", padding:"16px 24px", display:"flex", flexDirection:"column", gap:10 }}>
          {items.length === 0 ? (
            <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", height:"60%", gap:12 }}>
              <span style={{ fontSize:48 }}>🤍</span>
              <p style={{ color:"rgba(245,240,232,0.25)", fontSize:13 }}>Wunschliste ist leer</p>
            </div>
          ) : items.map(item => {
            const cat = CATS[item.category || ""] || CATS.default;
            return (
              <div key={item.id} style={{ background:"rgba(245,240,232,0.03)", border:"1px solid rgba(245,240,232,0.07)", borderRadius:14, overflow:"hidden" }}>
                <div style={{ height:3, background:cat.color }} />
                <div style={{ padding:"12px 14px", display:"flex", gap:12, alignItems:"center" }}>
                  <div style={{ width:48, height:48, borderRadius:10, overflow:"hidden", flexShrink:0 }}>
                    <img src={item.image_url || "https://images.unsplash.com/photo-1568702846914-96b305d2aaeb?w=200&q=80"} alt={item.name} style={{ width:"100%", height:"100%", objectFit:"cover" }} />
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <p style={{ color:"#f5f0e8", fontWeight:700, fontSize:13, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{item.name}</p>
                    <p style={{ color:cat.color, fontWeight:800, fontSize:13, marginTop:2 }}>€{item.price}</p>
                  </div>
                  <div style={{ display:"flex", gap:6, flexShrink:0 }}>
                    <button onClick={() => onAddToCart(item)} style={{ background:cat.color, color:"#fff", border:"none", fontSize:10, fontWeight:800, padding:"5px 10px", borderRadius:7, cursor:"pointer" }}>+ Warenkorb</button>
                    <button onClick={() => onRemove(item)} style={{ background:"rgba(245,240,232,0.06)", border:"none", color:"rgba(245,240,232,0.4)", fontSize:11, padding:"5px 8px", borderRadius:7, cursor:"pointer" }}>✕</button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}

// ── Product Modal ─────────────────────────────────────────────
function ProductModal({ product, reviews, onClose, onAddToCart, inWishlist, onToggleWishlist, onSubmitReview }: {
  product:Product; reviews:Review[]; onClose:()=>void; onAddToCart:(p:Product)=>void;
  inWishlist:boolean; onToggleWishlist:(p:Product)=>void;
  onSubmitReview:(id:number,rating:number,comment:string)=>void;
}) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const avg = reviews.length ? reviews.reduce((s,r) => s+r.rating,0)/reviews.length : 0;
  const cat = CATS[product.category || ""] || CATS.default;

  return (
    <div onClick={onClose} style={{ position:"fixed", inset:0, background:"rgba(10,10,15,0.9)", zIndex:150, display:"flex", alignItems:"center", justifyContent:"center", padding:24, backdropFilter:"blur(12px)" }}>
      <div onClick={e => e.stopPropagation()} style={{ background:"#0f0e0c", borderRadius:24, maxWidth:660, width:"100%", maxHeight:"90vh", overflowY:"auto", border:"1px solid rgba(245,240,232,0.08)", boxShadow:"0 40px 80px rgba(0,0,0,0.7)" }}>
        <div style={{ height:3, background:cat.color, borderRadius:"24px 24px 0 0" }} />
        <div style={{ position:"relative", height:260, overflow:"hidden" }}>
          <img src={product.image_url || "https://images.unsplash.com/photo-1568702846914-96b305d2aaeb?w=800&q=80"} alt={product.name} style={{ width:"100%", height:"100%", objectFit:"cover" }} />
          <div style={{ position:"absolute", inset:0, background:"linear-gradient(to top,#0f0e0c 0%,transparent 50%)" }} />
          <button onClick={onClose} style={{ position:"absolute", top:16, right:16, width:36, height:36, background:"rgba(10,10,15,0.7)", border:"none", borderRadius:"50%", cursor:"pointer", color:"rgba(245,240,232,0.7)", fontSize:16, display:"flex", alignItems:"center", justifyContent:"center" }}>✕</button>
          {product.category && <span style={{ position:"absolute", top:16, left:16, background:cat.color, color:"#fff", fontSize:11, fontWeight:700, padding:"4px 10px", borderRadius:100 }}>{cat.emoji} {product.category}</span>}
        </div>
        <div style={{ padding:28 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:10 }}>
            <h2 style={{ color:"#f5f0e8", fontWeight:900, fontSize:26, letterSpacing:"-1px", flex:1, marginRight:14 }}>{product.name}</h2>
            <button onClick={() => onToggleWishlist(product)} style={{ width:40, height:40, background:inWishlist?"rgba(239,68,68,0.15)":"rgba(245,240,232,0.05)", border:`1px solid ${inWishlist?"rgba(239,68,68,0.3)":"rgba(245,240,232,0.1)"}`, borderRadius:12, cursor:"pointer", fontSize:18, flexShrink:0 }}>
              {inWishlist ? "❤️" : "🤍"}
            </button>
          </div>
          {reviews.length > 0 && <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:12 }}><Stars rating={avg} size={14} /><span style={{ color:"rgba(245,240,232,0.35)", fontSize:13 }}>{avg.toFixed(1)} ({reviews.length})</span></div>}
          {product.description && <p style={{ color:"rgba(245,240,232,0.4)", fontSize:14, lineHeight:1.7, marginBottom:20 }}>{product.description}</p>}
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:24 }}>
            <span style={{ color:"#f5f0e8", fontSize:38, fontWeight:900, letterSpacing:"-1px" }}>€{product.price}</span>
            {product.stock !== undefined && <span style={{ color:"rgba(245,240,232,0.3)", fontSize:13, background:"rgba(245,240,232,0.05)", padding:"6px 12px", borderRadius:8 }}>{product.stock} auf Lager</span>}
          </div>
          <button onClick={() => { onAddToCart(product); onClose(); }} style={{ width:"100%", background:cat.color, color:"#fff", fontWeight:800, padding:"16px", borderRadius:14, border:"none", cursor:"pointer", fontSize:15, marginBottom:24 }}>
            In den Warenkorb
          </button>
          {reviews.length > 0 && (
            <div style={{ borderTop:"1px solid rgba(245,240,232,0.06)", paddingTop:20, marginBottom:20 }}>
              <p style={{ color:"rgba(245,240,232,0.5)", fontWeight:700, fontSize:13, marginBottom:12 }}>Bewertungen</p>
              {reviews.map(r => (
                <div key={r.id} style={{ background:"rgba(245,240,232,0.03)", borderRadius:10, padding:"10px 14px", marginBottom:8 }}>
                  <Stars rating={r.rating} />
                  {r.comment && <p style={{ color:"rgba(245,240,232,0.35)", fontSize:12, marginTop:4 }}>{r.comment}</p>}
                </div>
              ))}
            </div>
          )}
          <div style={{ borderTop:"1px solid rgba(245,240,232,0.06)", paddingTop:20 }}>
            <p style={{ color:"rgba(245,240,232,0.5)", fontWeight:700, fontSize:13, marginBottom:10 }}>Bewertung abgeben</p>
            <div style={{ display:"flex", gap:4, marginBottom:10 }}>
              {[1,2,3,4,5].map(s => (
                <button key={s} onClick={() => setRating(s)} style={{ background:"none", border:"none", cursor:"pointer", padding:0 }}>
                  <svg width={22} height={22} viewBox="0 0 24 24" fill={s<=rating?"#f59e0b":"none"} stroke="#f59e0b" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                </button>
              ))}
            </div>
            <textarea value={comment} onChange={e => setComment(e.target.value)} placeholder="Deine Meinung..." rows={2}
              style={{ width:"100%", background:"rgba(245,240,232,0.04)", border:"1px solid rgba(245,240,232,0.08)", borderRadius:10, padding:"10px 14px", color:"#f5f0e8", fontSize:13, resize:"none", outline:"none", fontFamily:"inherit", boxSizing:"border-box" }} />
            <button onClick={() => { onSubmitReview(product.id,rating,comment); setComment(""); setRating(5); }}
              style={{ width:"100%", marginTop:8, background:"rgba(245,240,232,0.06)", border:"1px solid rgba(245,240,232,0.08)", color:"rgba(245,240,232,0.6)", fontWeight:700, padding:"10px", borderRadius:10, cursor:"pointer", fontSize:13 }}>
              Bewertung senden
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────
export default function MarketplacePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("Alle");
  const [sortBy, setSortBy] = useState("default");
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [toast, setToast] = useState<string|null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product|null>(null);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [wishlist, setWishlist] = useState<Product[]>([]);
  const [wishlistOpen, setWishlistOpen] = useState(false);
  const [compareList, setCompareList] = useState<Product[]>([]);
  const [compareOpen, setCompareOpen] = useState(false);
  const [productRatings, setProductRatings] = useState<Record<number,number>>({});
  const [productComments, setProductComments] = useState<Record<number,string>>({});

  const showToast = useCallback((msg:string) => { setToast(msg); setTimeout(() => setToast(null),2500); },[]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    Promise.all([
      supabase.from("products").select("*"),
      supabase.from("suppliers").select("*"),
      supabase.from("reviews").select("*"),
    ]).then(([p,s,r]) => { setProducts(p.data||[]); setSuppliers(s.data||[]); setReviews(r.data||[]); setLoading(false); });
  },[]);

  const addToCart = useCallback((product:Product) => {
    setCartItems(prev => { const ex=prev.find(i=>i.id===product.id); if(ex) return prev.map(i=>i.id===product.id?{...i,quantity:i.quantity+1}:i); return [...prev,{...product,quantity:1}]; });
    showToast(`${product.name} hinzugefügt 🛒`);
    setCartOpen(true);
  },[showToast]);

  const updateQty = (id:number,qty:number) => { if(qty<1) return setCartItems(p=>p.filter(i=>i.id!==id)); setCartItems(p=>p.map(i=>i.id===id?{...i,quantity:qty}:i)); };
  const toggleWishlist = useCallback((product:Product) => { setWishlist(prev => { const has=prev.some(w=>w.id===product.id); if(!has) showToast(`${product.name} zur Wunschliste ❤️`); return has?prev.filter(w=>w.id!==product.id):[...prev,product]; }); },[showToast]);
  const toggleCompare = (product:Product) => { setCompareList(prev => { const has=prev.some(c=>c.id===product.id); if(!has&&prev.length>=3){showToast("Max. 3 Produkte");return prev;} return has?prev.filter(c=>c.id!==product.id):[...prev,product]; }); };

  const addReview = async (e:React.MouseEvent,productId:number) => {
    e.stopPropagation();
    await supabase.from("reviews").insert({ product_id:productId, rating:productRatings[productId]??5, comment:productComments[productId]??"" });
    const { data } = await supabase.from("reviews").select("*");
    setReviews(data||[]); setProductRatings(p=>({...p,[productId]:5})); setProductComments(p=>({...p,[productId]:""}));
    showToast("Bewertung gespeichert ⭐");
  };

  const submitReview = async (productId:number,rating:number,comment:string) => {
    await supabase.from("reviews").insert({ product_id:productId, rating, comment });
    const { data } = await supabase.from("reviews").select("*");
    setReviews(data||[]); showToast("Bewertung gespeichert ⭐");
  };

  const deleteProduct = async (id:number) => {
    if(!user||user.user_metadata?.role!=="admin") return showToast("Kein Zugriff");
    await supabase.from("products").delete().eq("id",id);
    setProducts(p=>p.filter(x=>x.id!==id)); showToast("Produkt gelöscht");
  };

  const getReviews = (id:number) => reviews.filter(r=>r.product_id===id);
  const getAvg = (id:number) => { const r=getReviews(id); return r.length?r.reduce((s,r)=>s+r.rating,0)/r.length:0; };
  const wishlistedIds = wishlist.map(w=>w.id);
  const cartCount = cartItems.reduce((s,i)=>s+i.quantity,0);
  const categories = ["Alle",...Array.from(new Set(products.map(p=>p.category).filter(Boolean))) as string[]];

  const filtered = products
    .filter(p => p.name.toLowerCase().includes(search.toLowerCase()) && (category==="Alle"||p.category===category))
    .sort((a,b) => sortBy==="price-asc"?a.price-b.price:sortBy==="price-desc"?b.price-a.price:sortBy==="rating"?getAvg(b.id)-getAvg(a.id):0);

  return (
    <main style={{ minHeight:"100vh", background:"#0a0a0f", color:"#f5f0e8", fontFamily:"'Helvetica Neue',system-ui,sans-serif" }}>
      <style>{`
        @keyframes fadeUp { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
        .product-card { animation: fadeUp 0.4s ease both; }
        .product-card:hover { transform: translateY(-4px) !important; }
        ::-webkit-scrollbar { width:4px; } ::-webkit-scrollbar-track { background:transparent; } ::-webkit-scrollbar-thumb { background:rgba(245,240,232,0.1); border-radius:4px; }
      `}</style>

      {toast && <Toast msg={toast} onClose={() => setToast(null)} />}

      <CartSidebar open={cartOpen} onClose={() => setCartOpen(false)} items={cartItems} onUpdateQty={updateQty} onRemove={id=>setCartItems(p=>p.filter(i=>i.id!==id))} onClearAll={() => setCartItems([])} />
      <WishlistSidebar open={wishlistOpen} onClose={() => setWishlistOpen(false)} items={wishlist} onAddToCart={addToCart} onRemove={toggleWishlist} />
      {selectedProduct && <ProductModal product={selectedProduct} reviews={getReviews(selectedProduct.id)} onClose={() => setSelectedProduct(null)} onAddToCart={addToCart} inWishlist={wishlistedIds.includes(selectedProduct.id)} onToggleWishlist={toggleWishlist} onSubmitReview={submitReview} />}

      {/* Compare bar */}
      {compareList.length > 0 && (
        <div style={{ position:"fixed", bottom:24, left:"50%", transform:"translateX(-50%)", zIndex:80, background:"rgba(15,14,12,0.97)", border:"1px solid rgba(245,240,232,0.1)", borderRadius:16, padding:"12px 20px", display:"flex", alignItems:"center", gap:16, backdropFilter:"blur(20px)" }}>
          <span style={{ color:"rgba(245,240,232,0.5)", fontSize:12 }}>{compareList.length} ausgewählt</span>
          {compareList.map(p => <span key={p.id} style={{ background:"rgba(245,240,232,0.07)", color:"rgba(245,240,232,0.6)", fontSize:11, padding:"3px 8px", borderRadius:6 }}>{p.name.slice(0,14)}</span>)}
          <button onClick={() => setCompareOpen(true)} style={{ background:"#e8521a", color:"#fff", border:"none", fontSize:12, fontWeight:700, padding:"7px 14px", borderRadius:8, cursor:"pointer" }}>Vergleichen →</button>
          <button onClick={() => setCompareList([])} style={{ background:"none", border:"none", color:"rgba(245,240,232,0.3)", cursor:"pointer" }}>✕</button>
        </div>
      )}

      {/* Compare Modal */}
      {compareOpen && compareList.length > 0 && (
        <div onClick={() => setCompareOpen(false)} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.85)", zIndex:150, display:"flex", alignItems:"center", justifyContent:"center", padding:24, backdropFilter:"blur(8px)" }}>
          <div onClick={e => e.stopPropagation()} style={{ background:"#0f0e0c", borderRadius:24, maxWidth:880, width:"100%", padding:28, border:"1px solid rgba(245,240,232,0.08)" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:24 }}>
              <h2 style={{ color:"#f5f0e8", fontWeight:900, fontSize:20, letterSpacing:"-0.5px" }}>Produkte vergleichen</h2>
              <button onClick={() => setCompareOpen(false)} style={{ background:"rgba(245,240,232,0.05)", border:"none", color:"rgba(245,240,232,0.4)", width:32, height:32, borderRadius:8, cursor:"pointer" }}>✕</button>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:`repeat(${compareList.length},1fr)`, gap:16 }}>
              {compareList.map(p => {
                const cat = CATS[p.category||""] || CATS.default;
                return (
                  <div key={p.id} style={{ background:"rgba(245,240,232,0.03)", border:"1px solid rgba(245,240,232,0.07)", borderRadius:16, overflow:"hidden" }}>
                    <div style={{ height:4, background:cat.color }} />
                    <div style={{ padding:16 }}>
                      <div style={{ height:110, borderRadius:12, overflow:"hidden", marginBottom:12 }}>
                        <img src={p.image_url||"https://images.unsplash.com/photo-1568702846914-96b305d2aaeb?w=300&q=80"} alt={p.name} style={{ width:"100%", height:"100%", objectFit:"cover" }} />
                      </div>
                      <h3 style={{ color:"#f5f0e8", fontWeight:800, fontSize:14, marginBottom:14 }}>{p.name}</h3>
                      {[["Preis",`€${p.price}`],["Kategorie",p.category||"—"],["Bewertung",`${getAvg(p.id).toFixed(1)} ⭐`],["Lager",p.stock??"—"]].map(([k,v]) => (
                        <div key={k} style={{ display:"flex", justifyContent:"space-between", padding:"7px 0", borderBottom:"1px solid rgba(245,240,232,0.05)" }}>
                          <span style={{ color:"rgba(245,240,232,0.3)", fontSize:12 }}>{k}</span>
                          <span style={{ color:"#f5f0e8", fontSize:12, fontWeight:700 }}>{v}</span>
                        </div>
                      ))}
                      <button onClick={() => { addToCart(p); setCompareOpen(false); }} style={{ width:"100%", marginTop:14, background:cat.color, color:"#fff", border:"none", fontWeight:700, fontSize:12, padding:"10px", borderRadius:10, cursor:"pointer" }}>+ Warenkorb</button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── NAVBAR ── */}
      <nav style={{ position:"sticky", top:0, zIndex:50, background:"rgba(10,10,15,0.92)", backdropFilter:"blur(24px)", borderBottom:"1px solid rgba(245,240,232,0.06)", padding:"0 40px", height:64, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ width:34, height:34, background:"#e8521a", borderRadius:9, display:"flex", alignItems:"center", justifyContent:"center", fontWeight:900, fontSize:16, color:"#fff" }}>K</div>
          <span style={{ fontWeight:900, fontSize:17, color:"#f5f0e8", letterSpacing:"-0.5px" }}>KioskFlow</span>
        </div>
        <div style={{ flex:1, maxWidth:380, margin:"0 32px", position:"relative" }}>
          <svg style={{ position:"absolute", left:12, top:"50%", transform:"translateY(-50%)", opacity:0.25 }} width={14} height={14} fill="none" stroke="#f5f0e8" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          <input type="text" placeholder="Produkte suchen..." value={search} onChange={e => setSearch(e.target.value)}
            style={{ width:"100%", background:"rgba(245,240,232,0.06)", border:"1px solid rgba(245,240,232,0.09)", borderRadius:10, padding:"9px 14px 9px 34px", color:"#f5f0e8", fontSize:13, outline:"none", boxSizing:"border-box" }} />
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <select value={sortBy} onChange={e => setSortBy(e.target.value)} style={{ background:"rgba(245,240,232,0.06)", border:"1px solid rgba(245,240,232,0.09)", borderRadius:10, padding:"8px 12px", color:"#f5f0e8", fontSize:12, outline:"none", cursor:"pointer" }}>
            <option value="default">Sortieren</option>
            <option value="price-asc">Preis ↑</option>
            <option value="price-desc">Preis ↓</option>
            <option value="rating">Bewertung</option>
          </select>
          <button onClick={() => setWishlistOpen(true)} style={{ position:"relative", width:38, height:38, background:"rgba(245,240,232,0.06)", border:"1px solid rgba(245,240,232,0.09)", borderRadius:10, cursor:"pointer", fontSize:15, display:"flex", alignItems:"center", justifyContent:"center" }}>
            🤍
            {wishlist.length > 0 && <span style={{ position:"absolute", top:-5, right:-5, background:"#ef4444", color:"#fff", fontSize:9, fontWeight:900, width:17, height:17, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center" }}>{wishlist.length}</span>}
          </button>
          <button onClick={() => setCartOpen(true)} style={{ display:"flex", alignItems:"center", gap:8, background:"#e8521a", border:"none", borderRadius:10, padding:"8px 16px", color:"#fff", fontWeight:700, fontSize:13, cursor:"pointer" }}>
            🛒
            {cartCount > 0 && <span style={{ background:"rgba(0,0,0,0.25)", fontSize:11, fontWeight:900, padding:"2px 6px", borderRadius:100 }}>{cartCount}</span>}
          </button>
        </div>
      </nav>

      {/* ── HERO ── */}
      <div style={{ position:"relative", overflow:"hidden", background:"linear-gradient(160deg,#0f0e0c 0%,#1a0a00 45%,#0a0a0f 100%)", padding:"72px 40px 56px" }}>
        <div style={{ position:"absolute", top:-120, right:-80, width:700, height:700, background:"radial-gradient(circle,rgba(232,82,26,0.18) 0%,transparent 65%)", pointerEvents:"none" }} />
        <div style={{ position:"absolute", bottom:-80, left:-40, width:500, height:500, background:"radial-gradient(circle,rgba(232,82,26,0.08) 0%,transparent 65%)", pointerEvents:"none" }} />
        <div style={{ maxWidth:1200, margin:"0 auto", display:"flex", justifyContent:"space-between", alignItems:"center", position:"relative", gap:40 }}>
          <div style={{ flex:1 }}>
            <span style={{ display:"inline-flex", alignItems:"center", gap:6, background:"rgba(232,82,26,0.12)", border:"1px solid rgba(232,82,26,0.25)", borderRadius:100, padding:"5px 14px", fontSize:11, color:"#e8521a", fontWeight:700, letterSpacing:1, marginBottom:20, textTransform:"uppercase" }}>
              <span style={{ width:6, height:6, borderRadius:"50%", background:"#e8521a", display:"inline-block" }} />
              Frankfurt · B2B Marktplatz
            </span>
            <h1 style={{ fontSize:"clamp(32px,4.5vw,58px)", fontWeight:900, lineHeight:1.04, letterSpacing:"-2px", marginBottom:16 }}>
              Lokale Marken,<br/>
              <span style={{ color:"#e8521a" }}>direkt zu dir.</span>
            </h1>
            <p style={{ color:"rgba(245,240,232,0.4)", fontSize:16, maxWidth:440, lineHeight:1.7, marginBottom:32 }}>Keine Mindestbestellmengen, kein Lekkerland — direkt vom Hersteller zum Kiosk.</p>
            <div style={{ display:"flex", gap:10 }}>
              <a href="/signup" style={{ background:"#e8521a", color:"#fff", fontWeight:700, padding:"13px 26px", borderRadius:12, textDecoration:"none", fontSize:14 }}>Kostenlos starten →</a>
              <a href="/supplier" style={{ background:"rgba(245,240,232,0.06)", border:"1px solid rgba(245,240,232,0.1)", color:"rgba(245,240,232,0.6)", fontWeight:600, padding:"13px 26px", borderRadius:12, textDecoration:"none", fontSize:14 }}>Als Marke listen</a>
            </div>
          </div>
          <div style={{ display:"flex", gap:40, flexShrink:0 }}>
            {[{v:"50+",l:"Marken"},{v:"0€",l:"Listing"},{v:"24h",l:"Lieferung"},{v:"500+",l:"Kioske"}].map(({ v, l }) => (
              <div key={l} style={{ textAlign:"center" }}>
                <p style={{ fontSize:30, fontWeight:900, color:"#f5f0e8", letterSpacing:"-1px" }}>{v}</p>
                <p style={{ fontSize:11, color:"rgba(245,240,232,0.3)", marginTop:4 }}>{l}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── CATEGORY CIRCLES (Shopify/3rd image style) ── */}
      <div style={{ background:"rgba(245,240,232,0.02)", borderBottom:"1px solid rgba(245,240,232,0.05)", padding:"24px 40px" }}>
        <div style={{ maxWidth:1200, margin:"0 auto", display:"flex", gap:20, overflowX:"auto" }}>
          {categories.map(cat => {
            const style = CATS[cat] || CATS.default;
            const active = category === cat;
            return (
              <button key={cat} onClick={() => setCategory(cat)} style={{ flexShrink:0, display:"flex", flexDirection:"column", alignItems:"center", gap:8, background:"none", border:"none", cursor:"pointer", padding:"4px 8px" }}>
                <div style={{ width:52, height:52, borderRadius:"50%", background:active?style.color:"rgba(245,240,232,0.06)", border:`2px solid ${active?style.color:"rgba(245,240,232,0.1)"}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, transition:"all 0.2s", boxShadow:active?`0 0 20px ${style.color}44`:"none" }}>
                  {style.emoji}
                </div>
                <span style={{ color:active?"#f5f0e8":"rgba(245,240,232,0.4)", fontSize:11, fontWeight:active?700:500, whiteSpace:"nowrap" }}>{cat}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ maxWidth:1200, margin:"0 auto", padding:"48px 40px" }}>

        {/* Suppliers */}
        {suppliers.length > 0 && (
          <div style={{ marginBottom:52 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:18 }}>
              <h2 style={{ color:"#f5f0e8", fontWeight:900, fontSize:19, letterSpacing:"-0.5px" }}>🏪 Top Lieferanten</h2>
              <button style={{ color:"#e8521a", background:"none", border:"none", fontSize:13, cursor:"pointer", fontWeight:600 }}>Alle →</button>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))", gap:14 }}>
              {suppliers.slice(0,3).map(s => (
                <div key={s.id} style={{ background:"rgba(245,240,232,0.03)", border:"1px solid rgba(245,240,232,0.07)", borderRadius:14, padding:"18px 20px", display:"flex", alignItems:"center", gap:14, cursor:"pointer", transition:"all 0.2s" }}
                  onMouseEnter={e => e.currentTarget.style.borderColor="rgba(245,240,232,0.15)"}
                  onMouseLeave={e => e.currentTarget.style.borderColor="rgba(245,240,232,0.07)"}>
                  <div style={{ width:48, height:48, borderRadius:12, overflow:"hidden", flexShrink:0, background:"rgba(245,240,232,0.05)" }}>
                    <img src={s.logo_url||"https://images.unsplash.com/photo-1560250097-0b93528c311a?w=200&q=80"} alt={s.name} style={{ width:"100%", height:"100%", objectFit:"cover" }} />
                  </div>
                  <div>
                    <p style={{ color:"#f5f0e8", fontWeight:700, fontSize:14 }}>{s.name}</p>
                    {s.description && <p style={{ color:"rgba(245,240,232,0.3)", fontSize:12, marginTop:2 }}>{s.description.slice(0,45)}...</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Featured — bakery style big cards */}
        {products.length > 0 && (
          <div style={{ marginBottom:52 }}>
            <h2 style={{ color:"#f5f0e8", fontWeight:900, fontSize:19, letterSpacing:"-0.5px", marginBottom:18 }}>🔥 Featured Products</h2>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:16 }}>
              {products.slice(0,3).map(p => {
                const cat = CATS[p.category||""] || CATS.default;
                const inWish = wishlistedIds.includes(p.id);
                return (
                  <div key={p.id} onClick={() => setSelectedProduct(p)} style={{ position:"relative", height:240, borderRadius:20, overflow:"hidden", cursor:"pointer" }}
                    onMouseEnter={e => (e.currentTarget.querySelector("img") as HTMLImageElement).style.transform="scale(1.07)"}
                    onMouseLeave={e => (e.currentTarget.querySelector("img") as HTMLImageElement).style.transform="scale(1)"}>
                    <div style={{ position:"absolute", top:0, insetInline:0, height:3, background:`linear-gradient(90deg,${cat.color},${cat.color}55)`, zIndex:2 }} />
                    <img src={p.image_url||"https://images.unsplash.com/photo-1568702846914-96b305d2aaeb?w=600&q=80"} alt={p.name} style={{ width:"100%", height:"100%", objectFit:"cover", transition:"transform 0.5s ease" }} />
                    <div style={{ position:"absolute", inset:0, background:"linear-gradient(to top,rgba(10,10,15,0.92) 0%,rgba(10,10,15,0.2) 60%,transparent 100%)" }} />
                    <button onClick={e => { e.stopPropagation(); toggleWishlist(p); }} style={{ position:"absolute", top:14, right:14, width:32, height:32, background:"rgba(10,10,15,0.65)", border:"none", borderRadius:"50%", cursor:"pointer", fontSize:14, display:"flex", alignItems:"center", justifyContent:"center", zIndex:2 }}>
                      {inWish?"❤️":"🤍"}
                    </button>
                    <div style={{ position:"absolute", bottom:0, left:0, right:0, padding:"20px 20px 18px", zIndex:2 }}>
                      <span style={{ background:cat.color, color:"#fff", fontSize:9, fontWeight:800, padding:"3px 8px", borderRadius:100, marginBottom:6, display:"inline-block" }}>{cat.emoji} {p.category}</span>
                      <h3 style={{ color:"#f5f0e8", fontWeight:900, fontSize:18, letterSpacing:"-0.5px", marginBottom:10 }}>{p.name}</h3>
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                        <span style={{ color:"#f5f0e8", fontWeight:900, fontSize:22, letterSpacing:"-0.5px" }}>€{p.price}</span>
                        <button onClick={e => { e.stopPropagation(); addToCart(p); }} style={{ background:cat.color, color:"#fff", border:"none", fontSize:12, fontWeight:700, padding:"8px 16px", borderRadius:10, cursor:"pointer" }}>+ Warenkorb</button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* AI */}
        <AIRecs products={products} cart={cartItems} viewedProduct={selectedProduct} onAddToCart={addToCart} wishlistedIds={wishlistedIds} onToggleWishlist={toggleWishlist} />

        {/* All Products */}
        <div>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
            <h2 style={{ color:"#f5f0e8", fontWeight:900, fontSize:19, letterSpacing:"-0.5px" }}>
              {category === "Alle" ? "📦 Alle Produkte" : `${CATS[category]?.emoji || "📦"} ${category}`}
            </h2>
            <span style={{ color:"rgba(245,240,232,0.3)", fontSize:13 }}>{filtered.length} Produkte</span>
          </div>

          {loading ? (
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))", gap:16 }}>
              {[...Array(8)].map((_,i) => <div key={i} style={{ height:320, background:"rgba(245,240,232,0.03)", borderRadius:20 }} />)}
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign:"center", padding:"80px 0" }}>
              <p style={{ fontSize:48, marginBottom:16 }}>🔍</p>
              <p style={{ color:"rgba(245,240,232,0.3)" }}>Keine Produkte für "{search}"</p>
            </div>
          ) : (
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))", gap:16 }}>
              {filtered.map((product, i) => {
                const cat = CATS[product.category||""] || CATS.default;
                const pReviews = getReviews(product.id);
                const avg = getAvg(product.id);
                const inWish = wishlistedIds.includes(product.id);
                const inCmp = compareList.some(c => c.id === product.id);
                const isLow = product.stock !== undefined && product.stock < 30;
                const selectedRating = productRatings[product.id] ?? 5;
                const comment = productComments[product.id] ?? "";

                return (
                  <div key={product.id} className="product-card" style={{ animationDelay:`${i*0.04}s`, background:"rgba(245,240,232,0.03)", border:`1px solid ${inCmp?`${cat.color}55`:"rgba(245,240,232,0.07)"}`, borderRadius:20, overflow:"hidden", transition:"all 0.25s", cursor:"pointer" }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor=inCmp?`${cat.color}88`:"rgba(245,240,232,0.15)"; e.currentTarget.style.boxShadow=`0 16px 40px rgba(0,0,0,0.4)`; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor=inCmp?`${cat.color}55`:"rgba(245,240,232,0.07)"; e.currentTarget.style.boxShadow="none"; }}>
                    {/* color top bar */}
                    <div style={{ height:3, background:`linear-gradient(90deg,${cat.color},${cat.color}44)` }} />
                    {/* image */}
                    <div style={{ position:"relative", height:170, overflow:"hidden" }} onClick={() => setSelectedProduct(product)}>
                      <img src={product.image_url||"https://images.unsplash.com/photo-1568702846914-96b305d2aaeb?w=400&q=80"} alt={product.name} style={{ width:"100%", height:"100%", objectFit:"cover", transition:"transform 0.4s ease" }}
                        onMouseEnter={e => e.currentTarget.style.transform="scale(1.06)"}
                        onMouseLeave={e => e.currentTarget.style.transform="scale(1)"} />
                      <div style={{ position:"absolute", inset:0, background:"linear-gradient(to top,rgba(10,10,15,0.5) 0%,transparent 50%)" }} />
                      <span style={{ position:"absolute", top:10, left:10, background:`${cat.color}dd`, color:"#fff", fontSize:10, fontWeight:700, padding:"3px 8px", borderRadius:100 }}>{cat.emoji} {product.category||"Produkt"}</span>
                      <button onClick={e => { e.stopPropagation(); toggleWishlist(product); }}
                        style={{ position:"absolute", top:10, right:10, width:28, height:28, background:"rgba(10,10,15,0.7)", border:"none", borderRadius:"50%", cursor:"pointer", fontSize:13, display:"flex", alignItems:"center", justifyContent:"center" }}>
                        {inWish?"❤️":"🤍"}
                      </button>
                      {isLow && <span style={{ position:"absolute", bottom:10, left:10, background:"#ef4444", color:"#fff", fontSize:9, fontWeight:800, padding:"3px 8px", borderRadius:100 }}>Nur {product.stock} übrig!</span>}
                    </div>
                    {/* info */}
                    <div style={{ padding:"14px 16px 0" }} onClick={() => setSelectedProduct(product)}>
                      <h3 style={{ color:"#f5f0e8", fontWeight:800, fontSize:14, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", marginBottom:4 }}>{product.name}</h3>
                      {pReviews.length > 0 && <div style={{ display:"flex", alignItems:"center", gap:5, marginBottom:4 }}><Stars rating={avg} /><span style={{ color:"rgba(245,240,232,0.3)", fontSize:10 }}>({pReviews.length})</span></div>}
                      {product.stock !== undefined && !isLow && <p style={{ color:"rgba(245,240,232,0.22)", fontSize:11, marginBottom:2 }}>{product.stock} auf Lager</p>}
                    </div>
                    <div style={{ padding:"10px 16px" }}>
                      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10 }}>
                        <span style={{ color:"#f5f0e8", fontSize:20, fontWeight:900, letterSpacing:"-0.5px" }}>€{product.price}</span>
                        <button onClick={e => { e.stopPropagation(); addToCart(product); }} style={{ background:cat.color, color:"#fff", border:"none", fontSize:11, fontWeight:800, padding:"7px 14px", borderRadius:9, cursor:"pointer" }}>+ Warenkorb</button>
                      </div>
                      {/* rate */}
                      <div style={{ borderTop:"1px solid rgba(245,240,232,0.05)", paddingTop:10, marginBottom:10 }} onClick={e => e.stopPropagation()}>
                        <div style={{ display:"flex", gap:2, marginBottom:6 }}>
                          {[1,2,3,4,5].map(s => (
                            <button key={s} onClick={() => setProductRatings(p=>({...p,[product.id]:s}))} style={{ background:"none", border:"none", cursor:"pointer", padding:0 }}>
                              <svg width={15} height={15} viewBox="0 0 24 24" fill={s<=selectedRating?"#f59e0b":"none"} stroke="#f59e0b" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                            </button>
                          ))}
                        </div>
                        <textarea value={comment} onChange={e => setProductComments(p=>({...p,[product.id]:e.target.value}))} placeholder="Review..." rows={2}
                          style={{ width:"100%", background:"rgba(245,240,232,0.04)", border:"1px solid rgba(245,240,232,0.07)", borderRadius:8, padding:"6px 10px", color:"#f5f0e8", fontSize:11, resize:"none", outline:"none", fontFamily:"inherit", boxSizing:"border-box", marginBottom:6 }} />
                        <button onClick={e => addReview(e, product.id)} style={{ width:"100%", background:"rgba(245,240,232,0.05)", border:"1px solid rgba(245,240,232,0.08)", color:"rgba(245,240,232,0.5)", fontSize:11, fontWeight:700, padding:"6px", borderRadius:8, cursor:"pointer" }}>Review senden</button>
                      </div>
                      {/* compare + delete */}
                      <div style={{ display:"flex", gap:6 }} onClick={e => e.stopPropagation()}>
                        <button onClick={() => toggleCompare(product)} style={{ flex:1, background:inCmp?`${cat.color}22`:"rgba(245,240,232,0.03)", border:`1px solid ${inCmp?`${cat.color}44`:"rgba(245,240,232,0.07)"}`, color:inCmp?cat.color:"rgba(245,240,232,0.3)", fontSize:10, fontWeight:600, padding:"6px", borderRadius:8, cursor:"pointer" }}>
                          {inCmp?"✓ Im Vergleich":"+ Vergleich"}
                        </button>
                        {user?.user_metadata?.role === "admin" && (
                          <button onClick={() => deleteProduct(product.id)} style={{ flex:1, background:"rgba(239,68,68,0.07)", border:"1px solid rgba(239,68,68,0.15)", color:"rgba(239,68,68,0.5)", fontSize:10, fontWeight:600, padding:"6px", borderRadius:8, cursor:"pointer" }}>🗑 Löschen</button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Bottom CTA */}
        {!loading && filtered.length > 0 && (
          <div style={{ marginTop:64, position:"relative", overflow:"hidden", background:"rgba(232,82,26,0.08)", border:"1px solid rgba(232,82,26,0.2)", borderRadius:24, padding:"48px 40px", textAlign:"center" }}>
            <div style={{ position:"absolute", top:-60, right:-60, width:250, height:250, background:`radial-gradient(circle,rgba(232,82,26,0.25),transparent)`, pointerEvents:"none" }} />
            <h3 style={{ color:"#f5f0e8", fontSize:26, fontWeight:900, marginBottom:8, letterSpacing:"-0.5px" }}>Du bist Marke oder Hersteller?</h3>
            <p style={{ color:"rgba(245,240,232,0.4)", fontSize:14, marginBottom:28 }}>Liste kostenlos und erreiche hunderte Kioske in ganz Deutschland.</p>
            <a href="/supplier" style={{ background:"#e8521a", color:"#fff", fontWeight:700, padding:"14px 32px", borderRadius:12, textDecoration:"none", fontSize:14 }}>Jetzt kostenlos listen →</a>
          </div>
        )}
      </div>
    </main>
  );
}