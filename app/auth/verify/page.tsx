"use client";

import { useState, useRef, Suspense, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter, useSearchParams } from "next/navigation";

const BG     = "var(--kf-bg)";
const SURFACE = "var(--kf-surface)";
const BORDER  = "var(--kf-border)";
const TEXT    = "var(--kf-text)";
const TEXT2   = "var(--kf-text2)";
const TEXT3   = "var(--kf-text3)";
const ORANGE  = "#003ec7";
const ACCENT  = "var(--kf-accent)";
const BTN     = "var(--kf-btn)";

const LS_KEY = "kf_pending_signup";

function VerifyInner() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState(params.get("email") ?? "");
  const [otp, setOtp] = useState(["", "", "", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [isDark, setIsDark] = useState(false);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    const check = () => setIsDark(document.documentElement.classList.contains("dark"));
    check();
    const obs = new MutationObserver(check);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);

  const accentColor = isDark ? ACCENT : ORANGE;
  const btnColor    = isDark ? BTN    : ORANGE;

  const handleOtpChange = (i: number, val: string) => {
    const digit = val.replace(/\D/g, "").slice(-1);
    const next = [...otp]; next[i] = digit; setOtp(next);
    if (digit && i < 7) otpRefs.current[i + 1]?.focus();
  };

  const handleOtpKey = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otp[i] && i > 0) otpRefs.current[i - 1]?.focus();
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const text = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 8);
    if (text.length === 8) { setOtp(text.split("")); otpRefs.current[7]?.focus(); }
  };

  const handleVerify = async () => {
    if (!email) { setMsg({ text: "Bitte E-Mail-Adresse eingeben.", ok: false }); return; }
    const code = otp.join("");
    if (code.length < 8) { setMsg({ text: "Bitte alle 8 Ziffern eingeben.", ok: false }); return; }

    setLoading(true);
    setMsg(null);
    const { data, error } = await supabase.auth.verifyOtp({ email, token: code, type: "signup" });
    if (error || !data.user) {
      setMsg({ text: "Ungültiger oder abgelaufener Code. Bitte fordere einen neuen an.", ok: false });
      setLoading(false);
      return;
    }

    const raw = localStorage.getItem(LS_KEY);
    if (raw) {
      try {
        const pending = JSON.parse(raw);
        if (pending.type === "buyer") {
          await supabase.from("profiles").upsert({
            id: data.user.id, role: "buyer", status: "active",
            full_name: pending.fullName, company_name: pending.companyName,
            address: pending.address, postal_code: pending.postalCode,
            city: pending.city, phone: pending.phone,
          });
          localStorage.removeItem(LS_KEY);
          setMsg({ text: "E-Mail bestätigt! Weiterleitung...", ok: true });
          setTimeout(() => router.push("/marketplace"), 1200);
          return;
        }
        if (pending.type === "supplier") {
          await supabase.from("profiles").upsert({
            id: data.user.id, role: "supplier", status: "pending",
            company_name: pending.companyName, full_name: pending.contactPerson,
            address: pending.warehouseAddress, city: pending.city,
            phone: pending.phone, product_category: pending.productCategory,
          });
          await supabase.from("suppliers").insert({
            user_id: data.user.id, name: pending.companyName,
            phone: pending.phone, city: pending.city,
          });
          localStorage.removeItem(LS_KEY);
          setMsg({ text: "E-Mail bestätigt! Antrag wird geprüft...", ok: true });
          setTimeout(() => router.push("/login"), 1500);
          return;
        }
      } catch { /* ignore parse error, fall through to role-based redirect */ }
    }

    const { data: profile } = await supabase.from("profiles").select("role").eq("id", data.user.id).maybeSingle();
    const role = profile?.role;
    router.push(role === "supplier" ? "/supplier/dashboard" : role === "admin" ? "/admin/dashboard" : "/marketplace");
  };

  const handleResend = async () => {
    if (resendCooldown > 0 || !email) return;
    setLoading(true);
    await supabase.auth.resend({ type: "signup", email });
    setLoading(false);
    setMsg({ text: "Neuer Code gesendet.", ok: true });
    setResendCooldown(60);
    const interval = setInterval(() => {
      setResendCooldown(p => { if (p <= 1) { clearInterval(interval); return 0; } return p - 1; });
    }, 1000);
  };

  return (
    <main style={{ minHeight: "100vh", background: BG, fontFamily: "'Inter','Helvetica Neue',system-ui,sans-serif", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@600;700;800&family=Inter:wght@400;500;600;700&display=swap');
        input::placeholder { color: ${TEXT3}; }
        input:focus { outline: none; border-color: ${accentColor} !important; box-shadow: 0 0 0 3px rgba(0,62,199,0.1); }
      `}</style>

      <div style={{ maxWidth: 420, width: "100%" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 32 }}>
          <img src="/flowio-icon.png" alt="Flowio" style={{ width: 30, height: 30, borderRadius: 7, objectFit: "cover" }} />
          <span style={{ fontFamily: "'Manrope',sans-serif", fontWeight: 800, fontSize: 15, color: TEXT }}>Flowio</span>
        </div>

        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ width: 56, height: 56, background: `${ORANGE}15`, borderRadius: 16, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, margin: "0 auto 16px" }}>✉️</div>
          <h1 style={{ fontFamily: "'Manrope',sans-serif", fontWeight: 800, fontSize: 24, color: TEXT, letterSpacing: "-0.6px", marginBottom: 8 }}>E-Mail bestätigen</h1>
          <p style={{ color: TEXT2, fontSize: 14, lineHeight: 1.6 }}>
            Gib den 8-stelligen Code ein,<br />den wir dir per E-Mail gesendet haben.
          </p>
        </div>

        {msg && (
          <div style={{ background: msg.ok ? (isDark ? "rgba(22,163,74,0.15)" : "#f0fdf4") : (isDark ? "rgba(239,68,68,0.15)" : "#fef2f2"), border: `1.5px solid ${msg.ok ? (isDark ? "rgba(22,163,74,0.3)" : "#bbf7d0") : (isDark ? "rgba(239,68,68,0.3)" : "#fca5a5")}`, borderRadius: 10, padding: "12px 16px", marginBottom: 20, textAlign: "center" }}>
            <p style={{ color: msg.ok ? (isDark ? "#4ade80" : "#16a34a") : (isDark ? "#f87171" : "#dc2626"), fontSize: 13 }}>{msg.text}</p>
          </div>
        )}

        <div style={{ marginBottom: 20 }}>
          <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: TEXT2, marginBottom: 6 }}>E-Mail-Adresse</label>
          <input
            type="email"
            placeholder="name@firma.de"
            value={email}
            onChange={e => setEmail(e.target.value)}
            style={{ width: "100%", background: SURFACE, border: `1.5px solid ${BORDER}`, borderRadius: isDark ? 4 : 11, padding: "12px 15px", color: TEXT, fontSize: 14, boxSizing: "border-box" as const, fontFamily: "inherit" }}
          />
        </div>

        <div style={{ marginBottom: 24 }}>
          <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: TEXT2, marginBottom: 10, textAlign: "center" }}>8-stelliger Bestätigungscode</label>
          <div style={{ display: "flex", gap: 10, justifyContent: "center" }} onPaste={handlePaste}>
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
                  background: SURFACE, border: `2px solid ${digit ? accentColor : BORDER}`,
                  borderRadius: 12, color: TEXT, fontFamily: "'Manrope',sans-serif",
                  outline: "none", transition: "border-color 0.15s",
                }}
                onFocus={e => (e.currentTarget.style.borderColor = accentColor)}
                onBlur={e => (e.currentTarget.style.borderColor = otp[i] ? accentColor : BORDER)}
              />
            ))}
          </div>
        </div>

        <button onClick={handleVerify} disabled={loading}
          style={{ width: "100%", background: loading ? "rgba(0,62,199,0.55)" : btnColor, color: "#fff", border: "none", borderRadius: isDark ? 4 : 12, padding: "15px", fontWeight: 700, fontSize: 15, cursor: loading ? "not-allowed" : "pointer", boxShadow: "0 4px 16px rgba(0,62,199,0.25)", fontFamily: "inherit", marginBottom: 16 }}>
          {loading ? "Wird überprüft..." : "Bestätigen →"}
        </button>

        <div style={{ textAlign: "center", display: "flex", flexDirection: "column", gap: 12 }}>
          <button
            onClick={handleResend}
            disabled={loading || resendCooldown > 0 || !email}
            style={{ background: "none", border: "none", color: (resendCooldown > 0 || !email) ? TEXT3 : accentColor, fontSize: 13, fontWeight: 600, cursor: (resendCooldown > 0 || !email) ? "not-allowed" : "pointer", textDecoration: "underline", fontFamily: "inherit" }}>
            {resendCooldown > 0 ? `Neuen Code anfordern (${resendCooldown}s)` : "Neuen Code anfordern"}
          </button>
          <p style={{ color: TEXT3, fontSize: 12, margin: 0 }}>
            Keinen Code erhalten?{" "}
            <a href="/login" style={{ color: accentColor, fontWeight: 600, textDecoration: "none" }}>Stattdessen einloggen →</a>
          </p>
          <a href="/signup" style={{ color: TEXT3, fontSize: 12, textDecoration: "none" }}>← Zurück zur Registrierung</a>
        </div>
      </div>
    </main>
  );
}

export default function VerifyPage() {
  return (
    <Suspense>
      <VerifyInner />
    </Suspense>
  );
}
