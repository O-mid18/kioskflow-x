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
const ORANGE = "#E8521A";

const CATEGORIES = ["Energy","Cola","Bio","Snacks","Limo","Getränke"];

function Field({ label, required, children }: { label:string; required?:boolean; children:React.ReactNode }) {
  return (
    <div>
      <label style={{ display:"block", fontSize:12, fontWeight:600, color:TEXT2, marginBottom:7 }}>
        {label}{required && <span style={{ color:ORANGE, marginLeft:3 }}>*</span>}
      </label>
      {children}
    </div>
  );
}

function inputStyle(extra?: object) {
  return { width:"100%", background:SURFACE, border:`1.5px solid ${BORDER}`, borderRadius:10, padding:"12px 15px", color:TEXT, fontSize:14, boxSizing:"border-box" as const, transition:"border-color 0.2s, box-shadow 0.2s", fontFamily:"inherit", ...extra };
}

export default function EditProductPage() {
  const params = useParams();
  const router = useRouter();
  const [name, setName]               = useState("");
  const [price, setPrice]             = useState("");
  const [stock, setStock]             = useState("");
  const [existingImageUrl, setExistingImageUrl] = useState("");
  const [imageFile, setImageFile]     = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [category, setCategory]       = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading]         = useState(true);
  const [saving, setSaving]           = useState(false);
  const [errorMsg, setErrorMsg]       = useState("");
  const [dragOver, setDragOver]       = useState(false);
  const fileInputRef                  = useRef<HTMLInputElement>(null);

  const focus = (e: React.FocusEvent<HTMLInputElement|HTMLTextAreaElement|HTMLSelectElement>) => {
    e.currentTarget.style.borderColor = ORANGE;
    e.currentTarget.style.boxShadow = "0 0 0 3px rgba(232,82,26,0.1)";
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
        setExistingImageUrl(data.image_url || "");
        setCategory(data.category || "");
        setDescription(data.description || "");
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
    if (error) { setErrorMsg("Bild-Upload fehlgeschlagen: " + error.message); return null; }
    const { data } = supabase.storage.from("product-images").getPublicUrl(path);
    return data.publicUrl;
  };

  const updateProduct = async () => {
    setErrorMsg("");
    if (!name || !price || !stock) { setErrorMsg("Name, Preis und Lagerbestand sind Pflichtfelder."); return; }
    setSaving(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setErrorMsg("Bitte zuerst einloggen."); setSaving(false); return; }

    let finalImageUrl = existingImageUrl;
    if (imageFile) {
      const uploaded = await uploadImage(user.id);
      if (!uploaded) { setSaving(false); return; }
      finalImageUrl = uploaded;
    }

    const { error } = await supabase.from("products").update({
      name, price: Number(price), stock: Number(stock),
      image_url: finalImageUrl || null,
      category: category || null,
      description: description || null,
    }).eq("id", String(params.id));

    setSaving(false);
    if (error) setErrorMsg(error.message);
    else router.push("/supplier");
  };

  const shownPreview = imagePreview ?? (existingImageUrl || null);

  if (loading) {
    return (
      <main style={{ minHeight:"100vh", background:BG, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'DM Sans',system-ui,sans-serif" }}>
        <style>{`@keyframes spin { to { transform:rotate(360deg); } }`}</style>
        <div style={{ textAlign:"center" }}>
          <div style={{ width:36, height:36, border:`3px solid ${BORDER}`, borderTopColor:ORANGE, borderRadius:"50%", animation:"spin 0.8s linear infinite", margin:"0 auto 14px" }} />
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
          <div style={{ width:30, height:30, background:ORANGE, borderRadius:7, display:"flex", alignItems:"center", justifyContent:"center", fontWeight:900, fontSize:14, color:"#fff", fontFamily:"'Syne',sans-serif" }}>K</div>
          <span style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:14, color:TEXT, letterSpacing:"-0.3px" }}>KioskFlow</span>
        </div>
        <a href="/supplier" style={{ color:TEXT2, fontSize:13, textDecoration:"none", display:"flex", alignItems:"center", gap:6, fontWeight:500 }}>← Zurück zum Dashboard</a>
      </nav>

      <div style={{ maxWidth:680, margin:"0 auto", padding:"36px 24px" }}>
        <div style={{ marginBottom:32 }}>
          <p style={{ fontSize:11, fontWeight:700, color:TEXT3, letterSpacing:"2.5px", textTransform:"uppercase", marginBottom:8 }}>Lieferant-Dashboard</p>
          <h1 style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:28, color:TEXT, letterSpacing:"-0.8px", marginBottom:6 }}>Produkt bearbeiten</h1>
          <p style={{ color:TEXT2, fontSize:14 }}>Änderungen werden sofort im Marktplatz übernommen.</p>
        </div>

        {errorMsg && (
          <div style={{ background:"#fef2f2", border:"1.5px solid #fca5a5", borderRadius:10, padding:"12px 16px", marginBottom:24 }}>
            <p style={{ color:"#dc2626", fontSize:13 }}>{errorMsg}</p>
          </div>
        )}

        <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
          {/* Produktdetails */}
          <div style={{ background:SURFACE, border:`1px solid ${BORDER}`, borderRadius:16, padding:"24px" }}>
            <h2 style={{ fontFamily:"'Syne',sans-serif", fontWeight:700, fontSize:14, color:TEXT, marginBottom:20 }}>Produktdetails</h2>
            <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
              <Field label="Name" required>
                <input type="text" value={name} onChange={e => setName(e.target.value)} style={inputStyle()} onFocus={focus} onBlur={blur} />
              </Field>
              <Field label="Beschreibung">
                <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} style={{ ...inputStyle(), resize:"none" }} onFocus={focus} onBlur={blur} />
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
            <h2 style={{ fontFamily:"'Syne',sans-serif", fontWeight:700, fontSize:14, color:TEXT, marginBottom:20 }}>Produktbild</h2>

            {shownPreview ? (
              <div style={{ display:"flex", alignItems:"flex-start", gap:16 }}>
                <div style={{ width:120, height:120, borderRadius:14, overflow:"hidden", border:`1.5px solid ${BORDER}`, flexShrink:0 }}>
                  <img src={shownPreview} alt="Vorschau" style={{ width:"100%", height:"100%", objectFit:"cover" }}
                    onError={e => { e.currentTarget.src = "https://images.unsplash.com/photo-1568702846914-96b305d2aaeb?w=200&q=80"; }} />
                </div>
                <div style={{ flex:1 }}>
                  <p style={{ fontSize:13, fontWeight:600, color:TEXT, marginBottom:4 }}>
                    {imageFile ? imageFile.name : "Aktuelles Bild"}
                  </p>
                  {imageFile && <p style={{ fontSize:12, color:TEXT3, marginBottom:14 }}>{(imageFile.size / 1024).toFixed(0)} KB</p>}
                  <div style={{ display:"flex", gap:8, marginTop: imageFile ? 0 : 14 }}>
                    <button onClick={() => fileInputRef.current?.click()}
                      style={{ background:ORANGE, border:"none", borderRadius:8, padding:"7px 14px", fontSize:12, fontWeight:700, color:"#fff", cursor:"pointer" }}>
                      Bild ersetzen
                    </button>
                    <button onClick={() => { setImageFile(null); setImagePreview(null); setExistingImageUrl(""); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                      style={{ background:"none", border:`1.5px solid ${BORDER}`, borderRadius:8, padding:"7px 14px", fontSize:12, fontWeight:600, color:TEXT2, cursor:"pointer" }}>
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
            <h2 style={{ fontFamily:"'Syne',sans-serif", fontWeight:700, fontSize:14, color:TEXT, marginBottom:20 }}>Preis & Lagerbestand</h2>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
              <Field label="Preis" required>
                <div style={{ position:"relative" }}>
                  <span style={{ position:"absolute", left:14, top:"50%", transform:"translateY(-50%)", color:TEXT3, fontSize:14, fontWeight:600 }}>€</span>
                  <input type="number" min="0" step="0.01" value={price} onChange={e => setPrice(e.target.value)} style={{ ...inputStyle({ paddingLeft:30 }) }} onFocus={focus} onBlur={blur} />
                </div>
              </Field>
              <Field label="Lagerbestand" required>
                <input type="number" min="0" value={stock} onChange={e => setStock(e.target.value)} style={inputStyle()} onFocus={focus} onBlur={blur} />
              </Field>
            </div>
          </div>

          {/* Actions */}
          <div style={{ display:"flex", justifyContent:"flex-end", gap:10, paddingTop:4 }}>
            <a href="/supplier" style={{ background:"none", border:`1.5px solid ${BORDER}`, color:TEXT2, borderRadius:10, padding:"12px 22px", fontSize:14, fontWeight:600, textDecoration:"none", display:"inline-flex", alignItems:"center" }}>Abbrechen</a>
            <button onClick={updateProduct} disabled={saving}
              style={{ background:saving?"rgba(232,82,26,0.55)":ORANGE, color:"#fff", border:"none", borderRadius:10, padding:"12px 28px", fontSize:14, fontFamily:"inherit", fontWeight:700, cursor:saving?"not-allowed":"pointer", transition:"opacity 0.2s", boxShadow:`0 4px 14px rgba(232,82,26,0.25)`, display:"flex", alignItems:"center", gap:8 }}>
              {saving && <div style={{ width:14, height:14, border:"2px solid rgba(255,255,255,0.4)", borderTopColor:"#fff", borderRadius:"50%", animation:"spin 0.8s linear infinite" }} />}
              {saving ? "Wird gespeichert..." : "Änderungen speichern →"}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
