"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import toast, { Toaster } from "react-hot-toast";

export default function SupplierSignupPage() {
  const router = useRouter();
  const [companyName, setCompanyName] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [warehouseAddress, setWarehouseAddress] = useState("");
  const [city, setCity] = useState("");
  const [phone, setPhone] = useState("");
  const [productCategory, setProductCategory] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSignup = async () => {
    if (!email || !password || !companyName) {
      toast.error("Fill required fields");
      return;
    }

    try {
      setLoading(true);

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error || !data.user) {
        toast.error(error?.message || "Signup failed");
        return;
      }

      const { error: profileError } = await supabase.from("profiles").insert({
        id: data.user.id,
        role: "supplier",
        status: "pending",
        company_name: companyName,
        full_name: contactPerson,
        address: warehouseAddress,
        city,
        phone,
        product_category: productCategory,
      });

      if (profileError) {
        toast.error(profileError.message);
        return;
      }

      toast.success("Supplier request sent (pending approval)");
      setTimeout(() => router.push("/login"), 1500);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <Toaster />
      <div className="w-full max-w-md rounded-2xl shadow-xl p-8 space-y-4">
        <h1 className="text-3xl font-bold">Supplier Signup</h1>

        <input
          className="w-full border p-3 rounded-xl"
          placeholder="Company name *"
          onChange={(e) => setCompanyName(e.target.value)}
        />
        <input
          className="w-full border p-3 rounded-xl"
          placeholder="Contact person"
          onChange={(e) => setContactPerson(e.target.value)}
        />
        <input
          className="w-full border p-3 rounded-xl"
          placeholder="Warehouse address"
          onChange={(e) => setWarehouseAddress(e.target.value)}
        />
        <input
          className="w-full border p-3 rounded-xl"
          placeholder="City"
          onChange={(e) => setCity(e.target.value)}
        />
        <input
          className="w-full border p-3 rounded-xl"
          placeholder="Phone"
          onChange={(e) => setPhone(e.target.value)}
        />
        <input
          className="w-full border p-3 rounded-xl"
          placeholder="Product category"
          onChange={(e) => setProductCategory(e.target.value)}
        />
        <input
          type="email"
          className="w-full border p-3 rounded-xl"
          placeholder="Email *"
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          type="password"
          className="w-full border p-3 rounded-xl"
          placeholder="Password *"
          onChange={(e) => setPassword(e.target.value)}
        />

        <button
          onClick={handleSignup}
          disabled={loading}
          className={`w-full bg-black text-white p-3 rounded-xl ${
            loading ? "opacity-50 cursor-not-allowed" : "hover:bg-gray-800"
          }`}
        >
          {loading ? "Sending..." : "Request Supplier Account"}
        </button>
      </div>
    </div>
  );
}
