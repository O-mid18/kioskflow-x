"use client";

import Link from "next/link";

const ORANGE = "#E8521A";

export default function Navbar() {
  return (
    <nav style={{
      background: "var(--kf-surface)",
      borderBottom: "1px solid var(--kf-border)",
      padding: "0 24px",
      height: 60,
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      position: "sticky",
      top: 0,
      zIndex: 50,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ width: 30, height: 30, background: ORANGE, borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 14, color: "#fff" }}>
          K
        </div>
        <span style={{ fontWeight: 800, fontSize: 15, color: "var(--kf-text)", letterSpacing: "-0.3px" }}>
          KioskFlow
        </span>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
        <Link href="/marketplace" style={{ color: "var(--kf-text2)", fontWeight: 500, fontSize: 14, textDecoration: "none" }}>
          Marktplatz
        </Link>

        <Link href="/cart" style={{ color: "var(--kf-text2)", fontWeight: 500, fontSize: 14, textDecoration: "none" }}>
          Warenkorb
        </Link>

        <Link href="/supplier" style={{ color: "var(--kf-text2)", fontWeight: 500, fontSize: 14, textDecoration: "none" }}>
          Lieferant
        </Link>

        <Link href="/admin" style={{ color: "var(--kf-text2)", fontWeight: 500, fontSize: 14, textDecoration: "none" }}>
          Admin
        </Link>
      </div>
    </nav>
  );
}
