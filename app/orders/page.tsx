"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function OrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    fetchOrders();
  }, [statusFilter]);

  const fetchOrders = async () => {
    let query = supabase
      .from("orders")
      .select("*, order_items(*)")
      .order("created_at", { ascending: false });

    if (statusFilter !== "all") {
      query = query.eq("status", statusFilter);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching orders:", error.message);
    } else {
      setOrders(data || []);
    }

    setLoading(false);
  };

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-xl">Loading...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white p-8">
      <h1 className="text-4xl font-bold mb-10">Orders Dashboard</h1>

      {/* FILTER BUTTONS */}
      <div className="flex gap-4 mb-6">
        {["all", "pending", "completed", "cancelled"].map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-4 py-2 rounded-xl ${
              statusFilter === s
                ? "bg-red-600 text-white"
                : "bg-white shadow"
            }`}
          >
            {s.toUpperCase()}
          </button>
        ))}
      </div>

      {/* ORDERS LIST */}
      <div className="space-y-4">
        {orders.map((order) => (
          <div
            key={order.id}
            className="bg-white text-black rounded-2xl p-6 shadow"
          >
            <h2 className="text-2xl font-bold">
              Order #{order.id}
            </h2>

            <p className="mt-2 text-gray-500">
              Status: {order.status}
            </p>

            <p className="mt-2 text-gray-500">
              User: {order.users?.email || order.user_id}
            </p>

            <p className="mt-4 text-3xl font-bold">
              €{order.total_price}
            </p>

            {/* ORDER ITEMS */}
            <div className="mt-4 border-t pt-4">
              <h3 className="text-xl font-semibold mb-2">Items:</h3>

              {order.order_items?.length > 0 ? (
                <ul className="space-y-2">
                  {order.order_items.map((item: any) => (
                    <li
                      key={item.id}
                      className="flex justify-between bg-gray-100 p-3 rounded-xl"
                    >
                      <span>Product #{item.product_id}</span>
                      <span>Qty: {item.quantity}</span>
                      <span>€{item.price}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-gray-400">No items found</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
