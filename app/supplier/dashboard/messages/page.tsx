"use client";

import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase";

const BG = "var(--kf-bg)";
const SURFACE = "var(--kf-surface)";
const BORDER = "var(--kf-border)";
const TEXT = "var(--kf-text)";
const TEXT2 = "var(--kf-text2)";
const TEXT3 = "var(--kf-text3)";
const ORANGE = "#E8521A";

type Conv = { id: string; buyer_id: string; buyer_name: string; last_message?: string; };
type Msg  = { id: string; sender_id: string; content: string; created_at: string; };

export default function SupplierMessagesPage() {
  const [userId, setUserId]   = useState<string | null>(null);
  const [convs, setConvs]     = useState<Conv[]>([]);
  const [active, setActive]   = useState<Conv | null>(null);
  const [msgs, setMsgs]       = useState<Msg[]>([]);
  const [text, setText]       = useState("");
  const [loading, setLoading] = useState(true);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const endRef     = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { window.location.href = "/login"; return; }
      setUserId(user.id);
      await loadConvs(user.id);
      setLoading(false);
    });
    return () => { if (channelRef.current) supabase.removeChannel(channelRef.current); };
  }, []);

  const loadConvs = async (uid: string) => {
    const { data } = await supabase.from("conversations").select("id, buyer_id, created_at").eq("supplier_id", uid).order("created_at", { ascending: false });
    if (!data?.length) { setConvs([]); return; }
    const ids = data.map((c: any) => c.buyer_id);
    const { data: profs } = await supabase.from("profiles").select("id, full_name, company_name").in("id", ids);
    const nameMap: Record<string, string> = {};
    (profs ?? []).forEach((p: any) => { nameMap[p.id] = p.full_name || p.company_name || "Käufer"; });
    const enriched = await Promise.all(data.map(async (c: any) => {
      const { data: lm } = await supabase.from("messages").select("content").eq("conversation_id", c.id).order("created_at", { ascending: false }).limit(1).single();
      return { id: c.id, buyer_id: c.buyer_id, buyer_name: nameMap[c.buyer_id] ?? "Käufer", last_message: lm?.content };
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
    setText("");
    await supabase.from("messages").insert({ conversation_id: active.id, sender_id: userId, content });
  };

  const fmt = (s: string) => new Date(s).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });

  if (loading) return (
    <div style={{ minHeight: "100vh", background: BG, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{ width: 32, height: 32, border: `3px solid ${BORDER}`, borderTopColor: ORANGE, borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
    </div>
  );

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", fontFamily: "'DM Sans',system-ui,sans-serif" }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      {/* Header */}
      <div style={{ padding: "0 24px", height: 64, borderBottom: `1px solid ${BORDER}`, display: "flex", alignItems: "center", background: SURFACE, flexShrink: 0 }}>
        <p style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 18, color: TEXT }}>Nachrichten</p>
        {convs.length > 0 && <span style={{ marginLeft: 10, background: `${ORANGE}20`, color: ORANGE, fontSize: 12, fontWeight: 700, padding: "2px 10px", borderRadius: 100 }}>{convs.length}</span>}
      </div>

      {/* Body */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

        {/* LEFT */}
        <div style={{ width: 280, flexShrink: 0, borderRight: `1px solid ${BORDER}`, background: SURFACE, overflowY: "auto" }}>
          {convs.length === 0 ? (
            <div style={{ padding: "48px 20px", textAlign: "center" }}>
              <p style={{ fontSize: 36, marginBottom: 8 }}>💬</p>
              <p style={{ color: TEXT3, fontSize: 13 }}>Noch keine Nachrichten</p>
              <p style={{ color: TEXT3, fontSize: 12, marginTop: 6 }}>Käufer können dir schreiben.</p>
            </div>
          ) : convs.map(c => (
            <div key={c.id} onClick={() => openConv(c)} style={{ padding: "14px 16px", borderBottom: `1px solid ${BORDER}`, cursor: "pointer", background: active?.id === c.id ? `${ORANGE}10` : "transparent", borderLeft: `3px solid ${active?.id === c.id ? ORANGE : "transparent"}`, transition: "background 0.15s" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 38, height: 38, background: `${ORANGE}20`, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 15, color: ORANGE, flexShrink: 0 }}>
                  {c.buyer_name[0]?.toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: TEXT, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.buyer_name}</p>
                  <p style={{ fontSize: 12, color: TEXT3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginTop: 2 }}>{c.last_message ?? "Noch keine Nachrichten"}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* RIGHT */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          {active ? (
            <>
              <div style={{ padding: "0 20px", height: 56, borderBottom: `1px solid ${BORDER}`, display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
                <div style={{ width: 36, height: 36, background: `${ORANGE}20`, borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 14, color: ORANGE, flexShrink: 0 }}>
                  {active.buyer_name[0]?.toUpperCase()}
                </div>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 700, color: TEXT }}>{active.buyer_name}</p>
                  <p style={{ fontSize: 11, color: TEXT3 }}>Käufer</p>
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
                <input value={text} onChange={e => setText(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
                  placeholder="Antwort schreiben..."
                  style={{ flex: 1, background: BG, border: `1.5px solid ${BORDER}`, borderRadius: 10, padding: "10px 14px", color: TEXT, fontSize: 14, fontFamily: "inherit", outline: "none" }}
                  onFocus={e => e.currentTarget.style.borderColor = ORANGE}
                  onBlur={e => e.currentTarget.style.borderColor = BORDER} />
                <button onClick={send} style={{ background: ORANGE, color: "#fff", border: "none", borderRadius: 10, padding: "10px 20px", fontWeight: 700, fontSize: 16, cursor: "pointer" }}>→</button>
              </div>
            </>
          ) : (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12 }}>
              <p style={{ fontSize: 52 }}>💬</p>
              <p style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 20, color: TEXT }}>Nachrichten</p>
              <p style={{ color: TEXT2, fontSize: 14 }}>Wähle ein Gespräch aus der Liste.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
