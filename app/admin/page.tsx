"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { supabase } from "@/lib/supabase";

type Product = {
  id: string;
  name: string;
  price: number;
  stock: number;
  category: string;
  image_url?: string;
};
type Order = {
  id: string;
  user_id: string;
  status: string;
  total_price: number;
  created_at: string;
};

type Supplier = {
  id: string;
  name: string;
};

type User = {
  id: string;
  created_at: string;
};

export default function AdminPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  // Dark mode
  const [dark, setDark] = useState(false);

  // Pagination
  const [page, setPage] = useState(1);
  const itemsPerPage = 10;

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");

  // Notifications
  const [notifications, setNotifications] = useState<string[]>([]);

  // Product form (CRUD)
  const [newProduct, setNewProduct] = useState({
  name: "",
  price: "",
  stock: "",
  category: "",
  image_url: "",
});

  useEffect(() => {
    loadData();
  }, []);

  const pushNotification = (msg: string) => {
    setNotifications((prev) => [msg, ...prev].slice(0, 4));
  };

  const loadData = async () => {
    await Promise.all([
      fetchProducts(),
      fetchOrders(),
      fetchSuppliers(),
      fetchUsers(),
    ]);
    setLoading(false);
  };

  const fetchProducts = async () => {
    const { data, error } = await supabase.from("products").select("*");
    if (!error && data) setProducts(data as any);
  };

  const fetchOrders = async () => {
    const { data, error } = await supabase.from("orders").select("*");
    if (!error && data) setOrders(data as any);
  };

  const fetchSuppliers = async () => {
    const { data, error } = await supabase.from("suppliers").select("*");
    if (!error && data) setSuppliers(data as any);
  };

  const fetchUsers = async () => {
    const { data, error } = await supabase.from("users").select("*");
    if (!error && data) setUsers(data as any);
  };

  // Filtered orders
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      if (statusFilter !== "all" && o.status !== statusFilter) return false;
      const d = new Date(o.created_at);
      if (dateFrom && d < new Date(dateFrom)) return false;
      if (dateTo && d > new Date(dateTo + "T23:59:59")) return false;
      return true;
    });
  }, [orders, statusFilter, dateFrom, dateTo]);

  // Daily revenue (last 7 days)
  const dailyRevenue = useMemo(() => {
    const days: { date: string; revenue: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const revenue = filteredOrders
        .filter((o) => o.created_at.slice(0, 10) === key)
        .reduce((sum, o) => sum + Number(o.total_price || 0), 0);
      days.push({
        date: key.slice(5),
        revenue,
      });
    }
    return days;
  }, [filteredOrders]);

  // Monthly revenue (12 months)
  const monthlyRevenue = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => ({
      month: new Date(0, i).toLocaleString("en", { month: "short" }),
      revenue: orders
        .filter((o) => new Date(o.created_at).getMonth() === i)
        .reduce((sum, o) => sum + Number(o.total_price || 0), 0),
    }));
  }, [orders]);

  // New users per month
  const monthlyUsers = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => ({
      month: new Date(0, i).toLocaleString("en", { month: "short" }),
      users: users.filter(
        (u) => new Date(u.created_at).getMonth() === i
      ).length,
    }));
  }, [users]);

  // Product categories pie
  const categoryCount: Record<string, number> = {};
  products.forEach((p) => {
    const key = p.category || "Unknown";
    categoryCount[key] = (categoryCount[key] || 0) + 1;
  });

  const pieData = Object.keys(categoryCount).map((key) => ({
    name: key,
    value: categoryCount[key],
  }));

  const COLORS = ["#dc2626", "#2563eb", "#16a34a", "#f59e0b", "#7c3aed"];

  // Export CSV
  const exportCSV = () => {
    const headers = "id,user_id,status,total_price,created_at\n";
    const rows = filteredOrders
      .map(
        (o) =>
          `${o.id},${o.user_id},${o.status},${o.total_price},${o.created_at}`
      )
      .join("\n");

    const blob = new Blob([headers + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "orders_filtered.csv";
    a.click();
    pushNotification("CSV exported successfully");
  };

  // Add product
  const handleAddProduct = async () => {
    if (!newProduct.name || !newProduct.price) return;
    const { data, error } = await supabase
      .from("products")
      .insert({
  name: newProduct.name,
  price: Number(newProduct.price),
  stock: Number(newProduct.stock || 0),
  category: newProduct.category || "General",
})
      .select("*")
      .single();

    if (!error && data) {
      setProducts((prev) => [data as any, ...prev]);
      setNewProduct({
  name: "",
  price: "",
  stock: "",
  category: "",
  image_url: "",
});
      pushNotification("Product added");
    }
  };

  // Delete product
  const handleDeleteProduct = async (id: string) => {
    await supabase.from("products").delete().eq("id", id);
    setProducts((prev) => prev.filter((p) => p.id !== id));
    pushNotification("Product deleted");
  };

  const totalRevenue = orders.reduce(
    (sum, o) => sum + Number(o.total_price || 0),
    0
  );

  if (loading) {
    return (
      <main
        className={`min-h-screen flex items-center justify-center ${
          dark ? "bg-gray-900 text-white" : "bg-gray-50"
        }`}
      >
        <p className="text-3xl font-bold">Loading...</p>
      </main>
    );
  }

  return (
    <main
      className={`min-h-screen p-8 transition-colors ${
        dark ? "bg-gray-900 text-white" : "bg-gray-50 text-gray-900"
      }`}
    >
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-5xl font-bold">Admin Panel SUPER PRO</h1>
        <button
          onClick={() => setDark((d) => !d)}
          className="px-4 py-2 rounded-xl border"
        >
          {dark ? "Light Mode" : "Dark Mode"}
        </button>
      </div>

      {/* Notifications */}
      {notifications.length > 0 && (
        <div className="mb-6 space-y-2">
          {notifications.map((n, i) => (
            <div
              key={i}
              className={`px-4 py-2 rounded-xl text-sm ${
                dark ? "bg-green-800" : "bg-green-100 text-green-800"
              }`}
            >
              {n}
            </div>
          ))}
        </div>
      )}

      {/* TOP CARDS */}
      <div className="grid md:grid-cols-5 gap-6 mb-12">
        <Card title="Products" value={products.length} />
        <Card title="Orders" value={orders.length} />
        <Card title="Suppliers" value={suppliers.length} />
        <Card title="Users" value={users.length} />
        <Card title="Revenue (€)" value={totalRevenue.toFixed(2)} />
      </div>

      {/* CHARTS ROW */}
      <div className="grid lg:grid-cols-2 gap-8 mb-12">
        <Section title="Daily Revenue (Last 7 Days)">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyRevenue}>
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="revenue" fill="#dc2626" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Section>

        <Section title="Monthly Revenue">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyRevenue}>
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="revenue" stroke="#2563eb" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Section>
      </div>

      {/* CHARTS ROW 2 */}
      <div className="grid lg:grid-cols-2 gap-8 mb-12">
        <Section title="New Users per Month">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyUsers}>
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="users" fill="#16a34a" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Section>

        <Section title="Product Categories">
          <div className="h-72 flex justify-center">
            <ResponsiveContainer width="80%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  outerRadius={110}
                  label
                >
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Section>
      </div>

      {/* PRODUCTS CRUD */}
      <Section title="Products Management">
        <div className="grid md:grid-cols-4 gap-4 mb-6">
          <input
            className="border rounded-xl px-3 py-2 bg-transparent"
            placeholder="Name"
            value={newProduct.name}
            onChange={(e) =>
              setNewProduct((p) => ({ ...p, name: e.target.value }))
            }
          />
          <input
  className="border rounded-xl px-3 py-2 bg-transparent"
  placeholder="Image URL"
  value={newProduct.image_url}
  onChange={(e) =>
    setNewProduct((p) => ({
      ...p,
      image_url: e.target.value,
    }))
  }
/>
          <input
            className="border rounded-xl px-3 py-2 bg-transparent"
            placeholder="Price"
            type="number"
            value={newProduct.price}
            onChange={(e) =>
              setNewProduct((p) => ({ ...p, price: e.target.value }))
            }
          />
          <input
            className="border rounded-xl px-3 py-2 bg-transparent"
            placeholder="Stock"
            type="number"
            value={newProduct.stock}
            onChange={(e) =>
              setNewProduct((p) => ({ ...p, stock: e.target.value }))
            }
          />
          <input
            className="border rounded-xl px-3 py-2 bg-transparent"
            placeholder="Category"
            value={newProduct.category}
            onChange={(e) =>
              setNewProduct((p) => ({ ...p, category: e.target.value }))
            }
          />
        </div>
        <button
          onClick={handleAddProduct}
          className="mb-6 px-4 py-2 bg-red-600 text-white rounded-xl"
        >
          Add Product
        </button>

        <div className="space-y-3 max-h-80 overflow-auto">
          {products.map((p) => (
            <div
              key={p.id}
              className="flex items-center justify-between border rounded-2xl px-4 py-3"
            >
              <div>
                {p.image_url && (
  <img
    src={p.image_url}
    alt={p.name}
    className="w-20 h-20 object-cover rounded-xl mb-2"
  />
)}
                <p className="font-bold">{p.name}</p>
                <p className="text-sm opacity-70">
                  €{p.price} • Stock: {p.stock} • {p.category}
                </p>
              </div>
              <button
                onClick={() => handleDeleteProduct(p.id)}
                className="px-3 py-1 text-sm bg-red-500 text-white rounded-xl"
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      </Section>

      {/* ORDERS + FILTERS */}
      <Section title="Orders">
        <div className="flex flex-wrap gap-4 mb-4">
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="border rounded-xl px-3 py-2 bg-transparent"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="paid">Paid</option>
            <option value="shipped">Shipped</option>
            <option value="delivered">Delivered</option>
          </select>

          <input
            type="date"
            value={dateFrom}
            onChange={(e) => {
              setDateFrom(e.target.value);
              setPage(1);
            }}
            className="border rounded-xl px-3 py-2 bg-transparent"
          />
          <input
            type="date"
            value={dateTo}
            onChange={(e) => {
              setDateTo(e.target.value);
              setPage(1);
            }}
            className="border rounded-xl px-3 py-2 bg-transparent"
          />

          <button
            onClick={exportCSV}
            className="px-4 py-2 bg-red-600 text-white rounded-xl"
          >
            Export CSV (Filtered)
          </button>
        </div>

        <div className="space-y-4">
          {filteredOrders
            .slice((page - 1) * itemsPerPage, page * itemsPerPage)
            .map((order) => (
              <div key={order.id} className="border rounded-2xl p-4">
                <p className="font-bold">Order ID: {order.id}</p>
                <p className="text-sm opacity-70">
                  {order.created_at.slice(0, 19).replace("T", " ")}
                </p>
                <p className="text-gray-500 mt-2">User: {order.user_id}</p>
                <p className="text-gray-500 mt-2">Status: {order.status}</p>

                <select
                  value={order.status}
                  onChange={async (e) => {
                    await supabase
                      .from("orders")
                      .update({ status: e.target.value })
                      .eq("id", order.id);
                    fetchOrders();
                    pushNotification(
                      `Order ${order.id} status updated to ${e.target.value}`
                    );
                  }}
                  className="mt-3 border rounded-xl px-4 py-2 bg-transparent"
                >
                  <option value="pending">Pending</option>
                  <option value="paid">Paid</option>
                  <option value="shipped">Shipped</option>
                  <option value="delivered">Delivered</option>
                </select>

                <p className="text-2xl font-bold mt-3">
                  €{order.total_price}
                </p>
              </div>
            ))}
        </div>

        {/* Pagination */}
        <div className="flex justify-between mt-6">
          <button
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
            className="px-4 py-2 bg-gray-300 rounded-xl disabled:opacity-50"
          >
            Prev
          </button>

          <button
            disabled={page * itemsPerPage >= filteredOrders.length}
            onClick={() => setPage((p) => p + 1)}
            className="px-4 py-2 bg-gray-300 rounded-xl disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </Section>
    </main>
  );
}

function Card({ title, value }: { title: string; value: string | number }) {
  return (
    <div className="bg-white/80 dark:bg-white/5 rounded-3xl p-6 shadow border border-white/40 dark:border-white/10">
      <h2 className="text-2xl font-bold">{title}</h2>
      <p className="text-4xl md:text-5xl font-bold mt-4">{value}</p>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white/80 dark:bg-white/5 rounded-3xl p-6 shadow border border-white/40 dark:border-white/10 mb-10">
      <h2 className="text-3xl font-bold mb-6">{title}</h2>
      {children}
    </div>
  );
}