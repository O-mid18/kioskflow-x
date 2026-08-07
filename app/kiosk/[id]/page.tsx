"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { syne, dmSans } from "@/lib/scoped-fonts";

const BG     = "var(--kf-bg)";
const SURFACE = "var(--kf-surface)";
const BORDER  = "var(--kf-border)";
const TEXT    = "var(--kf-text)";
const TEXT2   = "var(--kf-text2)";
const TEXT3   = "var(--kf-text3)";
const ORANGE  = "#2563EB";
const ACCENT  = "var(--kf-accent)";
const BTN     = "var(--kf-btn)";

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  in_stock: { label: "✓ Auf Lager", color: "#16a34a", bg: "#f0fdf4" },
  low:      { label: "Wird knapp",  color: "#d97706", bg: "#fef3c7" },
  out:      { label: "Ausverkauft", color: "#dc2626", bg: "#fef2f2" },
};

const STATUS_DARK: Record<string, { color: string; bg: string }> = {
  in_stock: { color: "#4ade80", bg: "rgba(22,163,74,0.15)" },
  low:      { color: "#fb923c", bg: "rgba(249,115,22,0.15)" },
  out:      { color: "#f87171", bg: "rgba(239,68,68,0.15)" },
};

const SERVICE_LABELS: Record<string, string> = {
  atm: "🏧 Geldautomat", parcel_pickup: "📮 Paketstation", coffee: "☕ Kaffee",
  lottery: "🎟️ Lotto", tobacco: "🚬 Tabak", wifi: "📶 WLAN",
};

const DAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
const DISPLAY_DAY_ORDER = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
const DAY_LABELS_FULL: Record<string, string> = { mon: "Montag", tue: "Dienstag", wed: "Mittwoch", thu: "Donnerstag", fri: "Freitag", sat: "Samstag", sun: "Sonntag" };

function computeOpenStatus(hours: Record<string, { open: string; close: string; closed: boolean }> | null) {
  if (!hours) return null;
  const now = new Date();
  const todayKey = DAY_KEYS[now.getDay()];
  const today = hours[todayKey];
  if (!today || today.closed) return { open: false, today };
  const [oh, om] = today.open.split(":").map(Number);
  const [ch, cm] = today.close.split(":").map(Number);
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const openMin = oh * 60 + om;
  const closeMin = ch * 60 + cm;
  return { open: nowMin >= openMin && nowMin < closeMin, today };
}

export default function KioskPublicPage() {
  const params = useParams();
  const [kiosk, setKiosk] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [itemPhotos, setItemPhotos] = useState<Record<string, any[]>>({});
  const [galleryItem, setGalleryItem] = useState<string | null>(null);
  const [photos, setPhotos] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [myRating, setMyRating] = useState(0);
  const [myComment, setMyComment] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const check = () => setIsDark(document.documentElement.classList.contains("dark"));
    check();
    const obs = new MutationObserver(check);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user?.id ?? null);

      const { data: profile } = await supabase
        .from("profiles")
        .select("id, full_name, company_name, address, city, phone, business_hours, kiosk_page_enabled, kiosk_logo_url, opening_hours_structured, kiosk_services")
        .eq("id", String(params.id))
        .maybeSingle();

      if (!profile || !profile.kiosk_page_enabled) { setNotFound(true); setLoading(false); return; }
      setKiosk(profile);

      const [{ data: inv }, { data: photoRows }, { data: reviewRows }] = await Promise.all([
        supabase.from("kiosk_inventory").select("*").eq("kiosk_id", String(params.id)).order("category").order("name"),
        supabase.from("kiosk_photos").select("*").eq("kiosk_id", String(params.id)).order("created_at"),
        supabase.from("kiosk_reviews").select("*, profiles!kiosk_reviews_reviewer_id_fkey(full_name)").eq("kiosk_id", String(params.id)).order("created_at", { ascending: false }),
      ]);
      setItems(inv ?? []);
      setPhotos(photoRows ?? []);
      setReviews(reviewRows ?? []);

      if (inv && inv.length > 0) {
        const { data: itemPhotoRows } = await supabase.from("kiosk_inventory_photos").select("*").in("inventory_id", inv.map((i: any) => i.id)).order("created_at", { ascending: true });
        const photoMap: Record<string, any[]> = {};
        for (const p of itemPhotoRows ?? []) {
          if (!photoMap[p.inventory_id]) photoMap[p.inventory_id] = [];
          photoMap[p.inventory_id].push(p);
        }
        setItemPhotos(photoMap);
      }

      setLoading(false);
    })();
  }, [params.id]);

  const submitReview = async () => {
    if (!userId || myRating === 0) return;
    setSubmittingReview(true);
    const { error } = await supabase.from("kiosk_reviews").upsert({
      kiosk_id: String(params.id), reviewer_id: userId, rating: myRating, comment: myComment || null,
    }, { onConflict: "kiosk_id,reviewer_id" });
    setSubmittingReview(false);
    if (!error) {
      const { data: reviewRows } = await supabase.from("kiosk_reviews").select("*, profiles!kiosk_reviews_reviewer_id_fkey(full_name)").eq("kiosk_id", String(params.id)).order("created_at", { ascending: false });
      setReviews(reviewRows ?? []);
      setMyRating(0); setMyComment("");
    }
  };

  const accentColor = isDark ? ACCENT : ORANGE;
  const btnColor    = isDark ? BTN    : ORANGE;

  if (loading) return <div style={{ minHeight: "100vh", background: BG, display: "flex", alignItems: "center", justifyContent: "center", color: TEXT2 }}>Lade…</div>;

  if (notFound) {
    return (
      <div style={{ minHeight: "100vh", background: BG, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12 }}>
        <p style={{ color: TEXT2, fontSize: 14 }}>Diese Kiosk-Seite ist nicht verfügbar.</p>
        <a href="/marketplace" style={{ color: accentColor, fontSize: 13, textDecoration: "none" }}>← Zum Marktplatz</a>
      </div>
    );
  }

  const openStatus = computeOpenStatus(kiosk.opening_hours_structured);
  const avgRating = reviews.length > 0 ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : null;
  const grouped: Record<string, any[]> = {};
  for (const item of items) {
    const cat = item.category || "Sonstiges";
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(item);
  }
  const mapsQuery = encodeURIComponent(`${kiosk.address ?? ""}, ${kiosk.city ?? ""}`);

  return (
    <div className={`${syne.variable} ${dmSans.variable}`} style={{ minHeight: "100vh", background: BG, fontFamily: "var(--font-dm-sans),'Helvetica Neue',system-ui,sans-serif" }}>
      <style>{``}</style>

      <nav style={{ background: SURFACE, borderBottom: `1px solid ${BORDER}`, padding: "0 24px", height: 58, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <a href="/" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none" }}>
          <img src="/flowio-icon.png" alt="Flowio" style={{ width: 30, height: 30, borderRadius: 7, objectFit: "cover" }} />
          <span style={{ fontFamily: "var(--font-syne),sans-serif", fontWeight: 800, fontSize: 14, color: TEXT }}>Flowio</span>
        </a>
        <a href="/marketplace" style={{ fontSize: 13, color: TEXT2, textDecoration: "none" }}>Marktplatz</a>
      </nav>

      <div style={{ maxWidth: 720, margin: "0 auto", padding: "40px 24px" }}>
        {photos.length > 0 && (
          <div style={{ display: "flex", gap: 8, overflowX: "auto", marginBottom: 20, borderRadius: 16 }}>
            {photos.map((p: any) => (
              <img key={p.id} src={p.image_url} alt="" style={{ width: 200, height: 140, objectFit: "cover", borderRadius: isDark ? 8 : 14, flexShrink: 0 }} />
            ))}
          </div>
        )}

        <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: isDark ? 8 : 18, padding: 28, marginBottom: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 12 }}>
            {kiosk.kiosk_logo_url && <img src={kiosk.kiosk_logo_url} alt="" style={{ width: 56, height: 56, borderRadius: 12, objectFit: "cover", border: `1px solid ${BORDER}` }} />}
            <div>
              <span style={{ background: `${ORANGE}15`, color: accentColor, fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 100 }}>KIOSK</span>
              <h1 style={{ fontFamily: "var(--font-syne),sans-serif", fontWeight: 800, fontSize: 24, color: TEXT, marginTop: 6 }}>
                {kiosk.company_name || kiosk.full_name || "Kiosk"}
              </h1>
            </div>
          </div>

          {openStatus && (
            <span style={{ display: "inline-block", marginBottom: 14, background: openStatus.open ? (isDark ? "rgba(22,163,74,0.15)" : "#dcfce7") : (isDark ? "rgba(239,68,68,0.15)" : "#fee2e2"), color: openStatus.open ? (isDark ? "#4ade80" : "#16a34a") : (isDark ? "#f87171" : "#dc2626"), fontSize: 12, fontWeight: 700, padding: "4px 12px", borderRadius: 100 }}>
              {openStatus.open ? "🟢 Jetzt geöffnet" : "🔴 Geschlossen"}
            </span>
          )}
          {avgRating !== null && (
            <span style={{ display: "inline-block", marginLeft: 8, marginBottom: 14, fontSize: 13, color: TEXT2 }}>⭐ {avgRating.toFixed(1)} ({reviews.length})</span>
          )}

          <div style={{ display: "grid", gap: 8 }}>
            {kiosk.address && (
              <a href={`https://www.google.com/maps/search/?api=1&query=${mapsQuery}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: 14, color: accentColor, textDecoration: "none" }}>
                📍 {kiosk.address}{kiosk.city ? `, ${kiosk.city}` : ""} · Auf Karte öffnen →
              </a>
            )}
            {kiosk.phone && <p style={{ fontSize: 14, color: TEXT2 }}>📞 {kiosk.phone}</p>}
          </div>

          {kiosk.opening_hours_structured && (
            <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${BORDER}` }}>
              {DISPLAY_DAY_ORDER.filter(day => kiosk.opening_hours_structured[day]).map((day) => {
                const h = kiosk.opening_hours_structured[day];
                return (
                  <div key={day} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: TEXT3, padding: "2px 0" }}>
                    <span>{DAY_LABELS_FULL[day]}</span>
                    <span>{h.closed ? "Geschlossen" : `${h.open} – ${h.close}`}</span>
                  </div>
                );
              })}
            </div>
          )}

          {kiosk.kiosk_services?.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 14 }}>
              {kiosk.kiosk_services.map((s: string) => (
                <span key={s} style={{ background: BG, border: `1px solid ${BORDER}`, borderRadius: 100, padding: "4px 10px", fontSize: 12, color: TEXT2 }}>{SERVICE_LABELS[s] ?? s}</span>
              ))}
            </div>
          )}
        </div>

        <h2 style={{ fontFamily: "var(--font-syne),sans-serif", fontWeight: 800, fontSize: 18, color: TEXT, marginBottom: 16 }}>Sortiment ({items.length})</h2>

        {items.length === 0 ? (
          <p style={{ color: TEXT3, fontSize: 13 }}>Dieser Kiosk hat noch keine Produkte eingetragen.</p>
        ) : (
          Object.entries(grouped).map(([cat, catItems]) => (
            <div key={cat} style={{ marginBottom: 20 }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: TEXT3, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 8 }}>{cat}</p>
              <div style={{ display: "grid", gap: 10 }}>
                {catItems.map((item: any) => {
                  const s = STATUS_LABELS[item.stock_status] ?? STATUS_LABELS.in_stock;
                  const dk = STATUS_DARK[item.stock_status] ?? STATUS_DARK.in_stock;
                  const myPhotos = itemPhotos[item.id] ?? [];
                  return (
                    <div key={item.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: isDark ? 6 : 12, padding: "14px 18px", gap: 12 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
                        {myPhotos.length > 0 && (
                          <img src={myPhotos[0].image_url} alt="" onClick={() => setGalleryItem(item.id)}
                            style={{ width: 44, height: 44, objectFit: "cover", borderRadius: 8, flexShrink: 0, cursor: "pointer" }} />
                        )}
                        <p style={{ fontSize: 14, fontWeight: 600, color: TEXT, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.name}</p>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
                        {item.price && <span style={{ fontSize: 14, fontWeight: 700, color: TEXT }}>€{item.price}</span>}
                        <span style={{ background: isDark ? dk.bg : s.bg, color: isDark ? dk.color : s.color, fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 100 }}>{s.label}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}

        {galleryItem && (itemPhotos[galleryItem] ?? []).length > 0 && (
          <>
            <div onClick={() => setGalleryItem(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 300 }} />
            <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", background: SURFACE, borderRadius: 16, padding: 20, zIndex: 301, maxWidth: "90vw", maxHeight: "85vh", overflowY: "auto" }}>
              <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 10 }}>
                <button onClick={() => setGalleryItem(null)} style={{ background: BG, border: `1px solid ${BORDER}`, borderRadius: 8, width: 30, height: 30, color: TEXT2, cursor: "pointer" }}>×</button>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(160px,1fr))", gap: 10 }}>
                {(itemPhotos[galleryItem] ?? []).map((p: any) => (
                  <img key={p.id} src={p.image_url} alt="" style={{ width: "100%", height: 160, objectFit: "cover", borderRadius: 10 }} />
                ))}
              </div>
            </div>
          </>
        )}

        <div style={{ marginTop: 32, paddingTop: 24, borderTop: `1px solid ${BORDER}` }}>
          <h2 style={{ fontFamily: "var(--font-syne),sans-serif", fontWeight: 800, fontSize: 18, color: TEXT, marginBottom: 16 }}>
            Bewertungen {avgRating !== null && `· ⭐ ${avgRating.toFixed(1)}`}
          </h2>

          {userId && userId !== kiosk.id && (
            <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: isDark ? 8 : 14, padding: 16, marginBottom: 16 }}>
              <div style={{ display: "flex", gap: 4, marginBottom: 10 }}>
                {[1, 2, 3, 4, 5].map(n => (
                  <button key={n} onClick={() => setMyRating(n)} style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", opacity: n <= myRating ? 1 : 0.3 }}>⭐</button>
                ))}
              </div>
              <textarea value={myComment} onChange={e => setMyComment(e.target.value)} placeholder="Deine Erfahrung (optional)…" rows={2}
                style={{ width: "100%", padding: 10, borderRadius: isDark ? 4 : 8, border: `1px solid ${BORDER}`, background: BG, color: TEXT, fontSize: 13, resize: "vertical", fontFamily: "inherit" }} />
              <button onClick={submitReview} disabled={myRating === 0 || submittingReview}
                style={{ marginTop: 8, background: btnColor, color: "#fff", border: "none", borderRadius: isDark ? 4 : 8, padding: "8px 16px", fontSize: 12, fontWeight: 700, cursor: myRating === 0 ? "not-allowed" : "pointer" }}>
                {submittingReview ? "Speichert…" : "Bewertung abgeben"}
              </button>
            </div>
          )}

          {reviews.length === 0 ? (
            <p style={{ color: TEXT3, fontSize: 13 }}>Noch keine Bewertungen.</p>
          ) : (
            <div style={{ display: "grid", gap: 10 }}>
              {reviews.map((r: any) => (
                <div key={r.id} style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: isDark ? 6 : 12, padding: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: TEXT }}>{r.profiles?.full_name ?? "Nutzer"}</span>
                    <span style={{ fontSize: 12 }}>{"⭐".repeat(r.rating)}</span>
                  </div>
                  {r.comment && <p style={{ fontSize: 13, color: TEXT2 }}>{r.comment}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
