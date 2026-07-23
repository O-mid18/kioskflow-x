"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

const BG     = "var(--kf-bg)";
const SURFACE = "var(--kf-surface)";
const BORDER  = "var(--kf-border)";
const TEXT    = "var(--kf-text)";
const TEXT2   = "var(--kf-text2)";
const TEXT3   = "var(--kf-text3)";
const ORANGE  = "#003ec7";
const ACCENT  = "var(--kf-accent)";
const BTN     = "var(--kf-btn)";

function inputStyle(focused?: boolean, isDark?: boolean) {
  return {
    width: "100%", background: SURFACE, border: `1.5px solid ${focused ? (isDark ? ACCENT : ORANGE) : BORDER}`,
    borderRadius: isDark ? 4 : 10, padding: "12px 14px", color: TEXT, fontSize: 14, fontFamily: "inherit",
    boxSizing: "border-box" as const, outline: "none",
    boxShadow: focused ? `0 0 0 3px ${ORANGE}18` : "none",
    transition: "border-color 0.2s, box-shadow 0.2s",
  };
}

function Field({ label, value, onChange, placeholder, type = "text", isDark = false }: {
  label: string; value: string; onChange: (v: string) => void; placeholder: string; type?: string; isDark?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <div>
      <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: TEXT2, marginBottom: 6 }}>{label}</label>
      {type === "textarea" ? (
        <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={3}
          onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
          style={{ ...inputStyle(focused, isDark), resize: "none" }} />
      ) : (
        <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
          onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
          style={inputStyle(focused, isDark)} />
      )}
    </div>
  );
}

// ── Buyer Profile ─────────────────────────────────────────────────────────────
function BuyerProfile({ email, buyerId, userId, isDark }: { email: string; buyerId: string; userId: string; isDark: boolean }) {
  const [fullName, setFullName]       = useState("");
  const [companyName, setCompanyName] = useState("");
  const [address, setAddress]         = useState("");
  const [city, setCity]               = useState("");
  const [phone, setPhone]             = useState("");
  const [saving, setSaving]           = useState(false);
  const [msg, setMsg]                 = useState<{ text: string; ok: boolean } | null>(null);
  const [approved, setApproved]       = useState(false);
  const [docUrl, setDocUrl]           = useState("");
  const [docFile, setDocFile]         = useState<File | null>(null);
  const [docUploading, setDocUploading] = useState(false);
  const [docMsg, setDocMsg]           = useState<{ text: string; ok: boolean } | null>(null);

  const accentColor = isDark ? ACCENT : ORANGE;
  const btnColor    = isDark ? BTN    : ORANGE;

  useEffect(() => {
    supabase.from("profiles").select("*").eq("id", buyerId).maybeSingle().then(({ data }) => {
      if (data) {
        setFullName(data.full_name ?? "");
        setCompanyName(data.company_name ?? "");
        setAddress(data.address ?? "");
        setCity(data.city ?? "");
        setPhone(data.phone ?? "");
        setApproved(data.approved ?? false);
        setDocUrl(data.verification_document_url ?? "");
      }
    });
  }, [buyerId]);

  const uploadDoc = async () => {
    if (!docFile) return;
    setDocUploading(true);
    const ext = docFile.name.split(".").pop();
    const path = `${buyerId}/gewerbeschein.${ext}`;
    const { error: upErr } = await supabase.storage.from("verification-documents").upload(path, docFile, { upsert: true, contentType: docFile.type });
    if (upErr) {
      setDocUploading(false);
      setDocMsg({ text: "Upload fehlgeschlagen. Bitte erneut versuchen.", ok: false });
      return;
    }
    const { error: updErr } = await supabase.from("profiles").update({ verification_document_url: path }).eq("id", buyerId);
    setDocUploading(false);
    if (updErr) { setDocMsg({ text: "Dokument hochgeladen, aber Profil konnte nicht aktualisiert werden.", ok: false }); return; }
    setDocUrl(path);
    setDocMsg({ text: "Dokument hochgeladen! Wir prüfen es in Kürze.", ok: true });
  };

  const save = async () => {
    setSaving(true);
    const { error } = await supabase.from("profiles").update({ full_name: fullName, company_name: companyName, address, city, phone }).eq("id", buyerId);
    setSaving(false);
    setMsg(error ? { text: "Profil konnte nicht gespeichert werden. Bitte erneut versuchen.", ok: false } : { text: "Profil gespeichert!", ok: true });
    setTimeout(() => setMsg(null), 3000);
  };

  const initials = (fullName || companyName || email).slice(0, 2).toUpperCase();

  const verifiedBadgeBg   = isDark ? "rgba(0,82,255,0.15)"   : "#dcfce7";
  const verifiedBadgeFg   = isDark ? "#b7c4ff"               : "#16a34a";
  const pendingBadgeBg    = isDark ? "rgba(249,115,22,0.15)" : "#fef9c3";
  const pendingBadgeFg    = isDark ? "#fb923c"               : "#ca8a04";

  return (
    <>
      {/* Avatar card */}
      <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: isDark ? 8 : 18, padding: 28, marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 24, paddingBottom: 24, borderBottom: `1px solid ${BORDER}` }}>
          <div style={{ width: 64, height: 64, borderRadius: 16, background: `${ORANGE}20`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Manrope',sans-serif", fontWeight: 800, fontSize: 22, color: accentColor, flexShrink: 0 }}>
            {initials}
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
              <p style={{ fontFamily: "'Manrope',sans-serif", fontWeight: 800, fontSize: 18, color: TEXT }}>{fullName || companyName || "—"}</p>
              {approved && (
                <span title="Verifizierter Kiosk" style={{ display: "inline-flex", alignItems: "center", gap: 4, background: verifiedBadgeBg, color: verifiedBadgeFg, fontSize: 11, fontWeight: 700, padding: "2px 9px", borderRadius: 100 }}>
                  ✓ Verifizierter Kiosk
                </span>
              )}
            </div>
            <p style={{ fontSize: 13, color: TEXT2 }}>{email}</p>
            <span style={{ display: "inline-block", marginTop: 6, background: `${ORANGE}15`, color: accentColor, fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 100 }}>Käufer</span>
          </div>
        </div>

        <h2 style={{ fontFamily: "'Manrope',sans-serif", fontWeight: 700, fontSize: 14, color: TEXT, marginBottom: 18 }}>Persönliche Daten</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <Field label="Vollständiger Name" value={fullName} onChange={setFullName} placeholder="Max Mustermann" isDark={isDark} />
          <Field label="Firmenname" value={companyName} onChange={setCompanyName} placeholder="Mustermann GmbH" isDark={isDark} />
          <Field label="Adresse" value={address} onChange={setAddress} placeholder="Musterstraße 1, 60311" isDark={isDark} />
          <Field label="Stadt" value={city} onChange={setCity} placeholder="Frankfurt" isDark={isDark} />
          <Field label="Telefon" value={phone} onChange={setPhone} placeholder="+49 170 0000000" isDark={isDark} />
        </div>
      </div>

      {/* Verification card */}
      <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: isDark ? 8 : 18, padding: 28, marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <h2 style={{ fontFamily: "'Manrope',sans-serif", fontWeight: 700, fontSize: 14, color: TEXT }}>Kiosk-Verifizierung</h2>
          {approved
            ? <span style={{ background: verifiedBadgeBg, color: verifiedBadgeFg, fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 100 }}>✓ Verifiziert</span>
            : <span style={{ background: pendingBadgeBg, color: pendingBadgeFg, fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 100 }}>⏳ Ausstehend</span>}
        </div>
        {!approved && (
          <>
            <p style={{ fontSize: 13, color: TEXT2, marginBottom: 16, lineHeight: 1.6 }}>
              Lade deinen Gewerbeschein (oder ein vergleichbares Dokument, das deinen Kiosk/Späti bestätigt) hoch, um das <strong>&ldquo;Verifizierter Kiosk&rdquo;</strong>-Abzeichen auf deinem Profil zu erhalten. Du kannst schon jetzt bestellen — die Verifizierung ist optional, hilft aber Lieferanten, dir zu vertrauen.
            </p>
            {docUrl && <p style={{ fontSize: 12, color: verifiedBadgeFg, marginBottom: 10 }}>✓ Dokument hochgeladen — wird geprüft.</p>}
            <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              <input type="file" accept="image/*,application/pdf" onChange={e => setDocFile(e.target.files?.[0] ?? null)}
                style={{ fontSize: 13, color: TEXT2 }} />
              <button onClick={uploadDoc} disabled={!docFile || docUploading}
                style={{ background: (!docFile || docUploading) ? "rgba(0,62,199,0.4)" : btnColor, color: "#fff", border: "none", borderRadius: isDark ? 4 : 9, padding: "9px 18px", fontSize: 13, fontWeight: 700, cursor: (!docFile || docUploading) ? "not-allowed" : "pointer" }}>
                {docUploading ? "Wird hochgeladen…" : "Hochladen →"}
              </button>
            </div>
            {docMsg && <p style={{ fontSize: 12, marginTop: 10, color: docMsg.ok ? verifiedBadgeFg : "#dc2626" }}>{docMsg.text}</p>}
          </>
        )}
      </div>

      {msg && (
        <div style={{ background: msg.ok ? (isDark ? "rgba(0,82,255,0.1)" : "#f0fdf4") : (isDark ? "rgba(239,68,68,0.1)" : "#fef2f2"), border: `1.5px solid ${msg.ok ? (isDark ? "rgba(0,82,255,0.3)" : "#bbf7d0") : (isDark ? "rgba(239,68,68,0.3)" : "#fca5a5")}`, borderRadius: 10, padding: "12px 16px", marginBottom: 16 }}>
          <p style={{ color: msg.ok ? (isDark ? "#b7c4ff" : "#16a34a") : (isDark ? "#f87171" : "#dc2626"), fontSize: 13, fontWeight: 600 }}>{msg.text}</p>
        </div>
      )}

      {/* Käufer-ID */}
      <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: isDark ? 8 : 14, padding: "16px 20px", marginBottom: 16, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <p style={{ fontSize: 10, fontWeight: 700, color: TEXT3, textTransform: "uppercase", letterSpacing: "1.5px", marginBottom: 4 }}>Deine Käufer-ID</p>
          <p style={{ fontFamily: "monospace", fontSize: 13, fontWeight: 700, color: TEXT, letterSpacing: "0.5px", wordBreak: "break-all" }}>{userId}</p>
          <p style={{ fontSize: 11, color: TEXT3, marginTop: 3 }}>Diese ID an den Admin weitergeben.</p>
        </div>
        <button onClick={() => navigator.clipboard.writeText(userId)}
          style={{ background: `${ORANGE}15`, border: `1px solid ${ORANGE}30`, color: accentColor, borderRadius: 8, padding: "8px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer", flexShrink: 0, marginLeft: 12 }}>
          Kopieren 📋
        </button>
      </div>

      {/* Quick links */}
      <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: isDark ? 8 : 18, overflow: "hidden", marginBottom: 20 }}>
        {[{ icon: "🛒", label: "Warenkorb", href: "/cart" }, { icon: "📦", label: "Meine Bestellungen", href: "/orders" }, { icon: "💬", label: "Nachrichten", href: "/messages" }, { icon: "📊", label: "Analytik", href: "/analytics" }, { icon: "🏪", label: "Meine Kiosk-Seite", href: "/kiosk-page/manage" }, { icon: "❤️", label: "Wunschliste", href: "/wishlist" }, { icon: "💬", label: "Support", href: "/support" }, { icon: "⚙️", label: "Einstellungen", href: "/settings" }].map(({ icon, label, href }, i, arr) => (
          <a key={href} href={href} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "15px 22px", textDecoration: "none", borderBottom: i < arr.length - 1 ? `1px solid ${BORDER}` : "none" }}
            onMouseEnter={e => e.currentTarget.style.background = BG} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontSize: 18 }}>{icon}</span>
              <span style={{ fontSize: 14, fontWeight: 600, color: TEXT }}>{label}</span>
            </div>
            <span style={{ color: TEXT3 }}>→</span>
          </a>
        ))}
      </div>

      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <button onClick={() => { supabase.auth.signOut().then(() => { window.location.href = "/login"; }); }}
          style={{ background: "none", border: `1.5px solid ${BORDER}`, color: TEXT2, borderRadius: 10, padding: "11px 20px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
          Abmelden ⏏
        </button>
        <button onClick={save} disabled={saving}
          style={{ background: saving ? `rgba(0,62,199,0.55)` : btnColor, color: "#fff", border: "none", borderRadius: 10, padding: "12px 28px", fontSize: 14, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer", boxShadow: `0 4px 14px rgba(0,62,199,0.25)` }}>
          {saving ? "Wird gespeichert..." : "Speichern →"}
        </button>
      </div>
    </>
  );
}

// ── Supplier Profile ──────────────────────────────────────────────────────────
function SupplierProfile({ email, supplierId, isDark }: { email: string; supplierId: string; isDark: boolean }) {
  const [name, setName]               = useState("");
  const [description, setDescription] = useState("");
  const [logoUrl, setLogoUrl]         = useState("");
  const [saving, setSaving]           = useState(false);
  const [msg, setMsg]                 = useState<{ text: string; ok: boolean } | null>(null);

  const accentColor = isDark ? ACCENT : ORANGE;
  const btnColor    = isDark ? BTN    : ORANGE;

  useEffect(() => {
    supabase.from("suppliers").select("*").eq("id", supplierId).maybeSingle().then(({ data }) => {
      if (data) {
        setName(data.name ?? "");
        setDescription(data.description ?? "");
        setLogoUrl(data.logo_url ?? "");
      }
    });
  }, [supplierId]);

  const save = async () => {
    setSaving(true);
    const { error } = await supabase.from("suppliers").update({ name, description, logo_url: logoUrl || null }).eq("id", supplierId);
    setSaving(false);
    setMsg(error ? { text: "Profil konnte nicht gespeichert werden. Bitte erneut versuchen.", ok: false } : { text: "Profil gespeichert!", ok: true });
    setTimeout(() => setMsg(null), 3000);
  };

  const initials = name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase() || "S";

  return (
    <>
      {/* Avatar card */}
      <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: isDark ? 8 : 18, padding: 28, marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 24, paddingBottom: 24, borderBottom: `1px solid ${BORDER}` }}>
          <div style={{ width: 64, height: 64, borderRadius: 16, overflow: "hidden", flexShrink: 0, background: `${ORANGE}20`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Manrope',sans-serif", fontWeight: 800, fontSize: 22, color: accentColor }}>
            {logoUrl ? (
              <img loading="lazy" decoding="async" src={logoUrl} alt="Logo" style={{ width: "100%", height: "100%", objectFit: "cover" }}
                onError={e => { e.currentTarget.style.display = "none"; }} />
            ) : initials}
          </div>
          <div>
            <p style={{ fontFamily: "'Manrope',sans-serif", fontWeight: 800, fontSize: 18, color: TEXT, marginBottom: 3 }}>{name || "—"}</p>
            <p style={{ fontSize: 13, color: TEXT2 }}>{email}</p>
            <span style={{ display: "inline-block", marginTop: 6, background: `${ORANGE}15`, color: accentColor, fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 100 }}>Lieferant</span>
          </div>
        </div>

        <h2 style={{ fontFamily: "'Manrope',sans-serif", fontWeight: 700, fontSize: 14, color: TEXT, marginBottom: 18 }}>Markeninformationen</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <Field label="Markenname" value={name} onChange={setName} placeholder="z.B. BerlinBrews GmbH" isDark={isDark} />
          <Field label="Beschreibung" value={description} onChange={setDescription} placeholder="Kurze Beschreibung deiner Marke..." type="textarea" isDark={isDark} />
          <Field label="Logo-URL" value={logoUrl} onChange={setLogoUrl} placeholder="https://example.com/logo.png" isDark={isDark} />
        </div>
      </div>

      {msg && (
        <div style={{ background: msg.ok ? (isDark ? "rgba(0,82,255,0.1)" : "#f0fdf4") : (isDark ? "rgba(239,68,68,0.1)" : "#fef2f2"), border: `1.5px solid ${msg.ok ? (isDark ? "rgba(0,82,255,0.3)" : "#bbf7d0") : (isDark ? "rgba(239,68,68,0.3)" : "#fca5a5")}`, borderRadius: 10, padding: "12px 16px", marginBottom: 16 }}>
          <p style={{ color: msg.ok ? (isDark ? "#b7c4ff" : "#16a34a") : (isDark ? "#f87171" : "#dc2626"), fontSize: 13, fontWeight: 600 }}>{msg.text}</p>
        </div>
      )}

      {/* Supplier quick links */}
      <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: isDark ? 8 : 18, overflow: "hidden", marginBottom: 20 }}>
        {[{ icon: "◉", label: "Dashboard Übersicht", href: "/supplier/dashboard" }, { icon: "📦", label: "Meine Produkte", href: "/supplier/dashboard/products" }, { icon: "🧾", label: "Bestellungen", href: "/supplier/dashboard/orders" }, { icon: "💬", label: "Nachrichten", href: "/supplier/dashboard/messages" }, { icon: "📊", label: "Analytik", href: "/supplier/dashboard/analytics" }, { icon: "✅", label: "Verifizierung", href: "/supplier/dashboard/verification" }, { icon: "⚙️", label: "Einstellungen", href: "/settings" }].map(({ icon, label, href }, i, arr) => (
          <a key={href} href={href} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "15px 22px", textDecoration: "none", borderBottom: i < arr.length - 1 ? `1px solid ${BORDER}` : "none" }}
            onMouseEnter={e => e.currentTarget.style.background = BG} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontSize: 18 }}>{icon}</span>
              <span style={{ fontSize: 14, fontWeight: 600, color: TEXT }}>{label}</span>
            </div>
            <span style={{ color: TEXT3 }}>→</span>
          </a>
        ))}
      </div>

      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <button onClick={() => { supabase.auth.signOut().then(() => { window.location.href = "/login"; }); }}
          style={{ background: "none", border: `1.5px solid ${BORDER}`, color: TEXT2, borderRadius: 10, padding: "11px 20px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
          Abmelden ⏏
        </button>
        <button onClick={save} disabled={saving}
          style={{ background: saving ? `rgba(0,62,199,0.55)` : btnColor, color: "#fff", border: "none", borderRadius: 10, padding: "12px 28px", fontSize: 14, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer", boxShadow: `0 4px 14px rgba(0,62,199,0.25)` }}>
          {saving ? "Wird gespeichert..." : "Speichern →"}
        </button>
      </div>
    </>
  );
}

// ── Root Page ─────────────────────────────────────────────────────────────────
export default function ProfilePage() {
  const [email, setEmail]         = useState("");
  const [role, setRole]           = useState<"buyer" | "supplier" | null>(null);
  const [roleId, setRoleId]       = useState<string | null>(null);
  const [userId, setUserId]       = useState<string | null>(null);
  const [loading, setLoading]     = useState(true);
  const [isAdmin, setIsAdmin]     = useState(false);
  const [isDark, setIsDark]       = useState(false);

  useEffect(() => {
    const check = () => setIsDark(document.documentElement.classList.contains("dark"));
    check();
    const obs = new MutationObserver(check);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    const detect = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { window.location.href = "/login"; return; }
      setEmail(user.email ?? "");
      setUserId(user.id);

      const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
      setIsAdmin(profile?.role === "admin");

      const { data: supplier } = await supabase.from("suppliers").select("id").eq("user_id", user.id).maybeSingle();
      if (supplier) { setRole("supplier"); setRoleId(supplier.id); setLoading(false); return; }

      setRole("buyer");
      setRoleId(user.id);
      setLoading(false);
    };
    detect();
  }, []);

  const accentColor = isDark ? ACCENT : ORANGE;

  const bottomNav = role === "supplier"
    ? [{ icon: "🏪", label: "Marktplatz", href: "/marketplace", active: false }, { icon: "📦", label: "Produkte", href: "/supplier/dashboard/products", active: false }, { icon: "🧾", label: "Bestellungen", href: "/supplier/dashboard/orders", active: false }, { icon: "👤", label: "Profil", href: "/profile", active: true }]
    : [{ icon: "🏪", label: "Marktplatz", href: "/marketplace", active: false }, { icon: "🛒", label: "Warenkorb", href: "/cart", active: false }, { icon: "📦", label: "Bestellungen", href: "/orders", active: false }, { icon: "💬", label: "Nachrichten", href: "/messages", active: false }, { icon: "👤", label: "Profil", href: "/profile", active: true }];

  return (
    <main style={{ minHeight: "100vh", background: BG, fontFamily: "'Inter','Helvetica Neue',system-ui,sans-serif", color: TEXT, paddingBottom: 80 }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Manrope:wght@600;700;800&family=Inter:wght@400;500;600;700&display=swap');`}</style>

      {/* Header */}
      <header style={{ background: SURFACE, borderBottom: `1px solid ${BORDER}`, padding: "0 24px", height: 60, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <a href="/marketplace" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none" }}>
          <img src="/flowio-icon.png" alt="Flowio" style={{ width: 30, height: 30, borderRadius: 7, objectFit: "cover" }} />
          <span style={{ fontFamily: "'Manrope',sans-serif", fontWeight: 800, fontSize: 15, color: TEXT, letterSpacing: "-0.3px" }}>Flowio</span>
        </a>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {isAdmin && <a href="/owner/dashboard" title="Owner-Panel" style={{ background:`${ORANGE}15`, color: accentColor, fontWeight:700, fontSize:13, textDecoration:"none", padding:"6px 12px", borderRadius:8 }}>🏛️</a>}
          {role === "supplier" && <a href="/supplier/dashboard" title="Lieferanten-Dashboard" style={{ background:`${ORANGE}15`, color: accentColor, fontWeight:700, fontSize:13, textDecoration:"none", padding:"6px 12px", borderRadius:8 }}>📦</a>}
          <span style={{ fontSize: 13, color: TEXT3 }}>Mein Profil</span>
        </div>
      </header>

      <div style={{ maxWidth: 640, margin: "0 auto", padding: "32px 24px" }}>
        <div style={{ marginBottom: 28 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: TEXT3, letterSpacing: "2.5px", textTransform: "uppercase", marginBottom: 8 }}>
            {role === "supplier" ? "Lieferant-Konto" : "Käufer-Konto"}
          </p>
          <h1 style={{ fontFamily: "'Manrope',sans-serif", fontWeight: 800, fontSize: 26, color: TEXT, letterSpacing: "-0.8px" }}>Mein Profil</h1>
        </div>

        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: "80px 0" }}>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            <div style={{ width: 36, height: 36, border: `3px solid ${BORDER}`, borderTopColor: accentColor, borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
          </div>
        ) : role === "supplier" && roleId ? (
          <SupplierProfile email={email} supplierId={roleId} isDark={isDark} />
        ) : role === "buyer" && roleId ? (
          <BuyerProfile email={email} buyerId={roleId} userId={userId ?? roleId} isDark={isDark} />
        ) : (
          <div style={{ textAlign: "center", padding: "60px 0" }}>
            <p style={{ fontSize: 13, color: TEXT2, marginBottom: 20 }}>Kein Profil gefunden. Bitte registriere dich zuerst.</p>
            <a href="/signup" style={{ background: isDark ? BTN : ORANGE, color: "#fff", fontWeight: 700, padding: "12px 24px", borderRadius: 10, textDecoration: "none", fontSize: 14 }}>Zur Registrierung →</a>
          </div>
        )}
      </div>

      {/* Bottom nav */}
      <nav style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: SURFACE, borderTop: `1px solid ${BORDER}`, display: "flex", justifyContent: "space-around", padding: "10px 0 14px", zIndex: 50 }}>
        {bottomNav.map(({ icon, label, href, active }) => (
          <a key={label} href={href} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, textDecoration: "none", padding: "0 12px" }}>
            <span style={{ fontSize: 20, lineHeight: 1 }}>{icon}</span>
            <span style={{ fontSize: 10, fontWeight: active ? 700 : 500, color: active ? accentColor : TEXT3 }}>{label}</span>
            {active && <div style={{ width: 16, height: 2, background: accentColor, borderRadius: 2, marginTop: 1 }} />}
          </a>
        ))}
      </nav>
    </main>
  );
}
