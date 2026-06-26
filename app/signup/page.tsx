"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

const BG = "var(--kf-bg)";
const SURFACE = "var(--kf-surface)";
const BORDER = "var(--kf-border)";
const TEXT = "var(--kf-text)";
const TEXT2 = "var(--kf-text2)";
const TEXT3 = "var(--kf-text3)";
const ORANGE = "#E8521A";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  const handleSignup = async () => {
    if (!email || !password) { setMsg({ text: "E-Mail und Passwort erforderlich.", ok: false }); return; }
    setLoading(true);
    const { error } = await supabase.auth.signUp({ email, password });
    setLoading(false);
    if (error) setMsg({ text: error.message, ok: false });
    else { setMsg({ text: "Konto erstellt! Weiterleitung...", ok: true }); setTimeout(() => window.location.href = "/login", 1200); }
  };

  return (
    <main style={{ minHeight: "100vh", background: BG, display: "flex", fontFamily: "'DM Sans','Helvetica Neue',system-ui,sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500;600;700&display=swap'); input::placeholder { color: var(--kf-text3); }`}</style>

      {/* Left — brand panel */}
      <div style={{ width: "45%", background: `linear-gradient(150deg, ${ORANGE} 0%, #c4411a 100%)`, display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "48px 52px", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: -80, right: -80, width: 320, height: 320, borderRadius: "50%", background: "rgba(255,255,255,0.08)" }} />
        <div style={{ position: "absolute", bottom: -100, left: -60, width: 280, height: 280, borderRadius: "50%", background: "rgba(0,0,0,0.06)" }} />

        <a href="/marketplace" style={{ display: "flex", alignItems: "center", gap: 10, position: "relative", textDecoration: "none" }}>
          <div style={{ width: 36, height: 36, background: "rgba(255,255,255,0.2)", backdropFilter: "blur(10px)", border: "1.5px solid rgba(255,255,255,0.3)", borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 17, color: "#fff", fontFamily: "'Syne',sans-serif" }}>K</div>
          <span style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 16, color: "#fff", letterSpacing: "-0.3px" }}>KioskFlow</span>
        </a>

        <div style={{ position: "relative" }}>
          <h1 style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: "clamp(28px,3vw,42px)", color: "#fff", lineHeight: 1.1, letterSpacing: "-1.2px", marginBottom: 18 }}>
            Willkommen bei<br />KioskFlow.
          </h1>
          <p style={{ color: "rgba(255,255,255,0.65)", fontSize: 14, lineHeight: 1.7, maxWidth: 300 }}>
            Tritt unserem B2B-Netzwerk bei. Direkt vom Hersteller zum Kiosk — ohne Mindestmengen.
          </p>
        </div>

        <div style={{ display: "flex", gap: 36, position: "relative" }}>
          {[{ v: "500+", l: "Kioske" }, { v: "50+", l: "Marken" }, { v: "24h", l: "Lieferung" }].map(({ v, l }) => (
            <div key={l}>
              <p style={{ fontFamily: "'Syne',sans-serif", fontSize: 24, fontWeight: 800, color: "#fff", letterSpacing: "-0.5px" }}>{v}</p>
              <p style={{ fontSize: 12, color: "rgba(255,255,255,0.55)", marginTop: 2 }}>{l}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Right — form */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "48px 40px" }}>
        <div style={{ width: "100%", maxWidth: 400 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: TEXT3, letterSpacing: "2.5px", textTransform: "uppercase", marginBottom: 28 }}>Registrieren</p>
          <h2 style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 28, color: TEXT, letterSpacing: "-0.5px", marginBottom: 8 }}>Konto erstellen</h2>
          <p style={{ color: TEXT2, fontSize: 14, marginBottom: 32 }}>Tritt KioskFlow kostenlos bei.</p>

          {msg && (
            <div style={{ background: msg.ok ? "#f0fdf4" : "#fef2f2", border: `1.5px solid ${msg.ok ? "#bbf7d0" : "#fca5a5"}`, borderRadius: 10, padding: "12px 16px", marginBottom: 24 }}>
              <p style={{ color: msg.ok ? "#16a34a" : "#dc2626", fontSize: 13 }}>{msg.text}</p>
            </div>
          )}

          {/* Role choice */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 24 }}>
            {[
              { label: "Als Käufer", sub: "Produkte bestellen", href: "/signup/buyer", icon: "🛒" },
              { label: "Als Verkäufer", sub: "Produkte verkaufen", href: "/signup/supplier", icon: "📦" },
            ].map(opt => (
              <a key={opt.href} href={opt.href} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, padding: "18px 12px", background: SURFACE, border: `1.5px solid ${BORDER}`, borderRadius: 12, textDecoration: "none", transition: "border-color 0.2s" }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = ORANGE)}
                onMouseLeave={e => (e.currentTarget.style.borderColor = BORDER)}>
                <span style={{ fontSize: 28 }}>{opt.icon}</span>
                <p style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 14, color: TEXT, textAlign: "center" }}>{opt.label}</p>
                <p style={{ fontSize: 12, color: TEXT3, textAlign: "center" }}>{opt.sub}</p>
              </a>
            ))}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 14, margin: "0 0 20px" }}>
            <div style={{ flex: 1, height: 1, background: BORDER }} />
            <span style={{ color: TEXT3, fontSize: 12 }}>oder schnell registrieren</span>
            <div style={{ flex: 1, height: 1, background: BORDER }} />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <input type="email" placeholder="E-Mail" value={email} onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSignup()}
              style={{ width: "100%", background: SURFACE, border: `1.5px solid ${BORDER}`, borderRadius: 11, padding: "12px 15px", color: TEXT, fontSize: 14, boxSizing: "border-box" }}
              onFocus={e => { e.currentTarget.style.borderColor = ORANGE; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(232,82,26,0.1)"; }}
              onBlur={e => { e.currentTarget.style.borderColor = BORDER; e.currentTarget.style.boxShadow = "none"; }} />
            <input type="password" placeholder="Passwort" value={password} onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSignup()}
              style={{ width: "100%", background: SURFACE, border: `1.5px solid ${BORDER}`, borderRadius: 11, padding: "12px 15px", color: TEXT, fontSize: 14, boxSizing: "border-box" }}
              onFocus={e => { e.currentTarget.style.borderColor = ORANGE; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(232,82,26,0.1)"; }}
              onBlur={e => { e.currentTarget.style.borderColor = BORDER; e.currentTarget.style.boxShadow = "none"; }} />
            <button onClick={handleSignup} disabled={loading}
              style={{ background: loading ? "rgba(232,82,26,0.55)" : ORANGE, color: "#fff", border: "none", borderRadius: 11, padding: "14px", fontWeight: 700, fontSize: 15, cursor: loading ? "not-allowed" : "pointer", boxShadow: "0 4px 14px rgba(232,82,26,0.25)" }}>
              {loading ? "Wird erstellt..." : "Konto erstellen →"}
            </button>
          </div>

          <p style={{ color: TEXT2, fontSize: 13, textAlign: "center", marginTop: 24 }}>
            Bereits registriert?{" "}
            <a href="/login" style={{ color: ORANGE, fontWeight: 700, textDecoration: "none" }}>Einloggen</a>
          </p>
        </div>
      </div>
    </main>
  );
}
