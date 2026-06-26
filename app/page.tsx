export default function HomePage() {
  return (
    <main style={{ minHeight: "100vh", background: "var(--kf-bg)", color: "var(--kf-text)", fontFamily: "'DM Sans','Helvetica Neue',system-ui,sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500;600;700&display=swap');`}</style>

      <section style={{ padding: "96px 24px", textAlign: "center" }}>
        <h1 style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: "clamp(2.2rem,6vw,4rem)", maxWidth: 800, margin: "0 auto 24px", letterSpacing: "-1.5px", lineHeight: 1.1, color: "var(--kf-text)" }}>
          Großhandel für Kioske und Späti-Läden
        </h1>

        <p style={{ marginTop: 24, color: "var(--kf-text2)", fontSize: 18, maxWidth: 560, margin: "0 auto 40px", lineHeight: 1.7 }}>
          Verbinde dich mit Lieferanten, bestelle Produkte in großen Mengen und verwalte Lieferungen auf einer modernen B2B-Plattform.
        </p>

        <div style={{ display: "flex", justifyContent: "center", gap: 16, flexWrap: "wrap" }}>
          <a
            href="/signup"
            style={{ background: "#E8521A", color: "#fff", padding: "14px 28px", borderRadius: 14, fontWeight: 700, fontSize: 15, textDecoration: "none", boxShadow: "0 4px 16px rgba(232,82,26,0.25)" }}
          >
            Jetzt starten →
          </a>

          <a
            href="/marketplace"
            style={{ border: "1.5px solid var(--kf-border)", color: "var(--kf-text)", padding: "14px 28px", borderRadius: 14, fontWeight: 600, fontSize: 15, textDecoration: "none", background: "var(--kf-surface)" }}
          >
            Zum Marktplatz
          </a>
        </div>
      </section>
    </main>
  );
}
