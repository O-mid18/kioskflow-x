"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

const BG = "var(--kf-bg)";
const SURFACE = "var(--kf-surface)";
const BORDER = "var(--kf-border)";
const TEXT = "var(--kf-text)";
const TEXT2 = "var(--kf-text2)";
const TEXT3 = "var(--kf-text3)";
const ORANGE = "#2563EB";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async () => {
    setErrorMsg("");
    if (!email) { setErrorMsg("Bitte E-Mail-Adresse eingeben."); return; }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });
    setLoading(false);
    if (error) setErrorMsg(error.message);
    else setSent(true);
  };

  return (
    <main style={{ minHeight: "100vh", background: BG, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'DM Sans','Helvetica Neue',system-ui,sans-serif", padding: "32px 16px" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500;600;700&display=swap');
        input::placeholder { color: ${TEXT3}; }
        input:focus { outline:none; border-color:${ORANGE} !important; box-shadow:0 0 0 3px rgba(37,99,235,0.1); }
      `}</style>

      <div style={{ width: "100%", maxWidth: 400 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 32 }}>
          <img src="/flowio-icon.png" alt="Flowio" style={{ width: 30, height: 30, borderRadius: 7, objectFit: "cover" }} />
          <span style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 15, color: TEXT }}>Flowio</span>
        </div>

        {sent ? (
          <div style={{ background: SURFACE, border: `1.5px solid ${BORDER}`, borderRadius: 14, padding: 28, textAlign: "center" }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>✉️</div>
            <h2 style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 22, color: TEXT, letterSpacing: "-0.5px", marginBottom: 10 }}>E-Mail gesendet</h2>
            <p style={{ color: TEXT2, fontSize: 14, lineHeight: 1.6, marginBottom: 20 }}>
              Falls ein Konto mit dieser E-Mail-Adresse existiert, haben wir einen Link zum Zurücksetzen des Passworts gesendet.
            </p>
            <a href="/login" style={{ color: ORANGE, fontWeight: 700, fontSize: 14, textDecoration: "none" }}>← Zurück zum Login</a>
          </div>
        ) : (
          <>
            <p style={{ fontSize: 11, fontWeight: 700, color: TEXT3, letterSpacing: "2.5px", textTransform: "uppercase", marginBottom: 12 }}>Passwort zurücksetzen</p>
            <h1 style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 26, color: TEXT, letterSpacing: "-0.5px", marginBottom: 8 }}>Passwort vergessen?</h1>
            <p style={{ color: TEXT2, fontSize: 14, marginBottom: 28 }}>Gib deine E-Mail-Adresse ein und wir senden dir einen Reset-Link.</p>

            {errorMsg && (
              <div style={{ background: "#fef2f2", border: "1.5px solid #fca5a5", borderRadius: 10, padding: "12px 16px", marginBottom: 20 }}>
                <p style={{ color: "#dc2626", fontSize: 13 }}>{errorMsg}</p>
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: TEXT2, marginBottom: 7 }}>E-Mail</label>
                <input
                  type="email"
                  placeholder="name@firma.de"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleSubmit()}
                  style={{ width: "100%", background: SURFACE, border: `1.5px solid ${BORDER}`, borderRadius: 11, padding: "12px 15px", color: TEXT, fontSize: 14, boxSizing: "border-box" }}
                />
              </div>
              <button
                onClick={handleSubmit}
                disabled={loading}
                style={{ width: "100%", background: loading ? "rgba(37,99,235,0.55)" : ORANGE, color: "#fff", border: "none", borderRadius: 11, padding: "14px", fontWeight: 700, fontSize: 15, cursor: loading ? "not-allowed" : "pointer", boxShadow: "0 4px 14px rgba(37,99,235,0.25)" }}
              >
                {loading ? "Sende..." : "Reset-Link senden →"}
              </button>
            </div>

            <p style={{ textAlign: "center", marginTop: 24, fontSize: 13, color: TEXT2 }}>
              <a href="/login" style={{ color: ORANGE, fontWeight: 700, textDecoration: "none" }}>← Zurück zum Login</a>
            </p>
          </>
        )}
      </div>
    </main>
  );
}
