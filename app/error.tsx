"use client";

import { useEffect } from "react";

const ORANGE = "#003ec7";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[GlobalError]", error);
  }, [error]);

  return (
    <main style={{ minHeight: "100vh", background: "var(--kf-bg)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Inter',system-ui,sans-serif" }}>
      <div style={{ textAlign: "center", padding: "0 24px" }}>
        <p style={{ fontSize: 52, marginBottom: 16 }}>⚠️</p>
        <h1 style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontWeight: 800, fontSize: 24, color: "var(--kf-text)", marginBottom: 10 }}>
          Etwas ist schiefgelaufen
        </h1>
        <p style={{ fontSize: 14, color: "var(--kf-text2)", marginBottom: 28, maxWidth: 340, margin: "0 auto 28px" }}>
          Ein unerwarteter Fehler ist aufgetreten. Bitte versuche es erneut.
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
          <button
            onClick={reset}
            style={{ background: ORANGE, color: "#fff", border: "none", borderRadius: 10, padding: "12px 24px", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
            Erneut versuchen
          </button>
          <a href="/marketplace" style={{ background: "var(--kf-surface)", border: "1.5px solid var(--kf-border)", color: "var(--kf-text)", borderRadius: 10, padding: "12px 24px", fontWeight: 600, fontSize: 14, textDecoration: "none" }}>
            Zum Marktplatz
          </a>
        </div>
      </div>
    </main>
  );
}
