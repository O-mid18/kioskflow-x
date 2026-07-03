"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function DebugPage() {
  const [info, setInfo] = useState<Record<string, unknown>>({ loading: true });

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setInfo({ error: "NOT LOGGED IN" }); return; }

      const { data: { session } } = await supabase.auth.getSession();

      const { data: profile, error: profileErr } = await supabase
        .from("profiles").select("*").eq("id", user.id).maybeSingle();

      const { data: supplier, error: supplierErr } = await supabase
        .from("suppliers").select("*").eq("user_id", user.id).maybeSingle();

      let apiResult = null;
      if (session) {
        const res = await fetch("/api/ensure-supplier", {
          method: "POST",
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        apiResult = { status: res.status, body: await res.json().catch(() => null) };
      }

      setInfo({
        userId: user.id,
        email: user.email,
        profile: profile ?? null,
        profileError: profileErr?.message ?? null,
        supplier: supplier ?? null,
        supplierError: supplierErr?.message ?? null,
        apiResult,
      });
    })();
  }, []);

  return (
    <main style={{ padding: 40, fontFamily: "monospace", fontSize: 13, background: "#0d1117", minHeight: "100vh", color: "#e6edf3" }}>
      <h1 style={{ marginBottom: 20, color: "#58a6ff" }}>Debug Info</h1>
      <pre style={{ background: "#161b22", color: "#7ee787", padding: 20, borderRadius: 10, overflow: "auto", border: "1px solid #30363d" }}>
        {JSON.stringify(info, null, 2)}
      </pre>
      <a href="/supplier/dashboard" style={{ display: "inline-block", marginTop: 20, color: "#58a6ff" }}>
        → Go to Dashboard
      </a>
    </main>
  );
}
