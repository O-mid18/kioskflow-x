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

export default function CheckoutPage() {
  const [items, setItems] = useState<CartItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCart = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("cart_items")
        .select(`
          id,
          quantity,
          products (
            name,
            price
          )
        `);

      if (error) throw error;

      if (data) {
        const cartItems = data as CartItem[];
        setItems(cartItems);
        const totalPrice = cartItems.reduce(
          (sum, item) => sum + item.products.price * item.quantity,
          0
        );
        setTotal(totalPrice);
      }
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

  const handlePayment = async () => {
    try {
      setPaying(true);
      const res = await fetch("/api/checkout", { method: "POST" });

      if (!res.ok) throw new Error("Payment processing failed");

      const data = await res.json();
      window.location.href = data.url;
    } catch (err) {
      setError("Failed to connect to payment gateway");
      console.error(err);
    } finally {
      setPaying(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
        <p className="text-gray-500 text-lg">Loading...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 p-6 max-w-2xl mx-auto">
      <h1 className="text-4xl font-bold mb-8">Checkout</h1>

      {error && (
        <div className="bg-red-100 text-red-700 p-4 rounded-2xl mb-6">
          {error}
        </div>
      )}

      {items.length === 0 ? (
        <p className="text-gray-500 text-center mt-20">Your cart is empty</p>
      ) : (
        <>
          <div className="space-y-4">
            {items.map((item) => (
              <div key={item.id} className="bg-white rounded-2xl p-5 shadow">
                <h2 className="text-2xl font-bold">{item.products?.name}</h2>
                <p className="text-gray-500 mt-2">Quantity: {item.quantity}</p>
                <p className="text-2xl font-bold mt-4">
                  €{(item.products?.price * item.quantity).toFixed(2)}
                </p>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-2xl p-6 shadow mt-10">
            <h2 className="text-3xl font-bold">Total: €{total.toFixed(2)}</h2>
            <button
              onClick={handlePayment}
              disabled={paying}
              className="mt-6 w-full bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white py-4 rounded-2xl text-lg font-semibold transition-colors"
            >
              {paying ? "Processing..." : "Confirm & Pay"}
            </button>
          </div>
        </>
      )}
    </main>
  );
}
