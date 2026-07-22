"use client";

import { useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { CATEGORIES } from "@/lib/categories";

const BG = "var(--kf-bg)";
const SURFACE = "var(--kf-surface)";
const BORDER = "var(--kf-border)";
const TEXT = "var(--kf-text)";
const TEXT2 = "var(--kf-text2)";
const TEXT3 = "var(--kf-text3)";
const ORANGE = "#003ec7";

function Field({ label, required, children }: { label:string; required?:boolean; children:React.ReactNode }) {
  return (
    <div>
      <label style={{ display:"block", fontSize:12, fontWeight:600, color:TEXT2, marginBottom:7, letterSpacing:"0.2px" }}>
        {label}{required && <span style={{ color:ORANGE, marginLeft:3 }}>*</span>}
      </label>
      {children}
    </div>
  );
}

function inputStyle(extra?: object) {
  return { width:"100%", background:SURFACE, border:`1.5px solid ${BORDER}`, borderRadius:10, padding:"12px 15px", color:TEXT, fontSize:14, boxSizing:"border-box" as const, transition:"border-color 0.2s, box-shadow 0.2s", fontFamily:"inherit", ...extra };
}

export default function AddProductPage() {
  const [name, setName]               = useState("");
  const [price, setPrice]             = useState("");
  const [stock, setStock]             = useState("");
  const [shippingCost, setShippingCost] = useState("");
  const [imageFile, setImageFile]     = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [category, setCategory]       = useState("");
  const [description, setDescription] = useState("");
  const [isLoading, setIsLoading]     = useState(false);
  const [uploadProgress, setUploadProgress] = useState(false);
  const [errorMsg, setErrorMsg]       = useState("");
  const [dragOver, setDragOver]       = useState(false);
  const fileInputRef                  = useRef<HTMLInputElement>(null);

  const focus = (e: React.FocusEvent<HTMLInputElement|HTMLTextAreaElement|HTMLSelectElement>) => {
    e.currentTarget.style.borderColor = ORANGE;
    e.currentTarget.style.boxShadow = "0 0 0 3px rgba(0,62,199,0.1)";
  };
  const blur = (e: React.FocusEvent<HTMLInputElement|HTMLTextAreaElement|HTMLSelectElement>) => {
    e.currentTarget.style.borderColor = BORDER;
    e.currentTarget.style.boxShadow = "none";
  };

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
    setUploadProgress(true);
    const ext  = imageFile.name.split(".").pop();
    const path = `${userId}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("product-images").upload(path, imageFile, { upsert: true, contentType: imageFile.type });
    setUploadProgress(false);
    if (error) { setErrorMsg("Bild-Upload fehlgeschlagen. Bitte erneut versuchen."); return null; }
    const { data } = supabase.storage.from("product-images").getPublicUrl(path);
    return data.publicUrl;
  };

  const addProduct = async () => {
    setErrorMsg("");
    if (!name || !price || !stock) { setErrorMsg("Name, Preis und Lagerbestand sind Pflichtfelder."); return; }
    if (Number(price) <= 0) { setErrorMsg("Der Preis muss größer als 0 sein."); return; }
    if (Number(stock) < 0) { setErrorMsg("Der Lagerbestand darf nicht negativ sein."); return; }
    if (shippingCost && Number(shippingCost) < 0) { setErrorMsg("Die Versandkosten dürfen nicht negativ sein."); return; }
    setIsLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setErrorMsg("Bitte zuerst einloggen."); setIsLoading(false); return; }

    const { data: supplier, error: supplierError } = await supabase.from("suppliers").select("*").eq("user_id", user.id).maybeSingle();
    if (supplierError || !supplier) { setErrorMsg("Lieferantenkonto nicht gefunden."); setIsLoading(false); return; }
    if (!supplier.verified) { setErrorMsg("Dein Konto wurde noch nicht freigegeben. Sobald unser Team deine Daten geprüft hat, kannst du Produkte hinzufügen."); setIsLoading(false); return; }

    const imageUrl = await uploadImage(user.id);
    if (imageFile && !imageUrl) { setIsLoading(false); return; }

    const { error } = await supabase.from("products").insert({
      name, price: Number(price), stock: Number(stock),
      shipping_cost: shippingCost ? Number(shippingCost) : 0,
      image_url: imageUrl ?? null,
      supplier_id: supplier.id,
      category: category || null,
      description: description || null,
    });
    setIsLoading(false);
    if (error) setErrorMsg("Produkt konnte nicht gespeichert werden. Bitte erneut versuchen.");
    else window.location.href = "/supplier/dashboard/products";
  };

  return (
    <main style={{ minHeight:"100vh", background:BG, fontFamily:"'Inter','Helvetica Neue',system-ui,sans-serif", color:TEXT, paddingBottom:60 }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@600;700;800&family=Inter:wght@400;500;600;700&display=swap');
        input::placeholder,textarea::placeholder { color:${TEXT3}; }
        @keyframes spin { to { transform:rotate(360deg); } }
      `}</style>

      {/* Header */}
      <nav style={{ background:SURFACE, borderBottom:`1px solid ${BORDER}`, padding:"0 24px", height:60, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <img src="/flowio-icon.png" alt="Flowio" style={{ width: 30, height: 30, borderRadius: 7, objectFit: "cover" }} />
          <span style={{ fontFamily:"'Hanken Grotesk',sans-serif", fontWeight:800, fontSize:14, color:TEXT, letterSpacing:"-0.3px" }}>Flowio</span>
        </div>
        <a href="/supplier/dashboard/products" style={{ color:TEXT2, fontSize:13, textDecoration:"none", display:"flex", alignItems:"center", gap:6, fontWeight:500 }}>← Zurück zum Dashboard</a>
      </nav>

      <div style={{ maxWidth:680, margin:"0 auto", padding:"36px 24px" }}>
        <div style={{ marginBottom:32 }}>
          <p style={{ fontSize:11, fontWeight:700, color:TEXT3, letterSpacing:"2.5px", textTransform:"uppercase", marginBottom:8 }}>Lieferant-Dashboard</p>
          <h1 style={{ fontFamily:"'Hanken Grotesk',sans-serif", fontWeight:800, fontSize:28, color:TEXT, letterSpacing:"-0.8px", marginBottom:6 }}>Produkt hinzufügen</h1>
          <p style={{ color:TEXT2, fontSize:14 }}>Neues Produkt im Flowio Marktplatz listen.</p>
        </div>

        {errorMsg && (
          <div style={{ background:"#fef2f2", border:"1.5px solid #fca5a5", borderRadius:10, padding:"12px 16px", marginBottom:24 }}>
            <p style={{ color:"#dc2626", fontSize:13 }}>{errorMsg}</p>
          </div>
        )}

        <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
          {/* Produktdetails */}
          <div style={{ background:SURFACE, border:`1px solid ${BORDER}`, borderRadius:16, padding:"24px" }}>
            <h2 style={{ fontFamily:"'Hanken Grotesk',sans-serif", fontWeight:700, fontSize:14, color:TEXT, marginBottom:20 }}>Produktdetails</h2>
            <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
              <Field label="Name" required>
                <input type="text" placeholder="z.B. Club Mate 500ml" value={name} onChange={e => setName(e.target.value)} style={inputStyle()} onFocus={focus} onBlur={blur} />
              </Field>
              <Field label="Beschreibung">
                <textarea placeholder="Kurze Produktbeschreibung..." value={description} onChange={e => setDescription(e.target.value)} rows={3}
                  style={{ ...inputStyle(), resize:"none" }} onFocus={focus} onBlur={blur} />
              </Field>
              <Field label="Kategorie">
                <select value={category} onChange={e => setCategory(e.target.value)} style={{ ...inputStyle(), color:category?TEXT:TEXT3, cursor:"pointer" }} onFocus={focus} onBlur={blur}>
                  <option value="">Kategorie wählen</option>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </Field>
            </div>
          </div>

          {/* Produktbild */}
          <div style={{ background:SURFACE, border:`1px solid ${BORDER}`, borderRadius:16, padding:"24px" }}>
            <h2 style={{ fontFamily:"'Hanken Grotesk',sans-serif", fontWeight:700, fontSize:14, color:TEXT, marginBottom:20 }}>Produktbild</h2>

            {imagePreview ? (
              <div style={{ display:"flex", alignItems:"flex-start", gap:16 }}>
                <div style={{ width:120, height:120, borderRadius:14, overflow:"hidden", border:`1.5px solid ${BORDER}`, flexShrink:0 }}>
                  <img loading="lazy" decoding="async" src={imagePreview} alt="Vorschau" style={{ width:"100%", height:"100%", objectFit:"cover" }} />
                </div>
                <div style={{ flex:1 }}>
                  <p style={{ fontSize:13, fontWeight:600, color:TEXT, marginBottom:4 }}>{imageFile?.name}</p>
                  <p style={{ fontSize:12, color:TEXT3, marginBottom:14 }}>{imageFile ? (imageFile.size / 1024).toFixed(0) + " KB" : ""}</p>
                  <button onClick={() => { setImageFile(null); setImagePreview(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                    style={{ background:"none", border:`1.5px solid ${BORDER}`, borderRadius:8, padding:"7px 14px", fontSize:12, fontWeight:600, color:TEXT2, cursor:"pointer" }}>
                    Bild entfernen
                  </button>
                </div>
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={e => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0] ?? null); }}
                style={{ border:`2px dashed ${dragOver ? ORANGE : BORDER}`, borderRadius:14, padding:"36px 20px", textAlign:"center", cursor:"pointer", background: dragOver ? `${ORANGE}08` : BG, transition:"all 0.2s" }}>
                <div style={{ fontSize:36, marginBottom:12 }}>🖼️</div>
                <p style={{ fontSize:14, fontWeight:600, color:TEXT, marginBottom:6 }}>Bild auswählen oder hierher ziehen</p>
                <p style={{ fontSize:12, color:TEXT3 }}>JPG, PNG oder WebP · max. 5 MB</p>
                <div style={{ display:"inline-block", marginTop:16, background:ORANGE, color:"#fff", borderRadius:9, padding:"9px 22px", fontSize:13, fontWeight:700 }}>
                  Datei auswählen
                </div>
              </div>
            )}

            <input ref={fileInputRef} type="file" accept="image/*" style={{ display:"none" }}
              onChange={e => handleFile(e.target.files?.[0] ?? null)} />
          </div>

          {/* Preis & Lager */}
          <div style={{ background:SURFACE, border:`1px solid ${BORDER}`, borderRadius:16, padding:"24px" }}>
            <h2 style={{ fontFamily:"'Hanken Grotesk',sans-serif", fontWeight:700, fontSize:14, color:TEXT, marginBottom:20 }}>Preis & Lagerbestand</h2>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:16 }}>
              <Field label="Preis" required>
                <div style={{ position:"relative" }}>
                  <span style={{ position:"absolute", left:14, top:"50%", transform:"translateY(-50%)", color:TEXT3, fontSize:14, fontWeight:600 }}>€</span>
                  <input type="number" min="0" step="0.01" placeholder="0.00" value={price} onChange={e => setPrice(e.target.value)} style={{ ...inputStyle({ paddingLeft:30 }) }} onFocus={focus} onBlur={blur} />
                </div>
              </Field>
              <Field label="Lagerbestand" required>
                <input type="number" min="0" placeholder="0" value={stock} onChange={e => setStock(e.target.value)} style={inputStyle()} onFocus={focus} onBlur={blur} />
              </Field>
              <Field label="Versandkosten">
                <div style={{ position:"relative" }}>
                  <span style={{ position:"absolute", left:14, top:"50%", transform:"translateY(-50%)", color:TEXT3, fontSize:14, fontWeight:600 }}>€</span>
                  <input type="number" min="0" step="0.01" placeholder="0.00" value={shippingCost} onChange={e => setShippingCost(e.target.value)} style={{ ...inputStyle({ paddingLeft:30 }) }} onFocus={focus} onBlur={blur} />
                </div>
              </Field>
            </div>
            <p style={{ fontSize:12, color:TEXT3, marginTop:10 }}>Einmalig pro Bestellposition, egal wie viele Stück bestellt werden. Leer lassen für kostenlosen Versand.</p>
          </div>

          {/* Actions */}
          <div style={{ display:"flex", justifyContent:"flex-end", gap:10, paddingTop:4 }}>
            <a href="/supplier/dashboard/products" style={{ background:"none", border:`1.5px solid ${BORDER}`, color:TEXT2, borderRadius:10, padding:"12px 22px", fontSize:14, fontWeight:600, textDecoration:"none", display:"inline-flex", alignItems:"center" }}>Abbrechen</a>
            <button onClick={addProduct} disabled={isLoading}
              style={{ background:isLoading?"rgba(0,62,199,0.55)":ORANGE, color:"#fff", border:"none", borderRadius:10, padding:"12px 28px", fontSize:14, fontFamily:"inherit", fontWeight:700, cursor:isLoading?"not-allowed":"pointer", transition:"opacity 0.2s", boxShadow:`0 4px 14px rgba(0,62,199,0.25)`, display:"flex", alignItems:"center", gap:8 }}>
              {isLoading && <div style={{ width:14, height:14, border:"2px solid rgba(255,255,255,0.4)", borderTopColor:"#fff", borderRadius:"50%", animation:"spin 0.8s linear infinite" }} />}
              {uploadProgress ? "Bild wird hochgeladen..." : isLoading ? "Wird gespeichert..." : "Produkt speichern →"}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
