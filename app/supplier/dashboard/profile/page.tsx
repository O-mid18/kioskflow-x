"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

const BG = "var(--kf-bg)";
const SURFACE = "var(--kf-surface)";
const BORDER = "var(--kf-border)";
const TEXT = "var(--kf-text)";
const TEXT2 = "var(--kf-text2)";
const TEXT3 = "var(--kf-text3)";
const ORANGE = "#E8521A";

function inputStyle(extra?: object) {
  return {
    width:"100%", background:SURFACE, border:`1.5px solid ${BORDER}`, borderRadius:10,
    padding:"12px 14px", color:TEXT, fontSize:14, fontFamily:"inherit",
    boxSizing:"border-box" as const, transition:"border-color 0.2s",
    ...extra,
  };
}

export default function SupplierProfilePage() {
  const [name,        setName]        = useState("");
  const [description, setDescription] = useState("");
  const [email,       setEmail]       = useState("");
  const [logoUrl,     setLogoUrl]     = useState("");
  const [saving,      setSaving]      = useState(false);
  const [loading,     setLoading]     = useState(true);
  const [msg,         setMsg]         = useState<{text:string;ok:boolean}|null>(null);
  const [supplierId,  setSupplierId]  = useState<string|null>(null);

  useEffect(() => {
    const load = async () => {
      const { data:{user} } = await supabase.auth.getUser();
      if (!user) { window.location.href="/login"; return; }
      setEmail(user.email ?? "");
      const { data } = await supabase.from("suppliers").select("*").eq("user_id",user.id).maybeSingle();
      if (data) {
        setSupplierId(data.id);
        setName(data.name ?? "");
        setDescription(data.description ?? "");
        setLogoUrl(data.logo_url ?? "");
      }
      setLoading(false);
    };
    load();
  }, []);

  const save = async () => {
    if (!supplierId) return;
    setSaving(true);
    const { error } = await supabase.from("suppliers").update({ name, description, logo_url:logoUrl||null }).eq("id",supplierId);
    setSaving(false);
    if (error) setMsg({ text:error.message, ok:false });
    else setMsg({ text:"Profil erfolgreich gespeichert!", ok:true });
    setTimeout(() => setMsg(null), 3000);
  };

  const signOut = async () => { await supabase.auth.signOut(); window.location.href="/login"; };

  if (loading) {
    return (
      <div style={{ display:"flex",alignItems:"center",justifyContent:"center",height:"100vh" }}>
        <style>{`@keyframes spin{to{transform:rotate(360deg);}}`}</style>
        <div style={{ width:36,height:36,border:`3px solid ${BORDER}`,borderTopColor:ORANGE,borderRadius:"50%",animation:"spin 0.8s linear infinite" }} />
      </div>
    );
  }

  const initials = name.split(" ").map(w=>w[0]).slice(0,2).join("").toUpperCase() || "S";

  return (
    <div style={{ padding:"32px 32px 60px", maxWidth:720 }}>
      <div style={{ marginBottom:32 }}>
        <p style={{ fontSize:11, fontWeight:700, color:TEXT3, letterSpacing:"2.5px", textTransform:"uppercase", marginBottom:8 }}>Lieferant-Dashboard</p>
        <h1 style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:26, color:TEXT, letterSpacing:"-0.8px" }}>Mein Profil</h1>
        <p style={{ fontSize:13, color:TEXT2, marginTop:4 }}>Verwalte deine Markeninfo und Kontodaten.</p>
      </div>

      {msg && (
        <div style={{ background:msg.ok?"#f0fdf4":"#fef2f2", border:`1.5px solid ${msg.ok?"#bbf7d0":"#fca5a5"}`, borderRadius:10, padding:"12px 16px", marginBottom:24 }}>
          <p style={{ color:msg.ok?"#16a34a":"#dc2626", fontSize:13, fontWeight:600 }}>{msg.text}</p>
        </div>
      )}

      {/* Avatar + brand preview */}
      <div style={{ background:SURFACE, border:`1px solid ${BORDER}`, borderRadius:18, padding:"28px 28px 24px", marginBottom:16 }}>
        <div style={{ display:"flex", alignItems:"center", gap:20, marginBottom:24, paddingBottom:24, borderBottom:`1px solid ${BORDER}` }}>
          <div style={{ position:"relative" }}>
            {logoUrl ? (
              <div style={{ width:72, height:72, borderRadius:16, overflow:"hidden", border:`2px solid ${BORDER}` }}>
                <img src={logoUrl} alt="Logo" style={{ width:"100%", height:"100%", objectFit:"cover" }}
                  onError={e => { (e.currentTarget as HTMLImageElement).style.display="none"; }} />
              </div>
            ) : (
              <div style={{ width:72, height:72, borderRadius:16, background:`${ORANGE}20`, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:26, color:ORANGE }}>
                {initials}
              </div>
            )}
          </div>
          <div>
            <p style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:20, color:TEXT, marginBottom:3 }}>{name || "Dein Markenname"}</p>
            <p style={{ fontSize:13, color:TEXT2 }}>{email}</p>
            <span style={{ display:"inline-block", marginTop:6, background:`${ORANGE}15`, color:ORANGE, fontSize:11, fontWeight:700, padding:"3px 10px", borderRadius:100 }}>Lieferant</span>
          </div>
        </div>

        <h2 style={{ fontFamily:"'Syne',sans-serif", fontWeight:700, fontSize:14, color:TEXT, marginBottom:18 }}>Markeninformationen</h2>
        <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
          <div>
            <label style={{ display:"block", fontSize:12, fontWeight:600, color:TEXT2, marginBottom:7 }}>Markenname</label>
            <input type="text" value={name} onChange={e=>setName(e.target.value)} placeholder="z.B. BerlinBrews GmbH"
              style={inputStyle()}
              onFocus={e=>{e.currentTarget.style.borderColor=ORANGE;e.currentTarget.style.boxShadow=`0 0 0 3px ${ORANGE}18`;}}
              onBlur={e=>{e.currentTarget.style.borderColor=BORDER;e.currentTarget.style.boxShadow="none";}} />
          </div>
          <div>
            <label style={{ display:"block", fontSize:12, fontWeight:600, color:TEXT2, marginBottom:7 }}>Beschreibung</label>
            <textarea value={description} onChange={e=>setDescription(e.target.value)} rows={3} placeholder="Kurze Beschreibung deiner Marke..."
              style={{ ...inputStyle(), resize:"none" }}
              onFocus={e=>{e.currentTarget.style.borderColor=ORANGE;e.currentTarget.style.boxShadow=`0 0 0 3px ${ORANGE}18`;}}
              onBlur={e=>{e.currentTarget.style.borderColor=BORDER;e.currentTarget.style.boxShadow="none";}} />
          </div>
          <div>
            <label style={{ display:"block", fontSize:12, fontWeight:600, color:TEXT2, marginBottom:7 }}>Logo-URL</label>
            <input type="text" value={logoUrl} onChange={e=>setLogoUrl(e.target.value)} placeholder="https://example.com/logo.png"
              style={inputStyle()}
              onFocus={e=>{e.currentTarget.style.borderColor=ORANGE;e.currentTarget.style.boxShadow=`0 0 0 3px ${ORANGE}18`;}}
              onBlur={e=>{e.currentTarget.style.borderColor=BORDER;e.currentTarget.style.boxShadow="none";}} />
          </div>
        </div>
      </div>

      {/* Account card */}
      <div style={{ background:SURFACE, border:`1px solid ${BORDER}`, borderRadius:18, padding:"22px 28px", marginBottom:16 }}>
        <h2 style={{ fontFamily:"'Syne',sans-serif", fontWeight:700, fontSize:14, color:TEXT, marginBottom:16 }}>Konto</h2>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", paddingBottom:14, borderBottom:`1px solid ${BORDER}`, marginBottom:14 }}>
          <div>
            <p style={{ fontSize:13, fontWeight:600, color:TEXT }}>E-Mail-Adresse</p>
            <p style={{ fontSize:13, color:TEXT2, marginTop:2 }}>{email}</p>
          </div>
          <span style={{ fontSize:11, fontWeight:700, color:"#16a34a", background:"#f0fdf4", padding:"3px 10px", borderRadius:100 }}>Verifiziert</span>
        </div>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div>
            <p style={{ fontSize:13, fontWeight:600, color:TEXT }}>Passwort</p>
            <p style={{ fontSize:13, color:TEXT2, marginTop:2 }}>Zuletzt geändert: —</p>
          </div>
          <button style={{ fontSize:13, color:ORANGE, fontWeight:700, background:"none", border:"none", cursor:"pointer" }}>Ändern</button>
        </div>
      </div>

      {/* Actions */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <button onClick={signOut} style={{ background:"none", border:`1.5px solid ${BORDER}`, color:TEXT2, borderRadius:10, padding:"11px 20px", fontSize:13, fontWeight:600, cursor:"pointer" }}>
          Abmelden ⏏
        </button>
        <button onClick={save} disabled={saving}
          style={{ background:saving?`rgba(232,82,26,0.55)`:ORANGE, color:"#fff", border:"none", borderRadius:10, padding:"12px 28px", fontSize:14, fontWeight:700, cursor:saving?"not-allowed":"pointer", boxShadow:`0 4px 14px rgba(232,82,26,0.25)` }}>
          {saving ? "Wird gespeichert..." : "Änderungen speichern →"}
        </button>
      </div>
    </div>
  );
}
