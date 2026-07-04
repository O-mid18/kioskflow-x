"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

const BG      = "var(--kf-bg)";
const SURFACE = "var(--kf-surface)";
const BORDER  = "var(--kf-border)";
const TEXT    = "var(--kf-text)";
const TEXT2   = "var(--kf-text2)";
const TEXT3   = "var(--kf-text3)";
const ORANGE  = "#E8521A";

function Field({ label, required, hint, children }: { label: string; required?: boolean; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: TEXT2, marginBottom: 6 }}>
        {label}{required && <span style={{ color: ORANGE, marginLeft: 3 }}>*</span>}
      </label>
      {children}
      {hint && <p style={{ fontSize: 11, color: TEXT3, marginTop: 5 }}>{hint}</p>}
    </div>
  );
}

const iStyle: React.CSSProperties = {
  width: "100%", background: SURFACE, border: `1.5px solid ${BORDER}`,
  borderRadius: 10, padding: "11px 14px", color: TEXT, fontSize: 14,
  boxSizing: "border-box", fontFamily: "inherit", outline: "none", transition: "border-color 0.2s",
};

export default function VerificationPage() {
  const [supplierId, setSupplierId] = useState<string | null>(null);
  const [loading, setLoading]       = useState(true);
  const [saving, setSaving]         = useState(false);
  const [verified, setVerified]     = useState(false);
  const [msg, setMsg]               = useState<{ text: string; ok: boolean } | null>(null);

  const [legalName,       setLegalName]       = useState("");
  const [street,          setStreet]          = useState("");
  const [city,            setCity]            = useState("");
  const [postalCode,      setPostalCode]      = useState("");
  const [country,         setCountry]         = useState("Deutschland");
  const [registrationNr,  setRegistrationNr]  = useState("");
  const [taxId,           setTaxId]           = useState("");
  const [phone,           setPhone]           = useState("");
  const [website,         setWebsite]         = useState("");

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { window.location.href = "/login"; return; }
      const { data } = await supabase.from("suppliers").select("*").eq("user_id", user.id).single();
      if (!data) { window.location.href = "/marketplace"; return; }
      setSupplierId(data.id);
      setVerified(!!data.verified);
      setLegalName(data.legal_name ?? "");
      setStreet(data.street ?? "");
      setCity(data.city ?? "");
      setPostalCode(data.postal_code ?? "");
      setCountry(data.country ?? "Deutschland");
      setRegistrationNr(data.registration_nr ?? "");
      setTaxId(data.tax_id ?? "");
      setPhone(data.phone ?? "");
      setWebsite(data.website ?? "");
      setLoading(false);
    })();
  }, []);

  const save = async () => {
    if (!legalName || !street || !city || !postalCode) {
      setMsg({ text: "Bitte alle Pflichtfelder ausfüllen.", ok: false });
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("suppliers").update({
      legal_name: legalName, street, city, postal_code: postalCode,
      country, registration_nr: registrationNr, tax_id: taxId,
      phone, website,
    }).eq("id", supplierId!);
    setSaving(false);
    if (error) setMsg({ text: error.message, ok: false });
    else setMsg({ text: "Daten gespeichert. Der Admin wird Ihre Angaben prüfen.", ok: true });
    setTimeout(() => setMsg(null), 4000);
  };

  const fo = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => e.currentTarget.style.borderColor = ORANGE;
  const bl = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => e.currentTarget.style.borderColor = BORDER;

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh" }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{ width: 34, height: 34, border: `3px solid ${BORDER}`, borderTopColor: ORANGE, borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
    </div>
  );

  return (
    <div style={{ padding: "32px 32px 60px", fontFamily: "'DM Sans','Helvetica Neue',system-ui,sans-serif", color: TEXT }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500;600;700&display=swap'); @keyframes spin{to{transform:rotate(360deg)}} *{box-sizing:border-box}`}</style>

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: TEXT3, letterSpacing: "2.5px", textTransform: "uppercase", marginBottom: 8 }}>Lieferant-Dashboard</p>
        <h1 style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 26, color: TEXT, letterSpacing: "-0.8px" }}>Unternehmensverifizierung</h1>
        <p style={{ fontSize: 13, color: TEXT2, marginTop: 6 }}>Diese Daten sind nur für den Admin sichtbar — nicht für Käufer.</p>
      </div>

      {/* Unternehmens-ID */}
      {supplierId && (
        <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 12, padding: "14px 18px", marginBottom: 16, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <p style={{ fontSize: 10, fontWeight: 700, color: TEXT3, textTransform: "uppercase", letterSpacing: "1.5px", marginBottom: 4 }}>Ihre Unternehmens-ID</p>
            <p style={{ fontFamily: "monospace", fontSize: 15, fontWeight: 700, color: TEXT, letterSpacing: "1px" }}>{supplierId}</p>
            <p style={{ fontSize: 11, color: TEXT3, marginTop: 3 }}>Diese ID an den Admin weitergeben, damit er Ihr Unternehmen finden kann.</p>
          </div>
          <button onClick={() => { navigator.clipboard.writeText(supplierId); }}
            style={{ background: `${ORANGE}15`, border: `1px solid ${ORANGE}30`, color: ORANGE, borderRadius: 8, padding: "8px 16px", fontSize: 12, fontWeight: 700, cursor: "pointer", flexShrink: 0 }}>
            Kopieren 📋
          </button>
        </div>
      )}

      {/* Status banner */}
      <div style={{ background: verified ? "#f0fdf4" : `${ORANGE}10`, border: `1.5px solid ${verified ? "#bbf7d0" : `${ORANGE}40`}`, borderRadius: 12, padding: "14px 18px", marginBottom: 24, display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{ fontSize: 22 }}>{verified ? "✅" : "⏳"}</span>
        <div>
          <p style={{ fontSize: 13, fontWeight: 700, color: verified ? "#16a34a" : ORANGE }}>
            {verified ? "Verifiziert" : "Verifizierung ausstehend"}
          </p>
          <p style={{ fontSize: 12, color: TEXT3, marginTop: 2 }}>
            {verified
              ? "Ihr Unternehmen wurde vom Admin bestätigt."
              : "Füllen Sie das Formular aus. Der Admin prüft Ihre Angaben."}
          </p>
        </div>
      </div>

      {msg && (
        <div style={{ background: msg.ok ? "#f0fdf4" : "#fef2f2", border: `1.5px solid ${msg.ok ? "#bbf7d0" : "#fca5a5"}`, borderRadius: 10, padding: "12px 16px", marginBottom: 20 }}>
          <p style={{ color: msg.ok ? "#16a34a" : "#dc2626", fontSize: 13, fontWeight: 600 }}>{msg.text}</p>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 680 }}>

        {/* Rechtliche Angaben */}
        <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 16, padding: "24px" }}>
          <h2 style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 14, color: TEXT, marginBottom: 20 }}>Rechtliche Angaben</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <Field label="Offizieller Firmenname" required hint="Wie im Handelsregister eingetragen">
              <input value={legalName} onChange={e => setLegalName(e.target.value)} placeholder="z.B. Mustermann GmbH" style={iStyle} onFocus={fo} onBlur={bl} />
            </Field>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <Field label="Handelsregisternummer" hint="z.B. HRB 12345">
                <input value={registrationNr} onChange={e => setRegistrationNr(e.target.value)} placeholder="HRB 12345" style={iStyle} onFocus={fo} onBlur={bl} />
              </Field>
              <Field label="USt-IdNr. / Steuernummer" hint="z.B. DE123456789">
                <input value={taxId} onChange={e => setTaxId(e.target.value)} placeholder="DE123456789" style={iStyle} onFocus={fo} onBlur={bl} />
              </Field>
            </div>
          </div>
        </div>

        {/* Adresse */}
        <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 16, padding: "24px" }}>
          <h2 style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 14, color: TEXT, marginBottom: 20 }}>Unternehmensadresse</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <Field label="Straße & Hausnummer" required>
              <input value={street} onChange={e => setStreet(e.target.value)} placeholder="Musterstraße 42" style={iStyle} onFocus={fo} onBlur={bl} />
            </Field>
            <div style={{ display: "grid", gridTemplateColumns: "120px 1fr", gap: 14 }}>
              <Field label="PLZ" required>
                <input value={postalCode} onChange={e => setPostalCode(e.target.value)} placeholder="60311" style={iStyle} onFocus={fo} onBlur={bl} />
              </Field>
              <Field label="Stadt" required>
                <input value={city} onChange={e => setCity(e.target.value)} placeholder="Frankfurt am Main" style={iStyle} onFocus={fo} onBlur={bl} />
              </Field>
            </div>
            <Field label="Land">
              <select value={country} onChange={e => setCountry(e.target.value)} style={{ ...iStyle, cursor: "pointer" }} onFocus={fo} onBlur={bl}>
                {["Deutschland","Österreich","Schweiz","Andere"].map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>
          </div>
        </div>

        {/* Kontakt */}
        <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 16, padding: "24px" }}>
          <h2 style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 14, color: TEXT, marginBottom: 20 }}>Kontaktdaten</h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <Field label="Telefon">
              <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+49 69 123456" style={iStyle} onFocus={fo} onBlur={bl} />
            </Field>
            <Field label="Website">
              <input value={website} onChange={e => setWebsite(e.target.value)} placeholder="https://mustermann.de" style={iStyle} onFocus={fo} onBlur={bl} />
            </Field>
          </div>
        </div>

        {/* Save */}
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button onClick={save} disabled={saving}
            style={{ background: saving ? "rgba(232,82,26,0.55)" : ORANGE, color: "#fff", border: "none", borderRadius: 10, padding: "12px 28px", fontSize: 14, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 8 }}>
            {saving && <div style={{ width: 14, height: 14, border: "2px solid rgba(255,255,255,0.4)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />}
            {saving ? "Wird gespeichert..." : "Daten einreichen →"}
          </button>
        </div>

        {/* Stripe Connect */}
        <StripeConnectCard supabase={supabase} />
      </div>
    </div>
  );
}

function StripeConnectCard({ supabase }: { supabase: any }) {
  const [status, setStatus] = useState<"loading" | "connected" | "not_connected">("loading");
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) { setStatus("not_connected"); return; }
        const res = await fetch("/api/connect", { headers: { Authorization: `Bearer ${session.access_token}` } });
        const json = await res.json();
        setStatus(json.onboarded ? "connected" : "not_connected");
      } catch { setStatus("not_connected"); }
    })();
  }, []);

  const handleConnect = async () => {
    setConnecting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const res = await fetch("/api/connect", { method: "POST", headers: { Authorization: `Bearer ${session.access_token}` } });
      const json = await res.json();
      if (json.url) window.location.href = json.url;
      else setConnecting(false);
    } catch { setConnecting(false); }
  };

  return (
    <div style={{ background: "var(--kf-surface)", border: "1px solid var(--kf-border)", borderRadius: 16, padding: "24px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
        <div style={{ width: 36, height: 36, background: "#635BFF15", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>💳</div>
        <div style={{ flex: 1 }}>
          <h2 style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 14, color: "var(--kf-text)" }}>Auszahlungen einrichten</h2>
          <p style={{ fontSize: 12, color: "var(--kf-text3)" }}>Verbinde dein Bankkonto um Zahlungen zu empfangen</p>
        </div>
        {status === "connected" && (
          <div style={{ background: "#dcfce7", color: "#16a34a", fontSize: 11, fontWeight: 700, padding: "4px 12px", borderRadius: 100 }}>✓ Verbunden</div>
        )}
      </div>
      {status === "loading" && <p style={{ fontSize: 13, color: "var(--kf-text3)" }}>Status wird geladen...</p>}
      {status === "connected" && (
        <p style={{ fontSize: 13, color: "var(--kf-text2)", lineHeight: 1.6 }}>
          Dein Stripe-Konto ist verbunden. Nach einem Verkauf erhältst du <strong>95%</strong> automatisch — KioskFlow behält 5%.
        </p>
      )}
      {status === "not_connected" && (
        <div>
          <p style={{ fontSize: 13, color: "var(--kf-text2)", lineHeight: 1.6, marginBottom: 16 }}>
            Verbinde dein Bankkonto über Stripe. Du erhältst <strong>95%</strong> jedes Verkaufs direkt auf dein Konto — KioskFlow behält 5% als Plattformgebühr.
          </p>
          <button
            onClick={handleConnect}
            disabled={connecting}
            style={{ background: connecting ? "#8B85FF" : "#635BFF", color: "#fff", border: "none", borderRadius: 10, padding: "12px 24px", fontSize: 14, fontWeight: 700, cursor: connecting ? "not-allowed" : "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 8 }}
          >
            {connecting && <div style={{ width: 14, height: 14, border: "2px solid rgba(255,255,255,0.4)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />}
            {connecting ? "Wird verbunden..." : "Mit Stripe verbinden →"}
          </button>
        </div>
      )}
    </div>
  );
}
