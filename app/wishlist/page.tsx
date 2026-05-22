"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function WishlistPage() {
  const [items, setItems] = useState<any[]>([]);

  useEffect(() => {
    fetchWishlist();
  }, []);

  const fetchWishlist = async () => {
    const { data } = await supabase
      .from("wishlist")
      .select(`
        id,
        products (
          id,
          name,
          price,
          image_url
        )
      `);

    if (data) {
      setItems(data);
    }
  };

  return (
    <main className="min-h-screen bg-black text-white p-8">
      <h1 className="text-4xl font-bold mb-10">
        ❤️ Wishlist
      </h1>

      <div className="grid md:grid-cols-4 gap-6">
        {items.map((item) => (
          <div
            key={item.id}
            className="bg-white text-black rounded-3xl p-5 shadow"
          >
            <img
              src={
                item.products?.image_url ||
                "https://images.unsplash.com/photo-1543253687-c931c8e01820?q=80&w=1200&auto=format&fit=crop"
              }
              alt={item.products?.name}
              className="w-full h-48 object-cover rounded-2xl mb-4"
            />

            <h2 className="text-2xl font-bold">
              {item.products?.name}
            </h2>

            <p className="mt-4 text-2xl font-bold">
              €{item.products?.price}
            </p>

            <button
              onClick={async () => {
                await supabase
                  .from("wishlist")
                  .delete()
                  .eq("id", item.id);

                fetchWishlist();
              }}
              className="mt-4 bg-red-600 text-white px-4 py-2 rounded-xl w-full"
            >
              Remove
            </button>
          </div>
        ))}
      </div>
    </main>
  );
}