"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { NotificationBell } from "@/components/ui/notification-bell";

const BG = "var(--kf-bg)";
const SURFACE = "var(--kf-surface)";
const BORDER = "var(--kf-border)";
const TEXT = "var(--kf-text)";
const TEXT2 = "var(--kf-text2)";
const TEXT3 = "var(--kf-text3)";
const ORANGE = "#2563EB";

const NAV = [
  { label: "Übersicht",      href: "/supplier/dashboard",                icon: "◉" },
  { label: "Produkte",       href: "/supplier/dashboard/products",       icon: "📦" },
  { label: "Bestellungen",   href: "/supplier/dashboard/orders",         icon: "🧾" },
  { label: "Analytik",       href: "/supplier/dashboard/analytics",      icon: "📊" },
  { label: "Nachrichten",    href: "/supplier/dashboard/messages",       icon: "💬" },
  { label: "Verifizierung",  href: "/supplier/dashboard/verification",   icon: "🔐" },
  { label: "Support",        href: "/support",                           icon: "🎧" },
  { label: "Profil",         href: "/supplier/dashboard/profile",        icon: "👤" },
];

// Pages accessible even while pending approval
const ALLOWED_WHILE_PENDING = ["/supplier/dashboard/verification", "/supplier/dashboard/profile", "/support"];

export default function SupplierDashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [supplierName, setSupplierName] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [verified, setVerified] = useState<boolean | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { window.location.href = "/login"; return; }
      const { data: supplierRow } = await supabase
        .from("suppliers").select("name, verified").eq("user_id", user.id).maybeSingle();
      setSupplierName(supplierRow?.name ?? user.email ?? "Lieferant");
      setVerified(supplierRow?.verified ?? false);
    });
  }, []);

  const initials = supplierName
    ? supplierName.split(" ").map(w => w[0]).slice(0,2).join("").toUpperCase()
    : "S";

  const isPendingBlocked = verified === false && !ALLOWED_WHILE_PENDING.some(p => pathname.startsWith(p));

  if (isPendingBlocked) {
    return (
      <div style={{ minHeight: "100vh", background: BG, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'DM Sans','Helvetica Neue',system-ui,sans-serif", padding: 24 }}>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500;600;700&display=swap');`}</style>
        <div style={{ maxWidth: 480, width: "100%", textAlign: "center" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>⏳</div>
          <h1 style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 24, color: TEXT, letterSpacing: "-0.5px", marginBottom: 10 }}>
            Konto wird geprüft
          </h1>
          <p style={{ color: TEXT2, fontSize: 15, lineHeight: 1.7, marginBottom: 28 }}>
            Dein Lieferantenkonto wartet auf die Freigabe durch unser Team. Sobald wir deine Daten geprüft haben, erhältst du Zugang zum Dashboard.
          </p>
          <div style={{ background: "var(--kf-surface)", border: `1px solid var(--kf-border)`, borderRadius: 14, padding: "20px 24px", marginBottom: 24, textAlign: "left" }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: TEXT, marginBottom: 12 }}>Was passiert als nächstes?</p>
            {["Wir prüfen deine Unternehmensangaben.", "Du erhältst eine Benachrichtigung nach der Freigabe.", "Danach kannst du Produkte listen und Bestellungen erhalten."].map((s, i) => (
              <div key={i} style={{ display: "flex", gap: 10, marginBottom: 8 }}>
                <span style={{ color: ORANGE, fontWeight: 700, flexShrink: 0 }}>{i + 1}.</span>
                <p style={{ color: TEXT2, fontSize: 13 }}>{s}</p>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
            <a href="/supplier/dashboard/verification" style={{ background: ORANGE, color: "#fff", borderRadius: 10, padding: "11px 20px", fontWeight: 700, fontSize: 14, textDecoration: "none" }}>
              Verifizierungsstatus →
            </a>
            <button onClick={async () => { await supabase.auth.signOut(); window.location.href = "/login"; }}
              style={{ background: "none", border: `1.5px solid var(--kf-border)`, borderRadius: 10, padding: "11px 20px", fontWeight: 600, fontSize: 14, cursor: "pointer", color: TEXT2 }}>
              Abmelden
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: BG, fontFamily: "'DM Sans','Helvetica Neue',system-ui,sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; }
        a { text-decoration: none; }
        .kf-supplier-sidebar { position: sticky; top: 0; height: 100vh; }
        .kf-mobile-topbar { display: none; }
        @media (max-width: 768px) {
          .kf-supplier-sidebar {
            position: fixed; top: 0; left: 0; height: 100vh;
            transform: translateX(-100%);
            transition: transform 0.2s ease;
          }
          .kf-supplier-sidebar.open { transform: translateX(0); }
          .kf-mobile-topbar { display: flex; }
        }
      `}</style>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div onClick={() => setSidebarOpen(false)} style={{ position:"fixed", inset:0, background:"rgba(26,23,20,0.4)", zIndex:40 }} className="md-overlay" />
      )}

      {/* ── SIDEBAR ── */}
      <aside className={`kf-supplier-sidebar${sidebarOpen ? " open" : ""}`} style={{
        width: 240, flexShrink: 0, background: SURFACE, borderRight: `1px solid ${BORDER}`,
        display: "flex", flexDirection: "column", overflow: "hidden",
        zIndex: 50,
      }}>
        {/* Logo */}
        <div style={{ padding: "24px 20px 20px", borderBottom: `1px solid ${BORDER}` }}>
          <a href="/marketplace" style={{ display:"flex", alignItems:"center", gap:10 }}>
            <img src="/flowio-icon.png" alt="Flowio" style={{ width: 34, height: 34, borderRadius: 9, objectFit: "cover" }} />
            <div>
              <p style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:15, color:TEXT, letterSpacing:"-0.3px", lineHeight:1 }}>Flowio</p>
              <p style={{ fontSize:10, color:TEXT3, marginTop:2 }}>Lieferant-Portal</p>
            </div>
          </a>
        </div>

        {/* Nav */}
        <nav style={{ flex:1, padding:"14px 12px", overflowY:"auto" }}>
          <p style={{ fontSize:10, fontWeight:700, color:TEXT3, letterSpacing:"1.5px", textTransform:"uppercase", marginBottom:8, padding:"0 8px" }}>Menü</p>
          {NAV.map(item => {
            const active = pathname === item.href || (item.href !== "/supplier/dashboard" && pathname.startsWith(item.href));
            return (
              <a key={item.href} href={item.href} style={{
                display:"flex", alignItems:"center", gap:10, padding:"10px 12px", borderRadius:10, marginBottom:2,
                background: active ? `${ORANGE}15` : "transparent",
                color: active ? ORANGE : TEXT2,
                fontWeight: active ? 700 : 500,
                fontSize: 14,
                transition: "background 0.15s",
              }}>
                <span style={{ fontSize:16, width:20, textAlign:"center", flexShrink:0 }}>{item.icon}</span>
                {item.label}
                {active && <div style={{ marginLeft:"auto", width:4, height:4, borderRadius:"50%", background:ORANGE }} />}
              </a>
            );
          })}

          <div style={{ height:1, background:BORDER, margin:"16px 8px" }} />

          <p style={{ fontSize:10, fontWeight:700, color:TEXT3, letterSpacing:"1.5px", textTransform:"uppercase", marginBottom:8, padding:"0 8px" }}>Aktionen</p>
          {verified && (
            <a href="/add-product" style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 12px", borderRadius:10, background:ORANGE, color:"#fff", fontWeight:700, fontSize:14 }}>
              <span style={{ fontSize:16, width:20, textAlign:"center" }}>＋</span>
              Produkt hinzufügen
            </a>
          )}
          <a href="/marketplace" style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 12px", borderRadius:10, marginTop:6, color:TEXT2, fontWeight:500, fontSize:14 }}>
            <span style={{ fontSize:16, width:20, textAlign:"center" }}>🏪</span>
            Marktplatz ansehen
          </a>
        </nav>

        {/* User info */}
        <div style={{ padding:"16px 20px", borderTop:`1px solid ${BORDER}`, display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ width:34, height:34, borderRadius:10, background:`${ORANGE}20`, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:14, color:ORANGE, flexShrink:0 }}>
            {initials}
          </div>
          <div style={{ flex:1, minWidth:0 }}>
            <p style={{ fontSize:13, fontWeight:600, color:TEXT, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{supplierName ?? "…"}</p>
            <p style={{ fontSize:11, color:TEXT3 }}>Lieferant</p>
          </div>
          <NotificationBell />
          <button onClick={async () => { await supabase.auth.signOut(); window.location.href="/login"; }}
            style={{ background:"none", border:"none", cursor:"pointer", color:TEXT3, fontSize:14, padding:4 }} title="Abmelden">⏏</button>
        </div>
      </aside>

      {/* ── MAIN CONTENT ── */}
      <main style={{ flex:1, minWidth:0, overflowY:"auto" }}>
        {/* Mobile top bar — always visible, so "add product" never needs hunting for */}
        <div className="kf-mobile-topbar" style={{ position:"sticky", top:0, zIndex:20, alignItems:"center", justifyContent:"space-between", padding:"12px 16px", background:SURFACE, borderBottom:`1px solid ${BORDER}` }}>
          <button onClick={() => setSidebarOpen(true)} aria-label="Menü öffnen"
            style={{ background:"none", border:`1.5px solid ${BORDER}`, borderRadius:8, width:38, height:38, fontSize:18, color:TEXT, cursor:"pointer" }}>☰</button>
          <img src="/flowio-icon.png" alt="Flowio" style={{ width:30, height:30, borderRadius:7, objectFit:"cover" }} />
          {verified ? (
            <a href="/add-product" style={{ display:"flex", alignItems:"center", gap:6, background:ORANGE, color:"#fff", borderRadius:9, padding:"9px 14px", fontWeight:700, fontSize:13 }}>
              ＋ Produkt
            </a>
          ) : <div style={{ width:38 }} />}
        </div>
        {children}
      </main>
    </div>
  );
}
