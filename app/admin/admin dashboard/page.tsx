"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import toast, { Toaster } from "react-hot-toast";

interface SupplierProfile {
  id: string;
  company_name: string | null;
  full_name: string | null;
  email: string | null;
  city: string | null;
  status: string;
}

export default function AdminDashboard() {
  const [suppliers, setSuppliers] = useState<SupplierProfile[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSuppliers = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from("profiles")
      .select("id, company_name, full_name, city, status")
      .eq("role", "supplier")
      .in("status", ["pending", "active", "rejected"]);

    if (error) {
      toast.error(error.message);
    } else {
      setSuppliers(data as any);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const updateStatus = async (id: string, status: "active" | "rejected") => {
    const { error } = await supabase
      .from("profiles")
      .update({ status })
      .eq("id", id);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success(`Supplier ${status}`);
      fetchSuppliers();
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen p-6">
        <Toaster />
        <p>Loading...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-6 max-w-3xl mx-auto">
      <Toaster />
      <h1 className="text-3xl font-bold mb-6">Admin – Suppliers</h1>

      {suppliers.length === 0 ? (
        <p>No suppliers found</p>
      ) : (
        <div className="space-y-4">
          {suppliers.map((s) => (
            <div
              key={s.id}
              className="border rounded-2xl p-4 flex items-center justify-between"
            >
              <div>
                <p className="font-bold">
                  {s.company_name || "No company name"}
                </p>
                <p className="text-sm text-gray-600">
                  Contact: {s.full_name || "-"} | City: {s.city || "-"}
                </p>
                <p className="text-sm">
                  Status:{" "}
                  <span
                    className={
                      s.status === "pending"
                        ? "text-yellow-600"
                        : s.status === "active"
                        ? "text-green-600"
                        : "text-red-600"
                    }
                  >
                    {s.status}
                  </span>
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => updateStatus(s.id, "active")}
                  className="px-3 py-2 rounded-xl bg-green-600 text-white text-sm"
                >
                  Approve
                </button>
                <button
                  onClick={() => updateStatus(s.id, "rejected")}
                  className="px-3 py-2 rounded-xl bg-red-600 text-white text-sm"
                >
                  Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
