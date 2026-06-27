"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

const BG     = "var(--kf-bg)";
const BORDER = "var(--kf-border)";
const TEXT   = "var(--kf-text)";
const TEXT3  = "var(--kf-text3)";
const ORANGE = "#E8521A";

const LS_KEY = "kf_pending_signup";

export default function AuthCallbackPage() {
  const [status, setStatus] = useState<"loading" | "error">("loading");

  useEffect(() => {
    const run = async () => {
      const code = new URLSearchParams(window.location.search).get("code");
      if (!code) { setStatus("error"); return; }

      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) { setStatus("error"); return; }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setStatus("error"); return; }

      // Apply pending signup data stored before email confirmation
      const raw = localStorage.getItem(LS_KEY);
      if (raw) {
        try {
          const pending = JSON.parse(raw);

          if (pending.type === "buyer") {
            await supabase.from("profiles").upsert({
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
            localStorage.removeItem(LS_KEY);
            window.location.href = "/marketplace";
            return;
          }

          if (pending.type === "supplier") {
            await supabase.from("profiles").upsert({
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
            await supabase.from("suppliers").insert({
              user_id: user.id,
              name: pending.companyName,
              phone: pending.phone,
              city: pending.city,
            });
            localStorage.removeItem(LS_KEY);
            window.location.href = "/supplier/dashboard";
            return;
          }
        } catch {}
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
        <div style={{ textAlign: "center" }}>
          <p style={{ fontSize: 36, marginBottom: 12 }}>❌</p>
          <p style={{ color: TEXT, fontSize: 15, fontWeight: 600, marginBottom: 8 }}>Link ungültig oder abgelaufen.</p>
          <a href="/signup" style={{ color: ORANGE, fontWeight: 700, fontSize: 14 }}>Erneut registrieren →</a>
        </div>
      )}
    </main>
  );
}
