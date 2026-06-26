"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Breadcrumb } from "@/components/ui/step-breadcrumb";

const BG = "var(--kf-bg)";
const SURFACE = "var(--kf-surface)";
const BORDER = "var(--kf-border)";
const TEXT = "var(--kf-text)";
const TEXT2 = "var(--kf-text2)";
const TEXT3 = "var(--kf-text3)";
const ORANGE = "#E8521A";

interface Product { id: string; name: string; price: number; image_url: string | null; }
interface CartItem { id: string; quantity: number; products: Product; }

export default function CartPage() {
  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [discountCode, setDiscountCode] = useState("");
  const [discount, setDiscount] = useState(0);
  const [discountMsg, setDiscountMsg] = useState<{text:string;ok:boolean}|null>(null);

  const fetchCart = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setLoading(false); return; }
      const { data, error } = await supabase.from("cart_items").select(`id, quantity, products (id, name, price, image_url)`).eq("user_id", session.user.id);
      if (error) throw error;
      setItems((data as unknown as CartItem[]) || []);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCart(); }, []);

  const increaseQuantity = async (id: string, quantity: number) => {
    await supabase.from("cart_items").update({ quantity: quantity + 1 }).eq("id", id);
    fetchCart();
  };

  const decreaseQuantity = async (id: string, quantity: number) => {
    if (quantity <= 1) return;
    await supabase.from("cart_items").update({ quantity: quantity - 1 }).eq("id", id);
    fetchCart();
  };

  const removeItem = async (id: string) => {
    await supabase.from("cart_items").delete().eq("id", id);
    setItems(prev => prev.filter(i => i.id !== id));
  };

  const removeAllCart = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    await supabase.from("cart_items").delete().eq("user_id", session.user.id);
    setItems([]);
  };

  const applyDiscount = () => {
    if (discountCode === "OMED10") { setDiscount(0.1); setDiscountMsg({ text:"10% Rabatt angewendet", ok:true }); }
    else if (discountCode === "OMED20") { setDiscount(0.2); setDiscountMsg({ text:"20% Rabatt angewendet", ok:true }); }
    else setDiscountMsg({ text:"Ungültiger Rabattcode", ok:false });
  };

  const subtotal = items.reduce((sum, item) => sum + item.products.price * item.quantity, 0);
  const discountAmount = subtotal * discount;
  const total = subtotal - discountAmount;
  const cartCount = items.reduce((s, i) => s + i.quantity, 0);

  if (loading) {
    return (
      <main style={{ minHeight:"100vh", background:BG, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'DM Sans',system-ui,sans-serif" }}>
        <style>{`@keyframes spin { to { transform:rotate(360deg); } }`}</style>
        <div style={{ textAlign:"center" }}>
          <div style={{ width:36, height:36, border:`3px solid ${BORDER}`, borderTopColor:ORANGE, borderRadius:"50%", animation:"spin 0.8s linear infinite", margin:"0 auto 14px" }} />
          <p style={{ color:TEXT3, fontSize:13 }}>Warenkorb laden...</p>
        </div>
      </main>
    );
  }

  return (
    <main style={{ minHeight:"100vh", background:BG, fontFamily:"'DM Sans','Helvetica Neue',system-ui,sans-serif", color:TEXT, paddingBottom:80 }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500;600;700&display=swap'); @keyframes spin { to { transform:rotate(360deg); } }`}</style>

      {/* Header */}
      <header style={{ background:SURFACE, borderBottom:`1px solid ${BORDER}`, padding:"0 20px", height:60, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <div style={{ width:30, height:30, background:ORANGE, borderRadius:7, display:"flex", alignItems:"center", justifyContent:"center", fontWeight:900, fontSize:14, color:"#fff", fontFamily:"'Syne',sans-serif" }}>K</div>
          <span style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:15, color:TEXT, letterSpacing:"-0.3px" }}>KioskFlow</span>
        </div>
        <a href="/marketplace" style={{ color:TEXT2, fontSize:13, fontWeight:500, textDecoration:"none", display:"flex", alignItems:"center", gap:5 }}>← Weiter einkaufen</a>
      </header>

      {/* Step breadcrumb */}
      <div style={{ background:SURFACE, borderBottom:`1px solid ${BORDER}`, padding:"10px 20px" }}>
        <div style={{ maxWidth:680, margin:"0 auto" }}>
          <Breadcrumb
            steps={[
              { id:"01", name:"Warenkorb", status:"current" },
              { id:"02", name:"Kasse", status:"upcoming" },
              { id:"03", name:"Zahlung", status:"upcoming" },
              { id:"04", name:"Bestätigung", status:"upcoming" },
            ]}
          />
        </div>
      </div>

      <div style={{ maxWidth:680, margin:"0 auto", padding:"28px 20px" }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:24 }}>
          <div>
            <h1 style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:26, color:TEXT, letterSpacing:"-0.5px", marginBottom:4 }}>Warenkorb</h1>
            <p style={{ color:TEXT3, fontSize:13 }}>{cartCount} Artikel ausgewählt</p>
          </div>
          {items.length > 0 && (
            <button onClick={removeAllCart} style={{ background:"none", border:`1.5px solid ${BORDER}`, borderRadius:8, padding:"8px 14px", color:TEXT2, fontSize:13, cursor:"pointer", fontWeight:500 }}>Alles entfernen</button>
          )}
        </div>

        {items.length === 0 ? (
          <div style={{ textAlign:"center", padding:"80px 0" }}>
            <p style={{ fontSize:64, marginBottom:20 }}>🛒</p>
            <h2 style={{ fontFamily:"'Syne',sans-serif", color:TEXT, fontSize:22, fontWeight:800, marginBottom:10 }}>Dein Warenkorb ist leer</h2>
            <p style={{ color:TEXT2, fontSize:14, marginBottom:28 }}>Entdecke unsere Produkte und füge sie hier hinzu.</p>
            <a href="/marketplace" style={{ display:"inline-block", background:ORANGE, color:"#fff", fontWeight:700, padding:"13px 28px", borderRadius:12, textDecoration:"none", fontSize:14 }}>Zum Marktplatz →</a>
          </div>
        ) : (
          <div style={{ display:"grid", gridTemplateColumns:"1fr 340px", gap:20, alignItems:"start" }}>

            {/* Item list */}
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              {items.map(item => {
                const img = item.products.image_url && item.products.image_url.trim() !== "" ? item.products.image_url : "https://images.unsplash.com/photo-1568702846914-96b305d2aaeb?w=300&q=80";
                return (
                  <div key={item.id} style={{ background:SURFACE, border:`1px solid ${BORDER}`, borderRadius:14, padding:"16px", display:"flex", alignItems:"center", gap:14 }}>
                    <div style={{ width:72, height:72, borderRadius:10, overflow:"hidden", flexShrink:0 }}>
                      <img src={img} alt={item.products.name} style={{ width:"100%", height:"100%", objectFit:"cover" }} />
                    </div>
                    <div style={{ flex:1 }}>
                      <p style={{ color:TEXT, fontWeight:600, fontSize:14, marginBottom:4 }}>{item.products.name}</p>
                      <p style={{ color:ORANGE, fontWeight:700, fontSize:14 }}>€{item.products.price.toFixed(2)} / Stück</p>
                    </div>
                    <div style={{ display:"flex", alignItems:"center", gap:6, flexShrink:0 }}>
                      <button onClick={() => decreaseQuantity(item.id, item.quantity)} style={{ width:30, height:30, background:BG, border:`1px solid ${BORDER}`, borderRadius:7, color:TEXT, cursor:"pointer", fontSize:15, fontWeight:700, display:"flex", alignItems:"center", justifyContent:"center" }}>−</button>
                      <span style={{ width:28, textAlign:"center", color:TEXT, fontWeight:700, fontSize:14 }}>{item.quantity}</span>
                      <button onClick={() => increaseQuantity(item.id, item.quantity)} style={{ width:30, height:30, background:ORANGE, border:"none", borderRadius:7, color:"#fff", cursor:"pointer", fontSize:15, fontWeight:700, display:"flex", alignItems:"center", justifyContent:"center" }}>+</button>
                    </div>
                    <div style={{ flexShrink:0, textAlign:"right", minWidth:70 }}>
                      <p style={{ color:TEXT, fontWeight:700, fontSize:15 }}>€{(item.products.price*item.quantity).toFixed(2)}</p>
                      <button onClick={() => removeItem(item.id)} style={{ background:"none", border:"none", color:TEXT3, cursor:"pointer", fontSize:12, marginTop:6 }}>Entfernen</button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Summary sidebar */}
            <div style={{ position:"sticky", top:20 }}>
              {/* Discount */}
              <div style={{ background:SURFACE, border:`1px solid ${BORDER}`, borderRadius:14, padding:"18px", marginBottom:12 }}>
                <p style={{ fontWeight:700, fontSize:13, color:TEXT, marginBottom:12 }}>Rabattcode</p>
                <div style={{ display:"flex", gap:8 }}>
                  <input value={discountCode} onChange={e => setDiscountCode(e.target.value)} placeholder="Code eingeben"
                    style={{ flex:1, background:BG, border:`1.5px solid ${BORDER}`, borderRadius:8, padding:"9px 12px", color:TEXT, fontSize:13, outline:"none" }}
                    onFocus={e => e.currentTarget.style.borderColor=ORANGE}
                    onBlur={e => e.currentTarget.style.borderColor=BORDER} />
                  <button onClick={applyDiscount} style={{ background:ORANGE, color:"#fff", border:"none", borderRadius:8, padding:"9px 14px", fontWeight:700, fontSize:13, cursor:"pointer", flexShrink:0 }}>OK</button>
                </div>
                {discountMsg && <p style={{ fontSize:12, color:discountMsg.ok?"#16a34a":"#dc2626", marginTop:8, fontWeight:500 }}>{discountMsg.text}</p>}
              </div>

              {/* Totals */}
              <div style={{ background:SURFACE, border:`1px solid ${BORDER}`, borderRadius:14, padding:"18px" }}>
                <p style={{ fontWeight:700, fontSize:13, color:TEXT, marginBottom:16 }}>Zusammenfassung</p>
                <div style={{ display:"flex", flexDirection:"column", gap:10, marginBottom:16 }}>
                  <div style={{ display:"flex", justifyContent:"space-between" }}>
                    <span style={{ color:TEXT2, fontSize:13 }}>Zwischensumme</span>
                    <span style={{ color:TEXT, fontSize:13, fontWeight:600 }}>€{subtotal.toFixed(2)}</span>
                  </div>
                  {discount > 0 && (
                    <div style={{ display:"flex", justifyContent:"space-between" }}>
                      <span style={{ color:"#16a34a", fontSize:13 }}>Rabatt ({discount*100}%)</span>
                      <span style={{ color:"#16a34a", fontSize:13, fontWeight:600 }}>−€{discountAmount.toFixed(2)}</span>
                    </div>
                  )}
                  <div style={{ display:"flex", justifyContent:"space-between" }}>
                    <span style={{ color:TEXT2, fontSize:13 }}>Lieferung</span>
                    <span style={{ color:"#16a34a", fontSize:13, fontWeight:600 }}>Kostenlos</span>
                  </div>
                </div>
                <div style={{ borderTop:`1.5px solid ${BORDER}`, paddingTop:14, display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:18 }}>
                  <span style={{ fontFamily:"'Syne',sans-serif", fontWeight:700, fontSize:15, color:TEXT }}>Gesamt</span>
                  <span style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:22, color:TEXT, letterSpacing:"-0.5px" }}>€{total.toFixed(2)}</span>
                </div>
                <a href="/checkout" style={{ display:"block", background:ORANGE, color:"#fff", fontWeight:700, padding:"14px", borderRadius:11, textDecoration:"none", fontSize:14, textAlign:"center", boxShadow:`0 4px 14px rgba(232,82,26,0.25)` }}>Zur Kasse →</a>
                <a href="/marketplace" style={{ display:"block", background:BG, color:TEXT2, fontWeight:600, padding:"12px", borderRadius:11, textDecoration:"none", fontSize:13, textAlign:"center", marginTop:8 }}>Weiter einkaufen</a>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom nav */}
      <nav style={{ position:"fixed", bottom:0, left:0, right:0, background:SURFACE, borderTop:`1px solid ${BORDER}`, display:"flex", justifyContent:"space-around", padding:"10px 0 14px", zIndex:50 }}>
        {[{icon:"🏪",label:"Marktplatz",href:"/marketplace",active:false},{icon:"🛒",label:"Warenkorb",href:"/cart",active:true},{icon:"📦",label:"Bestellungen",href:"/orders",active:false},{icon:"👤",label:"Profil",href:"/profile",active:false}].map(({ icon, label, href, active }) => (
          <a key={label} href={href} style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:3, textDecoration:"none", padding:"0 12px" }}>
            <span style={{ fontSize:20, lineHeight:1 }}>{icon}</span>
            <span style={{ fontSize:10, fontWeight:active?700:500, color:active?ORANGE:TEXT3 }}>{label}</span>
            {active && <div style={{ width:16, height:2, background:ORANGE, borderRadius:2, marginTop:1 }} />}
          </a>
        ))}
      </nav>
    </main>
  );
}
