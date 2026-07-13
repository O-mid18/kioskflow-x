"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

const BG = "var(--kf-bg)";
const SURFACE = "var(--kf-surface)";
const BORDER = "var(--kf-border)";
const TEXT = "var(--kf-text)";
const TEXT2 = "var(--kf-text2)";
const TEXT3 = "var(--kf-text3)";
const ORANGE = "#2563EB";

const MONTHS = ["Jan","Feb","Mär","Apr","Mai","Jun","Jul","Aug","Sep","Okt","Nov","Dez"];
const CAT_COLORS = [ORANGE,"#3b82f6","#8b5cf6","#10b981","#f59e0b","#ec4899"];

type OrderItem = {
  quantity: number;
  price_at_purchase: number;
  product_id: string;
  products: { name: string; category: string | null } | null;
  orders: { status: string; created_at: string } | null;
};

// ── Mini bar chart ────────────────────────────────────────────────────────────
function BarChart({ data, color }: { data: { label: string; value: number }[]; color: string }) {
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 100 }}>
      {data.map(d => (
        <div key={d.label} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
          <div style={{ width: "100%", height: Math.max(3, (d.value / max) * 80), background: d.value > 0 ? color : BORDER, borderRadius: "4px 4px 0 0", transition: "height 0.5s ease" }} />
          <p style={{ fontSize: 9, color: TEXT3, textAlign: "center" }}>{d.label}</p>
        </div>
      ))}
    </div>
  );
}

// ── Stat card ─────────────────────────────────────────────────────────────────
function StatCard({ icon, label, value, sub, highlight }: { icon: string; label: string; value: string; sub: string; highlight?: boolean }) {
  return (
    <div style={{ background: highlight ? ORANGE : SURFACE, border: `1px solid ${highlight ? ORANGE : BORDER}`, borderRadius: 16, padding: "20px 22px" }}>
      <span style={{ fontSize: 22 }}>{icon}</span>
      <p style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 24, color: highlight ? "#fff" : TEXT, margin: "10px 0 2px", letterSpacing: "-0.5px" }}>{value}</p>
      <p style={{ fontSize: 12, fontWeight: 700, color: highlight ? "rgba(255,255,255,0.85)" : TEXT2 }}>{label}</p>
      <p style={{ fontSize: 11, color: highlight ? "rgba(255,255,255,0.6)" : TEXT3, marginTop: 2 }}>{sub}</p>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function SupplierAnalyticsPage() {
  const [items, setItems]     = useState<OrderItem[]>([]);
  const [products, setProducts] = useState<{ id: string; name: string; category: string | null }[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod]   = useState<"month" | "year">("year");

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { window.location.href = "/login"; return; }

      const { data: supplier } = await supabase.from("suppliers").select("id").eq("user_id", user.id).maybeSingle();
      if (!supplier) { return; }

      const { data: prods } = await supabase
        .from("products")
        .select("id, name, category")
        .eq("supplier_id", supplier.id);

      const supplierProducts = (prods as typeof products) ?? [];
      setProducts(supplierProducts);

      if (supplierProducts.length === 0) { return; }

      const productIds = supplierProducts.map(p => p.id);
      const { data: orderData } = await supabase
        .from("order_items")
        .select("quantity, price_at_purchase, product_id, products(name, category), orders(status, created_at)")
        .in("product_id", productIds);

      setItems((orderData as unknown as OrderItem[]) ?? []);
    } catch {
      // silent — loading state cleaned up in finally
    } finally {
      setLoading(false);
    }
  };

  // ── Derived metrics ──
  const paidItems   = items.filter(i => i.orders?.status === "paid" || i.orders?.status === "delivered" || i.orders?.status === "shipped");
  const totalRev    = paidItems.reduce((s, i) => s + i.price_at_purchase * i.quantity, 0);
  const totalUnits  = items.reduce((s, i) => s + i.quantity, 0);
  const uniqueOrders = new Set(items.map(i => JSON.stringify(i.orders?.created_at))).size;

  // Month-over-month
  const now = new Date();
  const thisMonth = now.getMonth();
  const lastMonth = thisMonth === 0 ? 11 : thisMonth - 1;
  const revThisMonth = paidItems.filter(i => i.orders?.created_at && new Date(i.orders.created_at).getMonth() === thisMonth)
    .reduce((s, i) => s + i.price_at_purchase * i.quantity, 0);
  const revLastMonth = paidItems.filter(i => i.orders?.created_at && new Date(i.orders.created_at).getMonth() === lastMonth)
    .reduce((s, i) => s + i.price_at_purchase * i.quantity, 0);
  const momChange = revLastMonth > 0 ? ((revThisMonth - revLastMonth) / revLastMonth) * 100 : null;

  // Monthly revenue chart
  const monthlyRev = Array(12).fill(0);
  for (const i of paidItems) {
    if (i.orders?.created_at) monthlyRev[new Date(i.orders.created_at).getMonth()] += i.price_at_purchase * i.quantity;
  }
  const monthChartData = MONTHS.map((label, idx) => ({ label, value: Math.round(monthlyRev[idx]) }));

  // Last 8 weeks
  const weeklyRev: number[] = Array(8).fill(0);
  for (const i of paidItems) {
    if (!i.orders?.created_at) continue;
    const diffMs = now.getTime() - new Date(i.orders.created_at).getTime();
    const diffWeeks = Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000));
    if (diffWeeks < 8) weeklyRev[7 - diffWeeks] += i.price_at_purchase * i.quantity;
  }
  const weekChartData = weeklyRev.map((v, i) => ({ label: `W${i + 1}`, value: Math.round(v) }));

  // Top products by revenue
  const productRev: Record<string, { name: string; rev: number; units: number }> = {};
  for (const i of items) {
    const pid = i.product_id;
    const name = i.products?.name ?? "—";
    if (!productRev[pid]) productRev[pid] = { name, rev: 0, units: 0 };
    productRev[pid].rev += i.price_at_purchase * i.quantity;
    productRev[pid].units += i.quantity;
  }
  const topProducts = Object.values(productRev).sort((a, b) => b.rev - a.rev).slice(0, 5);
  const maxProdRev = topProducts[0]?.rev || 1;

  // Category breakdown
  const catRev: Record<string, number> = {};
  for (const i of items) {
    const cat = i.products?.category ?? "Andere";
    catRev[cat] = (catRev[cat] || 0) + i.price_at_purchase * i.quantity;
  }
  const cats = Object.entries(catRev).sort((a, b) => b[1] - a[1]).slice(0, 6);
  const totalCatRev = cats.reduce((s, [, v]) => s + v, 0) || 1;

  // Status counts
  const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
    pending:   { label: "Ausstehend", color: "#ea580c", bg: "#fff7ed" },
    paid:      { label: "Bezahlt",    color: "#16a34a", bg: "#f0fdf4" },
    shipped:   { label: "Versandt",   color: "#2563eb", bg: "#eff6ff" },
    delivered: { label: "Geliefert",  color: "#16a34a", bg: "#f0fdf4" },
    cancelled: { label: "Storniert",  color: "#dc2626", bg: "#fef2f2" },
  };

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh" }}>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <div style={{ width: 36, height: 36, border: `3px solid ${BORDER}`, borderTopColor: ORANGE, borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      </div>
    );
  }

  const hasData = items.length > 0;

  return (
    <div style={{ padding: "32px 32px 60px", fontFamily: "'DM Sans','Helvetica Neue',system-ui,sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500;600;700&display=swap');`}</style>

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: TEXT3, letterSpacing: "2.5px", textTransform: "uppercase", marginBottom: 8 }}>Lieferant-Dashboard</p>
        <h1 style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 26, color: TEXT, letterSpacing: "-0.8px" }}>Verkaufsanalyse</h1>
        <p style={{ fontSize: 13, color: TEXT2, marginTop: 4 }}>{products.length} Produkte · {items.length} Bestellpositionen insgesamt</p>
      </div>

      {/* KPI row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 24 }}>
        <StatCard icon="💶" label="Gesamtumsatz" value={`€${totalRev.toFixed(2)}`} sub="Bezahlte Bestellungen" highlight />
        <StatCard icon="📦" label="Bestellpositionen" value={String(items.length)} sub="Alle Zeiträume" />
        <StatCard icon="🔢" label="Verkaufte Einheiten" value={String(totalUnits)} sub="Gesamt" />
        <StatCard
          icon={momChange !== null && momChange >= 0 ? "📈" : "📉"}
          label="Umsatz diesen Monat"
          value={`€${revThisMonth.toFixed(0)}`}
          sub={momChange !== null ? `${momChange >= 0 ? "+" : ""}${momChange.toFixed(1)}% vs. letzten Monat` : "Erster Monat"}
        />
      </div>

      {/* Revenue chart + period toggle */}
      <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 18, padding: "22px", marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div>
            <h2 style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 16, color: TEXT }}>Umsatzverlauf</h2>
            <p style={{ fontSize: 12, color: TEXT3, marginTop: 2 }}>{period === "year" ? "Monatsübersicht" : "Letzte 8 Wochen"}</p>
          </div>
          <div style={{ display: "flex", background: BG, borderRadius: 10, padding: 3 }}>
            {(["year", "month"] as const).map(p => (
              <button key={p} onClick={() => setPeriod(p)}
                style={{ padding: "6px 14px", borderRadius: 8, border: "none", fontSize: 12, fontWeight: 700, cursor: "pointer", background: period === p ? ORANGE : "transparent", color: period === p ? "#fff" : TEXT3, transition: "all 0.2s" }}>
                {p === "year" ? "Jahr" : "Wochen"}
              </button>
            ))}
          </div>
        </div>
        {!hasData ? (
          <div style={{ height: 100, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <p style={{ color: TEXT3, fontSize: 13 }}>Noch keine Umsatzdaten.</p>
          </div>
        ) : (
          <BarChart data={period === "year" ? monthChartData : weekChartData} color={`${ORANGE}CC`} />
        )}
        {hasData && (
          <div style={{ display: "flex", gap: 24, marginTop: 16, paddingTop: 16, borderTop: `1px solid ${BORDER}` }}>
            <div>
              <p style={{ fontSize: 11, color: TEXT3, marginBottom: 3 }}>BESTER MONAT</p>
              <p style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 16, color: TEXT }}>
                {MONTHS[monthlyRev.indexOf(Math.max(...monthlyRev))]} · €{Math.max(...monthlyRev).toFixed(0)}
              </p>
            </div>
            <div style={{ width: 1, background: BORDER }} />
            <div>
              <p style={{ fontSize: 11, color: TEXT3, marginBottom: 3 }}>Ø MONATLICH</p>
              <p style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 16, color: TEXT }}>
                €{(totalRev / 12).toFixed(0)}
              </p>
            </div>
            <div style={{ width: 1, background: BORDER }} />
            <div>
              <p style={{ fontSize: 11, color: TEXT3, marginBottom: 3 }}>DIESEN MONAT</p>
              <p style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 16, color: ORANGE }}>
                €{revThisMonth.toFixed(0)}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Top products + category */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>

        {/* Top products */}
        <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 18, padding: "22px" }}>
          <h2 style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 16, color: TEXT, marginBottom: 20 }}>Top Produkte</h2>
          {topProducts.length === 0 ? (
            <p style={{ color: TEXT3, fontSize: 13, textAlign: "center", padding: "32px 0" }}>Noch keine Daten.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {topProducts.map((p, i) => (
                <div key={p.name}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 13, color: i === 0 ? ORANGE : TEXT3, width: 18 }}>#{i + 1}</span>
                      <span style={{ fontSize: 13, fontWeight: 600, color: TEXT, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 150 }}>{p.name}</span>
                    </div>
                    <div style={{ display: "flex", gap: 10, alignItems: "center", flexShrink: 0 }}>
                      <span style={{ fontSize: 11, color: TEXT3 }}>{p.units} Stk.</span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: TEXT }}>€{p.rev.toFixed(0)}</span>
                    </div>
                  </div>
                  <div style={{ height: 6, background: BORDER, borderRadius: 3, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${(p.rev / maxProdRev) * 100}%`, background: i === 0 ? ORANGE : TEXT3, borderRadius: 3, transition: "width 0.6s ease", opacity: i === 0 ? 1 : 0.5 }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Category breakdown */}
        <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 18, padding: "22px" }}>
          <h2 style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 16, color: TEXT, marginBottom: 20 }}>Umsatz nach Kategorie</h2>
          {cats.length === 0 ? (
            <p style={{ color: TEXT3, fontSize: 13, textAlign: "center", padding: "32px 0" }}>Noch keine Daten.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {cats.map(([cat, rev], i) => {
                const pct = (rev / totalCatRev) * 100;
                return (
                  <div key={cat}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ width: 10, height: 10, borderRadius: "50%", background: CAT_COLORS[i] || TEXT3, flexShrink: 0 }} />
                        <span style={{ fontSize: 13, fontWeight: 600, color: TEXT }}>{cat}</span>
                      </div>
                      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                        <span style={{ fontSize: 11, color: TEXT3 }}>{pct.toFixed(1)}%</span>
                        <span style={{ fontSize: 13, fontWeight: 700, color: TEXT }}>€{rev.toFixed(0)}</span>
                      </div>
                    </div>
                    <div style={{ height: 6, background: BORDER, borderRadius: 3, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${pct}%`, background: CAT_COLORS[i] || TEXT3, borderRadius: 3, transition: "width 0.6s ease" }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Order status */}
      <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 18, padding: "22px" }}>
        <h2 style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 16, color: TEXT, marginBottom: 20 }}>Bestellstatus-Übersicht</h2>
        {!hasData ? (
          <p style={{ color: TEXT3, fontSize: 13, textAlign: "center", padding: "20px 0" }}>Noch keine Bestellungen.</p>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12 }}>
            {Object.entries(STATUS_CONFIG).map(([key, s]) => {
              const count = items.filter(i => i.orders?.status === key).length;
              const pct = items.length > 0 ? (count / items.length) * 100 : 0;
              return (
                <div key={key} style={{ background: s.bg, borderRadius: 14, padding: "16px", textAlign: "center" }}>
                  <p style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 28, color: s.color }}>{count}</p>
                  <p style={{ fontSize: 12, fontWeight: 700, color: s.color, marginTop: 4 }}>{s.label}</p>
                  <p style={{ fontSize: 11, color: s.color, opacity: 0.7, marginTop: 2 }}>{pct.toFixed(0)}%</p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
