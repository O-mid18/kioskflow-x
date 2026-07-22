"use client";

const BG      = "var(--kf-bg)";
const SURFACE = "var(--kf-surface)";
const BORDER  = "var(--kf-border)";
const TEXT    = "var(--kf-text)";
const TEXT2   = "var(--kf-text2)";
const TEXT3   = "var(--kf-text3)";
const ORANGE  = "#003ec7";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 32 }}>
      <h2 style={{ fontFamily: "'Manrope',sans-serif", fontWeight: 800, fontSize: 18, color: TEXT, marginBottom: 10 }}>{title}</h2>
      <div style={{ fontSize: 14, color: TEXT2, lineHeight: 1.8 }}>{children}</div>
    </section>
  );
}

const Placeholder = ({ children }: { children: React.ReactNode }) => (
  <span style={{ background: "#fef3c7", color: "#92400e", padding: "1px 6px", borderRadius: 4, fontWeight: 600 }}>{children}</span>
);

export default function ImpressumPage() {
  return (
    <main style={{ minHeight: "100vh", background: BG, fontFamily: "'Inter','Helvetica Neue',system-ui,sans-serif", color: TEXT }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Manrope:wght@600;700;800&family=Inter:wght@400;500;600;700&display=swap'); *{box-sizing:border-box}`}</style>

      <nav style={{ background: SURFACE, borderBottom: `1px solid ${BORDER}`, padding: "0 24px", height: 58, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <a href="/" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none" }}>
          <img src="/flowio-icon.png" alt="Flowio" style={{ width: 30, height: 30, borderRadius: 7, objectFit: "cover" }} />
          <span style={{ fontFamily: "'Manrope',sans-serif", fontWeight: 800, fontSize: 14, color: TEXT }}>Flowio</span>
        </a>
        <a href="/" style={{ fontSize: 13, color: TEXT2, textDecoration: "none", fontWeight: 500 }}>← Zurück</a>
      </nav>

      <div style={{ maxWidth: 720, margin: "0 auto", padding: "56px 24px" }}>
        <h1 style={{ fontFamily: "'Manrope',sans-serif", fontWeight: 800, fontSize: 32, marginBottom: 8 }}>Impressum</h1>
        <p style={{ fontSize: 13, color: TEXT3, marginBottom: 40 }}>Angaben gemäß § 5 Digitale-Dienste-Gesetz (DDG)</p>

        <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 12, padding: "16px 20px", marginBottom: 40, fontSize: 13, color: "#92400e", lineHeight: 1.7 }}>
          ⚠️ Diese Seite enthält Platzhalter für Angaben, die nur der Betreiber selbst ausfüllen kann (echter Name, Anschrift, Registerdaten). Ein Impressum mit falschen oder unvollständigen Angaben ist rechtlich unwirksam bzw. abmahnfähig — bitte vor Livegang durch die Betreiberperson vervollständigen und im Zweifel juristisch prüfen lassen.
        </div>

        <Section title="Angaben gemäß § 5 DDG">
          <p><Placeholder>[Vor- und Nachname bzw. Firmenname]</Placeholder><br/>
          <Placeholder>[Straße und Hausnummer]</Placeholder><br/>
          <Placeholder>[Postleitzahl und Ort]</Placeholder><br/>
          Deutschland</p>
        </Section>

        <Section title="Kontakt">
          <p>Telefon: <Placeholder>[Telefonnummer]</Placeholder><br/>
          E-Mail: <Placeholder>[E-Mail-Adresse]</Placeholder></p>
        </Section>

        <Section title="Registereintrag">
          <p>Falls im Handelsregister, Vereinsregister, Partnerschaftsregister oder Genossenschaftsregister eingetragen:<br/>
          Registergericht: <Placeholder>[falls zutreffend]</Placeholder><br/>
          Registernummer: <Placeholder>[falls zutreffend]</Placeholder></p>
          <p>Bei Einzelunternehmen/Kleingewerbe ohne Registereintrag kann dieser Abschnitt entfallen.</p>
        </Section>

        <Section title="Umsatzsteuer-ID">
          <p>Umsatzsteuer-Identifikationsnummer gemäß §27a Umsatzsteuergesetz: <Placeholder>[USt-IdNr. falls vorhanden, sonst Hinweis auf Kleinunternehmerregelung §19 UStG]</Placeholder></p>
        </Section>

        <Section title="Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV">
          <p><Placeholder>[Name der verantwortlichen Person]</Placeholder><br/>
          <Placeholder>[Anschrift wie oben]</Placeholder></p>
        </Section>

        <Section title="Streitschlichtung">
          <p>Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit: <a href="https://ec.europa.eu/consumers/odr/" style={{ color: ORANGE }}>https://ec.europa.eu/consumers/odr/</a></p>
          <p>Wir sind nicht verpflichtet und nicht bereit, an einem Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.</p>
        </Section>

        <Section title="Haftung für Inhalte">
          <p>Als Diensteanbieter sind wir gemäß § 7 Abs.1 DDG für eigene Inhalte auf diesen Seiten nach den allgemeinen Gesetzen verantwortlich. Nach §§ 8 bis 10 DDG sind wir als Diensteanbieter jedoch nicht verpflichtet, übermittelte oder gespeicherte fremde Informationen zu überwachen.</p>
        </Section>
      </div>
    </main>
  );
}
