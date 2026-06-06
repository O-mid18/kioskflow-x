"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import toast, { Toaster } from "react-hot-toast";

export default function BuyerSignupPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [address, setAddress] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [city, setCity] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSignup = async () => {
    if (!email || !password || !fullName) {
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
        role: "buyer",
        status: "active",
        full_name: fullName,
        company_name: companyName,
        address,
        postal_code: postalCode,
        city,
        phone,
      });

      if (profileError) {
        toast.error(profileError.message);
        return;
      }

      toast.success("Buyer account created");
      setTimeout(() => router.push("/buyer/dashboard"), 1200);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <Toaster />
      <div className="w-full max-w-md rounded-2xl shadow-xl p-8 space-y-4">
        <h1 className="text-3xl font-bold">Buyer Signup</h1>

        <input
          className="w-full border p-3 rounded-xl"
          placeholder="Full name *"
          onChange={(e) => setFullName(e.target.value)}
        />
        <input
          className="w-full border p-3 rounded-xl"
          placeholder="Company name"
          onChange={(e) => setCompanyName(e.target.value)}
        />
        <input
          className="w-full border p-3 rounded-xl"
          placeholder="Address"
          onChange={(e) => setAddress(e.target.value)}
        />
        <input
          className="w-full border p-3 rounded-xl"
          placeholder="Postal code"
          onChange={(e) => setPostalCode(e.target.value)}
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
          className={`w-full bg-red-600 text-white p-3 rounded-xl ${
            loading ? "opacity-50 cursor-not-allowed" : "hover:bg-red-700"
          }`}
        >
          {loading ? "Creating..." : "Create Buyer Account"}
        </button>
      </div>
    </div>
  );
}
