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

const ORDER_STATUSES = ["pending", "paid", "shipped", "delivered", "cancelled"];

// ── Small UI helpers ───────────────────────────────────────────────────────────
function TH({ ch }: { ch: string }) {
  return <th style={{ padding: "10px 14px", fontSize: 11, fontWeight: 700, color: TEXT3, textTransform: "uppercase" as const, letterSpacing: "1.5px", textAlign: "left", borderBottom: `1px solid ${BORDER}`, background: BG, whiteSpace: "nowrap" }}>{ch}</th>;
}
function TD({ children, mono }: { children: React.ReactNode; mono?: boolean }) {
  return <td style={{ padding: "10px 14px", fontSize: 13, color: TEXT2, borderBottom: `1px solid ${BORDER}`, fontFamily: mono ? "monospace" : "inherit", whiteSpace: "nowrap" }}>{children}</td>;
}
function Pill({ v }: { v: string }) {
  const map: Record<string, { bg: string; fg: string }> = {
    paid: { bg: "#dcfce7", fg: "#16a34a" }, pending: { bg: "#fef9c3", fg: "#ca8a04" },
    shipped: { bg: "#dbeafe", fg: "#2563eb" }, delivered: { bg: "#f3e8ff", fg: "#9333ea" },
    cancelled: { bg: "#fee2e2", fg: "#dc2626" },
    buyer: { bg: "#dbeafe", fg: "#2563eb" }, supplier: { bg: "#dcfce7", fg: "#16a34a" },
    admin: { bg: "#fef9c3", fg: "#ca8a04" },
  };
  const s = map[v] ?? { bg: "#f3f4f6", fg: "#6b7280" };
  return <span style={{ background: s.bg, color: s.fg, fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 100 }}>{v}</span>;
}
function Btn({ label, fg, bg, onClick }: { label: string; fg: string; bg: string; onClick: () => void }) {
  return <button onClick={onClick} style={{ background: bg, color: fg, border: "none", borderRadius: 6, padding: "4px 9px", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", marginRight: 4, whiteSpace: "nowrap" }}>{label}</button>;
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

function RevenueChart({ data }: { data: Record<string, number> }) {
  const entries = Object.entries(data).sort(([a], [b]) => a.localeCompare(b)).slice(-8);
  if (!entries.length) return <p style={{ color: TEXT3, fontSize: 13, textAlign: "center", padding: "40px 0" }}>Noch keine Einnahmen</p>;
  const max = Math.max(...entries.map(([, v]) => v), 1);
  const W = 600, H = 170, PL = 52, PR = 16, PT = 24, PB = 36;
  const cW = W - PL - PR, cH = H - PT - PB;
  const bW = cW / entries.length - 8;
  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet" style={{ display: "block" }}>
      {[0, 0.25, 0.5, 0.75, 1].map(p => {
        const y = PT + cH * (1 - p);
        return <g key={p}>
          <line x1={PL} y1={y} x2={W - PR} y2={y} stroke={BORDER} strokeWidth={1} />
          <text x={PL - 6} y={y + 4} textAnchor="end" fontSize={9} fill={TEXT3}>€{(max * p).toFixed(0)}</text>
        </g>;
      })}
      {entries.map(([month, val], i) => {
        const x = PL + i * (cW / entries.length) + 4;
        const bH = (val / max) * cH;
        const y = PT + cH - bH;
        return <g key={month}>
          <rect x={x} y={y} width={bW} height={bH} fill={ORANGE} rx={4} opacity={0.85} />
          <text x={x + bW / 2} y={H - PB + 14} textAnchor="middle" fontSize={9} fill={TEXT3}>{month.slice(5)}/{month.slice(2, 4)}</text>
          {val > 0 && <text x={x + bW / 2} y={y - 4} textAnchor="middle" fontSize={9} fill={ORANGE} fontWeight={700}>€{val.toFixed(0)}</text>}
        </g>;
      })}
    </svg>
  );
}

function exportCSV(data: any[], filename: string) {
  if (!data.length) return;
  const flat = data.map(row => {
    const r: any = {};
    Object.entries(row).forEach(([k, v]) => { r[k] = typeof v === "object" && v !== null ? JSON.stringify(v) : v; });
    return r;
  });
  const keys = Object.keys(flat[0]);
  const csv = [keys.join(","), ...flat.map(r => keys.map(k => `"${String(r[k] ?? "").replace(/"/g, '""')}"`).join(","))].join("\n");
  const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(new Blob([csv], { type: "text/csv" })), download: filename });
  a.click(); URL.revokeObjectURL(a.href);
}

function fmt(d: string) {
  return d ? new Date(d).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" }) : "—";
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function OwnerDashboard() {
  const [tab, setTab] = useState<Tab>("stats");
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [revenue, setRevenue] = useState<Record<string, number>>({});
  const [users, setUsers] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [toast, setToast] = useState<string | null>(null);

  // Edit product modal
  const [editProd, setEditProd] = useState<any | null>(null);
  const [editPrice, setEditPrice] = useState("");
  const [editStock, setEditStock] = useState("");
  const [editLoading, setEditLoading] = useState(false);

  // Password
  const [curPw, setCurPw] = useState(""); const [newPw, setNewPw] = useState(""); const [confPw, setConfPw] = useState("");
  const [pwLoading, setPwLoading] = useState(false); const [pwMsg, setPwMsg] = useState<{ text: string; ok: boolean } | null>(null);

  // Broadcast
  const [bTitle, setBTitle] = useState(""); const [bMsg, setBMsg] = useState("");
  const [bLoading, setBLoading] = useState(false); const [bResult, setBResult] = useState<{ text: string; ok: boolean } | null>(null);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 2500); };

  const ownerFetch = useCallback(async (path: string) => {
    const res = await fetch(path);
    if (res.status === 401) { window.location.href = "/owner"; return null; }
    return res.json();
  }, []);

  const ownerPost = useCallback(async (body: object) => {
    const res = await fetch("/api/owner", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (res.status === 401) { window.location.href = "/owner"; return null; }
    return res.json();
  }, []);

  useEffect(() => {
    (async () => {
      if (!(await ownerFetch("/api/owner"))) return;
      const [s, rev, u, sup, o, p] = await Promise.all([
        ownerFetch("/api/owner?action=stats"),
        ownerFetch("/api/owner?action=revenue"),
        ownerFetch("/api/owner?action=users"),
        ownerFetch("/api/owner?action=suppliers"),
        ownerFetch("/api/owner?action=orders"),
        ownerFetch("/api/owner?action=products"),
      ]);
      setStats(s); setRevenue(rev ?? {}); setUsers(u ?? []); setSuppliers(sup ?? []); setOrders(o ?? []); setProducts(p ?? []);
      setLoading(false);
    })();
  }, [ownerFetch]);

  // ── Actions ────────────────────────────────────────────────────────────────
  const logout = async () => { await ownerPost({ action: "logout" }); window.location.href = "/owner"; };

  const changeRole = async (id: string, role: string) => {
    await ownerPost({ action: "change_role", userId: id, role });
    setUsers(prev => prev.map(u => u.id === id ? { ...u, role } : u));
    showToast(`Rolle → "${role}"`);
  };
  const blockUser = async (id: string, block: boolean) => {
    await ownerPost({ action: block ? "block_user" : "unblock_user", userId: id });
    setUsers(prev => prev.map(u => u.id === id ? { ...u, banned: block } : u));
    showToast(block ? "Nutzer gesperrt" : "Nutzer entsperrt");
  };
  const deleteUser = async (id: string, email: string) => {
    if (!confirm(`"${email}" löschen? Nicht rückgängig machbar.`)) return;
    const res = await ownerPost({ action: "delete_user", userId: id });
    if (res?.error) { showToast("Fehler: " + res.error); return; }
    setUsers(prev => prev.filter(u => u.id !== id));
    showToast("Nutzer gelöscht ✓");
  };

  const toggleVerify = async (id: number, verified: boolean) => {
    await ownerPost({ action: verified ? "unverify_supplier" : "verify_supplier", supplierId: id });
    setSuppliers(prev => prev.map(s => s.id === id ? { ...s, verified: !verified } : s));
    showToast(verified ? "Verifizierung aufgehoben" : "Lieferant verifiziert");
  };
  const deleteSupplier = async (id: number, name: string) => {
    if (!confirm(`Lieferant "${name}" löschen? Alle Produkte → Lager 0.`)) return;
    await ownerPost({ action: "delete_supplier", supplierId: id });
    setSuppliers(prev => prev.filter(s => s.id !== id));
    showToast("Lieferant gelöscht");
  };

  const updateOrderStatus = async (id: string, status: string) => {
    await ownerPost({ action: "update_order_status", orderId: id, status });
    setOrders(prev => prev.map(o => o.id === id ? { ...o, status } : o));
    showToast(`Status → "${status}"`);
  };

  const openEdit = (p: any) => { setEditProd(p); setEditPrice(String(p.price)); setEditStock(String(p.stock)); };
  const saveProduct = async () => {
    if (!editProd) return;
    setEditLoading(true);
    await ownerPost({ action: "update_product", productId: editProd.id, price: Number(editPrice), stock: Number(editStock) });
    setProducts(prev => prev.map(p => p.id === editProd.id ? { ...p, price: Number(editPrice), stock: Number(editStock) } : p));
    setEditProd(null); setEditLoading(false); showToast("Produkt aktualisiert");
  };
  const deleteProduct = async (id: string, name: string) => {
    if (!confirm(`Produkt "${name}" löschen?`)) return;
    await ownerPost({ action: "delete_product", productId: id });
    setProducts(prev => prev.filter(p => p.id !== id));
    showToast("Produkt gelöscht");
  };

  const changePassword = async () => {
    if (newPw !== confPw) { setPwMsg({ text: "Passwörter stimmen nicht überein", ok: false }); return; }
    if (newPw.length < 6) { setPwMsg({ text: "Mindestens 6 Zeichen", ok: false }); return; }
    setPwLoading(true);
    const res = await fetch("/api/owner", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "change_password", currentPassword: curPw, newPassword: newPw }) });
    const data = await res.json();
    setPwLoading(false);
    setPwMsg({ text: res.ok ? "Passwort erfolgreich geändert ✓" : data.error, ok: res.ok });
    if (res.ok) { setCurPw(""); setNewPw(""); setConfPw(""); }
  };

  const broadcast = async () => {
    if (!bTitle || !bMsg) { setBResult({ text: "Titel und Nachricht erforderlich", ok: false }); return; }
    setBLoading(true);
    const res = await fetch("/api/owner", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "broadcast_notification", title: bTitle, message: bMsg }) });
    const data = await res.json();
    setBLoading(false);
    setBResult({ text: res.ok ? `✓ An ${data.sent} Nutzer gesendet` : data.error, ok: res.ok });
    if (res.ok) { setBTitle(""); setBMsg(""); }
  };

  const inp = (extra?: object): React.CSSProperties => ({
    width: "100%", background: BG, border: `1.5px solid ${BORDER}`, borderRadius: 10,
    padding: "11px 14px", color: TEXT, fontSize: 14, fontFamily: "inherit",
    boxSizing: "border-box", transition: "border-color 0.2s, box-shadow 0.2s", ...extra,
  });

  const csvBtn = (data: any[], filename: string) => (
    <button onClick={() => exportCSV(data, filename)} style={{ background: "none", border: `1.5px solid ${BORDER}`, borderRadius: 8, padding: "5px 12px", fontSize: 12, color: TEXT2, cursor: "pointer", fontFamily: "inherit", fontWeight: 600 }}>📥 CSV</button>
  );

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
        input:focus,textarea:focus,select:focus{outline:none;border-color:${ORANGE}!important;box-shadow:0 0 0 3px rgba(232,82,26,0.12)!important}
        tr:hover td{background:${BG}}
      `}</style>

      {/* Toast */}
      {toast && (
        <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 999, background: "#18181b", color: "#fff", fontSize: 13, padding: "12px 20px", borderRadius: 12, fontFamily: "inherit", boxShadow: "0 4px 24px rgba(0,0,0,0.3)", display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ color: "#4ade80", fontWeight: 700 }}>✓</span> {toast}
        </div>
      )}

      {/* Edit Product Modal */}
      {editProd && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 18, padding: 28, width: 320, boxShadow: "0 8px 40px rgba(0,0,0,0.4)" }}>
            <h3 style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 16, color: TEXT, marginBottom: 6 }}>Produkt bearbeiten</h3>
            <p style={{ fontSize: 13, color: TEXT3, marginBottom: 20 }}>{editProd.name}</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 20 }}>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: TEXT2, marginBottom: 6 }}>Preis (€)</label>
                <input type="number" min="0" step="0.01" value={editPrice} onChange={e => setEditPrice(e.target.value)} style={inp()} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: TEXT2, marginBottom: 6 }}>Lagerbestand</label>
                <input type="number" min="0" value={editStock} onChange={e => setEditStock(e.target.value)} style={inp()} />
              </div>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setEditProd(null)} style={{ flex: 1, background: "none", border: `1.5px solid ${BORDER}`, borderRadius: 9, padding: "10px", fontSize: 13, color: TEXT2, cursor: "pointer", fontFamily: "inherit", fontWeight: 600 }}>Abbrechen</button>
              <button onClick={saveProduct} disabled={editLoading}
                style={{ flex: 1, background: ORANGE, color: "#fff", border: "none", borderRadius: 9, padding: "10px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                {editLoading && <div style={{ width: 12, height: 12, border: "2px solid rgba(255,255,255,0.4)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />}
                Speichern
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header style={{ background: SURFACE, borderBottom: `1px solid ${BORDER}`, padding: "0 24px", height: 60, display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 32, height: 32, background: ORANGE, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Syne',sans-serif", fontWeight: 900, fontSize: 15, color: "#fff" }}>V</div>
          <span style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 14, color: TEXT }}>Vendoro</span>
          <span style={{ fontSize: 10, fontWeight: 700, background: "#fef3c7", color: "#d97706", padding: "2px 8px", borderRadius: 100 }}>OWNER</span>
        </div>
        <button onClick={logout} style={{ background: "none", border: `1.5px solid ${BORDER}`, borderRadius: 8, padding: "6px 14px", fontSize: 13, color: TEXT2, cursor: "pointer", fontFamily: "inherit", fontWeight: 600 }}>Abmelden</button>
      </header>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "28px 24px" }}>
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
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 14 }}>
              <StatCard label="Nutzer gesamt" value={stats.userCount ?? 0} />
              <StatCard label="Lieferanten" value={stats.supplierCount ?? 0} />
              <StatCard label="Bestellungen" value={stats.orderCount ?? 0} />
              <StatCard label="Produkte" value={stats.productCount ?? 0} />
              <StatCard label="Gesamtumsatz" value={`€${(stats.revenue ?? 0).toFixed(2)}`} sub="bezahlte Bestellungen" />
            </div>
            <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 16, padding: "22px 24px" }}>
              <p style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 14, color: TEXT, marginBottom: 20 }}>📈 Monatliche Einnahmen</p>
              <RevenueChart data={revenue} />
            </div>
          </div>
        )}

        {/* ── Nutzer ── */}
        {tab === "users" && (
          <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 16, overflow: "hidden" }}>
            <div style={{ padding: "16px 20px", borderBottom: `1px solid ${BORDER}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <p style={{ fontWeight: 700, color: TEXT, fontSize: 14 }}>Alle Nutzer <span style={{ color: TEXT3, fontWeight: 400 }}>({users.length})</span></p>
              {csvBtn(users, "nutzer.csv")}
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead><tr><TH ch="Name" /><TH ch="E-Mail" /><TH ch="Rolle" /><TH ch="Status" /><TH ch="Seit" /><TH ch="Aktionen" /></tr></thead>
                <tbody>
                  {users.map((u: any) => (
                    <tr key={u.id}>
                      <TD>{u.full_name || u.company_name || "—"}</TD>
                      <TD>{u.email || "—"}</TD>
                      <TD><Pill v={u.role || "—"} /></TD>
                      <TD>{u.banned ? <span style={{ color: "#dc2626", fontSize: 11, fontWeight: 700 }}>🔒 Gesperrt</span> : <span style={{ color: "#16a34a", fontSize: 11 }}>✓ Aktiv</span>}</TD>
                      <TD>{fmt(u.created_at)}</TD>
                      <td style={{ padding: "8px 14px", borderBottom: `1px solid ${BORDER}`, whiteSpace: "nowrap" }}>
                        {u.role !== "admin"
                          ? <Btn label="Admin ↑" fg="#d97706" bg="#fef3c7" onClick={() => changeRole(u.id, "admin")} />
                          : <Btn label="Admin ✕" fg="#dc2626" bg="#fee2e2" onClick={() => changeRole(u.id, "buyer")} />}
                        {u.banned
                          ? <Btn label="Entsperren" fg="#16a34a" bg="#dcfce7" onClick={() => blockUser(u.id, false)} />
                          : <Btn label="Sperren" fg="#ea580c" bg="#fff7ed" onClick={() => blockUser(u.id, true)} />}
                        <Btn label="Löschen" fg="#dc2626" bg="#fee2e2" onClick={() => deleteUser(u.id, u.email || u.id)} />
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
            <div style={{ padding: "16px 20px", borderBottom: `1px solid ${BORDER}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <p style={{ fontWeight: 700, color: TEXT, fontSize: 14 }}>Alle Lieferanten <span style={{ color: TEXT3, fontWeight: 400 }}>({suppliers.length})</span></p>
              {csvBtn(suppliers, "lieferanten.csv")}
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead><tr><TH ch="Name" /><TH ch="Stadt" /><TH ch="Status" /><TH ch="Registriert" /><TH ch="Aktionen" /></tr></thead>
                <tbody>
                  {suppliers.map((s: any) => (
                    <tr key={s.id}>
                      <TD>{s.name || "—"}</TD>
                      <TD>{s.city || "—"}</TD>
                      <TD>{s.verified
                        ? <span style={{ background: "#dcfce7", color: "#16a34a", fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 100 }}>✓ Verifiziert</span>
                        : <span style={{ background: "#fef9c3", color: "#ca8a04", fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 100 }}>Ausstehend</span>}
                      </TD>
                      <TD>{fmt(s.created_at)}</TD>
                      <td style={{ padding: "8px 14px", borderBottom: `1px solid ${BORDER}`, whiteSpace: "nowrap" }}>
                        <Btn label={s.verified ? "Verif. ✕" : "Verifizieren ✓"} fg={s.verified ? "#dc2626" : "#16a34a"} bg={s.verified ? "#fee2e2" : "#dcfce7"} onClick={() => toggleVerify(s.id, s.verified)} />
                        <Btn label="Löschen" fg="#dc2626" bg="#fee2e2" onClick={() => deleteSupplier(s.id, s.name)} />
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
            <div style={{ padding: "16px 20px", borderBottom: `1px solid ${BORDER}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <p style={{ fontWeight: 700, color: TEXT, fontSize: 14 }}>Alle Bestellungen <span style={{ color: TEXT3, fontWeight: 400 }}>({orders.length})</span></p>
              {csvBtn(orders, "bestellungen.csv")}
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead><tr><TH ch="ID" /><TH ch="Käufer" /><TH ch="Betrag" /><TH ch="Status" /><TH ch="Datum" /><TH ch="Status ändern" /></tr></thead>
                <tbody>
                  {orders.map((o: any) => (
                    <tr key={o.id}>
                      <TD mono>{o.id?.slice(0, 8)}…</TD>
                      <TD>{(o.profiles as any)?.full_name || o.buyer_id?.slice(0, 8) + "…" || "—"}</TD>
                      <TD>€{(o.total_price ?? 0).toFixed(2)}</TD>
                      <TD><Pill v={o.status || "—"} /></TD>
                      <TD>{fmt(o.created_at)}</TD>
                      <td style={{ padding: "8px 14px", borderBottom: `1px solid ${BORDER}` }}>
                        <select value={o.status} onChange={e => updateOrderStatus(o.id, e.target.value)}
                          style={{ background: BG, border: `1px solid ${BORDER}`, borderRadius: 7, padding: "5px 8px", fontSize: 12, color: TEXT, cursor: "pointer", fontFamily: "inherit" }}>
                          {ORDER_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </td>
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
            <div style={{ padding: "16px 20px", borderBottom: `1px solid ${BORDER}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <p style={{ fontWeight: 700, color: TEXT, fontSize: 14 }}>Alle Produkte <span style={{ color: TEXT3, fontWeight: 400 }}>({products.length})</span></p>
              {csvBtn(products, "produkte.csv")}
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead><tr><TH ch="Name" /><TH ch="Lieferant" /><TH ch="Preis" /><TH ch="Lager" /><TH ch="Kategorie" /><TH ch="Aktionen" /></tr></thead>
                <tbody>
                  {products.map((p: any) => (
                    <tr key={p.id}>
                      <TD>{p.name || "—"}</TD>
                      <TD>{(p.suppliers as any)?.name || "—"}</TD>
                      <TD>€{(p.price ?? 0).toFixed(2)}</TD>
                      <td style={{ padding: "10px 14px", fontSize: 13, borderBottom: `1px solid ${BORDER}`, fontWeight: (p.stock ?? 0) === 0 ? 700 : 400, color: (p.stock ?? 0) === 0 ? "#dc2626" : TEXT2, whiteSpace: "nowrap" }}>{p.stock ?? 0}</td>
                      <TD>{p.category || "—"}</TD>
                      <td style={{ padding: "8px 14px", borderBottom: `1px solid ${BORDER}`, whiteSpace: "nowrap" }}>
                        <Btn label="✏️ Bearbeiten" fg="#2563eb" bg="#dbeafe" onClick={() => openEdit(p)} />
                        <Btn label="Löschen" fg="#dc2626" bg="#fee2e2" onClick={() => deleteProduct(p.id, p.name)} />
                      </td>
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
          <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 520 }}>
            {/* Broadcast */}
            <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 16, padding: 28 }}>
              <h2 style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 16, color: TEXT, marginBottom: 20 }}>📣 Benachrichtigung an alle senden</h2>
              {bResult && <div style={{ background: bResult.ok ? "#dcfce7" : "#fef2f2", border: `1.5px solid ${bResult.ok ? "#86efac" : "#fca5a5"}`, borderRadius: 10, padding: "10px 14px", marginBottom: 16 }}><p style={{ color: bResult.ok ? "#16a34a" : "#dc2626", fontSize: 13 }}>{bResult.text}</p></div>}
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: TEXT2, marginBottom: 6 }}>Titel</label>
                  <input value={bTitle} onChange={e => setBTitle(e.target.value)} placeholder="z.B. Neue Produkte verfügbar!" style={inp()} />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: TEXT2, marginBottom: 6 }}>Nachricht</label>
                  <textarea value={bMsg} onChange={e => setBMsg(e.target.value)} rows={3} placeholder="Nachricht an alle Nutzer..." style={{ ...inp(), resize: "none" } as any} />
                </div>
                <button onClick={broadcast} disabled={bLoading || !bTitle || !bMsg}
                  style={{ background: bLoading || !bTitle || !bMsg ? "rgba(232,82,26,0.45)" : ORANGE, color: "#fff", border: "none", borderRadius: 10, padding: "12px", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                  {bLoading && <div style={{ width: 14, height: 14, border: "2px solid rgba(255,255,255,0.4)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />}
                  An alle {users.length} Nutzer senden
                </button>
              </div>
            </div>

            {/* Password */}
            <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 16, padding: 28 }}>
              <h2 style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 16, color: TEXT, marginBottom: 20 }}>🔒 Passwort ändern</h2>
              {pwMsg && <div style={{ background: pwMsg.ok ? "#dcfce7" : "#fef2f2", border: `1.5px solid ${pwMsg.ok ? "#86efac" : "#fca5a5"}`, borderRadius: 10, padding: "10px 14px", marginBottom: 18 }}><p style={{ color: pwMsg.ok ? "#16a34a" : "#dc2626", fontSize: 13 }}>{pwMsg.text}</p></div>}
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {[{ label: "Aktuelles Passwort", val: curPw, set: setCurPw }, { label: "Neues Passwort", val: newPw, set: setNewPw }, { label: "Bestätigen", val: confPw, set: setConfPw }].map(({ label, val, set }) => (
                  <div key={label}>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: TEXT2, marginBottom: 7 }}>{label}</label>
                    <input type="password" value={val} onChange={e => set(e.target.value)} style={inp()} />
                  </div>
                ))}
                <button onClick={changePassword} disabled={pwLoading || !curPw || !newPw || !confPw}
                  style={{ background: pwLoading || !curPw || !newPw || !confPw ? "rgba(232,82,26,0.45)" : ORANGE, color: "#fff", border: "none", borderRadius: 10, padding: "12px", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                  {pwLoading && <div style={{ width: 14, height: 14, border: "2px solid rgba(255,255,255,0.4)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />}
                  Passwort speichern
                </button>
              </div>
              <div style={{ marginTop: 22, paddingTop: 18, borderTop: `1px solid ${BORDER}` }}>
                <p style={{ fontSize: 12, color: TEXT3, marginBottom: 8 }}><strong style={{ color: TEXT2 }}>SQL (einmalig für Passwort-Speicherung):</strong></p>
                <pre style={{ background: BG, border: `1px solid ${BORDER}`, borderRadius: 10, padding: "12px 14px", fontSize: 11, color: TEXT2, overflowX: "auto", lineHeight: 1.6 }}>
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
