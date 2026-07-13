"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

const BG      = "var(--kf-bg)";
const SURFACE = "var(--kf-surface)";
const BORDER  = "var(--kf-border)";
const TEXT    = "var(--kf-text)";
const TEXT2   = "var(--kf-text2)";
const TEXT3   = "var(--kf-text3)";
const ORANGE  = "#2563EB";

const iStyle: React.CSSProperties = {
  width: "100%", background: BG, border: `1.5px solid ${BORDER}`,
  borderRadius: 10, padding: "12px 14px", color: TEXT, fontSize: 14,
  fontFamily: "inherit", outline: "none", boxSizing: "border-box",
  transition: "border-color 0.2s, box-shadow 0.2s",
};

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 18, padding: 28, marginBottom: 16 }}>
      <h2 style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 16, color: TEXT, marginBottom: subtitle ? 4 : 20 }}>{title}</h2>
      {subtitle && <p style={{ fontSize: 13, color: TEXT2, marginBottom: 20 }}>{subtitle}</p>}
      {children}
    </div>
  );
}

export default function SettingsPage() {
  const [email, setEmail]           = useState("");
  const [loading, setLoading]       = useState(true);

  const [newPw, setNewPw]           = useState("");
  const [confirmPw, setConfirmPw]   = useState("");
  const [pwSaving, setPwSaving]     = useState(false);
  const [pwMsg, setPwMsg]           = useState<{ text: string; ok: boolean } | null>(null);

  const [deleteEmail, setDeleteEmail]     = useState("");
  const [deleting, setDeleting]           = useState(false);
  const [deleteMsg, setDeleteMsg]         = useState<{ text: string; ok: boolean } | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { window.location.href = "/login"; return; }
      setEmail(user.email ?? "");
      setLoading(false);
    });
  }, []);

  const fo = (e: React.FocusEvent<HTMLInputElement>) => {
    e.currentTarget.style.borderColor = ORANGE;
    e.currentTarget.style.boxShadow = `0 0 0 3px ${ORANGE}18`;
  };
  const bl = (e: React.FocusEvent<HTMLInputElement>) => {
    e.currentTarget.style.borderColor = BORDER;
    e.currentTarget.style.boxShadow = "none";
  };

  const changePassword = async () => {
    setPwMsg(null);
    if (!newPw || !confirmPw) { setPwMsg({ text: "Bitte alle Felder ausfüllen.", ok: false }); return; }
    if (newPw.length < 8)     { setPwMsg({ text: "Passwort muss mindestens 8 Zeichen lang sein.", ok: false }); return; }
    if (newPw !== confirmPw)  { setPwMsg({ text: "Passwörter stimmen nicht überein.", ok: false }); return; }
    setPwSaving(true);
    const { error } = await supabase.auth.updateUser({ password: newPw });
    setPwSaving(false);
    if (error) { setPwMsg({ text: "Passwort konnte nicht geändert werden. Bitte erneut anmelden und versuchen.", ok: false }); return; }
    setPwMsg({ text: "Passwort erfolgreich geändert!", ok: true });
    setNewPw(""); setConfirmPw("");
    setTimeout(() => setPwMsg(null), 4000);
  };

  const deleteAccount = async () => {
    if (deleteEmail !== email) {
      setDeleteMsg({ text: "E-Mail stimmt nicht überein.", ok: false });
      return;
    }
    setDeleting(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setDeleting(false); setDeleteMsg({ text: "Nicht eingeloggt.", ok: false }); return; }
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setDeleting(false); setDeleteMsg({ text: "Nicht eingeloggt.", ok: false }); return; }

    const res = await fetch("/api/delete-account", {
      method: "POST",
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    const json = await res.json();
    setDeleting(false);
    if (!res.ok) { setDeleteMsg({ text: json.error ?? "Fehler beim Löschen.", ok: false }); return; }
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  if (loading) {
    return (
      <main style={{ minHeight: "100vh", background: BG, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <div style={{ width: 34, height: 34, border: `3px solid ${BORDER}`, borderTopColor: ORANGE, borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      </main>
    );
  }

  return (
    <main style={{ minHeight: "100vh", background: BG, fontFamily: "'DM Sans','Helvetica Neue',system-ui,sans-serif", color: TEXT, paddingBottom: 60 }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500;600;700&display=swap'); @keyframes spin { to { transform: rotate(360deg); } } * { box-sizing: border-box; }`}</style>

      <header style={{ background: SURFACE, borderBottom: `1px solid ${BORDER}`, padding: "0 24px", height: 60, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <a href="/profile" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none" }}>
          <img src="/flowio-icon.png" alt="Flowio" style={{ width: 30, height: 30, borderRadius: 7, objectFit: "cover" }} />
          <span style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 15, color: TEXT }}>Flowio</span>
        </a>
        <a href="/profile" style={{ fontSize: 13, color: TEXT2, textDecoration: "none", fontWeight: 500 }}>← Zurück zum Profil</a>
      </header>

      <div style={{ maxWidth: 600, margin: "0 auto", padding: "32px 24px" }}>
        <div style={{ marginBottom: 28 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: TEXT3, letterSpacing: "2.5px", textTransform: "uppercase", marginBottom: 8 }}>Konto</p>
          <h1 style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 26, color: TEXT, letterSpacing: "-0.8px" }}>Einstellungen</h1>
          <p style={{ fontSize: 13, color: TEXT2, marginTop: 4 }}>{email}</p>
        </div>

        {/* ── Passwort ändern ── */}
        <Section title="Passwort ändern" subtitle="Mindestens 6 Zeichen. Du musst danach erneut einloggen.">
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: TEXT2, marginBottom: 6 }}>Neues Passwort</label>
              <input type="password" value={newPw} onChange={e => setNewPw(e.target.value)} placeholder="Neues Passwort" style={iStyle} onFocus={fo} onBlur={bl} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: TEXT2, marginBottom: 6 }}>Passwort bestätigen</label>
              <input type="password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)} placeholder="Nochmal eingeben" style={iStyle} onFocus={fo} onBlur={bl}
                onKeyDown={e => { if (e.key === "Enter") changePassword(); }} />
            </div>

            {pwMsg && (
              <div style={{ background: pwMsg.ok ? "#f0fdf4" : "#fef2f2", border: `1.5px solid ${pwMsg.ok ? "#bbf7d0" : "#fca5a5"}`, borderRadius: 10, padding: "11px 14px" }}>
                <p style={{ color: pwMsg.ok ? "#16a34a" : "#dc2626", fontSize: 13, fontWeight: 600 }}>{pwMsg.text}</p>
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button onClick={changePassword} disabled={pwSaving}
                style={{ background: pwSaving ? `${ORANGE}80` : ORANGE, color: "#fff", border: "none", borderRadius: 10, padding: "11px 24px", fontSize: 14, fontWeight: 700, cursor: pwSaving ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: 8 }}>
                {pwSaving && <div style={{ width: 14, height: 14, border: "2px solid rgba(255,255,255,0.4)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />}
                {pwSaving ? "Wird gespeichert..." : "Passwort ändern →"}
              </button>
            </div>
          </div>
        </Section>

        {/* ── Konto löschen ── */}
        <div style={{ background: SURFACE, border: `1.5px solid #fca5a5`, borderRadius: 18, padding: 28 }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 20 }}>
            <span style={{ fontSize: 24, flexShrink: 0 }}>⚠️</span>
            <div>
              <h2 style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 16, color: "#dc2626", marginBottom: 4 }}>Konto löschen</h2>
              <p style={{ fontSize: 13, color: TEXT2, lineHeight: 1.6 }}>Diese Aktion ist <strong>nicht rückgängig</strong> zu machen. Alle deine Daten werden dauerhaft gelöscht.</p>
            </div>
          </div>

          {!showDeleteConfirm ? (
            <button onClick={() => setShowDeleteConfirm(true)}
              style={{ background: "#fef2f2", border: "1.5px solid #fca5a5", color: "#dc2626", borderRadius: 10, padding: "11px 22px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
              Konto löschen
            </button>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: TEXT2, marginBottom: 6 }}>
                  Gib deine E-Mail-Adresse ein zur Bestätigung: <strong style={{ color: TEXT }}>{email}</strong>
                </label>
                <input type="email" value={deleteEmail} onChange={e => setDeleteEmail(e.target.value)} placeholder={email} style={{ ...iStyle, borderColor: "#fca5a5" }} onFocus={fo} onBlur={bl} />
              </div>

              {deleteMsg && (
                <div style={{ background: "#fef2f2", border: "1.5px solid #fca5a5", borderRadius: 10, padding: "11px 14px" }}>
                  <p style={{ color: "#dc2626", fontSize: 13, fontWeight: 600 }}>{deleteMsg.text}</p>
                </div>
              )}

              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={() => { setShowDeleteConfirm(false); setDeleteEmail(""); setDeleteMsg(null); }}
                  style={{ background: "none", border: `1.5px solid ${BORDER}`, color: TEXT2, borderRadius: 10, padding: "11px 20px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                  Abbrechen
                </button>
                <button onClick={deleteAccount} disabled={deleting || deleteEmail !== email}
                  style={{ background: deleting || deleteEmail !== email ? "#fca5a580" : "#dc2626", color: "#fff", border: "none", borderRadius: 10, padding: "11px 22px", fontSize: 13, fontWeight: 700, cursor: deleting || deleteEmail !== email ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: 8 }}>
                  {deleting && <div style={{ width: 14, height: 14, border: "2px solid rgba(255,255,255,0.4)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />}
                  {deleting ? "Wird gelöscht..." : "Konto endgültig löschen"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
