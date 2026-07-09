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
const ORANGE = "#E8521A";

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

export default function SupplierDashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [supplierName, setSupplierName] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { window.location.href = "/login"; return; }
      const { data: supplierRow } = await supabase
        .from("suppliers").select("name").eq("user_id", user.id).maybeSingle();
      setSupplierName(supplierRow?.name ?? user.email ?? "Lieferant");
    });
  }, []);

  const initials = supplierName
    ? supplierName.split(" ").map(w => w[0]).slice(0,2).join("").toUpperCase()
    : "S";

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: BG, fontFamily: "'DM Sans','Helvetica Neue',system-ui,sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; }
        a { text-decoration: none; }
      `}</style>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div onClick={() => setSidebarOpen(false)} style={{ position:"fixed", inset:0, background:"rgba(26,23,20,0.4)", zIndex:40, display:"none" }} className="md-overlay" />
      )}

      {/* ── SIDEBAR ── */}
      <aside style={{
        width: 240, flexShrink: 0, background: SURFACE, borderRight: `1px solid ${BORDER}`,
        display: "flex", flexDirection: "column", position: "sticky", top: 0, height: "100vh", overflow: "hidden",
        zIndex: 30,
      }}>
        {/* Logo */}
        <div style={{ padding: "24px 20px 20px", borderBottom: `1px solid ${BORDER}` }}>
          <a href="/marketplace" style={{ display:"flex", alignItems:"center", gap:10 }}>
            <div style={{ width:34, height:34, background:ORANGE, borderRadius:9, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'Syne',sans-serif", fontWeight:900, fontSize:16, color:"#fff", flexShrink:0 }}>V</div>
            <div>
              <p style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:15, color:TEXT, letterSpacing:"-0.3px", lineHeight:1 }}>Vendoro</p>
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
          <a href="/add-product" style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 12px", borderRadius:10, background:ORANGE, color:"#fff", fontWeight:700, fontSize:14 }}>
            <span style={{ fontSize:16, width:20, textAlign:"center" }}>＋</span>
            Produkt hinzufügen
          </a>
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
        {children}
      </main>
    </div>
  );
}
