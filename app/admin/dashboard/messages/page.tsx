"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

const BG = "var(--kf-bg)";
const SURFACE = "var(--kf-surface)";
const BORDER = "var(--kf-border)";
const TEXT = "var(--kf-text)";
const TEXT2 = "var(--kf-text2)";
const TEXT3 = "var(--kf-text3)";
const ORANGE = "#003ec7";

type Conv = { id: string; buyer_name: string; supplier_name: string; created_at: string; };
type Msg  = { id: string; sender_id: string; content: string; created_at: string; };

export default function AdminMessagesPage() {
  const [convs, setConvs]   = useState<Conv[]>([]);
  const [active, setActive] = useState<Conv | null>(null);
  const [msgs, setMsgs]     = useState<Msg[]>([]);
  const [loading, setLoading] = useState(true);
  const [token, setToken]   = useState<string | null>(null);

  const adminFetch = async (tk: string, body: object) => {
    const res = await fetch("/api/admin", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${tk}` }, body: JSON.stringify(body) });
    return res.json();
  };

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { window.location.href = "/login"; return; }
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { window.location.href = "/login"; return; }
      setToken(session.access_token);
      const json = await adminFetch(session.access_token, { action: "get_conversations" });
      setConvs(json.conversations ?? []);
      setLoading(false);
    });
  }, []);

  const openConv = async (conv: Conv) => {
    setActive(conv);
    if (!token) return;
    const json = await adminFetch(token, { action: "get_messages", conversationId: conv.id });
    setMsgs(json.messages ?? []);
  };

  const fmt = (s: string) => new Date(s).toLocaleString("de-DE", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

  if (loading) return (
    <div style={{ minHeight: "100%", background: BG, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{ width: 32, height: 32, border: `3px solid ${BORDER}`, borderTopColor: ORANGE, borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
    </div>
  );

  return (
    <div style={{ minHeight: "100%", background: BG, fontFamily: "'Inter',system-ui,sans-serif" }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      <div style={{ padding: "28px 24px" }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: TEXT3, letterSpacing: "2px", textTransform: "uppercase", marginBottom: 8 }}>Admin</p>
        <h1 style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontWeight: 800, fontSize: 24, color: TEXT, marginBottom: 24 }}>Alle Gespräche</h1>

        <div style={{ display: "flex", gap: 20, alignItems: "flex-start" }}>
          {/* Conversation list */}
          <div style={{ width: 320, flexShrink: 0, background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 16, overflow: "hidden" }}>
            <div style={{ padding: "14px 16px", borderBottom: `1px solid ${BORDER}` }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: TEXT }}>{convs.length} Gespräche insgesamt</p>
            </div>
            {convs.length === 0 ? (
              <div style={{ padding: "40px 20px", textAlign: "center" }}>
                <p style={{ color: TEXT3, fontSize: 13 }}>Noch keine Gespräche</p>
              </div>
            ) : convs.map(c => (
              <div key={c.id} onClick={() => openConv(c)} style={{ padding: "14px 16px", borderBottom: `1px solid ${BORDER}`, cursor: "pointer", background: active?.id === c.id ? `${ORANGE}10` : "transparent", borderLeft: `3px solid ${active?.id === c.id ? ORANGE : "transparent"}` }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: TEXT, marginBottom: 4 }}>
                  {c.buyer_name} <span style={{ color: TEXT3 }}>→</span> {c.supplier_name}
                </p>
                <p style={{ fontSize: 11, color: TEXT3 }}>{fmt(c.created_at)}</p>
              </div>
            ))}
          </div>

          {/* Messages */}
          <div style={{ flex: 1, background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 16, overflow: "hidden", minHeight: 400 }}>
            {active ? (
              <>
                <div style={{ padding: "14px 18px", borderBottom: `1px solid ${BORDER}`, background: `${ORANGE}08` }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: TEXT }}>{active.buyer_name} ↔ {active.supplier_name}</p>
                  <p style={{ fontSize: 11, color: TEXT3, marginTop: 2 }}>Nur-Lese-Ansicht</p>
                </div>
                <div style={{ padding: "16px 18px", display: "flex", flexDirection: "column", gap: 10, maxHeight: 500, overflowY: "auto" }}>
                  {msgs.length === 0 ? (
                    <p style={{ color: TEXT3, fontSize: 13, textAlign: "center", padding: "40px 0" }}>Keine Nachrichten</p>
                  ) : msgs.map(m => (
                    <div key={m.id} style={{ background: BG, border: `1px solid ${BORDER}`, borderRadius: 10, padding: "10px 14px" }}>
                      <p style={{ fontSize: 11, color: ORANGE, fontWeight: 700, marginBottom: 4 }}>
                        {m.sender_id === active.buyer_name ? active.buyer_name : "Absender"}
                      </p>
                      <p style={{ fontSize: 14, color: TEXT, lineHeight: 1.5 }}>{m.content}</p>
                      <p style={{ fontSize: 10, color: TEXT3, marginTop: 4 }}>{fmt(m.created_at)}</p>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div style={{ padding: "80px 0", textAlign: "center" }}>
                <p style={{ fontSize: 36, marginBottom: 8 }}>💬</p>
                <p style={{ color: TEXT2, fontSize: 14 }}>Gespräch auswählen</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
