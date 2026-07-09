import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Vendoro — Direkt vom Hersteller zum Kiosk",
  description: "B2B Marktplatz fuer lokale Marken und Kiosk-Betreiber in Frankfurt.",
};

const ORANGE = "#E8521A";

export default function HomePage() {
  return (
    <main style={{ background: "var(--kf-bg)", color: "var(--kf-text)", fontFamily: "'DM Sans','Helvetica Neue',system-ui,sans-serif", overflowX: "hidden" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&display=swap');
        * { box-sizing: border-box; }
        .kf-nav-link:hover { color: #E8521A !important; }
        .kf-step { transition: transform 0.2s, box-shadow 0.2s; }
        .kf-step:hover { transform: translateY(-3px); box-shadow: 0 8px 32px rgba(0,0,0,0.08); }
        .kf-feature-card { transition: transform 0.2s, box-shadow 0.2s; }
        .kf-feature-card:hover { transform: translateY(-2px); box-shadow: 0 6px 24px rgba(0,0,0,0.07); }
        .kf-cta-btn { transition: opacity 0.15s, transform 0.15s; display: inline-block; }
        .kf-cta-btn:hover { opacity: 0.9; transform: translateY(-1px); }
        @media (max-width: 768px) {
          .kf-hero-grid { grid-template-columns: 1fr !important; }
          .kf-hero-visual { display: none !important; }
          .kf-steps-grid { grid-template-columns: 1fr !important; }
          .kf-features-grid { grid-template-columns: 1fr 1fr !important; gap: 12px !important; }
          .kf-footer-grid { grid-template-columns: 1fr !important; gap: 28px !important; }
          .kf-nav-links { display: none !important; }
          .kf-supplier-cta { flex-direction: column !important; text-align: center !important; }
        }
      `}</style>

      {/* NAVBAR */}
      <nav style={{ position: "sticky", top: 0, zIndex: 50, background: "var(--kf-surface)", borderBottom: "1px solid var(--kf-border)", padding: "0 32px", height: 60, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <a href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
          <div style={{ width: 32, height: 32, background: ORANGE, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Syne',sans-serif", fontWeight: 900, fontSize: 15, color: "#fff" }}>V</div>
          <span style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 16, color: "var(--kf-text)", letterSpacing: "-0.3px" }}>Vendoro</span>
        </a>
        <div className="kf-nav-links" style={{ display: "flex", alignItems: "center", gap: 28 }}>
          <a href="/marketplace" className="kf-nav-link" style={{ fontSize: 14, fontWeight: 500, color: "var(--kf-text2)", textDecoration: "none" }}>Marktplatz</a>
          <a href="/signup/supplier" className="kf-nav-link" style={{ fontSize: 14, fontWeight: 500, color: "var(--kf-text2)", textDecoration: "none" }}>Als Lieferant</a>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <a href="/login" style={{ fontSize: 14, fontWeight: 600, color: "var(--kf-text2)", textDecoration: "none", padding: "7px 14px" }}>Anmelden</a>
          <a href="/signup" className="kf-cta-btn" style={{ background: ORANGE, color: "#fff", fontSize: 14, fontWeight: 700, textDecoration: "none", padding: "8px 18px", borderRadius: 9, boxShadow: "0 2px 8px rgba(232,82,26,0.3)" }}>Kostenlos starten →</a>
        </div>
      </nav>

      {/* HERO */}
      <section style={{ maxWidth: 1200, margin: "0 auto", padding: "80px 32px 64px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 64, alignItems: "center" }} className="kf-hero-grid">
        <div>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "var(--kf-surface)", border: "1px solid var(--kf-border)", borderRadius: 100, padding: "5px 14px", marginBottom: 28 }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#22c55e" }} />
            <span style={{ fontSize: 12, fontWeight: 600, color: "var(--kf-text2)" }}>Frankfurt · B2B Marktplatz</span>
          </div>
          <h1 style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: "clamp(2.4rem,5vw,3.6rem)", lineHeight: 1.05, letterSpacing: "-1.5px", color: "var(--kf-text)", marginBottom: 24 }}>
            Direkt vom<br /><span style={{ color: ORANGE }}>Hersteller</span><br />zu dir.
          </h1>
          <p style={{ fontSize: 17, lineHeight: 1.75, color: "var(--kf-text2)", maxWidth: 440, marginBottom: 36 }}>
            Bestelle Getränke und Snacks direkt von lokalen Marken aus Frankfurt — ohne Mindestmengen, ohne Zwischenhändler.
          </p>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <a href="/signup/buyer" className="kf-cta-btn" style={{ background: ORANGE, color: "#fff", padding: "14px 26px", borderRadius: 12, fontWeight: 700, fontSize: 15, textDecoration: "none", boxShadow: "0 4px 16px rgba(232,82,26,0.3)" }}>Als Kiosk starten →</a>
            <a href="/marketplace" className="kf-cta-btn" style={{ background: "var(--kf-surface)", border: "1.5px solid var(--kf-border)", color: "var(--kf-text)", padding: "14px 26px", borderRadius: 12, fontWeight: 600, fontSize: 15, textDecoration: "none" }}>Marktplatz ansehen</a>
          </div>
          <p style={{ fontSize: 13, color: "var(--kf-text3)", marginTop: 20 }}>Kostenlos registrieren · Keine Mindestbestellmenge</p>
        </div>

        <div className="kf-hero-visual" style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          <div style={{ background: "var(--kf-surface)", border: "1px solid var(--kf-border)", borderRadius: 16, padding: "18px 20px", display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 44, height: 44, background: "#E8521A18", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>🏭</div>
            <div style={{ flex: 1 }}>
              <p style={{ fontWeight: 700, fontSize: 14, color: "var(--kf-text)" }}>Lokaler Hersteller</p>
              <p style={{ fontSize: 12, color: "var(--kf-text3)" }}>Hot Blood GmbH · Frankfurt</p>
            </div>
            <div style={{ background: "#dcfce7", color: "#16a34a", fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 100, flexShrink: 0 }}>✓ Verifiziert</div>
          </div>
          <div style={{ width: 2, height: 20, background: "var(--kf-border)", margin: "0 auto" }} />
          <div style={{ background: ORANGE, borderRadius: 16, padding: "20px", display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 44, height: 44, background: "rgba(255,255,255,0.2)", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Syne',sans-serif", fontWeight: 900, fontSize: 20, color: "#fff", flexShrink: 0 }}>V</div>
            <div style={{ flex: 1 }}>
              <p style={{ fontWeight: 700, fontSize: 14, color: "#fff" }}>Vendoro Marktplatz</p>
              <p style={{ fontSize: 12, color: "rgba(255,255,255,0.7)" }}>Sichere Zahlung · Direktpreise</p>
            </div>
            <div style={{ textAlign: "right", flexShrink: 0 }}>
              <p style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 20, color: "#fff" }}>€47.70</p>
              <p style={{ fontSize: 11, color: "rgba(255,255,255,0.7)" }}>✓ Bezahlt</p>
            </div>
          </div>
          <div style={{ width: 2, height: 20, background: "var(--kf-border)", margin: "0 auto" }} />
          <div style={{ background: "var(--kf-surface)", border: "1px solid var(--kf-border)", borderRadius: 16, padding: "18px 20px", display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 44, height: 44, background: "#E8521A18", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>🏪</div>
            <div style={{ flex: 1 }}>
              <p style={{ fontWeight: 700, fontSize: 14, color: "var(--kf-text)" }}>Dein Späti</p>
              <p style={{ fontSize: 12, color: "var(--kf-text3)" }}>Bestellung #61761F8E</p>
            </div>
            <div style={{ textAlign: "right", flexShrink: 0 }}>
              <p style={{ fontSize: 12, color: "var(--kf-text3)" }}>6 Artikel</p>
              <p style={{ fontSize: 11, color: "#22c55e", fontWeight: 600 }}>● Lieferung heute</p>
            </div>
          </div>
        </div>
      </section>

      {/* TRUST BAND */}
      <div style={{ background: "var(--kf-surface)", borderTop: "1px solid var(--kf-border)", borderBottom: "1px solid var(--kf-border)" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "24px 32px", display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 0 }}>
          {[
            { value: "500+", label: "Kioske registriert" },
            { value: "50+",  label: "Lokale Marken" },
            { value: "24h",  label: "Lieferzeit" },
            { value: "0 €",  label: "Mindestbestellung" },
          ].map(({ value, label }, i) => (
            <div key={label} style={{ textAlign: "center", padding: "12px 16px", borderRight: i < 3 ? "1px solid var(--kf-border)" : "none" }}>
              <p style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 26, color: ORANGE, letterSpacing: "-0.8px", fontVariantNumeric: "tabular-nums" }}>{value}</p>
              <p style={{ fontSize: 12, color: "var(--kf-text3)", marginTop: 3, fontWeight: 500 }}>{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* STEPS */}
      <section style={{ maxWidth: 1200, margin: "0 auto", padding: "80px 32px" }}>
        <div style={{ textAlign: "center", marginBottom: 52 }} className="kf-reveal">
          <p style={{ fontSize: 12, fontWeight: 700, color: ORANGE, letterSpacing: "2.5px", textTransform: "uppercase", marginBottom: 12 }}>So einfach geht&apos;s</p>
          <h2 style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: "clamp(1.8rem,3.5vw,2.6rem)", color: "var(--kf-text)", letterSpacing: "-0.8px" }}>In drei Schritten bestellen</h2>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }} className="kf-steps-grid">
          {([
            { num: "01", title: "Registrieren", desc: "Erstelle ein kostenloses Kiosk-Konto in wenigen Minuten. Keine Verträge, kein Kleingedrucktes.",
              svg: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={ORANGE} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> },
            { num: "02", title: "Produkte wählen", desc: "Browse lokale Marken aus Frankfurt. Filtere nach Kategorie und Preis. Bestelle ab 1 Stück.",
              svg: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={ORANGE} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg> },
            { num: "03", title: "Lieferung erhalten", desc: "Bezahle sicher online. Deine Bestellung kommt direkt vom Hersteller zu dir innerhalb von 24h.",
              svg: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={ORANGE} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg> },
          ] as const).map(({ num, svg, title, desc }, i) => (
            <div key={num} className="kf-step kf-reveal" style={{ background: "var(--kf-surface)", border: "1px solid var(--kf-border)", borderRadius: 18, padding: "28px 24px", animationDelay: `${i * 0.1}s` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
                <span style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 12, color: "var(--kf-text3)", letterSpacing: "1px" }}>{num}</span>
                <div style={{ width: 36, height: 36, background: `${ORANGE}12`, borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center" }}>{svg}</div>
              </div>
              <h3 style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 18, color: "var(--kf-text)", marginBottom: 10 }}>{title}</h3>
              <p style={{ fontSize: 14, color: "var(--kf-text2)", lineHeight: 1.7 }}>{desc}</p>
            </div>
          ))}
        </div>
      </section>

      <div style={{ borderTop: "1px solid var(--kf-border)" }} />

      {/* FEATURES */}
      <section style={{ maxWidth: 1200, margin: "0 auto", padding: "80px 32px" }}>
        <div style={{ textAlign: "center", marginBottom: 52 }} className="kf-reveal">
          <p style={{ fontSize: 12, fontWeight: 700, color: ORANGE, letterSpacing: "2.5px", textTransform: "uppercase", marginBottom: 12 }}>Warum Vendoro</p>
          <h2 style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: "clamp(1.8rem,3.5vw,2.6rem)", color: "var(--kf-text)", letterSpacing: "-0.8px" }}>Gebaut für Späti-Betreiber</h2>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }} className="kf-features-grid">
          {([
            { title: "Keine Mindestmengen", desc: "Bestelle genau so viel wie du brauchst — auch einzelne Flaschen.",
              svg: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={ORANGE} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg> },
            { title: "Direktpreise", desc: "Kein Großhändler dazwischen. Du kaufst zum Herstellerpreis.",
              svg: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={ORANGE} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg> },
            { title: "Lokale Marken", desc: "Frankfurter und deutsche Marken, die du sonst nirgends bekommst.",
              svg: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={ORANGE} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg> },
            { title: "Sichere Zahlung", desc: "Bezahle per Kreditkarte. Geld zurück bei Problemen, garantiert.",
              svg: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={ORANGE} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg> },
          ] as const).map(({ svg, title, desc }, i) => (
            <div key={title} className="kf-feature-card kf-reveal" style={{ background: "var(--kf-surface)", border: "1px solid var(--kf-border)", borderRadius: 18, padding: "28px 24px", animationDelay: `${i * 0.1}s` }}>
              <div style={{ width: 48, height: 48, background: `${ORANGE}12`, borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 18 }}>{svg}</div>
              <h3 style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 15, color: "var(--kf-text)", marginBottom: 8 }}>{title}</h3>
              <p style={{ fontSize: 13, color: "var(--kf-text2)", lineHeight: 1.65 }}>{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* SUPPLIER CTA */}
      <section style={{ padding: "0 32px 80px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", background: ORANGE, borderRadius: 24, padding: "52px 48px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 32, flexWrap: "wrap" }} className="kf-supplier-cta">
          <div>
            <p style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.65)", letterSpacing: "2px", textTransform: "uppercase", marginBottom: 10 }}>Für Hersteller und Marken</p>
            <h2 style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: "clamp(1.6rem,3vw,2.4rem)", color: "#fff", letterSpacing: "-0.8px", marginBottom: 12 }}>Erreiche hunderte<br />Kioske in Deutschland.</h2>
            <p style={{ fontSize: 15, color: "rgba(255,255,255,0.78)", lineHeight: 1.6, maxWidth: 400 }}>Liste deine Produkte kostenlos auf Vendoro und verkaufe direkt an Kiosk-Betreiber.</p>
          </div>
          <a href="/signup/supplier" className="kf-cta-btn" style={{ background: "#fff", color: ORANGE, padding: "16px 32px", borderRadius: 14, fontWeight: 800, fontSize: 16, textDecoration: "none", whiteSpace: "nowrap", boxShadow: "0 4px 20px rgba(0,0,0,0.15)", fontFamily: "'Syne',sans-serif" }}>
            Jetzt kostenlos listen →
          </a>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ borderTop: "1px solid var(--kf-border)", padding: "48px 32px", background: "var(--kf-surface)" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: 48, marginBottom: 36 }} className="kf-footer-grid">
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
              <div style={{ width: 28, height: 28, background: ORANGE, borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Syne',sans-serif", fontWeight: 900, fontSize: 13, color: "#fff" }}>V</div>
              <span style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 14, color: "var(--kf-text)" }}>Vendoro</span>
            </div>
            <p style={{ fontSize: 13, color: "var(--kf-text3)", lineHeight: 1.7, maxWidth: 260 }}>B2B Marktplatz für Kiosk-Betreiber und lokale Marken in Frankfurt, Deutschland.</p>
          </div>
          {[
            { heading: "Plattform", links: [{ label: "Marktplatz", href: "/marketplace" }, { label: "Als Käufer", href: "/signup/buyer" }, { label: "Als Lieferant", href: "/signup/supplier" }] },
            { heading: "Konto", links: [{ label: "Anmelden", href: "/login" }, { label: "Registrieren", href: "/signup" }, { label: "Support", href: "/support" }] },
            { heading: "Rechtliches", links: [{ label: "Impressum", href: "#" }, { label: "Datenschutz", href: "#" }, { label: "AGB", href: "#" }] },
          ].map(({ heading, links }) => (
            <div key={heading}>
              <p style={{ fontSize: 12, fontWeight: 700, color: "var(--kf-text)", letterSpacing: "1px", textTransform: "uppercase", marginBottom: 16 }}>{heading}</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {links.map(({ label, href }) => (
                  <a key={label} href={href} className="kf-footer-link" style={{ fontSize: 13, color: "var(--kf-text2)", textDecoration: "none" }}>{label}</a>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div style={{ borderTop: "1px solid var(--kf-border)", paddingTop: 24, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <p style={{ fontSize: 12, color: "var(--kf-text3)" }}>© 2026 Vendoro. Alle Rechte vorbehalten.</p>
          <p style={{ fontSize: 12, color: "var(--kf-text3)" }}>Made in Frankfurt 🇩🇪</p>
        </div>
      </footer>
    </main>
  );
}
