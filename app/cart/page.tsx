"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import toast, { Toaster } from "react-hot-toast";

interface Product {
  id: string;
  name: string;
  price: number;
  image_url: string | null;
}

interface CartItem {
  id: string;
  quantity: number;
  products: Product;
}

export default function CartPage() {
  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [discountCode, setDiscountCode] = useState("");
  const [discount, setDiscount] = useState(0);

  const fallbackImage =
    "https://via.placeholder.com/400x300.png?text=No+Image";

  const fetchCart = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from("cart_items")
        .select(`
          id,
          quantity,
          products (
            id,
            name,
            price,
            image_url
          )
        `);

      if (error) throw error;

      setItems(data || []);
      localStorage.setItem("cart", JSON.stringify(data || []));
    } catch (err) {
      toast.error("Failed to load cart");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCart();
  }, []);

  const increaseQuantity = async (id: string, quantity: number) => {
    await supabase.from("cart_items").update({ quantity: quantity + 1 }).eq("id", id);
    toast.success("Quantity updated");
    fetchCart();
  };

  const decreaseQuantity = async (id: string, quantity: number) => {
    if (quantity <= 1) return;
    await supabase.from("cart_items").update({ quantity: quantity - 1 }).eq("id", id);
    toast.success("Quantity updated");
    fetchCart();
  };

  const removeItem = async (id: string) => {
    await supabase.from("cart_items").delete().eq("id", id);
    toast.success("Item removed");
    fetchCart();
  };

  const removeAllCart = async () => {
    await supabase.from("cart_items").delete().neq("id", "");
    setItems([]);
    toast.success("Cart cleared");
  };

  const applyDiscount = () => {
    if (discountCode === "OMED10") {
      setDiscount(0.1);
      toast.success("10% discount applied");
    } else if (discountCode === "OMED20") {
      setDiscount(0.2);
      toast.success("20% discount applied");
    } else {
      toast.error("Invalid discount code");
    }
  };

  const subtotal = items.reduce(
    (sum, item) => sum + item.products.price * item.quantity,
    0
  );

  const total = subtotal - subtotal * discount;

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 p-6 max-w-2xl mx-auto">
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse bg-white p-6 rounded-2xl shadow">
              <div className="h-6 bg-gray-200 rounded w-1/2"></div>
              <div className="h-6 bg-gray-200 rounded w-1/3 mt-4"></div>
              <div className="h-10 bg-gray-200 rounded mt-6"></div>
            </div>
          ))}
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 p-6 max-w-2xl mx-auto">
      <Toaster />

      <div className="flex items-center justify-between mb-8">
        <h1 className="text-4xl font-bold">Your Cart</h1>

        {items.length > 0 && (
          <button
            onClick={removeAllCart}
            className="bg-gray-200 hover:bg-red-100 text-red-600 px-4 py-2 rounded-2xl font-semibold transition-colors"
          >
            Remove All
          </button>
        )}
      </div>

      {items.length === 0 ? (
        <p className="text-gray-500 text-center mt-20">Your cart is empty</p>
      ) : (
        <div className="space-y-4">
          {items.map((item) => {
            const imgSrc =
              item.products.image_url && item.products.image_url.trim() !== ""
                ? item.products.image_url
                : fallbackImage;

            return (
              <div key={item.id} className="bg-white rounded-2xl p-5 shadow">
                <img
                  src={imgSrc}
                  alt={item.products.name}
                  className="w-full h-48 object-cover rounded-xl"
                />

                <h2 className="text-2xl font-bold mt-4">{item.products.name}</h2>

                <p className="text-2xl font-bold mt-4">
                  €{(item.products.price * item.quantity).toFixed(2)}
                </p>

                <div className="flex items-center gap-4 mt-6">
                  <button
                    onClick={() => decreaseQuantity(item.id, item.quantity)}
                    className="bg-gray-200 w-10 h-10 rounded-xl text-xl font-bold"
                  >
                    -
                  </button>

                  <span className="text-xl font-bold">{item.quantity}</span>

                  <button
                    onClick={() => increaseQuantity(item.id, item.quantity)}
                    className="bg-red-600 text-white w-10 h-10 rounded-xl text-xl font-bold"
                  >
                    +
                  </button>
                </div>

                <button
                  onClick={() => removeItem(item.id)}
                  className="mt-6 bg-black hover:bg-gray-800 text-white px-4 py-2 rounded-xl transition-colors"
                >
                  Remove
                </button>
              </div>
            );
          })}

          {/* DISCOUNT */}
          <div className="bg-white rounded-2xl p-6 shadow mt-6">
            <h3 className="text-xl font-bold mb-3">Discount Code</h3>

            <div className="flex gap-3">
              <input
                value={discountCode}
                onChange={(e) => setDiscountCode(e.target.value)}
                className="flex-1 border rounded-xl px-4 py-2"
                placeholder="Enter code (OMED10 / OMED20)"
              />
              <button
                onClick={applyDiscount}
                className="bg-red-600 text-white px-4 py-2 rounded-xl"
              >
                Apply
              </button>
            </div>
          </div>

          {/* TOTAL */}
          <div className="bg-white rounded-2xl p-6 shadow mt-10">
            <h2 className="text-3xl font-bold">Total: €{total.toFixed(2)}</h2>

            <a
              href="/checkout"
              className="inline-block mt-6 w-full text-center bg-red-600 hover:bg-red-700 text-white py-4 rounded-2xl text-lg font-semibold transition-colors"
            >
              Proceed to Checkout
            </a>

            <a
              href="/marketplace"
              className="inline-block mt-4 w-full text-center bg-gray-200 hover:bg-gray-300 text-black py-4 rounded-2xl text-lg font-semibold transition-colors"
            >
              Continue Shopping
            </a>
          </div>
        </div>
      )}
    </main>
  );
}
