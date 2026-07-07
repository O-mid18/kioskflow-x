import Link from "next/link";

const ORANGE = "#E8521A";

export default function NotFound() {
  return (
    <main style={{ minHeight: "100vh", background: "var(--kf-bg)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'DM Sans',system-ui,sans-serif" }}>
      <div style={{ textAlign: "center", padding: "0 24px" }}>
        <p style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 72, color: ORANGE, marginBottom: 8, lineHeight: 1 }}>404</p>
        <h1 style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 24, color: "var(--kf-text)", marginBottom: 10 }}>
          Seite nicht gefunden
        </h1>
        <p style={{ fontSize: 14, color: "var(--kf-text2)", marginBottom: 28 }}>
          Die gesuchte Seite existiert nicht oder wurde verschoben.
        </p>
        <Link href="/marketplace" style={{ background: ORANGE, color: "#fff", borderRadius: 10, padding: "12px 24px", fontWeight: 700, fontSize: 14, textDecoration: "none" }}>
          Zum Marktplatz →
        </Link>
      </div>
    </main>
  );
}
