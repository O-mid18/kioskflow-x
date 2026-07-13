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
const ORANGE = "#E8521A";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [sessionReady, setSessionReady] = useState(false);

  useEffect(() => {
    // Supabase handles the recovery token from the URL hash automatically
    supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setSessionReady(true);
      }
    });
  }, []);

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
    <main style={{ minHeight: "100vh", background: BG, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'DM Sans','Helvetica Neue',system-ui,sans-serif", padding: "32px 16px" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500;600;700&display=swap');
        input::placeholder { color: ${TEXT3}; }
        input:focus { outline:none; border-color:${ORANGE} !important; box-shadow:0 0 0 3px rgba(232,82,26,0.1); }
      `}</style>

      <div style={{ width: "100%", maxWidth: 400 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 32 }}>
          <img src="/flowio-icon.png" alt="Flowio" style={{ width: 30, height: 30, borderRadius: 7, objectFit: "cover" }} />
          <span style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 15, color: TEXT }}>Flowio</span>
        </div>

        {done ? (
          <div style={{ background: SURFACE, border: `1.5px solid ${BORDER}`, borderRadius: 14, padding: 28, textAlign: "center" }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>✅</div>
            <h2 style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 22, color: TEXT, letterSpacing: "-0.5px", marginBottom: 10 }}>Passwort aktualisiert</h2>
            <p style={{ color: TEXT2, fontSize: 14 }}>Du wirst weitergeleitet...</p>
          </div>
        ) : !sessionReady ? (
          <div style={{ background: SURFACE, border: `1.5px solid ${BORDER}`, borderRadius: 14, padding: 28, textAlign: "center" }}>
            <p style={{ color: TEXT2, fontSize: 14 }}>Link wird überprüft...</p>
            <p style={{ color: TEXT3, fontSize: 12, marginTop: 12 }}>
              Falls der Link ungültig ist, fordere einen neuen an:{" "}
              <a href="/auth/forgot-password" style={{ color: ORANGE, fontWeight: 700, textDecoration: "none" }}>Passwort vergessen</a>
            </p>
          </div>
        ) : (
          <>
            <p style={{ fontSize: 11, fontWeight: 700, color: TEXT3, letterSpacing: "2.5px", textTransform: "uppercase", marginBottom: 12 }}>Neues Passwort</p>
            <h1 style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 26, color: TEXT, letterSpacing: "-0.5px", marginBottom: 8 }}>Passwort festlegen</h1>
            <p style={{ color: TEXT2, fontSize: 14, marginBottom: 28 }}>Wähle ein neues Passwort für dein Konto.</p>

            {errorMsg && (
              <div style={{ background: "#fef2f2", border: "1.5px solid #fca5a5", borderRadius: 10, padding: "12px 16px", marginBottom: 20 }}>
                <p style={{ color: "#dc2626", fontSize: 13 }}>{errorMsg}</p>
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
                  style={{ width: "100%", background: SURFACE, border: `1.5px solid ${BORDER}`, borderRadius: 11, padding: "12px 15px", color: TEXT, fontSize: 14, boxSizing: "border-box" }}
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
                  style={{ width: "100%", background: SURFACE, border: `1.5px solid ${BORDER}`, borderRadius: 11, padding: "12px 15px", color: TEXT, fontSize: 14, boxSizing: "border-box" }}
                />
              </div>
              <button
                onClick={handleReset}
                disabled={loading}
                style={{ width: "100%", background: loading ? "rgba(232,82,26,0.55)" : ORANGE, color: "#fff", border: "none", borderRadius: 11, padding: "14px", fontWeight: 700, fontSize: 15, cursor: loading ? "not-allowed" : "pointer", boxShadow: "0 4px 14px rgba(232,82,26,0.25)" }}
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
