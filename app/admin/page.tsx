"use client";

import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { supabase } from "@/lib/supabase";

export default function AdminPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);

  useEffect(() => {
    fetchProducts();
    fetchOrders();
  }, []);

  const fetchProducts = async () => {
    const { data } = await supabase
      .from("products")
      .select("*");

    if (data) {
      setProducts(data);
    }
  };

  const fetchOrders = async () => {
    const { data } = await supabase
      .from("orders")
      .select("*");

    if (data) {
      setOrders(data);
    }
  };
const chartData = [
  {
    name: "Orders",
    value: orders.length,
  },

  {
    name: "Products",
    value: products.length,
  },

  {
    name: "Revenue",
    value: orders.reduce(
      (total, order) =>
        total + Number(order.total_price || 0),
      0
    ),
  },
];
  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <h1 className="text-5xl font-bold mb-10">
        Admin Panel
      </h1>

      <div className="grid md:grid-cols-3 gap-6 mb-12">
        <div className="bg-white rounded-3xl p-6 shadow">
          <h2 className="text-2xl font-bold">
            Total Products
          </h2>

          <p className="text-5xl font-bold mt-4">
            {products.length}
          </p>
        </div>

        <div className="bg-white rounded-3xl p-6 shadow">
          <h2 className="text-2xl font-bold">
            Total Orders
          </h2>

          <p className="text-5xl font-bold mt-4">
            {orders.length}
          </p>
        </div>

        <div className="bg-white rounded-3xl p-6 shadow">
          <h2 className="text-2xl font-bold">
            Revenue
          </h2>

          <p className="text-5xl font-bold mt-4">
            €
            {orders.reduce(
              (total, order) => total + Number(order.total_price || 0),
              0
            )}
          </p>
        </div>
      </div>
<div className="bg-white rounded-3xl p-6 shadow mb-12">
  <h2 className="text-3xl font-bold mb-6">
    Analytics
  </h2>

  <div className="h-80">
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={chartData}>
        <XAxis dataKey="name" />
        <YAxis />
        <Tooltip />

        <Bar dataKey="value" fill="#dc2626" />
      </BarChart>
    </ResponsiveContainer>
  </div>
</div>
      <div className="bg-white rounded-3xl p-6 shadow">
        <h2 className="text-3xl font-bold mb-6">
          Recent Orders
        </h2>

        <div className="space-y-4">
          {orders.map((order) => (
            <div
              key={order.id}
              className="border rounded-2xl p-4"
            >
              <p className="font-bold">
                Order ID: {order.id}
              </p>

              <p className="text-gray-500 mt-2">
                User: {order.user_id}
              </p>

              <p className="text-gray-500 mt-2">
                Status: {order.status}
              </p>

              <select
                value={order.status}
                onChange={async (e) => {
                  await supabase
                    .from("orders")
                    .update({
                      status: e.target.value,
                    })
                    .eq("id", order.id);

                  fetchOrders();
                }}
                className="mt-3 border rounded-xl px-4 py-2"
              >
                <option value="pending">
                  Pending
                </option>

                <option value="paid">
                  Paid
                </option>

                <option value="shipped">
                  Shipped
                </option>

                <option value="delivered">
                  Delivered
                </option>
              </select>

              <p className="text-2xl font-bold mt-3">
                order.total_price
              </p>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}