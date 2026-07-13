"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";

const BG      = "var(--kf-bg)";
const SURFACE = "var(--kf-surface)";
const BORDER  = "var(--kf-border)";
const TEXT    = "var(--kf-text)";
const TEXT2   = "var(--kf-text2)";
const TEXT3   = "var(--kf-text3)";
const ORANGE  = "#2563EB";

type Message = {
  id: string; conversation_id: string; sender_id: string;
  is_admin: boolean; message: string; created_at: string;
};

export default function SupportPage() {
  const [messages, setMessages]       = useState<Message[]>([]);
  const [convId, setConvId]           = useState<string | null>(null);
  const [userId, setUserId]           = useState<string | null>(null);
  const [input, setInput]             = useState("");
  const [sending, setSending]         = useState(false);
  const [loading, setLoading]         = useState(true);
  const bottomRef                     = useRef<HTMLDivElement>(null);
  const inputRef                      = useRef<HTMLInputElement>(null);

  useEffect(() => { init(); }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!convId) return;
    const ch = supabase
      .channel(`support-${convId}`)
      .on("postgres_changes", {
        event: "INSERT", schema: "public", table: "support_messages",
        filter: `conversation_id=eq.${convId}`,
      }, payload => {
        setMessages(prev => {
          if (prev.some(m => m.id === (payload.new as Message).id)) return prev;
          return [...prev, payload.new as Message];
        });
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [convId]);

  const init = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { window.location.href = "/login"; return; }
    setUserId(user.id);

    let { data: conv } = await supabase
      .from("support_conversations")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!conv) {
      const { data: nc } = await supabase
        .from("support_conversations")
        .insert({ user_id: user.id })
        .select("id")
        .maybeSingle();
      conv = nc;
    }

    if (!conv) return;
    setConvId(conv.id);

    const { data: msgs } = await supabase
      .from("support_messages")
      .select("*")
      .eq("conversation_id", conv.id)
      .order("created_at", { ascending: true });

    setMessages((msgs as Message[]) ?? []);
    setLoading(false);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const send = async () => {
    const text = input.trim();
    if (!text || !convId || !userId || sending) return;
    setSending(true);
    setInput("");

    await supabase.from("support_messages").insert({
      conversation_id: convId,
      sender_id: userId,
      is_admin: false,
      message: text,
    });

    await supabase.from("support_conversations").update({
      last_message_at: new Date().toISOString(),
      last_message_text: text,
      unread_for_admin: true,
    }).eq("id", convId);

    setSending(false);
    inputRef.current?.focus();
  };

  const fmt = (ts: string) =>
    new Date(ts).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });

  const fmtDate = (ts: string) =>
    new Date(ts).toLocaleDateString("de-DE", { day: "2-digit", month: "short", year: "numeric" });

  const groupByDate = (msgs: Message[]) => {
    const groups: { date: string; items: Message[] }[] = [];
    msgs.forEach(m => {
      const d = fmtDate(m.created_at);
      const last = groups[groups.length - 1];
      if (last && last.date === d) last.items.push(m);
      else groups.push({ date: d, items: [m] });
    });
    return groups;
  };

  if (loading) return (
    <main style={{ minHeight: "100vh", background: BG, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{ width: 34, height: 34, border: `3px solid ${BORDER}`, borderTopColor: ORANGE, borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
    </main>
  );

  const groups = groupByDate(messages);

  return (
    <main style={{ minHeight: "100vh", background: BG, fontFamily: "'DM Sans','Helvetica Neue',system-ui,sans-serif", color: TEXT, display: "flex", flexDirection: "column" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500;600;700&display=swap'); *{box-sizing:border-box}`}</style>

      {/* Navbar */}
      <nav style={{ background: SURFACE, borderBottom: `1px solid ${BORDER}`, padding: "0 24px", height: 58, display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
        <a href="/marketplace" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none" }}>
          <img src="/flowio-icon.png" alt="Flowio" style={{ width: 30, height: 30, borderRadius: 7, objectFit: "cover" }} />
          <span style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 14, color: TEXT }}>Flowio</span>
        </a>
        <a href="/profile" style={{ fontSize: 13, color: TEXT2, textDecoration: "none", fontWeight: 500 }}>← Zurück</a>
      </nav>

      {/* Chat container */}
      <div style={{ maxWidth: 720, width: "100%", margin: "0 auto", display: "flex", flexDirection: "column", flex: 1, padding: "0 16px" }}>

        {/* Chat header */}
        <div style={{ padding: "20px 0 12px", borderBottom: `1px solid ${BORDER}`, display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 42, height: 42, borderRadius: 12, background: `${ORANGE}15`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>💬</div>
          <div>
            <p style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 16, color: TEXT }}>Flowio Support</p>
            <p style={{ fontSize: 12, color: TEXT3, marginTop: 2 }}>Wir helfen dir so schnell wie möglich.</p>
          </div>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 0", display: "flex", flexDirection: "column", gap: 0, minHeight: 0 }}>
          {messages.length === 0 ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flex: 1, gap: 12, padding: "60px 0" }}>
              <p style={{ fontSize: 48 }}>👋</p>
              <p style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 18, color: TEXT }}>Hallo! Wie können wir helfen?</p>
              <p style={{ fontSize: 14, color: TEXT2, textAlign: "center", maxWidth: 320, lineHeight: 1.6 }}>Schreib uns deine Frage oder dein Problem — wir melden uns so schnell wie möglich.</p>
            </div>
          ) : (
            <>
              {groups.map(group => (
                <div key={group.date}>
                  {/* Date separator */}
                  <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "16px 0 14px" }}>
                    <div style={{ flex: 1, height: 1, background: BORDER }} />
                    <span style={{ fontSize: 11, fontWeight: 600, color: TEXT3, flexShrink: 0 }}>{group.date}</span>
                    <div style={{ flex: 1, height: 1, background: BORDER }} />
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {group.items.map((msg, i) => {
                      const isMe = !msg.is_admin;
                      const prevSame = i > 0 && group.items[i - 1].is_admin === msg.is_admin;
                      return (
                        <div key={msg.id} style={{ display: "flex", justifyContent: isMe ? "flex-end" : "flex-start", marginTop: prevSame ? 2 : 10 }}>
                          {!isMe && !prevSame && (
                            <img src="/flowio-icon.png" alt="Flowio Support" style={{ width: 28, height: 28, borderRadius: 8, objectFit: "cover", marginRight: 8, flexShrink: 0, alignSelf: "flex-end", marginBottom: 2 }} />
                          )}
                          {!isMe && prevSame && <div style={{ width: 36 }} />}
                          <div style={{ maxWidth: "72%" }}>
                            {!isMe && !prevSame && (
                              <p style={{ fontSize: 11, fontWeight: 700, color: TEXT3, marginBottom: 4, marginLeft: 2 }}>Support</p>
                            )}
                            <div style={{
                              padding: "10px 14px",
                              borderRadius: isMe
                                ? "18px 18px 4px 18px"
                                : "18px 18px 18px 4px",
                              background: isMe ? ORANGE : SURFACE,
                              border: isMe ? "none" : `1px solid ${BORDER}`,
                            }}>
                              <p style={{ fontSize: 14, color: isMe ? "#fff" : TEXT, lineHeight: 1.55, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{msg.message}</p>
                            </div>
                            <p style={{ fontSize: 10, color: TEXT3, marginTop: 3, textAlign: isMe ? "right" : "left", marginLeft: isMe ? 0 : 2 }}>{fmt(msg.created_at)}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
              <div ref={bottomRef} style={{ height: 8 }} />
            </>
          )}
        </div>

        {/* Input bar */}
        <div style={{ padding: "14px 0 24px", borderTop: `1px solid ${BORDER}`, display: "flex", gap: 10, alignItems: "flex-end" }}>
          <input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder="Schreib eine Nachricht..."
            style={{ flex: 1, background: SURFACE, border: `1.5px solid ${BORDER}`, borderRadius: 14, padding: "12px 16px", color: TEXT, fontSize: 14, fontFamily: "inherit", outline: "none", transition: "border-color 0.2s" }}
            onFocus={e => e.currentTarget.style.borderColor = ORANGE}
            onBlur={e => e.currentTarget.style.borderColor = BORDER}
          />
          <button onClick={send} disabled={sending || !input.trim()}
            style={{ width: 46, height: 46, background: sending || !input.trim() ? `${ORANGE}50` : ORANGE, color: "#fff", border: "none", borderRadius: 12, fontSize: 18, cursor: sending || !input.trim() ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "background 0.2s" }}>
            {sending ? "…" : "↑"}
          </button>
        </div>
      </div>
    </main>
  );
}
