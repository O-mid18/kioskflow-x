"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

const BG     = "var(--kf-bg)";
const BORDER = "var(--kf-border)";
const TEXT   = "var(--kf-text)";
const TEXT3  = "var(--kf-text3)";
const ORANGE = "#2563EB";

const LS_KEY = "kf_pending_signup";

export default function AuthCallbackPage() {
  const [status, setStatus] = useState<"loading" | "error">("loading");

  useEffect(() => {
    const run = async () => {
      // If a session already exists (e.g. retry after a profile-save failure),
      // skip re-exchanging the code since it's single-use and would fail.
      const { data: { user: existingUser } } = await supabase.auth.getUser();
      let user = existingUser;

      if (!user) {
        const code = new URLSearchParams(window.location.search).get("code");
        if (!code) { setStatus("error"); return; }

        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) { setStatus("error"); return; }

        const { data: { user: newUser } } = await supabase.auth.getUser();
        if (!newUser) { setStatus("error"); return; }
        user = newUser;
      }
      if (!user) { setStatus("error"); return; }

      // Apply pending signup data stored before email confirmation
      const raw = localStorage.getItem(LS_KEY);
      if (raw) {
        try {
          const pending = JSON.parse(raw);

          if (pending.type === "buyer") {
            const { error: upsertErr } = await supabase.from("profiles").upsert({
              id: user.id,
              role: "buyer",
              status: "active",
              full_name: pending.fullName,
              company_name: pending.companyName,
              address: pending.address,
              postal_code: pending.postalCode,
              city: pending.city,
              phone: pending.phone,
            });
            if (upsertErr) { setStatus("error"); return; }
            localStorage.removeItem(LS_KEY);
            window.location.href = "/marketplace";
            return;
          }

          if (pending.type === "supplier") {
            const { error: profileErr } = await supabase.from("profiles").upsert({
              id: user.id,
              role: "supplier",
              status: "pending",
              company_name: pending.companyName,
              full_name: pending.contactPerson,
              address: pending.warehouseAddress,
              city: pending.city,
              phone: pending.phone,
              product_category: pending.productCategory,
            });
            if (profileErr) { setStatus("error"); return; }
            const { error: supplierErr } = await supabase.from("suppliers").insert({
              user_id: user.id,
              name: pending.companyName,
              phone: pending.phone,
              city: pending.city,
            });
            if (supplierErr) { setStatus("error"); return; }
            localStorage.removeItem(LS_KEY);
            window.location.href = "/supplier/dashboard";
            return;
          }
        } catch { setStatus("error"); return; }
      }

      // No pending data — just redirect based on role
      const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
      const role = profile?.role;
      window.location.href = role === "supplier" ? "/supplier/dashboard" : role === "admin" ? "/admin/dashboard" : "/marketplace";
    };

    run();
  }, []);

  return (
    <main style={{ minHeight: "100vh", background: BG, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'DM Sans',system-ui,sans-serif" }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      {status === "loading" ? (
        <div style={{ textAlign: "center" }}>
          <div style={{ width: 38, height: 38, border: `3px solid ${BORDER}`, borderTopColor: ORANGE, borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 14px" }} />
          <p style={{ color: TEXT3, fontSize: 14 }}>E-Mail wird bestätigt...</p>
        </div>
      ) : (
        <div style={{ textAlign: "center", padding: "0 20px" }}>
          <p style={{ fontSize: 36, marginBottom: 12 }}>⚠️</p>
          <p style={{ color: TEXT, fontSize: 15, fontWeight: 600, marginBottom: 8 }}>Bestätigung fehlgeschlagen.</p>
          <p style={{ color: TEXT3, fontSize: 13, marginBottom: 20 }}>Der Link ist ungültig/abgelaufen, oder dein Profil konnte nicht gespeichert werden.</p>
          <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
            <button onClick={() => window.location.reload()} style={{ background: ORANGE, color: "#fff", border: "none", borderRadius: 9, padding: "10px 18px", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
              Erneut versuchen
            </button>
            <a href="/signup" style={{ color: ORANGE, fontWeight: 700, fontSize: 13, alignSelf: "center" }}>Neu registrieren →</a>
          </div>
        </div>
      )}
    </main>
  );
}
