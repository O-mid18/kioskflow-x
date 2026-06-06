"use client";

import { useEffect } from "react";
import { supabase } from "@/lib/supabase";

interface CartItem {
  quantity: number;
  products: { price: number };
}

export default function SuccessPage() {
  const saveOrder = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: cartItems } = await supabase.from("cart_items").select(`quantity, products ( price )`);

      const total = (cartItems as CartItem[])?.reduce((sum, item) => sum + item.products.price * item.quantity, 0);

      await supabase.from("orders").insert({ user_id: user.id, total, status: "paid" });

      await supabase.from("cart_items").delete().not("id", "is", null);
    } catch (err) {
      console.error("Failed to save order:", err);
    }
  };

  useEffect(() => {
    saveOrder();
  }, []);

  return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center p-6">
      <div className="relative overflow-hidden bg-gradient-to-br from-red-700 via-black to-gray-900 rounded-[40px] shadow-2xl p-12 max-w-2xl w-full text-center border border-white/10">
        <div className="text-[120px] mb-6 animate-bounce">
  🎉
</div>
        <h1 className="text-6xl font-black leading-tight">
  Payment
  <span className="text-red-500">
    {" "}Successful
  </span>
</h1>
        <p className="text-gray-300 mt-8 text-2xl leading-relaxed max-w-xl mx-auto">
  Your order has been placed successfully.
  Our suppliers are already preparing your shipment.
</p>
        <a href="/marketplace" className="inline-block mt-8 bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-2xl font-semibold transition-colors">Continue Shopping</a>
      </div>
    </main>
  );
}
