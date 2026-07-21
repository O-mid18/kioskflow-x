"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

const BG = "var(--kf-bg)";
const SURFACE = "var(--kf-surface)";
const BORDER = "var(--kf-border)";
const TEXT = "var(--kf-text)";
const TEXT2 = "var(--kf-text2)";
const TEXT3 = "var(--kf-text3)";
const ORANGE = "#2563EB";

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  in_stock: { label: "Auf Lager", color: "#16a34a", bg: "#f0fdf4" },
  low:      { label: "Wird knapp", color: "#d97706", bg: "#fef3c7" },
  out:      { label: "Ausverkauft", color: "#dc2626", bg: "#fef2f2" },
};

function inputStyle(): React.CSSProperties {
  return { width: "100%", padding: "10px 14px", borderRadius: 10, border: `1.5px solid ${BORDER}`, background: BG, color: TEXT, fontSize: 14, outline: "none", fontFamily: "inherit" };
}

export default function KioskPageManage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  const [enabled, setEnabled] = useState(false);
  const [businessHours, setBusinessHours] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [phone, setPhone] = useState("");

  const [items, setItems] = useState<any[]>([]);
  const [myProducts, setMyProducts] = useState<any[]>([]);

  const [newName, setNewName] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [newLinkedProductId, setNewLinkedProductId] = useState("");

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { window.location.href = "/login"; return; }
      setUserId(user.id);

      const { data: profile } = await supabase.from("profiles").select("kiosk_page_enabled, business_hours, address, city, phone").eq("id", user.id).maybeSingle();
      if (profile) {
        setEnabled(profile.kiosk_page_enabled ?? false);
        setBusinessHours(profile.business_hours ?? "");
        setAddress(profile.address ?? "");
        setCity(profile.city ?? "");
        setPhone(profile.phone ?? "");
      }

      const { data: inv } = await supabase.from("kiosk_inventory").select("*").eq("kiosk_id", user.id).order("created_at", { ascending: false });
      setItems(inv ?? []);

      // Products this kiosk has actually ordered before — used to pre-populate
      // the "link to supplier for restock alerts" dropdown with relevant options.
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

  const saveProfile = async () => {
    if (!userId) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").update({
      kiosk_page_enabled: enabled,
      business_hours: businessHours || null,
      address: address || null,
      city: city || null,
      phone: phone || null,
    }).eq("id", userId);
    setSaving(false);
    setMsg({ text: error ? "Speichern fehlgeschlagen." : "Gespeichert ✓", ok: !error });
  };

  const addItem = async () => {
    if (!userId || !newName.trim()) return;
    const { data, error } = await supabase.from("kiosk_inventory").insert({
      kiosk_id: userId,
      name: newName.trim(),
      price: newPrice ? Number(newPrice) : null,
      linked_product_id: newLinkedProductId || null,
    }).select().single();
    if (error) { setMsg({ text: "Artikel konnte nicht hinzugefügt werden.", ok: false }); return; }
    setItems(prev => [data, ...prev]);
    setNewName(""); setNewPrice(""); setNewLinkedProductId("");
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

  if (loading) return <div style={{ minHeight: "100vh", background: BG, display: "flex", alignItems: "center", justifyContent: "center", color: TEXT2 }}>Lade…</div>;

  return (
    <div style={{ minHeight: "100vh", background: BG, padding: 32, fontFamily: "'DM Sans','Helvetica Neue',system-ui,sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500;600;700&display=swap');`}</style>
      <div style={{ maxWidth: 800, margin: "0 auto" }}>
        <a href="/profile" style={{ fontSize: 13, color: TEXT2, textDecoration: "none" }}>← Profil</a>
        <h1 style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 26, color: TEXT, margin: "8px 0 4px" }}>Meine Kiosk-Seite</h1>
        <p style={{ fontSize: 13, color: TEXT3, marginBottom: 24 }}>Öffentliche Seite für Kunden und Lieferanten mit deinen Produkten, Öffnungszeiten und Adresse.</p>

        {msg && (
          <div style={{ background: msg.ok ? "#f0fdf4" : "#fef2f2", border: `1.5px solid ${msg.ok ? "#bbf7d0" : "#fca5a5"}`, borderRadius: 10, padding: "12px 16px", marginBottom: 16 }}>
            <p style={{ color: msg.ok ? "#16a34a" : "#dc2626", fontSize: 13, fontWeight: 600 }}>{msg.text}</p>
          </div>
        )}

        <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 16, padding: 24, marginBottom: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <div>
              <h2 style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 14, color: TEXT }}>Seite veröffentlichen</h2>
              <p style={{ fontSize: 12, color: TEXT3, marginTop: 4 }}>Wenn aktiv, ist deine Seite unter myflowie.de/kiosk/{userId?.slice(0,8)}… öffentlich sichtbar.</p>
            </div>
            <label style={{ position: "relative", display: "inline-block", width: 44, height: 24, cursor: "pointer", flexShrink: 0 }}>
              <input type="checkbox" checked={enabled} onChange={e => setEnabled(e.target.checked)} style={{ opacity: 0, width: 0, height: 0 }} />
              <span style={{ position: "absolute", inset: 0, background: enabled ? ORANGE : BORDER, borderRadius: 24, transition: "background 0.2s" }} />
              <span style={{ position: "absolute", top: 3, left: enabled ? 23 : 3, width: 18, height: 18, background: "#fff", borderRadius: "50%", transition: "left 0.2s" }} />
            </label>
          </div>

          <div style={{ display: "grid", gap: 14 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: TEXT2, display: "block", marginBottom: 6 }}>Adresse</label>
              <input value={address} onChange={e => setAddress(e.target.value)} placeholder="Musterstraße 42" style={inputStyle()} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: TEXT2, display: "block", marginBottom: 6 }}>Stadt</label>
              <input value={city} onChange={e => setCity(e.target.value)} placeholder="Frankfurt" style={inputStyle()} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: TEXT2, display: "block", marginBottom: 6 }}>Telefon</label>
              <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+49 69 123456" style={inputStyle()} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: TEXT2, display: "block", marginBottom: 6 }}>Öffnungszeiten</label>
              <input value={businessHours} onChange={e => setBusinessHours(e.target.value)} placeholder="Mo–Sa 7–22 Uhr, So 9–20 Uhr" style={inputStyle()} />
            </div>
          </div>
          <button onClick={saveProfile} disabled={saving}
            style={{ marginTop: 18, background: ORANGE, color: "#fff", border: "none", borderRadius: 10, padding: "11px 20px", fontSize: 13, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer" }}>
            {saving ? "Speichert…" : "Speichern"}
          </button>
        </div>

        <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 16, padding: 24 }}>
          <h2 style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 14, color: TEXT, marginBottom: 16 }}>Meine Produkte ({items.length})</h2>

          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 2fr auto", gap: 8, marginBottom: 20, alignItems: "end" }}>
            <div>
              <label style={{ fontSize: 11, color: TEXT3, display: "block", marginBottom: 4 }}>Name</label>
              <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="z.B. Coca-Cola 0,5L" style={inputStyle()} />
            </div>
            <div>
              <label style={{ fontSize: 11, color: TEXT3, display: "block", marginBottom: 4 }}>Preis (€)</label>
              <input type="number" min="0" step="0.01" value={newPrice} onChange={e => setNewPrice(e.target.value)} placeholder="1,50" style={inputStyle()} />
            </div>
            <div>
              <label style={{ fontSize: 11, color: TEXT3, display: "block", marginBottom: 4 }}>Lieferant für Nachbestellung (optional)</label>
              <select value={newLinkedProductId} onChange={e => setNewLinkedProductId(e.target.value)} style={inputStyle()}>
                <option value="">— Kein Link —</option>
                {myProducts.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <button onClick={addItem} style={{ background: ORANGE, color: "#fff", border: "none", borderRadius: 10, padding: "10px 16px", fontSize: 13, fontWeight: 700, cursor: "pointer", height: 42 }}>
              + Hinzufügen
            </button>
          </div>

          {items.length === 0 ? (
            <p style={{ color: TEXT3, fontSize: 13, textAlign: "center", padding: "24px 0" }}>Noch keine Produkte. Füge oben dein erstes hinzu.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {items.map((item: any) => {
                const s = STATUS_LABELS[item.stock_status] ?? STATUS_LABELS.in_stock;
                return (
                  <div key={item.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", background: BG, borderRadius: 10, border: `1px solid ${BORDER}` }}>
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 600, color: TEXT }}>{item.name}{item.price ? ` · €${item.price}` : ""}</p>
                      {item.linked_product_id && <p style={{ fontSize: 11, color: TEXT3 }}>🔗 Verknüpft für Nachbestellung</p>}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <select value={item.stock_status} onChange={e => setStatus(item, e.target.value as any)}
                        style={{ background: s.bg, color: s.color, border: "none", borderRadius: 8, padding: "6px 10px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                        <option value="in_stock">Auf Lager</option>
                        <option value="low">Wird knapp</option>
                        <option value="out">Ausverkauft</option>
                      </select>
                      <button onClick={() => deleteItem(item.id)} style={{ background: "none", border: "none", color: "#dc2626", cursor: "pointer", fontSize: 13 }}>✕</button>
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
