"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

const BG = "var(--kf-bg)";
const SURFACE = "var(--kf-surface)";
const BORDER = "var(--kf-border)";
const TEXT = "var(--kf-text)";
const TEXT2 = "var(--kf-text2)";
const TEXT3 = "var(--kf-text3)";
const ORANGE = "#2563EB";
const ACCENT = "var(--kf-accent)";
const BTN    = "var(--kf-btn)";

import { CATEGORIES } from "@/lib/categories";

function Field({ label, required, children, isDark }: { label:string; required?:boolean; children:React.ReactNode; isDark?: boolean }) {
  const accentColor = isDark ? ACCENT : ORANGE;
  return (
    <div>
      <label style={{ display:"block", fontSize:12, fontWeight:600, color:TEXT2, marginBottom:7 }}>
        {label}{required && <span style={{ color:accentColor, marginLeft:3 }}>*</span>}
      </label>
      {children}
    </div>
  );
}

function inputStyle(dark = false, extra?: object) {
  return { width:"100%", background:SURFACE, border:`1.5px solid ${BORDER}`, borderRadius: dark ? 4 : 10, padding:"12px 15px", color:TEXT, fontSize:14, boxSizing:"border-box" as const, transition:"border-color 0.2s, box-shadow 0.2s", fontFamily:"inherit", ...extra };
}

export default function EditProductPage() {
  const params = useParams();
  const router = useRouter();
  const [name, setName]               = useState("");
  const [price, setPrice]             = useState("");
  const [stock, setStock]             = useState("");
  const [shippingCost, setShippingCost] = useState("");
  const [saleEnabled, setSaleEnabled] = useState(false);
  const [originalPrice, setOriginalPrice] = useState("");
  const [saleEndsAt, setSaleEndsAt] = useState("");
  const [existingImageUrl, setExistingImageUrl] = useState("");
  const [imageFile, setImageFile]     = useState<File | null>(null);
  const [galleryPhotos, setGalleryPhotos] = useState<any[]>([]);
  const [uploadingGalleryPhoto, setUploadingGalleryPhoto] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [category, setCategory]       = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading]         = useState(true);
  const [saving, setSaving]           = useState(false);
  const [errorMsg, setErrorMsg]       = useState("");
  const [dragOver, setDragOver]       = useState(false);
  const [isDark, setIsDark]           = useState(false);
  const fileInputRef                  = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const check = () => setIsDark(document.documentElement.classList.contains("dark"));
    check();
    const obs = new MutationObserver(check);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);

  const accentColor = isDark ? ACCENT : ORANGE;
  const btnColor    = isDark ? BTN    : ORANGE;

  const focus = (e: React.FocusEvent<HTMLInputElement|HTMLTextAreaElement|HTMLSelectElement>) => {
    e.currentTarget.style.borderColor = accentColor;
    e.currentTarget.style.boxShadow = "0 0 0 3px rgba(37,99,235,0.1)";
  };
  const blur = (e: React.FocusEvent<HTMLInputElement|HTMLTextAreaElement|HTMLSelectElement>) => {
    e.currentTarget.style.borderColor = BORDER;
    e.currentTarget.style.boxShadow = "none";
  };

  useEffect(() => {
    supabase.from("products").select("*").eq("id", String(params.id)).single().then(({ data, error }) => {
      if (error) { setErrorMsg("Produkt nicht gefunden."); setLoading(false); return; }
      if (data) {
        setName(data.name || "");
        setPrice(String(data.price || ""));
        setStock(String(data.stock || ""));
        setShippingCost(data.shipping_cost ? String(data.shipping_cost) : "");
        if (data.original_price && data.sale_ends_at && new Date(data.sale_ends_at) > new Date()) {
          setSaleEnabled(true);
          setOriginalPrice(String(data.original_price));
          setSaleEndsAt(new Date(data.sale_ends_at).toISOString().slice(0, 16));
        }
        setExistingImageUrl(data.image_url || "");
        setCategory(data.category || "");
        setDescription(data.description || "");
        supabase.from("product_photos").select("*").eq("product_id", String(params.id)).order("created_at", { ascending: true }).then(({ data: gp }) => setGalleryPhotos(gp ?? []));
      }
      setLoading(false);
    });
  }, []);

  const handleFile = (file: File | null) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) { setErrorMsg("Bitte nur Bilddateien hochladen (JPG, PNG, WebP)."); return; }
    if (file.size > 5 * 1024 * 1024) { setErrorMsg("Bild darf maximal 5 MB groß sein."); return; }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setErrorMsg("");
  };

  const uploadImage = async (userId: string): Promise<string | null> => {
    if (!imageFile) return null;
    const ext  = imageFile.name.split(".").pop();
    const path = `${userId}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("product-images").upload(path, imageFile, { upsert: true, contentType: imageFile.type });
    if (error) { setErrorMsg("Bild-Upload fehlgeschlagen. Bitte erneut versuchen."); return null; }
    const { data } = supabase.storage.from("product-images").getPublicUrl(path);
    return data.publicUrl;
  };

  const addGalleryPhoto = async (file: File) => {
    if (galleryPhotos.length >= 5) { setErrorMsg("Maximal 5 Fotos pro Produkt."); return; }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setUploadingGalleryPhoto(true);
    const ext = file.name.split(".").pop();
    const path = `${user.id}/gallery-${String(params.id)}-${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from("product-images").upload(path, file, { contentType: file.type });
    if (upErr) { setUploadingGalleryPhoto(false); setErrorMsg("Foto-Upload fehlgeschlagen."); return; }
    const { data: pub } = supabase.storage.from("product-images").getPublicUrl(path);
    const { data, error } = await supabase.from("product_photos").insert({ product_id: String(params.id), image_url: pub.publicUrl }).select().single();
    setUploadingGalleryPhoto(false);
    if (error) { setErrorMsg("Foto konnte nicht gespeichert werden."); return; }
    setGalleryPhotos(prev => [...prev, data]);
  };

  const deleteGalleryPhoto = async (photoId: string) => {
    await supabase.from("product_photos").delete().eq("id", photoId);
    setGalleryPhotos(prev => prev.filter(p => p.id !== photoId));
  };

  const updateProduct = async () => {
    setErrorMsg("");
    if (!name || !price || !stock) { setErrorMsg("Name, Preis und Lagerbestand sind Pflichtfelder."); return; }
    if (saleEnabled) {
      if (!originalPrice || Number(originalPrice) <= Number(price)) { setErrorMsg("Der ursprüngliche Preis muss höher als der aktuelle Preis sein."); return; }
      if (!saleEndsAt || new Date(saleEndsAt) <= new Date()) { setErrorMsg("Bitte ein gültiges Enddatum in der Zukunft für das Angebot wählen."); return; }
    }
    setSaving(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setErrorMsg("Bitte zuerst einloggen."); setSaving(false); return; }

    // Ownership check: verify this product belongs to the current user's supplier account
    const { data: supplier } = await supabase.from("suppliers").select("id, verified").eq("user_id", user.id).maybeSingle();
    if (!supplier) { setErrorMsg("Kein Lieferantenkonto gefunden."); setSaving(false); return; }
    if (!supplier.verified) { setErrorMsg("Dein Konto wurde noch nicht freigegeben. Produkte können erst nach der Freigabe bearbeitet werden."); setSaving(false); return; }
    const { data: productCheck } = await supabase.from("products").select("supplier_id").eq("id", String(params.id)).maybeSingle();
    if (!productCheck || productCheck.supplier_id !== supplier.id) { setErrorMsg("Keine Berechtigung, dieses Produkt zu bearbeiten."); setSaving(false); return; }

    let finalImageUrl = existingImageUrl;
    if (imageFile) {
      const uploaded = await uploadImage(user.id);
      if (!uploaded) { setSaving(false); return; }
      finalImageUrl = uploaded;
    }

    const { error } = await supabase.from("products").update({
      name, price: Number(price), stock: Number(stock),
      shipping_cost: shippingCost ? Number(shippingCost) : 0,
      original_price: saleEnabled ? Number(originalPrice) : null,
      sale_ends_at: saleEnabled ? new Date(saleEndsAt).toISOString() : null,
      image_url: finalImageUrl || null,
      category: category || null,
      description: description || null,
    }).eq("id", String(params.id));

    setSaving(false);
    if (error) setErrorMsg("Produkt konnte nicht gespeichert werden. Bitte erneut versuchen.");
    else router.push("/supplier");
  };

  const shownPreview = imagePreview ?? (existingImageUrl || null);

  if (loading) {
    return (
      <main style={{ minHeight:"100vh", background:BG, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'DM Sans',system-ui,sans-serif" }}>
        <style>{`@keyframes spin { to { transform:rotate(360deg); } }`}</style>
        <div style={{ textAlign:"center" }}>
          <div style={{ width:36, height:36, border:`3px solid ${BORDER}`, borderTopColor: accentColor, borderRadius:"50%", animation:"spin 0.8s linear infinite", margin:"0 auto 14px" }} />
          <p style={{ color:TEXT3, fontSize:13 }}>Produkt laden...</p>
        </div>
      </main>
    );
  }

  return (
    <main style={{ minHeight:"100vh", background:BG, fontFamily:"'DM Sans','Helvetica Neue',system-ui,sans-serif", color:TEXT, paddingBottom:60 }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500;600;700&display=swap');
        input::placeholder,textarea::placeholder { color:${TEXT3}; }
        @keyframes spin { to { transform:rotate(360deg); } }
      `}</style>

      {/* Header */}
      <nav style={{ background:SURFACE, borderBottom:`1px solid ${BORDER}`, padding:"0 24px", height:60, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <img src="/flowio-icon.png" alt="Flowio" style={{ width: 30, height: 30, borderRadius: 7, objectFit: "cover" }} />
          <span style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:14, color:TEXT, letterSpacing:"-0.3px" }}>Flowio</span>
        </div>
        <a href="/supplier/dashboard/products" style={{ color:TEXT2, fontSize:13, textDecoration:"none", display:"flex", alignItems:"center", gap:6, fontWeight:500 }}>← Zurück zum Dashboard</a>
      </nav>

      <div style={{ maxWidth:680, margin:"0 auto", padding:"36px 24px" }}>
        <div style={{ marginBottom:32 }}>
          <p style={{ fontSize:11, fontWeight:700, color:TEXT3, letterSpacing:"2.5px", textTransform:"uppercase", marginBottom:8 }}>Lieferant-Dashboard</p>
          <h1 style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:28, color:TEXT, letterSpacing:"-0.8px", marginBottom:6 }}>Produkt bearbeiten</h1>
          <p style={{ color:TEXT2, fontSize:14 }}>Änderungen werden sofort im Marktplatz übernommen.</p>
        </div>

        {errorMsg && (
          <div style={{ background: isDark ? "rgba(239,68,68,0.15)" : "#fef2f2", border:`1.5px solid ${isDark ? "rgba(239,68,68,0.3)" : "#fca5a5"}`, borderRadius:10, padding:"12px 16px", marginBottom:24 }}>
            <p style={{ color: isDark ? "#f87171" : "#dc2626", fontSize:13 }}>{errorMsg}</p>
          </div>
        )}

        <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
          {/* Produktdetails */}
          <div style={{ background:SURFACE, border:`1px solid ${BORDER}`, borderRadius: isDark ? 8 : 16, padding:"24px" }}>
            <h2 style={{ fontFamily:"'Syne',sans-serif", fontWeight:700, fontSize:14, color:TEXT, marginBottom:20 }}>Produktdetails</h2>
            <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
              <Field label="Name" required isDark={isDark}>
                <input type="text" value={name} onChange={e => setName(e.target.value)} style={inputStyle(isDark)} onFocus={focus} onBlur={blur} />
              </Field>
              <Field label="Beschreibung" isDark={isDark}>
                <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} style={{ ...inputStyle(isDark), resize:"none" }} onFocus={focus} onBlur={blur} />
              </Field>
              <Field label="Kategorie" isDark={isDark}>
                <select value={category} onChange={e => setCategory(e.target.value)} style={{ ...inputStyle(isDark), color:category?TEXT:TEXT3, cursor:"pointer" }} onFocus={focus} onBlur={blur}>
                  <option value="">Kategorie wählen</option>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </Field>
            </div>
          </div>

          {/* Produktbild */}
          <div style={{ background:SURFACE, border:`1px solid ${BORDER}`, borderRadius: isDark ? 8 : 16, padding:"24px" }}>
            <h2 style={{ fontFamily:"'Syne',sans-serif", fontWeight:700, fontSize:14, color:TEXT, marginBottom:20 }}>Produktbild</h2>

            {shownPreview ? (
              <div style={{ display:"flex", alignItems:"flex-start", gap:16 }}>
                <div style={{ width:120, height:120, borderRadius:14, overflow:"hidden", border:`1.5px solid ${BORDER}`, flexShrink:0 }}>
                  <img loading="lazy" decoding="async" src={shownPreview} alt="Vorschau" style={{ width:"100%", height:"100%", objectFit:"cover" }}
                    onError={e => { e.currentTarget.src = "https://images.unsplash.com/photo-1568702846914-96b305d2aaeb?w=200&q=80"; }} />
                </div>
                <div style={{ flex:1 }}>
                  <p style={{ fontSize:13, fontWeight:600, color:TEXT, marginBottom:4 }}>
                    {imageFile ? imageFile.name : "Aktuelles Bild"}
                  </p>
                  {imageFile && <p style={{ fontSize:12, color:TEXT3, marginBottom:14 }}>{(imageFile.size / 1024).toFixed(0)} KB</p>}
                  <div style={{ display:"flex", gap:8, marginTop: imageFile ? 0 : 14 }}>
                    <button onClick={() => fileInputRef.current?.click()}
                      style={{ background:btnColor, border:"none", borderRadius: isDark ? 4 : 8, padding:"7px 14px", fontSize:12, fontWeight:700, color:"#fff", cursor:"pointer" }}>
                      Bild ersetzen
                    </button>
                    <button onClick={() => { setImageFile(null); setImagePreview(null); setExistingImageUrl(""); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                      style={{ background:"none", border:`1.5px solid ${BORDER}`, borderRadius: isDark ? 4 : 8, padding:"7px 14px", fontSize:12, fontWeight:600, color:TEXT2, cursor:"pointer" }}>
                      Entfernen
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={e => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0] ?? null); }}
                style={{ border:`2px dashed ${dragOver ? accentColor : BORDER}`, borderRadius:14, padding:"36px 20px", textAlign:"center", cursor:"pointer", background: dragOver ? `${ORANGE}08` : BG, transition:"all 0.2s" }}>
                <div style={{ fontSize:36, marginBottom:12 }}>🖼️</div>
                <p style={{ fontSize:14, fontWeight:600, color:TEXT, marginBottom:6 }}>Bild auswählen oder hierher ziehen</p>
                <p style={{ fontSize:12, color:TEXT3 }}>JPG, PNG oder WebP · max. 5 MB</p>
                <div style={{ display:"inline-block", marginTop:16, background:btnColor, color:"#fff", borderRadius:9, padding:"9px 22px", fontSize:13, fontWeight:700 }}>
                  Datei auswählen
                </div>
              </div>
            )}

            <input ref={fileInputRef} type="file" accept="image/*" style={{ display:"none" }}
              onChange={e => handleFile(e.target.files?.[0] ?? null)} />
          </div>

          {/* Weitere Fotos (Galerie) */}
          <div style={{ background:SURFACE, border:`1px solid ${BORDER}`, borderRadius: isDark ? 8 : 16, padding:"24px" }}>
            <h2 style={{ fontFamily:"'Syne',sans-serif", fontWeight:700, fontSize:14, color:TEXT, marginBottom:6 }}>Weitere Fotos ({galleryPhotos.length}/5)</h2>
            <p style={{ fontSize:12, color:TEXT3, marginBottom:16 }}>Zusätzlich zum Hauptbild — für Detailansichten, Verpackung, o.ä.</p>
            <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
              {galleryPhotos.map(p => (
                <div key={p.id} style={{ position:"relative", width:80, height:80 }}>
                  <img src={p.image_url} alt="" style={{ width:"100%", height:"100%", objectFit:"cover", borderRadius:10 }} />
                  <button onClick={() => deleteGalleryPhoto(p.id)} style={{ position:"absolute", top:-6, right:-6, background:"#dc2626", color:"#fff", border:"none", borderRadius:"50%", width:20, height:20, fontSize:11, cursor:"pointer" }}>×</button>
                </div>
              ))}
              {galleryPhotos.length < 5 && (
                <label style={{ width:80, height:80, borderRadius:10, border:`1.5px dashed ${BORDER}`, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", fontSize:22, color:TEXT3 }}>
                  {uploadingGalleryPhoto ? "…" : "+"}
                  <input type="file" accept="image/*" style={{ display:"none" }}
                    onChange={e => { const f = e.target.files?.[0]; if (f) addGalleryPhoto(f); e.target.value = ""; }} />
                </label>
              )}
            </div>
          </div>

          {/* Preis & Lager */}
          <div style={{ background:SURFACE, border:`1px solid ${BORDER}`, borderRadius: isDark ? 8 : 16, padding:"24px" }}>
            <h2 style={{ fontFamily:"'Syne',sans-serif", fontWeight:700, fontSize:14, color:TEXT, marginBottom:20 }}>Preis & Lagerbestand</h2>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:16 }}>
              <Field label="Preis" required isDark={isDark}>
                <div style={{ position:"relative" }}>
                  <span style={{ position:"absolute", left:14, top:"50%", transform:"translateY(-50%)", color:TEXT3, fontSize:14, fontWeight:600 }}>€</span>
                  <input type="number" min="0" step="0.01" value={price} onChange={e => setPrice(e.target.value)} style={{ ...inputStyle(isDark, { paddingLeft:30 }) }} onFocus={focus} onBlur={blur} />
                </div>
              </Field>
              <Field label="Lagerbestand" required isDark={isDark}>
                <input type="number" min="0" value={stock} onChange={e => setStock(e.target.value)} style={inputStyle(isDark)} onFocus={focus} onBlur={blur} />
              </Field>
              <Field label="Versandkosten" isDark={isDark}>
                <div style={{ position:"relative" }}>
                  <span style={{ position:"absolute", left:14, top:"50%", transform:"translateY(-50%)", color:TEXT3, fontSize:14, fontWeight:600 }}>€</span>
                  <input type="number" min="0" step="0.01" placeholder="0.00" value={shippingCost} onChange={e => setShippingCost(e.target.value)} style={{ ...inputStyle(isDark, { paddingLeft:30 }) }} onFocus={focus} onBlur={blur} />
                </div>
              </Field>
            </div>
          </div>

          {/* Sale / discount */}
          <div style={{ background:SURFACE, border:`1px solid ${BORDER}`, borderRadius: isDark ? 8 : 16, padding:"24px" }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom: saleEnabled ? 20 : 0 }}>
              <div>
                <h2 style={{ fontFamily:"'Syne',sans-serif", fontWeight:700, fontSize:14, color:TEXT }}>🔥 Zeitlich begrenztes Angebot</h2>
                <p style={{ fontSize:12, color:TEXT3, marginTop:4 }}>Erscheint im "Angebote heute"-Panel für Käufer.</p>
              </div>
              <label style={{ position:"relative", display:"inline-block", width:44, height:24, cursor:"pointer" }}>
                <input type="checkbox" checked={saleEnabled} onChange={e => setSaleEnabled(e.target.checked)} style={{ opacity:0, width:0, height:0 }} />
                <span style={{ position:"absolute", inset:0, background: saleEnabled ? btnColor : BORDER, borderRadius:24, transition:"background 0.2s" }} />
                <span style={{ position:"absolute", top:3, left: saleEnabled ? 23 : 3, width:18, height:18, background:"#fff", borderRadius:"50%", transition:"left 0.2s" }} />
              </label>
            </div>
            {saleEnabled && (
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
                <Field label="Ursprünglicher Preis" required isDark={isDark}>
                  <div style={{ position:"relative" }}>
                    <span style={{ position:"absolute", left:14, top:"50%", transform:"translateY(-50%)", color:TEXT3, fontSize:14, fontWeight:600 }}>€</span>
                    <input type="number" min="0" step="0.01" placeholder={`> ${price || "0.00"}`} value={originalPrice} onChange={e => setOriginalPrice(e.target.value)} style={{ ...inputStyle(isDark, { paddingLeft:30 }) }} onFocus={focus} onBlur={blur} />
                  </div>
                </Field>
                <Field label="Angebot endet am" required isDark={isDark}>
                  <input type="datetime-local" value={saleEndsAt} onChange={e => setSaleEndsAt(e.target.value)} style={inputStyle(isDark)} onFocus={focus} onBlur={blur} />
                </Field>
              </div>
            )}
          </div>

          {/* Actions */}
          <div style={{ display:"flex", justifyContent:"flex-end", gap:10, paddingTop:4 }}>
            <a href="/supplier/dashboard/products" style={{ background:"none", border:`1.5px solid ${BORDER}`, color:TEXT2, borderRadius: isDark ? 4 : 10, padding:"12px 22px", fontSize:14, fontWeight:600, textDecoration:"none", display:"inline-flex", alignItems:"center" }}>Abbrechen</a>
            <button onClick={updateProduct} disabled={saving}
              style={{ background:saving?"rgba(37,99,235,0.55)":btnColor, color:"#fff", border:"none", borderRadius: isDark ? 4 : 10, padding:"12px 28px", fontSize:14, fontFamily:"inherit", fontWeight:700, cursor:saving?"not-allowed":"pointer", transition:"opacity 0.2s", boxShadow:`0 4px 14px rgba(37,99,235,0.25)`, display:"flex", alignItems:"center", gap:8 }}>
              {saving && <div style={{ width:14, height:14, border:"2px solid rgba(255,255,255,0.4)", borderTopColor:"#fff", borderRadius:"50%", animation:"spin 0.8s linear infinite" }} />}
              {saving ? "Wird gespeichert..." : "Änderungen speichern →"}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
