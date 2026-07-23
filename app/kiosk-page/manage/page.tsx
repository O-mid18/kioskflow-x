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

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  in_stock: { label: "Auf Lager", color: "#16a34a", bg: "#f0fdf4" },
  low:      { label: "Wird knapp", color: "#d97706", bg: "#fef3c7" },
  out:      { label: "Ausverkauft", color: "#dc2626", bg: "#fef2f2" },
};

const STATUS_DARK: Record<string, { color: string; bg: string }> = {
  in_stock: { color: "#4ade80", bg: "rgba(22,163,74,0.15)" },
  low:      { color: "#fb923c", bg: "rgba(249,115,22,0.15)" },
  out:      { color: "#f87171", bg: "rgba(239,68,68,0.15)" },
};

function inputStyle(isDark = false): React.CSSProperties {
  return { width: "100%", padding: "10px 14px", borderRadius: isDark ? 4 : 10, border: `1.5px solid ${BORDER}`, background: BG, color: TEXT, fontSize: 14, outline: "none", fontFamily: "inherit" };
}

export default function KioskPageManage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [isDark, setIsDark] = useState(false);

  const [enabled, setEnabled] = useState(false);
  const [businessHours, setBusinessHours] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [phone, setPhone] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [hours, setHours] = useState<Record<string, { open: string; close: string; closed: boolean }>>({
    mon: { open: "07:00", close: "20:00", closed: false },
    tue: { open: "07:00", close: "20:00", closed: false },
    wed: { open: "07:00", close: "20:00", closed: false },
    thu: { open: "07:00", close: "20:00", closed: false },
    fri: { open: "07:00", close: "20:00", closed: false },
    sat: { open: "07:00", close: "20:00", closed: false },
    sun: { open: "09:00", close: "18:00", closed: false },
  });
  const [services, setServices] = useState<string[]>([]);
  const [photos, setPhotos] = useState<any[]>([]);
  const [newPhotoFile, setNewPhotoFile] = useState<File | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const [items, setItems] = useState<any[]>([]);
  const [itemPhotos, setItemPhotos] = useState<Record<string, any[]>>({});
  const [uploadingPhotoFor, setUploadingPhotoFor] = useState<string | null>(null);
  const [myProducts, setMyProducts] = useState<any[]>([]);
  const [historyCache, setHistoryCache] = useState<Record<string, any[]>>({});
  const [qtyDrafts, setQtyDrafts] = useState<Record<string, string>>({});
  const [offers, setOffers] = useState<any[]>([]);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [confirmingOrder, setConfirmingOrder] = useState<string | null>(null);

  const [newName, setNewName] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [newLinkedProductId, setNewLinkedProductId] = useState("");

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
      if (!user) { window.location.href = "/login"; return; }
      setUserId(user.id);

      const { data: profile } = await supabase.from("profiles").select("kiosk_page_enabled, business_hours, address, city, phone, kiosk_logo_url, opening_hours_structured, kiosk_services").eq("id", user.id).maybeSingle();
      if (profile) {
        setEnabled(profile.kiosk_page_enabled ?? false);
        setBusinessHours(profile.business_hours ?? "");
        setAddress(profile.address ?? "");
        setCity(profile.city ?? "");
        setPhone(profile.phone ?? "");
        setLogoUrl(profile.kiosk_logo_url ?? "");
        if (profile.opening_hours_structured) setHours((prev) => ({ ...prev, ...profile.opening_hours_structured }));
        setServices(profile.kiosk_services ?? []);
      }

      const { data: photoRows } = await supabase.from("kiosk_photos").select("*").eq("kiosk_id", user.id).order("created_at", { ascending: true });
      setPhotos(photoRows ?? []);

      const { data: inv } = await supabase.from("kiosk_inventory").select("*").eq("kiosk_id", user.id).order("created_at", { ascending: false });
      setItems(inv ?? []);

      if (inv && inv.length > 0) {
        const { data: itemPhotoRows } = await supabase.from("kiosk_inventory_photos").select("*").in("inventory_id", inv.map((i: any) => i.id)).order("created_at", { ascending: true });
        const photoMap: Record<string, any[]> = {};
        for (const p of itemPhotoRows ?? []) {
          if (!photoMap[p.inventory_id]) photoMap[p.inventory_id] = [];
          photoMap[p.inventory_id].push(p);
        }
        setItemPhotos(photoMap);
      }

      const { data: histRows } = await supabase.from("kiosk_inventory_history").select("*").eq("kiosk_id", user.id).order("recorded_at", { ascending: true });
      const cache: Record<string, any[]> = {};
      for (const h of (histRows ?? [])) {
        if (!cache[h.inventory_id]) cache[h.inventory_id] = [];
        cache[h.inventory_id].push(h);
      }
      setHistoryCache(cache);

      const { data: offRows } = await supabase.from("restock_offers").select("*, suppliers(id, user_id, profiles!suppliers_user_id_fkey(full_name, company_name))").eq("kiosk_id", user.id).eq("status", "pending");
      setOffers(offRows ?? []);

      const { data: pastItems } = await supabase
        .from("order_items")
        .select("products(id, name), orders!inner(buyer_id)")
        .eq("orders.buyer_id", user.id);
      const seen = new Map<string, any>();
      for (const it of (pastItems ?? []) as any[]) {
        if (it.products) seen.set(it.products.id, it.products);
      }
      setMyProducts([...seen.values()]);

      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    (async () => {
      const lowItems = items.filter(i => (i.stock_status === "low" || i.stock_status === "out") && i.linked_product_id);
      if (lowItems.length === 0) { setSuggestions([]); return; }

      const { data: linkedProducts } = await supabase
        .from("products")
        .select("id, stock")
        .in("id", lowItems.map(i => i.linked_product_id));
      const availableIds = new Set((linkedProducts ?? []).filter((p: any) => (p.stock ?? 0) > 0).map((p: any) => p.id));

      setSuggestions(lowItems.filter(i => availableIds.has(i.linked_product_id)));
    })();
  }, [items]);

  const uploadLogo = async (): Promise<string | null> => {
    if (!logoFile || !userId) return logoUrl || null;
    const ext = logoFile.name.split(".").pop();
    const path = `kiosk-logos/${userId}/logo.${ext}`;
    const { error } = await supabase.storage.from("product-images").upload(path, logoFile, { upsert: true, contentType: logoFile.type });
    if (error) { setMsg({ text: "Logo-Upload fehlgeschlagen.", ok: false }); return null; }
    const { data } = supabase.storage.from("product-images").getPublicUrl(path);
    return data.publicUrl;
  };

  const saveProfile = async () => {
    if (!userId) return;
    setSaving(true);
    const finalLogoUrl = await uploadLogo();
    const { error } = await supabase.from("profiles").update({
      kiosk_page_enabled: enabled,
      business_hours: businessHours || null,
      address: address || null,
      city: city || null,
      phone: phone || null,
      kiosk_logo_url: finalLogoUrl,
      opening_hours_structured: hours,
      kiosk_services: services,
    }).eq("id", userId);
    setSaving(false);
    if (finalLogoUrl) setLogoUrl(finalLogoUrl);
    setMsg({ text: error ? "Speichern fehlgeschlagen." : "Gespeichert ✓", ok: !error });
  };

  const addPhoto = async () => {
    if (!newPhotoFile || !userId) return;
    setUploadingPhoto(true);
    const ext = newPhotoFile.name.split(".").pop();
    const path = `kiosk-photos/${userId}/${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from("product-images").upload(path, newPhotoFile, { contentType: newPhotoFile.type });
    if (upErr) { setUploadingPhoto(false); setMsg({ text: "Foto-Upload fehlgeschlagen.", ok: false }); return; }
    const { data: pub } = supabase.storage.from("product-images").getPublicUrl(path);
    const { data, error } = await supabase.from("kiosk_photos").insert({ kiosk_id: userId, image_url: pub.publicUrl }).select().single();
    setUploadingPhoto(false);
    if (error) { setMsg({ text: "Foto konnte nicht gespeichert werden.", ok: false }); return; }
    setPhotos(prev => [...prev, data]);
    setNewPhotoFile(null);
  };

  const storagePathFromUrl = (url: string): string | null => {
    const marker = "/product-images/";
    const i = url.indexOf(marker);
    return i === -1 ? null : url.slice(i + marker.length);
  };

  const deletePhoto = async (id: string) => {
    const photo = photos.find(p => p.id === id);
    await supabase.from("kiosk_photos").delete().eq("id", id);
    setPhotos(prev => prev.filter(p => p.id !== id));
    if (photo) {
      const path = storagePathFromUrl(photo.image_url);
      if (path) await supabase.storage.from("product-images").remove([path]);
    }
  };

  const addItemPhoto = async (inventoryId: string, file: File) => {
    if (!userId) return;
    if ((itemPhotos[inventoryId] ?? []).length >= 5) { setMsg({ text: "Maximal 5 Fotos pro Produkt.", ok: false }); return; }
    setUploadingPhotoFor(inventoryId);
    const ext = file.name.split(".").pop();
    const path = `kiosk-item-photos/${userId}/${inventoryId}/${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from("product-images").upload(path, file, { contentType: file.type });
    if (upErr) { setUploadingPhotoFor(null); setMsg({ text: "Foto-Upload fehlgeschlagen.", ok: false }); return; }
    const { data: pub } = supabase.storage.from("product-images").getPublicUrl(path);
    const { data, error } = await supabase.from("kiosk_inventory_photos").insert({ inventory_id: inventoryId, image_url: pub.publicUrl }).select().single();
    setUploadingPhotoFor(null);
    if (error) { setMsg({ text: "Foto konnte nicht gespeichert werden.", ok: false }); return; }
    setItemPhotos(prev => ({ ...prev, [inventoryId]: [...(prev[inventoryId] ?? []), data] }));
  };

  const deleteItemPhoto = async (inventoryId: string, photoId: string) => {
    const photo = (itemPhotos[inventoryId] ?? []).find(p => p.id === photoId);
    await supabase.from("kiosk_inventory_photos").delete().eq("id", photoId);
    setItemPhotos(prev => ({ ...prev, [inventoryId]: (prev[inventoryId] ?? []).filter(p => p.id !== photoId) }));
    if (photo) {
      const path = storagePathFromUrl(photo.image_url);
      if (path) await supabase.storage.from("product-images").remove([path]);
    }
  };

  const toggleService = (key: string) => {
    setServices(prev => prev.includes(key) ? prev.filter(s => s !== key) : [...prev, key]);
  };

  const DAY_LABELS: Record<string, string> = { mon: "Mo", tue: "Di", wed: "Mi", thu: "Do", fri: "Fr", sat: "Sa", sun: "So" };
  const DAY_ORDER = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
  const SERVICE_OPTIONS = [
    { key: "atm",          label: "🏧 Geldautomat" },
    { key: "parcel_pickup", label: "📮 Paketstation" },
    { key: "coffee",       label: "☕ Kaffee" },
    { key: "lottery",      label: "🎟️ Lotto" },
    { key: "tobacco",      label: "🚬 Tabak" },
    { key: "wifi",         label: "📶 WLAN" },
  ];

  const addItem = async () => {
    if (!userId || !newName.trim()) return;
    const { data, error } = await supabase.from("kiosk_inventory").insert({
      kiosk_id: userId,
      name: newName.trim(),
      price: newPrice ? Number(newPrice) : null,
      linked_product_id: newLinkedProductId || null,
      category: newCategory || null,
    }).select().single();
    if (error) { setMsg({ text: "Artikel konnte nicht hinzugefügt werden.", ok: false }); return; }
    setItems(prev => [data, ...prev]);
    setNewName(""); setNewPrice(""); setNewLinkedProductId(""); setNewCategory("");
  };

  const deleteItem = async (id: string) => {
    await supabase.from("kiosk_inventory").delete().eq("id", id);
    setItems(prev => prev.filter(i => i.id !== id));
  };

  const setStatus = async (item: any, status: "in_stock" | "low" | "out") => {
    await supabase.from("kiosk_inventory").update({ stock_status: status, updated_at: new Date().toISOString() }).eq("id", item.id);
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, stock_status: status } : i));

    if ((status === "low" || status === "out") && item.linked_supplier_id) {
      const { data: supplier } = await supabase.from("suppliers").select("user_id").eq("id", item.linked_supplier_id).maybeSingle();
      if (supplier?.user_id) {
        await supabase.from("notifications").insert({
          user_id: supplier.user_id,
          type: "kiosk_low_stock",
          title: status === "out" ? "🔴 Kiosk hat Artikel ausverkauft" : "🟡 Kiosk-Bestand wird knapp",
          body: `Ein Kiosk hat "${item.name}" als ${status === "out" ? "ausverkauft" : "knapp"} markiert. Vielleicht Zeit für eine neue Bestellung?`,
          link: "/supplier/dashboard/orders",
        });
      }
    }
  };

  const updateQuantity = async (item: any, qty: number) => {
    if (!userId) return;
    const prev = item.quantity ?? 0;
    await supabase.from("kiosk_inventory").update({ quantity: qty, updated_at: new Date().toISOString() }).eq("id", item.id);
    setItems(p => p.map(i => i.id === item.id ? { ...i, quantity: qty } : i));
    await supabase.from("kiosk_inventory_history").insert({ kiosk_id: userId, inventory_id: item.id, quantity: qty, delta: qty - prev });
    setHistoryCache(p => {
      const list = [...(p[item.id] ?? []), { inventory_id: item.id, quantity: qty, delta: qty - prev, recorded_at: new Date().toISOString() }];
      return { ...p, [item.id]: list };
    });

    if (item.auto_restock_enabled && item.min_stock_threshold != null && qty <= item.min_stock_threshold && prev > item.min_stock_threshold) {
      const newStatus = qty === 0 ? "out" : "low";
      await setStatus({ ...item, quantity: qty }, newStatus);
      await supabase.from("notifications").insert({
        user_id: userId,
        type: "auto_restock_detected",
        title: "🤖 Automatische Bestandsprüfung",
        body: `"${item.name}" ist auf ${qty} Stück gesunken (Grenze: ${item.min_stock_threshold}). Eine Bestellung wurde vorbereitet → bitte bestätige sie unten.`,
        link: "/kiosk-page/manage",
      });
    } else if (item.stock_status !== "in_stock" && qty > 0) {
      const backInStock = item.min_stock_threshold != null ? qty > item.min_stock_threshold : true;
      if (backInStock) await setStatus({ ...item, quantity: qty }, "in_stock");
    }
  };

  const updateAutoRestockConfig = async (item: any, changes: Partial<{ auto_restock_enabled: boolean; min_stock_threshold: number | null; auto_reorder_quantity: number | null }>) => {
    const { error } = await supabase.from("kiosk_inventory").update(changes).eq("id", item.id);
    if (error) { setMsg({ text: "Einstellung konnte nicht gespeichert werden.", ok: false }); return; }
    setItems(p => p.map(i => i.id === item.id ? { ...i, ...changes } : i));
  };

  const predictDaysLeft = (itemId: string, currentQty: number): number | null => {
    const hist = historyCache[itemId] ?? [];
    const negDeltas = hist.filter((h: any) => h.delta < 0);
    if (negDeltas.length < 2) return null;
    const totalConsumed = negDeltas.reduce((s: number, h: any) => s + Math.abs(h.delta), 0);
    const span = (new Date(negDeltas[negDeltas.length - 1].recorded_at).getTime() - new Date(negDeltas[0].recorded_at).getTime()) / 86400000;
    if (span < 1) return null;
    const dailyRate = totalConsumed / span;
    return dailyRate > 0 ? Math.round(currentQty / dailyRate) : null;
  };

  const respondToOffer = async (offerId: string, accept: boolean) => {
    const status = accept ? "accepted" : "declined";
    const { error } = await supabase.from("restock_offers").update({ status }).eq("id", offerId);
    if (error) { alert("Aktion konnte nicht gespeichert werden. Bitte erneut versuchen."); return; }
    setOffers(prev => prev.filter(o => o.id !== offerId));
    if (accept) {
      const offer = offers.find(o => o.id === offerId);
      if (offer?.suppliers?.user_id) {
        await supabase.from("notifications").insert({
          user_id: offer.suppliers.user_id,
          type: "offer_accepted",
          title: "✅ Angebot angenommen",
          body: "Dein Angebot wurde vom Kiosk angenommen.",
          link: "/supplier/dashboard",
        });
      }
    }
  };

  const confirmSuggestedOrder = async (item: any) => {
    if (!userId || !item.linked_product_id) return;
    setConfirmingOrder(item.id);
    const qtyToAdd = item.auto_reorder_quantity && item.auto_reorder_quantity > 0 ? item.auto_reorder_quantity : 1;
    const { data: existing } = await supabase.from("cart_items").select("id, quantity").eq("user_id", userId).eq("product_id", item.linked_product_id).maybeSingle();
    if (existing) {
      await supabase.from("cart_items").update({ quantity: existing.quantity + qtyToAdd }).eq("id", existing.id);
    } else {
      await supabase.from("cart_items").insert({ user_id: userId, product_id: item.linked_product_id, quantity: qtyToAdd });
    }
    setConfirmingOrder(null);
    setSuggestions(prev => prev.filter(s => s.id !== item.id));
    window.location.href = "/cart";
  };

  const accentColor = isDark ? ACCENT : ORANGE;
  const btnColor    = isDark ? BTN    : ORANGE;

  if (loading) return <div style={{ minHeight: "100vh", background: BG, display: "flex", alignItems: "center", justifyContent: "center", color: TEXT2 }}>Lade…</div>;

  return (
    <div style={{ minHeight: "100vh", background: BG, padding: 32, fontFamily: "'Inter','Helvetica Neue',system-ui,sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Manrope:wght@600;700;800&family=Inter:wght@400;500;600;700&display=swap');`}</style>
      <div style={{ maxWidth: 800, margin: "0 auto" }}>
        <a href="/profile" style={{ fontSize: 13, color: TEXT2, textDecoration: "none" }}>← Profil</a>
        <h1 style={{ fontFamily: "'Manrope',sans-serif", fontWeight: 800, fontSize: 26, color: TEXT, margin: "8px 0 4px" }}>Meine Kiosk-Seite</h1>
        <p style={{ fontSize: 13, color: TEXT3, marginBottom: 24 }}>Öffentliche Seite für Kunden und Lieferanten mit deinen Produkten, Öffnungszeiten und Adresse.</p>

        {msg && (
          <div style={{ background: msg.ok ? (isDark ? "rgba(0,82,255,0.1)" : "#f0fdf4") : (isDark ? "rgba(239,68,68,0.1)" : "#fef2f2"), border: `1.5px solid ${msg.ok ? (isDark ? "rgba(0,82,255,0.3)" : "#bbf7d0") : (isDark ? "rgba(239,68,68,0.3)" : "#fca5a5")}`, borderRadius: 10, padding: "12px 16px", marginBottom: 16 }}>
            <p style={{ color: msg.ok ? (isDark ? "#b7c4ff" : "#16a34a") : (isDark ? "#f87171" : "#dc2626"), fontSize: 13, fontWeight: 600 }}>{msg.text}</p>
          </div>
        )}

        <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: isDark ? 8 : 16, padding: 24, marginBottom: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <div>
              <h2 style={{ fontFamily: "'Manrope',sans-serif", fontWeight: 700, fontSize: 14, color: TEXT }}>Seite veröffentlichen</h2>
              <p style={{ fontSize: 12, color: TEXT3, marginTop: 4 }}>Wenn aktiv, ist deine Seite unter myflowie.de/kiosk/{userId?.slice(0,8)}… öffentlich sichtbar.</p>
            </div>
            <label style={{ position: "relative", display: "inline-block", width: 44, height: 24, cursor: "pointer", flexShrink: 0 }}>
              <input type="checkbox" checked={enabled} onChange={e => setEnabled(e.target.checked)} style={{ opacity: 0, width: 0, height: 0 }} />
              <span style={{ position: "absolute", inset: 0, background: enabled ? btnColor : BORDER, borderRadius: 24, transition: "background 0.2s" }} />
              <span style={{ position: "absolute", top: 3, left: enabled ? 23 : 3, width: 18, height: 18, background: "#fff", borderRadius: "50%", transition: "left 0.2s" }} />
            </label>
          </div>

          <div style={{ display: "grid", gap: 14 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: TEXT2, display: "block", marginBottom: 6 }}>Logo</label>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                {logoUrl && <img src={logoUrl} alt="" style={{ width: 48, height: 48, borderRadius: 10, objectFit: "cover", border: `1px solid ${BORDER}` }} />}
                <input type="file" accept="image/*" onChange={e => setLogoFile(e.target.files?.[0] ?? null)} style={{ fontSize: 12, color: TEXT2 }} />
              </div>
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: TEXT2, display: "block", marginBottom: 6 }}>Adresse</label>
              <input value={address} onChange={e => setAddress(e.target.value)} placeholder="Musterstraße 42" style={inputStyle(isDark)} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: TEXT2, display: "block", marginBottom: 6 }}>Stadt</label>
              <input value={city} onChange={e => setCity(e.target.value)} placeholder="Frankfurt" style={inputStyle(isDark)} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: TEXT2, display: "block", marginBottom: 6 }}>Telefon</label>
              <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+49 69 123456" style={inputStyle(isDark)} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: TEXT2, display: "block", marginBottom: 8 }}>Öffnungszeiten</label>
              <div style={{ display: "grid", gap: 6 }}>
                {DAY_ORDER.map((day) => (
                  <div key={day} style={{ display: "grid", gridTemplateColumns: "36px 1fr 1fr auto", gap: 8, alignItems: "center" }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: TEXT2 }}>{DAY_LABELS[day]}</span>
                    <input type="time" value={hours[day].open} disabled={hours[day].closed}
                      onChange={e => setHours(prev => ({ ...prev, [day]: { ...prev[day], open: e.target.value } }))}
                      style={{ ...inputStyle(isDark), padding: "6px 10px", opacity: hours[day].closed ? 0.4 : 1 }} />
                    <input type="time" value={hours[day].close} disabled={hours[day].closed}
                      onChange={e => setHours(prev => ({ ...prev, [day]: { ...prev[day], close: e.target.value } }))}
                      style={{ ...inputStyle(isDark), padding: "6px 10px", opacity: hours[day].closed ? 0.4 : 1 }} />
                    <label style={{ fontSize: 11, color: TEXT3, display: "flex", alignItems: "center", gap: 4, cursor: "pointer", whiteSpace: "nowrap" }}>
                      <input type="checkbox" checked={hours[day].closed} onChange={e => setHours(prev => ({ ...prev, [day]: { ...prev[day], closed: e.target.checked } }))} />
                      zu
                    </label>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: TEXT2, display: "block", marginBottom: 8 }}>Angebotene Services</label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {SERVICE_OPTIONS.map(opt => (
                  <button key={opt.key} type="button" onClick={() => toggleService(opt.key)}
                    style={{ padding: "7px 12px", borderRadius: 100, border: `1.5px solid ${services.includes(opt.key) ? accentColor : BORDER}`, background: services.includes(opt.key) ? `${ORANGE}15` : "transparent", color: services.includes(opt.key) ? accentColor : TEXT2, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <button onClick={saveProfile} disabled={saving}
            style={{ marginTop: 18, background: btnColor, color: "#fff", border: "none", borderRadius: isDark ? 6 : 10, padding: "11px 20px", fontSize: 13, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer" }}>
            {saving ? "Speichert…" : "Speichern"}
          </button>
        </div>

        <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: isDark ? 8 : 16, padding: 24, marginBottom: 20 }}>
          <h2 style={{ fontFamily: "'Manrope',sans-serif", fontWeight: 700, fontSize: 14, color: TEXT, marginBottom: 16 }}>Fotos vom Kiosk</h2>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
            {photos.map((p: any) => (
              <div key={p.id} style={{ position: "relative", width: 90, height: 90 }}>
                <img src={p.image_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 10 }} />
                <button onClick={() => deletePhoto(p.id)} style={{ position: "absolute", top: -6, right: -6, background: "#dc2626", color: "#fff", border: "none", borderRadius: "50%", width: 20, height: 20, fontSize: 11, cursor: "pointer" }}>✕</button>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <input type="file" accept="image/*" onChange={e => setNewPhotoFile(e.target.files?.[0] ?? null)} style={{ fontSize: 12, color: TEXT2 }} />
            <button onClick={addPhoto} disabled={!newPhotoFile || uploadingPhoto}
              style={{ background: btnColor, color: "#fff", border: "none", borderRadius: 8, padding: "7px 14px", fontSize: 12, fontWeight: 700, cursor: (!newPhotoFile || uploadingPhoto) ? "not-allowed" : "pointer" }}>
              {uploadingPhoto ? "Lädt…" : "+ Foto hinzufügen"}
            </button>
          </div>
        </div>

        {suggestions.length > 0 && (
          <div style={{ background: isDark ? "rgba(245,158,11,0.1)" : "#fefce8", border: `1.5px solid ${isDark ? "rgba(245,158,11,0.3)" : "#fcd34d"}`, borderRadius: isDark ? 8 : 16, padding: 20, marginBottom: 20 }}>
            <h2 style={{ fontFamily: "'Manrope',sans-serif", fontWeight: 700, fontSize: 14, color: isDark ? "#fb923c" : "#92400e", marginBottom: 12 }}>📦 Vorbereitete Bestellungen</h2>
            <p style={{ fontSize: 12, color: isDark ? TEXT2 : "#78350f", marginBottom: 12 }}>Diese Artikel sind knapp — Flowio hat passende Bestellungen vorbereitet.</p>
            <div style={{ display: "grid", gap: 8 }}>
              {suggestions.map((item: any) => (
                <div key={item.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: isDark ? BG : "#fff", border: `1px solid ${isDark ? BORDER : "#fcd34d"}`, borderRadius: isDark ? 6 : 10, padding: "10px 14px" }}>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 600, color: isDark ? TEXT : "#92400e" }}>{item.name}</p>
                    <p style={{ fontSize: 11, color: isDark ? TEXT3 : "#b45309" }}>{item.stock_status === "out" ? "Ausverkauft" : "Wird knapp"}</p>
                  </div>
                  <button onClick={() => confirmSuggestedOrder(item)} disabled={confirmingOrder === item.id}
                    style={{ background: "#f59e0b", color: "#fff", border: "none", borderRadius: 8, padding: "7px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                    {confirmingOrder === item.id ? "…" : "In den Warenkorb"}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {offers.length > 0 && (
          <div style={{ background: SURFACE, border: `1.5px solid ${ORANGE}40`, borderRadius: isDark ? 8 : 16, padding: 20, marginBottom: 20 }}>
            <h2 style={{ fontFamily: "'Manrope',sans-serif", fontWeight: 700, fontSize: 14, color: TEXT, marginBottom: 12 }}>💬 Angebote von Lieferanten</h2>
            <div style={{ display: "grid", gap: 10 }}>
              {offers.map((offer: any) => {
                const supplierName = offer.suppliers?.profiles?.company_name || offer.suppliers?.profiles?.full_name || "Lieferant";
                const invItem = items.find(i => i.id === offer.inventory_id);
                return (
                  <div key={offer.id} style={{ background: BG, border: `1px solid ${BORDER}`, borderRadius: isDark ? 6 : 12, padding: 14 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                      <div>
                        <p style={{ fontSize: 13, fontWeight: 700, color: TEXT }}>{supplierName}</p>
                        {invItem && <p style={{ fontSize: 11, color: TEXT3 }}>für: {invItem.name}</p>}
                      </div>
                      <div style={{ textAlign: "right" }}>
                        {offer.price && <p style={{ fontSize: 14, fontWeight: 800, color: accentColor }}>€{offer.price}</p>}
                        {offer.discount_pct && <p style={{ fontSize: 11, color: isDark ? "#4ade80" : "#16a34a" }}>−{offer.discount_pct}% Rabatt</p>}
                        {offer.delivery_estimate && <p style={{ fontSize: 11, color: TEXT3 }}>⏰ {offer.delivery_estimate}</p>}
                      </div>
                    </div>
                    {offer.message && <p style={{ fontSize: 12, color: TEXT2, marginBottom: 8, fontStyle: "italic" }}>"{offer.message}"</p>}
                    <div style={{ display: "flex", gap: 8 }}>
                      <button onClick={() => respondToOffer(offer.id, true)}
                        style={{ flex: 1, background: isDark ? "rgba(22,163,74,0.2)" : "#16a34a", color: isDark ? "#4ade80" : "#fff", border: isDark ? "1px solid rgba(74,222,128,0.3)" : "none", borderRadius: 8, padding: "8px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                        ✓ Annehmen
                      </button>
                      <button onClick={() => respondToOffer(offer.id, false)}
                        style={{ flex: 1, background: isDark ? "rgba(239,68,68,0.1)" : "#fef2f2", color: isDark ? "#f87171" : "#dc2626", border: `1px solid ${isDark ? "rgba(239,68,68,0.3)" : "#fca5a5"}`, borderRadius: 8, padding: "8px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                        ✕ Ablehnen
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: isDark ? 8 : 16, padding: 24 }}>
          <h2 style={{ fontFamily: "'Manrope',sans-serif", fontWeight: 700, fontSize: 14, color: TEXT, marginBottom: 16 }}>Meine Produkte ({items.length})</h2>

          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 2fr auto", gap: 8, marginBottom: 20, alignItems: "end" }}>
            <div>
              <label style={{ fontSize: 11, color: TEXT3, display: "block", marginBottom: 4 }}>Name</label>
              <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="z.B. Coca-Cola 0,5L" style={inputStyle(isDark)} />
            </div>
            <div>
              <label style={{ fontSize: 11, color: TEXT3, display: "block", marginBottom: 4 }}>Preis (€)</label>
              <input type="number" min="0" step="0.01" value={newPrice} onChange={e => setNewPrice(e.target.value)} placeholder="1,50" style={inputStyle(isDark)} />
            </div>
            <div>
              <label style={{ fontSize: 11, color: TEXT3, display: "block", marginBottom: 4 }}>Kategorie</label>
              <input value={newCategory} onChange={e => setNewCategory(e.target.value)} placeholder="Getränke" style={inputStyle(isDark)} />
            </div>
            <div>
              <label style={{ fontSize: 11, color: TEXT3, display: "block", marginBottom: 4 }}>Lieferant für Nachbestellung (optional)</label>
              <select value={newLinkedProductId} onChange={e => setNewLinkedProductId(e.target.value)} style={inputStyle(isDark)}>
                <option value="">— Kein Link —</option>
                {myProducts.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <button onClick={addItem} style={{ background: btnColor, color: "#fff", border: "none", borderRadius: isDark ? 6 : 10, padding: "10px 16px", fontSize: 13, fontWeight: 700, cursor: "pointer", height: 42 }}>
              + Hinzufügen
            </button>
          </div>

          {items.length === 0 ? (
            <p style={{ color: TEXT3, fontSize: 13, textAlign: "center", padding: "24px 0" }}>Noch keine Produkte. Füge oben dein erstes hinzu.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {items.map((item: any) => {
                const s = STATUS_LABELS[item.stock_status] ?? STATUS_LABELS.in_stock;
                const dk = STATUS_DARK[item.stock_status] ?? STATUS_DARK.in_stock;
                const daysLeft = predictDaysLeft(item.id, item.quantity ?? 0);
                return (
                  <div key={item.id} style={{ padding: "12px 14px", background: BG, borderRadius: 10, border: `1px solid ${BORDER}` }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <p style={{ fontSize: 13, fontWeight: 600, color: TEXT }}>{item.name}{item.price ? ` · €${item.price}` : ""}</p>
                        {item.linked_product_id && <p style={{ fontSize: 11, color: TEXT3 }}>🔗 Verknüpft für Nachbestellung</p>}
                        {daysLeft !== null && (
                          <p style={{ fontSize: 11, color: daysLeft < 3 ? (isDark ? "#f87171" : "#dc2626") : daysLeft < 7 ? (isDark ? "#fb923c" : "#d97706") : (isDark ? "#4ade80" : "#16a34a") }}>
                            ~{daysLeft} Tag{daysLeft !== 1 ? "e" : ""} Vorrat verbleibend
                          </p>
                        )}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                          <label style={{ fontSize: 11, color: TEXT3 }}>Menge:</label>
                          <input type="number" min="0"
                            value={qtyDrafts[item.id] ?? String(item.quantity ?? 0)}
                            onChange={e => setQtyDrafts(prev => ({ ...prev, [item.id]: e.target.value }))}
                            onBlur={e => {
                              const val = Number(e.target.value);
                              setQtyDrafts(prev => { const n = { ...prev }; delete n[item.id]; return n; });
                              if (!Number.isNaN(val) && val !== (item.quantity ?? 0)) updateQuantity(item, val);
                            }}
                            style={{ width: 60, padding: "4px 8px", borderRadius: 7, border: `1px solid ${BORDER}`, background: SURFACE, color: TEXT, fontSize: 12, fontFamily: "inherit" }} />
                        </div>
                        <select value={item.stock_status} onChange={e => setStatus(item, e.target.value as any)}
                          style={{ background: isDark ? dk.bg : s.bg, color: isDark ? dk.color : s.color, border: "none", borderRadius: 8, padding: "6px 10px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                          <option value="in_stock">Auf Lager</option>
                          <option value="low">Wird knapp</option>
                          <option value="out">Ausverkauft</option>
                        </select>
                        <button onClick={() => deleteItem(item.id)} style={{ background: "none", border: "none", color: "#dc2626", cursor: "pointer", fontSize: 13 }}>✕</button>
                      </div>
                    </div>
                    {item.linked_product_id && (
                      <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${BORDER}`, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: TEXT2, cursor: "pointer" }}>
                          <input type="checkbox" checked={item.auto_restock_enabled ?? false}
                            onChange={e => updateAutoRestockConfig(item, { auto_restock_enabled: e.target.checked })} />
                          🤖 Automatisch erkennen
                        </label>
                        {item.auto_restock_enabled && (
                          <>
                            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                              <span style={{ fontSize: 11, color: TEXT3 }}>Grenze:</span>
                              <input type="number" min="0" defaultValue={item.min_stock_threshold ?? ""} placeholder="z.B. 20"
                                onBlur={e => updateAutoRestockConfig(item, { min_stock_threshold: e.target.value ? Number(e.target.value) : null })}
                                style={{ width: 55, padding: "3px 6px", borderRadius: 6, border: `1px solid ${BORDER}`, background: SURFACE, color: TEXT, fontSize: 11 }} />
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                              <span style={{ fontSize: 11, color: TEXT3 }}>Nachbestellmenge:</span>
                              <input type="number" min="0" defaultValue={item.auto_reorder_quantity ?? ""} placeholder="z.B. 5"
                                onBlur={e => updateAutoRestockConfig(item, { auto_reorder_quantity: e.target.value ? Number(e.target.value) : null })}
                                style={{ width: 55, padding: "3px 6px", borderRadius: 6, border: `1px solid ${BORDER}`, background: SURFACE, color: TEXT, fontSize: 11 }} />
                            </div>
                          </>
                        )}
                      </div>
                    )}

                    <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${BORDER}` }}>
                      <p style={{ fontSize: 11, color: TEXT3, marginBottom: 6 }}>📷 Produktfotos ({(itemPhotos[item.id] ?? []).length}/5)</p>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                        {(itemPhotos[item.id] ?? []).map((p: any) => (
                          <div key={p.id} style={{ position: "relative", width: 56, height: 56 }}>
                            <img src={p.image_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 8 }} />
                            <button onClick={() => deleteItemPhoto(item.id, p.id)} style={{ position: "absolute", top: -5, right: -5, background: "#dc2626", color: "#fff", border: "none", borderRadius: "50%", width: 16, height: 16, fontSize: 9, cursor: "pointer", lineHeight: 1 }}>×</button>
                          </div>
                        ))}
                        {(itemPhotos[item.id] ?? []).length < 5 && (
                          <label style={{ width: 56, height: 56, borderRadius: 8, border: `1.5px dashed ${BORDER}`, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 18, color: TEXT3 }}>
                            {uploadingPhotoFor === item.id ? "…" : "+"}
                            <input type="file" accept="image/*" style={{ display: "none" }}
                              onChange={e => { const f = e.target.files?.[0]; if (f) addItemPhoto(item.id, f); e.target.value = ""; }} />
                          </label>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
