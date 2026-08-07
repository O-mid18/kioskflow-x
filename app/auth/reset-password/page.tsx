"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

const BG = "var(--kf-bg)";
const SURFACE = "var(--kf-surface)";
const BORDER = "var(--kf-border)";
const TEXT = "var(--kf-text)";
const TEXT2 = "var(--kf-text2)";
const TEXT3 = "var(--kf-text3)";
const ORANGE = "#003ec7";
const ACCENT = "var(--kf-accent)";
const BTN    = "var(--kf-btn)";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [sessionReady, setSessionReady] = useState(false);
  const [linkExpired, setLinkExpired] = useState(false);
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setSessionReady(true);
      }
    });
    const timer = setTimeout(() => {
      setSessionReady(s => { if (!s) setLinkExpired(true); return s; });
    }, 8000);
    return () => { subscription.unsubscribe(); clearTimeout(timer); };
  }, []);

  useEffect(() => {
    const check = () => setIsDark(document.documentElement.classList.contains("dark"));
    check();
    const obs = new MutationObserver(check);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);

  const accentColor = isDark ? ACCENT : ORANGE;
  const btnColor    = isDark ? BTN    : ORANGE;

  const handleReset = async () => {
    setErrorMsg("");
    if (!password) { setErrorMsg("Bitte Passwort eingeben."); return; }
    if (password.length < 6) { setErrorMsg("Passwort muss mindestens 6 Zeichen lang sein."); return; }
    if (password !== confirm) { setErrorMsg("Passwörter stimmen nicht überein."); return; }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) setErrorMsg(error.message);
    else {
      setDone(true);
      setTimeout(() => router.push("/login"), 2500);
    }
  };

  return (
    <main style={{ minHeight: "100vh", background: BG, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Inter','Helvetica Neue',system-ui,sans-serif", padding: "32px 16px" }}>
      <style>{`
        input::placeholder { color: ${TEXT3}; }
        input:focus { outline:none; border-color:${accentColor} !important; box-shadow:0 0 0 3px rgba(0,62,199,0.1); }
      `}</style>

      <div style={{ width: "100%", maxWidth: 400 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 32 }}>
          <img src="/flowio-icon.png" alt="Flowio" style={{ width: 30, height: 30, borderRadius: 7, objectFit: "cover" }} />
          <span style={{ fontFamily: "'Manrope',sans-serif", fontWeight: 800, fontSize: 15, color: TEXT }}>Flowio</span>
        </div>

        {done ? (
          <div style={{ background: SURFACE, border: `1.5px solid ${BORDER}`, borderRadius: 14, padding: 28, textAlign: "center" }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>✅</div>
            <h2 style={{ fontFamily: "'Manrope',sans-serif", fontWeight: 800, fontSize: 22, color: TEXT, letterSpacing: "-0.5px", marginBottom: 10 }}>Passwort aktualisiert</h2>
            <p style={{ color: TEXT2, fontSize: 14 }}>Du wirst weitergeleitet...</p>
          </div>
        ) : linkExpired ? (
          <div style={{ background: SURFACE, border: `1.5px solid ${BORDER}`, borderRadius: 14, padding: 28, textAlign: "center" }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>⚠️</div>
            <h2 style={{ fontFamily: "'Manrope',sans-serif", fontWeight: 800, fontSize: 20, color: TEXT, letterSpacing: "-0.5px", marginBottom: 10 }}>Link abgelaufen</h2>
            <p style={{ color: TEXT2, fontSize: 14, lineHeight: 1.6, marginBottom: 20 }}>
              Dieser Reset-Link ist ungültig oder abgelaufen. Bitte fordere einen neuen an.
            </p>
            <a href="/auth/forgot-password" style={{ color: "#fff", background: btnColor, fontWeight: 700, fontSize: 14, textDecoration: "none", padding: "10px 20px", borderRadius: isDark ? 4 : 10, display: "inline-block" }}>Neuen Link anfordern</a>
          </div>
        ) : !sessionReady ? (
          <div style={{ background: SURFACE, border: `1.5px solid ${BORDER}`, borderRadius: 14, padding: 28, textAlign: "center" }}>
            <p style={{ color: TEXT2, fontSize: 14 }}>Link wird überprüft...</p>
          </div>
        ) : (
          <>
            <p style={{ fontSize: 11, fontWeight: 700, color: TEXT3, letterSpacing: "2.5px", textTransform: "uppercase", marginBottom: 12 }}>Neues Passwort</p>
            <h1 style={{ fontFamily: "'Manrope',sans-serif", fontWeight: 800, fontSize: 26, color: TEXT, letterSpacing: "-0.5px", marginBottom: 8 }}>Passwort festlegen</h1>
            <p style={{ color: TEXT2, fontSize: 14, marginBottom: 28 }}>Wähle ein neues Passwort für dein Konto.</p>

            {errorMsg && (
              <div style={{ background: isDark ? "rgba(239,68,68,0.15)" : "#fef2f2", border: `1.5px solid ${isDark ? "rgba(239,68,68,0.3)" : "#fca5a5"}`, borderRadius: 10, padding: "12px 16px", marginBottom: 20 }}>
                <p style={{ color: isDark ? "#f87171" : "#dc2626", fontSize: 13 }}>{errorMsg}</p>
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: TEXT2, marginBottom: 7 }}>Neues Passwort</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  style={{ width: "100%", background: SURFACE, border: `1.5px solid ${BORDER}`, borderRadius: isDark ? 4 : 11, padding: "12px 15px", color: TEXT, fontSize: 14, boxSizing: "border-box" }}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: TEXT2, marginBottom: 7 }}>Passwort bestätigen</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleReset()}
                  style={{ width: "100%", background: SURFACE, border: `1.5px solid ${BORDER}`, borderRadius: isDark ? 4 : 11, padding: "12px 15px", color: TEXT, fontSize: 14, boxSizing: "border-box" }}
                />
              </div>
              <button
                onClick={handleReset}
                disabled={loading}
                style={{ width: "100%", background: loading ? "rgba(0,62,199,0.55)" : btnColor, color: "#fff", border: "none", borderRadius: isDark ? 4 : 11, padding: "14px", fontWeight: 700, fontSize: 15, cursor: loading ? "not-allowed" : "pointer", boxShadow: "0 4px 14px rgba(0,62,199,0.25)" }}
              >
                {loading ? "Speichern..." : "Passwort speichern →"}
              </button>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
