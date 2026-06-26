"use client";

import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase";

const ORANGE = "#E8521A";

type Notif = {
  id: string;
  type: string;
  title: string;
  body?: string;
  read: boolean;
  link?: string;
  created_at: string;
};

const TYPE_ICON: Record<string, string> = {
  new_order:     "🛒",
  status_update: "📦",
  info:          "🔔",
};

export function NotificationBell() {
  const [notifs, setNotifs] = useState<Notif[]>([]);
  const [open, setOpen]     = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const unread = notifs.filter(n => !n.read).length;

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let active = true;

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user || !active) return;

      supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(30)
        .then(({ data }) => { if (active) setNotifs((data ?? []) as Notif[]); });

      const ch = supabase.channel(`notifs-${user.id}-${Date.now()}`);
      ch.on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "notifications",
        filter: `user_id=eq.${user.id}`,
      }, payload => {
        if (active) setNotifs(prev => [payload.new as Notif, ...prev]);
      }).subscribe();
      channel = ch;
    });

    return () => {
      active = false;
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  const markAllRead = async () => {
    const ids = notifs.filter(n => !n.read).map(n => n.id);
    if (ids.length === 0) return;
    await supabase.from("notifications").update({ read: true }).in("id", ids);
    setNotifs(prev => prev.map(n => ({ ...n, read: true })));
  };

  const toggle = () => {
    setOpen(o => {
      if (!o) markAllRead();
      return !o;
    });
  };

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button onClick={toggle} style={{ background: "none", border: "none", cursor: "pointer", position: "relative", padding: "6px 8px", borderRadius: 8, display: "flex", alignItems: "center" }}>
        <svg width={20} height={20} fill="none" stroke="var(--kf-text2)" strokeWidth="2" viewBox="0 0 24 24">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
        </svg>
        {unread > 0 && (
          <span style={{
            position: "absolute", top: 2, right: 2,
            background: ORANGE, color: "#fff",
            minWidth: 16, height: 16, borderRadius: 100,
            fontSize: 9, fontWeight: 800, lineHeight: "16px",
            textAlign: "center", padding: "0 3px",
          }}>
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 90 }} />
          <div style={{
            position: "absolute", right: 0, top: "calc(100% + 8px)",
            width: 320, background: "var(--kf-surface)",
            border: "1px solid var(--kf-border)", borderRadius: 14,
            boxShadow: "0 8px 32px rgba(0,0,0,0.14)", zIndex: 100, overflow: "hidden",
          }}>
            <div style={{ padding: "13px 16px", borderBottom: "1px solid var(--kf-border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <p style={{ fontWeight: 700, fontSize: 14, color: "var(--kf-text)" }}>Benachrichtigungen</p>
              {unread > 0 && (
                <span style={{ background: `${ORANGE}20`, color: ORANGE, fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 100 }}>
                  {unread} neu
                </span>
              )}
            </div>
            <div style={{ maxHeight: 380, overflowY: "auto" }}>
              {notifs.length === 0 ? (
                <div style={{ padding: "36px 16px", textAlign: "center" }}>
                  <p style={{ fontSize: 28, marginBottom: 8 }}>🔕</p>
                  <p style={{ color: "var(--kf-text3)", fontSize: 13 }}>Keine Benachrichtigungen</p>
                </div>
              ) : notifs.map((n, i) => (
                <div
                  key={n.id}
                  onClick={() => { if (n.link) window.location.href = n.link; setOpen(false); }}
                  style={{
                    padding: "12px 16px",
                    borderBottom: i < notifs.length - 1 ? "1px solid var(--kf-border)" : "none",
                    background: n.read ? "transparent" : `${ORANGE}08`,
                    cursor: n.link ? "pointer" : "default",
                  }}
                >
                  <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                    <span style={{ fontSize: 20, flexShrink: 0, marginTop: 1 }}>{TYPE_ICON[n.type] ?? "🔔"}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 13, fontWeight: 600, color: "var(--kf-text)", marginBottom: 2 }}>{n.title}</p>
                      {n.body && <p style={{ fontSize: 12, color: "var(--kf-text2)", marginBottom: 4 }}>{n.body}</p>}
                      <p style={{ fontSize: 11, color: "var(--kf-text3)" }}>
                        {new Date(n.created_at).toLocaleDateString("de-DE", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                    {!n.read && <div style={{ width: 7, height: 7, borderRadius: "50%", background: ORANGE, flexShrink: 0, marginTop: 5 }} />}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
