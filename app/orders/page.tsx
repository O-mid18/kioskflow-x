"use client";

import { useEffect, useState } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
import { supabase } from "@/lib/supabase";

// ─── Types ────────────────────────────────────────────────────────────────────
interface OrderItem {
  id: number;
  product_id: number;
  quantity: number;
  price: number;
}

interface Order {
  id: number;
  status: "pending" | "processing" | "completed" | "cancelled";
  total_price: number;
  created_at: string;
  user_id: string;
  users?: { email: string };
  order_items?: OrderItem[];
}

// ─── Status config ────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  pending:    { color: "text-yellow-500", bg: "bg-yellow-100", dot: "bg-yellow-500", label: "Pending" },
  processing: { color: "text-blue-500",   bg: "bg-blue-100",   dot: "bg-blue-500",   label: "Processing" },
  completed:  { color: "text-green-500",  bg: "bg-green-100",  dot: "bg-green-500",  label: "Completed" },
  cancelled:  { color: "text-red-500",    bg: "bg-red-100",    dot: "bg-red-500",    label: "Cancelled" },
};

const STEPS = ["pending", "processing", "completed"];

// ─── Order Progress Bar ───────────────────────────────────────────────────────
function OrderProgress({ status }: { status: Order["status"] }) {
  if (status === "cancelled") {
    return (
      <div className="mt-4 flex items-center gap-2">
        <span className="bg-red-100 text-red-600 text-xs font-bold px-3 py-1 rounded-full">
          ❌ Order Cancelled
        </span>
      </div>
    );
  }

  const currentStep = STEPS.indexOf(status);

  return (
    <div className="mt-6">
      <div className="flex items-center gap-0">
        {STEPS.map((step, i) => {
          const done = i <= currentStep;
          return (
            <div key={step} className="flex items-center">
              <div
                className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold transition ${
                  done ? "bg-red-600 text-white" : "bg-gray-200 text-gray-400"
                }`}
              >
                {done ? "✓" : i + 1}
              </div>
              {i < STEPS.length - 1 && (
                <div className={`w-20 h-1 transition ${done && i < currentStep ? "bg-red-600" : "bg-gray-200"}`} />
              )}
            </div>
          );
        })}
      </div>
      <div className="flex justify-between text-xs mt-2 text-gray-400 w-[calc(5*1.25rem+2*5rem)]">
        <span>Pending</span>
        <span className="ml-8">Processing</span>
        <span>Completed</span>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [expandedOrder, setExpandedOrder] = useState<number | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState<number | null>(null);
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "highest" | "lowest">("newest");

  useEffect(() => {
    fetchOrders();
  }, [statusFilter]);

  const fetchOrders = async () => {
    setLoading(true);
    let query = supabase
      .from("orders")
      .select("*, order_items(*)")
      .order("created_at", { ascending: false });

    if (statusFilter !== "all") {
      query = query.eq("status", statusFilter);
    }

    const { data, error } = await query;
    if (error) console.error("Error fetching orders:", error.message);
    setOrders(data || []);
    setLoading(false);
  };

  const updateStatus = async (orderId: number, newStatus: Order["status"]) => {
    setUpdatingStatus(orderId);
    const { error } = await supabase
      .from("orders")
      .update({ status: newStatus })
      .eq("id", orderId);

    if (!error) {
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
      );
    }
    setUpdatingStatus(null);
  };

  // Stats
  const totalRevenue = orders.reduce((sum, o) => sum + Number(o.total_price || 0), 0);
  const avgOrderValue = orders.length ? (totalRevenue / orders.length).toFixed(2) : "0.00";

  const chartData = [
    { name: "Revenue (€)", value: totalRevenue },
    { name: "Orders", value: orders.length },
    { name: "Pending", value: orders.filter((o) => o.status === "pending").length },
    { name: "Completed", value: orders.filter((o) => o.status === "completed").length },
  ];

  // Filter + sort
  const filteredOrders = orders
    .filter((o) => {
      const q = search.toLowerCase();
      return (
        String(o.id).includes(q) ||
        (o.users?.email || o.user_id || "").toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      if (sortBy === "newest") return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      if (sortBy === "oldest") return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      if (sortBy === "highest") return Number(b.total_price) - Number(a.total_price);
      return Number(a.total_price) - Number(b.total_price);
    });

  if (loading) {
    return (
      <main className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-red-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white text-xl">Loading orders...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-10">
        <div>
          <h1 className="text-5xl font-black">Orders Dashboard</h1>
          <p className="text-gray-400 mt-1">{orders.length} total orders</p>
        </div>
        <button
          onClick={fetchOrders}
          className="bg-red-600 hover:bg-red-700 transition px-6 py-3 rounded-2xl font-bold"
        >
          ↻ Refresh
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid md:grid-cols-5 gap-4 mb-10">
        {[
          { label: "Total Orders", value: orders.length, color: "text-black" },
          { label: "Pending", value: orders.filter((o) => o.status === "pending").length, color: "text-yellow-500" },
          { label: "Processing", value: orders.filter((o) => o.status === "processing").length, color: "text-blue-500" },
          { label: "Completed", value: orders.filter((o) => o.status === "completed").length, color: "text-green-500" },
          { label: "Cancelled", value: orders.filter((o) => o.status === "cancelled").length, color: "text-red-500" },
        ].map((stat) => (
          <div key={stat.label} className="bg-white text-black rounded-3xl p-5 shadow">
            <p className="text-gray-500 text-sm">{stat.label}</p>
            <h2 className={`text-4xl font-black mt-1 ${stat.color}`}>{stat.value}</h2>
          </div>
        ))}
      </div>

      {/* Revenue + Avg */}
      <div className="grid md:grid-cols-2 gap-4 mb-10">
        <div className="bg-gradient-to-br from-red-600 to-black rounded-3xl p-6 shadow">
          <p className="text-red-200 text-sm">Total Revenue</p>
          <h2 className="text-5xl font-black mt-1">€{totalRevenue.toFixed(2)}</h2>
        </div>
        <div className="bg-white text-black rounded-3xl p-6 shadow">
          <p className="text-gray-500 text-sm">Avg Order Value</p>
          <h2 className="text-5xl font-black mt-1">€{avgOrderValue}</h2>
        </div>
      </div>

      {/* Chart */}
      <div className="bg-white text-black rounded-3xl p-6 mb-10 shadow">
        <h2 className="text-2xl font-bold mb-4">📊 Overview</h2>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={chartData}>
            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip />
            <Bar dataKey="value" fill="#dc2626" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Search + Sort + Filter */}
      <div className="flex flex-wrap gap-4 mb-6">
        <input
          type="text"
          placeholder="Search by order ID or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 min-w-[200px] p-3 rounded-2xl bg-gray-900 text-white border border-gray-700 focus:outline-none focus:border-red-500 transition"
        />
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
          className="p-3 rounded-2xl bg-gray-900 text-white border border-gray-700 focus:outline-none"
        >
          <option value="newest">Newest First</option>
          <option value="oldest">Oldest First</option>
          <option value="highest">Highest Price</option>
          <option value="lowest">Lowest Price</option>
        </select>
      </div>

      {/* Status Filter */}
      <div className="flex gap-3 mb-8 flex-wrap">
        {["all", "pending", "processing", "completed", "cancelled"].map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-4 py-2 rounded-xl font-medium transition ${
              statusFilter === s
                ? "bg-red-600 text-white"
                : "bg-white text-black hover:bg-gray-100"
            }`}
          >
            {s.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Orders List */}
      {filteredOrders.length === 0 ? (
        <div className="text-center text-gray-500 py-20">
          <p className="text-5xl mb-4">📭</p>
          <p className="text-xl">No orders found</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => {
            const cfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
            const isExpanded = expandedOrder === order.id;
            const isUpdating = updatingStatus === order.id;

            return (
              <div
                key={order.id}
                className="bg-white text-black rounded-3xl shadow overflow-hidden"
              >
                {/* Order Header — clickable to expand */}
                <div
                  className="p-6 cursor-pointer hover:bg-gray-50 transition"
                  onClick={() => setExpandedOrder(isExpanded ? null : order.id)}
                >
                  <div className="flex items-start justify-between flex-wrap gap-4">
                    <div>
                      <div className="flex items-center gap-3">
                        <h2 className="text-2xl font-bold">Order #{order.id}</h2>
                        <span className={`text-xs font-bold px-3 py-1 rounded-full ${cfg.bg} ${cfg.color}`}>
                          {cfg.label}
                        </span>
                      </div>
                      <p className="text-gray-400 text-sm mt-1">
                        {order.user_id || "Unknown user"}
                      </p>
                      <p className="text-gray-400 text-xs mt-1">
                        {new Date(order.created_at).toLocaleDateString("en-GB", {
                          day: "numeric", month: "short", year: "numeric",
                          hour: "2-digit", minute: "2-digit",
                        })}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-3xl font-black">€{Number(order.total_price).toFixed(2)}</p>
                      <p className="text-gray-400 text-sm">{order.order_items?.length || 0} items</p>
                    </div>
                  </div>

                  {/* Progress */}
                  <OrderProgress status={order.status} />
                </div>

                {/* Expanded Content */}
                {isExpanded && (
                  <div className="border-t px-6 pb-6">
                    {/* Status Update */}
                    <div className="mt-4 mb-4">
                      <p className="text-sm font-bold text-gray-500 mb-2">Update Status</p>
                      <div className="flex gap-2 flex-wrap">
                        {(["pending", "processing", "completed", "cancelled"] as Order["status"][]).map((s) => (
                          <button
                            key={s}
                            onClick={() => updateStatus(order.id, s)}
                            disabled={order.status === s || isUpdating}
                            className={`px-3 py-1 rounded-xl text-sm font-bold transition ${
                              order.status === s
                                ? `${STATUS_CONFIG[s].bg} ${STATUS_CONFIG[s].color} cursor-default`
                                : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                            }`}
                          >
                            {isUpdating && order.status !== s ? "..." : STATUS_CONFIG[s].label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Order Items */}
                    <h3 className="text-lg font-bold mb-3">Order Items</h3>
                    {order.order_items && order.order_items.length > 0 ? (
                      <div className="space-y-2">
                        {order.order_items.map((item) => (
                          <div
                            key={item.id}
                            className="flex justify-between items-center bg-gray-50 p-3 rounded-xl"
                          >
                            <span className="font-medium">Product #{item.product_id}</span>
                            <span className="text-gray-500 text-sm">Qty: {item.quantity}</span>
                            <span className="font-bold">€{Number(item.price).toFixed(2)}</span>
                          </div>
                        ))}
                        <div className="flex justify-between items-center pt-2 border-t font-black text-lg">
                          <span>Total</span>
                          <span>€{Number(order.total_price).toFixed(2)}</span>
                        </div>
                      </div>
                    ) : (
                      <p className="text-gray-400 text-sm">No items found</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}