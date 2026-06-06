"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function SupplierDashboard() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    const { data, error } = await supabase
      .from("products")
      .select("*");

    if (error) {
      console.error(error);
      return;
    }

    setProducts(data || []);
    setLoading(false);
  };

  const deleteProduct = async (productId: string) => {
    const confirmDelete = confirm(
      "Are you sure you want to delete this product?"
    );

    if (!confirmDelete) return;

    const { error } = await supabase
      .from("products")
      .delete()
      .eq("id", productId);

    if (error) {
      alert(error.message);
      return;
    }

    fetchProducts();
  };

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        Loading...
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white p-8">
      <div className="flex items-center justify-between mb-10">
        <h1 className="text-5xl font-bold">
          Supplier Dashboard
        </h1>

        <a
          href="/add-product"
          className="bg-red-600 hover:bg-red-700 px-5 py-3 rounded-2xl"
        >
          Add Product
        </a>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {products.map((product) => (
          <div
            key={product.id}
            className="bg-white text-black rounded-3xl p-5 shadow-xl"
          >
            <img
              src={
                product.image_url ||
                "https://images.unsplash.com/photo-1543253687-c931c8e01820?q=80&w=1200&auto=format&fit=crop"
              }
              alt={product.name}
              className="w-full h-48 object-cover rounded-2xl mb-4"
            />

            <h2 className="text-2xl font-bold">
              {product.name}
            </h2>

            <p className="text-gray-500 mt-2">
              Stock: {product.stock || 0}
            </p>

            <p className="text-3xl font-bold mt-4 text-green-600">
              €{product.price}
            </p>

            <a
              href={`/edit-product/${product.id}`}
              className="block mt-4 bg-red-600 text-white text-center px-4 py-3 rounded-xl"
            >
              Edit Product
            </a>

            <button
              onClick={() => deleteProduct(product.id)}
              className="block mt-3 w-full bg-black text-white px-4 py-3 rounded-xl"
            >
              Delete Product
            </button>
          </div>
        ))}
      </div>
    </main>
  );
}