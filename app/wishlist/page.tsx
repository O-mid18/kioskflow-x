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
      <div className="relative overflow-hidden rounded-[40px] bg-gradient-to-br from-red-700 via-black to-gray-900 p-12 mb-12 shadow-2xl">

  <p className="uppercase tracking-[6px] text-red-400 text-sm font-bold">
    Saved Products
  </p>

  <h1 className="text-6xl font-black leading-tight mt-4">
    Your
    <span className="text-red-500">
      {" "}Wishlist
    </span>
  </h1>

  <p className="text-gray-300 text-xl mt-6 max-w-2xl">
    Save products you love and purchase them anytime.
  </p>

  <div className="flex gap-10 mt-10">
    <div>
      <p className="text-4xl font-black">
        {items.length}
      </p>

      <p className="text-gray-400">
        Saved Products
      </p>
    </div>

    <div>
      <p className="text-4xl font-black">
        ❤️
      </p>

      <p className="text-gray-400">
        Favorites
      </p>
    </div>
  </div>
</div>

      <div className="grid md:grid-cols-4 gap-6">
        {items.map((item) => (
          <div
            key={item.id}
            className="bg-white/10 backdrop-blur-xl border border-white/10 rounded-[30px] p-6 shadow-2xl"
          >
            <img
              src={
                item.products?.image_url ||
                "https://images.unsplash.com/photo-1543253687-c931c8e01820?q=80&w=1200&auto=format&fit=crop"
              }
              alt={item.products?.name}
              className="w-full h-48 object-cover rounded-2xl mb-4"
            />

            <h2 className="text-3xl font-black text-white">
              {item.products?.name}
            </h2>

            <p className="mt-6 text-4xl font-black text-red-400">
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