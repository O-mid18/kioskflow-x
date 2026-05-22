"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function EditProductPage({
  params,
}: {
  params: { id: string };
}) {
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("");
  const [imageUrl, setImageUrl] = useState("");

  useEffect(() => {
    fetchProduct();
  }, []);

  const fetchProduct = async () => {
    const { data } = await supabase
      .from("products")
      .select("*")
      .eq("id", params.id)
      .single();

    if (data) {
      setName(data.name);
      setPrice(data.price);
      setStock(data.stock);
      setImageUrl(data.image_url);
    }
  };

  const updateProduct = async () => {
    const { error } = await supabase
      .from("products")
      .update({
        name,
        price: Number(price),
        stock: Number(stock),
        image_url: imageUrl,
      })
      .eq("id", params.id);

    if (error) {
      alert(error.message);
    } else {
      alert("Product Updated");
      window.location.href = "/supplier";
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
      <div className="bg-white rounded-3xl shadow-xl p-8 w-full max-w-xl">
        <h1 className="text-4xl font-bold mb-8">
          Edit Product
        </h1>

        <div className="space-y-4">
          <input
            type="text"
            value={name}
            className="w-full border p-4 rounded-2xl"
            onChange={(e) => setName(e.target.value)}
          />

          <input
            type="number"
            value={price}
            className="w-full border p-4 rounded-2xl"
            onChange={(e) => setPrice(e.target.value)}
          />

          <input
            type="number"
            value={stock}
            className="w-full border p-4 rounded-2xl"
            onChange={(e) => setStock(e.target.value)}
          />

          <input
            type="text"
            value={imageUrl}
            className="w-full border p-4 rounded-2xl"
            onChange={(e) => setImageUrl(e.target.value)}
          />

          <button
            onClick={updateProduct}
            className="w-full bg-red-600 text-white py-4 rounded-2xl text-lg font-semibold"
          >
            Update Product
          </button>
        </div>
      </div>
    </main>
  );
}