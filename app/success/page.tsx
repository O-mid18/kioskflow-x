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
    <main className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl shadow p-10 max-w-md w-full text-center">
        <div className="text-6xl mb-4">🎉</div>
        <h1 className="text-3xl font-bold">Payment Successful</h1>
        <p className="text-gray-500 mt-6 text-lg">Your order has been placed successfully.</p>
        <a href="/marketplace" className="inline-block mt-8 bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-2xl font-semibold transition-colors">Continue Shopping</a>
      </div>
    </main>
  );
}
