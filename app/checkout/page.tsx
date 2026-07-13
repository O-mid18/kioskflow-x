"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Breadcrumb } from "@/components/ui/step-breadcrumb";

const BG      = "var(--kf-bg)";
const SURFACE = "var(--kf-surface)";
const BORDER  = "var(--kf-border)";
const TEXT    = "var(--kf-text)";
const TEXT2   = "var(--kf-text2)";
const TEXT3   = "var(--kf-text3)";
const ORANGE  = "#2563EB";

interface Product  { name: string; price: number; }
interface CartItem { id: string; quantity: number; products: Product; }

const LS_KEY = "kf_shipping_address";

const iStyle: React.CSSProperties = {
  width: "100%", background: BG, border: `1.5px solid ${BORDER}`,
  borderRadius: 10, padding: "11px 14px", color: TEXT, fontSize: 14,
  fontFamily: "inherit", outline: "none", boxSizing: "border-box", transition: "border-color 0.2s",
};

export default function CheckoutPage() {
  const [items, setItems]   = useState<CartItem[]>([]);
  const [total, setTotal]   = useState(0);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [error, setError]   = useState<string | null>(null);

  // Address fields
  const [firstName,  setFirstName]  = useState("");
  const [lastName,   setLastName]   = useState("");
  const [email,      setEmail]      = useState("");
  const [street,     setStreet]     = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [city,       setCity]       = useState("");
  const [country,    setCountry]    = useState("Deutschland");
  const [saveAddr,   setSaveAddr]   = useState(false);
  const [addrErr,    setAddrErr]    = useState<string | null>(null);
  const [discountCode, setDiscountCode] = useState("");
  const [discountInfo, setDiscountInfo] = useState<{ pct: number; label: string } | null>(null);
  const [discountErr,  setDiscountErr]  = useState<string | null>(null);

  useEffect(() => {
    fetchCart();
    const saved = localStorage.getItem(LS_KEY);
    let savedEmail = "";
    if (saved) {
      try {
        const a = JSON.parse(saved);
        setFirstName(a.firstName ?? "");
        setLastName(a.lastName ?? "");
        savedEmail = a.email ?? "";
        setEmail(savedEmail);
        setStreet(a.street ?? "");
        setPostalCode(a.postalCode ?? "");
        setCity(a.city ?? "");
        setCountry(a.country ?? "Deutschland");
        setSaveAddr(true);
      } catch {}
    }
    // Pre-fill email from Supabase auth only if no saved address email exists
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user?.email && !savedEmail) setEmail(user.email);
    });
  }, []);

  const fetchCart = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }
      const { data, error } = await supabase
        .from("cart_items")
        .select("id, quantity, products (name, price)")
        .eq("user_id", user.id);
      if (error) throw error;
      if (data) {
        const cartItems = data as unknown as CartItem[];
        setItems(cartItems);
        setTotal(cartItems.reduce((s, i) => s + i.products.price * i.quantity, 0));
      }
    } catch { setError("Warenkorb konnte nicht geladen werden."); }
    finally { setLoading(false); }
  };

  const handlePayment = async () => {
    setAddrErr(null);
    if (!firstName.trim() || !lastName.trim() || !email.trim() || !street.trim() || !postalCode.trim() || !city.trim()) {
      setAddrErr("Bitte fülle alle Pflichtfelder (*) aus.");
      document.getElementById("addr-section")?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setAddrErr("Bitte gib eine gültige E-Mail-Adresse ein.");
      document.getElementById("addr-section")?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    if (!/^\d{4,5}$/.test(postalCode.trim())) {
      setAddrErr("Postleitzahl muss aus 4–5 Ziffern bestehen (z.B. 60311 oder 1010).");
      document.getElementById("addr-section")?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    if (saveAddr) {
      localStorage.setItem(LS_KEY, JSON.stringify({ firstName, lastName, email, street, postalCode, city, country }));
    } else {
      localStorage.removeItem(LS_KEY);
    }
    try {
      setPaying(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setError("Bitte zuerst einloggen."); setPaying(false); return; }
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setError("Sitzung abgelaufen. Bitte erneut einloggen."); setPaying(false); return; }
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${session.access_token}` },
        body: JSON.stringify({ shippingAddress: { firstName, lastName, email, street, postalCode, city, country }, discountCode: discountInfo ? discountCode.trim().toUpperCase() : null }),
      });
      const text = await res.text();
      let data: any;
      try { data = JSON.parse(text); } catch { data = { error: text.slice(0, 300) }; }
      if (!res.ok) { setError(`[${res.status}] ${data?.error ?? "Payment failed"}`); setPaying(false); return; }
      window.location.href = data.url;
    } catch (e: any) { setError("Fetch-Fehler: " + (e?.message ?? String(e))); }
    finally { setPaying(false); }
  };

  const DISCOUNT_CODES: Record<string, { pct: number; label: string }> = {
    "OMED10": { pct: 0.10, label: "10% Rabatt" },
    "OMED20": { pct: 0.20, label: "20% Rabatt" },
  };

  const applyDiscount = () => {
    const code = discountCode.trim().toUpperCase();
    if (DISCOUNT_CODES[code]) {
      setDiscountInfo(DISCOUNT_CODES[code]);
      setDiscountErr(null);
    } else {
      setDiscountInfo(null);
      setDiscountErr("Ungültiger Rabattcode.");
    }
  };

  const discountAmount = discountInfo ? total * discountInfo.pct : 0;
  const finalTotal = total - discountAmount;

  const fo = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => e.currentTarget.style.borderColor = ORANGE;
  const bl = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => e.currentTarget.style.borderColor = BORDER;

  if (loading) return (
    <main style={{ minHeight: "100vh", background: BG, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'DM Sans',system-ui,sans-serif" }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{ textAlign: "center" }}>
        <div style={{ width: 36, height: 36, border: `3px solid ${BORDER}`, borderTopColor: ORANGE, borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 14px" }} />
        <p style={{ color: TEXT3, fontSize: 13 }}>Warenkorb laden...</p>
      </div>
    </main>
  );

  return (
    <main style={{ minHeight: "100vh", background: BG, fontFamily: "'DM Sans','Helvetica Neue',system-ui,sans-serif", color: TEXT, paddingBottom: 60 }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500;600;700&display=swap'); @keyframes spin{to{transform:rotate(360deg)}} *{box-sizing:border-box}`}</style>

      {/* Nav */}
      <nav style={{ background: SURFACE, borderBottom: `1px solid ${BORDER}`, padding: "0 24px", height: 60, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <img src="/flowio-icon.png" alt="Flowio" style={{ width: 30, height: 30, borderRadius: 7, objectFit: "cover" }} />
          <span style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 14, color: TEXT, letterSpacing: "-0.3px" }}>Flowio</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, color: TEXT3, fontSize: 12 }}>
          <span style={{ width: 16, height: 16, background: "#dcfce7", borderRadius: "50%", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 9, color: "#16a34a" }}>✓</span>
          Sichere SSL-Verbindung
        </div>
      </nav>

      {/* Steps */}
      <div style={{ background: SURFACE, borderBottom: `1px solid ${BORDER}`, padding: "12px 24px" }}>
        <div style={{ maxWidth: 640, margin: "0 auto" }}>
          <Breadcrumb steps={[
            { id: "01", name: "Warenkorb",   status: "complete" },
            { id: "02", name: "Kasse",        status: "current" },
            { id: "03", name: "Zahlung",      status: "upcoming" },
            { id: "04", name: "Bestätigung",  status: "upcoming" },
          ]} />
        </div>
      </div>

      <div style={{ maxWidth: 640, margin: "0 auto", padding: "32px 24px" }}>
        <div style={{ marginBottom: 28 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: TEXT3, letterSpacing: "2.5px", textTransform: "uppercase", marginBottom: 8 }}>Kasse</p>
          <h1 style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 26, color: TEXT, letterSpacing: "-0.8px" }}>Bestellung abschließen</h1>
        </div>

        {error && (
          <div style={{ background: "#fef2f2", border: "1.5px solid #fca5a5", borderRadius: 10, padding: "12px 16px", marginBottom: 20 }}>
            <p style={{ color: "#dc2626", fontSize: 13 }}>{error}</p>
          </div>
        )}

        {items.length === 0 ? (
          <div style={{ textAlign: "center", padding: "64px 0" }}>
            <p style={{ fontSize: 48, marginBottom: 16 }}>🛒</p>
            <p style={{ color: TEXT2, fontSize: 15 }}>Dein Warenkorb ist leer.</p>
            <a href="/marketplace" style={{ display: "inline-block", marginTop: 20, color: ORANGE, fontSize: 14, fontWeight: 700, textDecoration: "none" }}>Zum Marktplatz →</a>
          </div>
        ) : (
          <>
            {/* ── Items ── */}
            <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 16, overflow: "hidden", marginBottom: 20 }}>
              <div style={{ padding: "14px 18px", borderBottom: `1px solid ${BORDER}` }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: TEXT3, letterSpacing: "1px", textTransform: "uppercase" }}>{items.length} Artikel</p>
              </div>
              {items.map((item, i) => (
                <div key={item.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 18px", borderBottom: i < items.length - 1 ? `1px solid ${BORDER}` : "none" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ width: 38, height: 38, background: BG, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>🛍️</div>
                    <div>
                      <p style={{ fontSize: 14, fontWeight: 600, color: TEXT, marginBottom: 2 }}>{item.products?.name}</p>
                      <p style={{ fontSize: 12, color: TEXT3 }}>{item.quantity}× à €{item.products?.price?.toFixed(2)}</p>
                    </div>
                  </div>
                  <p style={{ fontSize: 15, fontWeight: 700, color: TEXT }}>€{(item.products?.price * item.quantity).toFixed(2)}</p>
                </div>
              ))}
            </div>

            {/* ── Shipping address ── */}
            <div id="addr-section" style={{ background: SURFACE, border: `1.5px solid ${addrErr ? "#fca5a5" : BORDER}`, borderRadius: 16, padding: "22px", marginBottom: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: `${ORANGE}15`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>📦</div>
                <div>
                  <p style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 14, color: TEXT }}>Lieferadresse</p>
                  <p style={{ fontSize: 12, color: TEXT3, marginTop: 1 }}>Wohin sollen wir liefern?</p>
                </div>
              </div>

              {addrErr && (
                <div style={{ background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 8, padding: "10px 14px", marginBottom: 16 }}>
                  <p style={{ color: "#dc2626", fontSize: 12, fontWeight: 600 }}>{addrErr}</p>
                </div>
              )}

              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {/* Name row */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: TEXT2, marginBottom: 6 }}>Vorname <span style={{ color: ORANGE }}>*</span></label>
                    <input value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="Max" style={iStyle} onFocus={fo} onBlur={bl} />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: TEXT2, marginBottom: 6 }}>Nachname <span style={{ color: ORANGE }}>*</span></label>
                    <input value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Mustermann" style={iStyle} onFocus={fo} onBlur={bl} />
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: TEXT2, marginBottom: 6 }}>E-Mail-Adresse <span style={{ color: ORANGE }}>*</span></label>
                  <input value={email} onChange={e => setEmail(e.target.value)} type="email" placeholder="max@beispiel.de" style={iStyle} onFocus={fo} onBlur={bl} />
                </div>

                {/* Street */}
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: TEXT2, marginBottom: 6 }}>Straße & Hausnummer <span style={{ color: ORANGE }}>*</span></label>
                  <input value={street} onChange={e => setStreet(e.target.value)} placeholder="Musterstraße 42" style={iStyle} onFocus={fo} onBlur={bl} />
                </div>

                {/* PLZ + Stadt */}
                <div style={{ display: "grid", gridTemplateColumns: "130px 1fr", gap: 12 }}>
                  <div>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: TEXT2, marginBottom: 6 }}>PLZ <span style={{ color: ORANGE }}>*</span></label>
                    <input value={postalCode} onChange={e => setPostalCode(e.target.value)} placeholder="60311" style={iStyle} onFocus={fo} onBlur={bl} />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: TEXT2, marginBottom: 6 }}>Stadt <span style={{ color: ORANGE }}>*</span></label>
                    <input value={city} onChange={e => setCity(e.target.value)} placeholder="Frankfurt am Main" style={iStyle} onFocus={fo} onBlur={bl} />
                  </div>
                </div>

                {/* Country */}
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: TEXT2, marginBottom: 6 }}>Land</label>
                  <select value={country} onChange={e => setCountry(e.target.value)} style={{ ...iStyle, cursor: "pointer" }} onFocus={fo} onBlur={bl}>
                    {["Deutschland", "Österreich", "Schweiz", "Andere"].map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                {/* Save checkbox */}
                <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", padding: "10px 14px", background: BG, borderRadius: 10, border: `1px solid ${saveAddr ? ORANGE + "50" : BORDER}`, transition: "border-color 0.2s" }}>
                  <div onClick={() => setSaveAddr(!saveAddr)}
                    style={{ width: 20, height: 20, borderRadius: 6, border: `2px solid ${saveAddr ? ORANGE : BORDER}`, background: saveAddr ? ORANGE : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, cursor: "pointer", transition: "all 0.15s" }}>
                    {saveAddr && <span style={{ color: "#fff", fontSize: 11, fontWeight: 800, lineHeight: 1 }}>✓</span>}
                  </div>
                  <div onClick={() => setSaveAddr(!saveAddr)}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: TEXT }}>Adresse für nächstes Mal speichern</p>
                    <p style={{ fontSize: 11, color: TEXT3, marginTop: 2 }}>Wird lokal auf diesem Gerät gespeichert.</p>
                  </div>
                </label>
              </div>
            </div>

            {/* ── Discount code ── */}
            <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 16, padding: "16px 18px", marginBottom: 16 }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: TEXT3, letterSpacing: "1px", textTransform: "uppercase", marginBottom: 10 }}>Rabattcode</p>
              <div style={{ display: "flex", gap: 8 }}>
                <input value={discountCode} onChange={e => { setDiscountCode(e.target.value); setDiscountInfo(null); setDiscountErr(null); }}
                  placeholder="Code eingeben" style={{ ...iStyle, flex: 1 }} onFocus={fo} onBlur={bl} />
                <button onClick={applyDiscount} style={{ background: ORANGE, color: "#fff", border: "none", borderRadius: 10, padding: "0 18px", fontWeight: 700, fontSize: 13, cursor: "pointer", flexShrink: 0 }}>OK</button>
              </div>
              {discountInfo && <p style={{ fontSize: 12, color: "#16a34a", fontWeight: 600, marginTop: 8 }}>✓ {discountInfo.label} angewendet</p>}
              {discountErr  && <p style={{ fontSize: 12, color: "#dc2626", fontWeight: 600, marginTop: 8 }}>{discountErr}</p>}
            </div>

            {/* ── Summary ── */}
            <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 16, padding: "20px 18px", marginBottom: 16 }}>
              {[
                { label: "Zwischensumme", value: `€${total.toFixed(2)}`, valueColor: TEXT },
                { label: "Lieferung",     value: "Kostenlos",             valueColor: "#16a34a" },
                ...(discountInfo ? [{ label: `Rabatt (${discountInfo.pct * 100}%)`, value: `-€${discountAmount.toFixed(2)}`, valueColor: "#16a34a" }] : []),
              ].map(row => (
                <div key={row.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <span style={{ color: TEXT2, fontSize: 13 }}>{row.label}</span>
                  <span style={{ color: row.valueColor, fontSize: 13, fontWeight: 600 }}>{row.value}</span>
                </div>
              ))}
              <div style={{ borderTop: `1px solid ${BORDER}`, paddingTop: 14, marginTop: 4, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 15, color: TEXT }}>Gesamt</span>
                <span style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 24, color: TEXT, letterSpacing: "-0.5px" }}>€{finalTotal.toFixed(2)}</span>
              </div>
              <p style={{ fontSize: 11, color: TEXT3, marginTop: 8, textAlign: "right" }}>Alle Preise inkl. 19% MwSt.</p>
            </div>

            {/* Trust badges */}
            <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
              {[{ icon: "🔒", l: "SSL-verschlüsselt" }, { icon: "⚡", l: "Sofort-Zahlung" }, { icon: "↩️", l: "14 Tage Rückgabe" }].map(b => (
                <div key={b.l} style={{ flex: 1, display: "flex", alignItems: "center", gap: 6, background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 10, padding: "10px 12px" }}>
                  <span style={{ fontSize: 14 }}>{b.icon}</span>
                  <span style={{ fontSize: 11, color: TEXT2, fontWeight: 500 }}>{b.l}</span>
                </div>
              ))}
            </div>

            {/* CTA */}
            <button onClick={handlePayment} disabled={paying}
              style={{ width: "100%", background: paying ? `rgba(232,82,26,0.55)` : ORANGE, color: "#fff", border: "none", borderRadius: 12, padding: "16px", fontFamily: "'DM Sans',sans-serif", fontWeight: 700, fontSize: 15, cursor: paying ? "not-allowed" : "pointer", transition: "opacity 0.2s", marginBottom: 12, boxShadow: `0 4px 16px rgba(232,82,26,0.25)` }}>
              {paying ? "Weiterleitung zu Stripe..." : `Jetzt kaufen — €${finalTotal.toFixed(2)}`}
            </button>

            <p style={{ textAlign: "center", color: TEXT3, fontSize: 12 }}>Bezahlung sicher über Stripe · SSL-verschlüsselt</p>
          </>
        )}
      </div>
    </main>
  );
}
