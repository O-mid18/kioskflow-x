"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function MarketplacePage() {
  const [products, setProducts] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    fetchUser();
    fetchProducts();
  }, []);

  const fetchUser = async () => {
    const { data } = await supabase.auth.getUser();
    setUser(data.user);
  };

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  const fetchProducts = async () => {
    const { data, error } = await supabase.from("products").select("*");

    if (error) console.error("Error fetching products:", error.message);
    else setProducts(data || []);

    setLoading(false);
  };

  const addToCart = async (productId: number) => {
    if (!user) return showToast("Please login first");

    const { error } = await supabase.from("cart_items").insert({
      user_id: user.id,
      product_id: productId,
      quantity: 1,
    });

    if (error) showToast(error.message);
    else showToast("Added to cart 🛒");
  };

  const addToWishlist = async (productId: number) => {
    if (!user) return showToast("Please login first");

    const { error } = await supabase.from("wishlist").insert({
      user_id: user.id,
      product_id: productId,
    });

    if (error) showToast(error.message);
    else showToast("Added to wishlist ❤️");
  };

  const deleteProduct = async (id: number) => {
    if (!user || user.user_metadata.role !== "admin")
      return showToast("Only admin can delete");

    await supabase.from("products").delete().eq("id", id);
    fetchProducts();
    showToast("Product deleted 🗑️");
  };

  const filteredProducts = products.filter((product) =>
    product.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <main className="min-h-screen bg-black p-8 text-white">
      {toast && (
        <div className="fixed top-5 right-5 bg-white text-black px-5 py-3 rounded-xl shadow-lg animate-fade">
          {toast}
        </div>
      )}

      <h1 className="text-4xl font-bold mb-10">Marketplace</h1>

      <input
        type="text"
        placeholder="Search products..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full p-4 rounded-2xl bg-gray-900 text-white border border-gray-700 mb-8"
      />

      {loading ? (
        <div className="grid md:grid-cols-4 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="bg-gray-800 animate-pulse rounded-3xl p-5 h-80"
            ></div>
          ))}
        </div>
      ) : (
        <div className="grid md:grid-cols-4 gap-6">
          {filteredProducts.map((product) => (
            <div key={product.id} className="bg-white text-black rounded-3xl p-5 shadow">
              <img
                src={
                  product.image_url ||
                  "https://images.unsplash.com/photo-1543253687-c931c8e01820?q=80&w=1200&auto=format&fit=crop"
                }
                alt={product.name}
                className="w-full h-48 object-cover rounded-2xl mb-4"
              />

              <h2 className="text-2xl font-bold">{product.name}</h2>
              <p className="mt-2 text-gray-500">Stock: {product.stock}</p>
              <p className="mt-4 text-2xl font-bold">€{product.price}</p>

              <button
                onClick={() => addToCart(product.id)}
                className="mt-4 bg-red-600 text-white px-4 py-2 rounded-xl w-full"
              >
                Add To Cart
              </button>

              <button
                onClick={() => addToWishlist(product.id)}
                className="mt-2 bg-pink-600 text-white px-4 py-2 rounded-xl w-full"
              >
                ❤️ Wishlist
              </button>

              {user?.user_metadata?.role === "admin" && (
                <button
                  onClick={() => deleteProduct(product.id)}
                  className="mt-2 bg-black text-white px-4 py-2 rounded-xl w-full"
                >
                  Delete Product
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
