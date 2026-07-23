"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { translateAuthError } from "@/lib/utils";
import { useRouter } from "next/navigation";

const BG = "var(--kf-bg)";
const SURFACE = "var(--kf-surface)";
const BORDER = "var(--kf-border)";
const TEXT = "var(--kf-text)";
const TEXT2 = "var(--kf-text2)";
const TEXT3 = "var(--kf-text3)";
const ORANGE = "#003ec7";
const ACCENT = "var(--kf-accent)";
const BTN    = "var(--kf-btn)";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const check = () => setIsDark(document.documentElement.classList.contains("dark"));
    check();
    const obs = new MutationObserver(check);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);

  const accentColor = isDark ? ACCENT : ORANGE;
  const btnColor    = isDark ? BTN    : ORANGE;

  const handleLogin = async () => {
    setErrorMsg("");
    if (!email || !password) { setErrorMsg("E-Mail und Passwort erforderlich."); return; }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) setErrorMsg(translateAuthError(error));
    else {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
        const role = profile?.role;
        if (role === "admin") router.push("/owner/dashboard");
        else if (role === "supplier") router.push("/supplier/dashboard");
        else router.push("/marketplace");
      } else {
        router.push("/marketplace");
      }
    }
  };

  return (
    <main style={{ minHeight:"100vh", background:BG, display:"flex", fontFamily:"'Inter','Helvetica Neue',system-ui,sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@600;700;800&family=Inter:wght@400;500;600;700&display=swap');
        input::placeholder { color: ${TEXT3}; }
        input:focus { outline:none; border-color:${accentColor} !important; box-shadow:0 0 0 3px rgba(0,62,199,0.1); }
      `}</style>

      {/* Left — brand panel */}
      <div style={{ width:"45%", background:`linear-gradient(150deg, ${ORANGE} 0%, #1D4ED8 100%)`, display:"flex", flexDirection:"column", justifyContent:"space-between", padding:"48px 52px", position:"relative", overflow:"hidden" }}>
        <div style={{ position:"absolute", top:-80, right:-80, width:320, height:320, borderRadius:"50%", background:"rgba(255,255,255,0.08)" }} />
        <div style={{ position:"absolute", bottom:-100, left:-60, width:280, height:280, borderRadius:"50%", background:"rgba(0,0,0,0.06)" }} />

        <div style={{ display:"flex", alignItems:"center", gap:10, position:"relative" }}>
          <img src="/flowio-icon.png" alt="Flowio" style={{ width: 36, height: 36, borderRadius: 9, objectFit: "cover" }} />
          <span style={{ fontFamily:"'Manrope',sans-serif", fontWeight:800, fontSize:16, color:"#fff", letterSpacing:"-0.3px" }}>Flowio</span>
        </div>

        <div style={{ position:"relative" }}>
          <h1 style={{ fontFamily:"'Manrope',sans-serif", fontWeight:800, fontSize:"clamp(30px,3vw,44px)", color:"#fff", lineHeight:1.1, letterSpacing:"-1.5px", marginBottom:18 }}>
            Direkt vom<br/>
            Hersteller<br/>
            zum Kiosk.
          </h1>
          <p style={{ color:"rgba(255,255,255,0.65)", fontSize:14, lineHeight:1.7, maxWidth:300 }}>
            Keine Mindestmengen. Kein Zwischenhändler. Lokale Marken in Frankfurt direkt bestellen.
          </p>
        </div>

        <div style={{ display:"flex", gap:36, position:"relative" }}>
          {[{v:"100%",l:"Direktpreise"},{v:"0€",l:"Mindestbestellung"},{v:"24h",l:"Lieferung"}].map(({ v, l }) => (
            <div key={l}>
              <p style={{ fontFamily:"'Manrope',sans-serif", fontSize:24, fontWeight:800, color:"#fff", letterSpacing:"-0.5px" }}>{v}</p>
              <p style={{ fontSize:12, color:"rgba(255,255,255,0.55)", marginTop:2 }}>{l}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Right — form */}
      <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", padding:"48px 40px" }}>
        <div style={{ width:"100%", maxWidth:400 }}>
          <p style={{ fontSize:11, fontWeight:700, color:TEXT3, letterSpacing:"2.5px", textTransform:"uppercase", marginBottom:28 }}>Einloggen</p>
          <h2 style={{ fontFamily:"'Manrope',sans-serif", fontWeight:800, fontSize:28, color:TEXT, letterSpacing:"-0.5px", marginBottom:8 }}>Willkommen zurück</h2>
          <p style={{ color:TEXT2, fontSize:14, marginBottom:32 }}>Dein Flowio-Dashboard wartet auf dich.</p>

          {errorMsg && (
            <div style={{ background: isDark ? "rgba(239,68,68,0.15)" : "#fef2f2", border: `1.5px solid ${isDark ? "rgba(239,68,68,0.3)" : "#fca5a5"}`, borderRadius:10, padding:"12px 16px", marginBottom:24 }}>
              <p style={{ color: isDark ? "#f87171" : "#dc2626", fontSize:13 }}>{errorMsg}</p>
            </div>
          )}

          <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
            <div>
              <label style={{ display:"block", fontSize:12, fontWeight:600, color:TEXT2, marginBottom:7, letterSpacing:"0.3px" }}>E-Mail</label>
              <input type="email" placeholder="name@firma.de" value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key==="Enter"&&handleLogin()}
                style={{ width:"100%", background:SURFACE, border:`1.5px solid ${BORDER}`, borderRadius: isDark ? 4 : 11, padding:"12px 15px", color:TEXT, fontSize:14, boxSizing:"border-box", transition:"border-color 0.2s, box-shadow 0.2s" }} />
            </div>

            <div>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:7 }}>
                <label style={{ display:"block", fontSize:12, fontWeight:600, color:TEXT2, letterSpacing:"0.3px" }}>Passwort</label>
                <a href="/auth/forgot-password" style={{ fontSize:12, color:accentColor, fontWeight:600, textDecoration:"none" }}>Passwort vergessen?</a>
              </div>
              <input type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key==="Enter"&&handleLogin()}
                style={{ width:"100%", background:SURFACE, border:`1.5px solid ${BORDER}`, borderRadius: isDark ? 4 : 11, padding:"12px 15px", color:TEXT, fontSize:14, boxSizing:"border-box", transition:"border-color 0.2s, box-shadow 0.2s" }} />
            </div>

            <button onClick={handleLogin} disabled={loading}
              style={{ width:"100%", background:loading?"rgba(0,62,199,0.55)":btnColor, color:"#fff", border:"none", borderRadius: isDark ? 4 : 11, padding:"14px", fontFamily:"'Inter',sans-serif", fontWeight:700, fontSize:15, cursor:loading?"not-allowed":"pointer", marginTop:4, transition:"opacity 0.2s", boxShadow:`0 4px 14px rgba(0,62,199,0.25)` }}>
              {loading ? "Einen Moment..." : "Einloggen →"}
            </button>
          </div>

          <div style={{ display:"flex", alignItems:"center", gap:14, margin:"24px 0" }}>
            <div style={{ flex:1, height:1, background:BORDER }} />
            <span style={{ color:TEXT3, fontSize:12 }}>oder</span>
            <div style={{ flex:1, height:1, background:BORDER }} />
          </div>

          <p style={{ color:TEXT2, fontSize:13, textAlign:"center" }}>
            Noch kein Account?{" "}
            <a href="/signup" style={{ color:accentColor, fontWeight:700, textDecoration:"none" }}>Kostenlos registrieren</a>
          </p>

          <p style={{ color:TEXT3, fontSize:11, textAlign:"center", marginTop:32 }}>
            Durch das Einloggen stimmst du unseren{" "}
            <a href="/agb" style={{ color:TEXT3, textDecoration:"underline" }}>AGB</a> zu.
          </p>
        </div>
      </div>
    </main>
  );
}
