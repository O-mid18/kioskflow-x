"use client";

import { useState } from "react";

const BG = "var(--kf-bg)";
const SURFACE = "var(--kf-surface)";
const BORDER = "var(--kf-border)";
const TEXT = "var(--kf-text)";
const TEXT2 = "var(--kf-text2)";
const TEXT3 = "var(--kf-text3)";
const ORANGE = "#E8521A";

export default function OwnerLogin() {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [show, setShow] = useState(false);

  const login = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const res = await fetch("/api/owner", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "login", password }),
    });
    const data = await res.json();
    setLoading(false);
    if (res.ok) {
      window.location.href = "/owner/dashboard";
    } else {
      setError(data.error ?? "Anmeldung fehlgeschlagen");
    }
  };

  return (
    <main style={{ minHeight: "100vh", background: BG, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'DM Sans','Helvetica Neue',system-ui,sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500;600;700&display=swap');
        @keyframes spin { to { transform: rotate(360deg); } }
        input:focus { outline: none; border-color: ${ORANGE} !important; box-shadow: 0 0 0 3px rgba(232,82,26,0.12) !important; }
      `}</style>

      <div style={{ width: "100%", maxWidth: 400, padding: "0 24px" }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <div style={{ width: 56, height: 56, background: ORANGE, borderRadius: 16, display: "inline-flex", alignItems: "center", justifyContent: "center", fontFamily: "'Syne',sans-serif", fontWeight: 900, fontSize: 26, color: "#fff", marginBottom: 18 }}>V</div>
          <h1 style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 24, color: TEXT, letterSpacing: "-0.5px" }}>Owner-Panel</h1>
          <p style={{ color: TEXT3, fontSize: 13, marginTop: 6 }}>Nur für den Eigentümer · Passwort erforderlich</p>
        </div>

        {/* Card */}
        <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 20, padding: "32px 28px" }}>
          {error && (
            <div style={{ background: "#fef2f2", border: "1.5px solid #fca5a5", borderRadius: 10, padding: "10px 14px", marginBottom: 20 }}>
              <p style={{ color: "#dc2626", fontSize: 13 }}>🔒 {error}</p>
            </div>
          )}

          <form onSubmit={login} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: TEXT2, marginBottom: 8 }}>Passwort</label>
              <div style={{ position: "relative" }}>
                <input
                  type={show ? "text" : "password"}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Owner-Passwort eingeben"
                  autoFocus
                  style={{ width: "100%", background: BG, border: `1.5px solid ${BORDER}`, borderRadius: 10, padding: "12px 44px 12px 15px", color: TEXT, fontSize: 14, fontFamily: "inherit", boxSizing: "border-box", transition: "border-color 0.2s, box-shadow 0.2s" }}
                />
                <button type="button" onClick={() => setShow(v => !v)}
                  style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", fontSize: 16, color: TEXT3, display: "flex", alignItems: "center" }}>
                  {show ? "🙈" : "👁️"}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading || !password}
              style={{ background: loading || !password ? "rgba(232,82,26,0.45)" : ORANGE, color: "#fff", border: "none", borderRadius: 10, padding: "13px", fontSize: 14, fontWeight: 700, cursor: loading || !password ? "not-allowed" : "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, transition: "background 0.2s", boxShadow: "0 4px 14px rgba(232,82,26,0.25)" }}>
              {loading && <div style={{ width: 14, height: 14, border: "2px solid rgba(255,255,255,0.4)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />}
              {loading ? "Wird geprüft..." : "Einloggen →"}
            </button>
          </form>
        </div>

        <p style={{ textAlign: "center", color: TEXT3, fontSize: 11, marginTop: 20 }}>
          Diese Seite ist nicht öffentlich indexiert.
        </p>
      </div>
    </main>
  );
}
