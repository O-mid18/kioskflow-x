"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

const BG = "var(--kf-bg)";
const SURFACE = "var(--kf-surface)";
const BORDER = "var(--kf-border)";
const TEXT = "var(--kf-text)";
const TEXT2 = "var(--kf-text2)";
const TEXT3 = "var(--kf-text3)";
const ORANGE = "#2563EB";

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  in_stock: { label: "✓ Auf Lager", color: "#16a34a", bg: "#f0fdf4" },
  low:      { label: "Wird knapp",  color: "#d97706", bg: "#fef3c7" },
  out:      { label: "Ausverkauft", color: "#dc2626", bg: "#fef2f2" },
};

export default function KioskPublicPage() {
  const params = useParams();
  const [kiosk, setKiosk] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("id, full_name, company_name, address, city, phone, business_hours, kiosk_page_enabled")
        .eq("id", String(params.id))
        .maybeSingle();

      if (!profile || !profile.kiosk_page_enabled) { setNotFound(true); setLoading(false); return; }
      setKiosk(profile);

      const { data: inv } = await supabase.from("kiosk_inventory").select("*").eq("kiosk_id", String(params.id)).order("name");
      setItems(inv ?? []);
      setLoading(false);
    })();
  }, [params.id]);

  if (loading) return <div style={{ minHeight: "100vh", background: BG, display: "flex", alignItems: "center", justifyContent: "center", color: TEXT2 }}>Lade…</div>;

  if (notFound) {
    return (
      <div style={{ minHeight: "100vh", background: BG, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12 }}>
        <p style={{ color: TEXT2, fontSize: 14 }}>Diese Kiosk-Seite ist nicht verfügbar.</p>
        <a href="/marketplace" style={{ color: ORANGE, fontSize: 13, textDecoration: "none" }}>← Zum Marktplatz</a>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: BG, fontFamily: "'DM Sans','Helvetica Neue',system-ui,sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500;600;700&display=swap');`}</style>

      <nav style={{ background: SURFACE, borderBottom: `1px solid ${BORDER}`, padding: "0 24px", height: 58, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <a href="/" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none" }}>
          <img src="/flowio-icon.png" alt="Flowio" style={{ width: 30, height: 30, borderRadius: 7, objectFit: "cover" }} />
          <span style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 14, color: TEXT }}>Flowio</span>
        </a>
        <a href="/marketplace" style={{ fontSize: 13, color: TEXT2, textDecoration: "none" }}>Marktplatz</a>
      </nav>

      <div style={{ maxWidth: 720, margin: "0 auto", padding: "40px 24px" }}>
        <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 18, padding: 28, marginBottom: 24 }}>
          <span style={{ background: `${ORANGE}15`, color: ORANGE, fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 100 }}>KIOSK</span>
          <h1 style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 26, color: TEXT, margin: "10px 0 16px" }}>
            {kiosk.company_name || kiosk.full_name || "Kiosk"}
          </h1>
          <div style={{ display: "grid", gap: 8 }}>
            {kiosk.address && (
              <p style={{ fontSize: 14, color: TEXT2 }}>📍 {kiosk.address}{kiosk.city ? `, ${kiosk.city}` : ""}</p>
            )}
            {kiosk.business_hours && (
              <p style={{ fontSize: 14, color: TEXT2 }}>🕐 {kiosk.business_hours}</p>
            )}
            {kiosk.phone && (
              <p style={{ fontSize: 14, color: TEXT2 }}>📞 {kiosk.phone}</p>
            )}
          </div>
        </div>

        <h2 style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 18, color: TEXT, marginBottom: 16 }}>Sortiment ({items.length})</h2>

        {items.length === 0 ? (
          <p style={{ color: TEXT3, fontSize: 13 }}>Dieser Kiosk hat noch keine Produkte eingetragen.</p>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {items.map((item: any) => {
              const s = STATUS_LABELS[item.stock_status] ?? STATUS_LABELS.in_stock;
              return (
                <div key={item.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 12, padding: "14px 18px" }}>
                  <p style={{ fontSize: 14, fontWeight: 600, color: TEXT }}>{item.name}</p>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    {item.price && <span style={{ fontSize: 14, fontWeight: 700, color: TEXT }}>€{item.price}</span>}
                    <span style={{ background: s.bg, color: s.color, fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 100 }}>{s.label}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
