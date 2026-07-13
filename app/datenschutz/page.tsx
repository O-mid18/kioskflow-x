"use client";

const BG      = "var(--kf-bg)";
const SURFACE = "var(--kf-surface)";
const BORDER  = "var(--kf-border)";
const TEXT    = "var(--kf-text)";
const TEXT2   = "var(--kf-text2)";
const TEXT3   = "var(--kf-text3)";
const ORANGE  = "#2563EB";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 32 }}>
      <h2 style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 18, color: TEXT, marginBottom: 10 }}>{title}</h2>
      <div style={{ fontSize: 14, color: TEXT2, lineHeight: 1.8 }}>{children}</div>
    </section>
  );
}

const Placeholder = ({ children }: { children: React.ReactNode }) => (
  <span style={{ background: "#fef3c7", color: "#92400e", padding: "1px 6px", borderRadius: 4, fontWeight: 600 }}>{children}</span>
);

export default function DatenschutzPage() {
  return (
    <main style={{ minHeight: "100vh", background: BG, fontFamily: "'DM Sans','Helvetica Neue',system-ui,sans-serif", color: TEXT }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500;600;700&display=swap'); *{box-sizing:border-box}`}</style>

      <nav style={{ background: SURFACE, borderBottom: `1px solid ${BORDER}`, padding: "0 24px", height: 58, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <a href="/" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none" }}>
          <img src="/flowio-icon.png" alt="Flowio" style={{ width: 30, height: 30, borderRadius: 7, objectFit: "cover" }} />
          <span style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 14, color: TEXT }}>Flowio</span>
        </a>
        <a href="/" style={{ fontSize: 13, color: TEXT2, textDecoration: "none", fontWeight: 500 }}>← Zurück</a>
      </nav>

      <div style={{ maxWidth: 720, margin: "0 auto", padding: "56px 24px" }}>
        <h1 style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 32, marginBottom: 8 }}>Datenschutzerklärung</h1>
        <p style={{ fontSize: 13, color: TEXT3, marginBottom: 40 }}>Stand: Juli 2026</p>

        <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 12, padding: "16px 20px", marginBottom: 40, fontSize: 13, color: "#92400e", lineHeight: 1.7 }}>
          ⚠️ Der technische Teil (welche Daten die Plattform tatsächlich verarbeitet) ist auf Basis des echten Codes erstellt. Die Kontaktangaben des Verantwortlichen sind Platzhalter und müssen vor Livegang ergänzt werden. Diese Vorlage ersetzt keine juristische Prüfung.
        </div>

        <Section title="1. Verantwortlicher">
          <p><Placeholder>[Name und Anschrift des Betreibers, wie im Impressum]</Placeholder><br/>
          E-Mail: <Placeholder>[Kontakt-E-Mail]</Placeholder></p>
        </Section>

        <Section title="2. Welche Daten wir verarbeiten">
          <p><strong>Konto &amp; Registrierung:</strong> E-Mail-Adresse, Passwort (verschlüsselt gespeichert), Rolle (Käufer/Lieferant), bei Lieferanten zusätzlich Firmenname und Verifizierungsstatus.</p>
          <p><strong>Bestellungen:</strong> Bestellte Produkte, Menge, Preis, Lieferadresse, Bestellstatus.</p>
          <p><strong>Zahlungsdaten:</strong> Zahlungen werden über Stripe abgewickelt. Kartendaten laufen ausschließlich über Stripe und werden von uns nicht gespeichert oder verarbeitet.</p>
          <p><strong>Kommunikation:</strong> Nachrichten zwischen Käufern und Lieferanten sowie Support-Anfragen werden gespeichert, um den Chatverlauf bereitzustellen.</p>
          <p><strong>Nutzungsdaten:</strong> Warenkorb- und Merkzettel-Inhalte, Produktbewertungen.</p>
        </Section>

        <Section title="3. Hosting und technische Dienstleister">
          <p><strong>Vercel</strong> (Hosting der Website) — Vercel Inc., USA. Serverstandort/CDN kann außerhalb der EU liegen.</p>
          <p><strong>Supabase</strong> (Datenbank, Authentifizierung, Datei-Speicherung) — Datenbank-Region: EU (Frankfurt).</p>
          <p><strong>Stripe</strong> (Zahlungsabwicklung) — Stripe Payments Europe, Ltd.</p>
          <p>Mit allen Auftragsverarbeitern bestehen bzw. sollten Auftragsverarbeitungsverträge (AVV) gemäß Art. 28 DSGVO bestehen.</p>
        </Section>

        <Section title="4. Rechtsgrundlage der Verarbeitung">
          <p>Die Verarbeitung erfolgt zur Erfüllung des Nutzungsvertrags (Art. 6 Abs. 1 lit. b DSGVO) sowie, soweit erforderlich, zur Wahrung berechtigter Interessen an einem sicheren und funktionsfähigen Betrieb der Plattform (Art. 6 Abs. 1 lit. f DSGVO).</p>
        </Section>

        <Section title="5. Cookies">
          <p>Wir verwenden technisch notwendige Cookies bzw. lokale Speicherung (z. B. für den Login-Status). Diese sind für den Betrieb der Plattform erforderlich und erfordern keine gesonderte Einwilligung nach § 25 Abs. 2 TTDSG.</p>
        </Section>

        <Section title="6. Speicherdauer">
          <p>Konto- und Bestelldaten werden gespeichert, solange das Konto besteht bzw. solange gesetzliche Aufbewahrungspflichten (z. B. handels- und steuerrechtlich) dies erfordern.</p>
        </Section>

        <Section title="7. Deine Rechte">
          <p>Du hast das Recht auf Auskunft (Art. 15 DSGVO), Berichtigung (Art. 16), Löschung (Art. 17), Einschränkung der Verarbeitung (Art. 18), Datenübertragbarkeit (Art. 20) sowie Widerspruch (Art. 21). Du kannst dein Konto und die zugehörigen Daten jederzeit über die Kontoeinstellungen löschen lassen.</p>
          <p>Zudem besteht ein Beschwerderecht bei einer Datenschutzaufsichtsbehörde, z. B. dem Hessischen Beauftragten für Datenschutz und Informationsfreiheit.</p>
        </Section>

        <Section title="8. Kontakt für Datenschutzanfragen">
          <p>Bei Fragen zur Verarbeitung deiner Daten wende dich an: <Placeholder>[Kontakt-E-Mail]</Placeholder></p>
        </Section>
      </div>
    </main>
  );
}
