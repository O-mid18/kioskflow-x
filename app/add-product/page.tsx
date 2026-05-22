"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function AddProductPage() {
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("");
  const [imageUrl, setImageUrl] = useState("");

  const addProduct = async () => {
    const { error } = await supabase
      .from("products")
      .insert({
        name,
        price: Number(price),
        stock: Number(stock),
        image_url: imageUrl,
      });

    if (error) {
      alert(error.message);
    } else {
      alert("Product Added");
      window.location.href = "/marketplace";
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
      <div className="bg-white rounded-3xl shadow-xl p-8 w-full max-w-xl">
        <h1 className="text-4xl font-bold mb-8">
          Add Product
        </h1>

        <div className="space-y-4">
          <input
            type="text"
            placeholder="Product Name"
            className="w-full border p-4 rounded-2xl"
            onChange={(e) => setName(e.target.value)}
          />

          <input
            type="number"
            placeholder="Price"
            className="w-full border p-4 rounded-2xl"
            onChange={(e) => setPrice(e.target.value)}
          />

          <input
            type="number"
            placeholder="Stock"
            className="w-full border p-4 rounded-2xl"
            onChange={(e) => setStock(e.target.value)}
          />

          <input
            type="text"
            placeholder="Image URL"
            className="w-full border p-4 rounded-2xl"
            onChange={(e) => setImageUrl(e.target.value)}
          />

          <button
            onClick={addProduct}
            className="w-full bg-red-600 text-white py-4 rounded-2xl text-lg font-semibold"
          >
            Add Product
          </button>
        </div>
      </div>
    </main>
  );
}