"use client";

const BG      = "var(--kf-bg)";
const SURFACE = "var(--kf-surface)";
const BORDER  = "var(--kf-border)";
const TEXT    = "var(--kf-text)";
const TEXT2   = "var(--kf-text2)";
const TEXT3   = "var(--kf-text3)";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 32 }}>
      <h2 style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontWeight: 800, fontSize: 18, color: TEXT, marginBottom: 10 }}>{title}</h2>
      <div style={{ fontSize: 14, color: TEXT2, lineHeight: 1.8 }}>{children}</div>
    </section>
  );
}

const Placeholder = ({ children }: { children: React.ReactNode }) => (
  <span style={{ background: "#fef3c7", color: "#92400e", padding: "1px 6px", borderRadius: 4, fontWeight: 600 }}>{children}</span>
);

export default function AGBPage() {
  return (
    <main style={{ minHeight: "100vh", background: BG, fontFamily: "'Inter','Helvetica Neue',system-ui,sans-serif", color: TEXT }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@600;700;800&family=Inter:wght@400;500;600;700&display=swap'); *{box-sizing:border-box}`}</style>

      <nav style={{ background: SURFACE, borderBottom: `1px solid ${BORDER}`, padding: "0 24px", height: 58, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <a href="/" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none" }}>
          <img src="/flowio-icon.png" alt="Flowio" style={{ width: 30, height: 30, borderRadius: 7, objectFit: "cover" }} />
          <span style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontWeight: 800, fontSize: 14, color: TEXT }}>Flowio</span>
        </a>
        <a href="/" style={{ fontSize: 13, color: TEXT2, textDecoration: "none", fontWeight: 500 }}>← Zurück</a>
      </nav>

      <div style={{ maxWidth: 720, margin: "0 auto", padding: "56px 24px" }}>
        <h1 style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontWeight: 800, fontSize: 32, marginBottom: 8 }}>Allgemeine Geschäftsbedingungen</h1>
        <p style={{ fontSize: 13, color: TEXT3, marginBottom: 40 }}>Stand: Juli 2026</p>

        <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 12, padding: "16px 20px", marginBottom: 40, fontSize: 13, color: "#92400e", lineHeight: 1.7 }}>
          ⚠️ Diese AGB sind ein technischer Entwurf auf Basis der tatsächlichen Plattformfunktionen, keine rechtsverbindliche Vorlage. Vor Livegang sollte ein Anwalt für IT-/Vertriebsrecht sie prüfen — besonders Haftungs- und Zahlungsklauseln.
        </div>

        <Section title="§ 1 Geltungsbereich">
          <p>Diese AGB gelten für die Nutzung der Plattform Flowio, betrieben von <Placeholder>[Firmenname/Betreiber]</Placeholder> („Flowio", „wir"), durch Kiosk- und Späti-Betreiber („Käufer") und Hersteller/Marken („Lieferanten").</p>
        </Section>

        <Section title="§ 2 Leistungsbeschreibung">
          <p>Flowio stellt eine B2B-Vermittlungsplattform bereit, über die Käufer Produkte direkt von Lieferanten bestellen können. Flowio selbst verkauft keine Produkte, sondern vermittelt den Vertragsschluss zwischen Käufer und Lieferant und wickelt die Zahlung über Stripe ab.</p>
        </Section>

        <Section title="§ 3 Registrierung">
          <p>Die Nutzung setzt ein kostenloses Konto voraus. Lieferanten durchlaufen eine Verifizierung, bevor Produkte gelistet werden können. Falschangaben bei der Registrierung berechtigen zur Kontosperrung.</p>
        </Section>

        <Section title="§ 4 Vertragsschluss">
          <p>Der Kaufvertrag über bestellte Produkte kommt direkt zwischen Käufer und Lieferant zustande, sobald die Bestellung über die Plattform bestätigt und bezahlt wurde.</p>
        </Section>

        <Section title="§ 5 Preise und Zahlung">
          <p>Alle Preise sind Endpreise in Euro. Die Zahlung erfolgt per Kreditkarte über den Zahlungsdienstleister Stripe zum Zeitpunkt der Bestellung. Flowio erhebt <Placeholder>[Provisionsmodell einfügen, z. B. 5% Plattformgebühr vom Lieferanten]</Placeholder>.</p>
        </Section>

        <Section title="§ 6 Lieferung">
          <p>Die Lieferung erfolgt durch den jeweiligen Lieferanten direkt an die vom Käufer angegebene Adresse. Liefertermine sind, soweit nicht anders angegeben, unverbindliche Richtwerte.</p>
        </Section>

        <Section title="§ 7 Widerruf und Reklamation">
          <p>Bei nicht gelieferten oder mangelhaften Produkten kann sich der Käufer über den Support an Flowio wenden. Erstattungen erfolgen über Stripe auf das ursprüngliche Zahlungsmittel.</p>
        </Section>

        <Section title="§ 8 Haftung">
          <p>Flowio haftet nicht für die Qualität, Beschaffenheit oder rechtzeitige Lieferung der von Lieferanten angebotenen Produkte. Für Vorsatz und grobe Fahrlässigkeit sowie für Schäden aus der Verletzung des Lebens, des Körpers oder der Gesundheit haftet Flowio unbeschränkt.</p>
        </Section>

        <Section title="§ 9 Kündigung">
          <p>Beide Seiten können ihr Konto jederzeit ohne Angabe von Gründen über die Kontoeinstellungen löschen bzw. die Nutzung beenden.</p>
        </Section>

        <Section title="§ 10 Schlussbestimmungen">
          <p>Es gilt deutsches Recht. Sollte eine Bestimmung dieser AGB unwirksam sein, bleibt die Wirksamkeit der übrigen Bestimmungen unberührt.</p>
        </Section>
      </div>
    </main>
  );
}
