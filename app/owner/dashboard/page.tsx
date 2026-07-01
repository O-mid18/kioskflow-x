"use client";

import { useEffect, useState, useCallback } from "react";

const BG = "var(--kf-bg)";
const SURFACE = "var(--kf-surface)";
const BORDER = "var(--kf-border)";
const TEXT = "var(--kf-text)";
const TEXT2 = "var(--kf-text2)";
const TEXT3 = "var(--kf-text3)";
const ORANGE = "#E8521A";

type Tab = "stats" | "users" | "suppliers" | "orders" | "products" | "settings";

const TABS: { key: Tab; label: string; icon: string }[] = [
  { key: "stats",     label: "Übersicht",    icon: "📊" },
  { key: "users",     label: "Nutzer",        icon: "👥" },
  { key: "suppliers", label: "Lieferanten",   icon: "🏭" },
  { key: "orders",    label: "Bestellungen",  icon: "📦" },
  { key: "products",  label: "Produkte",      icon: "🛍️" },
  { key: "settings",  label: "Einstellungen", icon: "🔒" },
];

function TH({ ch }: { ch: string }) {
  return (
    <th style={{ padding: "10px 14px", fontSize: 11, fontWeight: 700, color: TEXT3, textTransform: "uppercase", letterSpacing: "1.5px", textAlign: "left", borderBottom: `1px solid ${BORDER}`, background: BG, whiteSpace: "nowrap" }}>
      {ch}
    </th>
  );
}

function TD({ children, mono }: { children: React.ReactNode; mono?: boolean }) {
  return (
    <td style={{ padding: "10px 14px", fontSize: 13, color: TEXT2, borderBottom: `1px solid ${BORDER}`, fontFamily: mono ? "monospace" : "inherit", whiteSpace: "nowrap" }}>
      {children}
    </td>
  );
}

function Badge({ v, map }: { v: string; map?: Record<string, { bg: string; color: string }> }) {
  const defaults: Record<string, { bg: string; color: string }> = {
    paid:      { bg: "#dcfce7", color: "#16a34a" },
    pending:   { bg: "#fef9c3", color: "#ca8a04" },
    shipped:   { bg: "#dbeafe", color: "#2563eb" },
    delivered: { bg: "#f3e8ff", color: "#9333ea" },
    cancelled: { bg: "#fee2e2", color: "#dc2626" },
    buyer:     { bg: "#dbeafe", color: "#2563eb" },
    supplier:  { bg: "#dcfce7", color: "#16a34a" },
    admin:     { bg: "#fef9c3", color: "#ca8a04" },
  };
  const st = (map ?? defaults)[v] ?? { bg: "#f3f4f6", color: "#6b7280" };
  return (
    <span style={{ background: st.bg, color: st.color, fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 100 }}>{v}</span>
  );
}

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 16, padding: "20px 22px" }}>
      <p style={{ fontSize: 12, fontWeight: 600, color: TEXT3, marginBottom: 8 }}>{label}</p>
      <p style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 28, color: ORANGE }}>{value}</p>
      {sub && <p style={{ fontSize: 11, color: TEXT3, marginTop: 4 }}>{sub}</p>}
    </div>
  );
}

function fmt(d: string) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export default function OwnerDashboard() {
  const [tab, setTab] = useState<Tab>("stats");
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);

  // settings
  const [curPw, setCurPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confPw, setConfPw] = useState("");
  const [pwLoading, setPwLoading] = useState(false);
  const [pwMsg, setPwMsg] = useState<{ text: string; ok: boolean } | null>(null);

  const ownerFetch = useCallback(async (path: string) => {
    const res = await fetch(path);
    if (res.status === 401) { window.location.href = "/owner"; return null; }
    return res.json();
  }, []);

  useEffect(() => {
    (async () => {
      const auth = await ownerFetch("/api/owner");
      if (!auth) return;
      const [s, u, sup, o, p] = await Promise.all([
        ownerFetch("/api/owner?action=stats"),
        ownerFetch("/api/owner?action=users"),
        ownerFetch("/api/owner?action=suppliers"),
        ownerFetch("/api/owner?action=orders"),
        ownerFetch("/api/owner?action=products"),
      ]);
      setStats(s);
      setUsers(u ?? []);
      setSuppliers(sup ?? []);
      setOrders(o ?? []);
      setProducts(p ?? []);
      setLoading(false);
    })();
  }, [ownerFetch]);

  const logout = async () => {
    await fetch("/api/owner", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "logout" }) });
    window.location.href = "/owner";
  };

  const verifySupplier = async (id: number) => {
    await fetch("/api/owner", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "verify_supplier", supplierId: id }) });
    setSuppliers(prev => prev.map(s => s.id === id ? { ...s, verified: true } : s));
  };

  const changeRole = async (userId: string, role: string) => {
    await fetch("/api/owner", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "change_role", userId, role }) });
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, role } : u));
  };

  const changePassword = async () => {
    if (newPw !== confPw) { setPwMsg({ text: "Passwörter stimmen nicht überein", ok: false }); return; }
    if (newPw.length < 6) { setPwMsg({ text: "Mindestens 6 Zeichen erforderlich", ok: false }); return; }
    setPwLoading(true);
    const res = await fetch("/api/owner", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "change_password", currentPassword: curPw, newPassword: newPw }),
    });
    const data = await res.json();
    setPwLoading(false);
    setPwMsg({ text: res.ok ? "Passwort erfolgreich geändert ✓" : data.error, ok: res.ok });
    if (res.ok) { setCurPw(""); setNewPw(""); setConfPw(""); }
  };

  const inp = (extra?: object): React.CSSProperties => ({
    width: "100%", background: BG, border: `1.5px solid ${BORDER}`, borderRadius: 10,
    padding: "11px 14px", color: TEXT, fontSize: 14, fontFamily: "inherit",
    boxSizing: "border-box", transition: "border-color 0.2s, box-shadow 0.2s", ...extra,
  });

  if (loading) return (
    <main style={{ minHeight: "100vh", background: BG, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'DM Sans',system-ui,sans-serif" }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{ textAlign: "center" }}>
        <div style={{ width: 36, height: 36, border: `3px solid ${BORDER}`, borderTopColor: ORANGE, borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 14px" }} />
        <p style={{ color: TEXT3, fontSize: 13 }}>Owner-Panel wird geladen...</p>
      </div>
    </main>
  );

  return (
    <main style={{ minHeight: "100vh", background: BG, fontFamily: "'DM Sans','Helvetica Neue',system-ui,sans-serif", color: TEXT }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500;600;700&display=swap');
        @keyframes spin{to{transform:rotate(360deg)}}
        ::-webkit-scrollbar{width:5px;height:5px}::-webkit-scrollbar-track{background:${BG}}::-webkit-scrollbar-thumb{background:${BORDER};border-radius:99px}
        input:focus{outline:none;border-color:${ORANGE}!important;box-shadow:0 0 0 3px rgba(232,82,26,0.12)!important}
        tr:hover td{background:${BG}}
      `}</style>

      {/* Header */}
      <header style={{ background: SURFACE, borderBottom: `1px solid ${BORDER}`, padding: "0 24px", height: 60, display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 32, height: 32, background: ORANGE, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Syne',sans-serif", fontWeight: 900, fontSize: 15, color: "#fff" }}>K</div>
          <span style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 14, color: TEXT }}>KioskFlow</span>
          <span style={{ fontSize: 10, fontWeight: 700, background: "#fef3c7", color: "#d97706", padding: "2px 8px", borderRadius: 100, letterSpacing: "0.5px" }}>OWNER</span>
        </div>
        <button onClick={logout} style={{ background: "none", border: `1.5px solid ${BORDER}`, borderRadius: 8, padding: "6px 14px", fontSize: 13, color: TEXT2, cursor: "pointer", fontFamily: "inherit", fontWeight: 600 }}>
          Abmelden
        </button>
      </header>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "28px 24px" }}>
        {/* Title */}
        <div style={{ marginBottom: 24 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: TEXT3, letterSpacing: "2.5px", textTransform: "uppercase", marginBottom: 6 }}>Super-Admin</p>
          <h1 style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 26, color: TEXT, letterSpacing: "-0.5px" }}>Owner-Panel</h1>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 4, marginBottom: 28, overflowX: "auto", scrollbarWidth: "none", background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 14, padding: 4 }}>
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              style={{ flexShrink: 0, background: tab === t.key ? ORANGE : "none", color: tab === t.key ? "#fff" : TEXT2, border: "none", borderRadius: 10, padding: "8px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, transition: "background 0.15s", fontFamily: "inherit" }}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* ── Übersicht ── */}
        {tab === "stats" && stats && (
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 14, marginBottom: 28 }}>
              <StatCard label="Nutzer gesamt" value={stats.userCount ?? 0} />
              <StatCard label="Lieferanten" value={stats.supplierCount ?? 0} />
              <StatCard label="Bestellungen" value={stats.orderCount ?? 0} />
              <StatCard label="Produkte" value={stats.productCount ?? 0} />
              <StatCard label="Gesamtumsatz" value={`€${(stats.revenue ?? 0).toFixed(2)}`} sub="aus bezahlten Bestellungen" />
            </div>
            <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 16, padding: "20px 22px" }}>
              <p style={{ fontWeight: 700, color: TEXT, fontSize: 14, marginBottom: 6 }}>🔐 Sicherheitshinweis</p>
              <p style={{ color: TEXT3, fontSize: 13, lineHeight: 1.7 }}>
                Diese Seite ist nur über <code style={{ background: BG, padding: "1px 6px", borderRadius: 4 }}>/owner</code> erreichbar.
                Daten werden direkt aus der Supabase-Datenbank geladen. Kein Cache.
              </p>
            </div>
          </div>
        )}

        {/* ── Nutzer ── */}
        {tab === "users" && (
          <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 16, overflow: "hidden" }}>
            <div style={{ padding: "16px 20px", borderBottom: `1px solid ${BORDER}` }}>
              <p style={{ fontWeight: 700, color: TEXT, fontSize: 14 }}>Alle Nutzer <span style={{ color: TEXT3, fontWeight: 400 }}>({users.length})</span></p>
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead><tr><TH ch="Name" /><TH ch="E-Mail" /><TH ch="Rolle" /><TH ch="Stadt" /><TH ch="Registriert" /><TH ch="Rolle ändern" /></tr></thead>
                <tbody>
                  {users.map((u: any) => (
                    <tr key={u.id}>
                      <TD>{u.full_name || u.company_name || "—"}</TD>
                      <TD>{u.email || "—"}</TD>
                      <TD><Badge v={u.role || "—"} /></TD>
                      <TD>{u.city || "—"}</TD>
                      <TD>{fmt(u.created_at)}</TD>
                      <td style={{ padding: "8px 14px", borderBottom: `1px solid ${BORDER}`, whiteSpace: "nowrap" }}>
                        <div style={{ display: "flex", gap: 6 }}>
                          {u.role !== "admin" && (
                            <button onClick={() => changeRole(u.id, "admin")}
                              style={{ background: "#fef3c7", color: "#d97706", border: "none", borderRadius: 7, padding: "4px 10px", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                              Admin ↑
                            </button>
                          )}
                          {u.role === "admin" && (
                            <button onClick={() => changeRole(u.id, "buyer")}
                              style={{ background: "#fee2e2", color: "#dc2626", border: "none", borderRadius: 7, padding: "4px 10px", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                              Admin ✕
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {users.length === 0 && <p style={{ textAlign: "center", color: TEXT3, fontSize: 13, padding: "32px 0" }}>Keine Nutzer</p>}
            </div>
          </div>
        )}

        {/* ── Lieferanten ── */}
        {tab === "suppliers" && (
          <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 16, overflow: "hidden" }}>
            <div style={{ padding: "16px 20px", borderBottom: `1px solid ${BORDER}` }}>
              <p style={{ fontWeight: 700, color: TEXT, fontSize: 14 }}>Alle Lieferanten <span style={{ color: TEXT3, fontWeight: 400 }}>({suppliers.length})</span></p>
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead><tr><TH ch="Name" /><TH ch="Beschreibung" /><TH ch="Stadt" /><TH ch="Status" /><TH ch="Registriert" /><TH ch="Aktion" /></tr></thead>
                <tbody>
                  {suppliers.map((s: any) => (
                    <tr key={s.id}>
                      <TD>{s.name || "—"}</TD>
                      <TD>{s.description ? s.description.slice(0, 40) + (s.description.length > 40 ? "…" : "") : "—"}</TD>
                      <TD>{s.city || "—"}</TD>
                      <TD>
                        {s.verified
                          ? <span style={{ background: "#dcfce7", color: "#16a34a", fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 100 }}>✓ Verifiziert</span>
                          : <span style={{ background: "#fef9c3", color: "#ca8a04", fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 100 }}>Ausstehend</span>}
                      </TD>
                      <TD>{fmt(s.created_at)}</TD>
                      <td style={{ padding: "10px 14px", borderBottom: `1px solid ${BORDER}` }}>
                        {!s.verified && (
                          <button onClick={() => verifySupplier(s.id)}
                            style={{ background: ORANGE, color: "#fff", border: "none", borderRadius: 7, padding: "5px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                            Verifizieren ✓
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {suppliers.length === 0 && <p style={{ textAlign: "center", color: TEXT3, fontSize: 13, padding: "32px 0" }}>Keine Lieferanten</p>}
            </div>
          </div>
        )}

        {/* ── Bestellungen ── */}
        {tab === "orders" && (
          <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 16, overflow: "hidden" }}>
            <div style={{ padding: "16px 20px", borderBottom: `1px solid ${BORDER}` }}>
              <p style={{ fontWeight: 700, color: TEXT, fontSize: 14 }}>Alle Bestellungen <span style={{ color: TEXT3, fontWeight: 400 }}>({orders.length})</span></p>
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead><tr><TH ch="Bestell-ID" /><TH ch="Käufer" /><TH ch="Betrag" /><TH ch="Status" /><TH ch="Datum" /></tr></thead>
                <tbody>
                  {orders.map((o: any) => (
                    <tr key={o.id}>
                      <TD mono>{o.id?.slice(0, 8)}…</TD>
                      <TD>{(o.profiles as any)?.full_name || o.buyer_id?.slice(0, 8) + "…" || "—"}</TD>
                      <TD>€{(o.total_price ?? 0).toFixed(2)}</TD>
                      <TD><Badge v={o.status || "—"} /></TD>
                      <TD>{fmt(o.created_at)}</TD>
                    </tr>
                  ))}
                </tbody>
              </table>
              {orders.length === 0 && <p style={{ textAlign: "center", color: TEXT3, fontSize: 13, padding: "32px 0" }}>Keine Bestellungen</p>}
            </div>
          </div>
        )}

        {/* ── Produkte ── */}
        {tab === "products" && (
          <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 16, overflow: "hidden" }}>
            <div style={{ padding: "16px 20px", borderBottom: `1px solid ${BORDER}` }}>
              <p style={{ fontWeight: 700, color: TEXT, fontSize: 14 }}>Alle Produkte <span style={{ color: TEXT3, fontWeight: 400 }}>({products.length})</span></p>
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead><tr><TH ch="Name" /><TH ch="Lieferant" /><TH ch="Preis" /><TH ch="Lager" /><TH ch="Kategorie" /><TH ch="Hinzugefügt" /></tr></thead>
                <tbody>
                  {products.map((p: any) => (
                    <tr key={p.id}>
                      <TD>{p.name || "—"}</TD>
                      <TD>{(p.suppliers as any)?.name || "—"}</TD>
                      <TD>€{(p.price ?? 0).toFixed(2)}</TD>
                      <td style={{ padding: "10px 14px", fontSize: 13, borderBottom: `1px solid ${BORDER}`, fontWeight: (p.stock ?? 0) === 0 ? 700 : 400, color: (p.stock ?? 0) === 0 ? "#dc2626" : TEXT2, whiteSpace: "nowrap" }}>
                        {p.stock ?? 0}
                      </td>
                      <TD>{p.category || "—"}</TD>
                      <TD>{fmt(p.created_at)}</TD>
                    </tr>
                  ))}
                </tbody>
              </table>
              {products.length === 0 && <p style={{ textAlign: "center", color: TEXT3, fontSize: 13, padding: "32px 0" }}>Keine Produkte</p>}
            </div>
          </div>
        )}

        {/* ── Einstellungen ── */}
        {tab === "settings" && (
          <div style={{ maxWidth: 480 }}>
            <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 16, padding: "28px" }}>
              <h2 style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 16, color: TEXT, marginBottom: 22 }}>🔒 Passwort ändern</h2>

              {pwMsg && (
                <div style={{ background: pwMsg.ok ? "#dcfce7" : "#fef2f2", border: `1.5px solid ${pwMsg.ok ? "#86efac" : "#fca5a5"}`, borderRadius: 10, padding: "10px 14px", marginBottom: 20 }}>
                  <p style={{ color: pwMsg.ok ? "#16a34a" : "#dc2626", fontSize: 13 }}>{pwMsg.text}</p>
                </div>
              )}

              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {[
                  { label: "Aktuelles Passwort", val: curPw, set: setCurPw },
                  { label: "Neues Passwort", val: newPw, set: setNewPw },
                  { label: "Neues Passwort bestätigen", val: confPw, set: setConfPw },
                ].map(({ label, val, set }) => (
                  <div key={label}>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: TEXT2, marginBottom: 7 }}>{label}</label>
                    <input type="password" value={val} onChange={e => set(e.target.value)} style={inp()} />
                  </div>
                ))}

                <button onClick={changePassword} disabled={pwLoading || !curPw || !newPw || !confPw}
                  style={{ background: pwLoading || !curPw || !newPw || !confPw ? "rgba(232,82,26,0.45)" : ORANGE, color: "#fff", border: "none", borderRadius: 10, padding: "12px", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", marginTop: 4, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                  {pwLoading && <div style={{ width: 14, height: 14, border: "2px solid rgba(255,255,255,0.4)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />}
                  Passwort speichern
                </button>
              </div>

              <div style={{ marginTop: 24, paddingTop: 20, borderTop: `1px solid ${BORDER}` }}>
                <p style={{ fontSize: 12, color: TEXT3, lineHeight: 1.8 }}>
                  <strong style={{ color: TEXT2 }}>Hinweis:</strong> Für "Passwort ändern" muss die Tabelle <code style={{ background: BG, padding: "1px 5px", borderRadius: 4 }}>owner_config</code> in Supabase existieren. Falls nicht, führe dieses SQL aus:
                </p>
                <pre style={{ background: BG, border: `1px solid ${BORDER}`, borderRadius: 10, padding: "12px 14px", fontSize: 11, color: TEXT2, marginTop: 10, overflowX: "auto", lineHeight: 1.6 }}>
{`CREATE TABLE IF NOT EXISTS owner_config (
  key text primary key,
  value text not null,
  updated_at timestamptz default now()
);
ALTER TABLE owner_config ENABLE ROW LEVEL SECURITY;`}
                </pre>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
