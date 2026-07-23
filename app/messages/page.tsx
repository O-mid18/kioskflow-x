"use client";

import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase";

const BG = "var(--kf-bg)";
const SURFACE = "var(--kf-surface)";
const BORDER = "var(--kf-border)";
const TEXT = "var(--kf-text)";
const TEXT2 = "var(--kf-text2)";
const TEXT3 = "var(--kf-text3)";
const ORANGE = "#003ec7";

type Conv = { id: string; supplier_id: string; supplier_name: string; last_message?: string; };
type Msg  = { id: string; sender_id: string; content: string; created_at: string; };
type Sup  = { id: string; name: string; };

export default function BuyerMessagesPage() {
  const [userId, setUserId]       = useState<string | null>(null);
  const [convs, setConvs]         = useState<Conv[]>([]);
  const [active, setActive]       = useState<Conv | null>(null);
  const [msgs, setMsgs]           = useState<Msg[]>([]);
  const [text, setText]           = useState("");
  const [loading, setLoading]     = useState(true);
  const [suppliers, setSuppliers] = useState<Sup[]>([]);
  const [showNew, setShowNew]     = useState(false);
  const [isAdmin, setIsAdmin]     = useState(false);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const endRef     = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { window.location.href = "/login"; return; }
      const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
      if (profile?.role === "supplier") { window.location.href = "/supplier/dashboard/messages"; return; }
      setIsAdmin(profile?.role === "admin");
      setUserId(user.id);
      await loadConvs(user.id);
      setLoading(false);
    });
    return () => { if (channelRef.current) supabase.removeChannel(channelRef.current); };
  }, []);

  const loadConvs = async (uid: string) => {
    const { data } = await supabase.from("conversations").select("id, supplier_id, created_at").eq("buyer_id", uid).order("created_at", { ascending: false });
    if (!data?.length) { setConvs([]); return; }
    const ids = data.map((c: any) => c.supplier_id);
    const { data: profs } = await supabase.from("profiles").select("id, full_name, company_name").in("id", ids);
    const nameMap: Record<string, string> = {};
    (profs ?? []).forEach((p: any) => { nameMap[p.id] = p.company_name || p.full_name || "Lieferant"; });
    const enriched = await Promise.all(data.map(async (c: any) => {
      const { data: lm } = await supabase.from("messages").select("content").eq("conversation_id", c.id).order("created_at", { ascending: false }).limit(1).maybeSingle();
      return { id: c.id, supplier_id: c.supplier_id, supplier_name: nameMap[c.supplier_id] ?? "Lieferant", last_message: lm?.content };
    }));
    setConvs(enriched);
  };

  const openConv = async (conv: Conv) => {
    setActive(conv);
    if (channelRef.current) supabase.removeChannel(channelRef.current);
    const { data } = await supabase.from("messages").select("*").eq("conversation_id", conv.id).order("created_at", { ascending: true });
    setMsgs(data ?? []);
    const ch = supabase.channel(`msgs-${conv.id}-${Date.now()}`).on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${conv.id}` }, p => {
      setMsgs(prev => [...prev, p.new as Msg]);
    }).subscribe();
    channelRef.current = ch;
    setTimeout(() => endRef.current?.scrollIntoView(), 100);
  };

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs]);

  const send = async () => {
    if (!text.trim() || !active || !userId) return;
    const content = text.trim();
    const { error } = await supabase.from("messages").insert({ conversation_id: active.id, sender_id: userId, content });
    if (!error) {
      setText("");
      setConvs(prev => prev.map(c => c.id === active.id ? { ...c, last_message: content } : c));
    }
  };

  const loadSuppliers = async () => {
    const { data } = await supabase
      .from("suppliers")
      .select("user_id, name")
      .eq("verified", true)
      .order("name", { ascending: true })
      .limit(50);
    setSuppliers((data ?? []).map((s: any) => ({ id: s.user_id, name: s.name })));
    setShowNew(true);
  };

  const startConv = async (suppId: string, suppName: string) => {
    if (!userId) return;
    await supabase.from("conversations").upsert({ buyer_id: userId, supplier_id: suppId }, { onConflict: "buyer_id,supplier_id" });
    const { data } = await supabase.from("conversations").select("id").eq("buyer_id", userId).eq("supplier_id", suppId).maybeSingle();
    setShowNew(false);
    if (data) {
      await loadConvs(userId);
      openConv({ id: data.id, supplier_id: suppId, supplier_name: suppName });
    }
  };

  const fmt = (s: string) => new Date(s).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });

  if (loading) return (
    <main style={{ minHeight: "100vh", background: BG, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{ width: 32, height: 32, border: `3px solid ${BORDER}`, borderTopColor: ORANGE, borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
    </main>
  );

  return (
    <main style={{ height: "100vh", background: BG, fontFamily: "'Inter',system-ui,sans-serif", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Manrope:wght@600;700;800&family=Inter:wght@400;500;600;700&display=swap'); @keyframes spin{to{transform:rotate(360deg)}}`}</style>

      {/* Nav */}
      <nav style={{ background: SURFACE, borderBottom: `1px solid ${BORDER}`, padding: "0 20px", height: 60, display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0, zIndex: 10 }}>
        <a href="/marketplace" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none" }}>
          <img src="/flowio-icon.png" alt="Flowio" style={{ width: 30, height: 30, borderRadius: 7, objectFit: "cover" }} />
          <span style={{ fontFamily: "'Manrope',sans-serif", fontWeight: 800, fontSize: 14, color: TEXT, letterSpacing: "-0.3px" }}>Flowio</span>
        </a>
        <p style={{ fontFamily: "'Manrope',sans-serif", fontWeight: 700, fontSize: 15, color: TEXT }}>Nachrichten</p>
        {isAdmin
          ? <a href="/owner/dashboard" title="Owner-Panel" style={{ background:`${ORANGE}15`, color:ORANGE, fontWeight:700, fontSize:13, textDecoration:"none", padding:"6px 12px", borderRadius:8 }}>🏛️</a>
          : <div style={{ width: 80 }} />}
      </nav>

      {/* Body */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

        {/* LEFT — conversation list */}
        <div style={{ width: 280, flexShrink: 0, borderRight: `1px solid ${BORDER}`, background: SURFACE, display: "flex", flexDirection: "column" }}>
          <div style={{ padding: 14, borderBottom: `1px solid ${BORDER}` }}>
            <button onClick={loadSuppliers} style={{ width: "100%", background: ORANGE, color: "#fff", border: "none", borderRadius: 10, padding: "10px", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>
              + Neue Unterhaltung
            </button>
          </div>
          <div style={{ flex: 1, overflowY: "auto" }}>
            {convs.length === 0 ? (
              <div style={{ padding: "48px 20px", textAlign: "center" }}>
                <p style={{ fontSize: 36, marginBottom: 8 }}>💬</p>
                <p style={{ color: TEXT3, fontSize: 13 }}>Noch keine Gespräche</p>
              </div>
            ) : convs.map(c => (
              <div key={c.id} onClick={() => openConv(c)} style={{ padding: "14px 16px", borderBottom: `1px solid ${BORDER}`, cursor: "pointer", background: active?.id === c.id ? `${ORANGE}10` : "transparent", borderLeft: `3px solid ${active?.id === c.id ? ORANGE : "transparent"}`, transition: "background 0.15s" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 38, height: 38, background: `${ORANGE}20`, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Manrope',sans-serif", fontWeight: 800, fontSize: 15, color: ORANGE, flexShrink: 0 }}>
                    {c.supplier_name[0]?.toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: TEXT, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.supplier_name}</p>
                    <p style={{ fontSize: 12, color: TEXT3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginTop: 2 }}>{c.last_message ?? "Noch keine Nachrichten"}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT — chat */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          {active ? (
            <>
              <div style={{ padding: "0 20px", height: 56, borderBottom: `1px solid ${BORDER}`, display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
                <div style={{ width: 36, height: 36, background: `${ORANGE}20`, borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Manrope',sans-serif", fontWeight: 800, fontSize: 14, color: ORANGE, flexShrink: 0 }}>
                  {active.supplier_name[0]?.toUpperCase()}
                </div>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 700, color: TEXT }}>{active.supplier_name}</p>
                  <p style={{ fontSize: 11, color: TEXT3 }}>Lieferant</p>
                </div>
              </div>

              <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px", display: "flex", flexDirection: "column", gap: 10 }}>
                {msgs.map(m => {
                  const mine = m.sender_id === userId;
                  return (
                    <div key={m.id} style={{ display: "flex", justifyContent: mine ? "flex-end" : "flex-start" }}>
                      <div style={{ maxWidth: "70%", background: mine ? ORANGE : SURFACE, border: mine ? "none" : `1px solid ${BORDER}`, color: mine ? "#fff" : TEXT, borderRadius: mine ? "16px 16px 4px 16px" : "16px 16px 16px 4px", padding: "10px 14px" }}>
                        <p style={{ fontSize: 14, lineHeight: 1.5, wordBreak: "break-word" }}>{m.content}</p>
                        <p style={{ fontSize: 10, marginTop: 4, opacity: 0.7, textAlign: mine ? "right" : "left" }}>{fmt(m.created_at)}</p>
                      </div>
                    </div>
                  );
                })}
                <div ref={endRef} />
              </div>

              <div style={{ padding: "12px 20px", borderTop: `1px solid ${BORDER}`, display: "flex", gap: 10, flexShrink: 0 }}>
                <input value={text} onChange={e => setText(e.target.value)} maxLength={2000}
                  onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
                  placeholder="Nachricht schreiben..."
                  style={{ flex: 1, background: SURFACE, border: `1.5px solid ${BORDER}`, borderRadius: 10, padding: "10px 14px", color: TEXT, fontSize: 14, fontFamily: "inherit", outline: "none" }}
                  onFocus={e => e.currentTarget.style.borderColor = ORANGE}
                  onBlur={e => e.currentTarget.style.borderColor = BORDER} />
                <button onClick={send} style={{ background: ORANGE, color: "#fff", border: "none", borderRadius: 10, padding: "10px 20px", fontWeight: 700, fontSize: 16, cursor: "pointer" }}>→</button>
              </div>
            </>
          ) : (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12 }}>
              <p style={{ fontSize: 52 }}>💬</p>
              <p style={{ fontFamily: "'Manrope',sans-serif", fontWeight: 800, fontSize: 20, color: TEXT }}>Nachrichten</p>
              <p style={{ color: TEXT2, fontSize: 14 }}>Wähle ein Gespräch oder starte ein neues.</p>
            </div>
          )}
        </div>
      </div>

      {/* New conversation modal */}
      {showNew && (
        <>
          <div onClick={() => setShowNew(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 50 }} />
          <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 16, padding: 24, width: 340, maxHeight: "70vh", overflowY: "auto", zIndex: 51 }}>
            <p style={{ fontFamily: "'Manrope',sans-serif", fontWeight: 800, fontSize: 16, color: TEXT, marginBottom: 16 }}>Lieferant auswählen</p>
            {suppliers.length === 0 ? (
              <p style={{ color: TEXT3, fontSize: 13 }}>Keine Lieferanten gefunden</p>
            ) : suppliers.map(s => (
              <div key={s.id} onClick={() => startConv(s.id, s.name)} style={{ padding: "12px 14px", borderRadius: 10, cursor: "pointer", display: "flex", alignItems: "center", gap: 10, marginBottom: 6, background: BG, border: `1px solid ${BORDER}` }}
                onMouseEnter={e => e.currentTarget.style.borderColor = ORANGE}
                onMouseLeave={e => e.currentTarget.style.borderColor = BORDER}>
                <div style={{ width: 36, height: 36, background: `${ORANGE}20`, borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Manrope',sans-serif", fontWeight: 800, fontSize: 14, color: ORANGE }}>
                  {s.name[0]?.toUpperCase()}
                </div>
                <p style={{ fontSize: 14, fontWeight: 600, color: TEXT }}>{s.name}</p>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Bottom nav */}
      <nav style={{ flexShrink: 0, background: SURFACE, borderTop: `1px solid ${BORDER}`, display: "flex", height: 56 }}>
        {[
          { href: "/marketplace", icon: "🏪", label: "Marktplatz" },
          { href: "/cart", icon: "🛒", label: "Warenkorb" },
          { href: "/orders", icon: "📦", label: "Bestellungen" },
          { href: "/messages", icon: "💬", label: "Nachrichten", active: true },
          { href: "/profile", icon: "👤", label: "Profil" },
        ].map(item => (
          <a key={item.href} href={item.href} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2, textDecoration: "none", color: item.active ? ORANGE : TEXT3 }}>
            <span style={{ fontSize: 20 }}>{item.icon}</span>
            <span style={{ fontSize: 10, fontWeight: item.active ? 700 : 500 }}>{item.label}</span>
          </a>
        ))}
      </nav>
    </main>
  );
}
