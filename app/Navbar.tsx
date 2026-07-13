"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

const ORANGE = "#E8521A";

export default function Navbar() {
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUserEmail(user?.email ?? null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserEmail(session?.user?.email ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

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
      <Link href="/marketplace" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none" }}>
        <img src="/flowio-icon.png" alt="Flowio" style={{ width: 30, height: 30, borderRadius: 7, objectFit: "cover" }} />
        <span style={{ fontWeight: 800, fontSize: 15, color: "var(--kf-text)", letterSpacing: "-0.3px" }}>
          Flowio
        </span>
      </Link>

      <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
        <Link href="/marketplace" style={{ color: "var(--kf-text2)", fontWeight: 500, fontSize: 14, textDecoration: "none" }}>
          Marktplatz
        </Link>
        <Link href="/orders" style={{ color: "var(--kf-text2)", fontWeight: 500, fontSize: 14, textDecoration: "none" }}>
          Bestellungen
        </Link>
        <Link href="/cart" style={{ color: "var(--kf-text2)", fontWeight: 500, fontSize: 14, textDecoration: "none" }}>
          Warenkorb
        </Link>

        {!loading && (
          userEmail ? (
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ color: "var(--kf-text3)", fontSize: 13 }}>{userEmail}</span>
              <button
                onClick={handleLogout}
                style={{ background: "none", border: "1.5px solid var(--kf-border)", borderRadius: 8, padding: "6px 14px", color: "var(--kf-text2)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
              >
                Abmelden
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              style={{ background: ORANGE, color: "#fff", borderRadius: 8, padding: "7px 16px", fontSize: 13, fontWeight: 700, textDecoration: "none" }}
            >
              Anmelden →
            </Link>
          )
        )}
      </div>
    </nav>
  );
}
