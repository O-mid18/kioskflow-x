"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

const BG     = "var(--kf-bg)";
const SURFACE = "var(--kf-surface)";
const BORDER  = "var(--kf-border)";
const TEXT    = "var(--kf-text)";
const TEXT2   = "var(--kf-text2)";
const TEXT3   = "var(--kf-text3)";
const ORANGE  = "#003ec7";
const ACCENT  = "var(--kf-accent)";
const BTN     = "var(--kf-btn)";

const MONTHS = ["Jan","Feb","Mär","Apr","Mai","Jun","Jul","Aug","Sep","Okt","Nov","Dez"];
const CAT_COLORS = [ORANGE,"#3b82f6","#8b5cf6","#10b981","#f59e0b","#ec4899"];
const PAID_STATUSES = ["paid", "preparing", "shipped", "delivered"];

type OrderItem = {
  quantity: number;
  price_at_purchase: number;
  shipping_cost_at_purchase: number | null;
  product_id: string;
  supplier_id: string | null;
  products: { name: string; category: string | null } | null;
  suppliers: { name: string } | null;
  orders: { status: string; created_at: string } | null;
};

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

function StatCard({ icon, label, value, sub, highlight, isDark }: { icon: string; label: string; value: string; sub: string; highlight?: boolean; isDark: boolean }) {
  const btnColor = isDark ? BTN : ORANGE;
  return (
    <div style={{ background: highlight ? btnColor : SURFACE, border: `1px solid ${highlight ? btnColor : BORDER}`, borderRadius: isDark ? 8 : 16, padding: "20px 22px" }}>
      <span style={{ fontSize: 22 }}>{icon}</span>
      <p style={{ fontFamily: "'Manrope',sans-serif", fontWeight: 800, fontSize: 24, color: highlight ? "#fff" : TEXT, margin: "10px 0 2px", letterSpacing: "-0.5px" }}>{value}</p>
      <p style={{ fontSize: 12, fontWeight: 700, color: highlight ? "rgba(255,255,255,0.85)" : TEXT2 }}>{label}</p>
      <p style={{ fontSize: 11, color: highlight ? "rgba(255,255,255,0.6)" : TEXT3, marginTop: 2 }}>{sub}</p>
    </div>
  );
}

export default function BuyerAnalyticsPage() {
  const [items, setItems]     = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod]   = useState<"month" | "year">("year");
  const [isDark, setIsDark]   = useState(false);

  useEffect(() => {
    const check = () => setIsDark(document.documentElement.classList.contains("dark"));
    check();
    const obs = new MutationObserver(check);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { window.location.href = "/login"; return; }

      const { data: orderData } = await supabase
        .from("order_items")
        .select("quantity, price_at_purchase, shipping_cost_at_purchase, product_id, supplier_id, products(name, category), suppliers(name), orders!inner(status, created_at, buyer_id)")
        .eq("orders.buyer_id", user.id);

      setItems((orderData as unknown as OrderItem[]) ?? []);
    } catch {
      // silent — loading state cleaned up in finally
    } finally {
      setLoading(false);
    }
  };

  const paidItems  = items.filter(i => i.orders && PAID_STATUSES.includes(i.orders.status));
  const totalSpend = paidItems.reduce((s, i) => s + i.price_at_purchase * i.quantity + (i.shipping_cost_at_purchase ?? 0), 0);
  const totalUnits = paidItems.reduce((s, i) => s + i.quantity, 0);
  const uniqueOrders = new Set(paidItems.map(i => i.orders?.created_at)).size;
  const avgOrderValue = uniqueOrders > 0 ? totalSpend / uniqueOrders : 0;

  const now = new Date();
  const thisMonth = now.getMonth();
  const lastMonth = thisMonth === 0 ? 11 : thisMonth - 1;
  const spendThisMonth = paidItems.filter(i => i.orders?.created_at && new Date(i.orders.created_at).getMonth() === thisMonth)
    .reduce((s, i) => s + i.price_at_purchase * i.quantity + (i.shipping_cost_at_purchase ?? 0), 0);
  const spendLastMonth = paidItems.filter(i => i.orders?.created_at && new Date(i.orders.created_at).getMonth() === lastMonth)
    .reduce((s, i) => s + i.price_at_purchase * i.quantity + (i.shipping_cost_at_purchase ?? 0), 0);
  const momChange = spendLastMonth > 0 ? ((spendThisMonth - spendLastMonth) / spendLastMonth) * 100 : null;

  const monthlySpend = Array(12).fill(0);
  for (const i of paidItems) {
    if (i.orders?.created_at) monthlySpend[new Date(i.orders.created_at).getMonth()] += i.price_at_purchase * i.quantity + (i.shipping_cost_at_purchase ?? 0);
  }
  const monthChartData = MONTHS.map((label, idx) => ({ label, value: Math.round(monthlySpend[idx]) }));

  const weeklySpend: number[] = Array(8).fill(0);
  for (const i of paidItems) {
    if (!i.orders?.created_at) continue;
    const diffWeeks = Math.floor((now.getTime() - new Date(i.orders.created_at).getTime()) / (7 * 24 * 60 * 60 * 1000));
    if (diffWeeks < 8) weeklySpend[7 - diffWeeks] += i.price_at_purchase * i.quantity + (i.shipping_cost_at_purchase ?? 0);
  }
  const weekChartData = weeklySpend.map((v, i) => ({ label: `W${i + 1}`, value: Math.round(v) }));

  const productSpend: Record<string, { name: string; spend: number; units: number }> = {};
  for (const i of paidItems) {
    const pid = i.product_id;
    const name = i.products?.name ?? "–";
    if (!productSpend[pid]) productSpend[pid] = { name, spend: 0, units: 0 };
    productSpend[pid].spend += i.price_at_purchase * i.quantity;
    productSpend[pid].units += i.quantity;
  }
  const topProducts = Object.values(productSpend).sort((a, b) => b.spend - a.spend).slice(0, 5);
  const maxProdSpend = topProducts[0]?.spend || 1;

  const supplierSpend: Record<string, number> = {};
  for (const i of paidItems) {
    const name = i.suppliers?.name ?? "Unbekannt";
    supplierSpend[name] = (supplierSpend[name] || 0) + i.price_at_purchase * i.quantity;
  }
  const topSuppliers = Object.entries(supplierSpend).sort((a, b) => b[1] - a[1]).slice(0, 6);
  const totalSupplierSpend = topSuppliers.reduce((s, [, v]) => s + v, 0) || 1;

  const hasData = paidItems.length > 0;
  const accentColor = isDark ? ACCENT : ORANGE;
  const btnColor    = isDark ? BTN    : ORANGE;

  if (loading) {
    return <div style={{ minHeight: "100vh", background: BG, display: "flex", alignItems: "center", justifyContent: "center", color: TEXT2 }}>Lade Analytik…</div>;
  }

  return (
    <div style={{ minHeight: "100vh", background: BG, padding: "32px", fontFamily: "'Inter','Helvetica Neue',system-ui,sans-serif" }}>
      <style>{``}</style>
      <div style={{ maxWidth: 1000, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
          <div>
            <a href="/orders" style={{ fontSize: 13, color: TEXT2, textDecoration: "none" }}>← Bestellungen</a>
            <h1 style={{ fontFamily: "'Manrope',sans-serif", fontWeight: 800, fontSize: 26, color: TEXT, letterSpacing: "-0.8px", marginTop: 6 }}>Meine Einkaufsanalyse</h1>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 24 }}>
          <StatCard icon="💶" label="Gesamtausgaben" value={`€${totalSpend.toFixed(2)}`} sub="Bezahlte Bestellungen" highlight isDark={isDark} />
          <StatCard icon="📦" label="Bestellte Positionen" value={String(paidItems.length)} sub="Alle Zeiträume" isDark={isDark} />
          <StatCard icon="🔢" label="Gekaufte Einheiten" value={String(totalUnits)} sub="Gesamt" isDark={isDark} />
          <StatCard
            icon={momChange !== null && momChange >= 0 ? "📈" : "📉"}
            label="Ausgaben diesen Monat"
            value={`€${spendThisMonth.toFixed(0)}`}
            sub={momChange !== null ? `${momChange >= 0 ? "+" : ""}${momChange.toFixed(1)}% vs. letzten Monat` : "Erster Monat"}
            isDark={isDark}
          />
        </div>

        <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: isDark ? 8 : 18, padding: "22px", marginBottom: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <div>
              <h2 style={{ fontFamily: "'Manrope',sans-serif", fontWeight: 800, fontSize: 16, color: TEXT }}>Ausgabenverlauf</h2>
              <p style={{ fontSize: 12, color: TEXT3, marginTop: 2 }}>{period === "year" ? "Monatsübersicht" : "Letzte 8 Wochen"}</p>
            </div>
            <div style={{ display: "flex", background: BG, borderRadius: 10, padding: 3 }}>
              {(["year", "month"] as const).map(p => (
                <button key={p} onClick={() => setPeriod(p)}
                  style={{ padding: "6px 14px", borderRadius: 8, border: "none", fontSize: 12, fontWeight: 700, cursor: "pointer", background: period === p ? btnColor : "transparent", color: period === p ? "#fff" : TEXT3, transition: "all 0.2s" }}>
                  {p === "year" ? "Jahr" : "Wochen"}
                </button>
              ))}
            </div>
          </div>
          {!hasData ? (
            <div style={{ height: 100, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <p style={{ color: TEXT3, fontSize: 13 }}>Noch keine Bestellungen.</p>
            </div>
          ) : (
            <BarChart data={period === "year" ? monthChartData : weekChartData} color={`${ORANGE}CC`} />
          )}
          {hasData && (
            <div style={{ display: "flex", gap: 24, marginTop: 16, paddingTop: 16, borderTop: `1px solid ${BORDER}` }}>
              <div>
                <p style={{ fontSize: 11, color: TEXT3, marginBottom: 3 }}>Ø PRO BESTELLUNG</p>
                <p style={{ fontFamily: "'Manrope',sans-serif", fontWeight: 800, fontSize: 16, color: TEXT }}>€{avgOrderValue.toFixed(2)}</p>
              </div>
              <div style={{ width: 1, background: BORDER }} />
              <div>
                <p style={{ fontSize: 11, color: TEXT3, marginBottom: 3 }}>Ø MONATLICH</p>
                <p style={{ fontFamily: "'Manrope',sans-serif", fontWeight: 800, fontSize: 16, color: TEXT }}>€{(totalSpend / 12).toFixed(0)}</p>
              </div>
              <div style={{ width: 1, background: BORDER }} />
              <div>
                <p style={{ fontSize: 11, color: TEXT3, marginBottom: 3 }}>DIESEN MONAT</p>
                <p style={{ fontFamily: "'Manrope',sans-serif", fontWeight: 800, fontSize: 16, color: accentColor }}>€{spendThisMonth.toFixed(0)}</p>
              </div>
            </div>
          )}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
          <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: isDark ? 8 : 18, padding: "22px" }}>
            <h2 style={{ fontFamily: "'Manrope',sans-serif", fontWeight: 800, fontSize: 16, color: TEXT, marginBottom: 20 }}>Meistgekaufte Produkte</h2>
            {topProducts.length === 0 ? (
              <p style={{ color: TEXT3, fontSize: 13, textAlign: "center", padding: "32px 0" }}>Noch keine Daten.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {topProducts.map((p, i) => (
                  <div key={p.name}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontFamily: "'Manrope',sans-serif", fontWeight: 800, fontSize: 13, color: i === 0 ? accentColor : TEXT3, width: 18 }}>#{i + 1}</span>
                        <span style={{ fontSize: 13, fontWeight: 600, color: TEXT, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 150 }}>{p.name}</span>
                      </div>
                      <div style={{ display: "flex", gap: 10, alignItems: "center", flexShrink: 0 }}>
                        <span style={{ fontSize: 11, color: TEXT3 }}>{p.units} Stk.</span>
                        <span style={{ fontSize: 13, fontWeight: 700, color: TEXT }}>€{p.spend.toFixed(0)}</span>
                      </div>
                    </div>
                    <div style={{ height: 6, background: BORDER, borderRadius: 3, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${(p.spend / maxProdSpend) * 100}%`, background: i === 0 ? accentColor : TEXT3, borderRadius: 3, transition: "width 0.6s ease", opacity: i === 0 ? 1 : 0.5 }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: isDark ? 8 : 18, padding: "22px" }}>
            <h2 style={{ fontFamily: "'Manrope',sans-serif", fontWeight: 800, fontSize: 16, color: TEXT, marginBottom: 20 }}>Top Lieferanten</h2>
            {topSuppliers.length === 0 ? (
              <p style={{ color: TEXT3, fontSize: 13, textAlign: "center", padding: "32px 0" }}>Noch keine Daten.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {topSuppliers.map(([name, spend], i) => {
                  const pct = (spend / totalSupplierSpend) * 100;
                  return (
                    <div key={name}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <div style={{ width: 10, height: 10, borderRadius: "50%", background: CAT_COLORS[i] || TEXT3, flexShrink: 0 }} />
                          <span style={{ fontSize: 13, fontWeight: 600, color: TEXT }}>{name}</span>
                        </div>
                        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                          <span style={{ fontSize: 11, color: TEXT3 }}>{pct.toFixed(1)}%</span>
                          <span style={{ fontSize: 13, fontWeight: 700, color: TEXT }}>€{spend.toFixed(0)}</span>
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
      </div>
    </div>
  );
}
