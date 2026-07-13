"use client";
import { useState } from "react";

const ORANGE = "#2563EB";

export default function MobileNav() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        className="kf-hamburger"
        onClick={() => setOpen(!open)}
        aria-label={open ? "Menü schließen" : "Menü öffnen"}
        aria-expanded={open}
        aria-controls="kf-mobile-menu"
        style={{ display: "none", background: "none", border: "none", cursor: "pointer", padding: 8, color: "var(--kf-text)", borderRadius: 8, flexShrink: 0 }}
      >
        {open ? (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        ) : (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
        )}
      </button>

      {open && (
        <div
          id="kf-mobile-menu"
          style={{
            position: "fixed", top: 60, left: 0, right: 0,
            background: "var(--kf-surface)", borderBottom: "1px solid var(--kf-border)",
            padding: "12px 24px 20px", display: "flex", flexDirection: "column", gap: 0,
            zIndex: 49, boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
          }}
        >
          {[
            { label: "Marktplatz", href: "/marketplace" },
            { label: "Als Lieferant", href: "/signup/supplier" },
            { label: "Anmelden", href: "/login" },
          ].map(({ label, href }) => (
            <a key={label} href={href} style={{ fontSize: 15, fontWeight: 500, color: "var(--kf-text2)", textDecoration: "none", padding: "13px 0", borderBottom: "1px solid var(--kf-border)" }}>
              {label}
            </a>
          ))}
          <a href="/signup" style={{ background: ORANGE, color: "#fff", padding: "13px 16px", borderRadius: 10, fontWeight: 700, fontSize: 15, textDecoration: "none", textAlign: "center", marginTop: 14, boxShadow: "0 2px 8px rgba(37,99,235,0.3)" }}>
            Kostenlos starten →
          </a>
        </div>
      )}
    </>
  );
}
