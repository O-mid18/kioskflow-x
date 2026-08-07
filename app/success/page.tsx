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
const ORANGE = "#003ec7";

export default function SuccessPage() {
  const [cleared,     setCleared]     = useState(false);
  const [orderNumber, setOrderNumber] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get("session_id");

    const init = async () => {
      if (sessionId) {
        const { data } = await supabase
          .from("orders")
          .select("id")
          .eq("stripe_session_id", sessionId)
          .maybeSingle();
        if (data?.id) {
          setOrderNumber(data.id.slice(-8).toUpperCase());
        } else {
          setTimeout(async () => {
            const { data: retry } = await supabase
              .from("orders")
              .select("id")
              .eq("stripe_session_id", sessionId)
              .maybeSingle();
            setOrderNumber(retry?.id ? retry.id.slice(-8).toUpperCase() : sessionId.slice(-8).toUpperCase());
          }, 2000);
        }
      } else {
        setOrderNumber(Date.now().toString().slice(-6));
      }
      clearCart();
    };

    init();
  }, []);

  const clearCart = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await supabase.from("cart_items").delete().eq("user_id", user.id);
      setCleared(true);
    } catch {
      // silent
    }
  };

  return (
    <main style={{ minHeight:"100vh", background:BG, fontFamily:"'Inter','Helvetica Neue',system-ui,sans-serif" }}>
      <style>{`@keyframes pop { 0% { transform:scale(0.7); opacity:0; } 80% { transform:scale(1.08); } 100% { transform:scale(1); opacity:1; } }`}</style>

      {/* Step breadcrumb — all complete */}
      <div style={{ background:SURFACE, borderBottom:`1px solid ${BORDER}`, padding:"10px 24px" }}>
        <div style={{ maxWidth:500, margin:"0 auto" }}>
          <Breadcrumb
            steps={[
              { id:"01", name:"Warenkorb", status:"complete" },
              { id:"02", name:"Kasse", status:"complete" },
              { id:"03", name:"Zahlung", status:"complete" },
              { id:"04", name:"Bestätigung", status:"current" },
            ]}
          />
        </div>
      </div>

      <div style={{ display:"flex", alignItems:"center", justifyContent:"center", padding:24, paddingTop:48 }}>
      <div style={{ background:SURFACE, border:`1px solid ${BORDER}`, borderRadius:24, padding:"52px 44px", maxWidth:480, width:"100%", textAlign:"center", boxShadow:"0 20px 60px rgba(0,0,0,0.06)" }}>
        {/* Check icon */}
        <div style={{ width:72, height:72, background:"#f0fdf4", border:"2px solid #bbf7d0", borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 28px", animation:"pop 0.5s cubic-bezier(0.4,0,0.2,1)" }}>
          <svg width={32} height={32} viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>

        <h1 style={{ fontFamily:"'Manrope',sans-serif", fontWeight:800, fontSize:28, color:TEXT, letterSpacing:"-0.8px", marginBottom:12 }}>
          Zahlung erfolgreich!
        </h1>
        <p style={{ color:TEXT2, fontSize:14, lineHeight:1.7, marginBottom:10 }}>
          Deine Bestellung wurde aufgenommen.
        </p>
        <p style={{ color:TEXT3, fontSize:13, lineHeight:1.7, marginBottom:36 }}>
          Unsere Lieferanten bereiten deine Sendung vor. Du erhältst eine Bestätigungs-E-Mail.
        </p>

        {/* Order number placeholder */}
        <div style={{ background:BG, border:`1px solid ${BORDER}`, borderRadius:12, padding:"14px 18px", display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:28 }}>
          <span style={{ color:TEXT2, fontSize:13 }}>Bestellnummer</span>
          <span style={{ fontFamily:"'Manrope',sans-serif", fontWeight:700, fontSize:14, color:TEXT }}>{orderNumber ? `#KF-${orderNumber}` : "—"}</span>
        </div>

        <a href="/marketplace" style={{ display:"block", background:ORANGE, color:"#fff", fontWeight:700, padding:"14px", borderRadius:12, textDecoration:"none", fontSize:14, marginBottom:12, boxShadow:`0 4px 14px rgba(0,62,199,0.25)` }}>
          Weiter einkaufen →
        </a>
        <a href="/orders" style={{ display:"block", background:BG, border:`1px solid ${BORDER}`, color:TEXT2, fontWeight:600, padding:"13px", borderRadius:12, textDecoration:"none", fontSize:14 }}>
          Bestellungen ansehen
        </a>
      </div>
      </div>
    </main>
  );
}
