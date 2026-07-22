"use client";

const BG = "var(--kf-bg)";
const SURFACE = "var(--kf-surface)";
const BORDER = "var(--kf-border)";
const TEXT = "var(--kf-text)";
const TEXT2 = "var(--kf-text2)";
const TEXT3 = "var(--kf-text3)";
const ORANGE = "#003ec7";

export default function SignupPage() {

  return (
    <main style={{ minHeight: "100vh", background: BG, display: "flex", fontFamily: "'Inter','Helvetica Neue',system-ui,sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@600;700;800&family=Inter:wght@400;500;600;700&display=swap'); input::placeholder { color: var(--kf-text3); }`}</style>

      {/* Left — brand panel */}
      <div style={{ width: "45%", background: `linear-gradient(150deg, ${ORANGE} 0%, #1D4ED8 100%)`, display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "48px 52px", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: -80, right: -80, width: 320, height: 320, borderRadius: "50%", background: "rgba(255,255,255,0.08)" }} />
        <div style={{ position: "absolute", bottom: -100, left: -60, width: 280, height: 280, borderRadius: "50%", background: "rgba(0,0,0,0.06)" }} />

        <a href="/marketplace" style={{ display: "flex", alignItems: "center", gap: 10, position: "relative", textDecoration: "none" }}>
          <img src="/flowio-icon.png" alt="Flowio" style={{ width: 36, height: 36, borderRadius: 9, objectFit: "cover" }} />
          <span style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontWeight: 800, fontSize: 16, color: "#fff", letterSpacing: "-0.3px" }}>Flowio</span>
        </a>

        <div style={{ position: "relative" }}>
          <h1 style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontWeight: 800, fontSize: "clamp(28px,3vw,42px)", color: "#fff", lineHeight: 1.1, letterSpacing: "-1.2px", marginBottom: 18 }}>
            Willkommen bei<br />Flowio.
          </h1>
          <p style={{ color: "rgba(255,255,255,0.65)", fontSize: 14, lineHeight: 1.7, maxWidth: 300 }}>
            Tritt unserem B2B-Netzwerk bei. Direkt vom Hersteller zum Kiosk — ohne Mindestmengen.
          </p>
        </div>

        <div style={{ display: "flex", gap: 36, position: "relative" }}>
          {[{ v: "100%", l: "Direktpreise" }, { v: "0€", l: "Mindestbestellung" }, { v: "24h", l: "Lieferung" }].map(({ v, l }) => (
            <div key={l}>
              <p style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 24, fontWeight: 800, color: "#fff", letterSpacing: "-0.5px" }}>{v}</p>
              <p style={{ fontSize: 12, color: "rgba(255,255,255,0.55)", marginTop: 2 }}>{l}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Right — form */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "48px 40px" }}>
        <div style={{ width: "100%", maxWidth: 400 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: TEXT3, letterSpacing: "2.5px", textTransform: "uppercase", marginBottom: 28 }}>Registrieren</p>
          <h2 style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontWeight: 800, fontSize: 28, color: TEXT, letterSpacing: "-0.5px", marginBottom: 8 }}>Konto erstellen</h2>
          <p style={{ color: TEXT2, fontSize: 14, marginBottom: 32 }}>Tritt Flowio kostenlos bei.</p>

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
                <p style={{ fontFamily: "'Inter',sans-serif", fontWeight: 700, fontSize: 14, color: TEXT, textAlign: "center" }}>{opt.label}</p>
                <p style={{ fontSize: 12, color: TEXT3, textAlign: "center" }}>{opt.sub}</p>
              </a>
            ))}
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
