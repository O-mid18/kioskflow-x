"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

interface Product {
  name: string;
  price: number;
}

interface CartItem {
  id: string;
  quantity: number;
  products: Product;
}

export default function CartPage() {
  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCart = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.from("cart_items").select(`id, quantity, products ( name, price )`);
      if (error) throw error;
      if (data) setItems(data as CartItem[]);
    } catch (err) {
      setError("Failed to load cart");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCart();
  }, []);

  const increaseQuantity = async (id: string, quantity: number) => {
    const { error } = await supabase.from("cart_items").update({ quantity: quantity + 1 }).eq("id", id);
    if (!error) fetchCart();
  };

  const decreaseQuantity = async (id: string, quantity: number) => {
    if (quantity <= 1) return;
    const { error } = await supabase.from("cart_items").update({ quantity: quantity - 1 }).eq("id", id);
    if (!error) fetchCart();
  };

  const removeItem = async (id: string) => {
    const { error } = await supabase.from("cart_items").delete().eq("id", id);
    if (!error) fetchCart();
  };

  const removeAllCart = async () => {
    const { error } = await supabase.from("cart_items").delete().not("id", "is", null);
    if (!error) setItems([]);
  };

  const total = items.reduce((sum, item) => sum + item.products.price * item.quantity, 0);

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500 text-lg">Loading...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 p-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-4xl font-bold">Your Cart</h1>
        {items.length > 0 && (
          <button onClick={removeAllCart} className="bg-gray-200 hover:bg-red-100 text-red-600 px-4 py-2 rounded-2xl font-semibold transition-colors">
            Remove All
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-100 text-red-700 p-4 rounded-2xl mb-6">{error}</div>
      )}

      {items.length === 0 ? (
        <p className="text-gray-500 text-center mt-20">Your cart is empty</p>
      ) : (
        <div className="space-y-4">
          {items.map((item) => (
            <div key={item.id} className="bg-white rounded-2xl p-5 shadow">
              <h2 className="text-2xl font-bold">{item.products?.name}</h2>
              <p className="text-2xl font-bold mt-4">€{(item.products?.price * item.quantity).toFixed(2)}</p>

              <div className="flex items-center gap-4 mt-6">
                <button onClick={() => decreaseQuantity(item.id, item.quantity)} className="bg-gray-200 w-10 h-10 rounded-xl text-xl font-bold">-</button>
                <span className="text-xl font-bold">{item.quantity}</span>
                <button onClick={() => increaseQuantity(item.id, item.quantity)} className="bg-red-600 text-white w-10 h-10 rounded-xl text-xl font-bold">+</button>
              </div>

              <button onClick={() => removeItem(item.id)} className="mt-6 bg-black hover:bg-gray-800 text-white px-4 py-2 rounded-xl transition-colors">
                Remove
              </button>
            </div>
          ))}

          <div className="bg-white rounded-2xl p-6 shadow mt-10">
            <h2 className="text-3xl font-bold">Total: €{total.toFixed(2)}</h2>
            <a href="/checkout" className="inline-block mt-6 w-full text-center bg-red-600 hover:bg-red-700 text-white py-4 rounded-2xl text-lg font-semibold transition-colors">
              Proceed to Checkout
            </a>
          </div>
        </div>
      )}
    </main>
  );
}
