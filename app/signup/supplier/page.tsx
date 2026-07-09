"use client";

import { useState, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

const BG = "var(--kf-bg)";
const SURFACE = "var(--kf-surface)";
const BORDER = "var(--kf-border)";
const TEXT = "var(--kf-text)";
const TEXT2 = "var(--kf-text2)";
const TEXT3 = "var(--kf-text3)";
const ORANGE = "#E8521A";

function inputStyle(extra?: object) {
  return { width: "100%", background: SURFACE, border: `1.5px solid ${BORDER}`, borderRadius: 10, padding: "12px 15px", color: TEXT, fontSize: 14, boxSizing: "border-box" as const, fontFamily: "inherit", ...extra };
}

export default function SupplierSignupPage() {
  const router = useRouter();
  const [fields, setFields] = useState({ companyName: "", contactPerson: "", warehouseAddress: "", city: "", phone: "", productCategory: "", email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [otpStep, setOtpStep] = useState(false);
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setFields(f => ({ ...f, [key]: e.target.value }));

  const focus = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => { e.currentTarget.style.borderColor = ORANGE; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(232,82,26,0.1)"; };
  const blur  = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => { e.currentTarget.style.borderColor = BORDER; e.currentTarget.style.boxShadow = "none"; };

  const handleSignup = async () => {
    if (!fields.email || !fields.password || !fields.companyName) { setMsg({ text: "Firmenname, E-Mail und Passwort sind Pflichtfelder.", ok: false }); return; }
    setLoading(true);
    setMsg(null);
    const { data, error } = await supabase.auth.signUp({ email: fields.email, password: fields.password });
    setLoading(false);
    if (error || !data.user) { setMsg({ text: error?.message || "Registrierung fehlgeschlagen.", ok: false }); return; }

    if (!data.session) {
      localStorage.setItem("kf_pending_signup", JSON.stringify({ type: "supplier", ...fields }));
      setOtpStep(true);
      setMsg({ text: `Code gesendet an ${fields.email}`, ok: true });
      return;
    }

    // Email confirmation disabled — apply profile immediately
    await supabase.from("profiles").upsert({ id: data.user.id, role: "supplier", status: "pending", company_name: fields.companyName, full_name: fields.contactPerson, address: fields.warehouseAddress, city: fields.city, phone: fields.phone, product_category: fields.productCategory });
    await supabase.from("suppliers").insert({ user_id: data.user.id, name: fields.companyName, phone: fields.phone, city: fields.city });
    setMsg({ text: "Anfrage gesendet! Wir prüfen deinen Antrag in Kürze.", ok: true });
    setTimeout(() => router.push("/login"), 2000);
  };

  const handleOtpChange = (i: number, val: string) => {
    const digit = val.replace(/\D/g, "").slice(-1);
    const next = [...otp];
    next[i] = digit;
    setOtp(next);
    if (digit && i < 5) otpRefs.current[i + 1]?.focus();
  };

  const handleOtpKey = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otp[i] && i > 0) otpRefs.current[i - 1]?.focus();
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    const text = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (text.length === 6) {
      setOtp(text.split(""));
      otpRefs.current[5]?.focus();
    }
  };

  const handleVerify = async () => {
    const code = otp.join("");
    if (code.length < 6) { setMsg({ text: "Bitte alle 6 Ziffern eingeben.", ok: false }); return; }
    setLoading(true);
    setMsg(null);
    const { data, error } = await supabase.auth.verifyOtp({ email: fields.email, token: code, type: "signup" });
    if (error || !data.user) { setMsg({ text: error?.message || "Ungültiger Code.", ok: false }); setLoading(false); return; }

    const pending = (() => { try { return JSON.parse(localStorage.getItem("kf_pending_signup") ?? "{}"); } catch { return {}; } })();
    const uid = data.user.id;
    await supabase.from("profiles").upsert({ id: uid, role: "supplier", status: "pending", company_name: pending.companyName ?? fields.companyName, full_name: pending.contactPerson, address: pending.warehouseAddress, city: pending.city, phone: pending.phone, product_category: pending.productCategory });
    await supabase.from("suppliers").insert({ user_id: uid, name: pending.companyName ?? fields.companyName, phone: pending.phone, city: pending.city });
    localStorage.removeItem("kf_pending_signup");
    setLoading(false);
    setMsg({ text: "E-Mail bestätigt! Dein Antrag wird geprüft. Weiterleitung...", ok: true });
    setTimeout(() => router.push("/login"), 2000);
  };

  const handleResend = async () => {
    setLoading(true);
    await supabase.auth.resend({ type: "signup", email: fields.email });
    setLoading(false);
    setMsg({ text: "Neuer Code gesendet.", ok: true });
  };

  if (otpStep) {
    return (
      <main style={{ minHeight: "100vh", background: BG, fontFamily: "'DM Sans','Helvetica Neue',system-ui,sans-serif", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500;600;700&display=swap');`}</style>
        <div style={{ maxWidth: 420, width: "100%" }}>
          <div style={{ textAlign: "center", marginBottom: 32 }}>
            <div style={{ width: 56, height: 56, background: `${ORANGE}15`, borderRadius: 16, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, margin: "0 auto 16px" }}>✉️</div>
            <h1 style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 24, color: TEXT, letterSpacing: "-0.6px", marginBottom: 8 }}>Code eingeben</h1>
            <p style={{ color: TEXT2, fontSize: 14, lineHeight: 1.6 }}>
              Wir haben einen 6-stelligen Code an<br />
              <strong style={{ color: TEXT }}>{fields.email}</strong> gesendet.
            </p>
          </div>

          {msg && (
            <div style={{ background: msg.ok ? "#f0fdf4" : "#fef2f2", border: `1.5px solid ${msg.ok ? "#bbf7d0" : "#fca5a5"}`, borderRadius: 10, padding: "12px 16px", marginBottom: 20, textAlign: "center" }}>
              <p style={{ color: msg.ok ? "#16a34a" : "#dc2626", fontSize: 13 }}>{msg.text}</p>
            </div>
          )}

          <div style={{ display: "flex", gap: 10, justifyContent: "center", marginBottom: 24 }} onPaste={handleOtpPaste}>
            {otp.map((digit, i) => (
              <input
                key={i}
                ref={el => { otpRefs.current[i] = el; }}
                value={digit}
                onChange={e => handleOtpChange(i, e.target.value)}
                onKeyDown={e => handleOtpKey(i, e)}
                maxLength={1}
                inputMode="numeric"
                style={{
                  width: 52, height: 60, textAlign: "center", fontSize: 24, fontWeight: 700,
                  background: SURFACE, border: `2px solid ${digit ? ORANGE : BORDER}`,
                  borderRadius: 12, color: TEXT, fontFamily: "'Syne',sans-serif",
                  outline: "none", transition: "border-color 0.15s",
                }}
                onFocus={e => e.currentTarget.style.borderColor = ORANGE}
                onBlur={e => e.currentTarget.style.borderColor = otp[i] ? ORANGE : BORDER}
              />
            ))}
          </div>

          <button onClick={handleVerify} disabled={loading}
            style={{ width: "100%", background: loading ? "rgba(232,82,26,0.55)" : ORANGE, color: "#fff", border: "none", borderRadius: 12, padding: "15px", fontWeight: 700, fontSize: 15, cursor: loading ? "not-allowed" : "pointer", boxShadow: "0 4px 16px rgba(232,82,26,0.25)", fontFamily: "inherit", marginBottom: 16 }}>
            {loading ? "Wird überprüft..." : "Bestätigen →"}
          </button>

          <div style={{ textAlign: "center" }}>
            <button onClick={handleResend} disabled={loading}
              style={{ background: "none", border: "none", color: ORANGE, fontSize: 13, fontWeight: 600, cursor: "pointer", textDecoration: "underline" }}>
              Code erneut senden
            </button>
            <span style={{ color: TEXT3, fontSize: 13, margin: "0 8px" }}>·</span>
            <button onClick={() => { setOtpStep(false); setMsg(null); setOtp(["","","","","",""]); }}
              style={{ background: "none", border: "none", color: TEXT2, fontSize: 13, cursor: "pointer" }}>
              E-Mail ändern
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main style={{ minHeight: "100vh", background: BG, fontFamily: "'DM Sans','Helvetica Neue',system-ui,sans-serif", paddingBottom: 60 }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500;600;700&display=swap'); input::placeholder,select::placeholder { color: var(--kf-text3); }`}</style>

      {/* Header */}
      <nav style={{ background: SURFACE, borderBottom: `1px solid ${BORDER}`, padding: "0 24px", height: 60, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <a href="/marketplace" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none" }}>
          <div style={{ width: 30, height: 30, background: ORANGE, borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 14, color: "#fff", fontFamily: "'Syne',sans-serif" }}>V</div>
          <span style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 14, color: TEXT, letterSpacing: "-0.3px" }}>Vendoro</span>
        </a>
        <a href="/signup" style={{ color: TEXT2, fontSize: 13, textDecoration: "none", fontWeight: 500 }}>← Zurück</a>
      </nav>

      <div style={{ maxWidth: 520, margin: "0 auto", padding: "40px 24px" }}>
        <div style={{ marginBottom: 28 }}>
          <span style={{ display: "inline-block", background: `${ORANGE}15`, color: ORANGE, fontSize: 11, fontWeight: 700, padding: "4px 12px", borderRadius: 100, marginBottom: 14, letterSpacing: "1px", textTransform: "uppercase" }}>📦 Lieferant</span>
          <h1 style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 26, color: TEXT, letterSpacing: "-0.8px", marginBottom: 6 }}>Lieferant werden</h1>
          <p style={{ color: TEXT2, fontSize: 14 }}>Verkaufe deine Produkte direkt an Kiosk-Betreiber in Frankfurt. Wir prüfen deinen Antrag innerhalb von 24h.</p>
        </div>

        {msg && (
          <div style={{ background: msg.ok ? "#f0fdf4" : "#fef2f2", border: `1.5px solid ${msg.ok ? "#bbf7d0" : "#fca5a5"}`, borderRadius: 10, padding: "12px 16px", marginBottom: 20 }}>
            <p style={{ color: msg.ok ? "#16a34a" : "#dc2626", fontSize: 13 }}>{msg.text}</p>
          </div>
        )}

        <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 16, padding: "24px", display: "flex", flexDirection: "column", gap: 14 }}>
          <h2 style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 14, color: TEXT, marginBottom: 4 }}>Unternehmensdaten</h2>
          {[
            { key: "companyName",      label: "Firmenname",           placeholder: "BerlinBrews GmbH", required: true },
            { key: "contactPerson",    label: "Ansprechpartner",      placeholder: "Max Mustermann" },
            { key: "warehouseAddress", label: "Lageradresse",         placeholder: "Lagerstraße 5, Frankfurt" },
            { key: "city",             label: "Stadt",                placeholder: "Frankfurt" },
            { key: "phone",            label: "Telefon",              placeholder: "+49 69 123456" },
          ].map(f => (
            <div key={f.key}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: TEXT2, marginBottom: 6 }}>{f.label}{f.required && <span style={{ color: ORANGE, marginLeft: 3 }}>*</span>}</label>
              <input placeholder={f.placeholder} value={(fields as any)[f.key]} onChange={set(f.key)} style={inputStyle()} onFocus={focus} onBlur={blur} />
            </div>
          ))}
          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: TEXT2, marginBottom: 6 }}>Produktkategorie</label>
            <select value={fields.productCategory} onChange={set("productCategory")}
              style={{ ...inputStyle(), cursor: "pointer", color: fields.productCategory ? TEXT : TEXT3 }} onFocus={focus} onBlur={blur}>
              <option value="">Kategorie wählen</option>
              {["Energy", "Cola", "Bio", "Snacks", "Limo", "Getränke", "Andere"].map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div style={{ height: 1, background: BORDER, margin: "4px 0" }} />
          <h2 style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 14, color: TEXT, marginBottom: 4 }}>Zugangsdaten</h2>
          {[
            { key: "email",    label: "E-Mail",   type: "email",    placeholder: "firma@example.de", required: true },
            { key: "password", label: "Passwort", type: "password", placeholder: "Mindestens 6 Zeichen", required: true },
          ].map(f => (
            <div key={f.key}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: TEXT2, marginBottom: 6 }}>{f.label}<span style={{ color: ORANGE, marginLeft: 3 }}>*</span></label>
              <input type={f.type} placeholder={f.placeholder} value={(fields as any)[f.key]} onChange={set(f.key)} style={inputStyle()} onFocus={focus} onBlur={blur} />
            </div>
          ))}
        </div>

        <div style={{ background: `${ORANGE}10`, border: `1px solid ${ORANGE}30`, borderRadius: 12, padding: "14px 16px", marginTop: 14, display: "flex", gap: 10, alignItems: "flex-start" }}>
          <span style={{ fontSize: 16, flexShrink: 0, marginTop: 1 }}>ℹ️</span>
          <p style={{ fontSize: 12, color: TEXT2, lineHeight: 1.6 }}>Dein Lieferantenkonto wird nach manueller Prüfung aktiviert. Du erhältst eine Bestätigungs-E-Mail innerhalb von 24 Stunden.</p>
        </div>

        <button onClick={handleSignup} disabled={loading}
          style={{ width: "100%", marginTop: 14, background: loading ? "rgba(232,82,26,0.55)" : ORANGE, color: "#fff", border: "none", borderRadius: 12, padding: "15px", fontWeight: 700, fontSize: 15, cursor: loading ? "not-allowed" : "pointer", boxShadow: "0 4px 16px rgba(232,82,26,0.25)", fontFamily: "inherit" }}>
          {loading ? "Anfrage wird gesendet..." : "Lieferant-Anfrage senden →"}
        </button>

        <p style={{ color: TEXT2, fontSize: 13, textAlign: "center", marginTop: 20 }}>
          Bereits registriert?{" "}
          <a href="/login" style={{ color: ORANGE, fontWeight: 700, textDecoration: "none" }}>Einloggen</a>
        </p>
      </div>
    </main>
  );
}
