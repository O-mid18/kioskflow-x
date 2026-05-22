"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function SupplierDashboard() {
  const [products, setProducts] = useState<any[]>([]);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    const { data } = await supabase
      .from("products")
      .select("*");

    if (data) {
      setProducts(data);
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="flex items-center justify-between mb-10">
        <h1 className="text-4xl font-bold">
          Supplier Dashboard
        </h1>

        <a
          href="/add-product"
          className="bg-red-600 text-white px-5 py-3 rounded-2xl"
        >
          Add Product
        </a>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {products.map((product) => (
          <div
            key={product.id}
            className="bg-white rounded-3xl p-5 shadow"
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
              Stock: {product.stock}
            </p>

            <p className="text-2xl font-bold mt-4">
              €{product.price}
            </p>

            <a
              href={`/edit-product/${product.id}`}
              className="block mt-4 bg-red-600 text-white text-center px-4 py-2 rounded-xl"
            >
              Edit Product
            </a>
          </div>
        ))}
      </div>
    </main>
  );
}